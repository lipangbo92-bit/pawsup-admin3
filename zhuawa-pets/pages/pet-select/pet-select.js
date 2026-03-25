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

  // 头像加载失败处理
  onAvatarError(e) {
    const { index } = e.currentTarget.dataset
    const pets = this.data.pets
    pets[index].avatarError = true
    this.setData({ pets })
  },

  // 编辑宠物
  onEditPet(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/pet-edit/pet-edit?id=${id}`
    })
  },

  // 删除宠物
  onDeletePet(e) {
    const { id, index } = e.currentTarget.dataset
    const pet = this.data.pets[index]

    wx.showModal({
      title: '确认删除',
      content: `确定要删除宠物「${pet.name}」吗？`,
      confirmColor: '#EF4444',
      success: (res) => {
        if (res.confirm) {
          this.deletePet(id)
        }
      }
    })
  },

  // 执行删除
  async deletePet(petId) {
    wx.showLoading({ title: '删除中...' })

    try {
      const { result } = await wx.cloud.callFunction({
        name: 'pets-api',
        data: {
          httpMethod: 'DELETE',
          path: `/pets/${petId}`
        }
      })

      wx.hideLoading()

      if (result && result.success) {
        wx.showToast({ title: '删除成功', icon: 'success' })

        // 如果删除的是当前选中的宠物，清空选择
        if (this.data.selectedPet && (this.data.selectedPet.id === petId || this.data.selectedPet._id === petId)) {
          this.setData({ selectedPet: null })
        }

        // 刷新列表
        this.loadPets()
      } else {
        throw new Error(result?.error || '删除失败')
      }
    } catch (err) {
      wx.hideLoading()
      console.error('删除宠物失败:', err)
      wx.showToast({ title: '删除失败', icon: 'none' })
    }
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
