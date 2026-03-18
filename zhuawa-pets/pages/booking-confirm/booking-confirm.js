// pages/booking-confirm/booking-confirm.js
Page({
  data: {
    info: {
      service: {
        id: 1,
        name: '狗狗洗护套餐',
        price: 99,
        icon: '🐕',
        duration: 60
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
        fullDate: '2024-02-27'
      },
      time: '15:30',
      totalPrice: 99
    },
    submitting: false,
    remark: ''
  },

  onLoad(options) {
    if (options.info) {
      try {
        const info = JSON.parse(decodeURIComponent(options.info));
        this.setData({
          info: {
            ...this.data.info,
            ...info,
            service: { ...this.data.info.service, ...(info.service || {}) },
            technician: { ...this.data.info.technician, ...(info.technician || {}) },
            pet: { ...this.data.info.pet, ...(info.pet || {}) },
            date: { ...this.data.info.date, ...(info.date || {}) },
            totalPrice: info.service?.price || 99
          }
        });
      } catch (e) {
        console.error('解析预约信息失败:', e);
      }
    }
  },

  // 备注输入
  onRemarkInput(e) {
    this.setData({ remark: e.detail.value });
  },

  // 返回上一页
  handleBack() {
    wx.navigateBack({
      delta: 1,
      fail: () => {
        wx.switchTab({ url: '/pages/index/index' });
      }
    });
  },

  // 确认支付并创建订单
  handleConfirm() {
    if (this.data.submitting) return;
    
    const { info, remark } = this.data;
    
    // 验证必要信息
    if (!info.technician?.id || !info.service?.id || !info.date?.fullDate || !info.time) {
      wx.showToast({ title: '预约信息不完整', icon: 'none' });
      return;
    }
    
    this.setData({ submitting: true });
    wx.showLoading({ title: '创建订单中...', mask: true });
    
    // 构建订单数据
    const orderData = {
      serviceId: info.service.id,
      serviceName: info.service.name,
      servicePrice: info.service.price,
      serviceDuration: info.service.duration || 60,
      technicianId: info.technician.id,
      technicianName: info.technician.name,
      technicianAvatar: info.technician.avatar,
      appointmentDate: info.date.fullDate,
      appointmentTime: info.time,
      totalPrice: info.totalPrice,
      remark: remark,
      status: 'pending',
      createTime: new Date().toISOString()
    };
    
    // 如果有宠物信息，添加宠物数据
    if (info.pet?.id) {
      orderData.petId = info.pet.id;
      orderData.petName = info.pet.name;
      orderData.petType = info.pet.type;
    }
    
    // 调用云函数创建订单
    console.log('Creating order:', orderData);
    wx.cloud.callFunction({
      name: 'orders-api',
      data: {
        httpMethod: 'POST',
        path: '/orders',
        body: JSON.stringify(orderData)
      }
    }).then(res => {
      wx.hideLoading();
      this.setData({ submitting: false });
      
      console.log('Create order response:', res);
      
      // 解析云函数返回结果
      let result = res.result;
      if (typeof result === 'string') {
        try {
          result = JSON.parse(result);
        } catch (e) {
          console.error('Parse result error:', e);
        }
      }
      
      // 云函数返回的是 HTTP 响应格式
      if (result && (result.success || result.statusCode === 201)) {
        const data = result.data || JSON.parse(result.body)?.data;
        const orderId = data._id;
        const orderNo = data.orderNo;
        
        // 构建预约成功页面需要的数据
        const successInfo = {
          service: {
            name: info.service.name,
            price: info.totalPrice,
            icon: info.service.icon || '🐕',
            duration: info.service.duration
          },
          technician: {
            name: info.technician.name,
            avatar: info.technician.avatar || '👤'
          },
          pet: {
            name: info.pet?.name || '宠物',
            type: info.pet?.type || ''
          },
          date: {
            date: this.formatDate(info.date.fullDate)
          },
          time: info.time,
          orderNo: orderNo
        };
        
        // 跳转到预约成功页面，传递完整信息
        wx.redirectTo({
          url: `/pages/booking-success/booking-success?info=${encodeURIComponent(JSON.stringify(successInfo))}`
        });
      } else {
        const errorMsg = result?.error || result?.message || '请稍后再试';
        console.error('Create order failed:', result);
        wx.showModal({
          title: '预约失败',
          content: errorMsg,
          showCancel: false
        });
      }
    }).catch(err => {
      wx.hideLoading();
      this.setData({ submitting: false });
      console.error('创建订单失败:', err);
      wx.showModal({
        title: '预约失败',
        content: '网络错误，请稍后再试',
        showCancel: false
      });
    });
  },

  // 格式化日期
  formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${month}月${day}日`;
  }
});
