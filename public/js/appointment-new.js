// Appointment Management Module - 预约管理
const API_BASE = '/api';
let currentDate = '';
let techniciansList = [];
let servicesList = [];
let ordersData = [];
let schedulesData = {};
const TIME_SLOTS = [];
for (let h = 8; h <= 22; h++) {
    TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`);
    if (h < 22) TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`);
}

document.addEventListener('DOMContentLoaded', function() {
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('summaryDate');
    if (dateInput) {
        dateInput.value = today;
        currentDate = today;
    }
    const apptDate = document.getElementById('appointmentDate');
    if (apptDate) apptDate.value = today;
    loadSummary();
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

function onSummaryDateChange() {
    const dateInput = document.getElementById('summaryDate');
    if (dateInput) {
        currentDate = dateInput.value;
        loadSummary();
    }
}

async function loadSummary() {
    if (!currentDate) return;
    const tableBody = document.getElementById('tableBody');
    if (tableBody) tableBody.innerHTML = '<tr><td colspan="30" class="loading">加载数据...</td></tr>';
    try {
        const techResult = await apiCall('technicians', { action: 'list' });
        if (!techResult.success) throw new Error(techResult.error);
        techniciansList = (techResult.data || []).map(t => ({...t, _id: t._id || t.id, name: t.name || '未命名'}));
        const orderResult = await apiCall('orders', { action: 'list', date: currentDate });
        if (!orderResult.success) throw new Error(orderResult.error);
        ordersData = orderResult.data || [];
        const scheduleResult = await apiCall('schedules', { action: 'list', date: currentDate });
        schedulesData = {};
        (scheduleResult.data || []).forEach(s => { schedulesData[s.technicianId] = s; });
        updateStats();
        renderSummaryTable();
    } catch (error) {
        console.error('Load summary error:', error);
        if (tableBody) tableBody.innerHTML = `<tr><td colspan="30" class="empty-state">加载失败: ${error.message}</td></tr>`;
    }
}

function updateStats() {
    document.getElementById('statTotalTechs').textContent = techniciansList.length;
    document.getElementById('statTotalOrders').textContent = ordersData.length;
    document.getElementById('statCompleted').textContent = ordersData.filter(o => o.status === 'completed').length;
}

function renderSummaryTable() {
    const tableHead = document.getElementById('tableHead');
    const tableBody = document.getElementById('tableBody');
    if (!tableHead || !tableBody) return;
    let headHtml = `<tr><th class="tech-col">技师</th><th class="status-cell">状态</th>${TIME_SLOTS.map(t => `<th class="time-col">${t}</th>`).join('')}<th>订单数</th></tr>`;
    tableHead.innerHTML = headHtml;
    const ordersByTech = {};
    techniciansList.forEach(tech => { ordersByTech[tech._id] = []; });
    ordersData.forEach(order => {
        if (order.technicianId && ordersByTech[order.technicianId]) ordersByTech[order.technicianId].push(order);
    });
    let bodyHtml = techniciansList.map(tech => {
        const schedule = schedulesData[tech._id];
        const isRestDay = schedule ? schedule.isRestDay : false;
        const techOrders = ordersByTech[tech._id] || [];
        const slotStatus = {};
        TIME_SLOTS.forEach(t => slotStatus[t] = { type: 'empty' });
        if (schedule && !isRestDay && schedule.timeSlots) {
            schedule.timeSlots.forEach(slot => {
                if (slotStatus[slot.time]) slotStatus[slot.time] = { type: slot.available !== false ? 'available' : 'closed' };
            });
        }
        techOrders.forEach(order => {
            if (order.appointmentTime && slotStatus[order.appointmentTime]) slotStatus[order.appointmentTime] = { type: 'booked', order: order };
        });
        let rowHtml = `<tr class="${tech.status === 'inactive' ? 'inactive' : ''}"><td class="tech-cell"><div class="tech-info-row"><div class="tech-avatar-sm">${tech.avatarUrl ? `<img src="${tech.avatarUrl}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` : '👤'}</div><div><div class="tech-name">${tech.name}</div><span class="tech-status-badge ${tech.status === 'inactive' ? 'inactive' : 'active'}">${tech.status === 'inactive' ? '离职' : '在职'}</span></div></div></td><td class="status-cell">${isRestDay ? '<span class="rest-badge">🌙 休息</span>' : '<span class="work-badge">💼 上班</span>'}</td>`;
        if (isRestDay) {
            rowHtml += `<td colspan="${TIME_SLOTS.length}" class="rest-row">今日休息</td>`;
        } else {
            TIME_SLOTS.forEach(time => {
                const slot = slotStatus[time];
                let cellClass = 'slot-cell';
                let content = '';
                let title = '';
                if (slot.type === 'booked') { cellClass += ' booked'; content = '●'; title = `${slot.order.customerName || '客户'} - ${slot.order.serviceName || '服务'}`; }
                else if (slot.type === 'available') { cellClass += ' available'; content = '○'; title = '可预约'; }
                else if (slot.type === 'closed') { cellClass += ' closed'; title = '未开放'; }
                rowHtml += `<td class="${cellClass}" title="${title}">${content}</td>`;
            });
        }
        rowHtml += `<td><span class="order-count">${techOrders.length}</span></td></tr>`;
        return rowHtml;
    }).join('');
    tableBody.innerHTML = bodyHtml;
}

async function loadServicesForSelect() {
    try {
        const result = await apiCall('services', { action: 'list' });
        if (!result.success) return;
        servicesList = result.data || [];
        const select = document.getElementById('serviceId');
        if (!select) return;
        select.innerHTML = '<option value="">请选择服务</option>' + servicesList.map(s => `<option value="${s._id || s.id}" data-price="${s.price}">${s.name} - ¥${s.price}</option>`).join('');
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
        select.innerHTML = '<option value="">请选择技师</option>' + activeTechs.map(t => `<option value="${t._id}">${t.name}</option>`).join('');
    } catch (e) { console.error('Load technicians error:', e); }
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
        console.log('[DEBUG] Schedule:', schedule);
        const orderResult = await apiCall('orders', { action: 'list', date });
        const bookedTimes = (orderResult.data || []).filter(o => o.technicianId === techId).map(o => o.appointmentTime);
        console.log('[DEBUG] Booked times:', bookedTimes);
        let availableSlots = [];
        if (schedule && schedule.isRestDay) {
            timeSelect.innerHTML = '<option value="">该技师今日休息</option>';
            return;
        }
        if (schedule && schedule.timeSlots && schedule.timeSlots.length > 0) {
            availableSlots = schedule.timeSlots.filter(slot => slot.available !== false && !bookedTimes.includes(slot.time)).map(slot => slot.time);
            console.log('[DEBUG] Available from schedule:', availableSlots);
        } else {
            availableSlots = TIME_SLOTS.filter(t => !bookedTimes.includes(t));
            console.log('[DEBUG] Available default:', availableSlots);
        }
        if (availableSlots.length === 0) {
            timeSelect.innerHTML = '<option value="">该技师今日无可用时间</option>';
        } else {
            timeSelect.innerHTML = '<option value="">请选择时间</option>' + availableSlots.map(t => `<option value="${t}">${t}</option>`).join('');
        }
    } catch (e) {
        console.error('Load available times error:', e);
        timeSelect.innerHTML = '<option value="">加载失败</option>';
    }
}

function openNewAppointmentModal() {
    const modal = document.getElementById('newAppointmentModal');
    if (modal) {
        const form = document.getElementById('appointmentForm');
        if (form) form.reset();
        const today = new Date().toISOString().split('T')[0];
        const apptDate = document.getElementById('appointmentDate');
        if (apptDate) apptDate.value = today;
        const timeSelect = document.getElementById('appointmentTime');
        if (timeSelect) timeSelect.innerHTML = '<option value="">请先选择技师和日期</option>';
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
    if (!technicianId) { alert('请选择技师'); return; }
    if (!appointmentDate) { alert('请选择预约日期'); return; }
    if (!appointmentTime) { alert('请选择预约时间'); return; }
    const service = servicesList.find(s => (s._id || s.id) === serviceId);
    const technician = techniciansList.find(t => t._id === technicianId);
    try {
        const orderData = {
            customerName, customerPhone, petInfo: { type: petType, name: petName },
            serviceId, serviceName: service?.name || '', technicianId, technicianName: technician?.name || '',
            appointmentDate, appointmentTime, status: 'confirmed', remark, source: 'manual', price: service?.price || 0
        };
        const result = await apiCall('orders', { action: 'create', data: orderData });
        if (result.success) {
            alert('预约成功！');
            closeNewAppointmentModal();
            loadSummary();
        } else { alert('预约失败：' + result.error); }
    } catch (error) { alert('预约失败：' + error.message); }
}

function logout() {
    localStorage.removeItem('adminLoggedIn');
    window.location.href = 'index.html';
}
