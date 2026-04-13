// Dashboard Module - 使用 API 方式连接数据库
const API_BASE = '/api';

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    loadDashboardData();
    setCurrentDate();
});

// Set current date
function setCurrentDate() {
    const date = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    document.getElementById('currentDate').textContent = date.toLocaleDateString('zh-CN', options);
    
    // Set admin name
    const adminUser = localStorage.getItem('adminUser') || '管理员';
    document.getElementById('adminName').textContent = adminUser;
}

// Get today string (YYYY-MM-DD)
function getTodayString() {
    const date = new Date();
    return date.toISOString().split('T')[0];
}

// API 调用封装
async function apiCall(endpoint, data) {
    try {
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
    } catch (err) {
        console.error('API call error:', err);
        throw err;
    }
}

// Load dashboard data
async function loadDashboardData() {
    try {
        // 获取所有订单数据
        const ordersResult = await apiCall('orders', { action: 'list' });
        const orders = ordersResult.data || [];
        
        const todayStr = getTodayString();
        
        // 今日订单数（根据日期字段匹配）
        const todayOrders = orders.filter(o => {
            const orderDate = extractDate(o.createdAt || o.createTime || o.date || o.appointmentDate);
            return orderDate === todayStr;
        });
        document.getElementById('todayOrders').textContent = todayOrders.length;
        
        // 待处理订单数
        const pendingOrders = orders.filter(o => {
            const status = (o.status || '').toLowerCase();
            return status === 'pending' || status === '待处理' || status === '待确认';
        });
        document.getElementById('pendingOrders').textContent = pendingOrders.length;
        
        // 今日收入（已完成的今日订单）
        const todayRevenue = todayOrders
            .filter(o => {
                const status = (o.status || '').toLowerCase();
                return status === 'completed' || status === '已完成';
            })
            .reduce((sum, o) => sum + (parseFloat(o.amount) || parseFloat(o.price) || 0), 0);
        document.getElementById('todayRevenue').textContent = '¥' + todayRevenue.toFixed(2);
        
        // 获取美容师数量
        const techsResult = await apiCall('technicians', { action: 'list' });
        const technicians = techsResult.data || [];
        console.log('Technicians data:', technicians);
        
        // 统计在职美容师 - 兼容多种状态字段
        const activeTechs = technicians.filter(t => {
            // 检查各种可能的状态字段
            const status = t.status || '';
            const active = t.active;
            const level = t.level || '';
            
            // 默认如果没有明确标记为离职/休息，则视为在职
            const isActive = (
                status === 'active' || 
                status === '在职' || 
                active === true ||
                (status !== 'inactive' && status !== '休息中' && status !== '离职')
            );
            
            console.log(`Tech ${t.name}: status=${status}, active=${active}, isActive=${isActive}`);
            return isActive;
        });
        
        console.log('Active techs count:', activeTechs.length);
        document.getElementById('activeTechs').textContent = activeTechs.length;
        
        // 加载最近订单
        renderRecentOrders(orders.slice(0, 5));
        
        // 加载服务列表
        loadTopServices();
        
    } catch (err) {
        console.error('Load dashboard data error:', err);
        // Use mock data for demo
        loadMockData();
    }
}

// 从时间字符串提取日期 (YYYY-MM-DD)
function extractDate(dateStr) {
    if (!dateStr) return '';
    // 处理 ISO 格式: 2024-03-10T12:00:00.000Z
    if (dateStr.includes('T')) {
        return dateStr.split('T')[0];
    }
    // 处理空格分隔: 2024-03-10 12:00:00
    if (dateStr.includes(' ')) {
        return dateStr.split(' ')[0];
    }
    // 已经是日期格式
    return dateStr;
}

