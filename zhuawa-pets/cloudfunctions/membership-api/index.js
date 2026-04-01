// 云函数：membership-api - 会员系统 API
const cloud = require('wx-server-sdk')

cloud.init({ env: 'cloud1-4gy1jyan842d73ab' })

const db = cloud.database()
const _ = db.command

// 默认会员档位配置
const DEFAULT_LEVELS = [
  {
    level: 1,
    name: '普通会员',
    icon: '⭐',
    color: '#9CA3AF',
    minRecharge: 0,
    maxRecharge: 199999,
    discount: 1.0,
    giftConfig: { enabled: false },
    benefits: ['基础服务'],
    isActive: true,
    sortOrder: 1
  },
  {
    level: 2,
    name: '银卡会员',
    icon: '🌟',
    color: '#8B5CF6',
    minRecharge: 200000,
    maxRecharge: 399999,
    discount: 0.9,
    giftConfig: { enabled: true, giftType: 'balance', giftValue: 10000 },
    benefits: ['9折优惠', '充值赠送100元', '优先预约'],
    isActive: true,
    sortOrder: 2
  },
  {
    level: 3,
    name: '金卡会员',
    icon: '👑',
    color: '#F59E0B',
    minRecharge: 400000,
    maxRecharge: 599999,
    discount: 0.8,
    giftConfig: { enabled: true, giftType: 'balance', giftValue: 30000 },
    benefits: ['8折优惠', '充值赠送300元', '优先预约', '专属客服'],
    isActive: true,
    sortOrder: 3
  },
  {
    level: 4,
    name: '钻石会员',
    icon: '💎',
    color: '#EC4899',
    minRecharge: 600000,
    maxRecharge: 99999999,
    discount: 0.75,
    giftConfig: { enabled: true, giftType: 'balance', giftValue: 60000 },
    benefits: ['7.5折优惠', '充值赠送600元', '优先预约', '专属客服', '全年活动'],
    isActive: true,
    sortOrder: 4
  }
]

exports.main = async (event, context) => {
  const { action } = event

  // 处理 OPTIONS 预检请求
  if (event.httpMethod === 'OPTIONS' || event.method === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    }
  }

  try {
    switch (action) {
      case 'initMembershipLevels':
        return await initMembershipLevels()
      case 'getMembershipLevels':
        return await getMembershipLevels()
      case 'updateMembershipLevel':
        return await updateMembershipLevel(event.levelId, event.data)
      case 'getUserMembership':
        return await getUserMembership(event.userId)
      case 'createRechargeOrder':
        return await createRechargeOrder(event.userId, event.amount)
      case 'onRechargeSuccess':
        return await onRechargeSuccess(event.userId, event.rechargeId, event.transactionId)
      case 'freezeBalance':
        return await freezeBalance(event.userId, event.amount, event.orderId)
      case 'unfreezeBalance':
        return await unfreezeBalance(event.orderId)
      case 'confirmConsume':
        return await confirmConsume(event.orderId, event.actualAmount)
      case 'earnPointsFromOrder':
        return await earnPointsFromOrder(event.userId, event.orderAmount, event.orderId)
      case 'getBalanceRecords':
        return await getBalanceRecords(event.userId, event.page, event.limit)
      case 'getPointsRecords':
        return await getPointsRecords(event.userId, event.page, event.limit)
      default:
        return { success: false, error: 'Unknown action: ' + action }
    }
  } catch (error) {
    console.error('membership-api error:', error)
    return { success: false, error: error.message }
  }
}

// 包装响应，添加 CORS 头（用于需要自定义响应头的场景）
function corsResponse(data, statusCode = 200) {
  return {
    statusCode: statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  }
}

