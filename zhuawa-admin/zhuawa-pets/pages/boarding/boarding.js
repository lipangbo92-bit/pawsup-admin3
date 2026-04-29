// pages/boarding/boarding.js
// 寄养预约页面 - 对接真实API

Page({
  data: {
    // 当前步骤
    currentStep: 1,
    pageTitle: '寄养预约',

    // 今天日期
    today: '',

    // URL参数
    petId: null,
    petType: null, // 'dog' | 'cat'

    // 宠物信息
    selectedPet: null,

    // 房型列表（从API获取）
    rooms: [],
    loadingRooms: false,

    // 选择的房型
    selectedRoom: null,

    // 日期选择
    checkinDate: '',
    checkoutDate: '',
    nightCount: 0,

    // 宠物数量
    petCount: 1,

    // 价格计算
    subtotal: 0,
    totalPrice: 0,

    // 备注
    remark: '',

    // 当前选中的Tab（寄养属于服务页面）
    activeTab: 'service'
  },

  onLoad(options) {
    console.log('boarding onLoad:', options);

    // 设置今天的日期
    const today = this.formatDate(new Date());
    this.setData({ today });

    // 保存URL参数（支持 roomId 和 roomTypeId 两种参数名）
    const { petId, petType, roomId, roomTypeId } = options;
    this.setData({ petId, petType });

    // 如果有petId，加载宠物信息
    if (petId) {
      this.loadPetInfo(petId);
    }

    // 如果传入了roomTypeId，直接加载该房型并跳转到步骤2
    const targetRoomTypeId = roomTypeId || roomId;
    if (targetRoomTypeId) {
      this.loadRoomAndSkipToStep2(targetRoomTypeId);
    } else {
      // 否则加载房型列表
      this.loadRoomTypes(petType);
    }
  },

  // 加载指定房型并跳转到步骤2
  async loadRoomAndSkipToStep2(roomTypeId) {
    this.setData({ loadingRooms: true });

    try {
      const res = await wx.cloud.callFunction({
        name: 'boarding-api',
        data: {
          action: 'getRoomType',
          id: roomTypeId
        }
      });

      if (res.result.success && res.result.data) {
        const roomType = res.result.data;
        this.setData({
          selectedRoom: roomType,
          currentStep: 2,
          pageTitle: '选择日期',
          loadingRooms: false
        });
      } else {
        // 如果获取失败，回退到加载房型列表
        this.loadRoomTypes(this.data.petType);
      }
    } catch (error) {
      console.error('加载房型失败:', error);
      // 如果获取失败，回退到加载房型列表
      this.loadRoomTypes(this.data.petType);
    }
  },

  // 加载宠物信息
  async loadPetInfo(petId) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'pets-api',
        data: {
          action: 'get',
          id: petId
        }
      });

      if (res.result.success) {
        const pet = res.result.data;
        this.setData({
          selectedPet: {
            id: pet._id,
            name: pet.name,
            type: pet.type,
            breed: pet.breed,
            avatar: pet.avatar,
            weight: pet.weight
          }
        });
      }
    } catch (error) {
      console.error('加载宠物信息失败:', error);
    }
  },

  // 加载房型列表
  async loadRoomTypes(petType) {
    this.setData({ loadingRooms: true });

    try {
      const res = await wx.cloud.callFunction({
        name: 'boarding-api',
        data: {
          action: 'getRoomTypes',
          petType: petType || null
        }
      });

      if (res.result.success) {
        this.setData({
          rooms: res.result.data
        });
      } else {
        wx.showToast({
          title: res.result.error || '加载房型失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('加载房型失败:', error);
      wx.showToast({
        title: '加载房型失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loadingRooms: false });
    }
  },

  // 返回按钮
  handleBack() {
    const { currentStep } = this.data;
    if (currentStep > 1) {
      this.setData({
        currentStep: currentStep - 1,
        pageTitle: this.getPageTitle(currentStep - 1)
      });
    } else {
      wx.navigateBack();
    }
  },

  // 获取页面标题
  getPageTitle(step) {
    const titles = {
      1: '寄养预约',
      2: '选择日期',
      3: '宠物数量',
      4: '确认预约'
    };
    return titles[step] || '寄养预约';
  },

  // ========== 步骤1：选择房型 ==========
  selectRoom(e) {
    const { id } = e.currentTarget.dataset;
    const room = this.data.rooms.find(r => r.id === id);
    if (room) {
      this.setData({ selectedRoom: room });
    }
  },

  goToStep2() {
    const { selectedRoom } = this.data;
    if (!selectedRoom) {
      wx.showToast({
        title: '请先选择房型',
        icon: 'none'
      });
      return;
    }
    this.setData({
      currentStep: 2,
      pageTitle: '选择日期'
    });
  },

  // ========== 步骤2：选择日期 ==========
  onCheckinChange(e) {
    const checkinDate = e.detail.value;
    this.setData({ checkinDate }, () => {
      this.calculateNights();
    });
  },

  onCheckoutChange(e) {
    const checkoutDate = e.detail.value;
    this.setData({ checkoutDate }, () => {
      this.calculateNights();
    });
  },

  // 计算晚数
  calculateNights() {
    const { checkinDate, checkoutDate } = this.data;

    if (checkinDate && checkoutDate) {
      const checkin = new Date(checkinDate);
      const checkout = new Date(checkoutDate);

      if (checkout > checkin) {
        const diffTime = Math.abs(checkout - checkin);
        const nightCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        this.setData({ nightCount });
      } else {
        this.setData({ nightCount: 0 });
        wx.showToast({
          title: '退房日期必须晚于入住日期',
          icon: 'none'
        });
      }
    } else {
      this.setData({ nightCount: 0 });
    }
  },

  async goToStep3() {
    const { nightCount, selectedRoom, checkinDate, checkoutDate, petCount } = this.data;
    if (nightCount === 0) {
      wx.showToast({
        title: '请选择有效的入住和退房日期',
        icon: 'none'
      });
      return;
    }

    // 检查房态可用性
    wx.showLoading({ title: '检查房态...' });
    try {
      const res = await wx.cloud.callFunction({
        name: 'boarding-api',
        data: {
          action: 'checkAvailability',
          roomTypeId: selectedRoom.id,
          checkinDate: checkinDate,
          checkoutDate: checkoutDate
        }
      });

      wx.hideLoading();

      if (res.result.success) {
        const { minAvailable, isAvailable } = res.result.data;
        if (!isAvailable) {
          wx.showToast({
            title: '该房型在所选日期已满房',
            icon: 'none'
          });
          return;
        }
        if (minAvailable < petCount) {
          wx.showToast({
            title: `该房型仅剩${minAvailable}间可用`,
            icon: 'none'
          });
          return;
        }
        // 更新可用数量
        this.setData({
          'selectedRoom.availableCount': minAvailable
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('检查房态失败:', error);
      // 继续流程，让后端再次验证
    }

    this.setData({
      currentStep: 3,
      pageTitle: '宠物数量'
    });
  },

  // ========== 步骤3：选择宠物数量 ==========
  changePetCount(e) {
    const delta = parseInt(e.currentTarget.dataset.delta);
    let { petCount } = this.data;

    const newCount = petCount + delta;
    if (newCount >= 1 && newCount <= 3) {
      this.setData({ petCount: newCount });
    }
  },

  // 备注输入
  onRemarkInput(e) {
    this.setData({ remark: e.detail.value });
  },

  goToStep4() {
    const { selectedRoom, nightCount, petCount } = this.data;

    // 计算价格
    const subtotal = selectedRoom.price * nightCount * petCount;
    const totalPrice = subtotal;

    this.setData({
      currentStep: 4,
      pageTitle: '确认预约',
      subtotal,
      totalPrice
    });
  },

  // ========== 步骤4：确认预约 ==========
  async confirmBooking() {
    const {
      selectedRoom,
      selectedPet,
      petId,
      checkinDate,
      checkoutDate,
      nightCount,
      petCount,
      totalPrice,
      remark
    } = this.data;

    // 校验必填数据
    if (!selectedRoom || !selectedRoom.id) {
      wx.showToast({ title: '请选择房型', icon: 'none' });
      return;
    }
    if (!checkinDate || !checkoutDate) {
      wx.showToast({ title: '请选择入住和退房日期', icon: 'none' });
      return;
    }

    // 获取用户信息
    wx.showLoading({ title: '获取用户信息...' });
    let openid = '';
    try {
      const loginRes = await wx.cloud.callFunction({
        name: 'login'
      });
      openid = loginRes.result.openid;
    } catch (err) {
      console.error('获取用户信息失败:', err);
    }
    wx.hideLoading();

    if (!openid) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    // 构建订单数据（使用统一 orders-api，符合数据字典）
    const orderData = {
      userId: openid,
      orderType: 'boarding',
      customerName: '',
      customerPhone: '',
      petId: petId || '',
      petName: selectedPet ? selectedPet.name : '',
      petType: selectedPet ? selectedPet.type : '',
      petBreed: selectedPet ? selectedPet.breed : '',
      petWeight: selectedPet ? selectedPet.weight : null,
      serviceId: selectedRoom.id,
      serviceName: selectedRoom.name,
      servicePrice: selectedRoom.price,
      roomId: '',
      roomName: selectedRoom.name,
      roomId: '',  // 待商家分配
      roomNumber: '',
      checkinDate,
      checkoutDate,
      nightCount,
      petCount,
      totalPrice,
      finalPrice: totalPrice,
      remark
    };

    console.log('提交订单数据:', orderData);

    console.log('提交订单:', orderData);

    wx.showLoading({ title: '提交中...' });

    try {
      // 使用统一 orders-api 创建订单
      const res = await wx.cloud.callFunction({
        name: 'orders-api',
        data: {
          action: 'createOrder',
          data: orderData
        }
      });

      wx.hideLoading();

      console.log('创建订单响应:', res);

      if (res.result && res.result.success) {
        const { orderId, orderNo } = res.result;

        // 调用支付
        this.createPayment(orderId, orderNo, totalPrice);
      } else {
        const errorMsg = res.result && res.result.error ? res.result.error : '创建订单失败';
        console.error('创建订单失败:', errorMsg, res);
        wx.showModal({
          title: '创建订单失败',
          content: errorMsg,
          showCancel: false
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('创建订单异常:', error);
      wx.showModal({
        title: '创建订单异常',
        content: error.message || '请检查网络后重试',
        showCancel: false
      });
    }
  },

  // 创建支付
  async createPayment(orderId, orderNo, amount) {
    if (amount === 0) {
      // 金额为0，直接成功
      wx.navigateTo({
        url: `/pages/booking-success/booking-success?orderId=${orderId}&orderNo=${orderNo}&amount=${amount}&type=boarding`
      });
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
          type: 'boarding'
        }
      });

      wx.hideLoading();

      if (res.result.success) {
        // 模拟支付成功（实际微信支付需要调起 wx.requestPayment）
        wx.showModal({
          title: '模拟支付',
          content: `订单号: ${orderNo}\n金额: ¥${amount}\n\n点击确定模拟支付成功`,
          showCancel: true,
          cancelText: '取消',
          confirmText: '支付',
          success: (modalRes) => {
            if (modalRes.confirm) {
              // 模拟支付成功
              wx.showToast({ title: '支付成功', icon: 'success' });
              setTimeout(() => {
                wx.navigateTo({
                  url: `/pages/booking-success/booking-success?orderId=${orderId}&orderNo=${orderNo}&amount=${amount}&type=boarding`
                });
              }, 1000);
            } else {
              // 取消支付
              wx.navigateTo({
                url: `/pages/order-detail/order-detail?orderId=${orderId}&type=boarding`
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

  // 格式化日期
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // ========== 底部导航栏切换 ==========
  switchTab(e) {
    const page = e.currentTarget.dataset.page;

    if (page === 'service') {
      return;
    }

    const pageMap = {
      'home': '/pages/index/index',
      'service': '/pages/service/service',
      'orders': '/pages/orders/orders',
      'profile': '/pages/profile/profile'
    };

    const url = pageMap[page];
    if (url) {
      wx.switchTab({
        url: url,
        fail: (err) => {
          console.error('跳转失败:', err);
          wx.showToast({
            title: '页面跳转失败',
            icon: 'none'
          });
        }
      });
    }
  }
});
