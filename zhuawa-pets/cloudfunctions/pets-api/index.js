const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

const getCorsHeaders = () => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
})

exports.main = async (event, context) => {
  const { httpMethod, path, queryStringParameters, body } = event
  
  console.log('pets-api called:', { httpMethod, path, queryStringParameters })
  
  if (httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: getCorsHeaders(), body: '' }
  }

  try {
    const pathParts = path.split('/').filter(p => p)
    const resource = pathParts[0]
    const resourceId = pathParts[1]
    
    if (resource !== 'pets') {
      return { statusCode: 404, headers: getCorsHeaders(), body: JSON.stringify({ error: 'Not found' }) }
    }
    
    // GET /pets - List all pets (for now, get all without user filter)
    if (httpMethod === 'GET' && !resourceId) {
      // 暂时不加 userId 过滤，让所有用户都能看到宠物数据
      // 实际项目中应该根据登录用户的 openid 过滤
      const res = await db.collection('pets').orderBy('createTime', 'desc').get()
      
      console.log('Query result:', res.data)
      
      return { 
        statusCode: 200, 
        headers: getCorsHeaders(), 
        body: JSON.stringify({ success: true, data: res.data }) 
      }
    }
    
    // GET /pets/{id}
    if (httpMethod === 'GET' && resourceId) {
      const res = await db.collection('pets').doc(resourceId).get()
      return { statusCode: 200, headers: getCorsHeaders(), body: JSON.stringify({ success: true, data: res.data }) }
    }
    
    // POST /pets - Create
    if (httpMethod === 'POST' && !resourceId) {
      const petData = JSON.parse(body || '{}')
      petData.createTime = db.serverDate()
      petData.updateTime = db.serverDate()
      const res = await db.collection('pets').add({ data: petData })
      return { statusCode: 201, headers: getCorsHeaders(), body: JSON.stringify({ success: true, data: { _id: res._id, ...petData } }) }
    }
    
    // PUT /pets/{id}
    if (httpMethod === 'PUT' && resourceId) {
      const petData = JSON.parse(body || '{}')
      petData.updateTime = db.serverDate()
      await db.collection('pets').doc(resourceId).update({ data: petData })
      return { statusCode: 200, headers: getCorsHeaders(), body: JSON.stringify({ success: true, message: '更新成功' }) }
    }
    
    // DELETE /pets/{id}
    if (httpMethod === 'DELETE' && resourceId) {
      await db.collection('pets').doc(resourceId).remove()
      return { statusCode: 200, headers: getCorsHeaders(), body: JSON.stringify({ success: true, message: '删除成功' }) }
    }
    
    return { statusCode: 404, headers: getCorsHeaders(), body: JSON.stringify({ error: 'Not found' }) }
    
  } catch (err) {
    console.error('pets-api error:', err)
    return { 
      statusCode: 500, 
      headers: getCorsHeaders(), 
      body: JSON.stringify({ success: false, error: err.message || '服务器错误' }) 
    }
  }
}
