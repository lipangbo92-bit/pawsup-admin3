// Vercel API Route: /api/banners
const cloudbase = require('@cloudbase/node-sdk');

// 全局缓存 cloudbase 实例，避免重复初始化
let app = null;
let db = null;

function getApp() {
  if (!app) {
    console.log('[Banners API] Initializing cloudbase...');
    app = cloudbase.init({
      env: 'cloud1-4gy1jyan842d73ab',
      secretId: process.env.TENCENT_SECRET_ID,
      secretKey: process.env.TENCENT_SECRET_KEY
    });
    db = app.database();
    console.log('[Banners API] Cloudbase initialized');
  }
  return { app, db };
}

module.exports = async (req, res) => {
  // CORS处理
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log(`[Banners API] ${req.method} request received`);

  try {
    // 获取初始化好的实例
    const { db } = getApp();

    switch (req.method) {
      case 'GET':
        // 获取所有banner
        console.log('[Banners API] Fetching banners...');
        const listResult = await db.collection('banners')
          .orderBy('sort', 'asc')
          .get();
        console.log(`[Banners API] Fetched ${listResult.data.length} banners`);
        res.status(200).json({ success: true, data: listResult.data });
        break;
        
      case 'POST':
        // 创建新banner
        const { title, subtitle, image, sort, status } = req.body;
        const addResult = await db.collection('banners').add({
          data: {
            title: title || '',
            subtitle: subtitle || '',
            image: image || '',
            sort: parseInt(sort) || 0,
            status: status || 'active',
            createTime: new Date()
          }
        });
        res.status(200).json({ success: true, id: addResult.id });
        break;
        
      case 'PUT':
        // 更新banner
        const { id, ...updateData } = req.body;
        if (!id) {
          return res.status(400).json({ success: false, error: 'ID is required' });
        }
        await db.collection('banners').doc(id).update({
          data: {
            ...updateData,
            updateTime: new Date()
          }
        });
        res.status(200).json({ success: true });
        break;
        
      case 'DELETE':
        // 删除banner
        const deleteId = req.query.id;
        if (!deleteId) {
          return res.status(400).json({ success: false, error: 'ID is required' });
        }
        await db.collection('banners').doc(deleteId).remove();
        res.status(200).json({ success: true });
        break;
        
      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Banner API Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
