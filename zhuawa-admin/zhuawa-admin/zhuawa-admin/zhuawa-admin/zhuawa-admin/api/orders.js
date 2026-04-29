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
  try {
    let query = db.collection('orders');
    
    if (status) {
      query = query.where({ status });
    }
    
    // 先获取所有数据，看看有哪些字段
    const result = await query.limit(100).get();
    
    console.log('[API Orders] Total orders found:', result.data.length);
    
    if (result.data.length > 0) {
      // 打印第一条数据的字段，用于调试
      const firstOrder = result.data[0];
      console.log('[API Orders] First order fields:', Object.keys(firstOrder));
      console.log('[API Orders] First order:', JSON.stringify(firstOrder, null, 2));
    }
    
    // 处理数据，确保金额字段正确
    const processedData = result.data.map(order => {
      // 确保金额字段存在
      const amount = order.finalPrice || order.totalPrice || order.price || order.amount || 0;
      
      return {
        ...order,
        // 统一字段名
        amount: amount,
        finalPrice: order.finalPrice || amount,
        totalPrice: order.totalPrice || amount,
        // 统一时间字段
        createdAt: order.createdAt || order.createTime || order.createAt,
        // 统一日期字段
        appointmentDate: order.appointmentDate || order.serviceDate || order.checkinDate || '',
        appointmentTime: order.appointmentTime || order.serviceTime || ''
      };
    });
    
    // 按时间排序（降序）
    processedData.sort((a, b) => {
      const timeA = new Date(a.createdAt || 0);
      const timeB = new Date(b.createdAt || 0);
      return timeB - timeA;
    });
    
    return {
      success: true,
      data: processedData
    };
  } catch (error) {
    console.error('[API Orders] getOrders error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 获取单个订单
async function getOrderById(id) {
  try {
    const result = await db.collection('orders').doc(id).get();
    
    if (!result.data) {
      return {
        success: false,
        error: '订单不存在'
      };
    }
    
    const order = result.data;
    const amount = order.finalPrice || order.totalPrice || order.price || order.amount || 0;
    
    return {
      success: true,
      data: {
        ...order,
        amount: amount,
        finalPrice: order.finalPrice || amount,
        totalPrice: order.totalPrice || amount,
        createdAt: order.createdAt || order.createTime || order.createAt,
        appointmentDate: order.appointmentDate || order.serviceDate || order.checkinDate || '',
        appointmentTime: order.appointmentTime || order.serviceTime || ''
      }
    };
  } catch (error) {
    console.error('[API Orders] getOrderById error:', error);
    return {
      success: false,
      error: error.message
    };
  }
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
  
  // 创建订单
  const orderData = {
    orderNo,
    customerName,
    customerPhone,
    petInfo: petInfo || {},
    serviceId,
    serviceName: serviceName || '',
    technicianId: technicianId || '',
    technicianName: technicianName || '',
    appointmentDate,
    appointmentTime,
    status: 'pending',
    price: price || 0,
    address: address || '',
    remark: remark || '',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  try {
    const result = await db.collection('orders').add(orderData);
    
    // 如果指定了技师和时间，锁定排班
    if (technicianId && appointmentDate && appointmentTime) {
      try {
        await bookScheduleSlot(appointmentDate, technicianId, appointmentTime, result.id);
      } catch (err) {
        console.error('Failed to book schedule slot:', err);
      }
    }
    
    return {
      success: true,
      id: result.id,
      orderNo
    };
  } catch (error) {
    console.error('[API Orders] createOrder error:', error);
    return {
      success: false,
      error: error.message
    };
  }
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
  try {
    await db.collection('orders').doc(id).update({
      ...data,
      updatedAt: new Date()
    });
    return {
      success: true
    };
  } catch (error) {
    console.error('[API Orders] updateOrder error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 更新订单状态
async function updateOrderStatus(id, status) {
  const validStatuses = ['pending', 'confirmed', 'in_service', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return { success: false, error: 'Invalid status' };
  }
  
  try {
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
  } catch (error) {
    console.error('[API Orders] updateOrderStatus error:', error);
    return {
      success: false,
      error: error.message
    };
  }
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
  try {
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
  } catch (error) {
    console.error('[API Orders] deleteOrder error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}