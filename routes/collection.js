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

// Middleware MỚI: Chỉ cho phép "Bên Mua" (Recycler) hoặc Admin
const recyclerOnly = (req, res, next) => {
    const role = req.user.role;
    if (role === 'recycler' || role === 'admin') {
        next(); // Cho phép đi tiếp
    } else {
        res.status(403).json({ success: false, message: 'Bạn không có quyền thực hiện hành động này!' });
    }
};

// --- CÁC ROUTE ---

// 1. Route cũ: Người đăng tự yêu cầu thu gom (Giữ lại để tương thích)
router.post('/request', authMiddleware, async (req, res) => {
    const { wasteId } = req.body;
    if (!wasteId) return res.status(400).json({ success: false, message: 'Vui lòng chọn chất thải!' });
    
    try {
        const wasteRef = db.ref('wastes/' + wasteId);
        const waste = (await wasteRef.once('value')).val();

        if (!waste) return res.status(404).json({ success: false, message: 'Chất thải không tồn tại!' });
        if (waste.userId !== req.user.userId) return res.status(403).json({ success: false, message: 'Không có quyền!' });
        if (waste.status !== 'pending') return res.status(400).json({ success: false, message: 'Đã được xử lý!' });

        await wasteRef.update({ status: 'collected', collectedAt: Date.now() });
        res.json({ success: true, message: 'Cập nhật thành công!' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * @route   POST /api/auth/collection/claim
 * @desc    (Bên Mua) Chấp nhận thu gom một mục rác
 * @access  Recycler, Admin
 */
router.post('/claim', authMiddleware, recyclerOnly, async (req, res) => {
    // Nhận thêm thông tin vận chuyển và thanh toán
    const { wasteId, shippingMethod, paymentMethod } = req.body;
    const recyclerUserId = req.user.userId; // ID của người đang đăng nhập (Bên Mua)

    if (!wasteId) {
        return res.status(400).json({ success: false, message: 'Vui lòng chọn chất thải!' });
    }
    
    try {
        const wasteRef = db.ref('wastes/' + wasteId);
        const waste = (await wasteRef.once('value')).val();

        // 1. Kiểm tra tồn tại
        if (!waste) {
            return res.status(404).json({ success: false, message: 'Chất thải không tồn tại!' });
        }

        // 2. Kiểm tra trạng thái (Phải là pending thì mới được nhận)
        if (waste.status !== 'pending') {
            return res.status(400).json({ success: false, message: 'Rác này đã được người khác nhận!' });
        }

        // 3. Logic trạng thái vận chuyển
        let newStatus = 'collected'; // Mặc định là đã thu gom xong (nếu Tự đến lấy)
        let shippingStatus = 'none';

        if (shippingMethod === 'delivery') {
            newStatus = 'delivering'; // Chuyển sang trạng thái đang giao
            shippingStatus = 'preparing'; // Đang chuẩn bị hàng
        }

        // 4. Cập nhật Database
        await wasteRef.update({ 
            status: newStatus,
            shippingMethod: shippingMethod || 'self', // Mặc định tự lấy
            shippingStatus: shippingStatus,
            paymentMethod: paymentMethod || 'full', // Mặc định thanh toán 100%
            collectedAt: Date.now(),
            collectedBy: recyclerUserId // Ghi lại ID của người mua
        });
        
        // (Tùy chọn) Tạo thông báo cho người bán
        const notificationRef = db.ref('notifications/' + waste.userId).push();
        await notificationRef.set({
            message: `Đơn rác "${waste.type}" của bạn đã được nhận bởi một đối tác!`,
            wasteId: wasteId,
            read: false,
            createdAt: Date.now()
        });

        res.json({ success: true, message: 'Nhận thu gom thành công!' });

    } catch (err) {
        console.error("Lỗi khi claim:", err);
        res.status(500).json({ success: false, message: 'Lỗi xử lý: ' + err.message });
    }
});

module.exports = router;