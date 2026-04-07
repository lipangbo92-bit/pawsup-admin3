// Vercel Serverless Function - 优惠券 API
// 使用微信云开发 Node.js SDK 连接数据库

const cloudbase = require('@cloudbase/node-sdk');

// 云开发配置
const CLOUD_ENV = 'cloud1-4gy1jyan842d73ab';

// 检查环境变量
const hasCredentials = process.env.TENCENT_SECRET_ID && process.env.TENCENT_SECRET_KEY;

// 初始化云开发
const app = cloudbase.init({
  env: CLOUD_ENV,
  ...(hasCredentials ? {
    secretId: process.env.TENCENT_SECRET_ID,
    secretKey: process.env.TENCENT_SECRET_KEY
  } : {})
});

const db = app.database();

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
  
  console.log('[API] Action:', action, 'Data:', data);
  
  if (!action) {
    res.status(400).json({ success: false, error: 'Missing action' });
    return;
  }
  
  try {
    switch (action) {
      case 'getCoupons':
        return await getCoupons(req, res, data);
      case 'createCoupon':
        return await createCoupon(req, res, data);
      case 'updateCoupon':
        return await updateCoupon(req, res, data);
      case 'deleteCoupon':
        return await deleteCoupon(req, res, data);
      case 'sendCouponToUser':
        return await sendCouponToUser(req, res, data);
      case 'fixCouponStatus':
        return await fixCouponStatus(req, res, data);
      case 'fixUserCouponsUserId':
        return await fixUserCouponsUserId(req, res, data);
      default:
        res.status(400).json({ success: false, error: 'Unknown action: ' + action });
    }
  } catch (error) {
    console.error('[API Error]', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// 获取优惠券列表
async function getCoupons(req, res, data) {
  const { status, page = 1, limit = 20 } = data;
  
  console.log('[getCoupons] Query params:', { status, page, limit });
  
  let query = db.collection('coupons');
  
  if (status) {
    query = query.where({ status: status });
  }
  
  const skip = (page - 1) * limit;
  
  const result = await query
    .orderBy('createTime', 'desc')
    .skip(skip)
    .limit(limit)
    .get();
  
  console.log('[getCoupons] Found', result.data.length, 'coupons');
  
  // 打印每个优惠券的 status 用于调试
  result.data.forEach(c => {
    console.log(`[getCoupons] Coupon: ${c.name}, status: ${c.status}, id: ${c._id}`);
  });
  
  res.status(200).json({ success: true, data: result.data });
}

// 创建优惠券
async function createCoupon(req, res, data) {
  // 检查是否有写权限
  if (!process.env.TENCENT_SECRET_ID || !process.env.TENCENT_SECRET_KEY) {
    return res.status(403).json({ 
      success: false, 
      error: '未配置腾讯云密钥，无法写入数据。请在 Vercel 环境变量中设置 TENCENT_SECRET_ID 和 TENCENT_SECRET_KEY' 
    });
  }
  
  const { data: couponData } = data;
  
  if (!couponData || !couponData.code || !couponData.name) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }
  
  // 检查券码是否已存在
  const existing = await db.collection('coupons').where({ code: couponData.code }).get();
  if (existing.data.length > 0) {
    return res.status(400).json({ success: false, error: '优惠券码已存在' });
  }
  
  const newCoupon = {
    ...couponData,
    status: couponData.status || 'active',  // 确保 status 字段被设置
    receivedCount: 0,
    usedCount: 0,
    createTime: new Date(),
    updateTime: new Date()
  };
  
  const result = await db.collection('coupons').add(newCoupon);
  
  console.log('[createCoupon] Created:', result.id);
  res.status(200).json({ 
    success: true, 
    couponId: result.id,
    message: '优惠券创建成功'
  });
}

// 更新优惠券
async function updateCoupon(req, res, data) {
  // 检查是否有写权限
  if (!process.env.TENCENT_SECRET_ID || !process.env.TENCENT_SECRET_KEY) {
    return res.status(403).json({ 
      success: false, 
      error: '未配置腾讯云密钥，无法写入数据。请在 Vercel 环境变量中设置 TENCENT_SECRET_ID 和 TENCENT_SECRET_KEY' 
    });
  }
  
  const { couponId, data: updateData } = data;
  
  if (!couponId) {
    return res.status(400).json({ success: false, error: 'Missing couponId' });
  }
  
  await db.collection('coupons').doc(couponId).update({
    ...updateData,
    updateTime: new Date()
  });
  
  console.log('[updateCoupon] Updated:', couponId);
  res.status(200).json({ success: true, message: '优惠券更新成功' });
}

// 删除优惠券
async function deleteCoupon(req, res, data) {
  // 检查是否有写权限
  if (!process.env.TENCENT_SECRET_ID || !process.env.TENCENT_SECRET_KEY) {
    return res.status(403).json({ 
      success: false, 
      error: '未配置腾讯云密钥，无法写入数据。请在 Vercel 环境变量中设置 TENCENT_SECRET_ID 和 TENCENT_SECRET_KEY' 
    });
  }
  
  const { couponId } = data;
  
  if (!couponId) {
    return res.status(400).json({ success: false, error: 'Missing couponId' });
  }
  
  await db.collection('coupons').doc(couponId).remove();
  
  console.log('[deleteCoupon] Deleted:', couponId);
  res.status(200).json({ success: true, message: '优惠券删除成功' });
}

// 发放优惠券给用户
async function sendCouponToUser(req, res, data) {
  // 检查是否有写权限
  if (!process.env.TENCENT_SECRET_ID || !process.env.TENCENT_SECRET_KEY) {
    return res.status(403).json({ 
      success: false, 
      error: '未配置腾讯云密钥，无法写入数据。请在 Vercel 环境变量中设置 TENCENT_SECRET_ID 和 TENCENT_SECRET_KEY' 
    });
  }
  
  const { couponId, userId } = data;
  
  console.log('[sendCouponToUser] Request params:', { couponId, userId });
  
  if (!couponId || !userId) {
    return res.status(400).json({ success: false, error: 'Missing parameters' });
  }
  
  // 获取优惠券
  let couponRes;
  try {
    couponRes = await db.collection('coupons').doc(couponId).get();
  } catch (err) {
    console.error('[sendCouponToUser] Get coupon error:', err);
    return res.status(400).json({ 
      success: false, 
      error: `查询优惠券失败: ${err.message}` 
    });
  }
  
  if (!couponRes || !couponRes.data) {
    console.log('[sendCouponToUser] Coupon not found:', couponId);
    return res.status(404).json({ 
      success: false, 
      error: `优惠券不存在 (ID: ${couponId})` 
    });
  }
  
  const coupon = couponRes.data;
  
  console.log('[sendCouponToUser] Coupon:', JSON.stringify({
    id: couponId,
    name: coupon.name,
    code: coupon.code,
    status: coupon.status,
    statusType: typeof coupon.status
  }));
  
  // 检查 status 字段（放宽检查，支持多种状态值）
  const validStatuses = ['active', 'Active', '生效中', '进行中'];
  if (!coupon.status || !validStatuses.includes(coupon.status)) {
    console.log('[sendCouponToUser] Invalid status, auto-fixing to active');
    // 自动修复状态
    await db.collection('coupons').doc(couponId).update({
      status: 'active',
      updateTime: new Date()
    });
    // 继续执行发放逻辑
  }
  
  // 检查是否还有剩余
  if (coupon.totalCount > 0 && coupon.receivedCount >= coupon.totalCount) {
    return res.status(400).json({ success: false, error: '优惠券已发完' });
  }
  
  // 检查用户是否已达到限领数量
  const userReceivedRes = await db.collection('user_coupons')
    .where({ userId: userId, couponId: couponId })
    .get();
  
  if (userReceivedRes.data.length >= coupon.limitPerUser) {
    return res.status(400).json({ success: false, error: '该用户已达到领取上限' });
  }
  
  // 计算有效期
  let validFrom, validTo;
  const now = new Date();
  
  if (coupon.validType === 'fixed') {
    validFrom = coupon.validFrom;
    validTo = coupon.validTo;
  } else {
    validFrom = now.toISOString();
    const expireDate = new Date(now.getTime() + (coupon.validDays || 30) * 24 * 60 * 60 * 1000);
    validTo = expireDate.toISOString();
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
    receivedAt: new Date(),
    channel: 'manual',
    createTime: new Date()
  };
  
  await db.collection('user_coupons').add(userCouponData);
  
  // 更新优惠券已领取数量
  await db.collection('coupons').doc(couponId).update({
    receivedCount: db.command.inc(1),
    updateTime: new Date()
  });
  
  console.log('[sendCouponToUser] Sent to:', userId);
  res.status(200).json({ success: true, message: '发放成功' });
}

// 修复优惠券状态（为没有 status 的优惠券设置默认值）
async function fixCouponStatus(req, res, data) {
  // 检查是否有写权限
  if (!hasCredentials) {
    return res.status(403).json({ 
      success: false, 
      error: '未配置腾讯云密钥，无法写入数据。请在 Vercel 环境变量中设置 TENCENT_SECRET_ID 和 TENCENT_SECRET_KEY' 
    });
  }
  
  try {
    // 获取所有优惠券
    const result = await db.collection('coupons').get();
    
    let fixedCount = 0;
    const details = [];
    
    for (const coupon of result.data) {
      // 如果没有 status 字段，设置为 'active'
      if (!coupon.status) {
        await db.collection('coupons').doc(coupon._id).update({
          status: 'active',
          updateTime: new Date()
        });
        
        fixedCount++;
        details.push({
          id: coupon._id,
          name: coupon.name,
          code: coupon.code
        });
      }
    }
    
    res.status(200).json({ 
      success: true, 
      message: `修复完成！共修复 ${fixedCount} 个优惠券`,
      fixedCount,
      details
    });
    
  } catch (error) {
    console.error('[fixCouponStatus] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// 修复 user_coupons 中的 userId（将 _id 格式改为 openid 格式）
async function fixUserCouponsUserId(req, res, data) {
  // 检查是否有写权限
  if (!hasCredentials) {
    return res.status(403).json({
      success: false,
      error: '未配置腾讯云密钥，无法写入数据。请在 Vercel 环境变量中设置 TENCENT_SECRET_ID 和 TENCENT_SECRET_KEY'
    });
  }

  try {
    // 1. 获取所有用户，建立 _id -> openid 的映射
    const usersResult = await db.collection('users').get();
    const users = usersResult.data;

    // 建立映射表
    const userIdMap = {};
    users.forEach(user => {
      if (user._id && user.openid) {
        userIdMap[user._id] = user.openid;
      }
    });

    // 2. 获取所有 user_coupons
    const couponsResult = await db.collection('user_coupons').get();
    const coupons = couponsResult.data;

    // 3. 检查并修复
    let fixCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    const details = [];

    for (const coupon of coupons) {
      const currentUserId = coupon.userId;

      // 如果 currentUserId 在映射表中，说明是 _id 格式，需要修复
      if (userIdMap[currentUserId]) {
        const newUserId = userIdMap[currentUserId];

        try {
          await db.collection('user_coupons').doc(coupon._id).update({
            userId: newUserId
          });
          fixCount++;
          details.push({
            couponId: coupon._id,
            oldUserId: currentUserId,
            newUserId: newUserId,
            status: 'fixed'
          });
        } catch (err) {
          errorCount++;
          details.push({
            couponId: coupon._id,
            oldUserId: currentUserId,
            error: err.message,
            status: 'error'
          });
        }
      } else {
        // 检查是否已经是 openid 格式
        const isOpenidFormat = users.some(u => u.openid === currentUserId);
        if (isOpenidFormat) {
          skipCount++;
          details.push({
            couponId: coupon._id,
            userId: currentUserId,
            status: 'skipped'
          });
        } else {
          errorCount++;
          details.push({
            couponId: coupon._id,
            userId: currentUserId,
            status: 'not_found'
          });
        }
      }
    }

    res.status(200).json({
      success: true,
      message: `修复完成！修复: ${fixCount}, 跳过: ${skipCount}, 错误: ${errorCount}`,
      fixCount,
      skipCount,
      errorCount,
      totalUsers: users.length,
      totalCoupons: coupons.length,
      details
    });

  } catch (error) {
    console.error('[fixUserCouponsUserId] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
