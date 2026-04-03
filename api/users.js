// Vercel Serverless Function - 用户管理 API
const cloudbase = require('@cloudbase/node-sdk');

const app = cloudbase.init({
  env: 'cloud1-4gy1jyan842d73ab',
  secretId: process.env.TENCENT_SECRET_ID,
  secretKey: process.env.TENCENT_SECRET_KEY
});

const db = app.database();

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  
  const { action, ...data } = req.body;
  
  try {
    switch (action) {
      case 'searchUsers':
        return await searchUsers(req, res, data);
      case 'getUserDetail':
        return await getUserDetail(req, res, data);
      default:
        res.status(400).json({ success: false, error: 'Unknown action: ' + action });
    }
  } catch (error) {
    console.error('[API Error]', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// 搜索用户（通过手机号）
async function searchUsers(req, res, data) {
  const { phone } = data;
  
  if (!phone) {
    return res.status(400).json({ success: false, error: '请输入手机号' });
  }
  
  // 支持模糊搜索
  const result = await db.collection('users')
    .where({
      phoneNumber: db.RegExp({
        regexp: phone,
        options: 'i'
      })
    })
    .limit(20)
    .get();
  
  // 如果没有找到，尝试精确匹配
  let users = result.data;
  
  if (users.length === 0) {
    // 尝试搜索其他字段
    const result2 = await db.collection('users')
      .where({
        _openid: phone  // 有时候用户直接给openid
      })
      .limit(20)
      .get();
    users = result2.data;
  }
  
  res.status(200).json({ success: true, data: users });
}

// 获取用户详情
async function getUserDetail(req, res, data) {
  const { userId } = data;
  
  if (!userId) {
    return res.status(400).json({ success: false, error: 'Missing userId' });
  }
  
  const result = await db.collection('users').doc(userId).get();
  
  if (!result.data) {
    return res.status(404).json({ success: false, error: '用户不存在' });
  }
  
  res.status(200).json({ success: true, data: result.data });
}
