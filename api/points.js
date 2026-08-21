export default async function handler(req, res) {
    // 🌟 全局防護罩：攔截所有不可預期的崩潰
    try {
        if (req.method !== 'POST' && req.method !== 'GET') {
            return res.status(405).json({ error: 'Method not allowed' });
        }

        // 1. 檢查套件與環境變數 (避免未處理的崩潰)
        let Airtable;
        try {
            Airtable = require('airtable');
        } catch (e) {
            return res.status(500).json({ error: '系統缺少 airtable 套件' });
        }

        if (!process.env.AIRTABLE_PAT || !process.env.AIRTABLE_BASE_ID) {
            return res.status(500).json({ error: 'Vercel 環境變數遺失 (請檢查 PAT 與 BASE_ID)' });
        }

        const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(process.env.AIRTABLE_BASE_ID);

        // 2. 處理 GET 請求
        if (req.method === 'GET') {
            const { uid } = req.query;
            if (!uid) return res.status(400).json({ error: 'Missing UID' });

            // 🌟 修正 Airtable 空白欄位報錯 Bug: 加上 & '' 確保轉為字串
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

        // 3. 處理 POST 請求
        const body = req.body || {};
        const { uid, action, points, giftName, sn, category, userName, shopUid, staffPassword, shopName } = body;

        if (action === 'deduct') {
            if (staffPassword !== '8888') {
                return res.status(401).json({ error: '服務台密碼錯誤，拒絕執行' });
            }
        }

        // 這裡記得填入真實的店家 UID
        const VALID_SHOPS = ['Ucf69096d6b2cbf209d63a7427491b24B', '請貼上店家的真實UID_1'];
        if (action === 'add') {
            if (!VALID_SHOPS.includes(shopUid)) {
                // 測試期間可以先把這行註解掉，等確定名單後再開啟
                // return res.status(403).json({ error: '非授權店家，拒絕發送點數' });
            }
        }

        // 🌟 同步修正 POST 寫入時的比對公式
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

                await base('遊客點數').update([{
                    id: userRecord.id,
                    fields: { '小吃': newFood, '伴手禮': newSouvenir, '住宿': newStay }
                }]);

                await base('兌換紀錄').create([{
                    fields: { '遊客UID': uid, '兌換獎項': giftName, '扣除點數': points, '核銷序號': sn, '時間': new Date().toISOString() }
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
        // 🚀 捕捉最外層所有未知錯誤，並回傳真正的錯誤原因！
        return res.status(500).json({ error: error.message || '發生未知的嚴重錯誤' });
    }
}