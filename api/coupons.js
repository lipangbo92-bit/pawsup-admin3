// Vercel Serverless Function - 优惠券 API
// 使用微信云开发 Node.js SDK 连接数据库

const cloudbase = require('@cloudbase/node-sdk');

// 云开发配置
const CLOUD_ENV = 'cloud1-4gy1jyan842d73ab';

// 初始化云开发
// 优先使用密钥认证（支持读写），否则使用匿名登录（只读）
const appConfig = {
  env: CLOUD_ENV
};

if (process.env.TCB_SECRET_ID && process.env.TCB_SECRET_KEY) {
  appConfig.secretId = process.env.TCB_SECRET_ID;
  appConfig.secretKey = process.env.TCB_SECRET_KEY;
  console.log('[CloudBase] Using secret key auth');
} else {
  console.log('[CloudBase] Using anonymous auth (read-only)');
}

const app = cloudbase.init(appConfig);

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
  res.status(200).json({ success: true, data: result.data });
}

// 创建优惠券
async function createCoupon(req, res, data) {
  // 检查是否有写权限
  if (!process.env.TCB_SECRET_ID || !process.env.TCB_SECRET_KEY) {
    return res.status(403).json({ 
      success: false, 
      error: '未配置腾讯云密钥，无法写入数据。请在 Vercel 环境变量中设置 TCB_SECRET_ID 和 TCB_SECRET_KEY' 
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
  if (!process.env.TCB_SECRET_ID || !process.env.TCB_SECRET_KEY) {
    return res.status(403).json({ 
      success: false, 
      error: '未配置腾讯云密钥，无法写入数据。请在 Vercel 环境变量中设置 TCB_SECRET_ID 和 TCB_SECRET_KEY' 
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
  if (!process.env.TCB_SECRET_ID || !process.env.TCB_SECRET_KEY) {
    return res.status(403).json({ 
      success: false, 
      error: '未配置腾讯云密钥，无法写入数据。请在 Vercel 环境变量中设置 TCB_SECRET_ID 和 TCB_SECRET_KEY' 
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
  if (!process.env.TCB_SECRET_ID || !process.env.TCB_SECRET_KEY) {
    return res.status(403).json({ 
      success: false, 
      error: '未配置腾讯云密钥，无法写入数据。请在 Vercel 环境变量中设置 TCB_SECRET_ID 和 TCB_SECRET_KEY' 
    });
  }
  
  const { couponId, userId } = data;
  
  if (!couponId || !userId) {
    return res.status(400).json({ success: false, error: 'Missing parameters' });
  }
  
  // 获取优惠券
  const couponRes = await db.collection('coupons').doc(couponId).get();
  if (!couponRes.data) {
    return res.status(404).json({ success: false, error: '优惠券不存在' });
  }
  
  const coupon = couponRes.data;
  
  if (coupon.status !== 'active') {
    return res.status(400).json({ success: false, error: '优惠券未生效或已过期' });
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
