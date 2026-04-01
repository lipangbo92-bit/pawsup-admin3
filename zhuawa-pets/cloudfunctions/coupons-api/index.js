// 云函数：coupons-api - 优惠券系统 API
const cloud = require('wx-server-sdk')

cloud.init({ env: 'cloud1-4gy1jyan842d73ab' })

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { action } = event

  try {
    switch (action) {
      // ========== 管理端 ==========
      case 'createCoupon':
        return await createCoupon(event.data)
      case 'updateCoupon':
        return await updateCoupon(event.couponId, event.data)
      case 'deleteCoupon':
        return await deleteCoupon(event.couponId)
      case 'getCoupons':
        return await getCoupons(event.status, event.page, event.limit)
      case 'getCouponDetail':
        return await getCouponDetail(event.couponId)
      case 'sendCouponToUser':
        return await sendCouponToUser(event.couponId, event.userId)
      case 'batchSendCoupon':
        return await batchSendCoupon(event.couponId, event.userIds)
      
      // ========== 用户端 ==========
      case 'getAvailableCoupons':
        return await getAvailableCoupons(event.userId)
      case 'receiveCoupon':
        return await receiveCoupon(event.userId, event.couponId)
      case 'getMyCoupons':
        return await getMyCoupons(event.userId, event.status, event.page, event.limit)
      case 'getAvailableCouponsForOrder':
        return await getAvailableCouponsForOrder(event.userId, event.orderAmount, event.serviceIds)
      case 'selectCoupon':
        return await selectCoupon(event.userCouponId, event.orderAmount)
      case 'lockCoupon':
        return await lockCoupon(event.userCouponId, event.orderId)
      case 'unlockCoupon':
        return await unlockCoupon(event.userCouponId)
      case 'useCoupon':
        return await useCoupon(event.userCouponId, event.orderId, event.actualDiscount)
      
      default:
        return { success: false, error: 'Unknown action: ' + action }
    }
  } catch (error) {
    console.error('coupons-api error:', error)
    return { success: false, error: error.message }
  }
}

// ==================== 管理端 ====================

// 创建优惠券
async function createCoupon(data) {
  if (!data || !data.code || !data.name) {
    return { success: false, error: 'Missing required fields' }
  }

  // 检查券码是否已存在
  const existing = await db.collection('coupons').where({ code: data.code }).get()
  if (existing.data.length > 0) {
    return { success: false, error: '优惠券码已存在' }
  }

  const couponData = {
    code: data.code,
    name: data.name,
    description: data.description || '',
    type: data.type || 'discount',
    value: data.value || 0,
    minOrder: data.minOrder || 0,
    maxDiscount: data.maxDiscount || 0,
    
    totalCount: data.totalCount || 100,
    receivedCount: 0,
    usedCount: 0,
    limitPerUser: data.limitPerUser || 1,
    
    validType: data.validType || 'relative',
    validFrom: data.validFrom || null,
    validTo: data.validTo || null,
    validDays: data.validDays || 30,
    
    applicableType: data.applicableType || 'all',
    applicableCategories: data.applicableCategories || [],
    applicableServices: data.applicableServices || [],
    
    canStack: data.canStack || false,
    newUserOnly: data.newUserOnly || false,
    
    status: data.status || 'active',
    
    createTime: db.serverDate(),
    updateTime: db.serverDate()
  }

  const result = await db.collection('coupons').add({ data: couponData })
  
  return { 
    success: true, 
    couponId: result._id,
    message: '优惠券创建成功'
  }
}

// 更新优惠券
async function updateCoupon(couponId, data) {
  if (!couponId) {
    return { success: false, error: 'Missing couponId' }
  }

  const updateData = {
    ...data,
    updateTime: db.serverDate()
  }

  await db.collection('coupons').doc(couponId).update({ data: updateData })
  
  return { success: true, message: '优惠券更新成功' }
}

// 删除优惠券
async function deleteCoupon(couponId) {
  if (!couponId) {
    return { success: false, error: 'Missing couponId' }
  }

  await db.collection('coupons').doc(couponId).remove()
  
  return { success: true, message: '优惠券删除成功' }
}

