export default async function handler(req, res) {
    try {
        if (req.method !== 'POST' && req.method !== 'GET') {
            return res.status(405).json({ error: 'Method not allowed' });
        }

        let Airtable;
        try {
            Airtable = require('airtable');
        } catch (e) {
            console.error('缺少 airtable 套件');
            return res.status(500).json({ error: '系統缺少 airtable 套件' });
        }

        // 支援 AIRTABLE_PAT 或 AIRTABLE_API_KEY
        const apiKey = process.env.AIRTABLE_PAT || process.env.AIRTABLE_API_KEY;
        const baseId = process.env.AIRTABLE_BASE_ID;

        if (!apiKey || !baseId) {
            console.error('Vercel 環境變數遺失: apiKey 或 baseId 為空');
            return res.status(500).json({ error: 'Vercel 環境變數遺失 (請檢查 API Key 與 BASE_ID)' });
        }

        const base = new Airtable({ apiKey: apiKey }).base(baseId);

        if (req.method === 'GET') {
            const { uid } = req.query;
            if (!uid) return res.status(400).json({ error: 'Missing UID' });

            const records = await base('遊客點數').select({
                filterByFormula: `SEARCH(LOWER('${uid}'), LOWER({UID} & '')) > 0`,
                maxRecords: 1
            }).firstPage();

            if (records.length > 0) {
                const fields = records[0].fields;
                return res.status(200).json({
                    name: fields['名稱'] || '',
                    food: fields['小吃'] || 0,
                    souvenir: fields['伴手禮'] || 0,
                    stay: fields['住宿'] || 0,
                    total: fields['總點數'] || 0
                });
            } else {
                return res.status(404).json({ error: 'User not found' });
            }
        }

        const body = req.body || {};
        const { uid, action, points, giftName, sn, category, userName, shopUid, staffPassword, shopName } = body;

        if (action === 'deduct') {
            if (staffPassword !== '1688') {
                return res.status(401).json({ error: '服務台密碼錯誤，拒絕執行' });
            }
        }

        const records = await base('遊客點數').select({
            filterByFormula: `SEARCH(LOWER('${uid}'), LOWER({UID} & '')) > 0`,
            maxRecords: 1
        }).firstPage();

        let targetCat = '小吃';
        if (category === 'souvenir') targetCat = '伴手禮';
        else if (category === 'stay') targetCat = '住宿';

        if (records.length > 0) {
            const userRecord = records[0];
            const currentPoints = userRecord.fields[targetCat] || 0;

            if (action === 'add') {
                await base('遊客點數').update([{
                    id: userRecord.id,
                    fields: { [targetCat]: currentPoints + points }
                }]);
            } else if (action === 'deduct') {
                let ptsToDeduct = points;
                let newFood = userRecord.fields['小吃'] || 0;
                let newSouvenir = userRecord.fields['伴手禮'] || 0;
                let newStay = userRecord.fields['住宿'] || 0;

                for (let catObj of [{k:'小吃', v:newFood}, {k:'伴手禮', v:newSouvenir}, {k:'住宿', v:newStay}]) {
                    if (ptsToDeduct <= 0) break;
                    if (catObj.v >= ptsToDeduct) { catObj.v -= ptsToDeduct; ptsToDeduct = 0; }
                    else { ptsToDeduct -= catObj.v; catObj.v = 0; }
                    if (catObj.k === '小吃') newFood = catObj.v;
                    if (catObj.k === '伴手禮') newSouvenir = catObj.v;
                    if (catObj.k === '住宿') newStay = catObj.v;
                }

                // 🌟 核心修改：先嘗試建立「兌換紀錄」
                try {
                    await base('兌換紀錄').create([{
                        // 注意：請確認您 Airtable 第一欄叫 'UID' 還是 '遊客UID'，請保持一致
                        fields: { '遊客UID': uid, '兌換獎項': giftName, '扣除點數': points, '核銷序號': sn, '時間': new Date().toISOString() }
                    }]);
                } catch (err) {
                    console.error('寫入兌換紀錄失敗，終止扣點:', err);
                    // 丟出錯誤，強制中斷程式，下方的扣點將【不會】執行！
                    throw new Error(`兌換紀錄寫入失敗，點數已保留: ${err.message}`);
                }

                // 🌟 紀錄成功寫入後，才真正「扣除點數」
                await base('遊客點數').update([{
                    id: userRecord.id,
                    fields: { '小吃': newFood, '伴手禮': newSouvenir, '住宿': newStay }
                }]);
            }
        } else {
            if (action === 'add') {
                await base('遊客點數').create([{
                    fields: {
                        'UID': uid,
                        '名稱': userName || '新遊客',
                        [targetCat]: points
                    }
                }]);
            }
        }

        // 🌟 強化版的 Google Sheet 傳送邏輯
        if (action === 'add') {
            const sheetUrl = process.env.GOOGLE_SHEET_URL;
            if (sheetUrl) {
                console.log(`準備傳送至 Google Sheet: ${sheetUrl}`);
                try {
                    const sheetData = {
                        time: new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }),
                        shopName: shopName || '未知店家',
                        shopUid: shopUid || '未知',
                        userUid: uid.slice(-8).toUpperCase(), // 🌟 修改這裡：直接轉成 8 碼大寫
                        fullUid: uid,                         // 🌟 新增這裡：保留原本的完整 UID 備查
                        points: points,
                        category: targetCat
                    };
                    
                    const response = await fetch(sheetUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(sheetData)
                    });

                    if (!response.ok) {
                        console.error('Google Sheet 傳送失敗，狀態碼:', response.status);
                        const text = await response.text();
                        console.error('回傳內容:', text);
                    } else {
                        console.log('✅ 成功傳送至 Google Sheet');
                    }
                } catch (sheetError) {
                    console.error('執行 Google Sheet fetch 時發生錯誤:', sheetError);
                }
            } else {
                console.warn('⚠️ 尚未設定 GOOGLE_SHEET_URL，跳過傳送至 Google Sheet');
            }
        }

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error('伺服器錯誤:', error);
        return res.status(500).json({ error: error.message || '發生未知的嚴重錯誤' });
    }
}