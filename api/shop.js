export default async function handler(req, res) {
    // 這裡會安全地讀取你在 Vercel 後台設定的環境變數
    const apiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;
    const tableName = 'Table2'; // 你的 Airtable 資料表名稱，請依實際情況修改

    if (!apiKey || !baseId) {
        return res.status(500).json({ error: '遺失 Airtable 環境變數' });
    }

    try {
        const response = await fetch(`https://api.airtable.com/v0/${baseId}/${tableName}`, {
            headers: {
                Authorization: `Bearer ${apiKey}`
            }
        });

        if (!response.ok) {
            throw new Error('Airtable 連線失敗');
        }

        const data = await response.json();
        
        // 將 Airtable 欄位對應到系統需要的格式
        const formattedShops = data.records.map(record => ({
            id: record.id,
            name: record.fields['店名'] || record.fields.Name || '未命名店家',
            category: record.fields['分類'] || record.fields.Category || 'other',
            type: record.fields['類型'] || record.fields.Type || '未分類',
            lat: parseFloat(record.fields['緯度'] || record.fields.Latitude),
            lng: parseFloat(record.fields['經度'] || record.fields.Longitude),
            address: record.fields['地址'] || record.fields.Address || ''
        })).filter(shop => !isNaN(shop.lat) && !isNaN(shop.lng));

        // 回傳處理好的乾淨資料給前端
        res.status(200).json(formattedShops);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '讀取資料發生錯誤' });
    }
}