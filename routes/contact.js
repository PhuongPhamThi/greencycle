const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
const db = admin.database();
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Middleware xác thực (Để biết ai đang chat)
const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'No token' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ success: false, message: 'Invalid token' });
    }
};

// 1. API Gửi phản hồi (Form Liên hệ cũ - Giữ nguyên)
router.post('/', async (req, res) => {
    const { name, email, message } = req.body;
    if (!name || !email || !message) return res.json({ success: false, message: 'Thiếu thông tin!' });
    try {
        await db.ref('feedback').push().set({ name, email, message, receivedAt: Date.now() });
        res.json({ success: true, message: 'Đã gửi phản hồi!' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi server.' });
    }
});

// 2. API Chat & Bot Trả lời tự động (MỚI)
router.post('/chat', authMiddleware, async (req, res) => {
    const { message } = req.body;
    const userId = req.user.userId;
    
    if (!message) return res.status(400).json({ success: false });

    try {
        const chatRef = db.ref(`chats/${userId}`);
        
        // A. Lưu tin nhắn của Người dùng
        await chatRef.push().set({
            text: message,
            sender: 'user',
            createdAt: Date.now(),
            read: false
        });

        // B. LOGIC CHATBOT (Phân tích từ khóa)
        const lowerMsg = message.toLowerCase();
        let botReply = "";

        if (lowerMsg.includes('đăng ký') || lowerMsg.includes('điểm thu gom')) {
            botReply = "Chào bạn! Để đăng ký làm Điểm Thu Gom, vui lòng để lại: Tên đơn vị, Địa chỉ và SĐT. Admin sẽ liên hệ xác minh trong 24h tới. 🌱";
        } 
        else if (lowerMsg.includes('đổi thưởng') || lowerMsg.includes('điểm xanh') || lowerMsg.includes('quà')) {
            botReply = "Tại GreenCycle, 1kg rác hữu cơ = 10 Điểm Xanh. Bạn có thể tích điểm để đổi Voucher hoặc quà tặng tại mục 'Đổi thưởng' nhé! 🎁";
        }
        else if (lowerMsg.includes('lỗi') || lowerMsg.includes('không được') || lowerMsg.includes('giúp')) {
            botReply = "Rất xin lỗi vì sự bất tiện này. Kỹ thuật viên đã nhận được thông báo và sẽ kiểm tra ngay. Bạn vui lòng thử lại sau ít phút nhé! 🛠️";
        }
        else if (lowerMsg.includes('xin chào') || lowerMsg.includes('hello') || lowerMsg.includes('hi')) {
            botReply = "Xin chào! Mình là trợ lý ảo GreenCycle. Mình có thể giúp gì cho bạn hôm nay? 👋";
        }

        // C. Nếu khớp từ khóa, Bot trả lời (sau 1 giây cho giống thật)
        if (botReply) {
            setTimeout(async () => {
                await chatRef.push().set({
                    text: botReply,
                    sender: 'admin', // Bot đóng vai Admin
                    createdAt: Date.now() + 100
                });
            }, 1000);
        } 
        // Nếu không khớp, không làm gì (để Admin thật trả lời sau)

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 3. API Lấy lịch sử Chat (MỚI)
router.get('/chat/history', authMiddleware, async (req, res) => {
    const userId = req.user.userId;
    try {
        // Lấy 50 tin nhắn gần nhất
        const snapshot = await db.ref(`chats/${userId}`).orderByChild('createdAt').limitToLast(50).once('value');
        const data = snapshot.val() || {};
        
        // Chuyển object thành mảng
        const messages = Object.values(data).sort((a, b) => a.createdAt - b.createdAt);
        
        res.json({ success: true, messages });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

module.exports = router;