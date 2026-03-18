// pages/boarding/boarding.js
Page({
  data: {
    // 当前步骤
    currentStep: 1,
    pageTitle: '寄养预约',

    // 今天日期
    today: '',

    // 选择的房型
    selectedRoom: {
      type: '',
      name: '',
      price: 0
    },

    // 日期选择
    checkinDate: '',
    checkoutDate: '',
    nightCount: 0,

    // 宠物信息
    selectedPet: null,
    petCount: 1,

    // 价格计算
    subtotal: 0,
    totalPrice: 0,

    // 当前选中的Tab（寄养属于服务页面）
    activeTab: 'service'
  },

  onLoad(options) {
    // 设置今天的日期
    const today = this.formatDate(new Date());
    this.setData({
      today: today
    });
    
    // 接收宠物信息（从首页寄养入口进入）
    if (options.petId) {
      this.setData({
        selectedPet: {
          _id: options.petId,
          type: options.petType || 'dog'
        }
      });
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
    const { type, price, name } = e.currentTarget.dataset;
    this.setData({
      selectedRoom: {
        type,
        price: parseInt(price),
        name
      }
    });
  },

  goToStep2() {
    const { selectedRoom } = this.data;
    if (!selectedRoom.type) {
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
    this.setData({
      checkinDate
    }, () => {
      this.calculateNights();
    });
  },

  onCheckoutChange(e) {
    const checkoutDate = e.detail.value;
    this.setData({
      checkoutDate
    }, () => {
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
        this.setData({
          nightCount
        });
      } else {
        this.setData({
          nightCount: 0
        });
        wx.showToast({
          title: '退房日期必须晚于入住日期',
          icon: 'none'
        });
      }
    } else {
      this.setData({
        nightCount: 0
      });
    }
  },

  goToStep3() {
    const { nightCount } = this.data;
    if (nightCount === 0) {
      wx.showToast({
        title: '请选择有效的入住和退房日期',
        icon: 'none'
      });
      return;
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
      this.setData({
        petCount: newCount
      });
    }
  },

  goToStep4() {
    const { selectedRoom, nightCount, petCount } = this.data;
    
    // 计算价格
    const subtotal = selectedRoom.price * nightCount * petCount;
    const totalPrice = subtotal; // 暂不加服务费
    
    this.setData({
      currentStep: 4,
      pageTitle: '确认预约',
      subtotal,
      totalPrice
    });
  },

  // ========== 步骤4：确认预约 ==========
  confirmBooking() {
    const { selectedRoom, checkinDate, checkoutDate, nightCount, petCount, totalPrice } = this.data;
    
    // 构建订单数据
    const orderData = {
      roomType: selectedRoom.type,
      roomName: selectedRoom.name,
      roomPrice: selectedRoom.price,
      checkinDate,
      checkoutDate,
      nightCount,
      petCount,
      totalPrice,
      createTime: new Date().toISOString()
    };
    
    console.log('提交订单:', orderData);
    
    // 这里可以调用API提交订单
    wx.showLoading({
      title: '提交中...'
    });
    
    // 模拟提交
    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({
        title: '预约成功',
        icon: 'success',
        duration: 2000,
        success: () => {
          // 可以跳转到订单详情页或成功页
          setTimeout(() => {
            wx.navigateBack();
          }, 2000);
        }
      });
    }, 1500);
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

    // 如果点击当前页，不执行跳转
    if (page === 'service') {
      return;
    }

    // 定义页面路径映射
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