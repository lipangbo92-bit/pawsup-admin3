// Vercel API Route: /api/schedules
const cloudbase = require('@cloudbase/node-sdk');

let db;
try {
  const app = cloudbase.init({
    env: 'cloud1-4gy1jyan842d73ab',
    secretId: process.env.TENCENT_SECRET_ID,
    secretKey: process.env.TENCENT_SECRET_KEY
  });
  db = app.database();
} catch (e) {
  console.error('[API] Cloudbase init error:', e);
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (!db) {
    return res.status(500).json({ success: false, error: 'Database not initialized' });
  }

  const { action = 'list', data, date, technicianId } = req.body || {};
  console.log(`[API Schedules] Action: ${action}`);

  try {
    let result;
    switch (action) {
      case 'list':
        result = await getSchedules(date, technicianId);
        break;
      case 'create':
        result = await createSchedule(data);
        break;
      case 'update':
        result = await updateSchedule(data.id, data);
        break;
      case 'delete':
        result = await deleteSchedule(data.id);
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
    return { success: false, error: 'Missing required fields' };
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
  
  const result = await db.collection('schedules').add({
    ...scheduleData,
    createdAt: new Date()
  });
  return { success: true, id: result.id };
}

async function updateSchedule(id, data) {
  await db.collection('schedules').doc(id).update({ ...data, updatedAt: new Date() });
  return { success: true };
}

async function deleteSchedule(id) {
  await db.collection('schedules').doc(id).remove();
  return { success: true };
}
