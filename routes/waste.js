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

// 1. Đăng tải rác
router.post('/post', authMiddleware, providerOnly, async (req, res) => {
    const { type, quantity, locationName, lat, lng, image } = req.body; 
    if (!type || !quantity || !locationName) return res.status(400).json({ success: false, message: 'Thiếu thông tin!' });
    try {
        const wasteRef = db.ref('wastes').push();
        await wasteRef.set({
            userId: req.user.userId,
            type, quantity: parseFloat(quantity), location: locationName,
            lat: parseFloat(lat)||0, lng: parseFloat(lng)||0, image: image||'',
            status: 'pending', createdAt: Date.now()
        });
        await db.ref('users/' + req.user.userId).update({ points: admin.database.ServerValue.increment(parseFloat(quantity)) });
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
            return { ...waste, ownerName: owner.name || 'Ẩn danh', ownerPhone: owner.phone || '', ownerEmail: owner.email || '' };
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

// === ADMIN ROUTES (PHẦN QUAN TRỌNG BẠN ĐANG THIẾU) ===

// 4. Admin lấy TẤT CẢ bài đăng rác
router.get('/admin/all', authMiddleware, adminOnly, async (req, res) => {
    try {
        const usersSnapshot = await db.ref('users').once('value');
        const usersMap = usersSnapshot.val() || {};
        const wastesSnapshot = await db.ref('wastes').once('value');
        const wastesData = wastesSnapshot.val() || {};
        
        let wastes = Object.keys(wastesData).map(key => {
            const w = wastesData[key];
            const owner = usersMap[w.userId] || {};
            
            // Lấy thông tin người nhận (nếu có)
            let collectorInfo = null;
            if (w.collectedBy && usersMap[w.collectedBy]) {
                const c = usersMap[w.collectedBy];
                collectorInfo = { name: c.name, email: c.email };
            }

            return {
                id: key,
                ...w,
                ownerName: owner.name || 'Unknown',
                ownerEmail: owner.email || 'Unknown',
                collector: collectorInfo
            };
        });
        wastes.reverse(); // Mới nhất lên đầu
        res.json(wastes);
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// 5. Admin XÓA bài đăng rác
router.delete('/admin/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
        await db.ref('wastes/' + req.params.id).remove();
        res.json({ success: true, message: 'Đã xóa bài đăng rác!' });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// 6. Cập nhật bài đăng (Người dùng tự sửa)
router.put('/:id', authMiddleware, providerOnly, async (req, res) => {
    const wasteId = req.params.id;
    const { type, quantity, locationName, image } = req.body;
    const userId = req.user.userId;

    try {
        const wasteRef = db.ref('wastes/' + wasteId);
        const snapshot = await wasteRef.once('value');
        const waste = snapshot.val();

        if (!waste) return res.status(404).json({ success: false, message: 'Bài đăng không tồn tại!' });
        if (waste.userId !== userId) return res.status(403).json({ success: false, message: 'Bạn không có quyền sửa bài này!' });
        if (waste.status !== 'pending') return res.status(400).json({ success: false, message: 'Không thể sửa bài đã được thu gom!' });

        const updates = {};
        if (type) updates.type = type;
        if (quantity) updates.quantity = parseFloat(quantity);
        if (locationName) updates.location = locationName;
        if (image) updates.image = image;

        await wasteRef.update(updates);
        res.json({ success: true, message: 'Cập nhật bài đăng thành công!' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 7. Xóa bài đăng (Người dùng tự xóa)
router.delete('/:id', authMiddleware, providerOnly, async (req, res) => {
    const wasteId = req.params.id;
    const userId = req.user.userId;

    try {
        const wasteRef = db.ref('wastes/' + wasteId);
        const snapshot = await wasteRef.once('value');
        const waste = snapshot.val();

        if (!waste) return res.status(404).json({ success: false, message: 'Bài đăng không tồn tại!' });
        if (waste.userId !== userId) return res.status(403).json({ success: false, message: 'Bạn không có quyền xóa bài này!' });
        if (waste.status !== 'pending') return res.status(400).json({ success: false, message: 'Không thể xóa bài đã được thu gom!' });

        await wasteRef.remove();
        
        // Trừ điểm đã cộng
        await db.ref('users/' + userId).update({ points: admin.database.ServerValue.increment(-parseFloat(waste.quantity)) });

        res.json({ success: true, message: 'Đã xóa bài đăng và thu hồi điểm!' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;