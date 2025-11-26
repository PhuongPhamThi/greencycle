/**
 * public/js/chat-widget.js
 * Widget Chat hỗ trợ tự động - Tự nhúng vào mọi trang
 */

(function() {
    // 1. Nhúng HTML vào trang
    const chatHTML = `
        <div id="gc-chat-widget" class="fixed bottom-6 right-6 z-[9999] flex flex-col items-end font-sans">
            <div id="gc-chat-window" class="hidden bg-white w-80 h-[450px] rounded-xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden mb-4 transition-all duration-300 origin-bottom-right scale-95 opacity-0">
                
                <div class="bg-green-600 text-white p-4 flex justify-between items-center shadow-md">
                    <div>
                        <h3 class="font-bold flex items-center text-lg"><i class="fas fa-robot mr-2"></i> Trợ lý GreenCycle</h3>
                        <span class="text-xs text-green-100 block">Tự động trả lời 24/7</span>
                    </div>
                    <button id="gc-close-chat" class="text-green-100 hover:text-white focus:outline-none p-1 hover:bg-green-700 rounded"><i class="fas fa-times"></i></button>
                </div>
                
                <div id="gc-chat-messages" class="flex-1 p-4 overflow-y-auto bg-gray-50 space-y-3">
                    <div class="flex justify-start">
                        <div class="bg-white border border-gray-200 text-gray-800 rounded-2xl rounded-tl-none py-2 px-3 text-sm shadow-sm max-w-[85%]">
                            Xin chào! 👋<br>Mình có thể giúp gì cho bạn?
                        </div>
                    </div>

                    <div class="flex flex-col space-y-2 mt-2" id="gc-quick-actions">
                        <button class="quick-btn text-left text-sm bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 py-2 px-3 rounded-lg transition-colors" data-msg="Tôi muốn đăng ký làm Điểm Thu Gom">
                            📍 Đăng ký làm Điểm Thu Gom
                        </button>
                        <button class="quick-btn text-left text-sm bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 py-2 px-3 rounded-lg transition-colors" data-msg="Cách tính điểm đổi thưởng?">
                            🎁 Hỏi về Điểm thưởng & Quà
                        </button>
                        <button class="quick-btn text-left text-sm bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 py-2 px-3 rounded-lg transition-colors" data-msg="Báo lỗi kỹ thuật">
                            ⚠️ Báo lỗi / Hỗ trợ
                        </button>
                    </div>
                </div>

                <div class="p-3 bg-white border-t border-gray-200 flex gap-2">
                    <input type="text" id="gc-chat-input" class="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500" placeholder="Nhập tin nhắn...">
                    <button id="gc-send-chat" class="bg-green-600 text-white w-9 h-9 rounded-full flex items-center justify-center hover:bg-green-700 transition-colors shadow-sm"><i class="fas fa-paper-plane text-sm"></i></button>
                </div>
            </div>

            <button id="gc-toggle-chat" class="w-14 h-14 bg-green-600 text-white rounded-full shadow-lg hover:bg-green-700 transition-transform transform hover:scale-110 flex items-center justify-center focus:outline-none ring-4 ring-green-100">
                <i class="fas fa-comments text-2xl"></i>
            </button>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', chatHTML);

    // 2. Logic JavaScript
    const toggleBtn = document.getElementById('gc-toggle-chat');
    const chatWindow = document.getElementById('gc-chat-window');
    const closeBtn = document.getElementById('gc-close-chat');
    const messagesDiv = document.getElementById('gc-chat-messages');
    const input = document.getElementById('gc-chat-input');
    const sendBtn = document.getElementById('gc-send-chat');
    let pollingInterval = null;

    // Bật/Tắt Chat
    toggleBtn.addEventListener('click', () => {
        chatWindow.classList.remove('hidden');
        setTimeout(() => {
            chatWindow.classList.remove('scale-95', 'opacity-0');
            chatWindow.classList.add('scale-100', 'opacity-100');
        }, 10);
        toggleBtn.classList.add('hidden');
        loadMessages();
        // Tự động cập nhật tin nhắn mỗi 3 giây
        pollingInterval = setInterval(loadMessages, 3000);
    });

    closeBtn.addEventListener('click', () => {
        chatWindow.classList.remove('scale-100', 'opacity-100');
        chatWindow.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            chatWindow.classList.add('hidden');
            toggleBtn.classList.remove('hidden');
        }, 300);
        if (pollingInterval) clearInterval(pollingInterval);
    });

    // Gửi tin nhắn
    async function sendMessage(text) {
        if (!text) return;
        const token = localStorage.getItem('token');
        
        if (!token) {
            appendSystemMessage("Vui lòng <b>đăng nhập</b> để chat với chúng tôi.");
            return;
        }

        // Hiện tin nhắn user ngay lập tức (Optimistic UI)
        appendUserMessage(text);
        input.value = '';
        
        // Ẩn các nút gợi ý sau khi chat
        const quickActions = document.getElementById('gc-quick-actions');
        if (quickActions) quickActions.style.display = 'none';

        try {
            const res = await fetch('/api/contact/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ message: text })
            });
            
            // Sau khi gửi, load lại tin nhắn ngay để thấy Bot trả lời (nếu có)
            setTimeout(loadMessages, 1500); 
        } catch (err) {
            console.error(err);
            appendSystemMessage("Lỗi kết nối. Vui lòng thử lại.");
        }
    }

    // Sự kiện gửi
    sendBtn.addEventListener('click', () => sendMessage(input.value.trim()));
    input.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(input.value.trim()); });

    // Sự kiện nút chọn nhanh
    document.querySelectorAll('.quick-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const msg = e.target.getAttribute('data-msg');
            sendMessage(msg);
        });
    });

    // Tải lịch sử chat
    async function loadMessages() {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const res = await fetch('/api/contact/chat/history', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            
            if (data.success) {
                // Xóa các tin nhắn cũ (trừ tin chào và nút gợi ý)
                const existingMsgs = messagesDiv.querySelectorAll('.chat-bubble');
                existingMsgs.forEach(el => el.remove());

                data.messages.forEach(msg => {
                    if (msg.sender === 'user') appendUserMessage(msg.text, false);
                    else appendAdminMessage(msg.text, false);
                });
                
                // Cuộn xuống dưới cùng nếu mới mở
                // messagesDiv.scrollTop = messagesDiv.scrollHeight; 
            }
        } catch (e) { console.log("Chưa có lịch sử chat"); }
    }

    // Helper: Vẽ tin nhắn User
    function appendUserMessage(text, scroll = true) {
        const div = document.createElement('div');
        div.className = "chat-bubble flex justify-end mb-2 animate-fade-in";
        div.innerHTML = `<div class="bg-green-600 text-white rounded-2xl rounded-tr-none py-2 px-3 text-sm shadow-md max-w-[85%] break-words">${text}</div>`;
        messagesDiv.appendChild(div);
        if (scroll) messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    // Helper: Vẽ tin nhắn Admin/Bot
    function appendAdminMessage(text, scroll = true) {
        const div = document.createElement('div');
        div.className = "chat-bubble flex justify-start mb-2 animate-fade-in";
        div.innerHTML = `
            <div class="flex items-end">
                <div class="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs mr-2 mb-1 border border-green-200"><i class="fas fa-robot"></i></div>
                <div class="bg-white border border-gray-200 text-gray-800 rounded-2xl rounded-tl-none py-2 px-3 text-sm shadow-sm max-w-[80%] break-words">${text}</div>
            </div>`;
        messagesDiv.appendChild(div);
        if (scroll) messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    function appendSystemMessage(text) {
        const div = document.createElement('div');
        div.className = "chat-bubble flex justify-center my-2";
        div.innerHTML = `<span class="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">${text}</span>`;
        messagesDiv.appendChild(div);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    // Thêm animation
    const style = document.createElement('style');
    style.innerHTML = `@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } } .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }`;
    document.head.appendChild(style);

})();