// 获取优惠券列表
async function getCoupons(status, page = 1, limit = 20) {
  let query = db.collection('coupons')
  
  if (status) {
    query = query.where({ status: status })
  }
  
  const skip = (page - 1) * limit
  
  const result = await query
    .orderBy('createTime', 'desc')
    .skip(skip)
    .limit(limit)
    .get()
  
  return { success: true, data: result.data }
}

// 获取优惠券详情
async function getCouponDetail(couponId) {
  if (!couponId) {
    return { success: false, error: 'Missing couponId' }
  }

  const result = await db.collection('coupons').doc(couponId).get()
  
  if (!result.data) {
    return { success: false, error: '优惠券不存在' }
  }
  
  return { success: true, data: result.data }
}

// 发放优惠券给指定用户
async function sendCouponToUser(couponId, userId) {
  if (!couponId || !userId) {
    return { success: false, error: 'Missing parameters' }
  }

  // 获取优惠券
  const couponRes = await db.collection('coupons').doc(couponId).get()
  if (!couponRes.data) {
    return { success: false, error: '优惠券不存在' }
  }
  
  const coupon = couponRes.data
  
  if (coupon.status !== 'active') {
    return { success: false, error: '优惠券未生效或已过期' }
  }

  // 检查是否还有剩余
  if (coupon.totalCount > 0 && coupon.receivedCount >= coupon.totalCount) {
    return { success: false, error: '优惠券已发完' }
  }

  // 检查用户是否已达到限领数量
  const userReceivedRes = await db.collection('user_coupons')
    .where({ userId: userId, couponId: couponId })
    .get()
  
  if (userReceivedRes.data.length >= coupon.limitPerUser) {
    return { success: false, error: '该用户已达到领取上限' }
  }

  // 计算有效期
  let validFrom, validTo
  const now = new Date()
  
  if (coupon.validType === 'fixed') {
    validFrom = coupon.validFrom
    validTo = coupon.validTo
  } else {
    validFrom = now.toISOString()
    const expireDate = new Date(now.getTime() + coupon.validDays * 24 * 60 * 60 * 1000)
    validTo = expireDate.toISOString()
  }

  // 创建用户优惠券
  const userCouponData = {
    userId: userId,
    couponId: couponId,
    code: coupon.code,
    name: coupon.name,
    type: coupon.type,
    value: coupon.value,
    minOrder: coupon.minOrder,
    maxDiscount: coupon.maxDiscount,
    validFrom: validFrom,
    validTo: validTo,
    status: 'unused',
    usedAt: null,
    usedOrderId: null,
    lockedAt: null,
    lockedOrderId: null,
    receivedAt: db.serverDate(),
    channel: 'manual',
    createTime: db.serverDate()
  }

  await db.collection('user_coupons').add({ data: userCouponData })
  
  // 更新优惠券已领取数量
  await db.collection('coupons').doc(couponId).update({
    data: {
      receivedCount: _.inc(1),
      updateTime: db.serverDate()
    }
  })

  return { success: true, message: '发放成功' }
}

// 批量发放优惠券
async function batchSendCoupon(couponId, userIds) {
  if (!couponId || !userIds || !Array.isArray(userIds)) {
    return { success: false, error: 'Invalid parameters' }
  }

  let successCount = 0
  let failCount = 0

  for (const userId of userIds) {
    try {
      const result = await sendCouponToUser(couponId, userId)
      if (result.success) {
        successCount++
      } else {
        failCount++
      }
    } catch (err) {
      failCount++
    }
  }

  return {
    success: true,
    message: `发放完成：成功${successCount}人，失败${failCount}人`,
    successCount,
    failCount
  }
}

// ==================== 用户端 ====================

