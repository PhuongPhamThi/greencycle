const express = require('express');
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
const router = express.Router();
const db = admin.database();
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Middleware xác thực (Lấy token và giải mã)
const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Không có token!' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // req.user chứa { userId, role, name }
        next();
    } catch (err) {
        res.status(401).json({ success: false, message: 'Token không hợp lệ!' });
    }
};

// Middleware MỚI: Chỉ cho phép "Bên Mua" (Recycler)
const recyclerOnly = (req, res, next) => {
    const role = req.user.role;
    if (role === 'recycler' || role === 'admin') {
        next(); // Cho phép
    } else {
        res.status(403).json({ success: false, message: 'Bạn không có quyền thực hiện hành động này!' });
    }
};

/**
 * @route   POST /api/auth/collection/claim
 * @desc    (Bên Mua) Chấp nhận thu gom một mục rác
 * @access  Recycler, Admin
 */
router.post('/claim', authMiddleware, recyclerOnly, async (req, res) => {
    const { wasteId } = req.body;
    const recyclerUserId = req.user.userId; // ID của "Bên Mua"

    if (!wasteId) {
        return res.status(400).json({ success: false, message: 'Vui lòng chọn chất thải!' });
    }
    
    try {
        const wasteRef = db.ref('wastes/' + wasteId);
        const waste = (await wasteRef.once('value')).val();

        if (!waste) {
            return res.status(404).json({ success: false, message: 'Chất thải không tồn tại!' });
        }

        // Kiểm tra xem rác còn "pending" không
        if (waste.status !== 'pending') {
            return res.status(400).json({ success: false, message: 'Rác này đã được người khác nhận!' });
        }

        // Cập nhật trạng thái và ghi lại ai đã nhận
        await wasteRef.update({ 
            status: 'collected', // (Bạn có thể đổi thành 'in_progress' nếu muốn)
            collectedAt: Date.now(),
            collectedBy: recyclerUserId // Ghi lại ID của "Bên Mua"
        });
        
        // Nâng cao: Tạo thông báo cho "Bên Bán" (Hộ gia đình)
        const providerUserId = waste.userId;
        const notificationRef = db.ref('notifications/' + providerUserId).push();
        await notificationRef.set({
            message: `Mục rác "${waste.type}" của bạn đã có người nhận!`,
            wasteId: wasteId,
            read: false,
            createdAt: Date.now()
        });

        res.json({ success: true, message: 'Nhận thu gom thành công!' });

    } catch (err) {
        console.error("Lỗi khi nhận thu gom (claim):", err);
        res.status(500).json({ success: false, message: 'Lỗi xử lý: ' + err.message });
    }
});

module.exports = router;