// Render recent orders
function renderRecentOrders(orders) {
    const container = document.getElementById('recentOrders');
    if (!container) return;
    
    console.log('[renderRecentOrders] 订单数据:', orders);
    
    if (orders.length === 0) {
        container.innerHTML = '<div class="empty-state">暂无订单</div>';
        return;
    }
    
    container.innerHTML = orders.map(order => {
        // 处理嵌套的数据格式
        const orderData = order.data || order;
        console.log('[renderRecentOrders] 处理订单:', orderData);
        
        // 获取金额 - 尝试多个可能的字段名
        let amount = 0;
        if (orderData.totalAmount !== undefined) amount = orderData.totalAmount;
        else if (orderData.amount !== undefined) amount = orderData.amount;
        else if (orderData.price !== undefined) amount = orderData.price;
        else if (orderData.totalPrice !== undefined) amount = orderData.totalPrice;
        
        // 获取客户名
        const customerName = orderData.customerName || orderData.customer?.name || orderData.customerName || '未知客户';
        
        // 获取服务名
        const serviceName = orderData.serviceName || orderData.service?.name || orderData.serviceType || '未知服务';
        
        // 获取状态
        const status = orderData.status || 'pending';
        
        // 获取时间
        const time = orderData.createdAt || orderData.createTime || orderData.date || '';
        const timeStr = time ? new Date(time).toLocaleString('zh-CN', {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'}) : '';
        
        return `
        <div class="recent-item">
            <div class="item-info">
                <span class="item-title">${customerName}</span>
                <span class="item-subtitle">${serviceName}</span>
                ${timeStr ? `<span class="item-time">${timeStr}</span>` : ''}
            </div>
            <div class="item-meta">
                <span class="item-amount">¥${(parseFloat(amount) || 0).toFixed(2)}</span>
                <span class="status-badge ${status}">${getStatusText(status)}</span>
            </div>
        </div>
    `}).join('');
}

// Load top services
async function loadTopServices() {
    try {
        const result = await apiCall('services', { action: 'list' });
        const services = result.data || [];
        
        console.log('[loadTopServices] 服务数据:', services);
        
        const container = document.getElementById('topServices');
        if (!container) return;
        
        if (services.length === 0) {
            container.innerHTML = '<div class="empty-state">暂无服务</div>';
            return;
        }
        
        // 按销量排序（如果有销量字段）
        const sortedServices = services.sort((a, b) => {
            const salesA = a.sales || a.orderCount || 0;
            const salesB = b.sales || b.orderCount || 0;
            return salesB - salesA;
        });
        
        container.innerHTML = sortedServices.slice(0, 5).map((service, index) => {
            // 处理嵌套数据格式
            const serviceData = service.data || service;
            const sales = serviceData.sales || serviceData.orderCount || 0;
            
            return `
            <div class="rank-item">
                <span class="rank-number">${index + 1}</span>
                <div class="rank-info">
                    <span class="rank-name">${serviceData.name}</span>
                    ${sales > 0 ? `<span class="rank-sales">已售 ${sales} 单</span>` : ''}
                </div>
                <span class="rank-price">¥${(parseFloat(serviceData.price) || 0).toFixed(2)}<small>/次</small></span>
            </div>
        `}).join('');
    } catch (err) {
        console.error('Load top services error:', err);
        document.getElementById('topServices').innerHTML = '<div class="empty-state">加载失败</div>';
    }
}

// Get status text
function getStatusText(status) {
    const statusMap = {
        'pending': '待处理',
        'confirmed': '已确认',
        'in_service': '服务中',
        'completed': '已完成',
        'cancelled': '已取消',
        '待处理': '待处理',
        '已确认': '已确认',
        '服务中': '服务中',
        '已完成': '已完成',
        '已取消': '已取消'
    };
    return statusMap[status] || status || '未知';
}

// Load mock data for demo
function loadMockData() {
    document.getElementById('todayOrders').textContent = '12';
    document.getElementById('pendingOrders').textContent = '3';
    document.getElementById('todayRevenue').textContent = '¥1,280.00';
    document.getElementById('activeTechs').textContent = '5';
    
    document.getElementById('recentOrders').innerHTML = `
        <div class="recent-item">
            <div class="item-info">
                <span class="item-title">张先生</span>
                <span class="item-subtitle">基础洗护 - 金毛</span>
            </div>
            <div class="item-meta">
                <span class="item-amount">¥99.00</span>
                <span class="status-badge pending">待处理</span>
            </div>
        </div>
        <div class="recent-item">
            <div class="item-info">
                <span class="item-title">李女士</span>
                <span class="item-subtitle">美容造型 - 泰迪</span>
            </div>
            <div class="item-meta">
                <span class="item-amount">¥168.00</span>
                <span class="status-badge confirmed">已确认</span>
            </div>
        </div>
    `;
    
    document.getElementById('topServices').innerHTML = `
        <div class="rank-item">
            <span class="rank-number">1</span>
            <span class="rank-name">基础洗护</span>
            <span class="rank-price">¥99.00</span>
        </div>
        <div class="rank-item">
            <span class="rank-number">2</span>
            <span class="rank-name">美容造型</span>
            <span class="rank-price">¥168.00</span>
        </div>
        <div class="rank-item">
            <span class="rank-number">3</span>
            <span class="rank-name">SPA护理</span>
            <span class="rank-price">¥238.00</span>
        </div>
    `;
}
