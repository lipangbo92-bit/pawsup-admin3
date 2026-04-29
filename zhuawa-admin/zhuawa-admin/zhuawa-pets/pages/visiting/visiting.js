// pages/visiting/visiting.js
Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 当前步骤
    currentStep: 1,
    
    // 服务列表
    serviceList: [
      {
        id: 'feeding_basic',
        name: '基础上门喂养',
        desc: '喂食、换水、清理猫砂/遛狗',
        price: 68,
        unit: '/次',
        icon: '🐱',
        iconClass: 'icon-orange'
      },
      {
        id: 'feeding_premium',
        name: '高级上门喂养',
        desc: '包含基础服务+陪玩30分钟+健康观察',
        price: 98,
        unit: '/次',
        icon: '🐾',
        iconClass: 'icon-pink'
      },
      {
        id: 'feeding_deluxe',
        name: '豪华上门喂养',
        desc: '包含高级服务+梳毛清洁+实时视频',
        price: 138,
        unit: '/次',
        icon: '🏠',
        iconClass: 'icon-blue'
      },
      {
        id: 'dog_walking',
        name: '上门遛狗服务',
        desc: '外出遛狗30分钟+清理卫生',
        price: 58,
        unit: '/次',
        icon: '🐕',
        iconClass: 'icon-green'
      }
    ],
    
    // 选中的服务
    selectedService: {},
    
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
    
    // 宠物类型
    petTypes: [
      { type: 'cat', name: '猫咪', icon: '🐱' },
      { type: 'dog', name: '狗狗', icon: '🐕' },
      { type: 'other', name: '其他', icon: '🐰' }
    ],
    
    // 服务需求
    serviceNeeds: {
      petType: 'cat',
      petCount: 1,
      remark: ''
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
    
    // 总价
    totalPrice: 0
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.initDateList();
    this.initTimeList();
    this.updateCanProceed();
  },

  /**
   * 初始化日期列表
   */
  initDateList() {
    const dateList = [];
    const today = new Date();
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const week = i === 0 ? '今天' : weekDays[date.getDay()];
      
      dateList.push({
        week: week,
        day: `${month}/${day}`,
        fullDate: `${month}月${day}日`,
        available: Math.random() > 0.2 // 模拟部分日期已满
      });
    }
    
    this.setData({ dateList });
  },

  /**
   * 初始化时间列表
   */
  initTimeList() {
    const times = [
      '08:00', '09:00', '10:00', '11:00',
      '12:00', '13:00', '14:00', '15:00',
      '16:00', '17:00', '18:00', '19:00',
      '20:00', '21:00'
    ];
    
    const timeList = times.map(time => ({
      time: time,
      available: Math.random() > 0.3 // 模拟部分时间已满
    }));
    
    this.setData({ timeList });
  },

  /**
   * 返回上一页
   */
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

  /**
   * 选择服务
   */
  selectService(e) {
    const id = e.currentTarget.dataset.id;
    const service = this.data.serviceList.find(item => item.id === id);
    
    this.setData({
      selectedService: service,
      totalPrice: service.price
    });
    
    this.updateCanProceed();
  },

  /**
   * 选择日期
   */
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

  /**
   * 选择时间
   */
  onTimeSelect(e) {
    const time = e.currentTarget.dataset.time;
    const timeItem = this.data.timeList.find(item => item.time === time);
    
    if (!timeItem.available) return;
    
    this.setData({
      selectedTime: time
    });
    
    this.updateCanProceed();
  },

  /**
   * 输入框变化
   */
  onInputChange(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    
    this.setData({
      [`addressInfo.${field}`]: value
    });
    
    this.updateCanProceed();
  },

  /**
   * 选择宠物类型
   */
  selectPetType(e) {
    const type = e.currentTarget.dataset.type;
    
    this.setData({
      'serviceNeeds.petType': type
    });
  },

  /**
   * 改变宠物数量
   */
  changePetCount(e) {
    const delta = parseInt(e.currentTarget.dataset.delta);
    const newCount = this.data.serviceNeeds.petCount + delta;
    
    if (newCount < 1) return;
    if (newCount > 10) {
      wx.showToast({
        title: '最多选择10只',
        icon: 'none'
      });
      return;
    }
    
    this.setData({
      'serviceNeeds.petCount': newCount
    });
  },

  /**
   * 切换服务选项
   */
  toggleServiceOption(e) {
    const index = e.currentTarget.dataset.index;
    const key = `serviceOptions[${index}].checked`;
    
    this.setData({
      [key]: !this.data.serviceOptions[index].checked
    });
  },

  /**
   * 备注输入
   */
  onRemarkInput(e) {
    this.setData({
      'serviceNeeds.remark': e.detail.value
    });
  },

  /**
   * 更新是否可以继续
   */
  updateCanProceed() {
    const { currentStep, selectedService, selectedDateIndex, selectedTime, addressInfo } = this.data;
    let canProceed = false;
    
    switch (currentStep) {
      case 1:
        canProceed = !!selectedService.id;
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
      case 5:
        canProceed = true;
        break;
    }
    
    this.setData({ canProceed });
  },

  /**
   * 上一步
   */
  prevStep() {
    if (this.data.currentStep > 1) {
      this.setData({
        currentStep: this.data.currentStep - 1
      });
      this.updateCanProceed();
    }
  },

  /**
   * 下一步
   */
  nextStep() {
    if (!this.data.canProceed) return;
    
    if (this.data.currentStep < 5) {
      this.setData({
        currentStep: this.data.currentStep + 1
      });
      this.updateCanProceed();
    } else {
      this.submitOrder();
    }
  },

  /**
   * 提交订单
   */
  submitOrder() {
    const orderData = {
      service: this.data.selectedService,
      date: this.data.selectedDateStr,
      time: this.data.selectedTime,
      address: this.data.addressInfo,
      petInfo: {
        type: this.data.serviceNeeds.petType,
        count: this.data.serviceNeeds.petCount
      },
      options: this.data.serviceOptions.filter(item => item.checked),
      remark: this.data.serviceNeeds.remark,
      totalPrice: this.data.totalPrice
    };
    
    console.log('提交订单:', orderData);
    
    // 模拟提交
    wx.showLoading({
      title: '提交中...'
    });
    
    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({
        title: '预约成功',
        icon: 'success'
      });
      
      // 跳转到成功页面或订单页面
      setTimeout(() => {
        wx.redirectTo({
          url: '/pages/booking-success/booking-success'
        });
      }, 1500);
    }, 1500);
  },

  /**
   * 计算属性：选中的服务选项文本
   */
  getSelectedOptionsText() {
    const selectedOptions = this.data.serviceOptions.filter(item => item.checked);
    if (selectedOptions.length === 0) return '';
    return selectedOptions.map(item => item.label).join('、');
  },

  /**
   * 计算属性：宠物类型名称
   */
  getPetTypeName() {
    const petType = this.data.petTypes.find(item => item.type === this.data.serviceNeeds.petType);
    return petType ? petType.name : '';
  }
});
