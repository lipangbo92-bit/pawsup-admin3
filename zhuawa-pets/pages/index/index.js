// 首页 - 从数据库加载Banner
const app = getApp();

Page({
  data: {
    technicians: [],
    services: [],
    banners: [],
    showModal: false,
    selectedTechnician: null,
    showPetSelector: false,
    bookingMode: '',
    selectedServiceId: ''
  },

  onLoad() {
    this.loadData();
    this.loadBanners();
  },

  async loadData() {
    try {
      const [techsRes, servicesRes] = await Promise.all([
        this.loadTechnicians(),
        this.loadServices()
      ]);

      const technicians = techsRes.length > 0 ? techsRes : this.getLocalTechnicians();

      this.setData({
        technicians: technicians,
        services: servicesRes
      });
    } catch (err) {
      console.error('加载失败:', err);
      this.setData({
        technicians: this.getLocalTechnicians(),
        services: []
      });
    }
  },

  // 加载Banner
  async loadBanners() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'banner-api',
        data: { action: 'list' }
      });

      if (res.result && res.result.success && res.result.data) {
        this.setData({ banners: res.result.data });
      }
    } catch (err) {
      console.error('加载Banner失败:', err);
    }
  },

  async loadTechnicians() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'technicians-api',
        data: { action: 'list' }
      });

      if (res.result && res.result.success && res.result.data) {
        return res.result.data.map(item => {
          const avatarUrl = item.avatarUrl || item.avatar || '';
          return {
            id: item._id,
            name: item.name,
            level: item.level || '中级',
            position: item.position || '美容师',
            rating: item.rating || 5,
            orders: item.orders || 0,
            avatar: avatarUrl,
            intro: item.specialty || item.intro || item.introduction || '专业宠物美容师'
          };
        });
      }
      return [];
    } catch (err) {
      return [];
    }
  },

  async loadServices() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'services-api',
        data: { action: 'list' }
      });

      if (res.result && res.result.success && res.result.data) {
        return res.result.data.map(item => ({
          id: item._id,
          name: item.name,
          price: item.price,
          icon: this.getServiceIcon(item.category),
          duration: item.duration || 60
        }));
      }
      return [];
    } catch (err) {
      return [];
    }
  },

  getServiceIcon(category) {
    const map = {
      '狗狗洗护': '🛁', '狗狗造型': '✂️', '狗狗寄养': '🏠',
      '猫猫洗护': '🧼', '猫猫造型': '💇', '猫猫寄养': '🏨', '上门服务': '🚗'
    };
    return map[category] || '🐾';
  },

  // 显示美容师详情弹窗
  showTechnicianDetail(e) {
    const index = e.currentTarget.dataset.index;
    const technician = this.data.technicians[index];
    this.setData({
      showModal: true,
      selectedTechnician: technician
    });
  },

  closeModal() {
    this.setData({ showModal: false, selectedTechnician: null });
  },

  preventBubble() { return; },

  // 从卡片预约美容师
  bookTechnician(e) {
    const index = e.currentTarget.dataset.index;
    const technician = this.data.technicians[index];
    
    this.setData({
      showPetSelector: true,
      bookingMode: 'path2',
      selectedTechnician: technician
    });
  },

  // 从弹窗预约美容师
  bookFromModal() {
    const technician = this.data.selectedTechnician;
    this.closeModal();
    
    this.setData({
      showPetSelector: true,
      bookingMode: 'path2',
      selectedTechnician: technician
    });
  },

  // 跳转到 booking-time-2（美容师驱动流程）
  navigateToBookingTime2(technician) {
    const defaultService = this.data.services[0] || {
      id: 1,
      name: '宠物洗澡',
      price: 68,
      icon: '🛁',
      duration: 60
    };

    const bookingInfo = {
      technician: {
        id: technician.id,
        name: technician.name,
        avatar: technician.avatar || '👤',
        rating: technician.rating,
        orders: technician.orders,
        skill: technician.intro
      },
      service: defaultService
    };

    wx.navigateTo({
      url: `/pages/booking-time-2/booking-time-2?info=${encodeURIComponent(JSON.stringify(bookingInfo))}`
    });
  },

  // 路径1：洗护美容入口
  goToService(e) {
    const serviceType = e.currentTarget.dataset.service;
    if (serviceType === '洗护美容') {
      this.setData({
        showPetSelector: true,
        bookingMode: 'path1'
      });
    } else if (serviceType === '寄养日托') {
      // 寄养日托：先选择宠物，然后根据宠物类型跳转
      this.setData({
        showPetSelector: true,
        bookingMode: 'boarding'
      });
    } else if (serviceType === '上门服务') {
      wx.navigateTo({ url: '/pages/visiting/visiting' });
    }
  },

  // 路径3：热门服务预约
  goToBooking(e) {
    const serviceId = e.currentTarget.dataset.id;
    this.setData({
      showPetSelector: true,
      bookingMode: 'path3',
      selectedServiceId: serviceId
    });
  },

  // 宠物选择弹窗回调
  onPetSelected(e) {
    console.log('onPetSelected called:', e.detail);
    const { pet } = e.detail;
    const { bookingMode, selectedTechnician, selectedServiceId } = this.data;
    console.log('bookingMode:', bookingMode);

    this.setData({ showPetSelector: false });

    // 根据宠物类型确定服务分类
    // dog -> 狗狗洗护 (index 0), cat -> 猫猫洗护 (index 3)
    let categoryIndex = 0;
    if (pet.type === 'dog') {
      categoryIndex = 0; // 狗狗洗护
    } else if (pet.type === 'cat') {
      categoryIndex = 3; // 猫猫洗护
    }

    if (bookingMode === 'path1') {
      // 跳转到服务页面（tabBar页面只能用switchTab）
      // 将宠物信息存入全局数据，services页面onShow时读取
      const app = getApp();
      app.globalData.selectedPet = pet;
      app.globalData.selectedCategory = categoryIndex;
      console.log('switchTab to services, pet:', pet, 'category:', categoryIndex);
      wx.switchTab({
        url: '/pages/services/services'
      });
    } else if (bookingMode === 'path2') {
      // 路径2：已选宠物 -> 选服务（美容师已固定）
      if (!selectedTechnician) {
        console.error('path2 error: selectedTechnician is null');
        wx.showToast({ title: '美容师信息错误', icon: 'none' });
        return;
      }
      const techId = selectedTechnician.id || selectedTechnician._id;
      const petId = pet.id || pet._id;
      // services 是 tabBar 页面，需要用 switchTab 跳转
      // 参数通过全局数据传递
      const app = getApp();
      app.globalData.selectedPet = pet;
      app.globalData.selectedCategory = categoryIndex;
      app.globalData.selectedTechnician = selectedTechnician;
      app.globalData.bookingMode = 'path2';
      console.log('switchTab to services (path2), pet:', pet, 'technician:', selectedTechnician);
      wx.switchTab({
        url: '/pages/services/services'
      });
    } else if (bookingMode === 'path3') {
      // 路径3：已选宠物 -> 选时间（服务已固定）
      wx.navigateTo({
        url: `/pages/booking-time-1/booking-time-1?mode=path3&petId=${pet.id || pet._id}&petType=${pet.type}&serviceId=${selectedServiceId}`
      });
    } else if (bookingMode === 'boarding') {
      // 寄养日托：根据宠物类型跳转到对应分类
      // dog -> 狗狗寄养 (index 2), cat -> 猫咪寄养 (index 5)
      let boardingCategoryIndex = 2; // 默认狗狗寄养
      if (pet.type === 'cat') {
        boardingCategoryIndex = 5; // 猫咪寄养
      }
      // 将宠物信息和分类存入全局数据
      const app = getApp();
      app.globalData.selectedPet = pet;
      app.globalData.selectedCategory = boardingCategoryIndex;
      app.globalData.bookingMode = 'boarding';
      console.log('switchTab to services (boarding), pet:', pet, 'category:', boardingCategoryIndex);
      wx.switchTab({
        url: '/pages/services/services'
      });
    }
  },

  onAddPet() {
    this.setData({ showPetSelector: false });
    wx.navigateTo({ url: '/pages/pet-register/pet-register' });
  },

  onPetSelectorClose() {
    this.setData({ showPetSelector: false });
  },

  goToServices() {
    wx.switchTab({ url: '/pages/services/services' });
  },

  getLocalTechnicians() {
    return [
      { id: '1', name: '小美', level: '高级', position: '美容师', rating: 5, orders: 128, avatar: '', intro: '拥有5年宠物美容经验。' },
      { id: '2', name: '文子', level: '中级', position: '洗护师', rating: 4, orders: 86, avatar: '', intro: '专业洗护师，手法温柔。' },
      { id: '3', name: '王姐', level: '中级', position: '美容师', rating: 4, orders: 64, avatar: '', intro: '经验丰富的美容师。' }
    ];
  },

  onPullDownRefresh() {
    Promise.all([this.loadData(), this.loadBanners()]).finally(() => {
      wx.stopPullDownRefresh();
    });
  }
});
