const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
const db = admin.database();
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Middleware xác thực
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

// Middleware Admin
const adminOnly = (req, res, next) => {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin access required' });
    next();
};

// 1. Gửi phản hồi (Form cũ)
router.post('/', async (req, res) => {
    const { name, email, message } = req.body;
    if (!name || !email || !message) return res.json({ success: false, message: 'Thiếu thông tin!' });
    try {
        await db.ref('feedback').push().set({ name, email, message, receivedAt: Date.now() });
        res.json({ success: true, message: 'Đã gửi phản hồi!' });
    } catch (err) { res.status(500).json({ success: false, message: 'Lỗi server.' }); }
});

// 2. User Gửi tin nhắn Chat
router.post('/chat', authMiddleware, async (req, res) => {
    const { message } = req.body;
    const userId = req.user.userId;
    if (!message) return res.status(400).json({ success: false });

    try {
        const chatRef = db.ref(`chats/${userId}`);
        await chatRef.push().set({
            text: message, sender: 'user', createdAt: Date.now(), read: false
        });

        // Chatbot trả lời tự động
        const lowerMsg = message.toLowerCase();
        let botReply = null;
        if (lowerMsg.includes('đăng ký') || lowerMsg.includes('điểm thu gom')) botReply = "Chào bạn! Để đăng ký làm Điểm Thu Gom, vui lòng để lại: Tên đơn vị, Địa chỉ và SĐT.";
        else if (lowerMsg.includes('đổi thưởng') || lowerMsg.includes('điểm xanh')) botReply = "1kg rác = 10 Điểm Xanh. Bạn có thể đổi quà tại mục 'Đổi thưởng' nhé!";
        else if (lowerMsg.includes('xin chào')) botReply = "Chào bạn! Mình là trợ lý ảo GreenCycle.";

        if (botReply) {
            setTimeout(async () => {
                await chatRef.push().set({ text: botReply, sender: 'admin', createdAt: Date.now() + 100 });
            }, 1000);
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// 3. User Lấy lịch sử Chat
router.get('/chat/history', authMiddleware, async (req, res) => {
    const userId = req.user.userId;
    try {
        const snapshot = await db.ref(`chats/${userId}`).orderByChild('createdAt').limitToLast(50).once('value');
        const data = snapshot.val() || {};
        const messages = Object.values(data).sort((a, b) => a.createdAt - b.createdAt);
        res.json({ success: true, messages });
    } catch (err) { res.status(500).json({ success: false }); }
});

// === API DÀNH CHO ADMIN (MỚI) ===

// 4. Lấy danh sách người dùng đã chat
router.get('/admin/list-users', authMiddleware, adminOnly, async (req, res) => {
    try {
        // Lấy danh sách các ID trong bảng chats
        const chatsSnapshot = await db.ref('chats').once('value');
        const chatsData = chatsSnapshot.val() || {};
        const userIds = Object.keys(chatsData);

        // Lấy thông tin chi tiết của từng user
        const usersSnapshot = await db.ref('users').once('value');
        const usersMap = usersSnapshot.val() || {};

        const chatUsers = userIds.map(uid => {
            const userInfo = usersMap[uid] || { name: 'Khách lạ', email: 'Ẩn danh' };
            // Lấy tin nhắn cuối cùng
            const msgs = Object.values(chatsData[uid]);
            const lastMsg = msgs[msgs.length - 1];
            
            return {
                userId: uid,
                name: userInfo.name,
                email: userInfo.email,
                avatar: userInfo.avatar,
                lastMessage: lastMsg ? lastMsg.text : '',
                lastTime: lastMsg ? lastMsg.createdAt : 0
            };
        });

        // Sắp xếp người mới nhắn lên đầu
        chatUsers.sort((a, b) => b.lastTime - a.lastTime);
        res.json({ success: true, users: chatUsers });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// 5. Lấy lịch sử chat với 1 User cụ thể
router.get('/admin/history/:targetUserId', authMiddleware, adminOnly, async (req, res) => {
    try {
        const targetId = req.params.targetUserId;
        const snapshot = await db.ref(`chats/${targetId}`).orderByChild('createdAt').limitToLast(100).once('value');
        const data = snapshot.val() || {};
        const messages = Object.values(data).sort((a, b) => a.createdAt - b.createdAt);
        res.json({ success: true, messages });
    } catch (err) { res.status(500).json({ success: false }); }
});

// 6. Admin trả lời tin nhắn
router.post('/admin/reply', authMiddleware, adminOnly, async (req, res) => {
    const { targetUserId, message } = req.body;
    if (!message || !targetUserId) return res.status(400).json({ success: false });
    try {
        await db.ref(`chats/${targetUserId}`).push().set({
            text: message,
            sender: 'admin', // Đánh dấu là Admin gửi
            createdAt: Date.now(),
            read: false
        });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
});

module.exports = router;