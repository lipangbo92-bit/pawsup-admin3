// Vercel API Route: /api/upload - 上传图片到云存储
const cloudbase = require('@cloudbase/node-sdk');

const app = cloudbase.init({
  env: 'cloud1-4gy1jyan842d73ab',
  secretId: process.env.TENCENT_SECRET_ID,
  secretKey: process.env.TENCENT_SECRET_KEY
});

// 将 base64 转为 Buffer
function base64ToBuffer(base64) {
  // 移除 data:image/xxx;base64, 前缀
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(base64Data, 'base64');
}

// 解析 multipart/form-data
async function parseFormData(req) {
  return new Promise((resolve, reject) => {
    let data = Buffer.alloc(0);
    
    req.on('data', chunk => {
      data = Buffer.concat([data, chunk]);
    });
    
    req.on('end', () => {
      resolve(data);
    });
    
    req.on('error', reject);
  });
}

// 从 multipart 数据中提取文件
function extractFileFromMultipart(data, contentType) {
  const boundary = contentType.split('boundary=')[1];
  if (!boundary) return null;
  
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const parts = [];
  let start = 0;
  
  while ((start = data.indexOf(boundaryBuffer, start)) !== -1) {
    const end = data.indexOf(boundaryBuffer, start + boundaryBuffer.length);
    if (end === -1) break;
    
    const part = data.slice(start + boundaryBuffer.length, end);
    parts.push(part);
    start = end;
  }
  
  for (const part of parts) {
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd === -1) continue;
    
    const header = part.slice(0, headerEnd).toString();
    const content = part.slice(headerEnd + 4);
    
    // 移除末尾的 \r\n
    const fileData = content.slice(0, content.length - 2);
    
    if (header.includes('filename=')) {
      const filenameMatch = header.match(/filename="([^"]+)"/);
      const filename = filenameMatch ? filenameMatch[1] : 'unknown';
      return { filename, data: fileData };
    }
  }
  
  return null;
}

module.exports = async (req, res) => {
  // 处理 CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const contentType = req.headers['content-type'] || '';
    console.log(`[API Upload] Content-Type: ${contentType}`);
    
    // 处理 multipart/form-data 上传（文件上传）
    if (contentType.includes('multipart/form-data')) {
      const rawData = await parseFormData(req);
      const file = extractFileFromMultipart(rawData, contentType);
      
      if (!file) {
        return res.status(400).json({ success: false, error: 'No file found' });
      }
      
      const timestamp = Date.now();
      const fileName = `banners/${timestamp}_${file.filename}`;
      
      console.log('[API Upload] Uploading file:', fileName, 'Size:', file.data.length);
      
      const uploadResult = await app.uploadFile({
        cloudPath: fileName,
        fileContent: file.data
      });
      
      console.log('[API Upload] Upload result:', uploadResult);
      
      const fileID = uploadResult.fileID;
      let fileUrl = fileID;
      
      try {
        const urlResult = await app.getTempFileURL({
          fileList: [fileID]
        });
        
        if (urlResult.fileList && urlResult.fileList[0] && urlResult.fileList[0].tempFileURL) {
          fileUrl = urlResult.fileList[0].tempFileURL;
        }
      } catch (urlErr) {
        console.error('[API Upload] Get temp URL error:', urlErr);
      }
      
      return res.json({
        success: true,
        data: {
          fileID: fileID,
          url: fileUrl
        }
      });
    }
    
    // 处理 JSON 请求（base64 上传）
    const { action, data, path } = req.body || {};
    console.log(`[API Upload] Action: ${action}`);

    if (action === 'uploadImage') {
      const buffer = base64ToBuffer(data);
      
      const timestamp = Date.now();
      const fileName = path || `avatars/${timestamp}.jpg`;
      
      console.log('[API Upload] Uploading to:', fileName);
      
      const uploadResult = await app.uploadFile({
        cloudPath: fileName,
        fileContent: buffer
      });
      
      console.log('[API Upload] Upload result:', uploadResult);
      
      const fileID = uploadResult.fileID;
      let fileUrl = fileID;
      
      try {
        const urlResult = await app.getTempFileURL({
          fileList: [fileID]
        });
        
        if (urlResult.fileList && urlResult.fileList[0] && urlResult.fileList[0].tempFileURL) {
          fileUrl = urlResult.fileList[0].tempFileURL;
        }
      } catch (urlErr) {
        console.error('[API Upload] Get temp URL error:', urlErr);
      }
      
      return res.json({
        success: true,
        fileID: fileID,
        url: fileUrl
      });
    }
    
    return res.status(400).json({ success: false, error: 'Unknown action or content type' });
  } catch (error) {
    console.error('[API Upload] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
