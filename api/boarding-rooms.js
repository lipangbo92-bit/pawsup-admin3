// Vercel API Route: /api/boarding-rooms
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
        result = await getRoomsList();
        break;
      case 'get':
        result = await getRoomDetail(id);
        break;
      case 'add':
        result = await addRoom(data);
        break;
      case 'update':
        result = await updateRoom(id, data);
        break;
      case 'delete':
        result = await deleteRoom(id);
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

// 获取房型列表
async function getRoomsList() {
  const result = await db.collection('boarding_rooms').get();
  const rooms = (result.data || []).map(room => ({
    id: room._id,
    name: room.name,
    petType: room.petType,
    price: room.price,
    roomCount: room.roomCount,
    area: room.area,
    facilities: room.facilities || [],
    images: room.images || [],
    description: room.description,
    status: room.status
  }));
  return { success: true, data: rooms };
}

// 获取房型详情
async function getRoomDetail(id) {
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
      area: room.area,
      facilities: room.facilities || [],
      images: room.images || [],
      description: room.description,
      status: room.status
    }
  };
}

// 添加房型
async function addRoom(data) {
  // 验证必填字段
  if (!data.name || !data.petType || !data.price) {
    return { success: false, error: 'Missing required fields' };
  }
  
  const roomData = {
    name: data.name,
    petType: data.petType,
    price: parseFloat(data.price),
    roomCount: parseInt(data.roomCount) || 1,
    area: data.area || '',
    facilities: data.facilities || [],
    images: data.images || [],
    description: data.description || '',
    status: data.status || 'active',
    createTime: new Date()
  };
  
  const result = await db.collection('boarding_rooms').add(roomData);
  return { success: true, id: result.id };
}

// 更新房型
async function updateRoom(id, data) {
  if (!id) {
    return { success: false, error: 'Missing id parameter' };
  }
  
  const updateData = {
    ...data,
    updateTime: new Date()
  };
  
  // 转换数字类型
  if (updateData.price) updateData.price = parseFloat(updateData.price);
  if (updateData.roomCount) updateData.roomCount = parseInt(updateData.roomCount);
  
  await db.collection('boarding_rooms').doc(id).update(updateData);
  return { success: true };
}

// 删除房型
async function deleteRoom(id) {
  if (!id) {
    return { success: false, error: 'Missing id parameter' };
  }
  
  await db.collection('boarding_rooms').doc(id).remove();
  return { success: true };
}
