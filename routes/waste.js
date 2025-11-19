const express = require('express');
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
const router = express.Router();
const db = admin.database();
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Middleware xác thực
const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Không có token!' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ success: false, message: 'Token không hợp lệ!' });
    }
};

// Middleware phân quyền
const providerOnly = (req, res, next) => {
    const role = req.user.role;
    if (role === 'household' || role === 'business' || role === 'admin') next();
    else res.status(403).json({ success: false, message: 'Sai vai trò (Cần: Bên Bán)' });
};

const recyclerOnly = (req, res, next) => {
    const role = req.user.role;
    if (role === 'recycler' || role === 'admin') next();
    else res.status(403).json({ success: false, message: 'Sai vai trò (Cần: Bên Mua)' });
};

// 1. Đăng tải rác
router.post('/post', authMiddleware, providerOnly, async (req, res) => {
    const { type, quantity, locationName, lat, lng } = req.body; 
    if (!type || !quantity || !locationName) {
        return res.status(400).json({ success: false, message: 'Thiếu thông tin!' });
    }
    try {
        const wasteRef = db.ref('wastes').push();
        await wasteRef.set({
            userId: req.user.userId,
            type,
            quantity: parseFloat(quantity),
            location: locationName,
            lat: parseFloat(lat) || 0,
            lng: parseFloat(lng) || 0,
            status: 'pending',
            createdAt: Date.now()
        });
        // Cộng điểm
        const userRef = db.ref('users/' + req.user.userId);
        await userRef.update({ points: admin.database.ServerValue.increment(parseFloat(quantity)) });
        res.json({ success: true, message: 'Đăng tải thành công!' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi server: ' + err.message });
    }
});

// 2. Lấy danh sách rác (SỬA LẠI: Lọc thủ công để tránh bị treo)
router.get('/:userId', authMiddleware, providerOnly, async (req, res) => {
    if (req.params.userId !== req.user.userId) {
        return res.status(403).json({ success: false, message: 'Không có quyền!' });
    }

    try {
        // Lấy TOÀN BỘ bảng wastes (An toàn hơn query)
        const wastesSnapshot = await db.ref('wastes').once('value');
        const wastesData = wastesSnapshot.val() || {};

        // Lọc thủ công bằng code
        const userWastes = Object.keys(wastesData)
            .map(key => ({ ...wastesData[key], id: key }))
            .filter(item => item.userId === req.params.userId); // Chỉ lấy của user này
        
        // Sắp xếp mới nhất
        userWastes.sort((a, b) => b.createdAt - a.createdAt);

        res.json(userWastes); 
    } catch (err) {
        console.error("Lỗi lấy danh sách:", err);
        res.status(500).json({ success: false, message: 'Lỗi server: ' + err.message });
    }
});

// 3. Tìm kiếm rác
router.get('/search', authMiddleware, recyclerOnly, async (req, res) => {
    const { q, type, status } = req.query;
    try {
        const usersSnapshot = await db.ref('users').once('value');
        const usersMap = usersSnapshot.val() || {};
        const wastesSnapshot = await db.ref('wastes').once('value');
        const wastesData = wastesSnapshot.val() || {};
        
        let wastes = Object.keys(wastesData).map(key => ({ ...wastesData[key], id: key }));

        if (q) {
            const lowerQ = q.toLowerCase();
            wastes = wastes.filter(w => (w.location?.toLowerCase().includes(lowerQ) || w.type?.toLowerCase().includes(lowerQ)));
        }
        if (type) wastes = wastes.filter(w => w.type?.toLowerCase() === type.toLowerCase());
        if (status) wastes = wastes.filter(w => w.status === status);
        
        const mergedWastes = wastes.map(waste => {
            const owner = usersMap[waste.userId] || {};
            return {
                ...waste,
                ownerName: owner.name || 'Ẩn danh',
                ownerPhone: owner.phone || '',
                ownerEmail: owner.email || ''
            };
        });
        res.json(mergedWastes);
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi tìm kiếm: ' + err.message });
    }
});

module.exports = router;