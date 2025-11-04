const express = require('express');
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
const router = express.Router();
const db = admin.database();
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// (authMiddleware và các middleware phân quyền providerOnly/recyclerOnly giữ nguyên)
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


// (Route /post và /:userId giữ nguyên)
router.post('/post', authMiddleware, providerOnly, async (req, res) => {
    // ... (code đăng rác giữ nguyên)
    const { type, quantity, locationName, lat, lng } = req.body; 
    if (!type || !quantity || !locationName || !lat || !lng || quantity <= 0) {
        return res.status(400).json({ success: false, message: 'Thông tin chất thải không hợp lệ!' });
    }
    try {
        const wasteRef = db.ref('wastes').push();
        await wasteRef.set({
            userId: req.user.userId,
            type,
            quantity: parseFloat(quantity),
            location: locationName,
            lat: parseFloat(lat),
            lng: parseFloat(lng),
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

router.get('/:userId', authMiddleware, providerOnly, async (req, res) => {
    // ... (code lấy rác của user giữ nguyên)
});


// **NÂNG CẤP: Route /search (Gộp thông tin "Bên Bán")**
router.get('/search', authMiddleware, recyclerOnly, async (req, res) => {
    const { q, type, min_quantity, status } = req.query;
    try {
        // 1. Lấy TẤT CẢ người dùng (Bên Bán) một lần
        const usersSnapshot = await db.ref('users').once('value');
        const usersMap = usersSnapshot.val() || {};

        // 2. Lấy TẤT CẢ rác
        const wastesSnapshot = await db.ref('wastes').once('value');
        const wastesData = wastesSnapshot.val() || {};
        
        let wastes = Object.keys(wastesData).map(key => {
            return { ...wastesData[key], id: key };
        });

        // 3. Lọc rác (logic cũ giữ nguyên)
        if (q) wastes = wastes.filter(w => (w.location?.toLowerCase().includes(q.toLowerCase()) || w.type?.toLowerCase().includes(q.toLowerCase())));
        if (type) wastes = wastes.filter(w => w.type?.toLowerCase() === type.toLowerCase());
        if (min_quantity) wastes = wastes.filter(w => w.quantity >= parseFloat(min_quantity));
        if (status) wastes = wastes.filter(w => w.status === status);
        
        // 4. **GỘP DỮ LIỆU (JOIN):** Thêm thông tin "Chủ sở hữu" vào mỗi mục rác
        const mergedWastes = wastes.map(waste => {
            const owner = usersMap[waste.userId] || {}; // Lấy thông tin chủ sở hữu
            return {
                ...waste,
                ownerName: owner.name || 'Không rõ',
                ownerPhone: owner.phone || 'Chưa cập nhật',
                ownerEmail: owner.email || 'Không rõ'
            };
        });

        res.json(mergedWastes); // Trả về mảng đã gộp
        
    } catch (err) {
        console.error("Lỗi /search:", err);
        res.status(500).json({ success: false, message: 'Lỗi tìm kiếm: ' + err.message });
    }
});

module.exports = router;