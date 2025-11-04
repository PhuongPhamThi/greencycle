/**
 * file: public/js/navbar.js
 * (Phiên bản nâng cấp có Trung tâm Thông báo)
 */

function buildNavbar() {
    const placeholder = document.getElementById('navbar-placeholder');
    if (!placeholder) {
        console.error("Lỗi: Không tìm thấy #navbar-placeholder.");
        return;
    }

    // Các liên kết HTML chung
    const infoDropdown = `
        <li class="nav-item">
            <a href="#" class="nav-link">Thông tin <i class="fas fa-info-circle"></i></a>
            <div class="dropdown">
                <a href="/collection.html" class="dropdown-item"><i class="fas fa-map-pin"></i> Điểm Thu Gom</a>
                <a href="/contact.html" class="dropdown-item"><i class="fas fa-envelope"></i> Liên hệ</a>
            </div>
        </li>`;

    let navMenuHTML = '';
    const token = localStorage.getItem('token');

    if (token) {
        // --- ĐÃ ĐĂNG NHẬP ---
        try {
            const decoded = jwt_decode(token);
            const role = decoded.role || 'household';
            const name = decoded.name || 'User';

            // Liên kết riêng cho từng vai trò
            let roleSpecificLinks = '';

            // **ĐỊNH NGHĨA CHUÔNG THÔNG BÁO (Sẽ chỉ hiển thị cho Bên Bán)**
            let notificationBellHTML = '';

            if (role === 'admin') {
                roleSpecificLinks = `
                    <li class="nav-item"><a href="/admin.html" class="nav-link" style="background-color: #f59e0b; color: #000; border-radius: 5px;">Admin</a></li>
                    <li class="nav-item"><a href="/dashboard.html" class="nav-link">Dashboard</a></li>
                    <li class="nav-item"><a href="/rewards.html" class="nav-link">Đổi thưởng</a></li>
                    <li class="nav-item"><a href="/search.html" class="nav-link">Tìm kiếm</a></li>
                `;
            } else if (role === 'household' || role === 'business') {
                // Đây là "Bên Bán" (Providers)
                roleSpecificLinks = `
                    <li class="nav-item"><a href="/dashboard.html" class="nav-link">Dashboard <i class="fas fa-tachometer-alt"></i></a></li>
                    <li class="nav-item"><a href="/rewards.html" class="nav-link">Đổi thưởng <i class="fas fa-gift"></i></a></li>
                `;
                // **THÊM CHUÔNG:** Chỉ "Bên Bán" mới nhận được thông báo
                notificationBellHTML = `
                    <li class="nav-item notification-bell" id="notificationBell">
                        <a href="#" class="nav-link" onclick="event.preventDefault(); toggleNotificationDropdown();">
                            <i class="fas fa-bell"></i>
                            <span class="notification-dot" id="notificationDot"></span>
                        </a>
                        <div class="notification-dropdown" id="notificationDropdown">
                            <div class="notification-item"><p>Đang tải thông báo...</p></div>
                        </div>
                    </li>
                `;
            } else if (role === 'recycler') {
                // Đây là "Bên Mua" (Recyclers)
                roleSpecificLinks = `
                    <li class="nav-item"><a href="/search.html" class="nav-link">Tìm kiếm Rác <i class="fas fa-search"></i></a></li>
                    <li class="nav-item"><a href="/map.html" class="nav-link">Bản đồ Rác <i class="fas fa-map-marked-alt"></i></a></li>
                `;
            }

            navMenuHTML = `
                ${roleSpecificLinks}
                ${infoDropdown}
                ${notificationBellHTML} <li class="nav-item">
                    <a href="#" class="nav-link" id="navLogout">Đăng xuất <i class="fas fa-sign-out-alt"></i></a>
                </li>
                <li class="nav-item">
                    <a href="/profile.html" class="nav-link" style="background-color: #3b82f6; border-radius: 5px; padding: 0.5rem 1rem;">
                        <i class="fas fa-user"></i> ${name}
                    </a>
                </li>
            `;
        } catch (e) {
            console.error("Token không hợp lệ, đã xóa token:", e);
            localStorage.removeItem('token');
            // Gọi lại hàm này (nhưng không làm vậy để tránh lặp)
            // Chỉ cần render menu khách
        }
    } 
    
    // Nếu chưa có menuHTML (vì token lỗi hoặc là khách)
    if (!navMenuHTML) {
        // --- KHÁCH (CHƯA ĐĂNG NHẬP) ---
        navMenuHTML = `
            <li class="nav-item">
                <a href="#" class="nav-link">Tìm kiếm <i class="fas fa-search"></i></a>
                <div class="dropdown">
                    <a href="/search.html" class="dropdown-item"><i class="fas fa-trash"></i> Tìm kiếm Rác (Demo)</a>
                </div>
            </li>
            ${infoDropdown}
            <li class="nav-item"><a href="/login.html" class="nav-link">Đăng nhập <i class="fas fa-sign-in-alt"></i></a></li>
            <li class="nav-item"><a href="/register.html" class="nav-link" style="background-color: #3b82f6; border-radius: 5px; padding: 0.5rem 1rem;">Đăng ký</a></li>
        `;
    }

    // Tiêm (inject) HTML vào placeholder
    placeholder.innerHTML = `
        <nav>
            <div class="nav-container">
                <a href="/" class="nav-logo">GREENCYCLE</a>
                <button class="nav-toggle" id="navToggle">&#9776;</button>
                <ul class="nav-menu" id="navMenu">
                    ${navMenuHTML}
                </ul>
            </div>
        </nav>
    `;

    // --- Gắn lại các trình xử lý sự kiện (Event Listeners) ---
    
    // Nút bật/tắt menu trên di động
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');
    if (navToggle) {
        navToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
    }

    // Nút Đăng xuất
    const navLogout = document.getElementById('navLogout');
    if (navLogout) {
        navLogout.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            if (typeof showToast === 'function') {
                showToast('Đăng xuất thành công!', true);
            }
            setTimeout(() => window.location.href = '/index.html', 1000);
        });
    }

    // **THÊM MỚI: Tải thông báo (nếu người dùng đã đăng nhập)**
    if (token) {
        loadNotifications();
    }
}

