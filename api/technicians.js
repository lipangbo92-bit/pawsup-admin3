// Vercel API Route: /api/technicians
// 直接使用云开发 Node.js SDK 访问数据库

const cloudbase = require('@cloudbase/node-sdk');

// 初始化云开发
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
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 获取技师列表
async function getTechniciansList() {
  const result = await db.collection('technicians').get();
  return {
    success: true,
    data: result.data
  };
}

// 获取在职技师列表
async function getActiveTechnicians() {
  const result = await db.collection('technicians').where({ status: 'active' }).get();
  return {
    success: true,
    data: result.data
  };
}

// 添加技师
async function addTechnician(data) {
  const result = await db.collection('technicians').add({
    ...data,
    status: data.status || 'active',
    createTime: new Date()
  });
  return {
    success: true,
    id: result.id
  };
}

// 更新技师
async function updateTechnician(id, data) {
  await db.collection('technicians').doc(id).update({
    ...data,
    updateTime: new Date()
  });
  return {
    success: true
  };
}

// 切换技师状态（在职/离职）
async function toggleTechnicianStatus(id, status) {
  await db.collection('technicians').doc(id).update({
    status: status,
    updateTime: new Date()
  });
  return {
    success: true
  };
}

// 删除技师
async function deleteTechnician(id) {
  await db.collection('technicians').doc(id).remove();
  return {
    success: true
  };
}
