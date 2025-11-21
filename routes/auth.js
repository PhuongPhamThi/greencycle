const express = require('express');
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ success: false, message: 'Không có token!' });
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; 
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn!' });
    }
};

const adminOnly = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Yêu cầu quyền Admin!' });
    }
    next();
};

let db, auth;
function initializeFirebase() {
    if (!db || !auth) {
        db = admin.database();
        auth = admin.auth();
    }
    return { db, auth };
}

router.post('/register', async (req, res) => {
    const { db, auth } = initializeFirebase();
    const { name, email, password, role } = req.body;
    console.log('Register request received:', { name, email, role });

    if (!name || !email || !password || !role || !['household', 'business'].includes(role)) {
        return res.status(400).json({ success: false, message: 'Thông tin không hợp lệ!' });
    }
    try {
        console.log('Attempting to create user with email:', email);
        const userRecord = await auth.createUser({ email, password });
        console.log('User created successfully, UID:', userRecord.uid);

        console.log('Attempting to write to database for UID:', userRecord.uid);
        await db.ref('users/' + userRecord.uid).set({
            name,
            email,
            role,
            points: 0,
            createdAt: Date.now(),
            enabled: true
        });
        console.log('Database write successful for UID:', userRecord.uid);
        res.status(201).json({ success: true, message: 'Đăng ký thành công! Vui lòng đăng nhập.' });
    } catch (err) {
        console.error('Register error details:', err.code, err.message);
        if (err.code === 'auth/email-already-exists') {
            return res.status(400).json({ success: false, message: 'Email đã được sử dụng!' });
        }
        res.status(500).json({ success: false, message: 'Lỗi máy chủ: ' + err.message });
    }
});

router.post('/login', async (req, res) => {
    const { db, auth } = initializeFirebase();
    const { email, idToken } = req.body;
    if (!email || !idToken) {
        return res.status(400).json({ success: false, message: 'Vui lòng nhập email và mật khẩu!' });
    }
    try {
        const decodedToken = await auth.verifyIdToken(idToken);
        const userId = decodedToken.uid;
        const userData = (await db.ref('users/' + userId).once('value')).val();
        if (!userData) {
            return res.status(404).json({ success: false, message: 'Dữ liệu người dùng không tồn tại!' });
        }

        const token = jwt.sign({ 
            userId, 
            role: userData.role,
            name: userData.name 
        }, JWT_SECRET, { expiresIn: '1h' });

        res.status(200).json({ success: true, token, message: 'Đăng nhập thành công!' });
    } catch (err) {
        console.error('Login error details:', err.code, err.message);
        if (err.code === 'auth/user-not-found') {
            return res.status(401).json({ success: false, message: 'Email không tồn tại!' });
        } else if (err.code === 'auth/argument-error' || err.code === 'auth/invalid-credential') {
            return res.status(401).json({ success: false, message: 'Mật khẩu không đúng hoặc token không hợp lệ!' });
        } else if (err.code === 'auth/id-token-expired') {
            return res.status(401).json({ success: false, message: 'Token đã hết hạn, vui lòng thử lại!' });
        }
        res.status(500).json({ success: false, message: 'Lỗi máy chủ: ' + err.message });
    }
});

router.get('/admin/users', authMiddleware, adminOnly, async (req, res) => {
    const { db } = initializeFirebase();
    try {
        const usersSnapshot = await db.ref('users').once('value');
        const usersData = usersSnapshot.val() || {};
        
        const usersArray = Object.keys(usersData).map(key => ({
            uid: key,
            ...usersData[key]
        }));
        
        res.json(usersArray);
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi máy chủ: ' + err.message });
    }
});

/**
 * @route   PUT /api/auth/admin/user/:userId
 * @desc    Admin cập nhật trạng thái (enabled) của người dùng
 * @access  Admin
 */
router.put('/admin/user/:userId', authMiddleware, adminOnly, async (req, res) => {
    const { db, auth } = initializeFirebase();
    const { userId } = req.params;
    const { enabled } = req.body; 

    if (typeof enabled !== 'boolean') {
        return res.status(400).json({ success: false, message: 'Trạng thái (enabled) không hợp lệ.' });
    }

    try {
        await auth.updateUser(userId, { disabled: !enabled });
        await db.ref('users/' + userId).update({ enabled: enabled });
        res.json({ success: true, message: `Đã ${enabled ? 'kích hoạt' : 'vô hiệu hóa'} người dùng.` });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi máy chủ: ' + err.message });
    }
});

// (Route /points của bạn giữ nguyên)
router.get('/points', authMiddleware, async (req, res) => {
    const { db } = initializeFirebase(); 
    try {
        const userId = req.user.userId;
        const userSnapshot = await db.ref('users/' + userId).once('value');
        const userData = userSnapshot.val(); 

        if (!userData) {
            return res.status(200).json({ success: true, points: 0 });
        }
        
        res.status(200).json({ success: true, points: userData.points || 0 });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi máy chủ: ' + err.message });
    }
});

