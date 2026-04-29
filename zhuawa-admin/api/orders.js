// Vercel API Route: /api/orders
// 订单管理 API - 处理顾客下单和订单状态

const cloudbase = require('@cloudbase/node-sdk');

const app = cloudbase.init({
  env: 'cloud1-4gy1jyan842d73ab',
  secretId: process.env.TENCENT_SECRET_ID,
  secretKey: process.env.TENCENT_SECRET_KEY
});

const db = app.database();

module.exports = async (req, res) => {
  // 处理 CORS 预检
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  const { action = 'list', data, id, status, date } = req.body || {};
  
  console.log(`[API Orders] Action: ${action}`);

  try {
    let result;
    
    switch (action) {
      case 'list':
        const { orderType } = req.body || {};
        result = await getOrders(status, date, orderType);
        break;
      case 'getById':
        result = await getOrderById(id);
        break;
      case 'create':
        result = await createOrder(data);
        break;
      case 'update':
        result = await updateOrder(id, data);
        break;
      case 'updateStatus':
        result = await updateOrderStatus(id, data.status);
        break;
      case 'delete':
        result = await deleteOrder(id);
        break;
      default:
        result = { success: false, error: 'Unknown action: ' + action };
    }

    return res.json(result);
  } catch (error) {
    console.error('[API Orders] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 获取订单列表
async function getOrders(status, date, orderType) {
  let query = db.collection('orders');

  if (status) {
    query = query.where({ status });
  }
  if (date) {
    query = query.where({ appointmentDate: date });
  }
  if (orderType) {
    query = query.where({ orderType });
  }

  const result = await query.orderBy('createdAt', 'desc').get();

  // 处理订单数据，统一客户信息字段
  console.log('[API Orders] Raw orders count:', result.data.length);
  if (result.data.length > 0) {
    console.log('[API Orders] First order:', JSON.stringify(result.data[0], null, 2));
  }

  // 获取所有订单的 userId，用于查询用户信息
  const userIds = [...new Set(result.data.map(order => order.userId).filter(id => id))];
  console.log('[API Orders] 需要查询的用户ID:', userIds);

  // 批量查询用户信息
  const userMap = await getUsersInfo(userIds);
  console.log('[API Orders] 用户信息映射:', userMap);

  const processedOrders = result.data.map(order => {
    let customerName = '';
    let customerPhone = '';

    // 优先使用订单中保存的客户信息
    if (order.customerName && order.customerName !== '未知') {
      customerName = order.customerName;
      customerPhone = order.customerPhone || '';
    }
    // 如果没有，根据 userId 查询用户信息
    else if (order.userId && userMap[order.userId]) {
      const userInfo = userMap[order.userId];
      customerName = userInfo.nickName || userInfo.nickname || '未知';
      customerPhone = userInfo.phone || userInfo.phoneNumber || '';
    }
    // 上门服务特殊处理
    else if (order.orderType === 'visiting') {
      customerName = order.contactName || '未知';
      customerPhone = order.contactPhone || '';
    }
    // 最后 fallback
    else {
      customerName = order.petName || '未知';
      customerPhone = order.customerPhone || '';
    }

    console.log(`[API Orders] Order ${order.orderNo}: userId=${order.userId}, customerName=${customerName}, customerPhone=${customerPhone}`);

    return {
      ...order,
      petName: order.petName || '',
      customerName,
      customerPhone
    };
  });

  return {
    success: true,
    data: processedOrders
  };
}

// 批量查询用户信息
async function getUsersInfo(userIds) {
  if (!userIds || userIds.length === 0) {
    return {};
  }

  const userMap = {};

  try {
    // 由于云开发数据库限制，需要分批查询（每次最多 20 个）
    const batchSize = 20;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);

      // 查询 users 集合
      const usersResult = await db.collection('users')
        .where({
          _openid: db.command.in(batch)
        })
        .get();

      console.log(`[API Orders] 查询用户结果 (${i}-${i + batch.length}):`, usersResult.data.length);

      usersResult.data.forEach(user => {
        userMap[user._openid] = {
          nickName: user.nickName || user.nickname,
          phone: user.phone || user.phoneNumber
        };
      });
    }
  } catch (err) {
    console.error('[API Orders] 查询用户信息失败:', err);
  }

  return userMap;
}

// 获取单个订单
async function getOrderById(id) {
  const result = await db.collection('orders').doc(id).get();
  const order = result.data;

  if (!order) {
    return { success: false, error: 'Order not found' };
  }

  // 如果订单没有客户信息，根据 userId 查询
  if ((!order.customerName || order.customerName === '未知') && order.userId) {
    try {
      const userResult = await db.collection('users')
        .where({ _openid: order.userId })
        .get();

      if (userResult.data.length > 0) {
        const userInfo = userResult.data[0];
        order.customerName = userInfo.nickName || userInfo.nickname || '未知';
        order.customerPhone = userInfo.phone || userInfo.phoneNumber || '';
      }
    } catch (err) {
      console.error('[API Orders] 查询单个订单用户信息失败:', err);
    }
  }

  return {
    success: true,
    data: order
  };
}

// 创建订单
async function createOrder(data) {
  const {
    customerName,
    customerPhone,
    petInfo,
    serviceId,
    serviceName,
    technicianId,
    technicianName,
    appointmentDate,
    appointmentTime,
    price,
    address,
    remark
  } = data;

  // 验证必填字段
  if (!customerName || !customerPhone || !serviceId || !appointmentDate || !appointmentTime) {
    return { success: false, error: 'Missing required fields' };
  }

  // 生成订单号
  const orderNo = 'ORD' + Date.now();

  // 创建订单 - 同时存储 petName/petType 字段以兼容统一订单结构
  const orderData = {
    orderNo,
    customerName,
    customerPhone,
    // 统一订单字段结构
    petName: petInfo?.name || '',
    petType: petInfo?.type || '',
    // 保留 petInfo 对象以兼容旧数据
    petInfo: petInfo || {},
    serviceId,
    serviceName: serviceName || '',
    technicianId: technicianId || '',
    technicianName: technicianName || '',
    appointmentDate,
    appointmentTime,
    status: 'pending', // pending, confirmed, in_service, completed, cancelled
    price: price || 0,
    address: address || '',
    remark: remark || '',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  const result = await db.collection('orders').add(orderData);
  
  // 如果指定了技师和时间，锁定排班
  if (technicianId && appointmentDate && appointmentTime) {
    try {
      await bookScheduleSlot(appointmentDate, technicianId, appointmentTime, result.id);
    } catch (err) {
      console.error('Failed to book schedule slot:', err);
      // 订单创建成功但排班锁定失败，可以后续手动处理
    }
  }
  
  return {
    success: true,
    id: result.id,
    orderNo
  };
}

// 锁定排班时间段
async function bookScheduleSlot(date, technicianId, time, orderId) {
  const schedule = await db.collection('schedules')
    .where({ date, technicianId })
    .get();
  
  if (schedule.data.length === 0) {
    throw new Error('Schedule not found');
  }
  
  const scheduleId = schedule.data[0]._id;
  const timeSlots = schedule.data[0].timeSlots || [];
  
  const slotIndex = timeSlots.findIndex(slot => slot.time === time);
  if (slotIndex === -1) {
    throw new Error('Time slot not found');
  }
  
  if (!timeSlots[slotIndex].available) {
    throw new Error('Time slot already booked');
  }
  
  timeSlots[slotIndex].available = false;
  timeSlots[slotIndex].orderId = orderId;
  
  await db.collection('schedules').doc(scheduleId).update({
    timeSlots,
    updatedAt: new Date()
  });
}

// 更新订单
async function updateOrder(id, data) {
  await db.collection('orders').doc(id).update({
    ...data,
    updatedAt: new Date()
  });
  return {
    success: true
  };
}

// 更新订单状态
async function updateOrderStatus(id, status) {
  const validStatuses = ['pending', 'confirmed', 'in_service', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return { success: false, error: 'Invalid status' };
  }
  
  const order = await db.collection('orders').doc(id).get();
  const oldStatus = order.data?.status;
  
  await db.collection('orders').doc(id).update({
    status,
    updatedAt: new Date()
  });
  
  // 如果取消订单，释放排班
  if (status === 'cancelled' && oldStatus !== 'cancelled') {
    try {
      const orderData = order.data;
      if (orderData.technicianId && orderData.appointmentDate && orderData.appointmentTime) {
        await releaseScheduleSlot(
          orderData.appointmentDate,
          orderData.technicianId,
          orderData.appointmentTime
        );
      }
    } catch (err) {
      console.error('Failed to release schedule slot:', err);
    }
  }
  
  return {
    success: true
  };
}

// 释放排班时间段
async function releaseScheduleSlot(date, technicianId, time) {
  const schedule = await db.collection('schedules')
    .where({ date, technicianId })
    .get();
  
  if (schedule.data.length === 0) return;
  
  const scheduleId = schedule.data[0]._id;
  const timeSlots = schedule.data[0].timeSlots || [];
  
  const slotIndex = timeSlots.findIndex(slot => slot.time === time);
  if (slotIndex === -1) return;
  
  timeSlots[slotIndex].available = true;
  timeSlots[slotIndex].orderId = null;
  
  await db.collection('schedules').doc(scheduleId).update({
    timeSlots,
    updatedAt: new Date()
  });
}

// 删除订单
async function deleteOrder(id) {
  // 先获取订单信息，释放排班
  const order = await db.collection('orders').doc(id).get();
  if (order.data) {
    const orderData = order.data;
    if (orderData.technicianId && orderData.appointmentDate && orderData.appointmentTime) {
      try {
        await releaseScheduleSlot(
          orderData.appointmentDate,
          orderData.technicianId,
          orderData.appointmentTime
        );
      } catch (err) {
        console.error('Failed to release schedule slot:', err);
      }
    }
  }
  
  await db.collection('orders').doc(id).remove();
  return {
    success: true
  };
}
