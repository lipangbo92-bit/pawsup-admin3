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
          // 保留原始服务数据
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
          isBoardingMode: true,
          isVisitingMode: false
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