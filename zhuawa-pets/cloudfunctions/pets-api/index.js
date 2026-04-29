const cloud = require('wx-server-sdk')
cloud.init({ env: 'cloud1-4gy1jyan842d73ab' })

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { action } = event
  
  console.log('pets-api called:', { action, event })

  try {
    switch (action) {
      case 'getPets':
        return await getPets(event.userId)
      case 'getPet':
        return await getPet(event.petId)
      case 'createPet':
        return await createPet(event.data)
      case 'updatePet':
        return await updatePet(event.petId, event.data)
      case 'deletePet':
        return await deletePet(event.petId)
      default:
        // 兼容旧的 HTTP API 风格调用
        return await handleHttpApi(event)
    }
  } catch (err) {
    console.error('pets-api error:', err)
    return { 
      success: false, 
      error: err.message || '服务器错误' 
    }
  }
}

// 获取宠物列表
async function getPets(userId) {
  let query = db.collection('pets')
  
  if (userId) {
    query = query.where({ userId: userId })
  }
  
  const res = await query.orderBy('createTime', 'desc').get()
  
  return { 
    success: true, 
    data: res.data 
  }
}

// 获取单个宠物
async function getPet(petId) {
  if (!petId) {
    return { success: false, error: 'Missing petId' }
  }
  
  const res = await db.collection('pets').doc(petId).get()
  return { success: true, data: res.data }
}

// 创建宠物
async function createPet(data) {
  if (!data || !data.userId) {
    return { success: false, error: 'Missing userId' }
  }
  
  const petData = {
    ...data,
    createTime: db.serverDate(),
    updateTime: db.serverDate()
  }
  
  const res = await db.collection('pets').add({ data: petData })
  return { success: true, data: { _id: res._id, ...petData } }
}

// 更新宠物
async function updatePet(petId, data) {
  if (!petId) {
    return { success: false, error: 'Missing petId' }
  }
  
  const updateData = {
    ...data,
    updateTime: db.serverDate()
  }
  
  await db.collection('pets').doc(petId).update({ data: updateData })
  return { success: true, message: '更新成功' }
}

// 删除宠物
async function deletePet(petId) {
  if (!petId) {
    return { success: false, error: 'Missing petId' }
  }
  
  await db.collection('pets').doc(petId).remove()
  return { success: true, message: '删除成功' }
}

// 兼容旧的 HTTP API 风格调用
async function handleHttpApi(event) {
  const { httpMethod, path, body } = event
  
  const getCorsHeaders = () => ({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  })
  
  if (httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: getCorsHeaders(), body: '' }
  }

  const pathParts = path.split('/').filter(p => p)
  const resource = pathParts[0]
  const resourceId = pathParts[1]
  
  if (resource !== 'pets') {
    return { statusCode: 404, headers: getCorsHeaders(), body: JSON.stringify({ error: 'Not found' }) }
  }
  
  // GET /pets
  if (httpMethod === 'GET' && !resourceId) {
    const res = await db.collection('pets').orderBy('createTime', 'desc').get()
    return { 
      statusCode: 200, 
      headers: getCorsHeaders(), 
      body: JSON.stringify({ success: true, data: res.data }) 
    }
  }
  
  // GET /pets/{id}
  if (httpMethod === 'GET' && resourceId) {
    const res = await db.collection('pets').doc(resourceId).get()
    return { statusCode: 200, headers: getCorsHeaders(), body: JSON.stringify({ success: true, data: res.data }) }
  }
  
  // POST /pets
  if (httpMethod === 'POST' && !resourceId) {
    const petData = JSON.parse(body || '{}')
    petData.createTime = db.serverDate()
    petData.updateTime = db.serverDate()
    const res = await db.collection('pets').add({ data: petData })
    return { statusCode: 201, headers: getCorsHeaders(), body: JSON.stringify({ success: true, data: { _id: res._id, ...petData } }) }
  }
  
  // PUT /pets/{id}
  if (httpMethod === 'PUT' && resourceId) {
    const petData = JSON.parse(body || '{}')
    petData.updateTime = db.serverDate()
    await db.collection('pets').doc(resourceId).update({ data: petData })
    return { statusCode: 200, headers: getCorsHeaders(), body: JSON.stringify({ success: true, message: '更新成功' }) }
  }
  
  // DELETE /pets/{id}
  if (httpMethod === 'DELETE' && resourceId) {
    await db.collection('pets').doc(resourceId).remove()
    return { statusCode: 200, headers: getCorsHeaders(), body: JSON.stringify({ success: true, message: '删除成功' }) }
  }
  
  return { statusCode: 404, headers: getCorsHeaders(), body: JSON.stringify({ error: 'Not found' }) }
}
