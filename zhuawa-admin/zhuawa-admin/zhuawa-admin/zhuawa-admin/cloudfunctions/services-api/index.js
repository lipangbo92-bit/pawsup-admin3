// cloudfunctions/services-api/index.js
// Services API - HTTP triggered cloud function
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

// CORS headers
const getCorsHeaders = () => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
})

exports.main = async (event, context) => {
  const { httpMethod, path, queryStringParameters, body, headers } = event
  
  // Handle preflight
  if (httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: getCorsHeaders(),
      body: ''
    }
  }

  try {
    // Parse path to get resource and ID
    // path format: /services or /services/{id}
    const pathParts = path.split('/').filter(p => p)
    const resource = pathParts[0]
    const resourceId = pathParts[1]
    
    // Only handle services
    if (resource !== 'services') {
      return {
        statusCode: 404,
        headers: getCorsHeaders(),
        body: JSON.stringify({ error: 'Not found' })
      }
    }
    
    // GET /services - List all services
    if (httpMethod === 'GET' && !resourceId) {
      const { page = 1, pageSize = 100, orderBy = 'createdAt', order = 'desc' } = queryStringParameters || {}
      
      let query = db.collection('services')
      
      // Apply ordering
      if (order === 'desc') {
        query = query.orderBy(orderBy, 'desc')
      } else {
        query = query.orderBy(orderBy, 'asc')
      }
      
      const skip = (parseInt(page) - 1) * parseInt(pageSize)
      const res = await query.skip(skip).limit(parseInt(pageSize)).get()
      
      return {
        statusCode: 200,
        headers: getCorsHeaders(),
        body: JSON.stringify({
          success: true,
          data: res.data,
          total: res.data.length
        })
      }
    }
    
    // GET /services/{id} - Get single service
    if (httpMethod === 'GET' && resourceId) {
      const res = await db.collection('services').doc(resourceId).get()
      
      return {
        statusCode: 200,
        headers: getCorsHeaders(),
        body: JSON.stringify({
          success: true,
          data: res.data
        })
      }
    }
    
    // POST /services - Create service
    if (httpMethod === 'POST' && !resourceId) {
      const serviceData = JSON.parse(body || '{}')
      
      // Validation
      if (!serviceData.name) {
        return {
          statusCode: 400,
          headers: getCorsHeaders(),
          body: JSON.stringify({ error: '服务名称不能为空' })
        }
      }
      
      serviceData.createdAt = db.serverDate()
      serviceData.updatedAt = db.serverDate()
      
      const res = await db.collection('services').add({
        data: serviceData
      })
      
      return {
        statusCode: 201,
        headers: getCorsHeaders(),
        body: JSON.stringify({
          success: true,
          data: { _id: res._id, ...serviceData }
        })
      }
    }
    
    // PUT /services/{id} - Update service
    if (httpMethod === 'PUT' && resourceId) {
      const serviceData = JSON.parse(body || '{}')
      
      if (!serviceData.name) {
        return {
          statusCode: 400,
          headers: getCorsHeaders(),
          body: JSON.stringify({ error: '服务名称不能为空' })
        }
      }
      
      serviceData.updatedAt = db.serverDate()
      
      await db.collection('services').doc(resourceId).update({
        data: serviceData
      })
      
      return {
        statusCode: 200,
        headers: getCorsHeaders(),
        body: JSON.stringify({
          success: true,
          message: '更新成功'
        })
      }
    }
    
    // DELETE /services/{id} - Delete service
    if (httpMethod === 'DELETE' && resourceId) {
      await db.collection('services').doc(resourceId).remove()
      
      return {
        statusCode: 200,
        headers: getCorsHeaders(),
        body: JSON.stringify({
          success: true,
          message: '删除成功'
        })
      }
    }
    
    return {
      statusCode: 404,
      headers: getCorsHeaders(),
      body: JSON.stringify({ error: 'Not found' })
    }
    
  } catch (err) {
    console.error('Services API error:', err)
    return {
      statusCode: 500,
      headers: getCorsHeaders(),
      body: JSON.stringify({
        success: false,
        error: err.message || '服务器错误'
      })
    }
  }
}
