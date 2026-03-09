// Vercel API Route: /api/technicians
const cloudbase = require('@cloudbase/node-sdk');

// 检查环境变量
if (!process.env.TENCENT_SECRET_ID || !process.env.TENCENT_SECRET_KEY) {
  console.error('[API] Missing environment variables: TENCENT_SECRET_ID or TENCENT_SECRET_KEY');
}

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
  // CORS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (!db) {
    return res.status(500).json({ success: false, error: 'Database not initialized' });
  }

  const { action = 'list', data, id, status } = req.body || {};
  console.log(`[API Technicians] Action: ${action}`);

  try {
    let result;
    switch (action) {
      case 'list':
        result = await getTechniciansList();
        break;
      case 'listActive':
        result = await getActiveTechnicians();
        break;
      case 'add':
        result = await addTechnician(data);
        break;
      case 'update':
        result = await updateTechnician(id, data);
        break;
      case 'toggleStatus':
        result = await toggleTechnicianStatus(id, status);
        break;
      case 'delete':
        result = await deleteTechnician(id);
        break;
      default:
        result = { success: false, error: 'Unknown action: ' + action };
    }
    return res.json(result);
  } catch (error) {
    console.error('[API Technicians] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

async function getTechniciansList() {
  const result = await db.collection('technicians').get();
  return { success: true, data: result.data || [] };
}

async function getActiveTechnicians() {
  const result = await db.collection('technicians').where({ status: 'active' }).get();
  return { success: true, data: result.data || [] };
}

async function addTechnician(data) {
  const result = await db.collection('technicians').add({
    ...data,
    status: data.status || 'active',
    createTime: new Date()
  });
  return { success: true, id: result.id };
}

async function updateTechnician(id, data) {
  await db.collection('technicians').doc(id).update({ ...data, updateTime: new Date() });
  return { success: true };
}

async function toggleTechnicianStatus(id, status) {
  await db.collection('technicians').doc(id).update({ status, updateTime: new Date() });
  return { success: true };
}

async function deleteTechnician(id) {
  await db.collection('technicians').doc(id).remove();
  return { success: true };
}
