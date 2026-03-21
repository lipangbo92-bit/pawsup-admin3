// 云函数：visiting-api - 上门服务 API
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const { action } = event;

  try {
    switch (action) {
      case 'getServices':
        return await getServices(event.category);
      case 'createOrder':
        return await createOrder(event.data);
      case 'getOrders':
        return await getOrders(event.userId);
      case 'getOrderDetail':
        return await getOrderDetail(event.orderId);
      case 'cancelOrder':
        return await cancelOrder(event.orderId);
      default:
        return {
          success: false,
          error: 'Unknown action: ' + action
        };
    }
  } catch (error) {
    console.error('Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// 获取上门服务项目
async function getServices(category) {
  console.log('getServices called, category:', category);

  // 先尝试查询 category 为 '上门服务' 的数据
  let query = db.collection('services').where({
    category: '上门服务'
  });

  let result = await query.get();
  console.log('Query result count:', result.data.length);

  // 如果没有数据，尝试查询 category 包含 '上门' 的数据
  if (result.data.length === 0) {
    console.log('No exact match, trying fuzzy search...');
    const allServices = await db.collection('services').get();
    console.log('All services count:', allServices.data.length);

    // 过滤出 category 包含 '上门' 的服务
    result.data = allServices.data.filter(s =>
      s.category && s.category.includes('上门')
    );
    console.log('Filtered services count:', result.data.length);
  }

  return {
    success: true,
    data: result.data.map(service => ({
      id: service._id,
      name: service.name,
      desc: service.description || '',
      price: service.price,
      duration: service.duration || 60,
      icon: service.icon || '🚗',
      category: service.category
    }))
  };
}

// 创建上门服务订单
async function createOrder(data) {
  // 验证必填字段
  const requiredFields = ['userId', 'serviceId', 'serviceName', 'servicePrice', 'petId', 'petName', 'address', 'contactName', 'contactPhone', 'serviceDate', 'serviceTime'];
  for (const field of requiredFields) {
    if (!data[field]) {
      return { success: false, error: `Missing required field: ${field}` };
    }
  }

  // 生成订单号
  const orderNo = generateOrderNo();

  // 创建订单
  const orderData = {
    orderNo: orderNo,
    userId: data.userId,
    serviceId: data.serviceId,
    serviceName: data.serviceName,
    servicePrice: data.servicePrice,
    petId: data.petId,
    petName: data.petName,
    petType: data.petType || '',
    address: data.address,
    contactName: data.contactName,
    contactPhone: data.contactPhone,
    serviceDate: data.serviceDate,
    serviceTime: data.serviceTime,
    serviceItems: data.serviceItems || [],
    remark: data.remark || '',
    totalPrice: data.totalPrice,
    status: 'pending', // pending, confirmed, completed, cancelled
    paymentStatus: 'unpaid', // unpaid, paid, refunded
    createTime: db.serverDate()
  };

  // 使用统一 orders 集合
  orderData.orderType = 'visiting';
  const result = await db.collection('orders').add({
    data: orderData
  });

  return {
    success: true,
    orderId: result._id,
    orderNo: orderNo
  };
}

// 获取用户订单列表
async function getOrders(userId) {
  if (!userId) {
    return { success: false, error: 'Missing userId' };
  }

  const result = await db.collection('orders')
    .where({ 
      userId: userId,
      orderType: 'visiting'
    })
    .orderBy('createTime', 'desc')
    .get();

  return {
    success: true,
    data: result.data.map(order => ({
      id: order._id,
      orderNo: order.orderNo,
      serviceName: order.serviceName,
      serviceDate: order.serviceDate,
      serviceTime: order.serviceTime,
      totalPrice: order.totalPrice,
      status: order.status,
      paymentStatus: order.paymentStatus
    }))
  };
}

// 获取订单详情
async function getOrderDetail(orderId) {
  if (!orderId) {
    return { success: false, error: 'Missing orderId' };
  }

  const result = await db.collection('orders').doc(orderId).get();

  if (!result.data) {
    return { success: false, error: 'Order not found' };
  }

  return {
    success: true,
    data: result.data
  };
}

// 取消订单
async function cancelOrder(orderId) {
  if (!orderId) {
    return { success: false, error: 'Missing orderId' };
  }

  await db.collection('orders').doc(orderId).update({
    data: {
      status: 'cancelled',
      cancelTime: db.serverDate(),
      updateTime: db.serverDate()
    }
  });

  return {
    success: true
  };
}

// 生成订单号
function generateOrderNo() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `VS${dateStr}${random}`;
}
