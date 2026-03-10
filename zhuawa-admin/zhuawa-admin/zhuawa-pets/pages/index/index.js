Page({
  data: {
    // 定位信息
    location: '北京市',
    // 未读消息数
    unreadCount: 3,
    
    // Banner轮播图数据
    banners: [
      {
        id: 1,
        title: '新店开业优惠',
        subtitle: '首单立减50元，限时特惠',
        bgColor: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)'
      },
      {
        id: 2,
        title: '金牌技师在线',
        subtitle: '专业洗护，品质保证',
        bgColor: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
      },
      {
        id: 3,
        title: '会员专享',
        subtitle: '充值享8折，优惠多多',
        bgColor: 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
      }
    ],
    
    // 快速预约数据
    quickBooks: [
      {
        id: 1,
        name: '洗护美容',
        bgColor: '#F97316',
        desc: '洗护·美容·剪指甲',
        icon: '🛁'
      },
      {
        id: 2,
        name: '寄养日托',
        bgColor: '#3B82F6',
        desc: '24h看护·监控',
        icon: '✂️'
      },
      {
        id: 3,
        name: '上门服务',
        bgColor: '#10B981',
        desc: '专业·便捷·安心',
        icon: '🏠'
      }
    ],
    
    // 金牌技师推荐数据
    technicians: [
      {
        id: 1,
        name: '王师傅',
        avatar: '👨',
        skill: '擅长：猫咪洗澡、美容造型',
        rating: 4.9,
        orders: 328
      },
      {
        id: 2,
        name: '李师傅',
        avatar: '👩',
        skill: '擅长：大型犬洗护、SPA',
        rating: 4.8,
        orders: 256
      },
      {
        id: 3,
        name: '张师傅',
        avatar: '👨‍🦱',
        skill: '擅长：宠物造型、染色',
        rating: 4.9,
        orders: 412
      }
    ],
    
    // 热门服务数据
    services: [
      {
        id: 1,
        name: '洗澡',
        price: '39',
        icon: '🚿'
      },
      {
        id: 2,
        name: '美容',
        price: '69',
        icon: '✂️'
      },
      {
        id: 3,
        name: '寄养',
        price: '59',
        icon: '🏨'
      },
      {
        id: 4,
        name: '驱虫',
        price: '29',
        icon: '💊'
      }
    ]
  },

  onLoad() {
    // 页面加载时的逻辑
    console.log('首页加载完成')

    // 从云数据库读取技师列表
    const db = wx.cloud.database()
    db.collection('technicians').get().then(res => {
      this.setData({ technicians: res.data })
    })
  },

  onShow() {
    // 页面显示时的逻辑
  },

  // 点击定位
  onLocationTap() {
    console.log("navigating to services"), wx.switchTab({ url: '/pages/services/services' })
  },

  // 点击搜索
  onSearchTap() {
    console.log("navigating to services"), wx.switchTab({ url: '/pages/services/services' })
  },

  // 点击消息
  onMessageTap() {
    console.log("navigating to services"), wx.switchTab({ url: '/pages/services/services' })
  },

  // 点击快速预约
  onQuickBookTap(e) {
    const item = e.currentTarget.dataset.item
    if (item.id === 2) {
      wx.navigateTo({ url: '/pages/boarding/boarding' })
    } else if (item.id === 3) {
      wx.navigateTo({ url: '/pages/visiting/visiting' })
    } else {
      wx.switchTab({ url: '/pages/services/services' })
    }
  },

  // 点击技师
  onTechnicianTap(e) {
    const id = e.currentTarget.dataset.id
    console.log("navigating to services"), wx.switchTab({ url: '/pages/services/services' })
  },

  // 查看更多技师
  onMoreTechnicians() {
    console.log("navigating to services"), wx.switchTab({ url: '/pages/services/services' })
  },

  // 点击服务
  onServiceTap(e) {
    const id = e.currentTarget.dataset.id
    console.log("navigating to services"), wx.switchTab({ url: '/pages/services/services' })
  },

  // 查看全部服务
  onMoreServices() {
    console.log("navigating to services"), wx.switchTab({ url: '/pages/services/services' })
  }
})
