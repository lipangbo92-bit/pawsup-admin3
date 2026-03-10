// 调试版本 - 显示详细信息
const API_BASE = '/api';
const TIME_SLOTS = [];
for (let h = 8; h <= 22; h++) {
    TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`);
    if (h < 22) TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`);
}

async function apiCall(endpoint, data) {
    const response = await fetch(`${API_BASE}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return await response.json();
}

async function debugLoadTimes() {
    const techId = document.getElementById('debugTechId')?.value;
    const date = document.getElementById('debugDate')?.value;
    const resultDiv = document.getElementById('debugResult');
    
    if (!techId || !date) {
        resultDiv.innerHTML = '请选择美容师和日期';
        return;
    }
    
    resultDiv.innerHTML = '加载中...';
    
    try {
        const scheduleResult = await apiCall('schedules', { action: 'list', date, technicianId: techId });
        const schedule = scheduleResult.data?.[0];
        
        const orderResult = await apiCall('orders', { action: 'list', date });
        const bookedTimes = (orderResult.data || [])
            .filter(o => o.technicianId === techId)
            .map(o => o.appointmentTime);
        
        let html = '<h3>调试信息</h3>';
        html += '<p><strong>美容师ID:</strong> ' + techId + '</p>';
        html += '<p><strong>日期:</strong> ' + date + '</p>';
        html += '<p><strong>排班数据:</strong> ' + (schedule ? '有' : '无') + '</p>';
        
        if (schedule) {
            html += '<p><strong>是否休息:</strong> ' + (schedule.isRestDay ? '是' : '否') + '</p>';
            html += '<p><strong>时间段数量:</strong> ' + (schedule.timeSlots ? schedule.timeSlots.length : 0) + '</p>';
            html += '<pre style="background:#f5f5f5;padding:10px;overflow:auto;max-height:200px;">' + JSON.stringify(schedule.timeSlots, null, 2) + '</pre>';
        }
        
        html += '<p><strong>已预约时间:</strong> ' + bookedTimes.join(', ') + '</p>';
        
        let availableSlots = [];
        if (schedule && schedule.isRestDay) {
            html += '<p style="color:red;"><strong>结果:</strong> 该美容师今日休息</p>';
        } else if (schedule && schedule.timeSlots && schedule.timeSlots.length > 0) {
            availableSlots = schedule.timeSlots
                .filter(slot => slot.available !== false && !bookedTimes.includes(slot.time))
                .map(slot => slot.time);
            html += '<p><strong>可用时间:</strong> ' + availableSlots.join(', ') + '</p>';
        } else {
            availableSlots = TIME_SLOTS.filter(t => !bookedTimes.includes(t));
            html += '<p><strong>默认可用时间:</strong> ' + availableSlots.join(', ') + '</p>';
        }
        
        resultDiv.innerHTML = html;
    } catch (e) {
        resultDiv.innerHTML = '错误: ' + e.message;
    }
}

// 使函数全局可用
window.debugLoadTimes = debugLoadTimes;
