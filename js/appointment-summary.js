// Appointment Summary Module - 预约汇总
// 调用 Vercel API Routes 访问云数据库

const API_BASE = '/api';

let currentDate = '';
let techniciansList = [];
let ordersData = [];

document.addEventListener('DOMContentLoaded', function() {
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('summaryDate');
    if (dateInput) {
        dateInput.value = today;
        currentDate = today;
    }
    loadSummary();
});

async function apiCall(endpoint, data) {
    const response = await fetch(`${API_BASE}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    return await response.json();
}

function onSummaryDateChange() {
    const dateInput = document.getElementById('summaryDate');
    if (dateInput) {
        currentDate = dateInput.value;
        loadSummary();
    }
}

async function loadSummary() {
    if (!currentDate) return;
    const container = document.getElementById('summaryContainer');
    if (container) container.innerHTML = '<div class="loading">加载数据...</div>';
    
    try {
        const techResult = await apiCall('technicians', { action: 'list' });
        if (!techResult.success) throw new Error(techResult.error);
        techniciansList = (techResult.data || []).map(t => ({...t, _id: t._id || t.id, name: t.name || '未命名'}));
        
        const orderResult = await apiCall('orders', { action: 'list', date: currentDate });
        if (!orderResult.success) throw new Error(orderResult.error);
        ordersData = orderResult.data || [];
        
        const scheduleResult = await apiCall('schedules', { action: 'list', date: currentDate });
        const schedules = scheduleResult.success ? (scheduleResult.data || []) : [];
        const scheduleMap = {};
        schedules.forEach(s => { scheduleMap[s.technicianId] = s; });
        
        renderSummary(scheduleMap);
    } catch (error) {
        if (container) container.innerHTML = `<div class="empty-state">加载失败: ${error.message}</div>`;
    }
}

function renderSummary(scheduleMap) {
    const container = document.getElementById('summaryContainer');
    if (!container) return;
    if (techniciansList.length === 0) {
        container.innerHTML = '<div class="empty-state">暂无技师数据</div>';
        return;
    }
    
    const ordersByTech = {};
    techniciansList.forEach(tech => { ordersByTech[tech._id] = []; });
    ordersData.forEach(order => {
        if (order.technicianId && ordersByTech[order.technicianId]) {
            ordersByTech[order.technicianId].push(order);
        }
    });
    
    const timeSlots = [];
    for (let h = 8; h <= 22; h++) {
        timeSlots.push(`${String(h).padStart(2, '0')}:00`);
        if (h < 22) timeSlots.push(`${String(h).padStart(2, '0')}:30`);
    }
    
    let html = `
        <div class="summary-header">
            <div class="summary-date">${currentDate} 预约汇总</div>
            <div class="summary-stats">
                <div class="stat-item"><span class="stat-value">${techniciansList.length}</span><span class="stat-label">技师总数</span></div>
                <div class="stat-item"><span class="stat-value">${ordersData.length}</span><span class="stat-label">订单总数</span></div>
                <div class="stat-item"><span class="stat-value">${ordersData.filter(o => o.status === 'completed').length}</span><span class="stat-label">已完成</span></div>
            </div>
        </div>
        <div class="summary-table-wrapper">
            <table class="summary-table">
                <thead><tr><th class="tech-col">技师</th><th class="status-col">状态</th>${timeSlots.map(t => `<th class="time-col">${t}</th>`).join('')}<th class="count-col">订单数</th></tr></thead>
                <tbody>`;
    
    techniciansList.forEach(tech => {
        const schedule = scheduleMap[tech._id];
        const isRestDay = schedule ? schedule.isRestDay : false;
        const techOrders = ordersByTech[tech._id] || [];
        const slotStatus = {};
        timeSlots.forEach(t => slotStatus[t] = { type: 'empty', data: null });
        if (schedule && !isRestDay && schedule.timeSlots) {
            schedule.timeSlots.forEach(slot => {
                if (slotStatus[slot.time]) slotStatus[slot.time] = { type: slot.available ? 'available' : 'closed', data: slot };
            });
        }
        techOrders.forEach(order => {
            if (order.appointmentTime && slotStatus[order.appointmentTime]) {
                slotStatus[order.appointmentTime] = { type: 'booked', data: order };
            }
        });
        
        html += `<tr class="${tech.status === 'inactive' ? 'inactive' : ''}">
            <td class="tech-cell"><div class="tech-info-row"><div class="tech-avatar-sm" style="background: ${getTechColor(tech._id)}20;">${tech.avatarUrl ? `<img src="${tech.avatarUrl}">` : '👤'}</div><div class="tech-info-text"><div class="tech-name">${tech.name}</div><div class="tech-status-badge ${tech.status}">${tech.status === 'active' ? '在职' : '离职'}</div></div></div></td>
            <td class="status-cell">${isRestDay ? '<span class="rest-badge">🌙 休息</span>' : '<span class="work-badge">💼 上班</span>'}</td>`;
        
        if (isRestDay) {
            html += `<td colspan="${timeSlots.length}" class="rest-row"><span>今日休息</span></td>`;
        } else {
            timeSlots.forEach(time => {
                const slot = slotStatus[time];
                let cellClass = 'slot-cell';
                let content = '';
                if (slot.type === 'booked') { cellClass += ' booked'; content = '●'; }
                else if (slot.type === 'available') { cellClass += ' available'; content = '○'; }
                else if (slot.type === 'closed') { cellClass += ' closed'; }
                html += `<td class="${cellClass}">${content}</td>`;
            });
        }
        html += `<td class="count-cell"><span class="order-count">${techOrders.length}</span></td></tr>`;
    });
    
    html += `</tbody></table></div>
        <div class="summary-legend">
            <div class="legend-item"><span class="legend-dot available"></span><span>可预约</span></div>
            <div class="legend-item"><span class="legend-dot booked"></span><span>已预约</span></div>
            <div class="legend-item"><span class="legend-dot closed"></span><span>未开放</span></div>
            <div class="legend-item"><span class="legend-dot empty"></span><span>未设置</span></div>
        </div>`;
    container.innerHTML = html;
}

function getTechColor(id) {
    const colors = ['#F472B6', '#60A5FA', '#A78BFA', '#34D399', '#FBBF24', '#FB923C'];
    let hash = 0;
    for (let i = 0; i < (id || '').length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
}

function logout() {
    localStorage.removeItem('adminLoggedIn');
    window.location.href = 'index.html';
}
