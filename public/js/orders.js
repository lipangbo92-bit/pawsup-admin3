// Orders Management Module
// 订单管理 - 使用 API 连接云数据库

const API_BASE = '/api';

let currentPage = 1;
let pageSize = 10;
let currentOrders = [];
let selectedOrder = null;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadOrders();
    setDefaultDate();
});

// API 调用封装
async function apiCall(endpoint, data) {
    const response = await fetch(`${API_BASE}/${endpoint}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return await response.json();
}

// Set default date filter
function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    const dateFilter = document.getElementById('dateFilter');
    if (dateFilter) {
        dateFilter.value = today;
    }
}

// Load orders
async function loadOrders(page = 1) {
    currentPage = page;
    
    try {
        showLoading();
        
        // 获取筛选条件
        const orderTypeFilter = document.getElementById('orderTypeFilter');
        const statusFilter = document.getElementById('statusFilter');
        const dateFilter = document.getElementById('dateFilter');
        
        const params = {
            action: 'list'
        };
        
        if (orderTypeFilter && orderTypeFilter.value) {
            params.orderType = orderTypeFilter.value;
        }
        if (statusFilter && statusFilter.value) {
            params.status = statusFilter.value;
        }
        if (dateFilter && dateFilter.value) {
            params.date = dateFilter.value;
        }
        
        const result = await apiCall('orders', params);
        
        if (!result.success) {
            throw new Error(result.error);
        }
        
        currentOrders = (result.data || []).map(order => ({
            ...order,
            _id: order._id || order.id,
            orderNo: order.orderNo || order._id,
            customerName: order.customerName || order.petName || '未知',
            customerPhone: order.customerPhone || '',
            serviceName: order.serviceName || '未知服务',
            amount: order.price || order.amount || 0,
            appointmentDate: order.appointmentDate || '',
            appointmentTime: order.appointmentTime || ''
        }));
        
        renderOrdersTable(currentOrders);
        renderPagination();
        
    } catch (err) {
        console.error('Load orders error:', err);
        document.getElementById('ordersTableBody').innerHTML = `
            <tr><td colspan="8" class="empty-cell">
                加载失败: ${err.message}<br>
                <button onclick="loadOrders()" style="margin-top:8px; padding:6px 12px; background:#4CAF50; color:white; border:none; border-radius:4px; cursor:pointer;">重试</button>
            </td></tr>
        `;
    }
}

// Render orders table
function renderOrdersTable(orders) {
    const tbody = document.getElementById('ordersTableBody');
    
    if (!tbody) {
        console.error('ordersTableBody not found');
        return;
    }
    
    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-cell">暂无订单</td></tr>';
        return;
    }
    
    tbody.innerHTML = orders.map(order => `
        <tr>
            <td><span class="order-no">${order.orderNo}</span></td>
            <td>
                <div class="customer-info">
                    <span class="customer-name">${order.customerName}</span>
                    <span class="customer-phone">${order.customerPhone}</span>
                </div>
            </td>
            <td>${order.petName || '-'}</td>
            <td>${order.serviceName}</td>
            <td>
                <div class="appointment-time">
                    <span class="date">${order.appointmentDate}</span>
                    <span class="time">${order.appointmentTime}</span>
                </div>
            </td>
            <td><span class="amount">¥${order.amount.toFixed(2)}</span></td>
            <td><span class="status-tag ${order.status}">${getStatusText(order.status)}</span></td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon" onclick="viewOrder('${order._id}')" title="查看">👁</button>
                    ${getActionButtons(order)}
                </div>
            </td>
        </tr>
    `).join('');
}

// Get status text
function getStatusText(status) {
    const statusMap = {
        'pending': '待处理',
        'confirmed': '已确认',
        'in_service': '服务中',
        'completed': '已完成',
        'cancelled': '已取消'
    };
    return statusMap[status] || status;
}

// Get action buttons based on status
function getActionButtons(order) {
    const buttons = [];
    
    if (order.status === 'pending') {
        buttons.push(`<button class="btn-icon success" onclick="updateOrderStatus('${order._id}', 'confirmed', event)" title="确认">✓</button>`);
        buttons.push(`<button class="btn-icon danger" onclick="cancelOrder('${order._id}', event)" title="取消">✕</button>`);
    } else if (order.status === 'confirmed') {
        buttons.push(`<button class="btn-icon primary" onclick="updateOrderStatus('${order._id}', 'in_service', event)" title="开始服务">▶</button>`);
    } else if (order.status === 'in_service') {
        buttons.push(`<button class="btn-icon success" onclick="updateOrderStatus('${order._id}', 'completed', event)" title="完成">✓</button>`);
    }
    
    return buttons.join('');
}

// View order details
function viewOrder(orderId) {
    selectedOrder = currentOrders.find(o => o._id === orderId);
    if (!selectedOrder) return;
    
    const content = document.getElementById('orderDetailContent');
    if (!content) return;
    
    content.innerHTML = `
        <div class="detail-section">
            <h4>订单信息</h4>
            <div class="detail-row">
                <span class="label">订单号：</span>
                <span class="value">${selectedOrder.orderNo}</span>
            </div>
            <div class="detail-row">
                <span class="label">创建时间：</span>
                <span class="value">${selectedOrder.createdAt || '-'}</span>
            </div>
            <div class="detail-row">
                <span class="label">订单状态：</span>
                <span class="value"><span class="status-tag ${selectedOrder.status}">${getStatusText(selectedOrder.status)}</span></span>
            </div>
        </div>
        <div class="detail-section">
            <h4>客户信息</h4>
            <div class="detail-row">
                <span class="label">客户姓名：</span>
                <span class="value">${selectedOrder.customerName}</span>
            </div>
            <div class="detail-row">
                <span class="label">联系电话：</span>
                <span class="value">${selectedOrder.customerPhone || '-'}</span>
            </div>
        </div>
        <div class="detail-section">
            <h4>服务信息</h4>
            <div class="detail-row">
                <span class="label">服务项目：</span>
                <span class="value">${selectedOrder.serviceName}</span>
            </div>
            <div class="detail-row">
                <span class="label">预约时间：</span>
                <span class="value">${selectedOrder.appointmentDate} ${selectedOrder.appointmentTime}</span>
            </div>
            <div class="detail-row">
                <span class="label">指定美容师：</span>
                <span class="value">${selectedOrder.technicianName || '不指定'}</span>
            </div>
            <div class="detail-row">
                <span class="label">订单金额：</span>
                <span class="value highlight">¥${selectedOrder.amount.toFixed(2)}</span>
            </div>
        </div>
        ${selectedOrder.address ? `
        <div class="detail-section">
            <h4>地址</h4>
            <p class="remark">${selectedOrder.address}</p>
        </div>
        ` : ''}
        ${selectedOrder.remark ? `
        <div class="detail-section">
            <h4>备注</h4>
            <p class="remark">${selectedOrder.remark}</p>
        </div>
        ` : ''}
    `;
    
    // Update footer buttons
    const footer = document.getElementById('orderModalFooter');
    if (footer) {
        footer.innerHTML = getModalActionButtons(selectedOrder);
    }
    
    const modal = document.getElementById('orderModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

// Get modal action buttons
function getModalActionButtons(order) {
    const buttons = ['<button class="btn-secondary" onclick="closeModal()">关闭</button>'];
    
    if (order.status === 'pending') {
        buttons.push(`<button class="btn-primary" onclick="updateOrderStatus('${order._id}', 'confirmed'); closeModal();">确认订单</button>`);
        buttons.push(`<button class="btn-danger" onclick="cancelOrder('${order._id}'); closeModal();">取消订单</button>`);
    } else if (order.status === 'confirmed') {
        buttons.push(`<button class="btn-primary" onclick="updateOrderStatus('${order._id}', 'in_service'); closeModal();">开始服务</button>`);
    } else if (order.status === 'in_service') {
        buttons.push(`<button class="btn-success" onclick="updateOrderStatus('${order._id}', 'completed'); closeModal();">完成服务</button>`);
    }
    
    return buttons.join('');
}

// Update order status
async function updateOrderStatus(orderId, status, event) {
    if (event) {
        event.stopPropagation();
    }
    
    try {
        const result = await apiCall('orders', {
            action: 'updateStatus',
            id: orderId,
            data: { status }
        });
        
        if (!result.success) {
            throw new Error(result.error);
        }
        
        alert('状态更新成功');
        loadOrders(currentPage);
    } catch (err) {
        console.error('Update order status error:', err);
        alert('更新失败：' + err.message);
    }
}

// Cancel order
async function cancelOrder(orderId, event) {
    if (event) {
        event.stopPropagation();
    }
    
    if (!confirm('确定要取消该订单吗？')) return;
    
    try {
        const result = await apiCall('orders', {
            action: 'updateStatus',
            id: orderId,
            data: { status: 'cancelled' }
        });
        
        if (!result.success) {
            throw new Error(result.error);
        }
        
        alert('订单已取消');
        loadOrders(currentPage);
    } catch (err) {
        console.error('Cancel order error:', err);
        alert('取消失败：' + err.message);
    }
}

// Close modal
function closeModal() {
    const modal = document.getElementById('orderModal');
    if (modal) {
        modal.style.display = 'none';
    }
    selectedOrder = null;
}

// Filter orders
function filterOrders() {
    currentPage = 1;
    loadOrders(1);
}

// Search orders
function searchOrders() {
    const keyword = document.getElementById('searchInput').value.toLowerCase();
    if (!keyword) {
        renderOrdersTable(currentOrders);
        return;
    }
    
    const filtered = currentOrders.filter(order => 
        (order.orderNo && order.orderNo.toLowerCase().includes(keyword)) ||
        (order.customerName && order.customerName.toLowerCase().includes(keyword)) ||
        (order.customerPhone && order.customerPhone.includes(keyword))
    );
    
    renderOrdersTable(filtered);
}

// Render pagination
function renderPagination() {
    const container = document.getElementById('pagination');
    if (!container) return;
    
    container.innerHTML = `
        <button class="page-btn" onclick="loadOrders(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>上一页</button>
        <span class="page-info">第 ${currentPage} 页</span>
        <button class="page-btn" onclick="loadOrders(${currentPage + 1})">下一页</button>
    `;
}

// Show loading
function showLoading() {
    const tbody = document.getElementById('ordersTableBody');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="8" class="loading-cell">加载中...</td></tr>';
    }
}

// Logout function
function logout() {
    localStorage.removeItem('adminLoggedIn');
    window.location.href = 'index.html';
}
