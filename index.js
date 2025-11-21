const express = require('express');
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
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
const rewardsRoutes = require('./routes/rewards');
const ordersRoutes = require('./routes/orders'); 

const app = express();

app.use(express.static('./public'));
app.use(cors());

// **SỬA QUAN TRỌNG: Tăng giới hạn lên 10MB để upload ảnh**
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Gắn các router
app.use('/api/auth', authRoutes); 
app.use('/api/auth/waste', wasteRoutes);
app.use('/api/auth/collection', collectionRoutes);
app.use('/api/collection-points', collectionPointsRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/rewards', rewardsRoutes);
app.use('/api/orders', ordersRoutes);

// Phục vụ file HTML
app.get('/', (req, res) => res.sendFile(path.join(__dirname, './public', 'index.html')));
app.get('/login.html', (req, res) => res.sendFile(path.join(__dirname, './public', 'login.html')));
app.get('/register.html', (req, res) => res.sendFile(path.join(__dirname, './public', 'register.html')));
app.get('/dashboard.html', (req, res) => res.sendFile(path.join(__dirname, './public', 'dashboard.html')));
app.get('/search.html', (req, res) => res.sendFile(path.join(__dirname, './public', 'search.html')));
app.get('/map.html', (req, res) => res.sendFile(path.join(__dirname, './public', 'map.html')));
app.get('/collection.html', (req, res) => res.sendFile(path.join(__dirname, './public', 'collection.html')));
app.get('/contact.html', (req, res) => res.sendFile(path.join(__dirname, './public', 'contact.html')));
app.get('/profile.html', (req, res) => res.sendFile(path.join(__dirname, './public', 'profile.html')));
app.get('/rewards.html', (req, res) => res.sendFile(path.join(__dirname, './public', 'rewards.html')));
app.get('/admin.html', (req, res) => res.sendFile(path.join(__dirname, './public', 'admin.html')));
app.get('/forgot-password.html', (req, res) => res.sendFile(path.join(__dirname, './public', 'forgot-password.html')));
app.get('/reset-password.html', (req, res) => res.sendFile(path.join(__dirname, './public', 'reset-password.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server đang chạy tại: http://localhost:${PORT}`));