// 优惠券管理页面逻辑
// 使用 HTTP 请求调用云函数

let coupons = [];
let currentStatus = 'all';

// API 基础 URL - 使用 Vercel API 代理调用云函数
const API_BASE = '/api/coupons';

// 页面加载
document.addEventListener('DOMContentLoaded', function() {
    loadCoupons();
    bindEvents();
});

// 调用 API 的通用方法
async function callCloudFunction(action, data) {
    try {
        const response = await fetch(API_BASE, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: action,
                ...data
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error(`调用 API ${action} 失败:`, error);
        // 返回友好的错误信息
        return {
            success: false,
            error: '网络请求失败，请检查云函数是否已部署'
        };
    }
}

// 绑定事件
function bindEvents() {
    // 筛选标签
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            currentStatus = this.dataset.status;
            loadCoupons();
        });
    });
    
    // 有效期类型切换
    document.getElementById('validType').addEventListener('change', function() {
        const fixedGroup = document.getElementById('fixedDateGroup');
        const daysGroup = document.getElementById('validDaysGroup');
        
        if (this.value === 'fixed') {
            fixedGroup.style.display = 'grid';
            daysGroup.style.display = 'none';
        } else {
            fixedGroup.style.display = 'none';
            daysGroup.style.display = 'block';
        }
    });
}

// 加载优惠券列表
async function loadCoupons() {
    try {
        showLoading(true);
        
        const result = await callCloudFunction('coupons-api', {
            action: 'getCoupons',
            status: currentStatus === 'all' ? '' : currentStatus,
            page: 1,
            limit: 100
        });
        
        if (result.success) {
            coupons = result.data || [];
            renderCoupons();
        } else {
            showToast(result.error || '加载失败', 'error');
        }
    } catch (error) {
        console.error('加载优惠券失败:', error);
        showToast('加载失败，请检查网络', 'error');
    } finally {
        showLoading(false);
    }
}

// 显示/隐藏加载状态
function showLoading(show) {
    const container = document.getElementById('couponsList');
    if (show) {
        container.innerHTML = '<div class="loading-state">加载中...</div>';
    }
}

