// cloudfunctions/orders-api/index.js
// Orders API - HTTP triggered cloud function
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
    
    // Only handle orders
    if (resource !== 'orders') {
      return {
        statusCode: 404,
        headers: getCorsHeaders(),
        body: JSON.stringify({ error: 'Not found' })
      }
    }
    
    // GET /orders - List all orders
    if (httpMethod === 'GET' && !resourceId) {
      const { 
        page = 1, 
        pageSize = 100, 
        orderBy = 'createdAt', 
        order = 'desc',
        status,
        appointmentDate 
      } = queryStringParameters || {}
      
      let query = db.collection('orders')
      
      // Apply filters
      if (status) {
        query = query.where({ status })
      }
      
      if (appointmentDate) {
        query = query.where({ appointmentDate })
      }
      
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
    
    // GET /orders/{id} - Get single order
    if (httpMethod === 'GET' && resourceId) {
      const res = await db.collection('orders').doc(resourceId).get()
      
      return {
        statusCode: 200,
        headers: getCorsHeaders(),
        body: JSON.stringify({
          success: true,
          data: res.data
        })
      }
    }
    
    // POST /orders - Create order
    if (httpMethod === 'POST' && !resourceId) {
      try {
        console.log('Creating order, body:', body)
        const orderData = JSON.parse(body || '{}')
        
        // Validate required fields
        if (!orderData.serviceId || !orderData.technicianId || !orderData.appointmentDate || !orderData.appointmentTime) {
          return {
            statusCode: 400,
            headers: getCorsHeaders(),
            body: JSON.stringify({
              success: false,
              error: 'Missing required fields'
            })
          }
        }
        
        // Generate order number if not provided
        if (!orderData.orderNo) {
          orderData.orderNo = `ORD${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`
        }
        
        orderData.createdAt = db.serverDate()
        orderData.updatedAt = db.serverDate()
        
        console.log('Adding order to database:', orderData)
        const res = await db.collection('orders').add({
          data: orderData
        })
        
        console.log('Order created:', res._id)
        return {
          statusCode: 201,
          headers: getCorsHeaders(),
          body: JSON.stringify({
            success: true,
            data: { _id: res._id, ...orderData }
          })
        }
      } catch (err) {
        console.error('Create order error:', err)
        return {
          statusCode: 500,
          headers: getCorsHeaders(),
          body: JSON.stringify({
            success: false,
            error: err.message || '创建订单失败'
          })
        }
      }
    }
    
    // PUT /orders/{id} - Update order
    if (httpMethod === 'PUT' && resourceId) {
      const orderData = JSON.parse(body || '{}')
      
      orderData.updatedAt = db.serverDate()
      
      await db.collection('orders').doc(resourceId).update({
        data: orderData
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
    
    // DELETE /orders/{id} - Delete order
    if (httpMethod === 'DELETE' && resourceId) {
      await db.collection('orders').doc(resourceId).remove()
      
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
    console.error('Orders API error:', err)
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
