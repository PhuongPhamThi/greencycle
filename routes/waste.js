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

// Middleware: Chỉ cho Bên Bán
const providerOnly = (req, res, next) => {
    const role = req.user.role;
    if (role === 'household' || role === 'business' || role === 'admin') next();
    else res.status(403).json({ success: false, message: 'Bạn không có quyền thực hiện hành động này!' });
};

// Middleware: Chỉ cho Bên Mua
const recyclerOnly = (req, res, next) => {
    const role = req.user.role;
    if (role === 'recycler' || role === 'admin') next();
    else res.status(403).json({ success: false, message: 'Chỉ tài khoản "Bên Mua" mới được tìm kiếm!' });
};

// 1. Đăng tải rác (Bên Bán)
router.post('/post', authMiddleware, providerOnly, async (req, res) => {
    const { type, quantity, locationName, lat, lng } = req.body;
    if (!type || !quantity || !locationName) {
        return res.status(400).json({ success: false, message: 'Thông tin chất thải không hợp lệ!' });
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
        
        const userRef = db.ref('users/' + req.user.userId);
        await userRef.update({ points: admin.database.ServerValue.increment(parseFloat(quantity)) });
        
        res.json({ success: true, message: 'Đăng tải chất thải thành công!' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi máy chủ: ' + err.message });
    }
});

// 2. Tìm kiếm (Bên Mua) - QUAN TRỌNG
router.get('/search', authMiddleware, recyclerOnly, async (req, res) => {
    const { q, type, status } = req.query;
    try {
        // Lấy users để biết tên chủ sở hữu
        const usersSnapshot = await db.ref('users').once('value');
        const usersMap = usersSnapshot.val() || {};
        
        // Lấy rác
        const wastesSnapshot = await db.ref('wastes').once('value');
        const wastesData = wastesSnapshot.val() || {};
        
        let wastes = Object.keys(wastesData).map(key => {
            return { ...wastesData[key], id: key };
        });

        // Lọc dữ liệu
        if (q) {
            const lowerQ = q.toLowerCase();
            wastes = wastes.filter(w => (w.location?.toLowerCase().includes(lowerQ) || w.type?.toLowerCase().includes(lowerQ)));
        }
        if (type) wastes = wastes.filter(w => w.type?.toLowerCase() === type.toLowerCase());
        if (status) wastes = wastes.filter(w => w.status === status);
        
        // Gộp thông tin chủ sở hữu (Join)
        const mergedWastes = wastes.map(waste => {
            const owner = usersMap[waste.userId] || {};
            return {
                ...waste,
                ownerName: owner.name || 'Ẩn danh',
                ownerPhone: owner.phone || 'Chưa cập nhật',
                ownerEmail: owner.email || 'Ẩn'
            };
        });

        res.json(mergedWastes);
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi tìm kiếm: ' + err.message });
    }
});

// 3. Lấy rác của user (Bên Bán xem Dashboard)
router.get('/:userId', authMiddleware, providerOnly, async (req, res) => {
    if (req.params.userId !== req.user.userId) {
        return res.status(403).json({ success: false, message: 'Không có quyền truy cập!' });
    }
    try {
        const wastesSnapshot = await db.ref('wastes').orderByChild('userId').equalTo(req.params.userId).once('value');
        const wastesData = wastesSnapshot.val() || {};
        const wastesArray = Object.keys(wastesData).map(key => ({ ...wastesData[key], id: key })).reverse();
        res.json(wastesArray);
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi lấy dữ liệu: ' + err.message });
    }
});

module.exports = router;