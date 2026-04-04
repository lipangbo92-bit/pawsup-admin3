// Vercel Serverless Function - 用户管理 API
const cloudbase = require('@cloudbase/node-sdk');

const app = cloudbase.init({
  env: 'cloud1-4gy1jyan842d73ab',
  secretId: process.env.TENCENT_SECRET_ID,
  secretKey: process.env.TENCENT_SECRET_KEY
});

const db = app.database();

module.exports = async (req, res) => {
  // 设置 CORS 头 - 允许 admin.pawsup.cn 访问
  const allowedOrigins = ['https://admin.pawsup.cn', 'http://localhost:3000', 'http://127.0.0.1:5500'];
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin) || !origin) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  
  const { action, ...data } = req.body;

  // 添加调试日志
  console.log('[Users API] Request:', { action, data, body: req.body });

  try {
    switch (action) {
      case 'ping':
        return res.status(200).json({ success: true, message: 'Users API is working', env: process.env.NODE_ENV });
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

// 搜索用户（通过手机号/昵称/openid）
async function searchUsers(req, res, data) {
  const { phone, keyword } = data;
  const searchTerm = phone || keyword;
  
  if (!searchTerm) {
    return res.status(400).json({ success: false, error: '请输入搜索关键词' });
  }
  
  // 支持模糊搜索 - 按数据字典标准字段名
  let users = [];
  
  // 1. 先搜索 phone 字段（数据字典标准字段）
  const result1 = await db.collection('users')
    .where({
      phone: db.RegExp({
        regexp: searchTerm,
        options: 'i'
      })
    })
    .limit(20)
    .get();
  users = result1.data;
  
  // 2. 如果没找到，尝试搜索 openid
  if (users.length === 0) {
    const result2 = await db.collection('users')
      .where({
        openid: searchTerm
      })
      .limit(20)
      .get();
    users = result2.data;
  }
  
  // 3. 最后尝试搜索昵称
  if (users.length === 0) {
    const result3 = await db.collection('users')
      .where({
        nickName: db.RegExp({
          regexp: searchTerm,
          options: 'i'
        })
      })
      .limit(20)
      .get();
    users = result3.data;
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
