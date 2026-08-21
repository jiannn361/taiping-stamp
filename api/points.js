export default async function handler(req, res) {
    const apiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;
    
    const tableName = '遊客點數'; 
    const redeemHistoryTable = '兌換紀錄'; 
    const addHistoryTable = '發點紀錄'; // 🌟 新增的發點稽核軌跡表

    // 🛡️ 商業級防護：將店家權限名單放在後端，前端無法竄改
    const BACKEND_SHOP_ADMINS = {
        'U1234567890abcdef1234567890abcdef': '太平老街測試店家',
        '請貼上店家的真實UID_1': '某某特色伴手禮',
        '請貼上店家的真實UID_2': '高山茶語民宿'
        // ⚠️ 請記得把您在 index.html 的真實店家 UID 也複製一份到這裡
    };

    if (!apiKey || !baseId) return res.status(500).json({ error: '遺失環境變數' });

    const headers = { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
    const taiwanTime = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });

    // ==========================================
    // GET: 讀取點數與雲端歷史紀錄
    // ==========================================
    if (req.method === 'GET') {
        const uid = req.query.uid; // 可以是完整 UID 或 8 碼短碼
        if (!uid) return res.status(400).json({ error: '缺少 UID' });
        
        try {
            // 1. 抓取點數
            const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}?filterByFormula=OR({UID}='${uid}', RIGHT({UID}, 8)='${uid}')`;
            const response = await fetch(url, { headers });
            const data = await response.json();
            
            let result = { food: 0, souvenir: 0, stay: 0, name: '新遊客', history: [] };

            if (data.records && data.records.length > 0) {
                const fields = data.records[0].fields;
                result = { ...result, food: fields['小吃'] || 0, souvenir: fields['伴手禮'] || 0, stay: fields['住宿'] || 0, name: fields['名稱'] || '未知遊客' };
            }

            // 2. 抓取雲端兌換紀錄 (解決重新整理紀錄消失的問題)
            const historyUrl = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(redeemHistoryTable)}?filterByFormula=OR({UID}='${uid}', RIGHT({UID}, 8)='${uid}')&sort[0][field]=時間&sort[0][direction]=desc&maxRecords=10`;
            const historyRes = await fetch(historyUrl, { headers });
            const historyData = await historyRes.json();
            
            if (historyData.records) {
                result.history = historyData.records.map(r => ({
                    giftName: r.fields['兌換獎品'],
                    sn: r.fields['核銷序號'],
                    time: r.fields['時間']
                }));
            }
            
            return res.status(200).json(result);
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }

    // ==========================================
    // POST: 嚴格驗證的發點與扣點邏輯
    // ==========================================
    if (req.method === 'POST') {
        const { uid, action, category, points, userName, giftName, sn, password, shopUid } = req.body;
        if (!uid) return res.status(400).json({ error: '缺少 UID' });

        // 🛡️ 防護網 1：後端驗證扣點密碼 (駭客無法繞過)
        if (action === 'deduct') {
            const CORRECT_PASSWORD = process.env.REDEEM_PASSWORD || '1688';
            if (password !== CORRECT_PASSWORD) return res.status(403).json({ error: '核銷密碼錯誤 (後端拒絕)' });
        }

        // 🛡️ 防護網 2：後端驗證店家發點權限
        if (action === 'add') {
            if (!BACKEND_SHOP_ADMINS[shopUid]) return res.status(403).json({ error: '無效的店家身分，禁止發點' });
        }

        try {
            // 查詢真實 UID 的紀錄 (支援完整碼或 8 碼短碼)
            const searchUrl = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}?filterByFormula=OR({UID}='${uid}', RIGHT({UID}, 8)='${uid}')`;
            const searchRes = await fetch(searchUrl, { headers });
            const searchData = await searchRes.json();

            let recordId = null;
            // 若為短碼查詢，儲存時仍需保留其傳進來的 UID 作為依據
            let currentFields = { 'UID': uid, '小吃': 0, '伴手禮': 0, '住宿': 0 };
            
            if (userName) currentFields['名稱'] = userName;

            if (searchData.records && searchData.records.length > 0) {
                recordId = searchData.records[0].id;
                currentFields['UID'] = searchData.records[0].fields['UID']; // 確保寫回真實完整 UID
                currentFields['小吃'] = searchData.records[0].fields['小吃'] || 0;
                currentFields['伴手禮'] = searchData.records[0].fields['伴手禮'] || 0;
                currentFields['住宿'] = searchData.records[0].fields['住宿'] || 0;
            }

            if (action === 'add') {
                const colMap = { 'food': '小吃', 'souvenir': '伴手禮', 'stay': '住宿' };
                const colName = colMap[category];
                if (colName) currentFields[colName] += points;
                
            } else if (action === 'deduct') {
                let ptsToDeduct = points;
                const cats = ['小吃', '伴手禮', '住宿'];
                for (let cat of cats) {
                    if (ptsToDeduct <= 0) break;
                    if (currentFields[cat] >= ptsToDeduct) {
                        currentFields[cat] -= ptsToDeduct;
                        ptsToDeduct = 0;
                    } else {
                        ptsToDeduct -= currentFields[cat];
                        currentFields[cat] = 0;
                    }
                }
                if (ptsToDeduct > 0) return res.status(400).json({ error: '點數不足' });
            }

            // 寫回點數
            let saveUrl = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`;
            let saveMethod = 'POST';
            let saveBody = { records: [{ fields: currentFields }] };

            if (recordId) {
                saveUrl = `${saveUrl}/${recordId}`;
                saveMethod = 'PATCH';
                saveBody = { fields: currentFields };
            }

            const saveRes = await fetch(saveUrl, { method: saveMethod, headers, body: JSON.stringify(saveBody) });
            if (!saveRes.ok) return res.status(400).json({ error: 'Airtable 寫入失敗' });

            // 🛡️ 寫入稽核軌跡
            if (action === 'deduct') {
                await fetch(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(redeemHistoryTable)}`, {
                    method: 'POST', headers,
                    body: JSON.stringify({ records: [{ fields: { '時間': taiwanTime, 'UID': currentFields['UID'], '名稱': userName || '未知遊客', '兌換獎品': giftName, '扣除點數': points, '核銷序號': sn } }] })
                });
            } else if (action === 'add') {
                await fetch(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(addHistoryTable)}`, {
                    method: 'POST', headers,
                    body: JSON.stringify({ records: [{ fields: { '時間': taiwanTime, '店家UID': shopUid, '店家名稱': BACKEND_SHOP_ADMINS[shopUid], '遊客UID': currentFields['UID'], '分類': category, '發送點數': points } }] })
                });
            }

            return res.status(200).json({ success: true });
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
}