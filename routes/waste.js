const express = require('express');
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
const router = express.Router();
const db = admin.database();
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

const UNIT_PRICE = 5000; // Giá mặc định: 5.000 VNĐ / kg

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
    else res.status(403).json({ success: false, message: 'Bạn không có quyền thực hiện hành động này!' });
};
const recyclerOnly = (req, res, next) => {
    const role = req.user.role;
    if (role === 'recycler' || role === 'admin') next();
    else res.status(403).json({ success: false, message: 'Bạn không có quyền truy cập tài nguyên này!' });
};
const adminOnly = (req, res, next) => {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Yêu cầu quyền Admin!' });
    next();
};

// --- CÁC ROUTE API ---

// 1. Đăng tải rác (Tự động tính giá)
router.post('/post', authMiddleware, providerOnly, async (req, res) => {
    const { type, quantity, locationName, lat, lng, image } = req.body; 
    if (!type || !quantity || !locationName) return res.status(400).json({ success: false, message: 'Thiếu thông tin!' });
    
    try {
        const qty = parseFloat(quantity);
        const estimatedPrice = qty * UNIT_PRICE; // Tính giá trị đơn hàng

        const wasteRef = db.ref('wastes').push();
        await wasteRef.set({
            userId: req.user.userId,
            type, 
            quantity: qty, 
            price: estimatedPrice, // Lưu giá vào DB
            location: locationName,
            lat: parseFloat(lat)||0, lng: parseFloat(lng)||0, image: image||'',
            status: 'pending', createdAt: Date.now()
        });
        await db.ref('users/' + req.user.userId).update({ points: admin.database.ServerValue.increment(qty) });
        res.json({ success: true, message: 'Đăng tải thành công!' });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// 2. Tìm kiếm (Bên Mua)
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
                price: waste.price || (waste.quantity * UNIT_PRICE), // Đảm bảo luôn có giá
                ownerName: owner.name || 'Ẩn danh', 
                ownerPhone: owner.phone || '', 
                ownerEmail: owner.email || '' 
            };
        });
        res.json(mergedWastes);
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// 3. Lấy rác của User (Dashboard)
router.get('/:userId', authMiddleware, providerOnly, async (req, res) => {
    if (req.params.userId !== req.user.userId) return res.status(403).json({ success: false });
    try {
        const wastesSnapshot = await db.ref('wastes').orderByChild('userId').equalTo(req.params.userId).once('value');
        const wastesData = wastesSnapshot.val() || {};
        const wastesArray = Object.keys(wastesData).map(key => ({ ...wastesData[key], id: key })).reverse();
        res.json(wastesArray);
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// 4. Admin lấy TẤT CẢ (Kèm thông tin thanh toán)
router.get('/admin/all', authMiddleware, adminOnly, async (req, res) => {
    try {
        const usersSnapshot = await db.ref('users').once('value');
        const usersMap = usersSnapshot.val() || {};
        const wastesSnapshot = await db.ref('wastes').once('value');
        const wastesData = wastesSnapshot.val() || {};
        
        let wastes = Object.keys(wastesData).map(key => {
            const w = wastesData[key];
            const owner = usersMap[w.userId] || {};
            
            let collectorInfo = null;
            if (w.collectedBy && usersMap[w.collectedBy]) {
                const c = usersMap[w.collectedBy];
                collectorInfo = { name: c.name, email: c.email, phone: c.phone || '' };
            }

            return {
                id: key,
                ...w,
                price: w.price || (w.quantity * UNIT_PRICE),
                ownerName: owner.name || 'Unknown',
                ownerEmail: owner.email || 'Unknown',
                collector: collectorInfo
            };
        });
        wastes.reverse();
        res.json(wastes);
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// 5. Admin XÓA
router.delete('/admin/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
        await db.ref('wastes/' + req.params.id).remove();
        res.json({ success: true, message: 'Đã xóa bài đăng!' });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;