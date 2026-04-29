// 云函数：orders-api - 统一订单管理 API
const cloud = require('wx-server-sdk');

cloud.init({
  env: 'cloud1-4gy1jyan842d73ab'
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
        return await getOrders(event.userId, event.orderType, event.status, event.paymentStatus, event.excludeStatus);
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
  console.log('createOrder start');

  // 验证必填字段
  const requiredFields = ['userId', 'orderType', 'serviceId', 'serviceName', 'servicePrice', 'totalPrice'];
  for (const field of requiredFields) {
    if (!data[field]) {
      return { success: false, error: `缺少必填字段: ${field}` };
    }
  }

  // 生成订单号
  const orderNo = generateOrderNo(data.orderType);

  // 构建基础订单数据
  const orderData = {
    orderNo: orderNo,
    orderType: data.orderType,
    userId: data.userId,
    customerName: data.customerName || '',
    customerPhone: data.customerPhone || '',
    petId: data.petId || '',
    petName: data.petName || '',
    petType: data.petType || '',
    petBreed: data.petBreed || '',
    serviceId: data.serviceId,
    serviceName: data.serviceName,
    servicePrice: data.servicePrice,
    totalPrice: data.totalPrice,
    discount: data.discount || 0,
    finalPrice: data.finalPrice || data.totalPrice,
    status: 'pending',
    paymentStatus: 'unpaid',
    remark: data.remark || '',
    createTime: db.serverDate(),
    updateTime: db.serverDate()
  };

  // 根据订单类型添加特定字段
  if (data.orderType === 'boarding') {
    orderData.roomId = data.roomId || '';
    orderData.roomName = data.roomName || '';
    orderData.checkinDate = data.checkinDate || '';
    orderData.checkoutDate = data.checkoutDate || '';
    orderData.nightCount = data.nightCount || 1;
    orderData.petCount = data.petCount || 1;
  } else if (data.orderType === 'visiting') {
    orderData.address = data.address || '';
    orderData.serviceDate = data.serviceDate || '';
    orderData.serviceTime = data.serviceTime || '';
    orderData.serviceItems = data.serviceItems || [];
    orderData.contactName = data.contactName || '';
    orderData.contactPhone = data.contactPhone || '';
  } else if (data.orderType === 'service') {
    orderData.appointmentDate = data.appointmentDate || '';
    orderData.appointmentTime = data.appointmentTime || '';
    orderData.technicianId = data.technicianId || '';
    orderData.technicianName = data.technicianName || '';
  }

  console.log('adding order to db');
  const result = await db.collection('orders').add({ data: orderData });
  console.log('order added:', result._id);

  return {
    success: true,
    orderId: result._id,
    orderNo: orderNo
  };
}

// 获取用户订单列表
async function getOrders(userId, orderType, status, paymentStatus, excludeStatus) {
  if (!userId) {
    return { success: false, error: 'Missing userId' };
  }

  console.log('getOrders params:', { userId, orderType, status, paymentStatus, excludeStatus });

  // 构建基础查询条件
  let whereCondition = {
    userId: userId
  };

  if (orderType) {
    whereCondition.orderType = orderType;
  }

  if (status) {
    whereCondition.status = status;
  }

  // 处理 paymentStatus 和 excludeStatus 的组合
  if (paymentStatus || excludeStatus) {
    const conditions = [];
    
    // paymentStatus 条件
    if (paymentStatus) {
      if (paymentStatus === 'unpaid') {
        // 兼容旧数据：paymentStatus 不存在视为 unpaid
        conditions.push(_.or([
          { paymentStatus: 'unpaid' },
          { paymentStatus: _.exists(false) }
        ]));
        console.log('Condition: paymentStatus is unpaid (or missing)');
      } else {
        conditions.push({ paymentStatus: paymentStatus });
        console.log('Condition: paymentStatus is', paymentStatus);
      }
    }
    
    // excludeStatus 条件
    if (excludeStatus) {
      if (Array.isArray(excludeStatus)) {
        conditions.push({ status: _.nin(excludeStatus) });
        console.log('Condition: status not in', excludeStatus);
      } else {
        conditions.push({ status: _.neq(excludeStatus) });
        console.log('Condition: status !=', excludeStatus);
      }
    }
    
    // 如果有多个条件，使用 _.and 组合
    if (conditions.length > 1) {
      whereCondition = _.and([whereCondition, ...conditions]);
    } else if (conditions.length === 1) {
      // 只有一个额外条件时，合并到 whereCondition
      Object.assign(whereCondition, conditions[0]);
    }
  }

  console.log('Final where condition:', JSON.stringify(whereCondition));

  const result = await db.collection('orders').where(whereCondition).orderBy('createTime', 'desc').get();

  console.log('getOrders result count:', result.data.length);

  return {
    success: true,
    data: result.data.map(order => ({
      id: order._id,
      orderNo: order.orderNo,
      orderType: order.orderType,
      serviceName: order.serviceName,
      totalPrice: order.totalPrice,
      finalPrice: order.finalPrice,
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

  // 处理订单数据，统一客户信息字段
  const processedOrders = result.data.map(order => {
    // 根据订单类型获取客户信息
    let customerName = order.customerName || '';
    let customerPhone = order.customerPhone || '';

    // 上门服务使用 contactName/contactPhone
    if (order.orderType === 'visiting') {
      customerName = order.contactName || customerName;
      customerPhone = order.contactPhone || customerPhone;
    }

    return {
      ...order,
      customerName: customerName || '未知',
      customerPhone: customerPhone
    };
  });

  return {
    success: true,
    data: processedOrders
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
