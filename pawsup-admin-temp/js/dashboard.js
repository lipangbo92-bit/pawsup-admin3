// Dashboard Module
const db = wx.cloud.database();
const _ = db.command;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    initCloud();
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

// Load dashboard data
async function loadDashboardData() {
    try {
        const today = getTodayString();
        
        // Get today's orders count
        const todayOrdersRes = await db.collection('orders')
            .where({
                createdAt: _.gte(today + ' 00:00:00').and(_.lte(today + ' 23:59:59'))
            })
            .count();
        document.getElementById('todayOrders').textContent = todayOrdersRes.total || 0;
        
        // Get pending orders count
        const pendingRes = await db.collection('orders')
            .where({ status: 'pending' })
            .count();
        document.getElementById('pendingOrders').textContent = pendingRes.total || 0;
        
        // Get today's revenue
        const revenueRes = await db.collection('orders')
            .where({
                status: 'completed',
                completedAt: _.gte(today + ' 00:00:00')
            })
            .get();
        const todayRevenue = revenueRes.data.reduce((sum, order) => sum + (order.amount || 0), 0);
        document.getElementById('todayRevenue').textContent = '¥' + todayRevenue.toFixed(2);
        
        // Get active technicians
        const techsRes = await db.collection('technicians')
            .where({ active: true })
            .count();
        document.getElementById('activeTechs').textContent = techsRes.total || 0;
        
        // Load recent orders
        loadRecentOrders();
        
        // Load top services
        loadTopServices();
        
    } catch (err) {
        console.error('Load dashboard data error:', err);
        // Use mock data for demo
        loadMockData();
    }
}

// Load recent orders
async function loadRecentOrders() {
    try {
        const res = await db.collection('orders')
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();
        
        const container = document.getElementById('recentOrders');
        if (res.data.length === 0) {
            container.innerHTML = '<div class="empty-state">暂无订单</div>';
            return;
        }
        
        container.innerHTML = res.data.map(order => `
            <div class="recent-item">
                <div class="item-info">
                    <span class="item-title">${order.customerName || '未知客户'}</span>
                    <span class="item-subtitle">${order.serviceName || '未知服务'}</span>
                </div>
                <div class="item-meta">
                    <span class="item-amount">¥${(order.amount || 0).toFixed(2)}</span>
                    <span class="status-badge ${order.status}">${getStatusText(order.status)}</span>
                </div>
            </div>
        `).join('');
    } catch (err) {
        document.getElementById('recentOrders').innerHTML = '<div class="empty-state">加载失败</div>';
    }
}

// Load top services
async function loadTopServices() {
    try {
        const res = await db.collection('services')
            .where({ active: true })
            .limit(5)
            .get();
        
        const container = document.getElementById('topServices');
        if (res.data.length === 0) {
            container.innerHTML = '<div class="empty-state">暂无服务</div>';
            return;
        }
        
        container.innerHTML = res.data.map((service, index) => `
            <div class="rank-item">
                <span class="rank-number">${index + 1}</span>
                <span class="rank-name">${service.name}</span>
                <span class="rank-price">¥${(service.price || 0).toFixed(2)}</span>
            </div>
        `).join('');
    } catch (err) {
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
        'cancelled': '已取消'
    };
    return statusMap[status] || status;
}

// Get today string
function getTodayString() {
    const date = new Date();
    return date.toISOString().split('T')[0];
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
