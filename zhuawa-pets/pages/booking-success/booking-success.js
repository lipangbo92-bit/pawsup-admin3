// pages/booking-success/booking-success.js
Page({
  data: {
    orderId: '',
    orderNo: '',
    orderType: '',
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

    // 保存订单类型
    if (options.type) {
      this.setData({ orderType: options.type });
    }

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
        action: 'getOrderDetail',
        orderId: orderId
      }
    }).then(res => {
      if (res.result && res.result.success) {
        const order = res.result.data;

        // 根据订单类型构建显示信息
        let dateStr = '';
        let timeStr = '';

        if (order.orderType === 'boarding') {
          // 寄养预约：显示入住和退房日期
          const checkin = this.formatDate(order.checkinDate);
          const checkout = this.formatDate(order.checkoutDate);
          dateStr = `${checkin} 至 ${checkout}`;
          timeStr = `${order.nightCount || 1}晚`;
        } else if (order.orderType === 'visiting') {
          // 上门服务：显示服务日期
          dateStr = this.formatDate(order.serviceDate);
          timeStr = order.serviceTime || '';
        } else {
          // 洗护美容：显示预约日期和时间
          dateStr = this.formatDate(order.appointmentDate);
          timeStr = order.appointmentTime || '';
        }

        console.log('Order data:', order);

        // 根据订单类型构建显示信息
        let serviceName = order.serviceName || '宠物服务';
        let roomTypeName = order.roomTypeName || '';
        let showPet = true;

        if (order.orderType === 'boarding') {
          // 寄养预约：服务项目显示"狗狗寄养"或"猫咪寄养"，房型显示具体房型
          serviceName = order.petType === 'cat' ? '猫咪寄养' : '狗狗寄养';
          roomTypeName = order.roomName || order.roomTypeName || '标准间';
          showPet = false; // 寄养不显示服务宠物
          console.log('Boarding order:', { serviceName, roomTypeName, dateStr, timeStr });
        }

        this.setData({
          orderType: order.orderType,
          orderInfo: {
            service: {
              name: serviceName,
              price: order.totalPrice || 0,
              icon: order.orderType === 'boarding' ? '🏠' : (order.orderType === 'visiting' ? '🚗' : '🐕')
            },
            technician: {
              name: roomTypeName || order.technicianName || '美容师',
              avatar: order.technicianAvatar || '👤'
            },
            pet: {
              name: showPet ? (order.petName || '宠物') : '',
              type: order.petType || ''
            },
            date: {
              date: dateStr
            },
            time: timeStr,
            orderNo: order.orderNo || ''
          }
        });
      } else {
        console.error('加载订单详情失败:', res.result);
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