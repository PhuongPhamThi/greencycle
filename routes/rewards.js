const express = require('express');
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
const router = express.Router();
const db = admin.database();
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// === Middleware Xác thực (Copy từ tệp khác) ===
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

// === DỮ LIỆU MẪU (BẠN NÊN CHUYỂN VÀO FIREBASE) ===
// Tạm thời, chúng ta sẽ hard-code.
// Bạn có thể dùng trang admin.html để tạo một mục quản lý các phần thưởng này
const allRewards = {
    "reward1": {
        id: "reward1",
        name: "Voucher Giảm giá 20.000đ",
        description: "Áp dụng tại các cửa hàng tiện lợi liên kết.",
        pointsNeeded: 200,
        imageUrl: "https://i.imgur.com/TOLC9GR.png" // Ảnh voucher mẫu
    },
    "reward2": {
        id: "reward2",
        name: "Túi vải GREENCYCLE",
        description: "Một chiếc túi vải thân thiện với môi trường.",
        pointsNeeded: 500,
        imageUrl: "https://i.imgur.com/g8DSX1r.png" // Ảnh túi vải mẫu
    },
    "reward3": {
        id: "reward3",
        name: "Cây Xanh Để Bàn",
        description: "Một cây sen đá nhỏ, góp phần làm xanh không gian.",
        pointsNeeded: 1000,
        imageUrl: "https://i.imgur.com/a2wY79B.png" // Ảnh cây sen đá
    }
};

/**
 * @route   GET /api/rewards
 * @desc    Lấy danh sách tất cả phần thưởng
 * @access  Private
 */
router.get('/', authMiddleware, async (req, res) => {
    try {
        // Tạm thời trả về mảng hard-coded
        // Tương lai: Thay bằng logic lấy từ db.ref('rewards')
        res.json(Object.values(allRewards));
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi máy chủ: ' + err.message });
    }
});

/**
 * @route   POST /api/rewards/redeem
 * @desc    Đổi một phần thưởng
 * @access  Private
 */
router.post('/redeem', authMiddleware, async (req, res) => {
    const { rewardId } = req.body;
    const userId = req.user.userId;

    if (!rewardId) {
        return res.status(400).json({ success: false, message: 'Thiếu ID phần thưởng!' });
    }

    try {
        // 1. Lấy thông tin phần thưởng (từ dữ liệu hard-coded)
        const reward = allRewards[rewardId]; 
        if (!reward) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy phần thưởng!' });
        }

        const pointsNeeded = reward.pointsNeeded;
        const userRef = db.ref('users/' + userId);
        
        // 2. Lấy thông tin điểm của người dùng (dùng transaction cho an toàn)
        const { committed, snapshot } = await userRef.transaction(userData => {
            if (userData) {
                const currentPoints = userData.points || 0;
                if (currentPoints < pointsNeeded) {
                    // Không đủ điểm, hủy transaction
                    return; // Trả về undefined
                }
                // Đủ điểm, trừ điểm
                userData.points = currentPoints - pointsNeeded;
                return userData; // Trả về dữ liệu mới
            }
            return userData; // Người dùng không tồn tại
        });

        // 3. Xử lý kết quả transaction
        if (!committed) {
            return res.status(400).json({ success: false, message: 'Bạn không đủ điểm xanh!' });
        }
        
        if (!snapshot.exists()) {
             return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng!' });
        }

        // 4. Ghi lại lịch sử đổi thưởng
        const historyRef = db.ref('redemptionHistory/' + userId).push();
        await historyRef.set({
            rewardId: reward.id,
            rewardName: reward.name,
            pointsUsed: reward.pointsNeeded,
            redeemedAt: Date.now()
        });

        res.json({ success: true, message: `Đổi "${reward.name}" thành công!` });

    } catch (err) {
        console.error("Lỗi đổi thưởng:", err);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ: ' + err.message });
    }
});

/**
 * @route   GET /api/rewards/history
 * @desc    Lấy lịch sử đổi thưởng của người dùng
 * @access  Private
 */
router.get('/history', authMiddleware, async (req, res) => {
    const userId = req.user.userId;
    try {
        const historySnapshot = await db.ref('redemptionHistory/' + userId)
                                        .orderByChild('redeemedAt') // Sắp xếp mới nhất lên đầu
                                        .limitToLast(20) // Lấy 20 mục gần nhất
                                        .once('value');
        
        const historyData = historySnapshot.val() || {};
        
        // Chuyển đổi object thành mảng và đảo ngược lại (để mới nhất lên đầu)
        const historyArray = Object.values(historyData).reverse();
        
        res.json({ success: true, history: historyArray });

    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi máy chủ: ' + err.message });
    }
});


module.exports = router;