// 初始化会员档位
async function initMembershipLevels() {
  try {
    const existingResult = await db.collection('membership_levels').get()
    const existingData = existingResult.data || []

    if (existingData.length > 0) {
      for (const doc of existingData) {
        if (!doc.benefits && doc._id) {
          const defaultLevel = DEFAULT_LEVELS.find(l => l.level === doc.level)
          if (defaultLevel) {
            try {
              await db.collection('membership_levels').doc(doc._id).update({
                data: {
                  benefits: defaultLevel.benefits,
                  updateTime: db.serverDate()
                }
              })
            } catch (updateErr) {
              console.error(`更新档位 ${doc.level} 失败:`, updateErr)
            }
          }
        }
      }
      return { success: true, message: '会员档位已存在' }
    }

    for (const level of DEFAULT_LEVELS) {
      await db.collection('membership_levels').add({
        data: {
          ...level,
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      })
    }

    return { success: true, message: '会员档位初始化成功' }
  } catch (error) {
    console.error('初始化会员档位失败:', error)
    return { success: false, error: error.message }
  }
}

// 获取会员档位配置
async function getMembershipLevels() {
  try {
    const result = await db.collection('membership_levels').get()

    if (!result.data || result.data.length === 0) {
      return { success: true, data: DEFAULT_LEVELS }
    }

    const sortedData = result.data.sort((a, b) => a.level - b.level)

    const processedData = sortedData.map(doc => {
      const defaultLevel = DEFAULT_LEVELS.find(l => l.level === doc.level)
      return {
        ...defaultLevel,
        ...doc,
        benefits: doc.benefits || defaultLevel?.benefits || [],
        iconUrl: doc.iconUrl || ''
      }
    })

    return { success: true, data: processedData }
  } catch (error) {
    console.error('获取会员档位失败:', error)
    return { success: true, data: DEFAULT_LEVELS }
  }
}

// 更新会员档位配置
async function updateMembershipLevel(levelId, data) {
  if (!levelId) {
    return { success: false, error: 'Missing levelId' }
  }

  const updateData = {
    ...data,
    updateTime: db.serverDate()
  }

  await db.collection('membership_levels').doc(levelId).update({ data: updateData })
  
  return { success: true, message: '更新成功' }
}

// 获取用户会员信息
async function getUserMembership(userId) {
  if (!userId) {
    return { success: false, error: 'Missing userId' }
  }

  const levelsRes = await getMembershipLevels()
  const levels = levelsRes.data

  const userRes = await db.collection('users').where({ openid: userId }).get()
  
  if (userRes.data.length === 0) {
    const newUser = {
      openid: userId,
      membership: {
        level: 1,
        levelName: levels[0]?.name || '普通会员',
        discount: levels[0]?.discount || 1.0,
        points: 0,
        totalPoints: 0,
        upgradeAt: null
      },
      balance: 0,
      frozenBalance: 0,
      totalRecharge: 0,
      totalConsume: 0,
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    }
    
    await db.collection('users').add({ data: newUser })
    
    return {
      success: true,
      data: newUser.membership,
      balance: 0,
      frozenBalance: 0,
      totalRecharge: 0,
      totalConsume: 0,
      levels: levels
    }
  }

  const user = userRes.data[0]
  
  return {
    success: true,
    data: user.membership,
    balance: user.balance || 0,
    frozenBalance: user.frozenBalance || 0,
    totalRecharge: user.totalRecharge || 0,
    totalConsume: user.totalConsume || 0,
    levels: levels
  }
}

// 创建充值订单
async function createRechargeOrder(userId, amount) {
  if (!userId || !amount || amount <= 0) {
    return { success: false, error: 'Invalid parameters' }
  }

  const levelsRes = await getMembershipLevels()
  const levels = levelsRes.data

  let targetLevel = levels[0]
  for (const level of levels) {
    if (amount >= level.minRecharge) {
      targetLevel = level
    }
  }

  const rechargeData = {
    userId: userId,
    rechargeAmount: amount,
    giftAmount: targetLevel.giftConfig?.enabled ? targetLevel.giftConfig.giftValue : 0,
    targetLevel: targetLevel.level,
    targetLevelName: targetLevel.name,
    status: 'pending',
    createTime: db.serverDate()
  }

  const result = await db.collection('recharge_records').add({ data: rechargeData })

  return {
    success: true,
    rechargeId: result._id,
    rechargeAmount: amount,
    giftAmount: rechargeData.giftAmount,
    targetLevel: targetLevel.level,
    targetLevelName: targetLevel.name
  }
}

// 充值成功回调
async function onRechargeSuccess(userId, rechargeId, transactionId) {
  if (!userId || !rechargeId) {
    return { success: false, error: 'Missing parameters' }
  }

  const rechargeRes = await db.collection('recharge_records').doc(rechargeId).get()
  if (!rechargeRes.data) {
    return { success: false, error: 'Recharge record not found' }
  }

  const recharge = rechargeRes.data
  
  if (recharge.status === 'paid') {
    return { success: true, message: '已处理，无需重复' }
  }

  const userRes = await db.collection('users').where({ openid: userId }).get()
  if (userRes.data.length === 0) {
    return { success: false, error: 'User not found' }
  }

  const user = userRes.data[0]
  const oldBalance = user.balance || 0
  const oldLevel = user.membership?.level || 1
  
  const rechargeAmount = recharge.rechargeAmount
  const giftAmount = recharge.giftAmount || 0
  const totalAmount = rechargeAmount + giftAmount
  const newBalance = oldBalance + totalAmount

  const newLevel = recharge.targetLevel
  const newLevelName = recharge.targetLevelName
  const levelUpgraded = newLevel > oldLevel

  const levelsRes = await getMembershipLevels()
  const newLevelConfig = levelsRes.data.find(l => l.level === newLevel)
  const newDiscount = newLevelConfig?.discount || 1.0

  const updateData = {
    balance: newBalance,
    totalRecharge: (user.totalRecharge || 0) + rechargeAmount,
    'membership.level': newLevel,
    'membership.levelName': newLevelName,
    'membership.discount': newDiscount,
    updateTime: db.serverDate()
  }

  if (levelUpgraded) {
    updateData['membership.upgradeAt'] = db.serverDate()
  }

  await db.collection('users').doc(user._id).update({ data: updateData })

  await db.collection('recharge_records').doc(rechargeId).update({
    data: {
      status: 'paid',
      transactionId: transactionId,
      paidAt: db.serverDate(),
      oldBalance: oldBalance,
      newBalance: newBalance,
      oldLevel: oldLevel,
      newLevel: newLevel,
      levelUpgraded: levelUpgraded
    }
  })

  await db.collection('balance_records').add({
    data: {
      userId: userId,
      type: 'recharge',
      amount: totalAmount,
      rechargeAmount: rechargeAmount,
      giftAmount: giftAmount,
      balanceBefore: oldBalance,
      balanceAfter: newBalance,
      reason: `充值升级${newLevelName}`,
      source: 'wechat_pay',
      sourceId: transactionId,
      levelChange: levelUpgraded ? {
        oldLevel: oldLevel,
        newLevel: newLevel,
        oldLevelName: user.membership?.levelName || '普通会员',
        newLevelName: newLevelName
      } : null,
      createTime: db.serverDate()
    }
  })

  return {
    success: true,
    message: '充值成功',
    balance: newBalance,
    rechargeAmount: rechargeAmount,
    giftAmount: giftAmount,
    levelUpgraded: levelUpgraded,
    newLevel: newLevel,
    newLevelName: newLevelName
  }
}

// 冻结余额（下单时）
async function freezeBalance(userId, amount, orderId) {
  if (!userId || !amount || !orderId) {
    return { success: false, error: 'Invalid parameters' }
  }

  const userRes = await db.collection('users').where({ openid: userId }).get()
  if (userRes.data.length === 0) {
    return { success: false, error: 'User not found' }
  }

  const user = userRes.data[0]
  const availableBalance = (user.balance || 0) - (user.frozenBalance || 0)

  if (availableBalance < amount) {
    return { success: false, error: '可用余额不足' }
  }

  const oldFrozen = user.frozenBalance || 0
  const newFrozen = oldFrozen + amount

  await db.collection('users').doc(user._id).update({
    data: {
      frozenBalance: newFrozen,
      updateTime: db.serverDate()
    }
  })

  await db.collection('balance_records').add({
    data: {
      userId: userId,
      type: 'freeze',
      amount: -amount,
      balanceBefore: user.balance || 0,
      balanceAfter: user.balance || 0,
      frozenBalanceBefore: oldFrozen,
      frozenBalanceAfter: newFrozen,
      reason: '下单冻结余额',
      sourceId: orderId,
      createTime: db.serverDate()
    }
  })

  return {
    success: true,
    message: '冻结成功',
    frozenBalance: newFrozen
  }
}

// 解冻余额（支付失败/取消）
async function unfreezeBalance(orderId) {
  if (!orderId) {
    return { success: false, error: 'Missing orderId' }
  }

  const freezeRecord = await db.collection('balance_records')
    .where({
      type: 'freeze',
      sourceId: orderId
    })
    .get()

  if (freezeRecord.data.length === 0) {
    return { success: false, error: '冻结记录不存在' }
  }

  const record = freezeRecord.data[0]
  const userId = record.userId
  const amount = Math.abs(record.amount)

  const userRes = await db.collection('users').where({ openid: userId }).get()
  if (userRes.data.length === 0) {
    return { success: false, error: 'User not found' }
  }

  const user = userRes.data[0]
  const oldFrozen = user.frozenBalance || 0
  const newFrozen = Math.max(0, oldFrozen - amount)

  await db.collection('users').doc(user._id).update({
    data: {
      frozenBalance: newFrozen,
      updateTime: db.serverDate()
    }
  })

  await db.collection('balance_records').add({
    data: {
      userId: userId,
      type: 'unfreeze',
      amount: amount,
      balanceBefore: user.balance || 0,
      balanceAfter: user.balance || 0,
      frozenBalanceBefore: oldFrozen,
      frozenBalanceAfter: newFrozen,
      reason: '订单取消/支付失败，解冻余额',
      sourceId: orderId,
      createTime: db.serverDate()
    }
  })

  return {
    success: true,
    message: '解冻成功',
    frozenBalance: newFrozen
  }
}

// 确认消费（支付成功）
async function confirmConsume(orderId, actualAmount) {
  if (!orderId) {
    return { success: false, error: 'Missing orderId' }
  }

  const freezeRecord = await db.collection('balance_records')
    .where({
      type: 'freeze',
      sourceId: orderId
    })
    .get()

  if (freezeRecord.data.length === 0) {
    return { success: false, error: '冻结记录不存在' }
  }

  const record = freezeRecord.data[0]
  const userId = record.userId
  const frozenAmount = Math.abs(record.amount)
  
  const consumeAmount = actualAmount || frozenAmount

  const userRes = await db.collection('users').where({ openid: userId }).get()
  if (userRes.data.length === 0) {
    return { success: false, error: 'User not found' }
  }

  const user = userRes.data[0]
  const oldBalance = user.balance || 0
  const oldFrozen = user.frozenBalance || 0
  
  const newBalance = oldBalance - consumeAmount
  const newFrozen = Math.max(0, oldFrozen - frozenAmount)

  await db.collection('users').doc(user._id).update({
    data: {
      balance: newBalance,
      frozenBalance: newFrozen,
      totalConsume: (user.totalConsume || 0) + consumeAmount,
      updateTime: db.serverDate()
    }
  })

  await db.collection('balance_records').add({
    data: {
      userId: userId,
      type: 'consume',
      amount: -consumeAmount,
      balanceBefore: oldBalance,
      balanceAfter: newBalance,
      frozenBalanceBefore: oldFrozen,
      frozenBalanceAfter: newFrozen,
      reason: '订单支付',
      sourceId: orderId,
      createTime: db.serverDate()
    }
  })

  return {
    success: true,
    message: '消费确认成功',
    balance: newBalance,
    consumeAmount: consumeAmount
  }
}

// 消费返积分
async function earnPointsFromOrder(userId, orderAmount, orderId) {
  if (!userId || !orderAmount || !orderId) {
    return { success: false, error: 'Invalid parameters' }
  }

  const points = Math.floor(orderAmount / 100)

  if (points <= 0) {
    return { success: true, message: '消费金额不足，不返积分' }
  }

  const userRes = await db.collection('users').where({ openid: userId }).get()
  if (userRes.data.length === 0) {
    return { success: false, error: 'User not found' }
  }

  const user = userRes.data[0]
  const currentPoints = user.membership?.points || 0
  const totalPoints = user.membership?.totalPoints || 0

  await db.collection('users').doc(user._id).update({
    data: {
      'membership.points': currentPoints + points,
      'membership.totalPoints': totalPoints + points,
      updateTime: db.serverDate()
    }
  })

  await db.collection('points_records').add({
    data: {
      userId: userId,
      type: 'earn',
      points: points,
      balance: currentPoints + points,
      reason: '消费返积分',
      source: 'order',
      sourceId: orderId,
      orderAmount: orderAmount,
      createTime: db.serverDate()
    }
  })

  return {
    success: true,
    message: '返积分成功',
    points: points,
    totalPoints: currentPoints + points
  }
}

// 获取余额记录
async function getBalanceRecords(userId, page = 1, limit = 20) {
  if (!userId) {
    return { success: false, error: 'Missing userId' }
  }

  const skip = (page - 1) * limit

  const result = await db.collection('balance_records')
    .where({ userId: userId })
    .orderBy('createTime', 'desc')
    .skip(skip)
    .limit(limit)
    .get()

  return { success: true, data: result.data }
}

// 获取积分记录
async function getPointsRecords(userId, page = 1, limit = 20) {
  if (!userId) {
    return { success: false, error: 'Missing userId' }
  }

  const skip = (page - 1) * limit

  const result = await db.collection('points_records')
    .where({ userId: userId })
    .orderBy('createTime', 'desc')
    .skip(skip)
    .limit(limit)
    .get()

  return { success: true, data: result.data }
}
