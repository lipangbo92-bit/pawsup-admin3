// Vercel Serverless Function - 代理云函数调用
// 解决 CORS 跨域问题

const https = require('https');

// 云函数配置
const CLOUD_ENV = 'cloud1-4gy1jyan842d73ab';

module.exports = async (req, res) => {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // 处理预检请求
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  
  // 获取目标云函数名称
  const { functionName, data } = req.body;
  
  if (!functionName) {
    res.status(400).json({ error: 'Missing functionName' });
    return;
  }
  
  try {
    // 调用微信云函数 HTTP 接口
    // 注意：这里需要云函数开启 HTTP 访问并配置鉴权
    const result = await callCloudFunction(functionName, data);
    res.status(200).json(result);
  } catch (error) {
    console.error('Cloud function call failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    });
  }
};

// 调用云函数
async function callCloudFunction(functionName, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data || {});
    
    const options = {
      hostname: `${CLOUD_ENV}.service.tcloudbase.com`,
      path: `/${functionName}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const request = https.request(options, (response) => {
      let responseData = '';
      
      response.on('data', (chunk) => {
        responseData += chunk;
      });
      
      response.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve(parsedData);
        } catch (e) {
          resolve({ success: false, error: 'Invalid response', raw: responseData });
        }
      });
    });
    
    request.on('error', (error) => {
      reject(error);
    });
    
    request.write(postData);
    request.end();
  });
}
