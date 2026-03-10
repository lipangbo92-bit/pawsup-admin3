// Schedule Management Module
// 排班管理 - 设置美容师可预约时间

const API_BASE = '/api';

let currentDate = '';
let techniciansList = [];
let schedulesData = {};

// 默认时间段
const DEFAULT_TIME_SLOTS = [
  '09:00', '10:00', '11:00', '12:00',
  '14:00', '15:00', '16:00', '17:00', '18:00'
];

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    // 设置默认日期为今天
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('scheduleDate').value = today;
    currentDate = today;
    
    loadSchedule();
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

// 加载排班数据
async function loadSchedule() {
    currentDate = document.getElementById('scheduleDate').value;
    if (!currentDate) return;
    
    const container = document.getElementById('scheduleGrid');
    container.innerHTML = '<div class="loading">加载中...</div>';
    
    try {
        // 1. 加载美容师列表
        const techResult = await apiCall('technicians', { action: 'list' });
        if (!techResult.success) throw new Error(techResult.error);
        
        techniciansList = (techResult.data || []).map(t => ({
            ...t,
            _id: t._id || t.id,
            name: t.name || '未命名'
        }));
        
        // 2. 加载排班数据
        const scheduleResult = await apiCall('schedules', { 
            action: 'list', 
            date: currentDate 
        });
        
        if (!scheduleResult.success) throw new Error(scheduleResult.error);
        
        // 整理排班数据
        schedulesData = {};
        (scheduleResult.data || []).forEach(s => {
            schedulesData[s.technicianId] = s;
        });
        
        // 3. 渲染排班界面
        renderScheduleGrid();
    } catch (error) {
        console.error('Load schedule error:', error);
        container.innerHTML = `
            <div class="empty-state">
                <div style="font-size:48px; margin-bottom:16px;">⚠️</div>
                <div>加载失败: ${error.message}</div>
                <button onclick="loadSchedule()" style="margin-top:16px; padding:8px 16px; background:#4CAF50; color:white; border:none; border-radius:4px; cursor:pointer;">重试</button>
            </div>
        `;
    }
}

// 渲染排班网格
function renderScheduleGrid() {
    const container = document.getElementById('scheduleGrid');
    
    if (techniciansList.length === 0) {
        container.innerHTML = '<div class="empty-state">暂无美容师，请先添加美容师</div>';
        return;
    }
    
    container.innerHTML = techniciansList.map(tech => {
        const schedule = schedulesData[tech._id];
        const timeSlots = schedule ? schedule.timeSlots : [];
        
        return `
            <div class="tech-schedule-card" data-tech-id="${tech._id}">
                <div class="tech-header">
                    <div class="tech-info">
                        <div class="tech-avatar">👤</div>
                        <div class="tech-name">${tech.name}</div>
                    </div>
                    <button class="btn-sm" onclick="toggleAllSlots('${tech._id}')">全选/取消</button>
                </div>
                <div class="time-slots">
                    ${DEFAULT_TIME_SLOTS.map(time => {
                        const slot = timeSlots.find(s => s.time === time);
                        const isAvailable = slot ? slot.available : false;
                        const isBooked = slot ? !slot.available && slot.orderId : false;
                        
                        let slotClass = 'time-slot';
                        if (isBooked) slotClass += ' booked';
                        else if (isAvailable) slotClass += ' available';
                        
                        const statusText = isBooked ? '已预约' : (isAvailable ? '可预约' : '未开放');
                        const onclick = isBooked ? '' : `onclick="toggleSlot('${tech._id}', '${time}')"`;
                        
                        return `
                            <div class="${slotClass}" ${onclick} data-time="${time}">
                                <div class="slot-time">${time}</div>
                                <div class="slot-status">${statusText}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }).join('');
}

// 切换时间段状态unction toggleSlot(techId, time) {
    const card = document.querySelector(`[data-tech-id="${techId}"]`);
    const slot = card.querySelector(`[data-time="${time}"]`);
    
    if (slot.classList.contains('booked')) return; // 已预约的不能切换
    
    // 切换状态
    if (slot.classList.contains('available')) {
        slot.classList.remove('available');
        slot.querySelector('.slot-status').textContent = '未开放';
    } else {
        slot.classList.add('available');
        slot.querySelector('.slot-status').textContent = '可预约';
    }
}

// 全选/取消全选
function toggleAllSlots(techId) {
    const card = document.querySelector(`[data-tech-id="${techId}"]`);
    const slots = card.querySelectorAll('.time-slot:not(.booked)');
    
    // 检查是否全部已开放
    const allAvailable = Array.from(slots).every(slot => slot.classList.contains('available'));
    
    slots.forEach(slot => {
        if (allAvailable) {
            // 全部取消
            slot.classList.remove('available');
            slot.querySelector('.slot-status').textContent = '未开放';
        } else {
            // 全部开放
            slot.classList.add('available');
            slot.querySelector('.slot-status').textContent = '可预约';
        }
    });
}

// 保存所有排班
async function saveAllSchedules() {
    if (!currentDate) {
        alert('请先选择日期');
        return;
    }
    
    const btn = document.querySelector('.btn-save');
    btn.textContent = '保存中...';
    btn.disabled = true;
    
    try {
        const cards = document.querySelectorAll('.tech-schedule-card');
        
        for (const card of cards) {
            const techId = card.dataset.techId;
            const techName = card.querySelector('.tech-name').textContent;
            
            // 收集时间段数据
            const timeSlots = [];
            const slotElements = card.querySelectorAll('.time-slot');
            
            slotElements.forEach(slot => {
                const time = slot.dataset.time;
                const isAvailable = slot.classList.contains('available');
                const isBooked = slot.classList.contains('booked');
                
                timeSlots.push({
                    time,
                    available: isAvailable || isBooked,
                    orderId: isBooked ? schedulesData[techId]?.timeSlots?.find(s => s.time === time)?.orderId : null
                });
            });
            
            // 保存到云端
            await apiCall('schedules', {
                action: 'create',
                data: {
                    technicianId: techId,
                    technicianName: techName,
                    date: currentDate,
                    timeSlots
                }
            });
        }
        
        alert('排班保存成功！');
        loadSchedule(); // 重新加载
    } catch (error) {
        console.error('Save schedule error:', error);
        alert('保存失败：' + error.message);
    } finally {
        btn.textContent = '保存排班';
        btn.disabled = false;
    }
}

// Logout function
function logout() {
    localStorage.removeItem('adminLoggedIn');
    window.location.href = 'index.html';
}
