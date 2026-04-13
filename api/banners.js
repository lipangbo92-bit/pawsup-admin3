// Vercel API Route: /api/banners
const cloudbase = require('@cloudbase/node-sdk');

const app = cloudbase.init({
  env: 'cloud1-4gy1jyan842d73ab',
  secretId: process.env.TENCENT_SECRET_ID,
  secretKey: process.env.TENCENT_SECRET_KEY
});

const db = app.database();

module.exports = async (req, res) => {
  // CORS处理
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    switch (req.method) {
      case 'GET':
        // 获取所有banner
        const listResult = await db.collection('banners')
          .orderBy('sort', 'asc')
          .get();
        res.status(200).json({ success: true, data: listResult.data });
        break;
        
      case 'POST':
        // 创建新banner
        const { title, subtitle, image, imageUrl, sort, status } = req.body;
        const imageValue = imageUrl || image || ''; // 优先使用 imageUrl
        const addResult = await db.collection('banners').add({
          data: {
            title: title || '',
            subtitle: subtitle || '',
            image: imageValue,
            imageUrl: imageValue,
            sort: parseInt(sort) || 0,
            status: status || 'active',
            createTime: new Date()
          }
        });
        res.status(200).json({ success: true, id: addResult.id });
        break;
        
      case 'PUT':
        // 更新banner
        const { id, image: putImage, imageUrl: putImageUrl, ...otherData } = req.body;
        if (!id) {
          return res.status(400).json({ success: false, error: 'ID is required' });
        }
        // 处理图片字段，确保 image 和 imageUrl 一致
        const putImageValue = putImageUrl || putImage || '';
        const updateData = {
          ...otherData,
          ...(putImageValue && { image: putImageValue, imageUrl: putImageValue }),
          updateTime: new Date()
        };
        await db.collection('banners').doc(id).update({
          data: updateData
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
