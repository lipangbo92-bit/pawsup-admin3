// cloudfunctions/upload-avatar/index.js
// Upload avatar to cloud storage
const cloud = require('wx-server-sdk')
cloud.init({ env: 'cloud1-4gy1jyan842d73ab' })

const db = cloud.database()

// CORS headers
const getCorsHeaders = () => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
})

exports.main = async (event, context) => {
  const { httpMethod, body, headers } = event
  
  // Handle preflight
  if (httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: getCorsHeaders(),
      body: ''
    }
  }

  try {
    if (httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers: getCorsHeaders(),
        body: JSON.stringify({ error: 'Method not allowed' })
      }
    }
    
    const { data, fileName } = JSON.parse(body || '{}')
    
    if (!data) {
      return {
        statusCode: 400,
        headers: getCorsHeaders(),
        body: JSON.stringify({ error: '图片数据不能为空' })
      }
    }
    
    // Convert base64 to buffer
    const base64Data = data.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')
    
    // Generate unique file path
    const cloudPath = `avatars/${Date.now()}_${fileName || 'avatar.jpg'}`
    
    // Upload to cloud storage
    const uploadResult = await cloud.uploadFile({
      cloudPath: cloudPath,
      fileContent: buffer
    })
    
    // Get temporary URL
    const fileRes = await cloud.getTempFileURL({
      fileList: [uploadResult.fileID]
    })
    
    const url = fileRes.fileList[0].tempFileURL
    
    return {
      statusCode: 200,
      headers: getCorsHeaders(),
      body: JSON.stringify({
        success: true,
        fileID: uploadResult.fileID,
        url: url
      })
    }
    
  } catch (err) {
    console.error('Upload avatar error:', err)
    return {
      statusCode: 500,
      headers: getCorsHeaders(),
      body: JSON.stringify({
        success: false,
        error: err.message || '上传失败'
      })
    }
  }
}
