// Vercel API Route: /api/boarding-rooms
// 房型管理 API - 适配新数据字典（boarding_room_types + boarding_rooms）

const cloudbase = require('@cloudbase/node-sdk');

const app = cloudbase.init({
  env: 'cloud1-4gy1jyan842d73ab',
  secretId: process.env.TENCENT_SECRET_ID,
  secretKey: process.env.TENCENT_SECRET_KEY
});

const db = app.database();

module.exports = async (req, res) => {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action = 'list', data, id } = req.body || {};
  console.log(`[API BoardingRooms] Action: ${action}`);

  try {
    let result;
    switch (action) {
      case 'list':
        result = await getRoomTypes();
        break;
      case 'get':
        result = await getRoomTypeDetail(id);
        break;
      case 'add':
        result = await addRoomType(data);
        break;
      case 'update':
        result = await updateRoomType(id, data);
        break;
      case 'delete':
        result = await deleteRoomType(id);
        break;
      case 'generateRooms':
        result = await generateRooms(data);
        break;
      case 'getRoomStatus':
        result = await getRoomStatus(data);
        break;
      default:
        result = { success: false, error: 'Unknown action: ' + action };
    }
    return res.json(result);
  } catch (error) {
    console.error('[API BoardingRooms] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 获取房型列表（从 boarding_room_types 查询，并统计房间数量）
async function getRoomTypes() {
  try {
    const roomTypesResult = await db.collection('boarding_room_types').get();
    const roomTypes = roomTypesResult.data || [];
    
    // 为每个房型统计房间数量
    const roomTypesWithCount = await Promise.all(
      roomTypes.map(async (roomType) => {
        const roomsResult = await db.collection('boarding_rooms')
          .where({ roomTypeId: roomType._id })
          .get();
        
        return {
          id: roomType._id,
          _id: roomType._id,
          name: roomType.name,
          petType: roomType.petType,
          price: roomType.price,
          area: roomType.area,
          facilities: roomType.facilities || [],
          images: roomType.images || [],
          description: roomType.description,
          status: roomType.status,
          sortOrder: roomType.sortOrder || 0,
          // 统计房间数量（兼容前端字段）
          roomCount: roomsResult.data.length,
          totalRooms: roomsResult.data.length,
          createTime: roomType.createTime,
          updateTime: roomType.updateTime
        };
      })
    );
    
    return { success: true, data: roomTypesWithCount };
  } catch (error) {
    // 如果集合不存在，返回空数组
    if (error.code === 'DATABASE_COLLECTION_NOT_EXIST') {
      console.log('集合 boarding_room_types 不存在，返回空数组');
      return { success: true, data: [] };
    }
    throw error;
  }
}

// 获取房型详情
async function getRoomTypeDetail(id) {
  if (!id) {
    return { success: false, error: 'Missing id parameter' };
  }
  
  const roomTypeResult = await db.collection('boarding_room_types').doc(id).get();
  
  if (!roomTypeResult.data) {
    return { success: false, error: 'Room type not found' };
  }
  
  const roomType = roomTypeResult.data;
  
  // 获取关联的房间
  const roomsResult = await db.collection('boarding_rooms')
    .where({ roomTypeId: id })
    .get();
  
  return {
    success: true,
    data: {
      id: roomType._id,
      _id: roomType._id,
      name: roomType.name,
      petType: roomType.petType,
      price: roomType.price,
      area: roomType.area,
      facilities: roomType.facilities || [],
      images: roomType.images || [],
      description: roomType.description,
      status: roomType.status,
      sortOrder: roomType.sortOrder || 0,
      roomCount: roomsResult.data.length,
      totalRooms: roomsResult.data.length,
      rooms: roomsResult.data.map(r => ({
        id: r._id,
        roomNumber: r.roomNumber,
        status: r.status
      })),
      createTime: roomType.createTime,
      updateTime: roomType.updateTime
    }
  };
}

// 添加房型（创建 roomType + 对应 rooms）
async function addRoomType(data) {
  // 验证必填字段
  if (!data.name || !data.petType || !data.price) {
    return { success: false, error: 'Missing required fields: name, petType, price' };
  }
  
  // 1. 创建房型定义
  const roomTypeData = {
    name: data.name,
    petType: data.petType,
    price: parseFloat(data.price),
    area: data.area || '',
    facilities: data.facilities || [],
    images: data.images || [],
    description: data.description || '',
    status: data.status || 'active',
    sortOrder: data.sortOrder || 0,
    createTime: new Date(),
    updateTime: new Date()
  };
  
  const roomTypeResult = await db.collection('boarding_room_types').add(roomTypeData);
  const roomTypeId = roomTypeResult.id;
  
  // 2. 创建对应的具体房间
  const roomCountNum = parseInt(data.roomCount) || 1;
  for (let i = 1; i <= roomCountNum; i++) {
    await db.collection('boarding_rooms').add({
      roomTypeId: roomTypeId,
      roomNumber: `${i.toString().padStart(3, '0')}`,
      status: 'available',
      createTime: new Date(),
      updateTime: new Date()
    });
  }
  
  return { success: true, id: roomTypeId };
}

// 更新房型
async function updateRoomType(id, data) {
  if (!id) {
    return { success: false, error: 'Missing room type id' };
  }
  
  // 1. 更新房型定义
  const updateData = {
    updateTime: new Date()
  };
  
  if (data.name !== undefined) updateData.name = data.name;
  if (data.petType !== undefined) updateData.petType = data.petType;
  if (data.price !== undefined) updateData.price = parseFloat(data.price);
  if (data.area !== undefined) updateData.area = data.area;
  if (data.facilities !== undefined) updateData.facilities = data.facilities;
  if (data.images !== undefined) updateData.images = data.images;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
  
  await db.collection('boarding_room_types').doc(id).update(updateData);
  
  // 2. 如果需要调整房间数量
  if (data.roomCount !== undefined) {
    const currentRooms = await db.collection('boarding_rooms')
      .where({ roomTypeId: id })
      .get();
    
    const currentCount = currentRooms.data.length;
    const targetCount = parseInt(data.roomCount);
    
    if (targetCount > currentCount) {
      // 添加房间
      for (let i = currentCount + 1; i <= targetCount; i++) {
        await db.collection('boarding_rooms').add({
          roomTypeId: id,
          roomNumber: `${i.toString().padStart(3, '0')}`,
          status: 'available',
          createTime: new Date(),
          updateTime: new Date()
        });
      }
    } else if (targetCount < currentCount) {
      // 删除多余的房间（只删除空闲的）
      const roomsToDelete = currentRooms.data
        .filter(r => r.status === 'available')
        .slice(0, currentCount - targetCount);
      
      for (const room of roomsToDelete) {
        await db.collection('boarding_rooms').doc(room._id).remove();
      }
    }
  }
  
  return { success: true };
}

// 删除房型（同时删除关联的房间）
async function deleteRoomType(id) {
  if (!id) {
    return { success: false, error: 'Missing room type id' };
  }

  // 1. 检查是否有 occupied 的房间
  const occupiedRooms = await db.collection('boarding_rooms')
    .where({
      roomTypeId: id,
      status: 'occupied'
    })
    .get();

  if (occupiedRooms.data.length > 0) {
    return { success: false, error: '该房型下有入住中的房间，无法删除' };
  }

  // 2. 删除所有关联的房间
  const rooms = await db.collection('boarding_rooms')
    .where({ roomTypeId: id })
    .get();

  for (const room of rooms.data) {
    await db.collection('boarding_rooms').doc(room._id).remove();
  }

  // 3. 删除房型定义
  await db.collection('boarding_room_types').doc(id).remove();

  return { success: true };
}

// 批量生成房间
async function generateRooms(data) {
  // 兼容前端直接传参或放在 data 对象中
  const typeId = data?.typeId || data?.data?.typeId;
  const count = data?.count || data?.data?.count;
  const prefix = data?.prefix || data?.data?.prefix || '';

  if (!typeId) {
    return { success: false, error: 'Missing typeId parameter' };
  }
  if (!count || count <= 0 || count > 50) {
    return { success: false, error: 'Invalid count (1-50)' };
  }

  // 检查房型是否存在
  const roomTypeResult = await db.collection('boarding_room_types').doc(typeId).get();
  if (!roomTypeResult.data) {
    return { success: false, error: 'Room type not found' };
  }

  // 获取该房型下现有房间数量
  const existingRooms = await db.collection('boarding_rooms')
    .where({ roomTypeId: typeId })
    .get();

  const existingCount = existingRooms.data.length;
  const createdRooms = [];

  // 批量创建房间
  for (let i = 1; i <= count; i++) {
    const roomNumber = `${prefix}${existingCount + i}`;

    const roomData = {
      roomTypeId: typeId,
      roomNumber: roomNumber,
      status: 'available',
      createTime: new Date(),
      updateTime: new Date()
    };

    const result = await db.collection('boarding_rooms').add(roomData);
    createdRooms.push({
      id: result.id,
      roomNumber: roomNumber
    });
  }

  return {
    success: true,
    createdCount: createdRooms.length,
    rooms: createdRooms
  };
}

// 获取房间状态
async function getRoomStatus(data) {
  // 兼容前端直接传参或放在 data 对象中
  const typeId = data?.typeId || data?.data?.typeId;
  const date = data?.date || data?.data?.date;

  if (!typeId) {
    return { success: false, error: 'Missing typeId parameter' };
  }

  // 查询该房型下的所有房间
  const roomsResult = await db.collection('boarding_rooms')
    .where({ roomTypeId: typeId })
    .get();

  const rooms = roomsResult.data || [];

  // 如果有日期参数，查询订单信息
  let orders = [];
  if (date) {
    const ordersResult = await db.collection('orders')
      .where({
        orderType: 'boarding',
        roomTypeId: typeId,
        status: db.command.nin(['cancelled']),
        checkinDate: db.command.lte(date),
        checkoutDate: db.command.gte(date)
      })
      .get();
    orders = ordersResult.data || [];
  }

  // 组装房间状态
  const roomsWithStatus = rooms.map(room => {
    // 查找该房间的订单
    const roomOrder = orders.find(order => order.roomId === room._id);

    let status = room.status; // available, maintenance
    let petName = null;
    let checkinDate = null;
    let checkoutDate = null;

    if (roomOrder && date) {
      petName = roomOrder.petName;
      checkinDate = roomOrder.checkinDate;
      checkoutDate = roomOrder.checkoutDate;

      // 判断状态
      if (date === roomOrder.checkinDate && date === roomOrder.checkoutDate) {
        status = 'occupied';
      } else if (date === roomOrder.checkinDate) {
        status = 'checkin';
      } else if (date === roomOrder.checkoutDate) {
        status = 'checkout';
      } else {
        status = 'occupied';
      }
    }

    return {
      id: room._id,
      roomNumber: room.roomNumber,
      status: status,
      petName: petName,
      checkinDate: checkinDate,
      checkoutDate: checkoutDate
    };
  });

  return {
    success: true,
    rooms: roomsWithStatus
  };
}
