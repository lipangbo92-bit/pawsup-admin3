// pages/visiting/visiting.js
// 上门服务预约页面

Page({
  data: {
    // 当前步骤
    currentStep: 1,

    // 当前选中的Tab
    activeTab: 'service',

    // URL参数
    serviceId: null,
    petId: null,
    petType: null,

    // 服务信息（从数据库获取）
    serviceList: [],
    selectedService: null,
    loadingServices: false,

    // 宠物信息
    selectedPet: null,

    // 日期列表
    dateList: [],
    selectedDateIndex: -1,
    selectedDateStr: '',

    // 时间列表
    timeList: [],
    selectedTime: '',

    // 地址信息
    addressInfo: {
      contactName: '',
      contactPhone: '',
      address: ''
    },

    // 服务选项
    serviceOptions: [
      { value: 'feeding', label: '喂食换水', checked: true },
      { value: 'litter', label: '清理猫砂/厕所', checked: true },
      { value: 'play', label: '陪玩互动', checked: false },
      { value: 'photo', label: '拍照反馈', checked: true },
      { value: 'video', label: '实时视频', checked: false },
      { value: 'plant', label: '代浇花草', checked: false },
      { value: 'mail', label: '代收快递', checked: false }
    ],

    // 备注
    remark: '',

    // 总价
    totalPrice: 0,

    // 是否可以继续
    canProceed: false
  },

  onLoad(options) {
    console.log('visiting onLoad:', options);

    const { serviceId, petId, petType } = options;
    this.setData({ serviceId, petId, petType });

    // 初始化日期和时间
    this.initDateList();
    this.initTimeList();

    // 如果有 petId，先加载宠物信息
    if (petId) {
      this.loadPetInfo(petId);
    }

    // 如果有 serviceId，加载该服务
    if (serviceId) {
      this.loadServiceDetail(serviceId);
    } else {
      // 否则加载服务列表
      this.loadServices();
    }
  },

  // 加载服务列表
  async loadServices() {
    this.setData({ loadingServices: true });

    try {
      const res = await wx.cloud.callFunction({
        name: 'visiting-api',
        data: {
          action: 'getServices'
        }
      });

      if (res.result && res.result.success) {
        this.setData({
          serviceList: res.result.data,
          loadingServices: false
        });
      } else {
        wx.showToast({
          title: res.result.error || '加载服务失败',
          icon: 'none'
        });
        this.setData({ loadingServices: false });
      }
    } catch (error) {
      console.error('加载服务失败:', error);
      wx.showToast({
        title: '加载服务失败',
        icon: 'none'
      });
      this.setData({ loadingServices: false });
    }
  },

  // 加载服务详情
  async loadServiceDetail(serviceId) {
    this.setData({ loadingServices: true });

    try {
      // 先获取服务列表，然后找到对应的服务
      const res = await wx.cloud.callFunction({
        name: 'visiting-api',
        data: {
          action: 'getServices'
        }
      });

      if (res.result && res.result.success) {
        const service = res.result.data.find(s => s.id === serviceId);
        if (service) {
          // 根据是否有 petId 决定跳转到哪一步
          const nextStep = this.data.petId ? 2 : 1;
          this.setData({
            selectedService: service,
            totalPrice: service.price,
            currentStep: nextStep,
            loadingServices: false
          });
          this.updateCanProceed();
        } else {
          this.setData({ loadingServices: false });
          this.loadServices();
        }
      } else {
        this.setData({ loadingServices: false });
      }
    } catch (error) {
      console.error('加载服务详情失败:', error);
      this.setData({ loadingServices: false });
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
            avatar: pet.avatar
          }
        });
      }
    } catch (error) {
      console.error('加载宠物信息失败:', error);
    }
  },

  // 初始化日期列表
  initDateList() {
    const dateList = [];
    const today = new Date();
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const week = i === 0 ? '今天' : weekDays[date.getDay()];

      dateList.push({
        week: week,
        day: `${parseInt(month)}/${parseInt(day)}`,
        fullDate: `${year}-${month}-${day}`,
        available: true
      });
    }

    this.setData({ dateList });
  },

  // 初始化时间列表
  initTimeList() {
    const times = [
      '08:00', '09:00', '10:00', '11:00',
      '12:00', '13:00', '14:00', '15:00',
      '16:00', '17:00', '18:00', '19:00',
      '20:00', '21:00'
    ];

    const timeList = times.map(time => ({
      time: time,
      available: true
    }));

    this.setData({ timeList });
  },

  // 返回上一页
  goBack() {
    if (this.data.currentStep > 1) {
      this.setData({
        currentStep: this.data.currentStep - 1
      });
      this.updateCanProceed();
    } else {
      wx.navigateBack();
    }
  },

  // 选择服务
  selectService(e) {
    const id = e.currentTarget.dataset.id;
    const service = this.data.serviceList.find(item => item.id === id);

    this.setData({
      selectedService: service,
      totalPrice: service.price
    });

    this.updateCanProceed();
  },

  // 选择日期
  onDateSelect(e) {
    const index = e.currentTarget.dataset.index;
    const dateItem = this.data.dateList[index];

    if (!dateItem.available) return;

    this.setData({
      selectedDateIndex: index,
      selectedDateStr: dateItem.fullDate
    });

    this.updateCanProceed();
  },

  // 选择时间
  onTimeSelect(e) {
    const time = e.currentTarget.dataset.time;
    const timeItem = this.data.timeList.find(item => item.time === time);

    if (!timeItem.available) return;

    this.setData({
      selectedTime: time
    });

    this.updateCanProceed();
  },

  // 输入框变化
  onInputChange(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;

    this.setData({
      [`addressInfo.${field}`]: value
    });

    this.updateCanProceed();
  },

  // 切换服务选项
  toggleServiceOption(e) {
    const index = e.currentTarget.dataset.index;
    const key = `serviceOptions[${index}].checked`;

    this.setData({
      [key]: !this.data.serviceOptions[index].checked
    });
  },

  // 备注输入
  onRemarkInput(e) {
    this.setData({
      remark: e.detail.value
    });
  },

  // 更新是否可以继续
  updateCanProceed() {
    const { currentStep, selectedService, selectedDateIndex, selectedTime, addressInfo } = this.data;
    let canProceed = false;

    switch (currentStep) {
      case 1:
        canProceed = !!selectedService;
        break;
      case 2:
        canProceed = selectedDateIndex >= 0 && selectedTime;
        break;
      case 3:
        canProceed = addressInfo.contactName &&
                     addressInfo.contactPhone &&
                     addressInfo.address;
        break;
      case 4:
        canProceed = true;
        break;
    }

    this.setData({ canProceed });
  },

  // 下一步
  nextStep() {
    if (!this.data.canProceed) return;

    if (this.data.currentStep < 4) {
      this.setData({
        currentStep: this.data.currentStep + 1
      });
      this.updateCanProceed();
    } else {
      this.submitOrder();
    }
  },

  // 提交订单
  async submitOrder() {
    const { selectedService, selectedPet, selectedDateStr, selectedTime, addressInfo, remark, totalPrice } = this.data;

    // 获取用户信息
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo || !userInfo.openid) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    // 构建订单数据
    const orderData = {
      userId: userInfo.openid,
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      servicePrice: selectedService.price,
      petId: selectedPet ? selectedPet.id : '',
      petName: selectedPet ? selectedPet.name : '',
      petType: selectedPet ? selectedPet.type : '',
      address: addressInfo.address,
      contactName: addressInfo.contactName,
      contactPhone: addressInfo.contactPhone,
      serviceDate: selectedDateStr,
      serviceTime: selectedTime,
      serviceOptions: [],
      remark: remark,
      totalPrice: totalPrice
    };

    console.log('提交订单:', orderData);

    wx.showLoading({ title: '提交中...' });

    try {
      const res = await wx.cloud.callFunction({
        name: 'visiting-api',
        data: {
          action: 'createOrder',
          data: orderData
        }
      });

      wx.hideLoading();

      if (res.result && res.result.success) {
        const { orderId, orderNo } = res.result;

        // 调用支付
        this.createPayment(orderId, orderNo, totalPrice);
      } else {
        wx.showToast({
          title: res.result.error || '创建订单失败',
          icon: 'none'
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('创建订单失败:', error);
      wx.showToast({
        title: '创建订单失败',
        icon: 'none'
      });
    }
  },

  // TabBar 切换
  switchTab(e) {
    const page = e.currentTarget.dataset.page;

    const pageMap = {
      'home': '/pages/index/index',
      'service': '/pages/services/services',
      'orders': '/pages/orders/orders',
      'profile': '/pages/profile/profile'
    };

    const url = pageMap[page];
    if (url) {
      wx.switchTab({ url });
    }
  },

  // 创建支付
  async createPayment(orderId, orderNo, amount) {
    if (amount === 0) {
      wx.redirectTo({
        url: `/pages/booking-success/booking-success?orderId=${orderId}&orderNo=${orderNo}&amount=${amount}&type=visiting`
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
          type: 'visiting'
        }
      });

      wx.hideLoading();

      if (res.result.success) {
        const paymentData = res.result.payment;

        wx.requestPayment({
          ...paymentData,
          success: () => {
            wx.redirectTo({
              url: `/pages/booking-success/booking-success?orderId=${orderId}&orderNo=${orderNo}&amount=${amount}&type=visiting`
            });
          },
          fail: (err) => {
            console.error('支付失败:', err);
            wx.showModal({
              title: '支付未完成',
              content: '您可以在订单详情页重新发起支付',
              showCancel: false,
              success: () => {
                wx.redirectTo({
                  url: `/pages/order-detail/order-detail?orderId=${orderId}&type=visiting`
                });
              }
            });
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
  }
});
