// Vercel API Route: /api/upload - 上传图片到云存储
const cloudbase = require('@cloudbase/node-sdk');
const app = cloudbase.init({
  env: 'cloud1-4gy1jyan842d73ab',
  secretId: process.env.TENCENT_SECRET_ID,
  secretKey: process.env.TENCENT_SECRET_KEY
});

const db = app.database();

// 将 base64 转为 Buffer
function base64ToBuffer(base64) {
  // 移除 data:image/xxx;base64, 前缀
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(base64Data, 'base64');
}

module.exports = async (req, res) => {
  // 处理 CORS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  const { action, data, path } = req.body || {};
  console.log(`[API Upload] Action: ${action}`);

  try {
    if (action === 'uploadImage') {
      // 上传图片到云存储
      const buffer = base64ToBuffer(data);
      
      // 生成文件名
      const fileName = path || `images/${Date.now()}.jpg`;
      
      // 上传到云存储
      const result = await app.uploadFile({
        cloudPath: fileName,
        fileContent: buffer
      });
      
      console.log('[API Upload] Success:', result.fileID);
      
      return res.json({
        success: true,
        fileID: result.fileID,
        url: result.fileID  // 云存储文件ID可以直接作为URL使用
      });
    }
    
    return res.status(400).json({ success: false, error: 'Unknown action' });
  } catch (error) {
    console.error('[API Upload] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
