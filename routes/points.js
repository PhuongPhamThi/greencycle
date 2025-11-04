const express = require('express');
const admin = require('firebase-admin');
const router = express.Router();
const db = admin.database();
const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Không có token' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ success: false, message: 'Token không hợp lệ' });
    }
};

router.get('/', authMiddleware, async (req, res) => {
    try {
        const user = await db.ref('users/' + req.user.userId).once('value');
        res.json({ points: user.val().points || 0 });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi máy chủ: ' + err.message });
    }
});

module.exports = router;