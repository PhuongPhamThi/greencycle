/**
 * file: public/js/footer.js
 * (Phiên bản nâng cấp chuyên nghiệp)
 */
function buildFooter() {
    const placeholder = document.getElementById('footer-placeholder');
    if (!placeholder) {
        console.warn("Không tìm thấy #footer-placeholder, footer sẽ không được tải.");
        return;
    }

    // Đây là nội dung HTML mới cho footer
    const footerHTML = `
        <div class="footer-content-container">
            <div class="footer-col">
                <h3 class="footer-logo">GREENCYCLE</h3>
                <p class="footer-about">
                    Nền tảng kết nối cộng đồng, hộ gia đình và doanh nghiệp 
                    với các giải pháp tái chế rác thải hữu cơ bền vững.
                </p>
            </div>

            <div class="footer-col">
                <h4 class="footer-heading">Liên kết</h4>
                <ul class="footer-links">
                    <li><a href="/">Trang chủ</a></li>
                    <li><a href="/login.html">Đăng nhập</a></li>
                    <li><a href="/register.html">Đăng ký</a></li>
                    <li><a href="/rewards.html">Đổi thưởng</a></li>
                </ul>
            </div>

            <div class="footer-col">
                <h4 class="footer-heading">Thông tin</h4>
                <ul class="footer-links">
                    <li><a href="/collection.html">Điểm Thu Gom</a></li>
                    <li><a href="/map.html">Bản đồ Rác</a></li>
                    <li><a href="/contact.html">Liên hệ & Phản hồi</a></li>
                    <li><a href="/admin.html">Quản trị (Admin)</a></li>
                </ul>
            </div>

            <div class="footer-col">
                <h4 class="footer-heading">Theo dõi chúng tôi</h4>
                <div class="footer-socials">
                    <a href="#" title="Facebook"><i class="fab fa-facebook-f"></i></a>
                    <a href="#" title="Zalo"><i class="fas fa-comment-dots"></i></a>
                    <a href="#" title="TikTok"><i class="fab fa-tiktok"></i></a>
                </div>
                <h4 class="footer-heading mt-4">Liên hệ</h4>
                <p class="footer-contact">
                    <strong>Email:</strong> support@greencycle.com<br>
                    <strong>Hotline:</strong> 0909-123-456
                </p>
            </div>
        </div>
        
        <div class="footer-copyright">
            <p>© 2025 GREENCYCLE. Đã đăng ký bản quyền.</p>
        </div>
    `;

    // Tiêm (inject) HTML và thêm các class CSS chuẩn mới
    placeholder.innerHTML = footerHTML;
    placeholder.className = "footer-professional"; // Class mới
}

// Chạy hàm này ngay khi DOM được tải
document.addEventListener('DOMContentLoaded', buildFooter);