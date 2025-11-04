/**
 * Hiển thị thông báo (toast) chung
 * @param {string} message - Nội dung thông báo
 * @param {boolean} [isSuccess=true] - true (Xanh) hoặc false (Đỏ)
 */
function showToast(message, isSuccess = true) {
    const toast = document.createElement('div');
    // Sử dụng class 'toast' từ styles.css
    toast.className = `toast ${isSuccess ? 'bg-green-600' : 'bg-red-600'}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Tự động xóa sau 3 giây
    setTimeout(() => toast.remove(), 3000);
}

/**
 * Khởi tạo bản đồ Leaflet chung
 * @param {string} elementId - ID của thẻ div (ví dụ: 'map')
 * @param {number} [defaultLat=21.0278] - Vĩ độ mặc định
 * @param {number} [defaultLng=105.8342] - Kinh độ mặc định
 * @returns {object} - Đối tượng bản đồ Leaflet
 */
function initMap(elementId, defaultLat = 21.0278, defaultLng = 105.8342) {
    try {
        const map = L.map(elementId).setView([defaultLat, defaultLng], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        return map;
    } catch (e) {
        console.error(`Lỗi khởi tạo map: ${e.message}`);
        // Hiển thị lỗi cho người dùng nếu thẻ div không tồn tại
        const mapDiv = document.getElementById(elementId);
        if (mapDiv) {
            mapDiv.innerHTML = `<p class="text-red-500 p-4">Lỗi tải bản đồ. Vui lòng thử lại.</p>`;
        }
        return null;
    }
}