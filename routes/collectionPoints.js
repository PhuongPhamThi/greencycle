const express = require('express');
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
const router = express.Router();
const db = admin.database();
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// (Middleware xác thực (authMiddleware) giữ nguyên)
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

// (Middleware Admin (adminMiddleware) giữ nguyên)
const adminMiddleware = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Không có quyền truy cập! Cần quyền Admin.' });
    }
    next();
};

/**
 * @route   GET /api/collection-points
 * @desc    Lấy TẤT CẢ các điểm thu gom
 * @access  Public
 */
router.get('/', async (req, res) => {
    try {
        const pointsSnapshot = await db.ref('collectionPoints').once('value');
        const pointsData = pointsSnapshot.val() || {};
        const pointsArray = Object.keys(pointsData).map(key => ({
            id: key,
            ...pointsData[key]
        }));
        res.json(pointsArray);
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi máy chủ: ' + err.message });
    }
});

/**
 * @route   POST /api/collection-points
 * @desc    Admin thêm một điểm thu gom MỚI
 * @access  Admin
 */
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
    // **SỬA: Chỉ nhận 2 trường đơn giản**
    const { name, address } = req.body;
    
    if (!name || !address) {
        return res.status(400).json({ success: false, message: 'Tên và địa chỉ không được để trống!' });
    }
    try {
        const newPointRef = db.ref('collectionPoints').push();
        // **SỬA: Chỉ lưu 2 trường đơn giản**
        await newPointRef.set({
            name: name,
            address: address
        });
        res.status(201).json({ success: true, message: 'Thêm điểm thu gom thành công!', id: newPointRef.key });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi máy chủ: ' + err.message });
    }
});

/**
 * @route   DELETE /api/collection-points/:id
 * @desc    Admin xóa một điểm thu gom
 * @access  Admin
 */
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const pointId = req.params.id;
        const pointRef = db.ref('collectionPoints/' + pointId);

        if (!(await pointRef.once('value')).exists()) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy điểm thu gom!' });
        }

        await pointRef.remove();
        res.json({ success: true, message: 'Xóa điểm thu gom thành công!' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi máy chủ: ' + err.message });
    }
});

module.exports = router;