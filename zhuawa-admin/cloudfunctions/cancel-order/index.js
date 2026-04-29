// cloudfunctions/cancel-order/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  const { orderId } = event
  
  try {
    // 1. 获取订单信息
    const orderRes = await db.collection('appointments').doc(orderId).get()
    const order = orderRes.data
    
    // 2. 验证订单所有者
    if (order.openid !== openid) {
      return { success: false, error: '无权限操作' }
    }
    
    // 3. 检查订单状态
    if (order.status !== 'pending' && order.status !== 'paid') {
      return { success: false, error: '订单状态不可取消' }
    }
    
    // 4. 检查取消时间（需提前3小时）
    const appointmentTime = new Date(`${order.date} ${order.time}`)
    const now = new Date()
    const hoursDiff = (appointmentTime - now) / (1000 * 60 * 60)
    
    if (hoursDiff < 3) {
      return { success: false, error: '需提前3小时取消' }
    }
    
    // 5. 如果已支付，执行退款
    let refundResult = null
    if (order.status === 'paid' && order.transactionId) {
      try {
        const refund = await cloud.cloudPay.refund({
          body: '预约取消退款',
          outTradeNo: order.orderNo,
          outRefundNo: `REF${order.orderNo}`,
          totalFee: order.price * 100,
          refundFee: order.price * 100
        })
        refundResult = refund
      } catch (refundErr) {
        console.error('退款失败', refundErr)
        return { success: false, error: '退款失败，请联系客服' }
      }
    }
    
    // 6. 更新订单状态
    await db.collection('appointments').doc(orderId).update({
      data: {
        status: 'canceled',
        cancelTime: new Date(),
        refundResult: refundResult
      }
    })
    
    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err.message
    }
  }
}
