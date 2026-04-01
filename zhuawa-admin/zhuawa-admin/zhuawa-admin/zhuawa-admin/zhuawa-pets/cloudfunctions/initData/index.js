// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openId = wxContext.OPENID

  try {
    // 初始化服务项目数据
    const services = [
      { name: '洗护套餐', price: 99, category: '洗护', description: '基础洗护+吹干', _openid: openId },
      { name: '美容造型', price: 168, category: '美容', description: '洗护+造型+剪毛', _openid: openId },
      { name: '驱虫', price: 80, category: '保健', description: '体内外驱虫', _openid: openId },
      { name: '疫苗', price: 150, category: '保健', description: '狂犬/联苗', _openid: openId },
      { name: '洗澡', price: 50, category: '洗护', description: '单纯洗澡+吹干', _openid: openId },
      { name: '修毛', price: 60, category: '美容', description: '修毛+造型', _openid: openId },
    ]

    // 初始化技师数据
    const technicians = [
      { name: '小李', avatar: 'https://img.yzcdn.cn/vant/ipad.jpeg', specialty: '美容', rating: 4.9, orders: 156 },
      { name: '小王', avatar: 'https://img.yzcdn.cn/vant/ipad.jpeg', specialty: '洗护', rating: 4.8, orders: 98 },
      { name: '阿花', avatar: 'https://img.yzcdn.cn/vant/ipad.jpeg', specialty: '驱虫', rating: 4.9, orders: 67 },
    ]

    // 初始化房型数据
    const rooms = [
      { name: '围栏/笼养', price: 88, capacity: 1, description: '适合小型犬/猫' },
      { name: '标准间', price: 168, capacity: 1, description: '适合中型犬' },
      { name: '豪华间', price: 268, capacity: 2, description: '适合大型犬/多只宠物' },
    ]

    // 写入服务项目
    for (const service of services) {
      await db.collection('services').add({ data: service })
    }

    // 写入技师
    for (const tech of technicians) {
      await db.collection('technicians').add({ data: tech })
    }

    // 写入房型
    for (const room of rooms) {
      await db.collection('rooms').add({ data: room })
    }

    return {
      success: true,
      message: '数据初始化完成'
    }
  } catch (e) {
    return {
      success: false,
      error: e
    }
  }
}
