// 云函数：boarding-api - 小程序端寄养预约 API（新版，适配数据字典）
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
      case 'getRoomTypes':
        return await getRoomTypes(event.petType);
      case 'getRoomType':
        return await getRoomType(event.id);
      case 'checkAvailability':
        return await checkAvailability(event.roomTypeId, event.checkinDate, event.checkoutDate);
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

// 获取房型列表（从 boarding_room_types 查询）
async function getRoomTypes(petType) {
  let query = db.collection('boarding_room_types').where({
    status: 'active'
  });

  if (petType) {
    query = query.where({ petType: petType });
  }

  const result = await query.orderBy('sortOrder', 'asc').get();

  // 为每个房型统计房间数量
  const roomTypesWithCount = await Promise.all(
    result.data.map(async (roomType) => {
      // 获取该房型下所有房间
      const rooms = await db.collection('boarding_rooms')
        .where({ 
          roomTypeId: roomType._id,
          status: 'available'
        })
        .get();
      
      const totalRooms = rooms.data.length;

      return {
        id: roomType._id,
        name: roomType.name,
        petType: roomType.petType,
        price: roomType.price,
        area: roomType.area,
        facilities: roomType.facilities || [],
        images: roomType.images || [],
        description: roomType.description,
        totalRooms: totalRooms,
        availableRooms: totalRooms // 默认可用等于总数，实际需根据日期计算
      };
    })
  );

  return {
    success: true,
    data: roomTypesWithCount
  };
}

// 获取单个房型详情
async function getRoomType(id) {
  if (!id) {
    return { success: false, error: 'Missing id parameter' };
  }

  const result = await db.collection('boarding_room_types').doc(id).get();

  if (!result.data) {
    return { success: false, error: 'Room type not found' };
  }

  const roomType = result.data;
  
  // 获取该房型下所有房间
  const rooms = await db.collection('boarding_rooms')
    .where({ roomTypeId: roomType._id })
    .get();

  return {
    success: true,
    data: {
      id: roomType._id,
      name: roomType.name,
      petType: roomType.petType,
      price: roomType.price,
      area: roomType.area,
      facilities: roomType.facilities || [],
      images: roomType.images || [],
      description: roomType.description,
      totalRooms: rooms.data.length,
      rooms: rooms.data.map(r => ({
        id: r._id,
        roomNumber: r.roomNumber,
        status: r.status
      }))
    }
  };
}

// 检查房型可用性（指定日期范围内）
async function checkAvailability(roomTypeId, checkinDate, checkoutDate) {
  if (!roomTypeId || !checkinDate || !checkoutDate) {
    return { success: false, error: 'Missing required parameters' };
  }

  // 获取该房型下所有房间
  const roomsResult = await db.collection('boarding_rooms')
    .where({ roomTypeId: roomTypeId })
    .get();
  
  const roomIds = roomsResult.data.map(r => r._id);
  const totalRooms = roomIds.length;

  if (totalRooms === 0) {
    return { success: true, data: { roomTypeId, totalRooms: 0, minAvailable: 0, isAvailable: false } };
  }

  // 查询该日期范围内的订单（使用统一 orders 集合）
  const ordersResult = await db.collection('orders').where({
    orderType: 'boarding',
    roomTypeId: roomTypeId,
    status: _.nin(['cancelled']),
    checkinDate: _.lt(checkoutDate),
    checkoutDate: _.gt(checkinDate)
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
      roomTypeId: roomTypeId,
      totalRooms: totalRooms,
      minAvailable: minAvailable,
      isAvailable: minAvailable > 0
    }
  };
}

// 创建寄养订单（使用统一 orders 集合）
async function createOrder(data) {
  // 验证必填字段
  const requiredFields = ['userId', 'petId', 'roomTypeId', 'checkinDate', 'checkoutDate', 'nightCount', 'petCount', 'totalPrice'];
  for (const field of requiredFields) {
    if (!data[field]) {
      return { success: false, error: `Missing required field: ${field}` };
    }
  }
  
  // 获取房型信息
  const roomTypeResult = await db.collection('boarding_room_types').doc(data.roomTypeId).get();
  if (!roomTypeResult.data) {
    return { success: false, error: 'Room type not found' };
  }
  const roomType = roomTypeResult.data;
  
  // 获取宠物信息
  const petResult = await db.collection('pets').doc(data.petId).get();
  if (!petResult.data) {
    return { success: false, error: 'Pet not found' };
  }
  const pet = petResult.data;
  
  // 检查房态可用性
  const availability = await checkAvailability(data.roomTypeId, data.checkinDate, data.checkoutDate);
  if (!availability.data.isAvailable || availability.data.minAvailable < data.petCount) {
    return { success: false, error: 'Room not available for selected dates' };
  }
  
  // 生成订单号
  const orderNo = generateOrderNo();
  
  // 创建订单（使用统一 orders 集合，符合数据字典）
  const orderData = {
    // 基础字段
    orderNo: orderNo,
    orderType: 'boarding',
    
    // 用户信息
    userId: data.userId,
    customerName: data.customerName || '',
    customerPhone: data.customerPhone || '',
    
    // 宠物信息（扁平化）
    petId: data.petId,
    petName: pet.name,
    petType: pet.type,
    petBreed: pet.breed,
    petWeight: pet.weight,
    
    // 服务信息
    serviceId: data.roomTypeId,  // 房型ID作为服务ID
    serviceName: roomType.name,
    servicePrice: roomType.price,
    
    // 寄养特有字段
    roomTypeId: data.roomTypeId,
    roomTypeName: roomType.name,
    roomId: '',  // 待商家分配具体房间
    roomNumber: '',
    checkinDate: data.checkinDate,
    checkoutDate: data.checkoutDate,
    nightCount: data.nightCount,
    petCount: data.petCount || 1,
    
    // 金额
    totalPrice: data.totalPrice,
    finalPrice: data.finalPrice || data.totalPrice,
    discount: data.discount || 0,
    
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
async function getOrders(userId) {
  if (!userId) {
    return { success: false, error: 'Missing userId' };
  }
  
  const result = await db.collection('orders')
    .where({ 
      userId: userId,
      orderType: 'boarding'
    })
    .orderBy('createTime', 'desc')
    .get();
  
  return {
    success: true,
    data: result.data.map(order => ({
      id: order._id,
      orderNo: order.orderNo,
      roomTypeName: order.roomTypeName,
      roomNumber: order.roomNumber,
      petName: order.petName,
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
  return `BD${dateStr}${random}`;
}
