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

// Get today's start and end timestamps
function getTodayRange() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    return {
        start: start.toISOString(),
        end: end.toISOString()
    };
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
        
        const todayRange = getTodayRange();
        
        // 今日订单数
        const todayOrders = orders.filter(o => {
            const orderDate = o.createdAt || o.createTime || o.date;
            return orderDate >= todayRange.start && orderDate <= todayRange.end;
        });
        document.getElementById('todayOrders').textContent = todayOrders.length;
        
        // 待处理订单数
        const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === '待处理');
        document.getElementById('pendingOrders').textContent = pendingOrders.length;
        
        // 今日收入
        const todayRevenue = todayOrders
            .filter(o => o.status === 'completed' || o.status === '已完成')
            .reduce((sum, o) => sum + (parseFloat(o.amount) || parseFloat(o.price) || 0), 0);
        document.getElementById('todayRevenue').textContent = '¥' + todayRevenue.toFixed(2);
        
        // 获取美容师数量
        const techsResult = await apiCall('technicians', { action: 'list' });
        const technicians = techsResult.data || [];
        // 统计在职美容师（status 为 active 或 active 字段为 true）
        const activeTechs = technicians.filter(t => 
            t.status === 'active' || t.active === true || t.status === '在职'
        );
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

// Render recent orders
function renderRecentOrders(orders) {
    const container = document.getElementById('recentOrders');
    if (!container) return;
    
    if (orders.length === 0) {
        container.innerHTML = '<div class="empty-state">暂无订单</div>';
        return;
    }
    
    container.innerHTML = orders.map(order => `
        <div class="recent-item">
            <div class="item-info">
                <span class="item-title">${order.customerName || order.customer || '未知客户'}</span>
                <span class="item-subtitle">${order.serviceName || order.service || '未知服务'}</span>
            </div>
            <div class="item-meta">
                <span class="item-amount">¥${(parseFloat(order.amount) || parseFloat(order.price) || 0).toFixed(2)}</span>
                <span class="status-badge ${order.status}">${getStatusText(order.status)}</span>
            </div>
        </div>
    `).join('');
}

// Load top services
async function loadTopServices() {
    try {
        const result = await apiCall('services', { action: 'list' });
        const services = result.data || [];
        
        const container = document.getElementById('topServices');
        if (!container) return;
        
        if (services.length === 0) {
            container.innerHTML = '<div class="empty-state">暂无服务</div>';
            return;
        }
        
        container.innerHTML = services.slice(0, 5).map((service, index) => `
            <div class="rank-item">
                <span class="rank-number">${index + 1}</span>
                <span class="rank-name">${service.name}</span>
                <span class="rank-price">¥${(parseFloat(service.price) || 0).toFixed(2)}</span>
            </div>
        `).join('');
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
