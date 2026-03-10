// Statistics Module
const db = wx.cloud.database();
const _ = db.command;

let revenueChart, serviceChart, statusChart, technicianChart;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    initCloud();
    setDefaultDateRange();
    initCharts();
    loadStatistics();
});

// Initialize WeChat Cloud
function initCloud() {
    wx.cloud.init({
        env: 'cloud1-4gy1jyan842d73ab',
        traceUser: true
    });
}

// Set default date range (last 7 days)
function setDefaultDateRange() {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 6);
    
    document.getElementById('endDate').value = formatDate(end);
    document.getElementById('startDate').value = formatDate(start);
}

// Format date for input
function formatDate(date) {
    return date.toISOString().split('T')[0];
}

// Set date range
function setDateRange(type) {
    const end = new Date();
    const start = new Date();
    
    if (type === 'week') {
        start.setDate(start.getDate() - 6);
    } else if (type === 'month') {
        start.setDate(1);
    }
    
    document.getElementById('endDate').value = formatDate(end);
    document.getElementById('startDate').value = formatDate(start);
    
    loadStatistics();
}

// Initialize charts
function initCharts() {
    // Revenue trend chart
    const revenueCtx = document.getElementById('revenueChart').getContext('2d');
    revenueChart = new Chart(revenueCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: '收入 (元)',
                data: [],
                borderColor: '#F97316',
                backgroundColor: 'rgba(249, 115, 22, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
    
    // Service distribution chart
    const serviceCtx = document.getElementById('serviceChart').getContext('2d');
    serviceChart = new Chart(serviceCtx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: ['#F97316', '#8B5CF6', '#10B981', '#3B82F6', '#F59E0B']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
    
    // Status distribution chart
    const statusCtx = document.getElementById('statusChart').getContext('2d');
    statusChart = new Chart(statusCtx, {
        type: 'pie',
        data: {
            labels: ['待处理', '已确认', '服务中', '已完成', '已取消'],
            datasets: [{
                data: [0, 0, 0, 0, 0],
                backgroundColor: ['#F59E0B', '#3B82F6', '#8B5CF6', '#10B981', '#EF4444']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
    
    // Technician performance chart
    const techCtx = document.getElementById('technicianChart').getContext('2d');
    technicianChart = new Chart(techCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: '服务订单数',
                data: [],
                backgroundColor: '#F97316'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

// Load statistics
async function loadStatistics() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (!startDate || !endDate) return;
    
    try {
        // Get orders in date range
        const ordersRes = await db.collection('orders')
            .where({
                createdAt: _.gte(startDate + ' 00:00:00').and(_.lte(endDate + ' 23:59:59'))
            })
            .get();
        
        const orders = ordersRes.data;
        
        // Calculate statistics
        const stats = calculateStats(orders, startDate, endDate);
        
        // Update UI
        updateStatsCards(stats);
        updateCharts(stats);
        updateDailyTable(stats.dailyStats);
        
    } catch (err) {
        console.error('Load statistics error:', err);
        loadMockStatistics();
    }
}

// Calculate statistics
function calculateStats(orders, startDate, endDate) {
    const stats = {
        totalRevenue: 0,
        totalOrders: orders.length,
        completedOrders: 0,
        cancelledOrders: 0,
        serviceCounts: {},
        statusCounts: { pending: 0, confirmed: 0, in_service: 0, completed: 0, cancelled: 0 },
        technicianCounts: {},
        dailyStats: {}
    };
    
    // Generate date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = formatDate(d);
        stats.dailyStats[dateStr] = { orders: 0, revenue: 0, cancelled: 0 };
    }
    
    orders.forEach(order => {
        const date = (order.createdAt || '').split(' ')[0];
        
        // Status counts
        stats.statusCounts[order.status] = (stats.statusCounts[order.status] || 0) + 1;
        
        // Revenue and completed
        if (order.status === 'completed') {
            stats.totalRevenue += order.amount || 0;
            stats.completedOrders++;
            if (stats.dailyStats[date]) {
                stats.dailyStats[date].revenue += order.amount || 0;
            }
        }
        
        // Cancelled
        if (order.status === 'cancelled') {
            stats.cancelledOrders++;
            if (stats.dailyStats[date]) {
                stats.dailyStats[date].cancelled++;
            }
        }
        
        // Service counts
        if (order.serviceName) {
            stats.serviceCounts[order.serviceName] = (stats.serviceCounts[order.serviceName] || 0) + 1;
        }
        
        // Technician counts
        if (order.technicianName) {
            stats.technicianCounts[order.technicianName] = (stats.technicianCounts[order.technicianName] || 0) + 1;
        }
        
        // Daily orders
        if (stats.dailyStats[date]) {
            stats.dailyStats[date].orders++;
        }
    });
    
    return stats;
}

// Update stats cards
function updateStatsCards(stats) {
    document.getElementById('totalRevenue').textContent = '¥' + stats.totalRevenue.toFixed(2);
    document.getElementById('totalOrders').textContent = stats.totalOrders;
    document.getElementById('newCustomers').textContent = Math.floor(stats.totalOrders * 0.7); // Estimate
    
    // Calculate average rating (mock)
    const avgRating = (4.5 + Math.random() * 0.5).toFixed(1);
    document.getElementById('avgRating').textContent = avgRating;
}

// Update charts
function updateCharts(stats) {
    // Revenue chart
    const dates = Object.keys(stats.dailyStats).sort();
    revenueChart.data.labels = dates.map(d => d.slice(5)); // MM-DD
    revenueChart.data.datasets[0].data = dates.map(d => stats.dailyStats[d].revenue);
    revenueChart.update();
    
    // Service chart
    const services = Object.entries(stats.serviceCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    serviceChart.data.labels = services.map(s => s[0]);
    serviceChart.data.datasets[0].data = services.map(s => s[1]);
    serviceChart.update();
    
    // Status chart
    statusChart.data.datasets[0].data = [
        stats.statusCounts.pending,
        stats.statusCounts.confirmed,
        stats.statusCounts.in_service,
        stats.statusCounts.completed,
        stats.statusCounts.cancelled
    ];
    statusChart.update();
    
    // Technician chart
    const techs = Object.entries(stats.technicianCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    technicianChart.data.labels = techs.map(t => t[0]);
    technicianChart.data.datasets[0].data = techs.map(t => t[1]);
    technicianChart.update();
}

// Update daily stats table
function updateDailyTable(dailyStats) {
    const tbody = document.getElementById('dailyStatsBody');
    const dates = Object.keys(dailyStats).sort().reverse();
    
    tbody.innerHTML = dates.map(date => {
        const day = dailyStats[date];
        const avgPrice = day.orders > 0 ? day.revenue / day.orders : 0;
        const cancelRate = day.orders > 0 ? ((day.cancelled / day.orders) * 100).toFixed(1) : 0;
        
        return `
            <tr>
                <td>${date}</td>
                <td>${day.orders}</td>
                <td>¥${day.revenue.toFixed(2)}</td>
                <td>¥${avgPrice.toFixed(2)}</td>
                <td>${cancelRate}%</td>
            </tr>
        `;
    }).join('');
}

// Load mock statistics for demo
function loadMockStatistics() {
    const mockStats = {
        totalRevenue: 5280.00,
        totalOrders: 45,
        completedOrders: 40,
        cancelledOrders: 3,
        serviceCounts: {
            '基础洗护': 20,
            '美容造型': 15,
            'SPA护理': 10
        },
        statusCounts: { pending: 2, confirmed: 3, in_service: 0, completed: 40, cancelled: 3 },
        technicianCounts: {
            '张美容': 18,
            '李洗护': 15,
            '王护理': 12
        },
        dailyStats: {}
    };
    
    // Generate 7 days mock data
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = formatDate(d);
        mockStats.dailyStats[dateStr] = {
            orders: Math.floor(Math.random() * 10) + 5,
            revenue: Math.floor(Math.random() * 1000) + 500,
            cancelled: Math.floor(Math.random() * 2)
        };
    }
    
    updateStatsCards(mockStats);
    updateCharts(mockStats);
    updateDailyTable(mockStats.dailyStats);
}
