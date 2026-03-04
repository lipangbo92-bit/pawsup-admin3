// pages/booking-confirm/booking-confirm.js
Page({
  data: {
    info: {
      service: {
        id: 1,
        name: '狗狗洗护套餐',
        price: 99,
        icon: '🐕'
      },
      technician: {
        id: 1,
        name: '小美',
        avatar: '👩',
        rating: 4.8
      },
      pet: {
        id: 1,
        name: '豆豆',
        type: '柯基'
      },
      date: {
        date: '2月27日',
        fullDate: '2024年2月27日'
      },
      time: '15:30',
      duration: 60  // 分钟
    }
  },

  onLoad(options) {
    // 解析从上一页传递过来的info参数
    if (options.info) {
      try {
        const info = JSON.parse(decodeURIComponent(options.info));
        // 合并默认数据和传入的数据，确保所有字段都存在
        this.setData({
          info: {
            ...this.data.info,
            ...info,
            // 确保嵌套对象也合并
            service: { ...this.data.info.service, ...(info.service || {}) },
            technician: { ...this.data.info.technician, ...(info.technician || {}) },
            pet: { ...this.data.info.pet, ...(info.pet || {}) },
            date: { ...this.data.info.date, ...(info.date || {}) }
          }
        });
      } catch (e) {
        console.error('解析预约信息失败:', e);
        // 使用默认数据（已在data中定义）
      }
    }
    // 如果没有传参，使用默认的模拟数据
  },

  // 返回上一页
  handleBack() {
    wx.navigateBack({
      delta: 1,
      fail: () => {
        // 如果返回失败，跳转到首页
        wx.switchTab({
          url: '/pages/index/index'
        });
      }
    });
  },

  // 确认支付
  handleConfirm() {
    wx.showLoading({
      title: '处理中...',
      mask: true
    });

    // 模拟支付请求
    setTimeout(() => {
      wx.hideLoading();
      
      // 跳转到预约成功页面
      wx.redirectTo({
        url: '/pages/booking-success/booking-success'
      });
    }, 1500);
  }
});
