export default async function handler(req, res) {
    const apiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;
    
    const tableName = '遊客點數'; 
    const historyTableName = '兌換紀錄'; // 🌟 新增的兌換紀錄資料表

    if (!apiKey || !baseId) {
        return res.status(500).json({ error: '遺失環境變數' });
    }

    const headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
    };

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
                return res.status(200).json({ food: 0, souvenir: 0, stay: 0 }); 
            }
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }

    if (req.method === 'POST') {
        const { uid, action, category, points, userName, giftName, sn, time } = req.body;
        if (!uid) return res.status(400).json({ error: '缺少 UID' });

        try {
            // 1. 查詢遊客點數
            const searchUrl = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}?filterByFormula={UID}='${uid}'`;
            const searchRes = await fetch(searchUrl, { headers });
            const searchData = await searchRes.json();

            let recordId = null;
            let currentFields = { 'UID': uid, '小吃': 0, '伴手禮': 0, '住宿': 0 };
            
            if (userName) currentFields['名稱'] = userName;

            if (searchData.records && searchData.records.length > 0) {
                recordId = searchData.records[0].id;
                currentFields['小吃'] = searchData.records[0].fields['小吃'] || 0;
                currentFields['伴手禮'] = searchData.records[0].fields['伴手禮'] || 0;
                currentFields['住宿'] = searchData.records[0].fields['住宿'] || 0;
            }

            // 2. 點數加減計算
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

            // 3. 寫回點數
            let saveUrl = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`;
            let saveMethod = 'POST';
            let saveBody = { records: [{ fields: currentFields }] };

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
            
            if (!saveRes.ok) {
                const errData = await saveRes.json();
                return res.status(400).json({ error: `Airtable 錯誤: ${errData.error?.type || '格式不符'}` });
            }

            // 🌟 4. 如果是兌換(扣點)，則寫入「兌換紀錄」資料表
            if (action === 'deduct') {
                const historyUrl = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(historyTableName)}`;
                
                // 🛡️ 強制伺服器端使用台灣時間 (避免變成英國 UTC 時間)
                const taiwanTime = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });

                await fetch(historyUrl, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        records: [{
                            fields: {
                                '時間': time || taiwanTime,
                                'UID': uid,
                                '名稱': userName || '未知遊客',
                                '兌換獎品': giftName || '未知獎品',
                                '扣除點數': points,
                                '核銷序號': sn || '未產生'
                            }
                        }]
                    })
                });
            }

            return res.status(200).json({ success: true });
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
}