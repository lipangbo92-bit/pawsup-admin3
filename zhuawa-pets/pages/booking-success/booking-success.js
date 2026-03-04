// pages/booking-success/booking-success.js
Page({
  data: {
    // 默认模拟数据
    orderInfo: {
      service: { 
        name: '狗狗洗护套餐', 
        price: 99, 
        icon: '🐕' 
      },
      technician: { 
        name: '小美', 
        avatar: '👩' 
      },
      pet: { 
        name: '豆豆', 
        type: '柯基' 
      },
      date: { 
        date: '02月27日' 
      },
      time: '15:30',
      orderNo: '202402271530'
    }
  },

  onLoad(options) {
    // 接收传入的数据
    if (options && options.info) {
      try {
        const info = JSON.parse(decodeURIComponent(options.info));
        this.setData({
          orderInfo: info
        });
      } catch (e) {
        console.log('解析传入数据失败，使用默认数据:', e);
      }
    }
  },

  // 返回首页
  goHome() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  },

  // 查看订单/预约
  goOrders() {
    wx.switchTab({
      url: '/pages/orders/orders'
    });
  }
});
