export default async function handler(req, res) {
    const gasUrl = "https://script.google.com/macros/s/AKfycbwMSR-c7x74CeEr5huCcNxDo5BOyIF--VKclPik6EDHheKQEk2BfiuLgVMiF5XZlAZb/exec";
    
    try {
        // ==================== 讀取點數 (GET) ====================
        if (req.method === 'GET') {
            const { uid } = req.query;
            if (!uid) return res.status(400).json({ error: 'Missing UID' });
            
            const response = await fetch(`${gasUrl}?uid=${uid}`);
            const data = await response.json();
            
            if (data.error) return res.status(404).json(data);
            return res.status(200).json(data);
        }
        
        // ==================== 增加或扣除點數 (POST) ====================
        if (req.method === 'POST') {
            const response = await fetch(gasUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(req.body)
            });
            
            const data = await response.json();
            if (data.error) {
                // 如果是密碼錯誤，回傳 401
                if (data.error.includes("密碼")) return res.status(401).json(data);
                return res.status(400).json(data);
            }
            return res.status(200).json(data);
        }
        
        return res.status(405).json({ error: 'Method not allowed' });
        
    } catch (error) {
        console.error('伺服器錯誤:', error);
        return res.status(500).json({ error: '伺服器內部錯誤', detail: error.message });
    }
}