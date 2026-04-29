// cloudfunctions/technicians-api/index.js
// Technicians API - HTTP triggered cloud function
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
    const pathParts = path.split('/').filter(p => p)
    const resource = pathParts[0]
    const resourceId = pathParts[1]
    
    // Only handle technicians
    if (resource !== 'technicians') {
      return {
        statusCode: 404,
        headers: getCorsHeaders(),
        body: JSON.stringify({ error: 'Not found' })
      }
    }
    
    // GET /technicians - List all technicians
    if (httpMethod === 'GET' && !resourceId) {
      const { page = 1, pageSize = 100, orderBy = 'createdAt', order = 'desc' } = queryStringParameters || {}
      
      let query = db.collection('technicians')
      
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
    
    // GET /technicians/{id} - Get single technician
    if (httpMethod === 'GET' && resourceId) {
      const res = await db.collection('technicians').doc(resourceId).get()
      
      return {
        statusCode: 200,
        headers: getCorsHeaders(),
        body: JSON.stringify({
          success: true,
          data: res.data
        })
      }
    }
    
    // POST /technicians - Create technician
    if (httpMethod === 'POST' && !resourceId) {
      const techData = JSON.parse(body || '{}')
      
      // Validation
      if (!techData.name) {
        return {
          statusCode: 400,
          headers: getCorsHeaders(),
          body: JSON.stringify({ error: '技师姓名不能为空' })
        }
      }
      
      techData.createdAt = db.serverDate()
      techData.updatedAt = db.serverDate()
      
      const res = await db.collection('technicians').add({
        data: techData
      })
      
      return {
        statusCode: 201,
        headers: getCorsHeaders(),
        body: JSON.stringify({
          success: true,
          data: { _id: res._id, ...techData }
        })
      }
    }
    
    // PUT /technicians/{id} - Update technician
    if (httpMethod === 'PUT' && resourceId) {
      const techData = JSON.parse(body || '{}')
      
      if (!techData.name) {
        return {
          statusCode: 400,
          headers: getCorsHeaders(),
          body: JSON.stringify({ error: '技师姓名不能为空' })
        }
      }
      
      techData.updatedAt = db.serverDate()
      
      await db.collection('technicians').doc(resourceId).update({
        data: techData
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
    
    // DELETE /technicians/{id} - Delete technician
    if (httpMethod === 'DELETE' && resourceId) {
      await db.collection('technicians').doc(resourceId).remove()
      
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
    console.error('Technicians API error:', err)
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
