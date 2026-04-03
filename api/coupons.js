// Vercel Serverless Function - 代理云函数调用
// 使用微信云开发的 HTTP 访问方式

const https = require('https');
const crypto = require('crypto');

// 云开发配置
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
  
  const { action, ...data } = req.body;
  
  if (!action) {
    res.status(400).json({ success: false, error: 'Missing action' });
    return;
  }
  
  try {
    // 调用微信云函数
    const result = await callCloudFunction(action, data);
    res.status(200).json(result);
  } catch (error) {
    console.error('Cloud function call failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    });
  }
};

// 调用微信云函数
async function callCloudFunction(action, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      action: action,
      ...data
    });
    
    // 微信云函数 HTTP 触发器 URL 格式
    const options = {
      hostname: `${CLOUD_ENV}.service.tcloudbase.com`,
      path: '/coupons-api',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 10000
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
          console.error('Parse response error:', responseData);
          resolve({ 
            success: false, 
            error: 'Invalid response from cloud function',
            debug: responseData.substring(0, 500)
          });
        }
      });
    });
    
    request.on('error', (error) => {
      console.error('Request error:', error);
      reject(error);
    });
    
    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
    
    request.write(postData);
    request.end();
  });
}