// 获取可领取的优惠券
async function getAvailableCoupons(userId) {
  const now = new Date().toISOString()
  
  // 获取生效中的优惠券
  let query = db.collection('coupons')
    .where({
      status: 'active'
    })
  
  const couponsRes = await query.get()
  
  if (!userId) {
    return { success: true, data: couponsRes.data }
  }
  
  // 获取用户已领取的
  const userCouponsRes = await db.collection('user_coupons')
    .where({ userId: userId })
    .get()
  
  // 过滤掉已达限领数量的
  const availableCoupons = []
  
  for (const coupon of couponsRes.data) {
    // 检查是否还有剩余
    if (coupon.totalCount > 0 && coupon.receivedCount >= coupon.totalCount) {
      continue
    }
    
    // 检查有效期
    if (coupon.validType === 'fixed') {
      if (coupon.validTo && coupon.validTo < now) {
        continue
      }
    }
    
    // 检查用户是否已达限领
    const userReceivedCount = userCouponsRes.data.filter(
      uc => uc.couponId === coupon._id
    ).length
    
    if (userReceivedCount >= coupon.limitPerUser) {
      continue
    }
    
    availableCoupons.push(coupon)
  }
  
  return { success: true, data: availableCoupons }
}

// 领取优惠券
async function receiveCoupon(userId, couponId) {
  if (!userId || !couponId) {
    return { success: false, error: 'Missing parameters' }
  }

  return await sendCouponToUser(couponId, userId)
}

// 获取我的优惠券
async function getMyCoupons(userId, status = 'all', page = 1, limit = 20) {
  if (!userId) {
    return { success: false, error: 'Missing userId' }
  }

  let query = db.collection('user_coupons').where({ userId: userId })
  
  if (status !== 'all') {
    query = query.where({ status: status })
  }
  
  const skip = (page - 1) * limit
  
  const result = await query
    .orderBy('receivedAt', 'desc')
    .skip(skip)
    .limit(limit)
    .get()
  
  // 检查过期状态
  const now = new Date().toISOString()
  const updatedData = []
  
  for (const item of result.data) {
    if (item.status === 'unused' && item.validTo < now) {
      item.status = 'expired'
      // 异步更新
      db.collection('user_coupons').doc(item._id).update({
        data: { status: 'expired' }
      })
    }
    updatedData.push(item)
  }
  
  return { success: true, data: updatedData }
}

// 查询订单可用优惠券
async function getAvailableCouponsForOrder(userId, orderAmount, serviceIds = []) {
  if (!userId || !orderAmount) {
    return { success: false, error: 'Missing parameters' }
  }

  const now = new Date().toISOString()
  
  // 获取用户未使用的优惠券
  const userCouponsRes = await db.collection('user_coupons')
    .where({
      userId: userId,
      status: 'unused'
    })
    .get()
  
  const availableCoupons = []
  
  for (const userCoupon of userCouponsRes.data) {
    // 检查是否过期
    if (userCoupon.validTo < now) {
      continue
    }
    
    // 检查最低消费
    if (orderAmount < userCoupon.minOrder) {
      continue
    }
    
    // 计算优惠金额
    let discountAmount = 0
    if (userCoupon.type === 'discount') {
      discountAmount = Math.floor(orderAmount * (1 - userCoupon.value))
      if (userCoupon.maxDiscount > 0 && discountAmount > userCoupon.maxDiscount) {
        discountAmount = userCoupon.maxDiscount
      }
    } else {
      discountAmount = userCoupon.value
      if (discountAmount > orderAmount) {
        discountAmount = orderAmount
      }
    }
    
    availableCoupons.push({
      ...userCoupon,
      discountAmount: discountAmount,
      finalAmount: orderAmount - discountAmount
    })
  }
  
  // 按优惠金额排序
  availableCoupons.sort((a, b) => b.discountAmount - a.discountAmount)
  
  return { success: true, data: availableCoupons }
}

