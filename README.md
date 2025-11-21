# 🌿 GREENCYCLE - Nền tảng Kết nối Nguồn Chất thải Hữu cơ & Doanh nghiệp Tái chế

[](https://greencycle-gwyz.onrender.com)
[](https://nodejs.org/)

> **Trải nghiệm ngay tại:** [https://greencycle-gwyz.onrender.com](https://greencycle-gwyz.onrender.com)


## 📖 Giới thiệu

**GREENCYCLE** là giải pháp công nghệ nhằm thúc đẩy mô hình kinh tế tuần hoàn tại Việt Nam. Dự án đóng vai trò là nền tảng trung gian kết nối giữa:

1.  **Nguồn phát thải (Bên Bán):** Hộ gia đình, quán ăn, chợ dân sinh - những nơi phát sinh rác hữu cơ hàng ngày.
2.  **Đơn vị tái chế (Bên Mua):** Doanh nghiệp sản xuất phân bón, trang trại, hợp tác xã nông nghiệp cần nguồn nguyên liệu hữu cơ.

Sứ mệnh của chúng tôi là biến rác thải thành tài nguyên, giảm thiểu ô nhiễm môi trường và lan tỏa phong cách sống xanh tới cộng đồng.

-----

## ✨ Tính năng Nổi bật

### 1\. Dành cho Hộ Gia Đình / Quán Ăn (Bên Bán)

  * **Dashboard Cá nhân:** Quản lý hoạt động, xem điểm xanh tích lũy.
  * **Đăng tin Rác thải:**
      * Nhập thông tin loại rác, khối lượng.
      * **Định vị GPS:** Tự động lấy vị trí hiện tại chính xác để hỗ trợ thu gom.
      * **Theo dõi trạng thái:** *Đang chờ*, *Đã có người nhận*, *Đã thu gom*.
  * **Cảnh báo Độ tươi (Freshness Alert):** Hệ thống tự động dán nhãn tình trạng rác (Mới đăng, Sắp hỏng, Quá hạn) dựa trên thời gian thực để tối ưu hóa việc thu gom.
  * **Hệ thống Đổi thưởng:** Sử dụng "Điểm Xanh" để đổi lấy các phần quà giá trị (Voucher, sản phẩm thân thiện môi trường...).

### 2\. Dành cho Doanh Nghiệp Tái Chế (Bên Mua)

  * **Tìm kiếm Thông minh:** Lọc nguồn rác theo khu vực, loại rác và tình trạng.
  * **Bản đồ Rác thải (Live Map):** Quan sát trực quan các điểm phát sinh rác trên bản đồ thực tế.
  * **Nhận Thu gom (Claim):** Xem chi tiết thông tin người đăng và xác nhận thu gom ngay trên ứng dụng.
  * *Lưu ý:* Tài khoản Bên Mua được cấp bởi Admin để đảm bảo uy tín doanh nghiệp.

### 3\. Hệ thống Điểm Thu Gom Cố định

  * Danh sách các trạm thu gom chính thức của GreenCycle.
  * Tích hợp **chỉ đường trực tiếp** qua Google Maps giúp người dân dễ dàng mang rác đến điểm tập kết.

### 4\. Dành cho Quản trị viên (Admin)

  * **Quản lý Người dùng:** Kiểm soát danh sách tài khoản, vô hiệu hóa các tài khoản vi phạm.
  * **Quản lý Điểm Thu Gom:** Thêm/Sửa/Xóa các trạm thu gom cố định (Tự động tìm tọa độ từ địa chỉ).
  * **Cấp quyền:** Tạo tài khoản chuyên dụng cho đối tác thu gom (Recycler).

-----

## 🛠️ Công nghệ Sử dụng

Dự án được xây dựng trên nền tảng web hiện đại, tối ưu hóa tốc độ và trải nghiệm người dùng:

| Phân loại | Công nghệ |
| :--- | :--- |
| **Frontend** | HTML5, CSS3, JavaScript (Vanilla) |
| **UI Framework** | **Tailwind CSS**, **Flowbite** (Components) |
| **Map Engine** | **Leaflet.js** (OpenStreetMap) |
| **Backend** | **Node.js**, **Express.js** |
| **Database** | **Firebase Realtime Database** |
| **Authentication**| **Firebase Authentication** (JWT) |
| **Deployment** | **Render** |

-----

## ⚙️ Hướng dẫn Cài đặt (Local)

Nếu bạn muốn chạy dự án này trên máy tính cá nhân để phát triển:

### 1\. Yêu cầu

  * [Node.js](https://nodejs.org/) (Phiên bản 14 trở lên).
  * Tài khoản Google Firebase.

### 2\. Các bước thực hiện

**Bước 1: Clone dự án**

```bash
git clone [https://github.com/username/greencycle.git](https://github.com/PhuongPhamThi/greencycle.git)
cd greencycle
```

**Bước 2: Cài đặt dependencies**

```bash
npm install
```

**Bước 3: Cấu hình Firebase**

1.  Truy cập [Firebase Console](https://console.firebase.google.com/), tạo dự án mới.
2.  Vào *Project Settings* -\> *Service Accounts* -\> *Generate new private key*.
3.  Tải file JSON về, đổi tên thành `serviceAccountKey.json` và đặt vào thư mục gốc của dự án.
4.  Tạo file `.env` ở thư mục gốc và thêm cấu hình:
    ```env
    FIREBASE_DATABASE_URL=https://<your-project-id>.firebaseio.com
    JWT_SECRET=mat_khau_bi_mat_cua_ban
    PORT=3000
    ```

**Bước 4: Khởi chạy**

```bash
node index.js
```

Truy cập `http://localhost:3000` để xem kết quả.

-----

## 🔐 Tài khoản Demo

Để trải nghiệm nhanh các tính năng, bạn có thể sử dụng (hoặc tự tạo) các tài khoản sau:

  * **Admin:** (Cần thiết lập thủ công trong Database lần đầu)
  * **Bên Mua (Recycler):** (Liên hệ Admin để cấp)
  * **Bên Bán (Hộ gia đình):** Đăng ký tự do tại trang `/register.html`.

-----

## 👥 Đội ngũ Phát triển

Dự án được thực hiện bởi nhóm sinh viên trường **Đại học Mỏ - Địa chất (HUMG)** với niềm đam mê công nghệ và môi trường:

  * **Phạm Thị Phượng** (CNTT) - *Developer*
  * **Đỗ Thị Hương** (Kế toán) - *Trưởng nhóm / Phân tích nghiệp vụ*
  * **Bùi Thị Mai Phương** (Tài chính – Ngân hàng)
  * **Nguyễn Phú Bảo Ngọc** (Quản lý Tài nguyên – Môi trường)
  * **Nguyễn Thuý Phượng** (Kế toán)

-----

## 📞 Liên hệ

Mọi ý kiến đóng góp hoặc báo lỗi, xin vui lòng liên hệ:

  * **Email:** support@greencycle.com
  * **Hotline:** 0909-123-456

-----

*© 2025 GREENCYCLE. Developed for a greener Vietnam.*
