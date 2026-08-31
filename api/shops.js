export default async function handler(req, res) {
    const apiKey = process.env.AIRTABLE_PAT || process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;
    const tableName = 'Table 2'; 

    if (!apiKey || !baseId) {
        return res.status(500).json({ error: '環境變數遺失' });
    }

    try {
        const response = await fetch(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`, {
            headers: { Authorization: `Bearer ${apiKey}` }
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Airtable 錯誤:", errorData);
            return res.status(500).json({ error: 'Airtable 連線失敗', detail: errorData });
        }

        const data = await response.json();
        
        const formattedShops = data.records.map(record => {
            let photoUrl = '';
            if (record.fields['照片'] && record.fields['照片'].length > 0) {
                photoUrl = record.fields['照片'][0].url;
            }
            
            // 🌟 增強容錯處理：處理 Airtable 可能傳回的陣列或特殊格式
            let rawLat = record.fields['緯度'];
            let rawLng = record.fields['經度'];
            if (Array.isArray(rawLat)) rawLat = rawLat[0];
            if (Array.isArray(rawLng)) rawLng = rawLng[0];

            return {
                id: record.id,
                name: record.fields['店名'] || '未命名店家',
                category: record.fields['分類'] || '',
                address: record.fields['地址'] || '',
                phone: record.fields['電話'] || '',
                description: record.fields['介紹'] || '',
                services: record.fields['提供服務'] || record.fields['服務'] || '',
                photo: photoUrl,
                // 如果真的轉不出數字，就先給 0，確保店家名單至少能顯示出來
                lat: parseFloat(rawLat) || 0, 
                lng: parseFloat(rawLng) || 0
            };
        });
        
        // 🌟 已經把嚴格的 .filter 隱藏機制移除了！所有店家都會強制輸出
        res.status(200).json(formattedShops);

    } catch (error) {
        console.error("伺服器錯誤:", error);
        res.status(500).json({ error: '伺服器內部錯誤', detail: error.message });
    }
}