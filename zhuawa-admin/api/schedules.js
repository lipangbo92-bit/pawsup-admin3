// Vercel API Route: /api/schedules
const cloudbase = require('@cloudbase/node-sdk');

const app = cloudbase.init({
  env: 'cloud1-4gy1jyan842d73ab',
  secretId: process.env.TENCENT_SECRET_ID,
  secretKey: process.env.TENCENT_SECRET_KEY
});

const db = app.database();

// 确保集合存在
async function ensureCollection() {
  try {
    // 尝试获取集合信息，如果不存在会报错
    await db.collection('schedules').where({}).limit(1).get();
  } catch (e) {
    if (e.message && e.message.includes('not exist')) {
      console.log('[API] Collection schedules does not exist, creating...');
      // 创建集合并添加一个空文档
      try {
        await db.createCollection('schedules');
        console.log('[API] Collection schedules created');
      } catch (createErr) {
        console.error('[API] Failed to create collection:', createErr);
      }
    }
  }
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  const { action = 'list', data, date, technicianId } = req.body || {};
  console.log(`[API Schedules] Action: ${action}`);

  try {
    // 确保集合存在
    await ensureCollection();
    
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
  if (date) query = query.where({ date });
  if (technicianId) query = query.where({ technicianId });
  const result = await query.get();
  return { success: true, data: result.data || [] };
}

async function createSchedule(data) {
  const { technicianId, technicianName, date, timeSlots, isRestDay, workStart, workEnd } = data;
  if (!technicianId || !date) {
    return { success: false, error: 'Missing fields' };
  }

  const existing = await db.collection('schedules').where({ technicianId, date }).get();
  const scheduleData = {
    technicianId, technicianName, date,
    timeSlots: timeSlots || [],
    isRestDay: isRestDay || false,
    updatedAt: new Date()
  };

  if (workStart) scheduleData.workStart = workStart;
  if (workEnd) scheduleData.workEnd = workEnd;

  if (existing.data.length > 0) {
    await db.collection('schedules').doc(existing.data[0]._id).update(scheduleData);
    return { success: true, message: 'Schedule updated' };
  }

  const result = await db.collection('schedules').add({ ...scheduleData, createdAt: new Date() });
  return { success: true, id: result.id };
}
