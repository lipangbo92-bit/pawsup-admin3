// Vercel API Route: /api/schedules
// 排班管理 API - 管理技师可预约时间

const cloudbase = require('@cloudbase/node-sdk');

const app = cloudbase.init({
  env: 'cloud1-4gy1jyan842d73ab',
  secretId: process.env.TENCENT_SECRET_ID,
  secretKey: process.env.TENCENT_SECRET_KEY
});

const db = app.database();

module.exports = async (req, res) => {
  // 处理 CORS 预检
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  const { action = 'list', data, id, date, technicianId } = req.body || {};
  
  console.log(`[API Schedules] Action: ${action}`);

  try {
    let result;
    
    switch (action) {
      case 'list':
        result = await getSchedules(date, technicianId);
        break;
      case 'getByDate':
        result = await getSchedulesByDate(date);
        break;
      case 'getAvailableSlots':
        result = await getAvailableSlots(date, technicianId);
        break;
      case 'create':
        result = await createSchedule(data);
        break;
      case 'update':
        result = await updateSchedule(id, data);
        break;
      case 'bookSlot':
        result = await bookTimeSlot(date, technicianId, data.time, data.orderId);
        break;
      case 'cancelSlot':
        result = await cancelTimeSlot(date, technicianId, data.time);
        break;
      case 'delete':
        result = await deleteSchedule(id);
        break;
      default:
        result = { success: false, error: 'Unknown action: ' + action };
    }

    return res.json(result);
  } catch (error) {
    console.error('[API Schedules] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 获取排班列表
async function getSchedules(date, technicianId) {
  let query = db.collection('schedules');
  
  if (date) {
    query = query.where({ date });
  }
  if (technicianId) {
    query = query.where({ technicianId });
  }
  
  const result = await query.get();
  return {
    success: true,
    data: result.data
  };
}

// 获取某天的所有排班
async function getSchedulesByDate(date) {
  if (!date) {
    return { success: false, error: 'Date is required' };
  }
  
  const result = await db.collection('schedules').where({ date }).get();
  return {
    success: true,
    data: result.data
  };
}

// 获取可预约时间段（用于顾客端）
async function getAvailableSlots(date, technicianId) {
  if (!date) {
    return { success: false, error: 'Date is required' };
  }
  
  let query = db.collection('schedules').where({ date });
  if (technicianId) {
    query = query.where({ technicianId });
  }
  
  const result = await query.get();
  
  // 整理可预约时间段
  const availableSlots = [];
  result.data.forEach(schedule => {
    const availableTimes = (schedule.timeSlots || [])
      .filter(slot => slot.available)
      .map(slot => ({
        time: slot.time,
        technicianId: schedule.technicianId,
        technicianName: schedule.technicianName
      }));
    availableSlots.push(...availableTimes);
  });
  
  // 按时间排序
  availableSlots.sort((a, b) => a.time.localeCompare(b.time));
  
  return {
    success: true,
    date,
    data: availableSlots
  };
}

// 创建排班
async function createSchedule(data) {
  const { technicianId, technicianName, date, timeSlots, isRestDay, workStart, workEnd } = data;

  if (!technicianId || !date) {
    return { success: false, error: 'Missing required fields' };
  }

  // 检查是否已存在该日期该技师的排班
  const existing = await db.collection('schedules')
    .where({ technicianId, date })
    .get();

  const scheduleData = {
    timeSlots: timeSlots || [],
    isRestDay: isRestDay || false,
    updatedAt: new Date()
  };

  if (workStart) scheduleData.workStart = workStart;
  if (workEnd) scheduleData.workEnd = workEnd;

  if (existing.data.length > 0) {
    // 更新现有排班
    const id = existing.data[0]._id;
    await db.collection('schedules').doc(id).update(scheduleData);
    return {
      success: true,
      message: 'Schedule updated',
      id
    };
  }

  // 创建新排班
  const result = await db.collection('schedules').add({
    technicianId,
    technicianName,
    date,
    ...scheduleData,
    createdAt: new Date()
  });

  return {
    success: true,
    id: result.id
  };
}

// 更新排班
async function updateSchedule(id, data) {
  await db.collection('schedules').doc(id).update({
    ...data,
    updatedAt: new Date()
  });
  return {
    success: true
  };
}

// 预约时间段（锁定）
async function bookTimeSlot(date, technicianId, time, orderId) {
  const schedule = await db.collection('schedules')
    .where({ date, technicianId })
    .get();
  
  if (schedule.data.length === 0) {
    return { success: false, error: 'Schedule not found' };
  }
  
  const scheduleId = schedule.data[0]._id;
  const timeSlots = schedule.data[0].timeSlots || [];
  
  // 找到对应时间段
  const slotIndex = timeSlots.findIndex(slot => slot.time === time);
  if (slotIndex === -1) {
    return { success: false, error: 'Time slot not found' };
  }
  
  if (!timeSlots[slotIndex].available) {
    return { success: false, error: 'Time slot already booked' };
  }
  
  // 更新为已预约
  timeSlots[slotIndex].available = false;
  timeSlots[slotIndex].orderId = orderId;
  
  await db.collection('schedules').doc(scheduleId).update({
    timeSlots,
    updatedAt: new Date()
  });
  
  return {
    success: true,
    message: 'Time slot booked'
  };
}

// 取消时间段预约
async function cancelTimeSlot(date, technicianId, time) {
  const schedule = await db.collection('schedules')
    .where({ date, technicianId })
    .get();
  
  if (schedule.data.length === 0) {
    return { success: false, error: 'Schedule not found' };
  }
  
  const scheduleId = schedule.data[0]._id;
  const timeSlots = schedule.data[0].timeSlots || [];
  
  const slotIndex = timeSlots.findIndex(slot => slot.time === time);
  if (slotIndex === -1) {
    return { success: false, error: 'Time slot not found' };
  }
  
  // 恢复为可预约
  timeSlots[slotIndex].available = true;
  timeSlots[slotIndex].orderId = null;
  
  await db.collection('schedules').doc(scheduleId).update({
    timeSlots,
    updatedAt: new Date()
  });
  
  return {
    success: true,
    message: 'Time slot cancelled'
  };
}

// 删除排班
async function deleteSchedule(id) {
  await db.collection('schedules').doc(id).remove();
  return {
    success: true
  };
}
