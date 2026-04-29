// Vercel API Route: /api/upload - 上传图片到云存储
const cloudbase = require('@cloudbase/node-sdk');

// 全局缓存 cloudbase 实例，避免重复初始化
let app = null;

function getApp() {
  if (!app) {
    console.log('[Upload API] Initializing cloudbase...');
    app = cloudbase.init({
      env: 'cloud1-4gy1jyan842d73ab',
      secretId: process.env.TENCENT_SECRET_ID,
      secretKey: process.env.TENCENT_SECRET_KEY
    });
    console.log('[Upload API] Cloudbase initialized');
  }
  return app;
}

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
    // 获取初始化好的实例
    const app = getApp();
    
    if (action === 'uploadImage') {
      // 上传图片到云存储
      console.log('[Upload API] Converting base64 to buffer...');
      const buffer = base64ToBuffer(data);
      
      // 生成文件名
      const timestamp = Date.now();
      const fileName = path || `avatars/${timestamp}.jpg`;
      
      console.log('[Upload API] Uploading to:', fileName, 'Size:', buffer.length, 'bytes');
      
      // 上传到云存储
      const uploadResult = await app.uploadFile({
        cloudPath: fileName,
        fileContent: buffer
      });
      
      console.log('[Upload API] Upload success, fileID:', uploadResult.fileID);
      
      
      // 获取临时访问链接（HTTPS URL）
      // fileID 格式: cloud://env-id.bucket/avatars/xxx.jpg
      const fileID = uploadResult.fileID;
      
      // 获取 HTTPS URL
      let fileUrl = fileID;
      try {
        console.log('[Upload API] Getting temp URL...');
        const urlResult = await app.getTempFileURL({
          fileList: [fileID]
        });
        
        if (urlResult.fileList && urlResult.fileList[0] && urlResult.fileList[0].tempFileURL) {
          fileUrl = urlResult.fileList[0].tempFileURL;
          console.log('[Upload API] Got temp URL:', fileUrl);
        }
      } catch (urlErr) {
        console.error('[Upload API] Get temp URL error:', urlErr.message);
        // 如果获取临时链接失败，使用 fileID，小程序可以直接用 cloud:// 协议
        fileUrl = fileID;
      }
      
      console.log('[Upload API] Success, returning URL');
      
      return res.json({
        success: true,
        fileID: fileID,
        url: fileUrl
      });
    }
    
    return res.status(400).json({ success: false, error: 'Unknown action' });
  } catch (error) {
    console.error('[Upload API] Error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};
