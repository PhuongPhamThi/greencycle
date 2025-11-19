
function buildNavbar() {
    const placeholder = document.getElementById('navbar-placeholder');
    if (!placeholder) {
        console.error("Lỗi: Không tìm thấy #navbar-placeholder.");
        return;
    }

    // Các liên kết HTML chung (Thông tin)
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

            let roleSpecificLinks = '';
            let notificationBellHTML = ''; // Mặc định không có chuông

            if (role === 'admin') {
                roleSpecificLinks = `
                    <li class="nav-item"><a href="/admin.html" class="nav-link" style="background-color: #f59e0b; color: #000; border-radius: 5px; padding: 0.5rem 1rem;">Admin</a></li>
                    <li class="nav-item"><a href="/dashboard.html" class="nav-link">Dashboard</a></li>
                    <li class="nav-item"><a href="/rewards.html" class="nav-link">Đổi thưởng</a></li>
                    <li class="nav-item"><a href="/search.html" class="nav-link">Tìm kiếm</a></li>
                `;
            } else if (role === 'household' || role === 'business') {
                // Bên Bán (Provider)
                roleSpecificLinks = `
                    <li class="nav-item"><a href="/dashboard.html" class="nav-link">Dashboard <i class="fas fa-tachometer-alt"></i></a></li>
                    <li class="nav-item"><a href="/rewards.html" class="nav-link">Đổi thưởng <i class="fas fa-gift"></i></a></li>
                `;
                // THÊM CHUÔNG: Chỉ "Bên Bán" mới nhận được thông báo
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
                // Bên Mua (Recycler)
                roleSpecificLinks = `
                    <li class="nav-item"><a href="/search.html" class="nav-link">Tìm kiếm Rác <i class="fas fa-search"></i></a></li>
                    <li class="nav-item"><a href="/map.html" class="nav-link">Bản đồ Rác <i class="fas fa-map-marked-alt"></i></a></li>
                `;
            }

            navMenuHTML = `
                ${roleSpecificLinks}
                ${infoDropdown}
                ${notificationBellHTML} 
                <li class="nav-item">
                    <a href="#" class="nav-link" id="navLogout">Đăng xuất <i class="fas fa-sign-out-alt"></i></a>
                </li>
                <li class="nav-item">
                    <a href="/profile.html" class="nav-link" style="background-color: #3b82f6; border-radius: 5px; padding: 0.5rem 1rem;">
                        <i class="fas fa-user"></i> ${name}
                    </a>
                </li>
            `;
        } catch (e) {
            console.error("Token lỗi:", e);
            localStorage.removeItem('token');
        }
    }

    // Nếu chưa có menu (Khách)
    if (!navMenuHTML) {
        navMenuHTML = `
            ${infoDropdown}
            <li class="nav-item"><a href="/login.html" class="nav-link">Đăng nhập <i class="fas fa-sign-in-alt"></i></a></li>
            <li class="nav-item"><a href="/register.html" class="nav-link" style="background-color: #3b82f6; border-radius: 5px; padding: 0.5rem 1rem;">Đăng ký</a></li>
        `;
    }

    // Tiêm HTML vào placeholder (CÓ LOGO MỚI)
    placeholder.innerHTML = `
        <nav>
            <div class="nav-container">
                <a href="/" class="nav-logo flex items-center">
                    <img src="assets/images/image_bc7070.png" alt="Logo" class="h-10 w-auto mr-2" onerror="this.style.display='none'">
                    <span>GREENCYCLE</span>
                </a>

                <button class="nav-toggle" id="navToggle">&#9776;</button>
                <ul class="nav-menu" id="navMenu">
                    ${navMenuHTML}
                </ul>
            </div>
        </nav>
    `;

    // --- Event Listeners ---
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');
    if (navToggle) {
        navToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
    }

    const navLogout = document.getElementById('navLogout');
    if (navLogout) {
        navLogout.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            if (typeof showToast === 'function') showToast('Đăng xuất thành công!', true);
            setTimeout(() => window.location.href = '/index.html', 1000);
        });
    }

    // Tải thông báo nếu đã đăng nhập
    if (token) loadNotifications();
}

// Hàm tải thông báo (Giữ nguyên logic cũ của bạn)
async function loadNotifications() {
    const token = localStorage.getItem('token');
    if (!token) return;

    const bellElement = document.getElementById('notificationBell');
    const dropdownElement = document.getElementById('notificationDropdown');

    if (!bellElement || !dropdownElement) return;

    try {
        const res = await fetch('/api/auth/notifications', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (!data.success) {
            dropdownElement.innerHTML = `<div class="notification-item"><p>Lỗi tải.</p></div>`;
            return;
        }

        if (data.hasUnread) {
            bellElement.classList.add('has-unread');
        }

        if (data.notifications.length === 0) {
            dropdownElement.innerHTML = `<div class="notification-item"><p>Không có thông báo mới.</p></div>`;
        } else {
            dropdownElement.innerHTML = '';
            data.notifications.forEach(n => {
                const item = document.createElement('div');
                item.className = 'notification-item';
                if (n.read === false) item.classList.add('is-unread');
                
                const timeAgo = Math.round((Date.now() - n.createdAt) / 60000);
                item.innerHTML = `<p>${n.message}</p><span class="time">${timeAgo > 0 ? `${timeAgo} phút trước` : 'Vừa xong'}</span>`;
                dropdownElement.appendChild(item);
            });
        }
    } catch (err) {
        console.error(err);
    }
}

// Hàm xử lý click chuông (Giữ nguyên logic cũ)
async function toggleNotificationDropdown() {
    const bellElement = document.getElementById('notificationBell');
    const dropdownElement = document.getElementById('notificationDropdown');
    const token = localStorage.getItem('token');
    
    bellElement.classList.toggle('active');

    if (bellElement.classList.contains('has-unread')) {
        bellElement.classList.remove('has-unread');
        dropdownElement.querySelectorAll('.is-unread').forEach(item => item.classList.remove('is-unread'));
        try {
            await fetch('/api/auth/notifications/mark-read', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch (err) { console.error(err); }
    }
}

document.addEventListener('DOMContentLoaded', buildNavbar);