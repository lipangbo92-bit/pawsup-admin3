// Vercel API Route: /api/services
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

  const { action = 'list', data, id } = req.body || {};
  console.log(`[API Services] Action: ${action}`);

  try {
    let result;
    switch (action) {
      case 'list':
        result = await getServicesList();
        break;
      case 'add':
        result = await addService(data);
        break;
      case 'update':
        result = await updateService(id, data);
        break;
      case 'delete':
        result = await deleteService(id);
        break;
      default:
        result = { success: false, error: 'Unknown action: ' + action };
    }
    return res.json(result);
  } catch (error) {
    console.error('[API Services] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

async function getServicesList() {
  const result = await db.collection('services').get();
  return { success: true, data: result.data || [] };
}

async function addService(data) {
  const result = await db.collection('services').add({
    ...data,
    duration: data.duration || 60,  // 默认60分钟
    createTime: new Date()
  });
  return { success: true, id: result.id };
}

async function updateService(id, data) {
  await db.collection('services').doc(id).update({
    ...data,
    updateTime: new Date()
  });
  return { success: true };
}

async function deleteService(id) {
  await db.collection('services').doc(id).remove();
  return { success: true };
}
