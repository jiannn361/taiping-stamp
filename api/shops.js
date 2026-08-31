export default async function handler(req, res) {
    const apiKey = process.env.AIRTABLE_PAT || process.env.AIRTABLE_API_KEY;;
    const baseId = process.env.AIRTABLE_BASE_ID;
    
    // 🚨 終極重點：這裡必須跟你 Airtable 左上角的資料表名稱「一字不差」
    // 如果你的叫做「店家名單」，就改成 const tableName = '店家名單';
    const tableName = 'Table 2'; 

    // 1. 檢查有沒有抓到 Vercel 的環境變數
    if (!apiKey || !baseId) {
        return res.status(500).json({ 
            error: '【Vercel 錯誤】遺失環境變數', 
            detail: '請檢查 Vercel 後台是否有設定 AIRTABLE_API_KEY 與 AIRTABLE_BASE_ID，並記得要 Redeploy 才會生效！' 
        });
    }

    try {
        const response = await fetch(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`, {
            headers: {
                Authorization: `Bearer ${apiKey}`
            }
        });

        // 2. 檢查 Airtable 是不是拒絕了我們
        if (!response.ok) {
            const errorData = await response.json();
            return res.status(500).json({ 
                error: '【Airtable 連線失敗】', 
                detail: errorData,
                hint: '請檢查 Base ID 是否正確，以及 tableName 是否跟 Airtable 上的一模一樣。'
            });
        }

        const data = await response.json();
        
        // 3. 處理資料
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
                services: record.fields['提供服務'] || record.fields['服務'] || '', // 🌟 新增這一行：抓取服務欄位
                photo: photoUrl,
                lat: parseFloat(record.fields['緯度']),
                lng: parseFloat(record.fields['經度'])
            };
        }).filter(shop => !isNaN(shop.lat) && !isNaN(shop.lng)); // 濾除沒有經緯度的空資料

        res.status(200).json(formattedShops);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '【伺服器內部錯誤】', detail: error.message });
    }
}