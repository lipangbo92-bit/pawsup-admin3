// 优惠券管理页面逻辑

let coupons = [];
let currentStatus = 'all';

// 页面加载
document.addEventListener('DOMContentLoaded', function() {
    initCloud();
    loadCoupons();
    bindEvents();
});

// 初始化云开发
function initCloud() {
    cloud.init({
        env: 'cloud1-4gy1jyan842d73ab'
    });
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
        const result = await cloud.callFunction({
            name: 'coupons-api',
            data: {
                action: 'getCoupons',
                status: currentStatus === 'all' ? '' : currentStatus
            }
        });
        
        if (result.result.success) {
            coupons = result.result.data;
            renderCoupons();
        }
    } catch (error) {
        console.error('加载优惠券失败:', error);
        showToast('加载失败', 'error');
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
        'exchange': '兑换券'
    };
    
    const typeClasses = {
        'discount': 'discount',
        'amount': 'amount',
        'exchange': 'exchange'
    };
    
    container.innerHTML = coupons.map(coupon => {
        const usedPercent = coupon.totalCount > 0 
            ? Math.round((coupon.receivedCount / coupon.totalCount) * 100) 
            : 0;
        
        let valueText = '';
        if (coupon.type === 'discount') {
            valueText = (coupon.value * 10) + '折';
        } else {
            valueText = '¥' + (coupon.value / 100);
        }
        
        const statusText = {
            'active': '生效中',
            'paused': '已暂停',
            'expired': '已过期'
        }[coupon.status] || coupon.status;
        
        return `
            <div class="coupon-card">
                <div class="coupon-header ${typeClasses[coupon.type]}">
                    <span class="coupon-type-badge">${typeNames[coupon.type]}</span>
                    <div class="coupon-value">${valueText}</div>
                    <div class="coupon-name">${coupon.name}</div>
                    <div class="coupon-code">券码：${coupon.code}</div>
                </div>
                <div class="coupon-body">
                    <div class="coupon-info-row">
                        <span class="info-label">使用门槛</span>
                        <span class="info-value">满¥${coupon.minOrder / 100}</span>
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
                        <span class="info-value">${coupon.usedCount}张</span>
                    </div>
                    <div class="coupon-info-row">
                        <span class="info-label">状态</span>
                        <span class="info-value">${statusText}</span>
                    </div>
                </div>
                <div class="coupon-footer">
                    <button class="btn-small" onclick="editCoupon('${coupon._id}')">编辑</button>
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
    document.getElementById('couponValue').value = coupon.value;
    document.getElementById('minOrder').value = coupon.minOrder / 100;
    document.getElementById('maxDiscount').value = coupon.maxDiscount / 100 || '';
    document.getElementById('totalCount').value = coupon.totalCount;
    document.getElementById('limitPerUser').value = coupon.limitPerUser;
    document.getElementById('validType').value = coupon.validType;
    document.getElementById('validDays').value = coupon.validDays;
    document.getElementById('newUserOnly').checked = coupon.newUserOnly;
    
    if (coupon.validType === 'fixed') {
        document.getElementById('validFrom').value = coupon.validFrom?.split('T')[0] || '';
        document.getElementById('validTo').value = coupon.validTo?.split('T')[0] || '';
        document.getElementById('fixedDateGroup').style.display = 'grid';
        document.getElementById('validDaysGroup').style.display = 'none';
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
    
    const data = {
        name: document.getElementById('couponName').value,
        code: document.getElementById('couponCode').value,
        type: document.getElementById('couponType').value,
        value: parseFloat(document.getElementById('couponValue').value),
        minOrder: parseFloat(document.getElementById('minOrder').value) * 100,
        maxDiscount: parseFloat(document.getElementById('maxDiscount').value || 0) * 100,
        totalCount: parseInt(document.getElementById('totalCount').value) || -1,
        limitPerUser: parseInt(document.getElementById('limitPerUser').value) || 1,
        validType: document.getElementById('validType').value,
        validDays: parseInt(document.getElementById('validDays').value) || 30,
        newUserOnly: document.getElementById('newUserOnly').checked
    };
    
    if (data.validType === 'fixed') {
        data.validFrom = document.getElementById('validFrom').value;
        data.validTo = document.getElementById('validTo').value;
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
        const action = couponId ? 'updateCoupon' : 'createCoupon';
        const params = couponId 
            ? { action, couponId, data }
            : { action, data };
        
        const result = await cloud.callFunction({
            name: 'coupons-api',
            data: params
        });
        
        if (result.result.success) {
            showToast(couponId ? '更新成功' : '创建成功', 'success');
            closeModal();
            loadCoupons();
        } else {
            showToast(result.result.error || '保存失败', 'error');
        }
    } catch (error) {
        console.error('保存优惠券失败:', error);
        showToast('保存失败', 'error');
    }
}

// 删除优惠券
async function deleteCoupon(couponId) {
    if (!confirm('确定要删除这个优惠券吗？')) return;
    
    try {
        const result = await cloud.callFunction({
            name: 'coupons-api',
            data: {
                action: 'deleteCoupon',
                couponId
            }
        });
        
        if (result.result.success) {
            showToast('删除成功', 'success');
            loadCoupons();
        } else {
            showToast(result.result.error || '删除失败', 'error');
        }
    } catch (error) {
        console.error('删除优惠券失败:', error);
        showToast('删除失败', 'error');
    }
}

// 发放优惠券（简化版，直接提示输入用户ID）
function sendCoupon(couponId) {
    const userId = prompt('请输入用户OpenID（留空则发放给所有用户）：');
    if (userId === null) return; // 取消
    
    if (userId.trim()) {
        sendToUser(couponId, userId.trim());
    } else {
        if (confirm('确定要发放给所有用户吗？')) {
            sendToAllUsers(couponId);
        }
    }
}

// 发放给指定用户
async function sendToUser(couponId, userId) {
    try {
        const result = await cloud.callFunction({
            name: 'coupons-api',
            data: {
                action: 'sendCouponToUser',
                couponId,
                userId
            }
        });
        
        if (result.result.success) {
            showToast('发放成功', 'success');
        } else {
            showToast(result.result.error || '发放失败', 'error');
        }
    } catch (error) {
        console.error('发放优惠券失败:', error);
        showToast('发放失败', 'error');
    }
}

// 发放给所有用户（这里简化处理，实际需要分页）
async function sendToAllUsers(couponId) {
    showToast('批量发放功能开发中', 'error');
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