// 渲染优惠券列表
function renderCoupons() {
    const container = document.getElementById('couponsList');
    const emptyState = document.getElementById('emptyState');
    
    if (coupons.length === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    const typeNames = {
        'discount': '折扣券',
        'amount': '金额券',
        'exchange': '兑换券',
        'direct': '直减券'
    };
    
    const typeClasses = {
        'discount': 'discount',
        'amount': 'amount',
        'exchange': 'exchange',
        'direct': 'amount'
    };
    
    container.innerHTML = coupons.map(coupon => {
        const usedPercent = coupon.totalCount > 0 
            ? Math.round((coupon.receivedCount / coupon.totalCount) * 100) 
            : 0;
        
        let valueText = '';
        if (coupon.type === 'discount') {
            valueText = (coupon.value * 10) + '折';
        } else if (coupon.type === 'amount' || coupon.type === 'direct') {
            valueText = '¥' + (coupon.value / 100);
        } else {
            valueText = coupon.value;
        }
        
        const statusText = {
            'active': '生效中',
            'paused': '已暂停',
            'expired': '已过期',
            'draft': '草稿'
        }[coupon.status] || coupon.status;
        
        const statusClass = {
            'active': 'status-active',
            'paused': 'status-paused',
            'expired': 'status-expired',
            'draft': 'status-draft'
        }[coupon.status] || '';
        
        // 格式化有效期
        let validText = '';
        if (coupon.validType === 'relative') {
            validText = `领取后${coupon.validDays}天有效`;
        } else {
            validText = `${formatDate(coupon.validFrom)} 至 ${formatDate(coupon.validTo)}`;
        }
        
        return `
            <div class="coupon-card">
                <div class="coupon-header ${typeClasses[coupon.type] || 'discount'}">
                    <span class="coupon-type-badge">${typeNames[coupon.type] || '优惠券'}</span>
                    <div class="coupon-value">${valueText}</div>
                    <div class="coupon-name">${coupon.name}</div>
                    <div class="coupon-code">券码：${coupon.code}</div>
                </div>
                <div class="coupon-body">
                    <div class="coupon-info-row">
                        <span class="info-label">使用门槛</span>
                        <span class="info-value">满¥${(coupon.minOrder / 100).toFixed(0)}</span>
                    </div>
                    <div class="coupon-info-row">
                        <span class="info-label">发放进度</span>
                        <span class="info-value">${coupon.receivedCount}/${coupon.totalCount > 0 ? coupon.totalCount : '∞'}</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${usedPercent}%"></div>
                    </div>
                    <div class="coupon-info-row" style="margin-top: 12px;">
                        <span class="info-label">已使用</span>
                        <span class="info-value">${coupon.usedCount || 0}张</span>
                    </div>
                    <div class="coupon-info-row">
                        <span class="info-label">有效期</span>
                        <span class="info-value">${validText}</span>
                    </div>
                    <div class="coupon-info-row">
                        <span class="info-label">状态</span>
                        <span class="info-value ${statusClass}">${statusText}</span>
                    </div>
                    ${coupon.newUserOnly ? '<div class="coupon-tag">新用户专享</div>' : ''}
                    ${coupon.canStack ? '<div class="coupon-tag">可叠加</div>' : ''}
                </div>
                <div class="coupon-footer">
                    <button class="btn-small" onclick="editCoupon('${coupon._id}')">编辑</button>
                    <button class="btn-small" onclick="toggleStatus('${coupon._id}', '${coupon.status}')">${coupon.status === 'active' ? '暂停' : '启用'}</button>
                    <button class="btn-small" onclick="sendCoupon('${coupon._id}')">发放</button>
                    <button class="btn-small danger" onclick="deleteCoupon('${coupon._id}')">删除</button>
                </div>
            </div>
        `;
    }).join('');
}

// 显示创建模态框
function showCreateModal() {
    document.getElementById('couponForm').reset();
    document.getElementById('couponId').value = '';
    document.getElementById('modalTitle').textContent = '新建优惠券';
    document.getElementById('fixedDateGroup').style.display = 'none';
    document.getElementById('validDaysGroup').style.display = 'block';
    document.getElementById('couponModal').classList.add('show');
}

// 编辑优惠券
function editCoupon(couponId) {
    const coupon = coupons.find(c => c._id === couponId);
    if (!coupon) return;
    
    document.getElementById('couponId').value = couponId;
    document.getElementById('couponName').value = coupon.name;
    document.getElementById('couponCode').value = coupon.code;
    document.getElementById('couponType').value = coupon.type;
    document.getElementById('couponValue').value = coupon.type === 'discount' ? (coupon.value * 10) : (coupon.value / 100);
    document.getElementById('minOrder').value = (coupon.minOrder / 100).toFixed(0);
    document.getElementById('maxDiscount').value = coupon.maxDiscount ? (coupon.maxDiscount / 100).toFixed(0) : '';
    document.getElementById('totalCount').value = coupon.totalCount > 0 ? coupon.totalCount : '';
    document.getElementById('limitPerUser').value = coupon.limitPerUser;
    document.getElementById('validType').value = coupon.validType;
    document.getElementById('validDays').value = coupon.validDays || 30;
    document.getElementById('newUserOnly').checked = coupon.newUserOnly || false;
    
    if (coupon.validType === 'fixed') {
        document.getElementById('validFrom').value = coupon.validFrom ? coupon.validFrom.split('T')[0] : '';
        document.getElementById('validTo').value = coupon.validTo ? coupon.validTo.split('T')[0] : '';
        document.getElementById('fixedDateGroup').style.display = 'grid';
        document.getElementById('validDaysGroup').style.display = 'none';
    } else {
        document.getElementById('fixedDateGroup').style.display = 'none';
        document.getElementById('validDaysGroup').style.display = 'block';
    }
    
    document.getElementById('modalTitle').textContent = '编辑优惠券';
    document.getElementById('couponModal').classList.add('show');
}

// 关闭模态框
function closeModal() {
    document.getElementById('couponModal').classList.remove('show');
}

// 保存优惠券
async function saveCoupon() {
    const couponId = document.getElementById('couponId').value;
    
    // 表单验证
    const name = document.getElementById('couponName').value.trim();
    const code = document.getElementById('couponCode').value.trim();
    
    if (!name || !code) {
        showToast('请填写优惠券名称和券码', 'error');
        return;
    }
    
    const data = {
        name: name,
        code: code,
        type: document.getElementById('couponType').value,
        value: parseFloat(document.getElementById('couponValue').value),
        minOrder: parseFloat(document.getElementById('minOrder').value || 0) * 100,
        maxDiscount: parseFloat(document.getElementById('maxDiscount').value || 0) * 100,
        totalCount: parseInt(document.getElementById('totalCount').value) || -1,
        limitPerUser: parseInt(document.getElementById('limitPerUser').value) || 1,
        validType: document.getElementById('validType').value,
        validDays: parseInt(document.getElementById('validDays').value) || 30,
        newUserOnly: document.getElementById('newUserOnly').checked,
        status: 'active'
    };
    
    if (data.validType === 'fixed') {
        data.validFrom = document.getElementById('validFrom').value;
        data.validTo = document.getElementById('validTo').value;
        
        if (!data.validFrom || !data.validTo) {
            showToast('请选择有效期', 'error');
            return;
        }
    }
    
    // 根据类型调整value
    if (data.type === 'discount') {
        // 折扣券value是折扣率，如0.8
        if (data.value > 1) data.value = data.value / 10;
    } else {
        // 金额券value是分
        data.value = data.value * 100;
    }
    
    try {
        showLoading(true);
        
        const action = couponId ? 'updateCoupon' : 'createCoupon';
        const params = couponId 
            ? { action, couponId, data }
            : { action, data };
        
        const result = await callCloudFunction('coupons-api', params);
        
        if (result.success) {
            showToast(couponId ? '更新成功' : '创建成功', 'success');
            closeModal();
            loadCoupons();
        } else {
            showToast(result.error || '保存失败', 'error');
        }
    } catch (error) {
        console.error('保存优惠券失败:', error);
        showToast('保存失败', 'error');
    } finally {
        showLoading(false);
    }
}

// 切换优惠券状态
async function toggleStatus(couponId, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    
    try {
        const result = await callCloudFunction('coupons-api', {
            action: 'updateCoupon',
            couponId: couponId,
            data: { status: newStatus }
        });
        
        if (result.success) {
            showToast(newStatus === 'active' ? '已启用' : '已暂停', 'success');
            loadCoupons();
        } else {
            showToast(result.error || '操作失败', 'error');
        }
    } catch (error) {
        console.error('切换状态失败:', error);
        showToast('操作失败', 'error');
    }
}

// 删除优惠券
async function deleteCoupon(couponId) {
    if (!confirm('确定要删除这个优惠券吗？此操作不可恢复。')) return;
    
    try {
        const result = await callCloudFunction('coupons-api', {
            action: 'deleteCoupon',
            couponId: couponId
        });
        
        if (result.success) {
            showToast('删除成功', 'success');
            loadCoupons();
        } else {
            showToast(result.error || '删除失败', 'error');
        }
    } catch (error) {
        console.error('删除优惠券失败:', error);
        showToast('删除失败', 'error');
    }
}

// 发放优惠券
function sendCoupon(couponId) {
    const coupon = coupons.find(c => c._id === couponId);
    if (!coupon) return;
    
    const userId = prompt(`发放优惠券「${coupon.name}」\n\n请输入用户OpenID（留空则查看发放统计）：`);
    if (userId === null) return; // 取消
    
    if (userId.trim()) {
        sendToUser(couponId, userId.trim());
    } else {
        // 显示发放统计
        showSendStats(coupon);
    }
}

// 显示发放统计
function showSendStats(coupon) {
    const stats = `
优惠券：${coupon.name}
发放总量：${coupon.totalCount > 0 ? coupon.totalCount : '不限'}
已领取：${coupon.receivedCount}
已使用：${coupon.usedCount || 0}
使用率：${coupon.receivedCount > 0 ? ((coupon.usedCount || 0) / coupon.receivedCount * 100).toFixed(1) : 0}%
    `.trim();
    
    alert(stats);
}

// 发放给指定用户
async function sendToUser(couponId, userId) {
    try {
        const result = await callCloudFunction('coupons-api', {
            action: 'sendCouponToUser',
            couponId: couponId,
            userId: userId
        });
        
        if (result.success) {
            showToast('发放成功', 'success');
            loadCoupons(); // 刷新列表更新数量
        } else {
            showToast(result.error || '发放失败', 'error');
        }
    } catch (error) {
        console.error('发放优惠券失败:', error);
        showToast('发放失败', 'error');
    }
}

// 格式化日期
function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
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
