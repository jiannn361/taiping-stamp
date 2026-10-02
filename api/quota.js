export default async function handler(req, res) {
    const gasUrl = "https://script.google.com/macros/s/AKfycbw9JdGUV5OAxN7JfZszzoxbVfQqcwwZ0xMNlCUWGbkFULtZd3qecEpjtV6TBV5ksfXC/exec";

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const shopUid = String(req.query.shopUid || '').trim();
    if (!shopUid) {
        return res.status(400).json({ error: '缺少店家 UID' });
    }

    try {
        const response = await fetch(`${gasUrl}?type=shopQuota&shopUid=${encodeURIComponent(shopUid)}`, {
            headers: { 'Cache-Control': 'no-cache' }
        });
        const data = await response.json();
        if (!response.ok || data.error) throw new Error(data.error || '無法讀取店家額度');

        res.setHeader('Cache-Control', 'no-store, max-age=0');
        return res.status(200).json(data);
    } catch (error) {
        console.error('店家額度讀取錯誤:', error);
        return res.status(500).json({ error: '店家額度讀取失敗', detail: error.message });
    }
}
