// cloudfunctions/create-order/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  const { 
    petId, 
    technicianId, 
    serviceId, 
    date, 
    time, 
    remark 
  } = event
  
  try {
    // 1. 获取用户信息
    const userRes = await db.collection('users').where({ openid }).get()
    if (userRes.data.length === 0) {
      return { success: false, error: '用户未注册' }
    }
    const userId = userRes.data[0]._id
    
    // 2. 获取服务信息
    const serviceRes = await db.collection('services').doc(serviceId).get()
    const service = serviceRes.data
    
    // 3. 检查该时间段是否已被预约
    const apptRes = await db.collection('appointments').where({
      technicianId,
      date,
      time,
      status: _.in(['paid', 'pending'])
    }).get()
    
    if (apptRes.data.length > 0) {
      return { success: false, error: '该时间段已被预约' }
    }
    
    // 4. 生成订单号
    const orderNo = `APPT${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`
    
    // 5. 创建订单
    const order = {
      orderNo,
      userId,
      openid,
      petId,
      technicianId,
      serviceId,
      date,
      time,
      price: service.price,
      status: 'pending',
      remark: remark || '',
      createdAt: new Date()
    }
    
    const createRes = await db.collection('appointments').add({
      data: order
    })
    
    return {
      success: true,
      orderId: createRes._id,
      orderNo,
      price: service.price
    }
  } catch (err) {
    return {
      success: false,
      error: err.message
    }
  }
}
