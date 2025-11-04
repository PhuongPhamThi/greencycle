const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

console.log('Checking serviceAccountKey.json existence');
const serviceAccount = require('./serviceAccountKey.json');

try {
    console.log('Attempting to initialize Firebase');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL
    });
    console.log('Firebase initialized successfully');
} catch (error) {
    console.error('Firebase initialization error:', error);
    process.exit(1);
}

const db = admin.database();
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Nhập các tệp router
const authRoutes = require('./routes/auth');
const wasteRoutes = require('./routes/waste');
const collectionRoutes = require('./routes/collection');
const collectionPointsRoutes = require('./routes/collectionPoints'); 
const contactRoutes = require('./routes/contact');
const ordersRoutes = require('./routes/orders'); 
const rewardsRoutes = require('./routes/rewards');

const app = express();

app.use(express.static('./public'));
app.use(cors());
app.use(bodyParser.json());

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Gắn các router vào đúng đường dẫn
app.use('/api/auth', authRoutes); // Xử lý: login, register, points, profile
app.use('/api/auth/waste', wasteRoutes); // Xử lý: /post, /:userId, /search
app.use('/api/auth/collection', collectionRoutes); // Xử lý: /request
app.use('/api/collection-points', collectionPointsRoutes); // Xử lý điểm thu gom của admin
app.use('/api/contact', contactRoutes); // **THÊM MỚI**
app.use('/api/orders', ordersRoutes); // Giữ lại
app.use('/api/rewards', rewardsRoutes);

const path = require('path');
// (Toàn bộ phần app.get của bạn cho các tệp HTML giữ nguyên)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, './public', 'index.html'));
});
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, './public', 'login.html'));
});
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, './public', 'dashboard.html'));
});
app.get('/search', (req, res) => {
    res.sendFile(path.join(__dirname, './public', 'search.html'));
});
app.get('/map', (req, res) => {
    res.sendFile(path.join(__dirname, './public', 'map.html'));
});
app.get('/collection', (req, res) => {
    res.sendFile(path.join(__dirname, './public', 'collection.html'));
});
app.get('/contact', (req, res) => {
    res.sendFile(path.join(__dirname, './public', 'contact.html'));
});
app.get('/profile', (req, res) => {
    res.sendFile(path.join(__dirname, './public', 'profile.html'));
});
// Thêm trang admin (từ lần trước)
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, './public', 'admin.html'));
});
app.get('/rewards', (req, res) => {
    res.sendFile(path.join(__dirname, './public', 'rewards.html'));
});


app.listen(3000, () => console.log('✅ Server đang chạy tại: http://localhost:3000'));