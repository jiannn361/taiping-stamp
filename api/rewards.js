export default async function handler(req, res) {
    const gasUrl = "https://script.google.com/macros/s/AKfycbw9JdGUV5OAxN7JfZszzoxbVfQqcwwZ0xMNlCUWGbkFULtZd3qecEpjtV6TBV5ksfXC/exec";

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const response = await fetch(`${gasUrl}?type=rewards`);
        const data = await response.json();
        if (!response.ok || data.error) throw new Error(data.error || '無法讀取商品庫存');

        res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=30');
        return res.status(200).json(data);
    } catch (error) {
        console.error('商品庫存讀取錯誤:', error);
        return res.status(500).json({ error: '商品庫存讀取失敗', detail: error.message });
    }
}
