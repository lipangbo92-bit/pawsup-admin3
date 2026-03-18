// pages/booking-success/booking-success.js
Page({
  data: {
    orderId: '',
    orderNo: '',
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
    // 支持两种方式传参：
    // 1. info - 完整的预约信息（从booking-time直接跳转）
    // 2. orderId + orderNo - 订单ID（从booking-confirm跳转）
    
    if (options.info) {
      try {
        const info = JSON.parse(decodeURIComponent(options.info));
        this.setData({ orderInfo: info });
      } catch (e) {
        console.log('解析传入数据失败:', e);
      }
    } else if (options.orderId) {
      this.setData({
        orderId: options.orderId,
        orderNo: options.orderNo || ''
      });
      this.loadOrderDetail(options.orderId);
    }
  },

  // 加载订单详情
  loadOrderDetail(orderId) {
    wx.cloud.callFunction({
      name: 'orders-api',
      data: {
        httpMethod: 'GET',
        path: `/orders/${orderId}`
      }
    }).then(res => {
      if (res.result.success) {
        const order = res.result.data;
        this.setData({
          orderInfo: {
            service: {
              name: order.serviceName || '宠物服务',
              price: order.totalPrice || 0,
              icon: '🐕'
            },
            technician: {
              name: order.technicianName || '美容师',
              avatar: order.technicianAvatar || '👤'
            },
            pet: {
              name: order.petName || '宠物',
              type: order.petType || ''
            },
            date: {
              date: this.formatDate(order.appointmentDate)
            },
            time: order.appointmentTime || '',
            orderNo: order.orderNo || ''
          }
        });
      }
    }).catch(err => {
      console.error('加载订单详情失败:', err);
    });
  },

  // 格式化日期
  formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${month}月${day}日`;
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
