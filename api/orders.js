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
        result = await getOrders(status, date);
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
async function getOrders(status, date) {
  let query = db.collection('orders');
  
  if (status) {
    query = query.where({ status });
  }
  if (date) {
    query = query.where({ appointmentDate: date });
  }
  
  const result = await query.orderBy('createdAt', 'desc').get();
  return {
    success: true,
    data: result.data
  };
}

// 获取单个订单
async function getOrderById(id) {
  const result = await db.collection('orders').doc(id).get();
  return {
    success: true,
    data: result.data
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
