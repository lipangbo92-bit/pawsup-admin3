// Schedule Management Module - 排班管理
// 调用 Vercel API Routes 访问云数据库

const API_BASE = '/api';

let currentDate = '';
let techniciansList = [];
let schedulesData = {};
let currentTechId = null;

// 半小时时间段（从 08:00 到 22:00）
const TIME_SLOTS = [];
for (let h = 8; h <= 22; h++) {
    TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`);
    if (h < 22) TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`);
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('scheduleDate');
    if (dateInput) {
        dateInput.value = today;
        currentDate = today;
    }
    loadActiveTechnicians();
});

// API 调用封装
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

// 加载在职技师列表
async function loadActiveTechnicians() {
    const container = document.getElementById('techList');
    if (container) container.innerHTML = '<div class="loading">加载技师列表...</div>';
    
    try {
        const result = await apiCall('technicians', { action: 'listActive' });
        if (!result.success) throw new Error(result.error);
        
        techniciansList = (result.data || []).map(t => ({...t, _id: t._id || t.id, name: t.name || '未命名'}));
        
        if (techniciansList.length === 0) {
            const allResult = await apiCall('technicians', { action: 'list' });
            techniciansList = (allResult.data || []).map(t => ({...t, _id: t._id || t.id, name: t.name || '未命名'})).filter(t => t.status !== 'inactive');
        }
        
        if (techniciansList.length === 0) {
            if (container) container.innerHTML = '<div class="empty-state"><div>暂无在职技师</div></div>';
            return;
        }
        
        if (!currentTechId) currentTechId = techniciansList[0]._id;
        renderTechList();
        loadSchedule();
    } catch (error) {
        if (container) container.innerHTML = `<div class="empty-state">加载失败: ${error.message}</div>`;
    }
}

function renderTechList() {
    const container = document.getElementById('techList');
    if (!container) return;
    container.innerHTML = techniciansList.map(tech => `
        <div class="tech-item ${tech._id === currentTechId ? 'active' : ''}" onclick="selectTech('${tech._id}')">
            <div class="tech-avatar" style="background: ${getTechColor(tech._id)}20;">${tech.avatarUrl ? `<img src="${tech.avatarUrl}">` : '👤'}</div>
            <div class="tech-info"><div class="tech-name">${tech.name}</div><div class="tech-status">在职</div></div>
        </div>
    `).join('');
}

function selectTech(techId) {
    currentTechId = techId;
    renderTechList();
    loadSchedule();
}

