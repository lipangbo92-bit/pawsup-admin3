// 用户管理页面逻辑

let users = [];
let coupons = [];

// API 基础 URL
const API_BASE = '/api/users';

// 页面加载
document.addEventListener('DOMContentLoaded', function() {
    bindEvents();
    loadCoupons();
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
    
    try {
        const response = await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'searchUsers', phone: phone })
        });
        
        const result = await response.json();
        if (result.success) {
            users = result.data || [];
            renderUsers();
        } else {
            showToast(result.error || '搜索失败', 'error');
        }
    } catch (error) {
        console.error('搜索用户失败:', error);
        showToast('搜索失败', 'error');
    }
}

// 渲染用户列表
function renderUsers() {
    const container = document.getElementById('usersList');
    const emptyState = document.getElementById('emptyState');
    
    if (users.length === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'block';
        emptyState.innerHTML = '<p>未找到匹配的用户</p>';
        return;
    }
    
    emptyState.style.display = 'none';
    
    container.innerHTML = users.map(user => {
        const levelClass = `level-${user.membership?.level || 1}`;
        const levelName = user.membership?.levelName || '普通会员';
        
        return `
            <div class="table-row">
                <div class="user-avatar">${user.avatar || '👤'}</div>
                <div>
                    <div class="user-name">${user.nickName || user.name || '未知用户'}</div>
                    <div style="font-size: 12px; color: #999; margin-top: 4px;">ID: ${user._id?.substring(0, 16)}...</div>
                </div>
                <div class="user-phone">${user.phoneNumber || '未绑定'}</div>
                <div><span class="user-level ${levelClass}">${levelName}</span></div>
                <div class="action-btns">
                    <button class="btn-small primary" onclick="showSendModal('${user._id}', '${user.nickName || user.name || '用户'}')">发放优惠券</button>
                </div>
            </div>
        `;
    }).join('');
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