// **THÊM MỚI: Route để Admin tạo tài khoản "Bên Mua" (Recycler)**
router.post('/admin/create-recycler', authMiddleware, adminOnly, async (req, res) => {
    const { db, auth } = initializeFirebase();
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ success: false, message: 'Thông tin không hợp lệ!' });
    }
    try {
        // 1. Tạo người dùng trong Firebase Authentication
        const userRecord = await auth.createUser({ email, password });
        
        // 2. Tạo dữ liệu người dùng trong Realtime Database với vai trò "recycler"
        await db.ref('users/' + userRecord.uid).set({
            name: name,
            email: email,
            role: 'recycler', // Gán vai trò "Bên Mua"
            points: 0, // Bên Mua không cần điểm
            createdAt: Date.now(),
            enabled: true
        });

        res.status(201).json({ success: true, message: `Đã tạo tài khoản Recycler ${name}!` });
    } catch (err) {
        if (err.code === 'auth/email-already-exists') {
            return res.status(400).json({ success: false, message: 'Email đã được sử dụng!' });
        }
        res.status(500).json({ success: false, message: 'Lỗi máy chủ: ' + err.message });
    }
});

router.get('/profile', authMiddleware, async (req, res) => {
    const { db } = initializeFirebase();
    try {
        const userData = (await db.ref('users/' + req.user.userId).once('value')).val();
        if (!userData) return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin!' });
        res.json({
            success: true,
            profile: {
                name: userData.name,
                email: userData.email,
                phone: userData.phone || '',
                address: userData.address || '',
                role: userData.role,
                points: userData.points || 0,
                avatar: userData.avatar || '' 
            }
        });
    } catch (err) { res.status(500).json({ success: false, message: 'Lỗi máy chủ!' }); }
});

router.put('/profile', authMiddleware, async (req, res) => {
    const { db } = initializeFirebase();
    const { name, phone, address, avatar } = req.body; 
    const userId = req.user.userId;

    if (!name || name.trim() === '') return res.status(400).json({ success: false, message: 'Tên không được để trống!' });

    try {
        const updates = {
            name: name.trim(),
            phone: phone?.trim() || '',
            address: address?.trim() || ''
        };
        if (avatar) {
            updates.avatar = avatar;
        }

        await db.ref('users/' + userId).update(updates);
        res.json({ success: true, message: 'Cập nhật thông tin thành công!' });
    } catch (err) {
        console.error('Update profile error:', err);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ!' });
    }
});

router.put('/change-password', authMiddleware, async (req, res) => {
    const { db, auth } = initializeFirebase();
    const { newPassword } = req.body;
    const userId = req.user.userId;

    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ success: false, message: 'Mật khẩu mới phải có ít nhất 6 ký tự!' });
    }

    try {
        // Cập nhật mật khẩu trong Firebase Auth
        await auth.updateUser(userId, {
            password: newPassword
        });
        res.json({ success: true, message: 'Đổi mật khẩu thành công!' });
    } catch (err) {
        console.error('Change password error:', err);
        res.status(500).json({ success: false, message: 'Lỗi: ' + err.message });
    }
});

router.get('/notifications', authMiddleware, async (req, res) => {
    const { db } = initializeFirebase();
    const userId = req.user.userId;

    try {
        const notificationsSnapshot = await db.ref('notifications/' + userId)
                                            .orderByChild('createdAt') // Sắp xếp theo thời gian
                                            .limitToLast(5) // Lấy 5 cái mới nhất
                                            .once('value');
        
        const notificationsData = notificationsSnapshot.val() || {};
        
        // Chuyển object thành mảng và đảo ngược để mới nhất lên đầu
        const notifications = Object.keys(notificationsData).map(key => ({
            id: key,
            ...notificationsData[key]
        })).reverse(); 

        // Kiểm tra xem có thông báo nào chưa đọc không (read: false)
        const hasUnread = notifications.some(n => n.read === false);

        res.json({ success: true, notifications, hasUnread });

    } catch (err) {
        console.error('Lỗi lấy thông báo:', err);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ!' });
    }
});

router.post('/notifications/mark-read', authMiddleware, async (req, res) => {
    const { db } = initializeFirebase();
    const userId = req.user.userId;

    try {
        const notificationsRef = db.ref('notifications/' + userId);
        // Tìm tất cả thông báo có 'read' = false
        const snapshot = await notificationsRef.orderByChild('read').equalTo(false).once('value');

        if (!snapshot.exists()) {
            return res.json({ success: true, message: 'Không có thông báo mới.' });
        }

        // Cập nhật tất cả thông báo chưa đọc thành đã đọc
        const updates = {};
        snapshot.forEach(child => {
            updates[child.key + '/read'] = true;
        });

        await notificationsRef.update(updates);
        res.json({ success: true, message: 'Đã đánh dấu đã đọc.' });

    } catch (err) {
        console.error('Lỗi đánh dấu đã đọc:', err);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ!' });
    }
});

router.delete('/profile', authMiddleware, async (req, res) => {
    const { db, auth } = initializeFirebase();
    const userId = req.user.userId;
    try {
        await db.ref('users/' + userId).update({ enabled: false });
        await auth.updateUser(userId, { disabled: true });
        res.json({ success: true, message: 'Tài khoản đã được vô hiệu hóa!' });
    } catch (err) {
        console.error('Disable account error:', err);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ!' });
    }
});

module.exports = router;