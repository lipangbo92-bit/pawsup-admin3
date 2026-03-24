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
  async handleConfirm() {
    if (this.data.submitting) return;

    const { info, remark } = this.data;

    // 验证必要信息
    if (!info.technician?.id || !info.service?.id || !info.date?.fullDate || !info.time) {
      wx.showToast({ title: '预约信息不完整', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    wx.showLoading({ title: '创建订单中...', mask: true });

    // 获取用户信息
    let openid = '';
    try {
      const loginRes = await wx.cloud.callFunction({ name: 'login' });
      console.log('login result:', loginRes);
      openid = loginRes.result.openid;
      console.log('openid:', openid);
    } catch (err) {
      console.error('获取用户信息失败:', err);
    }

    if (!openid) {
      wx.hideLoading();
      this.setData({ submitting: false });
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    // 构建订单数据（符合 orders-api 数据字典）
    const orderData = {
      userId: openid,
      orderType: 'service',
      serviceId: info.service.id,
      serviceName: info.service.name,
      servicePrice: info.service.price,
      totalPrice: info.totalPrice,
      finalPrice: info.totalPrice,
      appointmentDate: info.date.fullDate,
      appointmentTime: info.time,
      technicianId: info.technician.id,
      technicianName: info.technician.name,
      remark: remark
    };

    // 如果有宠物信息，添加宠物数据
    if (info.pet?.id) {
      orderData.petId = info.pet.id;
      orderData.petName = info.pet.name;
      orderData.petType = info.pet.type;
    }

    // 调用云函数创建订单
    console.log('Creating order with data:', JSON.stringify(orderData, null, 2));
    wx.cloud.callFunction({
      name: 'orders-api',
      data: {
        action: 'createOrder',
        data: orderData
      }
    }).then(res => {
      wx.hideLoading();
      this.setData({ submitting: false });

      console.log('Create order response:', res);
      console.log('Request data was:', orderData);
      
      // 云函数返回结果
      const result = res.result;
      
      if (result && result.success) {
        const orderId = result.orderId;
        const orderNo = result.orderNo;
        
        // 调用支付
        this.createPayment(orderId, orderNo, info.totalPrice, info);
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

  // 创建支付
  async createPayment(orderId, orderNo, amount, info) {
    if (amount === 0) {
      // 金额为0，直接成功
      this.goToSuccessPage(orderNo, info);
      return;
    }

    wx.showLoading({ title: '发起支付...' });

    try {
      const res = await wx.cloud.callFunction({
        name: 'payment-api',
        data: {
          action: 'createPayment',
          orderId: orderId,
          orderNo: orderNo,
          amount: amount,
          type: 'service'
        }
      });

      wx.hideLoading();

      if (res.result.success) {
        // 模拟支付成功
        wx.showModal({
          title: '模拟支付',
          content: `订单号: ${orderNo}\n金额: ¥${amount}\n\n点击确定模拟支付成功`,
          showCancel: true,
          cancelText: '取消',
          confirmText: '支付',
          success: (modalRes) => {
            if (modalRes.confirm) {
              wx.showToast({ title: '支付成功', icon: 'success' });
              setTimeout(() => {
                this.goToSuccessPage(orderNo, info);
              }, 1000);
            } else {
              wx.navigateTo({
                url: `/pages/order-detail/order-detail?orderId=${orderId}&type=service`
              });
            }
          }
        });
      } else {
        wx.showToast({
          title: res.result.error || '发起支付失败',
          icon: 'none'
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('发起支付失败:', error);
      wx.showToast({
        title: '发起支付失败',
        icon: 'none'
      });
    }
  },

  // 跳转到成功页面
  goToSuccessPage(orderNo, info) {
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

    wx.redirectTo({
      url: `/pages/booking-success/booking-success?info=${encodeURIComponent(JSON.stringify(successInfo))}`
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
