// Orders Management Module
// Cloud environment configuration
const CLOUD_ENV = 'cloud1-4gy1jyan842d73ab';
const API_BASE = `https://${CLOUD_ENV}.bastionpay.cn/v2/wx/q/cloudfunction`;

let currentPage = 1;
let pageSize = 10;
let currentOrders = [];
let selectedOrder = null;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadOrders();
    setDefaultDate();
});

// Cloud function call helper
async function cloudCall(functionName, data = {}, method = 'GET') {
    // Build query string for GET requests
    let url = `${API_BASE}/${functionName}`;
    
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        }
    };
    
    if (method === 'POST' || method === 'PUT') {
        options.body = JSON.stringify(data);
    } else if (method === 'GET' && Object.keys(data).length > 0) {
        const params = new URLSearchParams();
        Object.keys(data).forEach(key => {
            if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
                params.append(key, data[key]);
            }
        });
        if (params.toString()) {
            url += '?' + params.toString();
        }
    }
    
    try {
        const response = await fetch(url, options);
        const result = await response.json();
        
        if (result.errCode) {
            throw new Error(result.errMsg || '请求失败');
        }
        
        return result;
    } catch (err) {
        console.error('Cloud call error:', err);
        throw err;
    }
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
        
        const skip = (page - 1) * pageSize;
        
        // Build query parameters
        const params = {
            page: page,
            pageSize: pageSize,
            orderBy: 'createdAt',
            order: 'desc'
        };
        
        // Apply filters
        const statusFilter = document.getElementById('statusFilter');
        const dateFilter = document.getElementById('dateFilter');
        
        if (statusFilter && statusFilter.value) {
            params.status = statusFilter.value;
        }
        
        if (dateFilter && dateFilter.value) {
            params.appointmentDate = dateFilter.value;
        }
        
        const result = await cloudCall('orders-api', params, 'GET');
        
        currentOrders = result.data || [];
        
        renderOrdersTable(currentOrders);
        renderPagination();
        
    } catch (err) {
        console.error('Load orders error:', err);
        showMessage('加载订单失败', 'error');
        // Load mock data for demo
        loadMockOrders();
    } finally {
        hideLoading();
    }
}

// Load mock orders for demo
function loadMockOrders() {
    const mockOrders = [
        {
            _id: '1',
            orderNo: 'ORD20240301001',
            customerName: '张先生',
            customerPhone: '138****1234',
            serviceName: '基础洗护',
            appointmentDate: '2024-03-01',
            appointmentTime: '10:00',
            amount: 99.00,
            status: 'pending'
        },
        {
            _id: '2',
            orderNo: 'ORD20240301002',
            customerName: '李女士',
            customerPhone: '139****5678',
            serviceName: '美容造型',
            appointmentDate: '2024-03-01',
            appointmentTime: '14:00',
            amount: 168.00,
            status: 'confirmed'
        },
        {
            _id: '3',
            orderNo: 'ORD20240301003',
            customerName: '王先生',
            customerPhone: '137****9012',
            serviceName: 'SPA护理',
            appointmentDate: '2024-03-01',
            appointmentTime: '16:00',
            amount: 238.00,
            status: 'completed'
        }
    ];
    
    currentOrders = mockOrders;
    renderOrdersTable(mockOrders);
}

// Render orders table
function renderOrdersTable(orders) {
    const tbody = document.getElementById('ordersTableBody');
    
    if (!tbody) {
        console.error('ordersTableBody not found');
        return;
    }
    
    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-cell">暂无订单</td></tr>';
        return;
    }
    
    tbody.innerHTML = orders.map(order => `
        <tr>
            <td><span class="order-no">${order.orderNo || order._id}</span></td>
            <td>
                <div class="customer-info">
                    <span class="customer-name">${order.customerName || '未知'}</span>
                    <span class="customer-phone">${order.customerPhone || ''}</span>
                </div>
            </td>
            <td>${order.serviceName || '未知服务'}</td>
            <td>
                <div class="appointment-time">
                    <span class="date">${order.appointmentDate || ''}</span>
                    <span class="time">${order.appointmentTime || ''}</span>
                </div>
            </td>
            <td><span class="amount">¥${(order.amount || 0).toFixed(2)}</span></td>
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
        buttons.push(`<button class="btn-icon success" onclick="updateOrderStatus('${order._id}', 'confirmed')" title="确认">✓</button>`);
        buttons.push(`<button class="btn-icon danger" onclick="cancelOrder('${order._id}')" title="取消">✕</button>`);
    } else if (order.status === 'confirmed') {
        buttons.push(`<button class="btn-icon primary" onclick="updateOrderStatus('${order._id}', 'in_service')" title="开始服务">▶</button>`);
    } else if (order.status === 'in_service') {
        buttons.push(`<button class="btn-icon success" onclick="updateOrderStatus('${order._id}', 'completed')" title="完成">✓</button>`);
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
                <span class="value">${selectedOrder.orderNo || selectedOrder._id}</span>
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
                <span class="value">${selectedOrder.customerName || '-'}</span>
            </div>
            <div class="detail-row">
                <span class="label">联系电话：</span>
                <span class="value">${selectedOrder.customerPhone || '-'}</span>
            </div>
            <div class="detail-row">
                <span class="label">宠物信息：</span>
                <span class="value">${selectedOrder.petName || '-'} (${selectedOrder.petType || '-'}, ${selectedOrder.petBreed || '-'})</span>
            </div>
        </div>
        <div class="detail-section">
            <h4>服务信息</h4>
            <div class="detail-row">
                <span class="label">服务项目：</span>
                <span class="value">${selectedOrder.serviceName || '-'}</span>
            </div>
            <div class="detail-row">
                <span class="label">预约时间：</span>
                <span class="value">${selectedOrder.appointmentDate || '-'} ${selectedOrder.appointmentTime || ''}</span>
            </div>
            <div class="detail-row">
                <span class="label">指定技师：</span>
                <span class="value">${selectedOrder.technicianName || '不指定'}</span>
            </div>
            <div class="detail-row">
                <span class="label">订单金额：</span>
                <span class="value highlight">¥${(selectedOrder.amount || 0).toFixed(2)}</span>
            </div>
        </div>
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
async function updateOrderStatus(orderId, status) {
    try {
        await cloudCall('orders-api', {
            status: status
        }, 'PUT');
        
        showMessage('状态更新成功', 'success');
        loadOrders(currentPage);
    } catch (err) {
        console.error('Update order status error:', err);
        showMessage('更新失败，请重试', 'error');
    }
}

// Cancel order
async function cancelOrder(orderId) {
    if (!confirm('确定要取消该订单吗？')) return;
    
    try {
        await cloudCall('orders-api', {
            status: 'cancelled'
        }, 'PUT');
        
        showMessage('订单已取消', 'success');
        loadOrders(currentPage);
    } catch (err) {
        console.error('Cancel order error:', err);
        showMessage('取消失败，请重试', 'error');
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
        loadOrders(currentPage);
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
        tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">加载中...</td></tr>';
    }
}

// Hide loading
function hideLoading() {
    // Handled by renderOrdersTable
}