// 选择优惠券（计算优惠）
async function selectCoupon(userCouponId, orderAmount) {
  if (!userCouponId || !orderAmount) {
    return { success: false, error: 'Missing parameters' }
  }

  const userCouponRes = await db.collection('user_coupons').doc(userCouponId).get()
  
  if (!userCouponRes.data) {
    return { success: false, error: '优惠券不存在' }
  }
  
  const userCoupon = userCouponRes.data
  
  if (userCoupon.status !== 'unused') {
    return { success: false, error: '优惠券已使用或已过期' }
  }

  const now = new Date().toISOString()
  if (userCoupon.validTo < now) {
    return { success: false, error: '优惠券已过期' }
  }

  if (orderAmount < userCoupon.minOrder) {
    return { 
      success: false, 
      error: `订单金额未满${userCoupon.minOrder / 100}元` 
    }
  }

  // 计算优惠金额
  let discountAmount = 0
  if (userCoupon.type === 'discount') {
    discountAmount = Math.floor(orderAmount * (1 - userCoupon.value))
    if (userCoupon.maxDiscount > 0 && discountAmount > userCoupon.maxDiscount) {
      discountAmount = userCoupon.maxDiscount
    }
  } else {
    discountAmount = userCoupon.value
    if (discountAmount > orderAmount) {
      discountAmount = orderAmount
    }
  }

  return {
    success: true,
    canUse: true,
    discountAmount: discountAmount,
    finalAmount: orderAmount - discountAmount,
    couponName: userCoupon.name
  }
}

// 锁定优惠券（下单时）
async function lockCoupon(userCouponId, orderId) {
  if (!userCouponId || !orderId) {
    return { success: false, error: 'Missing parameters' }
  }

  const userCouponRes = await db.collection('user_coupons').doc(userCouponId).get()
  
  if (!userCouponRes.data) {
    return { success: false, error: '优惠券不存在' }
  }
  
  const userCoupon = userCouponRes.data
  
  if (userCoupon.status !== 'unused') {
    return { success: false, error: '优惠券状态不可用' }
  }

  const now = new Date().toISOString()
  if (userCoupon.validTo < now) {
    return { success: false, error: '优惠券已过期' }
  }

  // 更新为锁定状态
  await db.collection('user_coupons').doc(userCouponId).update({
    data: {
      status: 'locked',
      lockedAt: db.serverDate(),
      lockedOrderId: orderId
    }
  })

  return { success: true, message: '锁定成功' }
}

// 解锁优惠券（支付失败）
async function unlockCoupon(userCouponId) {
  if (!userCouponId) {
    return { success: false, error: 'Missing userCouponId' }
  }

  const userCouponRes = await db.collection('user_coupons').doc(userCouponId).get()
  
  if (!userCouponRes.data) {
    return { success: false, error: '优惠券不存在' }
  }
  
  const userCoupon = userCouponRes.data
  
  if (userCoupon.status !== 'locked') {
    return { success: true, message: '优惠券未锁定，无需解锁' }
  }

  // 检查是否过期
  const now = new Date().toISOString()
  const newStatus = userCoupon.validTo < now ? 'expired' : 'unused'

  await db.collection('user_coupons').doc(userCouponId).update({
    data: {
      status: newStatus,
      lockedAt: null,
      lockedOrderId: null
    }
  })

  return { success: true, message: '解锁成功', status: newStatus }
}

// 使用优惠券（支付成功）
async function useCoupon(userCouponId, orderId, actualDiscount) {
  if (!userCouponId || !orderId) {
    return { success: false, error: 'Missing parameters' }
  }

  const userCouponRes = await db.collection('user_coupons').doc(userCouponId).get()
  
  if (!userCouponRes.data) {
    return { success: false, error: '优惠券不存在' }
  }
  
  const userCoupon = userCouponRes.data
  
  // 检查是否被锁定（当前订单）
  if (userCoupon.status === 'locked' && userCoupon.lockedOrderId !== orderId) {
    return { success: false, error: '优惠券被其他订单锁定' }
  }

  await db.collection('user_coupons').doc(userCouponId).update({
    data: {
      status: 'used',
      usedAt: db.serverDate(),
      usedOrderId: orderId,
      actualDiscount: actualDiscount || 0,
      lockedAt: null,
      lockedOrderId: null
    }
  })

  // 更新优惠券使用统计
  await db.collection('coupons').doc(userCoupon.couponId).update({
    data: {
      usedCount: _.inc(1),
      updateTime: db.serverDate()
    }
  })

  return { success: true, message: '使用成功' }
}
