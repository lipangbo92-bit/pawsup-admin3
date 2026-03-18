// 云函数：boarding-api - 小程序端寄养预约 API
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const { action } = event;

  try {
    switch (action) {
      case 'getRooms':
        return await getRooms(event.petType);
      case 'getRoom':
        return await getRoom(event.id);
      case 'checkRoomAvailability':
        return await checkRoomAvailability(event.roomId, event.checkinDate, event.checkoutDate);
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

// 获取房型列表（小程序端）
async function getRooms(petType) {
  let query = db.collection('boarding_rooms').where({
    status: 'active'
  });

  if (petType) {
    query = query.where({ petType: petType });
  }

  const result = await query.get();

  return {
    success: true,
    data: result.data.map(room => ({
      id: room._id,
      name: room.name,
      petType: room.petType,
      price: room.price,
      roomCount: room.roomCount,
      availableCount: room.roomCount, // 默认可用数量等于总数量
      area: room.area,
      facilities: room.facilities || [],
      images: room.images || [],
      description: room.description
    }))
  };
}

// 获取单个房型详情
async function getRoom(id) {
  if (!id) {
    return { success: false, error: 'Missing id parameter' };
  }

  const result = await db.collection('boarding_rooms').doc(id).get();

  if (!result.data) {
    return { success: false, error: 'Room not found' };
  }

  const room = result.data;
  return {
    success: true,
    data: {
      id: room._id,
      name: room.name,
      petType: room.petType,
      price: room.price,
      roomCount: room.roomCount,
      availableCount: room.roomCount,
      area: room.area,
      facilities: room.facilities || [],
      images: room.images || [],
      description: room.description,
      status: room.status
    }
  };
}

// 检查房型可用性（指定日期范围内）
async function checkRoomAvailability(roomId, checkinDate, checkoutDate) {
  if (!roomId || !checkinDate || !checkoutDate) {
    return { success: false, error: 'Missing required parameters' };
  }

  // 获取房型信息
  const roomResult = await db.collection('boarding_rooms').doc(roomId).get();
  if (!roomResult.data) {
    return { success: false, error: 'Room not found' };
  }

  const room = roomResult.data;
  const totalRooms = room.roomCount;

  // 查询该日期范围内的订单
  const ordersResult = await db.collection('boarding_orders').where({
    roomId: roomId,
    status: db.command.nin(['cancelled']),
    checkinDate: db.command.lt(checkoutDate),
    checkoutDate: db.command.gt(checkinDate)
  }).get();

  // 计算每天已占用房间数
  const occupiedCounts = {};
  const checkin = new Date(checkinDate);
  const checkout = new Date(checkoutDate);

  for (let d = new Date(checkin); d < checkout; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    occupiedCounts[dateStr] = 0;
  }

  ordersResult.data.forEach(order => {
    const orderCheckin = new Date(order.checkinDate);
    const orderCheckout = new Date(order.checkoutDate);

    for (let d = new Date(orderCheckin); d < orderCheckout; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      if (occupiedCounts[dateStr] !== undefined) {
        occupiedCounts[dateStr] += order.petCount || 1;
      }
    }
  });

  let minAvailable = totalRooms;
  for (const occupied of Object.values(occupiedCounts)) {
    const available = totalRooms - occupied;
    if (available < minAvailable) {
      minAvailable = available;
    }
  }

  return {
    success: true,
    data: {
      roomId: roomId,
      totalRooms: totalRooms,
      minAvailable: minAvailable,
      isAvailable: minAvailable > 0
    }
  };
}

// 创建寄养订单
async function createOrder(data) {
  // 验证必填字段
  const requiredFields = ['userId', 'petId', 'roomId', 'checkinDate', 'checkoutDate', 'nightCount', 'petCount', 'totalPrice'];
  for (const field of requiredFields) {
    if (!data[field]) {
      return { success: false, error: `Missing required field: ${field}` };
    }
  }
  
  // 获取房型信息
  const roomResult = await db.collection('boarding_rooms').doc(data.roomId).get();
  if (!roomResult.data) {
    return { success: false, error: 'Room not found' };
  }
  const room = roomResult.data;
  
  // 获取宠物信息
  const petResult = await db.collection('pets').doc(data.petId).get();
  if (!petResult.data) {
    return { success: false, error: 'Pet not found' };
  }
  const pet = petResult.data;
  
  // 检查房态可用性
  const availability = await checkRoomAvailability(data.roomId, data.checkinDate, data.checkoutDate);
  if (!availability.isAvailable || availability.minAvailable < data.petCount) {
    return { success: false, error: 'Room not available for selected dates' };
  }
  
  // 生成订单号
  const orderNo = generateOrderNo();
  
  // 创建订单
  const orderData = {
    orderNo: orderNo,
    userId: data.userId,
    petId: data.petId,
    petSnapshot: {
      name: pet.name,
      type: pet.type,
      breed: pet.breed,
      weight: pet.weight,
      avatar: pet.avatar || ''
    },
    roomId: data.roomId,
    roomSnapshot: {
      name: room.name,
      price: room.price,
      description: room.description
    },
    checkinDate: data.checkinDate,
    checkoutDate: data.checkoutDate,
    nightCount: data.nightCount,
    petCount: data.petCount,
    totalPrice: data.totalPrice,
    remark: data.remark || '',
    status: 'pending', // pending, confirmed, checked_in, checked_out, cancelled
    paymentStatus: 'unpaid', // unpaid, paid, refunded
    createTime: db.serverDate()
  };
  
  const result = await db.collection('boarding_orders').add({
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
  
  const result = await db.collection('boarding_orders')
    .where({ userId: userId })
    .orderBy('createTime', 'desc')
    .get();
  
  return {
    success: true,
    data: result.data.map(order => ({
      id: order._id,
      orderNo: order.orderNo,
      roomName: order.roomSnapshot.name,
      petName: order.petSnapshot.name,
      checkinDate: order.checkinDate,
      checkoutDate: order.checkoutDate,
      nightCount: order.nightCount,
      petCount: order.petCount,
      totalPrice: order.totalPrice,
      status: order.status,
      paymentStatus: order.paymentStatus,
      createTime: order.createTime
    }))
  };
}

// 获取订单详情
async function getOrderDetail(orderId) {
  if (!orderId) {
    return { success: false, error: 'Missing orderId' };
  }
  
  const result = await db.collection('boarding_orders').doc(orderId).get();
  
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
  
  await db.collection('boarding_orders').doc(orderId).update({
    data: {
      status: 'cancelled',
      cancelTime: db.serverDate()
    }
  });
  
  return {
    success: true
  };
}

// 检查房态可用性
async function checkRoomAvailability(roomId, checkinDate, checkoutDate) {
  const roomResult = await db.collection('boarding_rooms').doc(roomId).get();
  if (!roomResult.data) {
    return { isAvailable: false, minAvailable: 0 };
  }
  
  const room = roomResult.data;
  const totalRooms = room.roomCount;
  
  // 查询该日期范围内的订单
  const ordersResult = await db.collection('boarding_orders').where({
    roomId: roomId,
    status: db.command.nin(['cancelled']),
    checkinDate: db.command.lt(checkoutDate),
    checkoutDate: db.command.gt(checkinDate)
  }).get();
  
  // 计算每天已占用房间数
  const occupiedCounts = {};
  const checkin = new Date(checkinDate);
  const checkout = new Date(checkoutDate);
  
  for (let d = new Date(checkin); d < checkout; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    occupiedCounts[dateStr] = 0;
  }
  
  ordersResult.data.forEach(order => {
    const orderCheckin = new Date(order.checkinDate);
    const orderCheckout = new Date(order.checkoutDate);
    
    for (let d = new Date(orderCheckin); d < orderCheckout; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      if (occupiedCounts[dateStr] !== undefined) {
        occupiedCounts[dateStr] += order.petCount || 1;
      }
    }
  });
  
  let minAvailable = totalRooms;
  for (const occupied of Object.values(occupiedCounts)) {
    const available = totalRooms - occupied;
    if (available < minAvailable) {
      minAvailable = available;
    }
  }
  
  return {
    isAvailable: minAvailable > 0,
    minAvailable: minAvailable
  };
}

// 生成订单号
function generateOrderNo() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `BD${dateStr}${random}`;
}
