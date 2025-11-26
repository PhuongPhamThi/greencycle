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

// 1. Đăng tải rác
router.post('/post', authMiddleware, async (req, res) => {
    const { type, quantity, locationName, lat, lng, image } = req.body; 
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
            lat: parseFloat(lat)||0, 
            lng: parseFloat(lng)||0, 
            image: image||'',
            status: 'pending', 
            createdAt: Date.now()
        });
        
        // Cộng điểm xanh
        await db.ref('users/' + req.user.userId).update({ 
            points: admin.database.ServerValue.increment(parseFloat(quantity)) 
        });
        
        res.json({ success: true, message: 'Đăng tải thành công!' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 2. Tìm kiếm (Cho bên mua)
router.get('/search', async (req, res) => {
    const { q, type, status } = req.query;
    try {
        // Lấy users để hiển thị tên
        const usersSnapshot = await db.ref('users').once('value');
        const usersMap = usersSnapshot.val() || {};
        
        const wastesSnapshot = await db.ref('wastes').once('value');
        const wastesData = wastesSnapshot.val() || {};
        
        let wastes = Object.keys(wastesData).map(key => ({ ...wastesData[key], id: key }));

        // Lọc dữ liệu
        if (q) {
            const lowerQ = q.toLowerCase();
            wastes = wastes.filter(w => (w.location?.toLowerCase().includes(lowerQ) || w.type?.toLowerCase().includes(lowerQ)));
        }
        if (type) wastes = wastes.filter(w => w.type?.toLowerCase() === type.toLowerCase());
        if (status) wastes = wastes.filter(w => w.status === status);
        
        // Gộp thông tin người đăng
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
        res.status(500).json({ success: false, message: err.message });
    }
});

// 3. Lấy danh sách của User (Cho Dashboard)
router.get('/:userId', authMiddleware, async (req, res) => {
    // Chỉ cho phép xem của chính mình
    if (req.params.userId !== req.user.userId) {
        return res.status(403).json({ success: false, message: 'Không có quyền truy cập!' });
    }
    try {
        const wastesSnapshot = await db.ref('wastes').orderByChild('userId').equalTo(req.params.userId).once('value');
        const wastesData = wastesSnapshot.val() || {};
        
        // Chuyển object thành array và đảo ngược (mới nhất lên đầu)
        const wastesArray = Object.keys(wastesData).map(key => ({ 
            ...wastesData[key], 
            id: key 
        })).reverse();
        
        res.json(wastesArray);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ==========================================
// THÊM MỚI: API SỬA VÀ XÓA (FIX LỖI 404)
// ==========================================

// 4. Cập nhật bài đăng (PUT)
router.put('/:id', authMiddleware, async (req, res) => {
    const wasteId = req.params.id;
    const { type, quantity, locationName } = req.body; // Nhận dữ liệu sửa
    const userId = req.user.userId;

    try {
        const wasteRef = db.ref('wastes/' + wasteId);
        const snapshot = await wasteRef.once('value');
        const waste = snapshot.val();

        if (!waste) return res.status(404).json({ success: false, message: 'Bài đăng không tồn tại!' });
        
        // Kiểm tra quyền sở hữu
        if (waste.userId !== userId) {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền sửa bài này!' });
        }
        
        // Kiểm tra trạng thái (chỉ sửa được khi chưa ai nhận)
        if (waste.status !== 'pending') {
            return res.status(400).json({ success: false, message: 'Không thể sửa bài đã được thu gom!' });
        }

        // Thực hiện update
        const updates = {};
        if (type) updates.type = type;
        if (quantity) updates.quantity = parseFloat(quantity);
        if (locationName) updates.location = locationName;
        
        await wasteRef.update(updates);
        res.json({ success: true, message: 'Cập nhật bài đăng thành công!' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 5. Xóa bài đăng (DELETE)
router.delete('/:id', authMiddleware, async (req, res) => {
    const wasteId = req.params.id;
    const userId = req.user.userId;

    try {
        const wasteRef = db.ref('wastes/' + wasteId);
        const snapshot = await wasteRef.once('value');
        const waste = snapshot.val();

        if (!waste) return res.status(404).json({ success: false, message: 'Bài đăng không tồn tại!' });
        if (waste.userId !== userId) return res.status(403).json({ success: false, message: 'Bạn không có quyền xóa bài này!' });
        if (waste.status !== 'pending') return res.status(400).json({ success: false, message: 'Không thể xóa bài đã được thu gom!' });

        // Xóa bài
        await wasteRef.remove();
        
        // Trừ điểm đã cộng (tránh gian lận)
        if (waste.quantity > 0) {
            await db.ref('users/' + userId).update({ 
                points: admin.database.ServerValue.increment(-parseFloat(waste.quantity)) 
            });
        }

        res.json({ success: true, message: 'Đã xóa bài đăng!' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;