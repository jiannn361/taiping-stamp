export default async function handler(req, res) {
    try {
        if (req.method !== 'POST' && req.method !== 'GET') {
            return res.status(405).json({ error: 'Method not allowed' });
        }

        const apiKey = process.env.AIRTABLE_PAT || process.env.AIRTABLE_API_KEY;
        const baseId = process.env.AIRTABLE_BASE_ID;

        if (!apiKey || !baseId) {
            console.error('Vercel 環境變數遺失');
            return res.status(500).json({ error: 'Vercel 環境變數遺失 (請檢查 API Key 與 BASE_ID)' });
        }

        // 🌟 設定共用的 API 請求標頭
        const headers = {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        };

        // ==================== GET 請求：讀取遊客點數 ====================
        if (req.method === 'GET') {
            const { uid } = req.query;
            if (!uid) return res.status(400).json({ error: 'Missing UID' });

            // 使用原生 fetch 呼叫 Airtable API (解決 504 卡死問題)
            const formula = `SEARCH(LOWER('${uid}'), LOWER({UID} & '')) > 0`;
            const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent('遊客點數')}?filterByFormula=${encodeURIComponent(formula)}&maxRecords=1`;
            
            const response = await fetch(url, { headers });
            if (!response.ok) throw new Error('讀取點數失敗，請檢查 Table 名稱');
            const data = await response.json();

            if (data.records && data.records.length > 0) {
                const fields = data.records[0].fields;
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

        // ==================== POST 請求：扣除與新增點數 ====================
        const body = req.body || {};
        const { uid, action, points, giftName, sn, category, userName, shopUid, staffPassword, shopName } = body;

        if (action === 'deduct' && staffPassword !== '1688') {
            return res.status(401).json({ error: '服務台密碼錯誤，拒絕執行' });
        }

        // 1. 先抓取目前的點數狀態
        const formula = `SEARCH(LOWER('${uid}'), LOWER({UID} & '')) > 0`;
        const userUrl = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent('遊客點數')}?filterByFormula=${encodeURIComponent(formula)}&maxRecords=1`;
        const userRes = await fetch(userUrl, { headers });
        const userData = await userRes.json();

        let targetCat = '小吃';
        if (category === 'souvenir') targetCat = '伴手禮';
        else if (category === 'stay') targetCat = '住宿';

        if (userData.records && userData.records.length > 0) {
            const userRecord = userData.records[0];
            const currentPoints = userRecord.fields[targetCat] || 0;

            if (action === 'add') {
                // 🌟 新增點數 (PATCH 更新)
                const updateUrl = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent('遊客點數')}`;
                await fetch(updateUrl, {
                    method: 'PATCH',
                    headers,
                    body: JSON.stringify({
                        records: [{ id: userRecord.id, fields: { [targetCat]: currentPoints + points } }]
                    })
                });
            } else if (action === 'deduct') {
                // 🌟 扣除點數與寫入紀錄
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

                // 準備台灣時間
                const twTime = new Date().toLocaleString('zh-TW', { 
                    timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit', 
                    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false 
                }).replace(/\//g, '-');

                // 先寫入兌換紀錄 (POST 新增)
                const recordUrl = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent('兌換紀錄')}`;
                const recordRes = await fetch(recordUrl, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        records: [{ fields: { '遊客UID': uid, '遊客名稱': userName || '新遊客', '兌換獎項': giftName, '扣除點數': points, '核銷序號': sn, '時間': twTime } }]
                    })
                });

                if (!recordRes.ok) throw new Error(`兌換紀錄寫入失敗，點數已保留`);

                // 紀錄寫入成功後，才去扣除點數 (PATCH 更新)
                const deductUrl = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent('遊客點數')}`;
                await fetch(deductUrl, {
                    method: 'PATCH',
                    headers,
                    body: JSON.stringify({
                        records: [{ id: userRecord.id, fields: { '小吃': newFood, '伴手禮': newSouvenir, '住宿': newStay } }]
                    })
                });
            }
        } else {
            // 如果是全新遊客，建立新資料 (POST 新增)
            if (action === 'add') {
                const createUrl = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent('遊客點數')}`;
                await fetch(createUrl, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        records: [{ fields: { 'UID': uid, '名稱': userName || '新遊客', [targetCat]: points } }]
                    })
                });
            }
        }

        // ==================== Google Sheet 傳送邏輯 ====================
        if (action === 'add') {
            const sheetUrl = process.env.GOOGLE_SHEET_URL;
            if (sheetUrl) {
                try {
                    const sheetData = {
                        time: new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }),
                        shopName: shopName || '未知店家',
                        shopUid: shopUid || '未知',
                        userUid: uid.slice(-8).toUpperCase(),
                        fullUid: uid,
                        points: points,
                        category: targetCat
                    };
                    
                    const response = await fetch(sheetUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(sheetData)
                    });

                    if (!response.ok) console.error('Google Sheet 傳送失敗');
                } catch (sheetError) {
                    console.error('Google Sheet fetch 錯誤:', sheetError);
                }
            }
        }

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error('伺服器錯誤:', error);
        return res.status(500).json({ error: error.message || '發生未知的嚴重錯誤' });
    }
}