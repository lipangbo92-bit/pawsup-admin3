// Appointment Management Module - 卡片式预约管理
const API_BASE = '/api';

let currentDate = '';
let techniciansList = [];
let servicesList = [];
let ordersData = [];
let schedulesData = {};
let selectedTechId = 'all';

const TIME_SLOTS = [];
for (let h = 8; h <= 22; h++) {
    TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`);
    if (h < 22) TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`);
}

document.addEventListener('DOMContentLoaded', function() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('summaryDate').value = today;
    document.getElementById('appointmentDate').value = today;
    currentDate = today;
    loadData();
    loadServicesForSelect();
    loadTechniciansForSelect();
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

async function loadData() {
    if (!currentDate) return;
    
    try {
        const [techResult, orderResult, scheduleResult] = await Promise.all([
            apiCall('technicians', { action: 'list' }),
            apiCall('orders', { action: 'list', date: currentDate }),
            apiCall('schedules', { action: 'list', date: currentDate })
        ]);
        
        techniciansList = (techResult.data || []).map(t => ({...t, _id: t._id || t.id, name: t.name || '未命名'}));
        ordersData = orderResult.data || [];
        schedulesData = {};
        (scheduleResult.data || []).forEach(s => { schedulesData[s.technicianId] = s; });
        
        renderTechFilter();
        renderTimeSlots();
        updateStats();
    } catch (error) {
        console.error('Load data error:', error);
        document.getElementById('timeSlotsContainer').innerHTML = `<div class="empty-state">加载失败: ${error.message}</div>`;
    }
}

function onSummaryDateChange() {
    currentDate = document.getElementById('summaryDate').value;
    loadData();
}

function renderTechFilter() {
    const container = document.getElementById('techFilter');
    if (!container) return;
    
    let html = `<button class="tech-filter-btn ${selectedTechId === 'all' ? 'active' : ''}" onclick="selectTechFilter('all')">全部美容师</button>`;
    html += techniciansList.map(tech => 
        `<button class="tech-filter-btn ${selectedTechId === tech._id ? 'active' : ''}" onclick="selectTechFilter('${tech._id}')">${tech.name}</button>`
    ).join('');
    container.innerHTML = html;
}

function selectTechFilter(techId) {
    selectedTechId = techId;
    renderTechFilter();
    renderTimeSlots();
}

function updateStats() {
    const totalOrders = ordersData.length;
    const availableSlots = TIME_SLOTS.filter(time => {
        if (selectedTechId === 'all') {
            return techniciansList.some(tech => isTimeAvailable(tech._id, time));
        }
        return isTimeAvailable(selectedTechId, time);
    }).length;
    
    document.getElementById('statTotalOrders').textContent = totalOrders;
    document.getElementById('statAvailable').textContent = availableSlots;
}

// 检查某个时间段是否被已有预约占用（考虑预约时长）
function isTimeBooked(techId, time) {
    const orderStartingHere = ordersData.find(o => 
        o.technicianId === techId && o.appointmentTime === time
    );
    if (orderStartingHere) return true;
    
    const coveringOrder = ordersData.find(o => {
        if (o.technicianId !== techId) return false;
        const orderStart = o.appointmentTime;
        const orderDuration = o.serviceDuration || 60;
        const orderStartMinutes = parseInt(orderStart.split(':')[0]) * 60 + parseInt(orderStart.split(':')[1]);
        const timeMinutes = parseInt(time.split(':')[0]) * 60 + parseInt(time.split(':')[1]);
        const orderEndMinutes = orderStartMinutes + orderDuration;
        return timeMinutes > orderStartMinutes && timeMinutes < orderEndMinutes;
    });
    
    return coveringOrder ? true : false;
}

function isTimeAvailable(techId, time) {
    const schedule = schedulesData[techId];
    if (schedule?.isRestDay) return false;
    
    if (isTimeBooked(techId, time)) return false;
    
    if (schedule?.timeSlots?.length > 0) {
        const slot = schedule.timeSlots.find(s => s.time === time);
        return slot ? slot.available !== false : false;
    }
    // 没有排班数据的技师，默认不可预约
    return false;
}

function renderTimeSlots() {
    const container = document.getElementById('timeSlotsContainer');
    if (!container) return;
    
    let html = '';
    
    for (const time of TIME_SLOTS) {
        let slotClass = 'time-slot-card';
        let statusClass = '';
        let statusText = '';
        let appointmentInfo = '';
        
        if (selectedTechId === 'all') {
            const availableTechs = techniciansList.filter(tech => isTimeAvailable(tech._id, time));
            const bookedOrders = ordersData.filter(o => {
                const orderDuration = o.serviceDuration || 60;
                const orderStartMinutes = parseInt(o.appointmentTime.split(':')[0]) * 60 + parseInt(o.appointmentTime.split(':')[1]);
                const timeMinutes = parseInt(time.split(':')[0]) * 60 + parseInt(time.split(':')[1]);
                const orderEndMinutes = orderStartMinutes + orderDuration;
                return timeMinutes >= orderStartMinutes && timeMinutes < orderEndMinutes;
            });
            
            if (bookedOrders.length > 0) {
                slotClass += ' booked';
                statusClass = 'booked';
                statusText = `已预约 ${bookedOrders.length} 人`;
                appointmentInfo = bookedOrders.map(o => `
                    <div class="slot-appointment-info">
                        <div class="customer">${o.customerName}</div>
                        <div class="service">${o.serviceName}</div>
                        <div class="tech">👤 ${o.technicianName || '未分配'}</div>
                    </div>
                `).join('');
            } else if (availableTechs.length > 0) {
                slotClass += ' available';
                statusClass = 'available';
                statusText = `可预约 (${availableTechs.length}位美容师)`;
            } else {
                slotClass += ' rest';
                statusClass = 'booked';
                statusText = '暂无可用美容师';
            }
        } else {
            const coveringOrder = ordersData.find(o => {
                if (o.technicianId !== selectedTechId) return false;
                const orderDuration = o.serviceDuration || 60;
                const orderStartMinutes = parseInt(o.appointmentTime.split(':')[0]) * 60 + parseInt(o.appointmentTime.split(':')[1]);
                const timeMinutes = parseInt(time.split(':')[0]) * 60 + parseInt(time.split(':')[1]);
                const orderEndMinutes = orderStartMinutes + orderDuration;
                return timeMinutes >= orderStartMinutes && timeMinutes < orderEndMinutes;
            });
            
            const isAvailable = isTimeAvailable(selectedTechId, time);
            
            if (coveringOrder) {
                slotClass += ' booked';
                statusClass = 'booked';
                statusText = '已预约';
                appointmentInfo = `
                    <div class="slot-appointment-info">
                        <div class="customer">${coveringOrder.customerName}</div>
                        <div class="service">${coveringOrder.serviceName}</div>
                        <div class="tech">📞 ${coveringOrder.customerPhone || ''}</div>
                    </div>
                `;
            } else if (isAvailable) {
                slotClass += ' available';
                statusClass = 'available';
                statusText = '可预约';
            } else {
                slotClass += ' rest';
                statusClass = 'booked';
                statusText = '未开放';
            }
        }
        
        html += `
            <div class="${slotClass}">
                <div class="slot-time">${time}</div>
                <span class="slot-status ${statusClass}">${statusText}</span>
                ${appointmentInfo}
            </div>
        `;
    }
    
    container.innerHTML = html || '<div class="empty-state">暂无数据</div>';
}

let selectedServiceDuration = 60;

async function loadServicesForSelect() {
    try {
        const result = await apiCall('services', { action: 'list' });
        if (!result.success) return;
        servicesList = result.data || [];
        const select = document.getElementById('serviceId');
        if (!select) return;
        select.innerHTML = '<option value="">请选择服务</option>' +
            servicesList.map(s => `<option value="${s._id || s.id}" data-duration="${s.duration || 60}">${s.name} - ¥${s.price} (${s.duration || 60}分钟)</option>`).join('');
    } catch (e) { console.error('Load services error:', e); }
}

async function loadTechniciansForSelect() {
    try {
        const result = await apiCall('technicians', { action: 'list' });
        if (!result.success) return;
        techniciansList = (result.data || []).map(t => ({...t, _id: t._id || t.id, name: t.name || '未命名'}));
        const select = document.getElementById('techId');
        if (!select) return;
        const activeTechs = techniciansList.filter(t => t.status !== 'inactive');
        select.innerHTML = '<option value="">请选择美容师</option>' +
            activeTechs.map(t => `<option value="${t._id}">${t.name}</option>`).join('');
    } catch (e) { console.error('Load technicians error:', e); }
}

function onServiceChange() {
    const serviceId = document.getElementById('serviceId')?.value;
    const service = servicesList.find(s => (s._id || s.id) === serviceId);
    if (service) {
        selectedServiceDuration = service.duration || 60;
        document.getElementById('serviceDurationHint').textContent = `服务时长: ${selectedServiceDuration}分钟`;
    }
    onTechChange();
}

function onTechChange() { loadAvailableTimes(); }
function onDateChange() { loadAvailableTimes(); }

async function loadAvailableTimes() {
    const techId = document.getElementById('techId')?.value;
    const date = document.getElementById('appointmentDate')?.value;
    const timeSelect = document.getElementById('appointmentTime');
    
    if (!techId || !date || !timeSelect) return;
    
    timeSelect.innerHTML = '<option value="">加载中...</option>';
    
    try {
        const scheduleResult = await apiCall('schedules', { action: 'list', date, technicianId: techId });
        const schedule = scheduleResult.data?.[0];
        const orderResult = await apiCall('orders', { action: 'list', date });
        
        const bookedSlots = new Set();
        (orderResult.data || []).forEach(o => {
            if (o.technicianId !== techId) return;
            const orderStart = o.appointmentTime;
            const orderDuration = o.serviceDuration || 60;
            const orderStartMinutes = parseInt(orderStart.split(':')[0]) * 60 + parseInt(orderStart.split(':')[1]);
            const orderEndMinutes = orderStartMinutes + orderDuration;
            
            TIME_SLOTS.forEach(slot => {
                const slotMinutes = parseInt(slot.split(':')[0]) * 60 + parseInt(slot.split(':')[1]);
                if (slotMinutes >= orderStartMinutes && slotMinutes < orderEndMinutes) {
                    bookedSlots.add(slot);
                }
            });
        });
        
        const slotsNeeded = Math.ceil(selectedServiceDuration / 30);
        let availableSlots = [];
        
        if (schedule?.isRestDay) {
            timeSelect.innerHTML = '<option value="">该美容师今日休息</option>';
            return;
        }
        
        for (let i = 0; i < TIME_SLOTS.length; i++) {
            const startTime = TIME_SLOTS[i];
            const endIndex = i + slotsNeeded;
            
            if (endIndex > TIME_SLOTS.length) break;
            
            const neededSlots = TIME_SLOTS.slice(i, endIndex);
            let allAvailable = true;
            
            for (const time of neededSlots) {
                if (bookedSlots.has(time)) {
                    allAvailable = false;
                    break;
                }
                if (schedule?.timeSlots?.length > 0) {
                    const slot = schedule.timeSlots.find(s => s.time === time);
                    if (slot && slot.available === false) {
                        allAvailable = false;
                        break;
                    }
                }
            }
            
            if (allAvailable) {
                const startHour = parseInt(startTime.split(':')[0]);
                const startMin = parseInt(startTime.split(':')[1]);
                const totalMinutes = startHour * 60 + startMin + selectedServiceDuration;
                const endHour = Math.floor(totalMinutes / 60);
                const endMin = totalMinutes % 60;
                const finalEndTime = `${String(endHour).padStart(2,'0')}:${String(endMin).padStart(2,'0')}`;
                availableSlots.push({ value: startTime, label: `${startTime} - ${finalEndTime}` });
            }
        }
        
        if (availableSlots.length === 0) {
            timeSelect.innerHTML = '<option value="">该美容师今日无可用时间</option>';
        } else {
            timeSelect.innerHTML = '<option value="">请选择时间</option>' +
                availableSlots.map(s => `<option value="${s.value}">${s.label}</option>`).join('');
            document.getElementById('durationHint').textContent = `将占用 ${selectedServiceDuration} 分钟`;
        }
    } catch (e) {
        console.error('Load available times error:', e);
        timeSelect.innerHTML = '<option value="">加载失败</option>';
    }
}

function openNewAppointmentModal() {
    const modal = document.getElementById('newAppointmentModal');
    if (modal) {
        document.getElementById('appointmentForm')?.reset();
        document.getElementById('appointmentDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('appointmentTime').innerHTML = '<option value="">请先选择美容师和日期</option>';
        document.getElementById('serviceDurationHint').textContent = '';
        document.getElementById('durationHint').textContent = '';
        modal.style.display = 'flex';
    }
}

function closeNewAppointmentModal() {
    const modal = document.getElementById('newAppointmentModal');
    if (modal) modal.style.display = 'none';
}

async function saveAppointment() {
    const customerName = document.getElementById('customerName')?.value?.trim();
    const customerPhone = document.getElementById('customerPhone')?.value?.trim();
    const petType = document.getElementById('petType')?.value;
    const petName = document.getElementById('petName')?.value?.trim();
    const serviceId = document.getElementById('serviceId')?.value;
    const technicianId = document.getElementById('techId')?.value;
    const appointmentDate = document.getElementById('appointmentDate')?.value;
    const appointmentTime = document.getElementById('appointmentTime')?.value;
    const remark = document.getElementById('remark')?.value?.trim();
    
    if (!customerName) { alert('请输入客户姓名'); return; }
    if (!customerPhone) { alert('请输入联系电话'); return; }
    if (!petType) { alert('请选择宠物类型'); return; }
    if (!serviceId) { alert('请选择服务'); return; }
    if (!technicianId) { alert('请选择美容师'); return; }
    if (!appointmentDate) { alert('请选择预约日期'); return; }
    if (!appointmentTime) { alert('请选择预约时间'); return; }
    
    const service = servicesList.find(s => (s._id || s.id) === serviceId);
    const technician = techniciansList.find(t => t._id === technicianId);
    
    try {
        const orderData = {
            customerName, customerPhone,
            petInfo: { type: petType, name: petName },
            serviceId, serviceName: service?.name || '',
            serviceDuration: service?.duration || 60,
            technicianId, technicianName: technician?.name || '',
            appointmentDate, appointmentTime,
            status: 'confirmed', remark, source: 'manual',
            price: service?.price || 0
        };
        
        const result = await apiCall('orders', { action: 'create', data: orderData });
        
        if (result.success) {
            alert('预约成功！');
            closeNewAppointmentModal();
            loadData();
        } else {
            alert('预约失败：' + result.error);
        }
    } catch (error) {
        alert('预约失败：' + error.message);
    }
}

function logout() {
    localStorage.removeItem('adminLoggedIn');
    window.location.href = 'index.html';
}
