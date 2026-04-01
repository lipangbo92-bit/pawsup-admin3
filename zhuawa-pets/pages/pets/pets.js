// pages/pets/pets.js
Page({
  data: {
    pets: [],
    showSelector: false
  },

  onLoad() {
    this.loadPets()
  },

  onShow() {
    this.loadPets()
  },

  // 加载宠物列表
  async loadPets() {
    try {
      const db = wx.cloud.database()
      const res = await db.collection('pets').orderBy('createTime', 'desc').get()
      this.setData({
        pets: res.data.map(pet => ({ ...pet, avatarError: false }))
      })
    } catch (err) {
      console.error('加载宠物失败:', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  // 显示添加宠物弹窗
  showAddPet() {
    this.setData({ showSelector: true })
  },

  // 编辑宠物
  editPet(e) {
    const { id } = e.currentTarget.dataset
    // 可以在这里实现编辑逻辑，或者跳转到编辑页面
    wx.showToast({ title: '编辑功能开发中', icon: 'none' })
  },

  // 删除宠物
  deletePet(e) {
    const { id } = e.currentTarget.dataset
    const pet = this.data.pets.find(p => p._id === id)
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除宠物「${pet.name}」吗？`,
      confirmColor: '#EF4444',
      success: (res) => {
        if (res.confirm) {
          this.doDeletePet(id)
        }
      }
    })
  },

  // 执行删除
  async doDeletePet(petId) {
    wx.showLoading({ title: '删除中...' })
    try {
      const db = wx.cloud.database()
      await db.collection('pets').doc(petId).remove()
      wx.hideLoading()
      wx.showToast({ title: '删除成功', icon: 'success' })
      this.loadPets()
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: '删除失败', icon: 'none' })
    }
  },

  // 头像加载失败
  onAvatarError(e) {
    const { index } = e.currentTarget.dataset
    const pets = this.data.pets
    pets[index].avatarError = true
    this.setData({ pets })
  },

  // 宠物选择器确认
  onPetConfirm(e) {
    this.setData({ showSelector: false })
    this.loadPets()
  },

  // 宠物选择器关闭
  onPetClose() {
    this.setData({ showSelector: false })
  }
})