// **HÀM MỚI: Tải thông báo**
async function loadNotifications() {
    const token = localStorage.getItem('token');
    if (!token) return; // Chỉ chạy nếu đã đăng nhập

    const bellElement = document.getElementById('notificationBell');
    const dotElement = document.getElementById('notificationDot');
    const dropdownElement = document.getElementById('notificationDropdown');

    // Chỉ chạy nếu có chuông (nghĩa là vai trò là Provider)
    if (!bellElement || !dropdownElement) return;

    try {
        const res = await fetch('/api/auth/notifications', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (!data.success) {
            dropdownElement.innerHTML = `<div class="notification-item"><p>Lỗi tải thông báo.</p></div>`;
            return;
        }

        // Hiển thị chấm đỏ nếu có thông báo chưa đọc
        if (data.hasUnread) {
            bellElement.classList.add('has-unread');
        }

        // Điền vào menu dropdown
        if (data.notifications.length === 0) {
            dropdownElement.innerHTML = `<div class="notification-item"><p>Không có thông báo mới.</p></div>`;
        } else {
            dropdownElement.innerHTML = ''; // Xóa chữ "Đang tải..."
            data.notifications.forEach(n => {
                const item = document.createElement('div');
                item.className = 'notification-item';
                if (n.read === false) {
                    item.classList.add('is-unread');
                }
                
                const timeAgo = Math.round((Date.now() - n.createdAt) / 60000); // Phút trước
                
                item.innerHTML = `
                    <p>${n.message}</p>
                    <span class="time">${timeAgo > 0 ? `${timeAgo} phút trước` : 'Vừa xong'}</span>
                `;
                dropdownElement.appendChild(item);
            });
        }

    } catch (err) {
        console.error("Lỗi fetch thông báo:", err);
        dropdownElement.innerHTML = `<div class="notification-item"><p>Lỗi kết nối.</p></div>`;
    }
}

// **HÀM MỚI: Xử lý khi nhấp vào chuông**
async function toggleNotificationDropdown() {
    const bellElement = document.getElementById('notificationBell');
    const dropdownElement = document.getElementById('notificationDropdown');
    const token = localStorage.getItem('token');
    
    // Toggle class 'active' để hiển thị/ẩn trên mobile
    bellElement.classList.toggle('active');

    // Nếu chuông có chấm đỏ (has-unread), gọi API đánh dấu đã đọc
    if (bellElement.classList.contains('has-unread')) {
        bellElement.classList.remove('has-unread'); // Tắt chấm đỏ ngay
        
        // Đánh dấu các item là đã đọc (trên UI)
        dropdownElement.querySelectorAll('.is-unread').forEach(item => {
            item.classList.remove('is-unread');
        });

        // Gọi API ở chế độ "fire-and-forget"
        try {
            await fetch('/api/auth/notifications/mark-read', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch (err) {
            console.error("Lỗi đánh dấu đã đọc:", err);
        }
    }
}

// Chạy hàm buildNavbar ngay khi DOM được tải
document.addEventListener('DOMContentLoaded', buildNavbar);