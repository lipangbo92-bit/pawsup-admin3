// PawsUp 爪哇宠屋 - Admin App

// Initialize Cloud Base
function initCloud() {
    if (typeof wx !== 'undefined' && wx.cloud) {
        wx.cloud.init({
            env: 'cloud1-4gy1jyan842d73ab',
            traceUser: true
        });
        console.log('Cloud initialized');
    }
}

// Login Form Handler
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            
            if (!username || !password) {
                showMessage('请填写用户名和密码', 'error');
                return;
            }
            
            simulateLogin(username, password);
        });
    }
    
    // Initialize cloud on all pages
    initCloud();
});

// Simulate login function
function simulateLogin(username, password) {
    const loginBtn = document.querySelector('.login-btn');
    const originalText = loginBtn.textContent;
    
    loginBtn.disabled = true;
    loginBtn.textContent = '登录中...';
    
    setTimeout(() => {
        if (username && password) {
            localStorage.setItem('adminLoggedIn', 'true');
            localStorage.setItem('adminUser', username);
            
            window.location.href = 'dashboard.html';
        } else {
            showMessage('用户名或密码错误', 'error');
            loginBtn.disabled = false;
            loginBtn.textContent = originalText;
        }
    }, 800);
}

// Logout function
function logout() {
    localStorage.removeItem('adminLoggedIn');
    localStorage.removeItem('adminUser');
    window.location.href = 'index.html';
}

// Show message helper
function showMessage(message, type = 'info') {
    const existingMessage = document.querySelector('.message-toast');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    const messageEl = document.createElement('div');
    messageEl.className = `message-toast ${type}`;
    messageEl.textContent = message;
    
    messageEl.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        z-index: 10000;
        animation: slideDown 0.3s ease;
    `;
    
    if (!document.getElementById('message-styles')) {
        const style = document.createElement('style');
        style.id = 'message-styles';
        style.textContent = `
            @keyframes slideDown {
                from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
                to { opacity: 1; transform: translateX(-50%) translateY(0); }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(messageEl);
    
    setTimeout(() => {
        messageEl.style.opacity = '0';
        messageEl.style.transition = 'opacity 0.3s ease';
        setTimeout(() => messageEl.remove(), 300);
    }, 3000);
}

// Check auth state
function checkAuth() {
    const isLoggedIn = localStorage.getItem('adminLoggedIn');
    const currentPage = window.location.pathname.split('/').pop();
    
    if (!isLoggedIn && currentPage !== 'index.html' && currentPage !== '') {
        // Optional: redirect to login
        // window.location.href = 'index.html';
    }
}

// Run auth check
checkAuth();

// Close modal when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}

// Format currency
function formatCurrency(amount) {
    return '¥' + (amount || 0).toFixed(2);
}

// Format date
function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN');
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
