export default async function handler(req, res) {
    const apiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;
    
    // 🚨 注意：等一下要在 Airtable 建立這個資料表
    const tableName = '遊客點數'; 

    if (!apiKey || !baseId) {
        return res.status(500).json({ error: '遺失環境變數' });
    }

    const headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
    };

    // 🌟 遊客端：查詢目前點數
    if (req.method === 'GET') {
        const uid = req.query.uid;
        if (!uid) return res.status(400).json({ error: '缺少 UID' });
        
        try {
            const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}?filterByFormula={UID}='${uid}'`;
            const response = await fetch(url, { headers });
            const data = await response.json();
            
            if (data.records && data.records.length > 0) {
                const fields = data.records[0].fields;
                return res.status(200).json({
                    food: fields['小吃'] || 0,
                    souvenir: fields['伴手禮'] || 0,
                    stay: fields['住宿'] || 0
                });
            } else {
                return res.status(200).json({ food: 0, souvenir: 0, stay: 0 }); // 新遊客點數為 0
            }
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }

    // 🌟 店家/服務台端：發送或扣除點數
    if (req.method === 'POST') {
        const { uid, action, category, points, userName } = req.body;
        if (!uid) return res.status(400).json({ error: '缺少 UID' });

        try {
            // 1. 先去資料庫找這個遊客
            const searchUrl = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}?filterByFormula={UID}='${uid}'`;
            const searchRes = await fetch(searchUrl, { headers });
            const searchData = await searchRes.json();

            let recordId = null;
            let currentFields = { 'UID': uid, '小吃': 0, '伴手禮': 0, '住宿': 0 };
            
            // 如果前端有傳名字過來，就一起存起來
            if (userName) {
                currentFields['名稱'] = userName;
            }

            if (searchData.records && searchData.records.length > 0) {
                recordId = searchData.records[0].id;
                currentFields['小吃'] = searchData.records[0].fields['小吃'] || 0;
                currentFields['伴手禮'] = searchData.records[0].fields['伴手禮'] || 0;
                currentFields['住宿'] = searchData.records[0].fields['住宿'] || 0;
            }

            // 2. 計算最新點數 (發放 or 扣除)
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

            // 3. 把新點數寫回 Airtable
            let saveUrl = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`;
            let saveMethod = 'POST';
            let saveBody = { records: [{ fields: currentFields }] };

            // 如果遊客已經存在，改用 PATCH 更新
            if (recordId) {
                saveUrl = `${saveUrl}/${recordId}`;
                saveMethod = 'PATCH';
                saveBody = { fields: currentFields };
            }

            const saveRes = await fetch(saveUrl, {
                method: saveMethod,
                headers,
                body: JSON.stringify(saveBody)
            });
            
            // 🚨 升級錯誤攔截：抓出 Airtable 拒絕的真正原因
            if (!saveRes.ok) {
                const errData = await saveRes.json();
                console.error("Airtable 拒絕寫入:", errData);
                return res.status(400).json({ error: `Airtable 錯誤: ${errData.error?.type || errData.error?.message || '格式不符'}` });
            }

            return res.status(200).json({ success: true });
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
}