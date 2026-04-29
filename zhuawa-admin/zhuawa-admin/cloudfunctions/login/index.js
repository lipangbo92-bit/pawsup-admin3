// cloudfunctions/login/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  try {
    // 查询是否已存在用户
    const userRes = await db.collection('users').where({
      openid: openid
    }).get()
    
    if (userRes.data.length > 0) {
      // 已存在，返回用户信息
      return {
        success: true,
        openid: openid,
        userInfo: userRes.data[0]
      }
    } else {
      // 新用户，创建用户记录
      const newUser = {
        openid: openid,
        nickname: '',
        avatar: '',
        phone: '',
        role: 'customer',
        createdAt: new Date()
      }
      
      const createRes = await db.collection('users').add({
        data: newUser
      })
      
      return {
        success: true,
        openid: openid,
        userInfo: { ...newUser, _id: createRes._id }
      }
    }
  } catch (err) {
    return {
      success: false,
      error: err.message
    }
  }
}
