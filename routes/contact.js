const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const db = admin.database();

router.post('/', async (req, res) => {
    const { name, email, message } = req.body;
    
    if (!name || !email || !message) {
        return res.json({ success: false, message: 'Vui lòng điền đầy đủ thông tin!' });
    }

    try {
        // Lưu phản hồi vào nhánh 'feedback' trong Firebase
        const feedbackRef = db.ref('feedback').push();
        await feedbackRef.set({
            name: name,
            email: email,
            message: message,
            receivedAt: Date.now()
        });
        
        res.json({ success: true, message: 'Phản hồi đã được gửi thành công! Cảm ơn bạn.' });
    } catch (err) {
        console.error("Lỗi lưu feedback:", err);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ, không thể gửi phản hồi.' });
    }
});

module.exports = router;