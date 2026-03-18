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

  async filterServices(index) {
    const category = this.data.categories[index];
    
    // 如果是寄养分类，从 boarding-api 获取房型数据
    if (category === '狗狗寄养' || category === '猫猫寄养') {
      const petType = category === '狗狗寄养' ? 'dog' : 'cat';
      await this.loadBoardingRooms(petType, index);
      return;
    }
    
    // 如果是上门服务分类，从 visiting-api 获取服务数据
    if (category === '上门服务') {
      await this.loadVisitingServices(index);
      return;
    }

    // 其他分类，使用服务数据
    const filtered = this.data.allServices.filter(s => s.category === category);

    this.setData({
      currentCategory: index,
      services: filtered,
      isBoardingMode: false,
      isVisitingMode: false
    });
  },

  // 加载上门服务数据
  async loadVisitingServices(categoryIndex) {
    wx.showLoading({ title: '加载服务...' });

    try {
      const res = await wx.cloud.callFunction({
        name: 'visiting-api',
        data: {
          action: 'getServices'
        }
      });

      wx.hideLoading();

      if (res.result && res.result.success) {
        const services = res.result.data.map(service => ({
          id: service.id,
          name: service.name,
          desc: service.desc,
          price: service.price,
          unit: '/次',
          category: '上门服务',
          image: '',
          duration: service.duration || 60,
          iconText: service.icon || '🚗',
          iconClass: 'icon-green',
          serviceData: service
        }));

        this.setData({
          currentCategory: categoryIndex,
          services: services,
          isBoardingMode: false,
          isVisitingMode: true
        });
      } else {
        wx.showToast({
          title: res.result.error || '加载服务失败',
          icon: 'none'
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('加载服务失败:', error);
      wx.showToast({
        title: '加载服务失败',
        icon: 'none'
      });
    }
  },

  // 加载房型数据（用于寄养分类）
  async loadBoardingRooms(petType, categoryIndex) {
    wx.showLoading({ title: '加载房型...' });
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'boarding-api',
        data: {
          action: 'getRooms',
          petType: petType
        }
      });

      wx.hideLoading();

      if (res.result && res.result.success) {
        // 将房型数据转换为服务卡片格式
        const rooms = res.result.data.map(room => ({
          id: room.id,
          name: room.name,
          desc: room.description || (room.petType === 'dog' ? '狗狗专属房型' : '猫咪专属房型'),
          price: room.price,
          unit: '/晚',
          category: petType === 'dog' ? '狗狗寄养' : '猫咪寄养',
          image: room.images && room.images[0] ? room.images[0] : '',
          duration: 0,
          iconText: room.petType === 'dog' ? '🐕' : '🐈',
          iconClass: room.petType === 'dog' ? 'icon-orange' : 'icon-teal',
          // 保留原始房型数据
          roomData: room
        }));

        this.setData({
          currentCategory: categoryIndex,
          services: rooms,
          isBoardingMode: true
        });
      } else {
        wx.showToast({
          title: res.result.error || '加载房型失败',
          icon: 'none'
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('加载房型失败:', error);
      wx.showToast({
        title: '加载房型失败',
        icon: 'none'
      });
    }
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
      selectedServiceForBook: service
    });

    // 如果已经有选择的宠物（路径1/2），直接跳转
    if (this.data.selectedPet) {
      this.navigateToNextStep(service, this.data.selectedPet);
      return;
    }

    // 如果是寄养模式，先选择宠物，再跳转到 boarding 页面
    if (this.data.isBoardingMode && service.roomData) {
      this.setData({
        showPetSelector: true,
        bookingMode: 'boarding'
      });
      return;
    }

    // 如果是上门服务模式，先选择宠物，再跳转到 visiting 页面
    if (this.data.isVisitingMode && service.serviceData) {
      this.setData({
        showPetSelector: true,
        bookingMode: 'visiting'
      });
      return;
    }

    // 路径3：显示宠物选择器
    this.setData({
      showPetSelector: true,
      bookingMode: 'path3'
    });
  },

  // 跳转到下一步
  navigateToNextStep(service, pet) {
    // 寄养模式
    if (this.data.isBoardingMode && service.roomData) {
      const room = service.roomData;
      wx.navigateTo({
        url: `/pages/boarding/boarding?roomId=${room.id}&petId=${pet._id}&petType=${pet.type}`
      });
      return;
    }

    // 上门服务模式
    if (this.data.isVisitingMode && service.serviceData) {
      const svc = service.serviceData;
      wx.navigateTo({
        url: `/pages/visiting/visiting?serviceId=${svc.id}&petId=${pet._id}&petType=${pet.type}`
      });
      return;
    }

    // 路径1/2/3：跳转到 booking-time-1
    const url = `/pages/booking-time-1/booking-time-1?mode=path3&petId=${pet._id}&petType=${pet.type}&serviceId=${service.id}`;
    wx.navigateTo({ url });
  },

  // 宠物选择回调
  onPetSelected(e) {
    const { pet } = e.detail;
    const { selectedServiceForBook, bookingMode } = this.data;

    this.setData({
      showPetSelector: false,
      selectedPet: pet
    });

    // 上门服务模式
    if (bookingMode === 'visiting' && selectedServiceForBook && selectedServiceForBook.serviceData) {
      const svc = selectedServiceForBook.serviceData;
      wx.navigateTo({
        url: `/pages/visiting/visiting?serviceId=${svc.id}&petId=${pet._id}&petType=${pet.type}`
      });
      return;
    }

    if (selectedServiceForBook) {
      this.navigateToNextStep(selectedServiceForBook, pet);
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
