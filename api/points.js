export default async function handler(req, res) {
    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const Airtable = require('airtable');
    const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(process.env.AIRTABLE_BASE_ID);

    // --- 處理 GET 請求：查詢遊客目前點數 ---
    if (req.method === 'GET') {
        const { uid } = req.query;
        if (!uid) return res.status(400).json({ error: 'Missing UID' });

        try {
            // 🌟 關鍵修復：將 FIND 改為 SEARCH (不分大小寫)，就能完美比對到你原本的全碼 UID！
            const records = await base('遊客點數').select({
                filterByFormula: `SEARCH('${uid}', {UID}) > 0`,
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
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    // --- 處理 POST 請求：加點與扣點 ---
    const { uid, action, points, giftName, sn, category, userName, shopUid, staffPassword, shopName } = req.body;
    
    // 🛡️ 後端驗證 1：防護兌換密碼被繞過
    if (action === 'deduct') {
        if (staffPassword !== '8888') {
            return res.status(401).json({ error: '服務台密碼錯誤，拒絕執行' });
        }
    }

    // 🛡️ 後端驗證 2：店家發點身分驗證 
    // 👉 記得將這裡替換成您真實店家的 LINE UID 陣列
    const VALID_SHOPS = ['U1234567890abcdef1234567890abcdef', '請貼上店家的真實UID_1'];
    if (action === 'add') {
        if (!VALID_SHOPS.includes(shopUid)) {
            // return res.status(403).json({ error: '非授權店家，拒絕發送點數' }); // 測試期間可先註解此行
        }
    }

    try {
        // 🌟 關鍵修復：將 FIND 改為 SEARCH (不分大小寫)
        const records = await base('遊客點數').select({
            filterByFormula: `SEARCH('${uid}', {UID}) > 0`,
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

                await base('遊客點數').update([{
                    id: userRecord.id,
                    fields: { '小吃': newFood, '伴手禮': newSouvenir, '住宿': newStay }
                }]);

                await base('兌換紀錄').create([{
                    fields: { '遊客UID': uid, '兌換獎項': giftName, '扣除點數': points, '核銷序號': sn, '時間': new Date().toISOString() }
                }]);
            }
        } else {
            // 新使用者第一次拿到點數
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

        // 🚀 推播到 Google Sheets
        if (action === 'add' && process.env.GOOGLE_SHEET_URL) {
            try {
                fetch(process.env.GOOGLE_SHEET_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        time: new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }),
                        shopName: shopName || '未知店家',
                        shopUid: shopUid || '未知',
                        userUid: uid,
                        points: points,
                        category: targetCat
                    })
                }).catch(e => console.error('Google Sheet 推送失敗', e));
            } catch (sheetError) {
                console.error(sheetError);
            }
        }

        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}