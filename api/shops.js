export default async function handler(req, res) {
    const gasUrl = "https://script.google.com/macros/s/AKfycbw9JdGUV5OAxN7JfZszzoxbVfQqcwwZ0xMNlCUWGbkFULtZd3qecEpjtV6TBV5ksfXC/exec";

    try {
        // 加上 type=shops 讓試算表知道我們要抓「合作店家」
        const response = await fetch(`${gasUrl}?type=shops`);
        
        if (!response.ok) throw new Error('無法讀取試算表');
        const data = await response.json();
        
        if (data.error) throw new Error(data.error);

        // 🌟 啟動快取防護罩：把店家資料暫存在伺服器 1 小時，完全零消耗！
        res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
        res.status(200).json(data);

    } catch (error) {
        console.error("伺服器錯誤:", error);
        res.status(500).json({ error: '伺服器內部錯誤', detail: error.message });
    }
}