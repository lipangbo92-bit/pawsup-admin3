// Vercel Serverless Function - 优惠券 API
// 直接连接 MongoDB，绕过云函数

const { MongoClient } = require('mongodb');

// MongoDB 连接配置
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'zhuawa-pets';

let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  const client = await MongoClient.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const db = client.db(dbName);

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

module.exports = async (req, res) => {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // 处理预检请求
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { action } = req.body;

    switch (action) {
      case 'getCoupons':
        return await getCoupons(req, res);
      case 'createCoupon':
        return await createCoupon(req, res);
      case 'updateCoupon':
        return await updateCoupon(req, res);
      case 'deleteCoupon':
        return await deleteCoupon(req, res);
      case 'sendCouponToUser':
        return await sendCouponToUser(req, res);
      default:
        return res.status(400).json({ success: false, error: 'Unknown action: ' + action });
    }
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// 获取优惠券列表
async function getCoupons(req, res) {
  const { status, page = 1, limit = 20 } = req.body;
  
  const { db } = await connectToDatabase();
  const collection = db.collection('coupons');
  
  const query = {};
  if (status) {
    query.status = status;
  }
  
  const skip = (page - 1) * limit;
  
  const coupons = await collection
    .find(query)
    .sort({ createTime: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();
  
  res.status(200).json({ success: true, data: coupons });
}

// 创建优惠券
async function createCoupon(req, res) {
  const { data } = req.body;
  
  if (!data || !data.code || !data.name) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }
  
  const { db } = await connectToDatabase();
  const collection = db.collection('coupons');
  
  // 检查券码是否已存在
  const existing = await collection.findOne({ code: data.code });
  if (existing) {
    return res.status(400).json({ success: false, error: '优惠券码已存在' });
  }
  
  const couponData = {
    ...data,
    receivedCount: 0,
    usedCount: 0,
    createTime: new Date(),
    updateTime: new Date()
  };
  
  const result = await collection.insertOne(couponData);
  
  res.status(200).json({ 
    success: true, 
    couponId: result.insertedId,
    message: '优惠券创建成功'
  });
}

// 更新优惠券
async function updateCoupon(req, res) {
  const { couponId, data } = req.body;
  
  if (!couponId) {
    return res.status(400).json({ success: false, error: 'Missing couponId' });
  }
  
  const { db } = await connectToDatabase();
  const collection = db.collection('coupons');
  
  const { ObjectId } = require('mongodb');
  
  await collection.updateOne(
    { _id: new ObjectId(couponId) },
    { 
      $set: {
        ...data,
        updateTime: new Date()
      }
    }
  );
  
  res.status(200).json({ success: true, message: '优惠券更新成功' });
}

// 删除优惠券
async function deleteCoupon(req, res) {
  const { couponId } = req.body;
  
  if (!couponId) {
    return res.status(400).json({ success: false, error: 'Missing couponId' });
  }
  
  const { db } = await connectToDatabase();
  const collection = db.collection('coupons');
  
  const { ObjectId } = require('mongodb');
  
  await collection.deleteOne({ _id: new ObjectId(couponId) });
  
  res.status(200).json({ success: true, message: '优惠券删除成功' });
}

// 发放优惠券给用户
async function sendCouponToUser(req, res) {
  const { couponId, userId } = req.body;
  
  if (!couponId || !userId) {
    return res.status(400).json({ success: false, error: 'Missing parameters' });
  }
  
  const { db } = await connectToDatabase();
  const couponsCollection = db.collection('coupons');
  const userCouponsCollection = db.collection('user_coupons');
  
  const { ObjectId } = require('mongodb');
  
  // 获取优惠券
  const coupon = await couponsCollection.findOne({ _id: new ObjectId(couponId) });
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
  const userReceivedCount = await userCouponsCollection.countDocuments({ 
    userId: userId, 
    couponId: couponId 
  });
  
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
    const expireDate = new Date(now.getTime() + coupon.validDays * 24 * 60 * 60 * 1000);
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
  
  await userCouponsCollection.insertOne(userCouponData);
  
  // 更新优惠券已领取数量
  await couponsCollection.updateOne(
    { _id: new ObjectId(couponId) },
    { 
      $inc: { receivedCount: 1 },
      $set: { updateTime: new Date() }
    }
  );
  
  res.status(200).json({ success: true, message: '发放成功' });
}
