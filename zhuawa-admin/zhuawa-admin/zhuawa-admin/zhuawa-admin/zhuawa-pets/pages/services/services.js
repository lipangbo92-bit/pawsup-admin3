// pages/services/services.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    currentCategory: 0,
    categories: ['推荐', '基础护理', '美容', 'SPA', '寄养', '医疗', '周边'],
    services: [
      // 推荐
      [
        {
          id: 'dog-bath',
          name: '狗狗基础洗护',
          desc: '洗澡、吹干、基础清理，约60分钟',
          price: '99',
          unit: '起',
          iconText: '🐕',
          iconClass: 'icon-orange'
        },
        {
          id: 'cat-bath',
          name: '猫咪轻柔洗护',
          desc: '轻柔沐浴、精细护理，约90分钟',
          price: '129',
          unit: '起',
          iconText: '🐱',
          iconClass: 'icon-pink'
        },
        {
          id: 'beauty',
          name: '美容造型',
          desc: '专业造型、精细修剪，约120分钟',
          price: '199',
          unit: '起',
          iconText: '✂️',
          iconClass: 'icon-purple'
        },
        {
          id: 'boarding',
          name: '宠物寄养',
          desc: '舒适笼位、每日运动、专业陪玩',
          price: '80',
          unit: '/晚',
          iconText: '🏠',
          iconClass: 'icon-blue'
        },
        {
          id: 'pickup',
          name: '上门接送',
          desc: '专车接送、安全保障、方便快捷',
          price: '30',
          unit: '/次',
          iconText: '🚗',
          iconClass: 'icon-green'
        }
      ],
      // 基础护理
      [
        {
          id: 'basic-dog',
          name: '狗狗洗护套餐',
          desc: '洗澡、吹干、剪指甲、清耳朵',
          price: '99',
          unit: '起',
          iconText: '🛁',
          iconClass: 'icon-orange'
        },
        {
          id: 'basic-cat',
          name: '猫咪洗护套餐',
          desc: '洗澡、吹干、梳毛、清耳朵',
          price: '129',
          unit: '起',
          iconText: '🧼',
          iconClass: 'icon-pink'
        },
        {
          id: 'nail-trim',
          name: '单独剪指甲',
          desc: '专业修剪、打磨光滑',
          price: '29',
          unit: '/次',
          iconText: '💅',
          iconClass: 'icon-yellow'
        }
      ],
      // 美容
      [
        {
          id: 'grooming-basic',
          name: '基础美容',
          desc: '洗澡、修剪、造型',
          price: '168',
          unit: '起',
          iconText: '✂️',
          iconClass: 'icon-purple'
        },
        {
          id: 'grooming-premium',
          name: '精致美容',
          desc: '全身造型、精修细节',
          price: '298',
          unit: '起',
          iconText: '💇',
          iconClass: 'icon-indigo'
        }
      ],
      // SPA
      [
        {
          id: 'spa-basic',
          name: '基础SPA',
          desc: '精油按摩、药浴',
          price: '188',
          unit: '起',
          iconText: '🧘',
          iconClass: 'icon-teal'
        },
        {
          id: 'spa-luxury',
          name: '奢华SPA',
          desc: '全身护理、顶级精油',
          price: '388',
          unit: '起',
          iconText: '💎',
          iconClass: 'icon-cyan'
        }
      ],
      // 寄养
      [
        {
          id: 'boarding-standard',
          name: '标准寄养',
          desc: '舒适笼位、每日遛弯',
          price: '80',
          unit: '/晚',
          iconText: '🏨',
          iconClass: 'icon-blue'
        },
        {
          id: 'boarding-vip',
          name: 'VIP寄养',
          desc: '独立房间、专属陪护',
          price: '168',
          unit: '/晚',
          iconText: '👑',
          iconClass: 'icon-violet'
        }
      ],
      // 医疗
      [
        {
          id: 'checkup',
          name: '健康体检',
          desc: '基础体检项目',
          price: '128',
          unit: '起',
          iconText: '🏥',
          iconClass: 'icon-red'
        },
        {
          id: 'vaccine',
          name: '疫苗接种',
          desc: '各类宠物疫苗',
          price: '88',
          unit: '起',
          iconText: '💉',
          iconClass: 'icon-green'
        }
      ],
      // 周边
      [
        {
          id: 'pickup-service',
          name: '上门接送',
          desc: '专车接送、安全保障',
          price: '30',
          unit: '/次',
          iconText: '🚕',
          iconClass: 'icon-green'
        },
        {
          id: 'pet-food',
          name: '宠物食品',
          desc: '优质猫粮狗粮',
          price: '58',
          unit: '起',
          iconText: '🍖',
          iconClass: 'icon-lime'
        }
      ]
    ]
  },

  /**
   * 切换分类
   */
  switchCategory(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      currentCategory: index,
      categoryScrollTop: 0
    });
  },

  /**
   * 返回上一页
   */
  goBack() {
    wx.navigateBack({
      delta: 1
    });
  },

  /**
   * 预约服务
   */
  bookService(e) {
    const serviceId = e.currentTarget.dataset.service;
    console.log('预约服务:', serviceId);
    // 跳转到预约时间页面
    wx.navigateTo({
      url: `/pages/booking-time-1/booking-time-1?service=${serviceId}`
    });
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 从云数据库读取服务列表
    const db = wx.cloud.database()
    db.collection('services').get().then(res => {
      console.log('services data:', res.data)
      this.setData({ services: res.data })
    }).catch(err => {
      console.log('error:', err)
    })

    // 可以从options中获取参数
    if (options.category) {
      const categoryIndex = this.data.categories.indexOf(options.category);
      if (categoryIndex !== -1) {
        this.setData({
          currentCategory: categoryIndex
        });
      }
    }
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  }
})