function getTechColor(id) {
    const colors = ['#F472B6', '#60A5FA', '#A78BFA', '#34D399', '#FBBF24', '#FB923C'];
    let hash = 0;
    for (let i = 0; i < (id || '').length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
}

function onDateChange() {
    const dateInput = document.getElementById('scheduleDate');
    if (dateInput) {
        currentDate = dateInput.value;
        loadSchedule();
    }
}

async function loadSchedule() {
    if (!currentDate || !currentTechId) return;
    const container = document.getElementById('scheduleGrid');
    if (container) container.innerHTML = '<div class="loading">加载排班数据...</div>';
    
    try {
        const result = await apiCall('schedules', { action: 'list', date: currentDate, technicianId: currentTechId });
        if (!result.success) throw new Error(result.error);
        
        schedulesData = {};
        (result.data || []).forEach(s => { schedulesData[s.technicianId] = s; });
        renderScheduleGrid();
    } catch (error) {
        if (container) container.innerHTML = `<div class="empty-state">加载失败: ${error.message}</div>`;
    }
}

function renderScheduleGrid() {
    const container = document.getElementById('scheduleGrid');
    if (!container) return;
    const currentTech = techniciansList.find(t => t._id === currentTechId);
    if (!currentTech) {
        container.innerHTML = '<div class="empty-state">请先选择技师</div>';
        return;
    }
    const schedule = schedulesData[currentTechId];
    const timeSlots = schedule ? (schedule.timeSlots || []) : [];
    const slotMap = {};
    timeSlots.forEach(slot => { slotMap[slot.time] = slot; });
    const isRestDay = schedule ? schedule.isRestDay : false;
    
    let html = `
        <div class="schedule-header-bar">
            <div class="tech-info-header">
                <span class="tech-name-large">${currentTech.name}</span>
                <span class="schedule-date">${currentDate}</span>
            </div>
            <div class="quick-actions">
                <button class="btn-sm ${isRestDay ? 'active' : ''}" onclick="toggleRestDay()">${isRestDay ? '✓ 休息日' : '设为休息日'}</button>
                <button class="btn-sm" onclick="setWorkHours()">快速设置工时</button>
            </div>
        </div>`;
    
    if (isRestDay) {
        html += `<div class="rest-day-banner"><span>🌙</span><span>今日设为休息日</span></div>`;
    } else {
        html += `<div class="time-slots-container"><div class="slots-grid">` +
            TIME_SLOTS.map(time => {
                const slot = slotMap[time] || {};
                const isAvailable = slot.available !== false;
                const isBooked = slot.orderId ? true : false;
                let slotClass = 'time-slot';
                if (isBooked) slotClass += ' booked';
                else if (isAvailable) slotClass += ' available';
                const statusText = isBooked ? '已预约' : (isAvailable ? '可预约' : '关闭');
                return `<div class="${slotClass}" onclick="${isBooked ? '' : `toggleSlot('${time}')`}">
                    <span class="slot-time">${time}</span>
                    <span class="slot-status">${statusText}</span>
                    ${isBooked ? `<span class="order-badge">订单</span>` : ''}
                </div>`;
            }).join('') +
            `</div></div>
            <div class="schedule-legend">
                <div class="legend-item"><span class="legend-dot available"></span><span>可预约</span></div>
                <div class="legend-item"><span class="legend-dot closed"></span><span>关闭</span></div>
                <div class="legend-item"><span class="legend-dot booked"></span><span>已预约</span></div>
            </div>`;
    }
    container.innerHTML = html;
}

async function toggleSlot(time) {
    const currentTech = techniciansList.find(t => t._id === currentTechId);
    if (!currentTech) return;
    
    let schedule = schedulesData[currentTechId];
    let timeSlots = schedule ? (schedule.timeSlots || []) : [];
    const slotIndex = timeSlots.findIndex(s => s.time === time);
    
    if (slotIndex >= 0) {
        if (timeSlots[slotIndex].orderId) return;
        timeSlots[slotIndex].available = !timeSlots[slotIndex].available;
    } else {
        timeSlots.push({ time: time, available: false });
    }
    
    try {
        await apiCall('schedules', {
            action: 'create',
            data: { technicianId: currentTechId, technicianName: currentTech.name, date: currentDate, timeSlots: timeSlots, isRestDay: false }
        });
        loadSchedule();
    } catch (error) { alert('保存失败: ' + error.message); }
}

async function toggleRestDay() {
    const currentTech = techniciansList.find(t => t._id === currentTechId);
    if (!currentTech) return;
    let schedule = schedulesData[currentTechId];
    const isRestDay = schedule ? !schedule.isRestDay : true;
    
    try {
        await apiCall('schedules', {
            action: 'create',
            data: { technicianId: currentTechId, technicianName: currentTech.name, date: currentDate, timeSlots: [], isRestDay: isRestDay }
        });
        loadSchedule();
    } catch (error) { alert('保存失败: ' + error.message); }
}

function setWorkHours() {
    const modal = document.getElementById('workHoursModal');
    if (modal) modal.classList.add('active');
}

function closeWorkHoursModal() {
    const modal = document.getElementById('workHoursModal');
    if (modal) modal.classList.remove('active');
}

async function saveWorkHours() {
    const startTime = document.getElementById('workStart').value;
    const endTime = document.getElementById('workEnd').value;
    if (!startTime || !endTime) { alert('请选择上班时间'); return; }
    if (startTime >= endTime) { alert('上班时间必须早于下班时间'); return; }
    
    const currentTech = techniciansList.find(t => t._id === currentTechId);
    if (!currentTech) return;
    
    const timeSlots = [];
    let isInRange = false;
    for (const time of TIME_SLOTS) {
        if (time === startTime) isInRange = true;
        timeSlots.push({ time: time, available: isInRange });
        if (time === endTime) isInRange = false;
    }
    
    try {
        await apiCall('schedules', {
            action: 'create',
            data: { technicianId: currentTechId, technicianName: currentTech.name, date: currentDate, timeSlots: timeSlots, isRestDay: false, workStart: startTime, workEnd: endTime }
        });
        closeWorkHoursModal();
        loadSchedule();
    } catch (error) { alert('保存失败: ' + error.message); }
}

function logout() {
    localStorage.removeItem('adminLoggedIn');
    window.location.href = 'index.html';
}
