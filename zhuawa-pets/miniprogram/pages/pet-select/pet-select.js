// 宠物选择页
Page({
  data: {
    pets: [],
    selectedPet: null,
    loading: false
  },

  onLoad() {
    this.loadPets()
  },

  async loadPets() {
    this.setData({ loading: true })
    
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'pets-api',
        data: { action: 'list' }
      })
      
      if (result && result.success) {
        this.setData({ pets: result.data })
        
        // 如果没有宠物，提示添加
        if (result.data.length === 0) {
          wx.showModal({
            title: '提示',
            content: '您还没有添加宠物，是否现在添加？',
            success: (res) => {
              if (res.confirm) {
                this.addPet()
              }
            }
          })
        }
      } else {
        // 降级到模拟数据
        this.setData({
          pets: [
            { id: '1', name: '豆豆', type: 'dog', breed: '柯基', age: 2, weight: '10kg' },
            { id: '2', name: '咪咪', type: 'cat', breed: '英短', age: 1, weight: '5kg' }
          ]
        })
      }
    } catch (err) {
      console.error('加载宠物失败:', err)
      // 降级到模拟数据
      this.setData({
        pets: [
          { id: '1', name: '豆豆', type: 'dog', breed: '柯基', age: 2, weight: '10kg' },
          { id: '2', name: '咪咪', type: 'cat', breed: '英短', age: 1, weight: '5kg' }
        ]
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  selectPet(e) {
    const index = e.currentTarget.dataset.index
    this.setData({ selectedPet: this.data.pets[index] })
  },

  addPet() {
    wx.navigateTo({ url: '/pages/pet-register/pet-register' })
  },

  confirm() {
    if (!this.data.selectedPet) {
      wx.showToast({ title: '请选择宠物', icon: 'none' })
      return
    }

    const pet = this.data.selectedPet
    
    // 路径1：选宠物 -> 选服务（mode=path1）
    wx.navigateTo({
      url: `/pages/service-select/service-select?mode=path1&petId=${pet.id || pet._id}`
    })
  }
})
