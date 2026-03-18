// pages/services/services.js
const app = getApp();

Page({
  data: {
    currentCategory: 0,
    categories: ['狗狗洗护', '狗狗造型', '狗狗寄养', '猫猫洗护', '猫猫造型', '猫猫寄养', '上门服务'],
    services: [],
    allServices: [],
    // 预约相关
    selectedPet: null,
    bookingMode: '',
    selectedTechnician: null,
    selectedServiceForBook: null,
    // 弹窗
    showDetailModal: false,
    selectedService: null,
    showPetSelector: false
  },

  onLoad(options) {
    // 检查是否有传入的分类参数
    if (options && options.category !== undefined) {
      const categoryIndex = parseInt(options.category);
      if (!isNaN(categoryIndex) && categoryIndex >= 0 && categoryIndex < this.data.categories.length) {
        this.setData({ currentCategory: categoryIndex });
      }
    }
    this.loadServices();
  },

  onShow() {
    // 检查全局数据是否有需要切换的分类和宠物信息
    const app = getApp();
    if (app.globalData) {
      // 处理从首页跳转过来的宠物信息
      if (app.globalData.selectedPet) {
        const pet = app.globalData.selectedPet;
        const categoryIndex = app.globalData.selectedCategory;
        const bookingMode = app.globalData.bookingMode;
        const selectedTechnician = app.globalData.selectedTechnician;
        console.log('onShow received pet:', pet, 'category:', categoryIndex, 'mode:', bookingMode);
        
        // 保存宠物信息到页面数据
        this.setData({ 
          selectedPet: pet,
          bookingMode: bookingMode,
          selectedTechnician: selectedTechnician
        });
        
        // 寄养日托模式：直接进入房型选择页面
        if (bookingMode === 'boarding') {
          // 清除全局标记
          app.globalData.selectedPet = undefined;
          app.globalData.selectedCategory = undefined;
          app.globalData.bookingMode = undefined;
          // 跳转到寄养页面
          wx.navigateTo({
            url: `/pages/boarding/boarding?petId=${pet._id}&petType=${pet.type}`
          });
          return;
        }
        
        // 切换到对应分类
        if (categoryIndex !== undefined && categoryIndex >= 0 && categoryIndex < this.data.categories.length) {
          this.setData({ currentCategory: categoryIndex });
          this.filterServices(categoryIndex);
        }
        
        // 清除全局标记
        app.globalData.selectedPet = undefined;
        app.globalData.selectedCategory = undefined;
        app.globalData.bookingMode = undefined;
        app.globalData.selectedTechnician = undefined;
      }
    }
  },

  async loadServices() {
    try {
      wx.showLoading({ title: '加载中...' });
      
      const res = await wx.cloud.callFunction({
        name: 'services-api',
        data: { action: 'list' }
      });
      
      wx.hideLoading();
      
      if (res.result && res.result.success && res.result.data) {
        const services = res.result.data.map(item => ({
          id: item._id,
          name: item.name,
          desc: item.desc || item.description || '',
          price: item.price,
          unit: item.unit || '起',
          category: item.category || '',
          image: item.image || '',
          duration: item.duration || 60,
          iconText: this.getIconText(item.category),
          iconClass: this.getIconClass(item.category)
        }));
        
        this.setData({ allServices: services });
        // 使用当前选中的分类
        this.filterServices(this.data.currentCategory);
      }
    } catch (err) {
      wx.hideLoading();
      console.error('加载失败:', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  getIconText(category) {
    const map = {
      '狗狗洗护': '🛁', '狗狗造型': '✂️', '狗狗寄养': '🏠',
      '猫猫洗护': '🧼', '猫猫造型': '💇', '猫猫寄养': '🏨', '上门服务': '🚗'
    };
    return map[category] || '🐾';
  },

  getIconClass(category) {
    const map = {
      '狗狗洗护': 'icon-blue', '狗狗造型': 'icon-purple', '狗狗寄养': 'icon-orange',
      '猫猫洗护': 'icon-pink', '猫猫造型': 'icon-indigo', '猫猫寄养': 'icon-teal', '上门服务': 'icon-green'
    };
    return map[category] || 'icon-blue';
  },

  switchCategory(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    this.filterServices(index);
  },

  filterServices(index) {
    const category = this.data.categories[index];
    const filtered = this.data.allServices.filter(s => s.category === category);
    
    this.setData({ 
      currentCategory: index, 
      services: filtered
    });
  },

  // 显示服务详情弹窗
  showServiceDetail(e) {
    const serviceId = e.currentTarget.dataset.service;
    const service = this.data.services.find(s => s.id === serviceId);
    
    if (service) {
      this.setData({
        showDetailModal: true,
        selectedService: service
      });
    }
  },

  // 关闭详情弹窗
  closeDetailModal() {
    this.setData({
      showDetailModal: false,
      selectedService: null
    });
  },

  // 从详情弹窗点击预约
  bookFromDetail() {
    const service = this.data.selectedService;
    this.closeDetailModal();
    this.doBookService(service.id);
  },

  // 点击加号按钮预约
  bookService(e) {
    const serviceId = e.currentTarget.dataset.service;
    this.doBookService(serviceId);
  },

  // 执行预约跳转
  doBookService(serviceId) {
    const service = this.data.services.find(s => s.id === serviceId);
    
    if (!service) {
      wx.showToast({ title: '服务信息错误', icon: 'none' });
      return;
    }
    
    // 保存当前选择的服务
    this.setData({ 
      selectedServiceForBook: service,
      showPetSelector: true,
      bookingMode: 'path3'
    });
  },

  // 宠物选择回调
  onPetSelected(e) {
    const { pet } = e.detail;
    const { selectedServiceForBook, bookingMode } = this.data;
    
    this.setData({ 
      showPetSelector: false,
      selectedPet: pet 
    });
    
    if (bookingMode === 'path3' && selectedServiceForBook) {
      // 路径3：已选宠物和服务，跳转到 booking-time-1
      const url = `/pages/booking-time-1/booking-time-1?mode=path3&petId=${pet._id}&petType=${pet.type}&serviceId=${selectedServiceForBook.id}`;
      wx.navigateTo({ url });
    }
  },

  onAddPet() {
    this.setData({ showPetSelector: false });
    wx.navigateTo({ url: '/pages/pet-register/pet-register' });
  },

  onPetSelectorClose() {
    this.setData({ showPetSelector: false });
  },

  onPullDownRefresh() {
    this.loadServices().finally(() => wx.stopPullDownRefresh());
  }
});

// 添加全局数据
App({
  globalData: {
    selectedCategory: undefined
  }
});
