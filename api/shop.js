export default async function handler(req, res) {
    const apiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;
    
    // 👇 請把這裡換成你真實的 Table 名稱，例如 'Table 1' 或 '店家名單'
    const tableName = 'Table 2'; 

    if (!apiKey || !baseId) {
        return res.status(500).json({ error: '遺失 Airtable 環境變數' });
    }

    try {
        const response = await fetch(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`, {
            headers: {
                Authorization: `Bearer ${apiKey}`
            }
        });

        if (!response.ok) {
            throw new Error('Airtable 連線失敗');
        }

        const data = await response.json();
        
        const formattedShops = data.records.map(record => {
            let photoUrl = '';
            if (record.fields['照片'] && record.fields['照片'].length > 0) {
                photoUrl = record.fields['照片'][0].url;
            }

            return {
                id: record.id,
                name: record.fields['店名'] || '未命名店家',
                category: record.fields['分類'] || '',
                address: record.fields['地址'] || '',
                phone: record.fields['電話'] || '',
                description: record.fields['介紹'] || '',
                photo: photoUrl,
                lat: parseFloat(record.fields['緯度']),
                lng: parseFloat(record.fields['經度'])
            };
        }).filter(shop => !isNaN(shop.lat) && !isNaN(shop.lng));

        res.status(200).json(formattedShops);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '讀取資料發生錯誤' });
    }
}