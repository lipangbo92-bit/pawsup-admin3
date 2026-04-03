// Vercel Serverless Function - 优惠券 API (测试版)
// 暂时使用内存存储，绕过云函数 HTTP 访问问题

// 内存存储（仅用于测试，Vercel 冷启动会清空）
let coupons = [];
let userCoupons = [];

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
  const { status } = data;
  
  let result = coupons;
  if (status) {
    result = coupons.filter(c => c.status === status);
  }
  
  console.log('[getCoupons] Returning', result.length, 'coupons');
  res.status(200).json({ success: true, data: result });
}

// 创建优惠券
async function createCoupon(req, res, data) {
  const { data: couponData } = data;
  
  if (!couponData || !couponData.code || !couponData.name) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }
  
  // 检查券码是否已存在
  const existing = coupons.find(c => c.code === couponData.code);
  if (existing) {
    return res.status(400).json({ success: false, error: '优惠券码已存在' });
  }
  
  const newCoupon = {
    _id: 'coupon_' + Date.now(),
    ...couponData,
    receivedCount: 0,
    usedCount: 0,
    createTime: new Date().toISOString(),
    updateTime: new Date().toISOString()
  };
  
  coupons.push(newCoupon);
  
  console.log('[createCoupon] Created:', newCoupon._id);
  res.status(200).json({ 
    success: true, 
    couponId: newCoupon._id,
    message: '优惠券创建成功'
  });
}

// 更新优惠券
async function updateCoupon(req, res, data) {
  const { couponId, data: updateData } = data;
  
  if (!couponId) {
    return res.status(400).json({ success: false, error: 'Missing couponId' });
  }
  
  const index = coupons.findIndex(c => c._id === couponId);
  if (index === -1) {
    return res.status(404).json({ success: false, error: '优惠券不存在' });
  }
  
  coupons[index] = {
    ...coupons[index],
    ...updateData,
    updateTime: new Date().toISOString()
  };
  
  console.log('[updateCoupon] Updated:', couponId);
  res.status(200).json({ success: true, message: '优惠券更新成功' });
}

// 删除优惠券
async function deleteCoupon(req, res, data) {
  const { couponId } = data;
  
  if (!couponId) {
    return res.status(400).json({ success: false, error: 'Missing couponId' });
  }
  
  const index = coupons.findIndex(c => c._id === couponId);
  if (index === -1) {
    return res.status(404).json({ success: false, error: '优惠券不存在' });
  }
  
  coupons.splice(index, 1);
  
  console.log('[deleteCoupon] Deleted:', couponId);
  res.status(200).json({ success: true, message: '优惠券删除成功' });
}

// 发放优惠券给用户
async function sendCouponToUser(req, res, data) {
  const { couponId, userId } = data;
  
  if (!couponId || !userId) {
    return res.status(400).json({ success: false, error: 'Missing parameters' });
  }
  
  const coupon = coupons.find(c => c._id === couponId);
  if (!coupon) {
    return res.status(404).json({ success: false, error: '优惠券不存在' });
  }
  
  if (coupon.status !== 'active') {
    return res.status(400).json({ success: false, error: '优惠券未生效或已过期' });
  }
  
  // 检查是否还有剩余
  if (coupon.totalCount > 0 && coupon.receivedCount >= coupon.totalCount) {
    return res.status(400).json({ success: false, error: '优惠券已发完' });
  }
  
  // 检查用户是否已达到限领数量
  const userReceivedCount = userCoupons.filter(
    uc => uc.userId === userId && uc.couponId === couponId
  ).length;
  
  if (userReceivedCount >= coupon.limitPerUser) {
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
    _id: 'uc_' + Date.now(),
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
    receivedAt: new Date().toISOString(),
    channel: 'manual'
  };
  
  userCoupons.push(userCouponData);
  
  // 更新优惠券已领取数量
  coupon.receivedCount = (coupon.receivedCount || 0) + 1;
  coupon.updateTime = new Date().toISOString();
  
  console.log('[sendCouponToUser] Sent to:', userId);
  res.status(200).json({ success: true, message: '发放成功' });
}
