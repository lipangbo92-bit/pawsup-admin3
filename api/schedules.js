// Vercel API Route: /api/schedules
const cloudbase = require('@cloudbase/node-sdk');

const app = cloudbase.init({
  env: 'cloud1-4gy1jyan842d73ab',
  secretId: process.env.TENCENT_SECRET_ID,
  secretKey: process.env.TENCENT_SECRET_KEY
});

const db = app.database();

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  const { action = 'list', data, date, technicianId } = req.body || {};
  console.log(`[API Schedules] Action: ${action}`, { date, technicianId });

  try {
    let result;
    switch (action) {
      case 'list':
        result = await getSchedules(date, technicianId);
        break;
      case 'create':
        result = await createSchedule(data);
        break;
      default:
        result = { success: false, error: 'Unknown action: ' + action };
    }
    return res.json(result);
  } catch (error) {
    console.error('[API Schedules] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

async function getSchedules(date, technicianId) {
  let query = db.collection('schedules');
  const conditions = {};
  if (date) conditions.date = date;
  if (technicianId) conditions.technicianId = technicianId;
  if (Object.keys(conditions).length > 0) {
    query = query.where(conditions);
  }
  // 按更新时间倒序，确保获取最新记录
  query = query.orderBy('updatedAt', 'desc');
  const result = await query.get();
  // 如果有重复记录，只返回最新的一条
  const uniqueMap = new Map();
  (result.data || []).forEach(item => {
    const key = `${item.technicianId}_${item.date}`;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, item);
    }
  });
  return { success: true, data: Array.from(uniqueMap.values()) };
}

async function createSchedule(data) {
  const { technicianId, technicianName, date, timeSlots, isRestDay, workStart, workEnd } = data;
  if (!technicianId || !date) {
    return { success: false, error: 'Missing fields' };
  }

  const scheduleData = {
    technicianId, technicianName, date,
    timeSlots: timeSlots || [],
    isRestDay: isRestDay || false,
    updatedAt: new Date()
  };

  if (workStart) scheduleData.workStart = workStart;
  if (workEnd) scheduleData.workEnd = workEnd;

  try {
    const existing = await db.collection('schedules').where({ technicianId, date }).orderBy('updatedAt', 'desc').get();

    if (existing.data.length > 0) {
      // 更新第一条记录
      await db.collection('schedules').doc(existing.data[0]._id).update(scheduleData);
      // 如果有重复记录，删除其余的旧记录
      for (let i = 1; i < existing.data.length; i++) {
        try {
          await db.collection('schedules').doc(existing.data[i]._id).remove();
        } catch (e) {
          console.error('删除重复排班记录失败:', e);
        }
      }
      return { success: true, message: 'Schedule updated' };
    }
  } catch (e) {
    console.error('[createSchedule] query existing failed:', e);
  }

  const result = await db.collection('schedules').add({ ...scheduleData, createdAt: new Date() });
  return { success: true, id: result.id };
}
