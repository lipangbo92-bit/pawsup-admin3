// Schedule Management Module - 排班管理
const API_BASE = '/api';
let currentDate = '';
let techniciansList = [];
let schedulesData = {};
let currentTechId = null;

const TIME_SLOTS = [];
for (let h = 8; h <= 22; h++) {
    TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`);
    if (h < 22) TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`);
}

document.addEventListener('DOMContentLoaded', function() {
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('scheduleDate');
    if (dateInput) {
        dateInput.value = today;
        currentDate = today;
    }
    loadTechnicians();
});

async function apiCall(endpoint, data) {
    try {
        const response = await fetch(`${API_BASE}/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (e) {
        console.error('API Error:', e);
        throw e;
    }
}

async function loadTechnicians() {
    const container = document.getElementById('techList');
    if (container) container.innerHTML = '<div class="loading">加载美容师列表...</div>';
    
    try {
        let result = await apiCall('technicians', { action: 'listActive' });
        let techs = result.data || [];
        
        if (techs.length === 0) {
            result = await apiCall('technicians', { action: 'list' });
            techs = result.data || [];
        }
        
        techniciansList = techs.map(t => ({...t, _id: t._id || t.id, name: t.name || '未命名'}));
        
        if (techniciansList.length === 0) {
            if (container) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div style="font-size:32px; margin-bottom:8px;">👥</div>
                        <div>暂无美容师</div>
                        <div style="font-size:12px; color:#999; margin-top:8px;">
                            请先在<a href="groomers" style="color:var(--primary);">美容师管理</a>中添加
                        </div>
                    </div>
                `;
            }
            document.getElementById('scheduleGrid').innerHTML = '<div class="empty-state">请先添加美容师</div>';
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
    
    const html = techniciansList.map(tech => {
        const isActive = tech.status !== 'inactive';
        return `
        <div class="tech-item ${tech._id === currentTechId ? 'active' : ''}" 
             onclick="selectTech('${tech._id}')"
             style="${!isActive ? 'opacity:0.6;' : ''}">
            <div class="tech-avatar" style="background: ${getTechColor(tech._id)}20; position:relative;">
                ${tech.avatarUrl ? `<img src="${tech.avatarUrl}">` : '👤'}
                ${!isActive ? '<span style="position:absolute;bottom:0;right:0;background:#999;color:white;font-size:10px;padding:1px 4px;border-radius:4px;">离</span>' : ''}
            </div>
            <div class="tech-info">
                <div class="tech-name">${tech.name}</div>
                <div class="tech-status">${isActive ? '在职' : '已离职'}</div>
            </div>
        </div>
    `}).join('');
    
    container.innerHTML = html;
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
        container.innerHTML = '<div class="empty-state">请先选择美容师</div>';
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
                <button class="btn-sm" onclick="setWorkHours()">快速设置 10:00-21:00</button>
            </div>
        </div>`;
    
    if (isRestDay) {
        html += `<div class="rest-day-banner"><span>🌙</span><span>今日设为休息日</span></div>`;
    } else {
        html += `<div class="time-slots-container"><div class="slots-grid">` +
            TIME_SLOTS.map(time => {
                const slot = slotMap[time];
                // 修改：未设置的时间段默认为可预约（available: true）
                const isAvailable = slot ? slot.available !== false : true;
                const isBooked = slot && slot.orderId ? true : false;
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
        // 新时间段，默认为关闭（因为当前显示的是可预约，点击后应该关闭）
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

// 快速设置工时为 10:00-21:00
async function setWorkHours() {
    const startTime = '10:00';
    const endTime = '21:00';
    
    const currentTech = techniciansList.find(t => t._id === currentTechId);
    if (!currentTech) return;
    
    const timeSlots = [];
    let isInRange = false;
    for (const time of TIME_SLOTS) {
        if (time === startTime) isInRange = true;
        // 遇到 endTime 时先关闭范围，再判断该时段
        if (time === endTime) isInRange = false;
        timeSlots.push({ time: time, available: isInRange });
    }
    
    try {
        await apiCall('schedules', {
            action: 'create',
            data: { technicianId: currentTechId, technicianName: currentTech.name, date: currentDate, timeSlots: timeSlots, isRestDay: false, workStart: startTime, workEnd: endTime }
        });
        loadSchedule();
        alert('已设置 10:00-21:00 为工作时间');
    } catch (error) { alert('保存失败: ' + error.message); }
}

function logout() {
    localStorage.removeItem('adminLoggedIn');
    window.location.href = 'index.html';
}
