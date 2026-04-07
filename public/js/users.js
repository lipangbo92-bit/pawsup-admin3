// 用户管理页面逻辑
// 字段规范：严格遵循数据字典 users 集合定义
// - 昵称: nickName
// - 头像: avatarUrl
// - 手机号: phone
// - 会员信息: membership { level, levelName, points, totalSpent, orderCount }

let users = [];
let coupons = [];

// API 基础 URL
const API_BASE = '/api/users';

// 页面加载
document.addEventListener('DOMContentLoaded', function() {
    bindEvents();
    loadCoupons();
    loadAllUsers(); // 页面加载时自动获取所有用户
});

// 绑定事件
function bindEvents() {
    // 搜索框回车事件
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchUsers();
        }
    });
}

// 加载所有用户列表
async function loadAllUsers() {
    const container = document.getElementById('usersList');
    const emptyState = document.getElementById('emptyState');
    
    // 显示加载中
    emptyState.style.display = 'block';
    emptyState.innerHTML = '<p>正在加载用户数据...</p>';
    
    try {
        const response = await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'getUsers', page: 1, pageSize: 50 })
        });
        
        const result = await response.json();
        
        if (result.success) {
            users = result.data || [];
            renderUsers();
            if (users.length === 0) {
                emptyState.innerHTML = '<p>暂无用户数据</p>';
            }
        } else {
            emptyState.innerHTML = `<p>加载失败: ${result.error || '未知错误'}</p>`;
        }
    } catch (error) {
        console.error('加载用户列表失败:', error);
        emptyState.innerHTML = '<p>加载失败，请刷新页面重试</p>';
    }
}

// 加载优惠券列表（用于发放选择）
async function loadCoupons() {
    try {
        const response = await fetch('/api/coupons', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'getCoupons', status: 'active' })
        });
        
        const result = await response.json();
        if (result.success) {
            coupons = result.data || [];
            renderCouponSelect();
        }
    } catch (error) {
        console.error('加载优惠券失败:', error);
    }
}

// 渲染优惠券下拉框
function renderCouponSelect() {
    const select = document.getElementById('couponSelect');
    select.innerHTML = '<option value="">请选择优惠券</option>';
    
    coupons.forEach(coupon => {
        const option = document.createElement('option');
        option.value = coupon._id;
        option.textContent = `${coupon.name} (${coupon.code})`;
        select.appendChild(option);
    });
}

// 搜索用户
async function searchUsers() {
    const phone = document.getElementById('searchInput').value.trim();
    
    if (!phone) {
        showToast('请输入手机号', 'error');
        return;
    }
    
    // 显示加载状态
    const searchBtn = document.querySelector('.search-btn');
    const originalText = searchBtn.textContent;
    searchBtn.textContent = '搜索中...';
    searchBtn.disabled = true;
    
    try {
        console.log('正在搜索:', phone);
        console.log('API地址:', API_BASE);
        
        const response = await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'searchUsers', phone: phone })
        });
        
        console.log('响应状态:', response.status);
        console.log('响应头:', [...response.headers.entries()]);
        
        const text = await response.text();
        console.log('原始响应:', text);
        
        let result;
        try {
            result = JSON.parse(text);
        } catch (e) {
            console.error('JSON解析失败:', e);
            showToast('服务器返回格式错误', 'error');
            return;
        }
        
        console.log('响应结果:', result);
        
        if (result.success) {
            users = result.data || [];
            renderUsers();
            if (users.length === 0) {
                showToast(`未找到包含 "${phone}" 的用户`, 'error');
            } else {
                showToast(`找到 ${users.length} 个用户`, 'success');
            }
        } else {
            showToast(result.error || '搜索失败', 'error');
        }
    } catch (error) {
        console.error('搜索用户失败:', error);
        showToast('搜索失败: ' + error.message, 'error');
    } finally {
        searchBtn.textContent = originalText;
        searchBtn.disabled = false;
    }
}

// 渲染用户列表
// 严格遵循数据字典字段名：nickName, avatarUrl, phone, membership
function renderUsers() {
    const container = document.getElementById('usersList');
    const emptyState = document.getElementById('emptyState');
    
    if (users.length === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'block';
        emptyState.innerHTML = `
            <div style="padding: 40px;">
                <div style="font-size: 48px; margin-bottom: 16px;">🔍</div>
                <p style="color: #666; margin-bottom: 8px;">未找到匹配的用户</p>
                <p style="color: #999; font-size: 12px;">请检查手机号是否正确，或尝试其他关键词</p>
            </div>
        `;
        return;
    }
    
    emptyState.style.display = 'none';
    
    container.innerHTML = users.map(user => {
        // 会员等级样式映射
        const level = user.membership?.level || 1;
        const levelClass = `level-${level}`;
        const levelName = user.membership?.levelName || getDefaultLevelName(level);
        
        // 严格使用数据字典标准字段名
        const phone = user.phone || '未绑定';
        const avatar = user.avatarUrl ? `<img src="${user.avatarUrl}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;">` : '👤';
        const name = user.nickName || '未知用户';
        // 余额显示（分转元）
        const balance = user.balance !== undefined ? (user.balance / 100).toFixed(2) : '0.00';
        const balanceClass = user.balance > 0 ? 'balance-positive' : 'balance-zero';

        return `
            <div class="table-row">
                <div class="user-avatar">${avatar}</div>
                <div>
                    <div class="user-name">${escapeHtml(name)}</div>
                    <div style="font-size: 12px; color: #999; margin-top: 4px;">ID: ${user._id?.substring(0, 16)}...</div>
                </div>
                <div class="user-phone">${phone}</div>
                <div class="user-balance ${balanceClass}">¥${balance}</div>
                <div><span class="user-level ${levelClass}">${levelName}</span></div>
                <div class="action-btns">
                    <button class="btn-small primary" onclick="showSendModal('${user._id}', '${escapeHtml(name)}')">发放优惠券</button>
                </div>
            </div>
        `;
    }).join('');
}

// 获取默认等级名称
function getDefaultLevelName(level) {
    const names = {
        1: '普通会员',
        2: '银卡会员',
        3: '金卡会员',
        4: '钻石会员'
    };
    return names[level] || '普通会员';
}

// HTML 转义，防止 XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 显示发放模态框
function showSendModal(userId, userName) {
    document.getElementById('selectedUserId').value = userId;
    document.getElementById('selectedUserName').value = userName;
    document.getElementById('couponSelect').value = '';
    document.getElementById('sendCouponModal').classList.add('show');
}

// 关闭发放模态框
function closeSendModal() {
    document.getElementById('sendCouponModal').classList.remove('show');
}

// 确认发放优惠券
async function confirmSendCoupon() {
    const userId = document.getElementById('selectedUserId').value;
    const couponId = document.getElementById('couponSelect').value;
    
    if (!couponId) {
        showToast('请选择优惠券', 'error');
        return;
    }
    
    // 调试信息
    const selectedCoupon = coupons.find(c => c._id === couponId);
    console.log('发放优惠券:', {
        couponId: couponId,
        userId: userId,
        selectedCoupon: selectedCoupon
    });
    
    try {
        const response = await fetch('/api/coupons', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                action: 'sendCouponToUser', 
                couponId: couponId,
                userId: userId
            })
        });
        
        const result = await response.json();
        if (result.success) {
            showToast('发放成功', 'success');
            closeSendModal();
        } else {
            showToast(result.error || '发放失败', 'error');
        }
    } catch (error) {
        console.error('发放优惠券失败:', error);
        showToast('发放失败', 'error');
    }
}

// 显示Toast
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
