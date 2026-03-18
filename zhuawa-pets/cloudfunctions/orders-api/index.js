// 云函数：orders-api - 统一订单管理 API
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { action } = event;

  try {
    switch (action) {
      case 'createOrder':
        return await createOrder(event.data);
      case 'getOrders':
        return await getOrders(event.userId, event.orderType, event.status);
      case 'getOrderDetail':
        return await getOrderDetail(event.orderId);
      case 'updateOrderStatus':
        return await updateOrderStatus(event.orderId, event.status);
      case 'cancelOrder':
        return await cancelOrder(event.orderId);
      case 'getAllOrders':
        return await getAllOrders(event.filters);
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

// 创建订单
async function createOrder(data) {
  // 验证必填字段
  const requiredFields = ['userId', 'orderType', 'serviceId', 'serviceName', 'servicePrice', 'totalPrice'];
  for (const field of requiredFields) {
    if (!data[field]) {
      return { success: false, error: `Missing required field: ${field}` };
    }
  }

  // 生成订单号
  const orderNo = generateOrderNo(data.orderType);

  // 构建订单数据
  const orderData = {
    orderNo: orderNo,
    orderType: data.orderType, // service, boarding, visiting
    
    // 用户信息
    userId: data.userId,
    customerName: data.customerName || '',
    customerPhone: data.customerPhone || '',
    
    // 宠物信息
    petId: data.petId || '',
    petName: data.petName || '',
    petType: data.petType || '',
    petBreed: data.petBreed || '',
    
    // 服务信息
    serviceId: data.serviceId,
    serviceName: data.serviceName,
    servicePrice: data.servicePrice,
    
    // 根据订单类型设置不同字段
    ...(data.orderType === 'boarding' && {
      roomId: data.roomId || '',
      roomName: data.roomName || '',
      checkinDate: data.checkinDate || '',
      checkoutDate: data.checkoutDate || '',
      nightCount: data.nightCount || 1,
      petCount: data.petCount || 1
    }),
    
    ...(data.orderType === 'visiting' && {
      address: data.address || '',
      serviceDate: data.serviceDate || '',
      serviceTime: data.serviceTime || '',
      serviceOptions: data.serviceOptions || [],
      contactName: data.contactName || '',
      contactPhone: data.contactPhone || ''
    }),
    
    ...(data.orderType === 'service' && {
      appointmentDate: data.appointmentDate || '',
      appointmentTime: data.appointmentTime || '',
      technicianId: data.technicianId || '',
      technicianName: data.technicianName || ''
    }),
    
    // 金额
    totalPrice: data.totalPrice,
    discount: data.discount || 0,
    finalPrice: data.finalPrice || data.totalPrice,
    
    // 状态
    status: 'pending',
    paymentStatus: 'unpaid',
    
    // 备注
    remark: data.remark || '',
    
    // 时间戳
    createTime: db.serverDate(),
    updateTime: db.serverDate()
  };

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
async function getOrders(userId, orderType, status) {
  if (!userId) {
    return { success: false, error: 'Missing userId' };
  }

  let query = db.collection('orders').where({
    userId: userId
  });

  if (orderType) {
    query = query.where({ orderType: orderType });
  }

  if (status) {
    query = query.where({ status: status });
  }

  const result = await query.orderBy('createTime', 'desc').get();

  return {
    success: true,
    data: result.data.map(order => ({
      id: order._id,
      orderNo: order.orderNo,
      orderType: order.orderType,
      serviceName: order.serviceName,
      totalPrice: order.totalPrice,
      status: order.status,
      paymentStatus: order.paymentStatus,
      createTime: order.createTime,
      // 根据类型返回不同的时间字段
      time: order.appointmentTime || order.serviceTime || `${order.checkinDate}~${order.checkoutDate}`,
      date: order.appointmentDate || order.serviceDate || order.checkinDate
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

// 更新订单状态
async function updateOrderStatus(orderId, status) {
  if (!orderId || !status) {
    return { success: false, error: 'Missing orderId or status' };
  }

  const updateData = {
    status: status,
    updateTime: db.serverDate()
  };

  // 根据状态设置时间戳
  if (status === 'completed') {
    updateData.completeTime = db.serverDate();
  } else if (status === 'cancelled') {
    updateData.cancelTime = db.serverDate();
  }

  await db.collection('orders').doc(orderId).update({
    data: updateData
  });

  return { success: true };
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

  return { success: true };
}

// 获取所有订单（管理端使用）
async function getAllOrders(filters = {}) {
  let query = db.collection('orders');

  // 应用筛选条件
  if (filters.status) {
    query = query.where({ status: filters.status });
  }
  if (filters.orderType) {
    query = query.where({ orderType: filters.orderType });
  }
  if (filters.date) {
    // 根据订单类型查询不同日期字段
    query = query.where(_.or([
      { appointmentDate: filters.date },
      { serviceDate: filters.date },
      { checkinDate: filters.date }
    ]));
  }

  const result = await query.orderBy('createTime', 'desc').get();

  return {
    success: true,
    data: result.data
  };
}

// 生成订单号
function generateOrderNo(orderType) {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  const prefix = {
    'service': 'OR',
    'boarding': 'BD',
    'visiting': 'VS'
  }[orderType] || 'OR';
  
  return `${prefix}${dateStr}${random}`;
}
