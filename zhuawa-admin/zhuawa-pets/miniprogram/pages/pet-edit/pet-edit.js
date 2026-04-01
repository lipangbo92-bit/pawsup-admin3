// pages/pet-edit/pet-edit.js
Page({
  data: {
    petId: '',
    pet: {
      name: '',
      type: 'dog',
      breed: '',
      age: '',
      weight: '',
      gender: '',
      avatar: '',
      notes: ''
    },
    avatarError: false
  },

  onLoad(options) {
    if (!options.id) {
      wx.showToast({ title: '宠物ID不能为空', icon: 'none' })
      wx.navigateBack()
      return
    }

    this.setData({ petId: options.id })
    this.loadPetDetail()
  },

  // 加载宠物详情
  async loadPetDetail() {
    wx.showLoading({ title: '加载中...' })

    try {
      const { result } = await wx.cloud.callFunction({
        name: 'pets-api',
        data: {
          httpMethod: 'GET',
          path: `/pets/${this.data.petId}`
        }
      })

      if (result && result.success) {
        const pet = result.data
        this.setData({
          pet: {
            name: pet.name || '',
            type: pet.type || 'dog',
            breed: pet.breed || '',
            age: pet.age ? String(pet.age) : '',
            weight: pet.weight ? String(pet.weight) : '',
            gender: pet.gender || '',
            avatar: pet.avatar || '',
            notes: pet.notes || ''
          }
        })
      } else {
        throw new Error(result?.error || '加载失败')
      }
    } catch (err) {
      console.error('加载宠物详情失败:', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  // 选择头像
  async chooseAvatar() {
    try {
      const res = await wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera']
      })

      const tempFilePath = res.tempFiles[0].tempFilePath

      wx.showLoading({ title: '上传中...' })

      // 上传到云存储
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath: `pets/avatar_${this.data.petId}_${Date.now()}.jpg`,
        filePath: tempFilePath
      })

      this.setData({
        'pet.avatar': uploadRes.fileID,
        avatarError: false
      })

      wx.hideLoading()
      wx.showToast({ title: '上传成功', icon: 'success' })
    } catch (err) {
      wx.hideLoading()
      console.error('上传头像失败:', err)
      wx.showToast({ title: '上传失败', icon: 'none' })
    }
  },

  // 头像加载失败
  onAvatarError() {
    this.setData({ avatarError: true })
  },

  // 输入处理
  onNameInput(e) {
    this.setData({ 'pet.name': e.detail.value })
  },

  onBreedInput(e) {
    this.setData({ 'pet.breed': e.detail.value })
  },

  onAgeInput(e) {
    this.setData({ 'pet.age': e.detail.value })
  },

  onWeightInput(e) {
    this.setData({ 'pet.weight': e.detail.value })
  },

  onNotesInput(e) {
    this.setData({ 'pet.notes': e.detail.value })
  },

  // 选择类型
  onTypeSelect(e) {
    const { type } = e.currentTarget.dataset
    this.setData({ 'pet.type': type })
  },

  // 选择性别
  onGenderSelect(e) {
    const { gender } = e.currentTarget.dataset
    this.setData({ 'pet.gender': gender })
  },

  // 保存
  async onSave() {
    const { pet, petId } = this.data

    // 验证
    if (!pet.name.trim()) {
      wx.showToast({ title: '请输入宠物昵称', icon: 'none' })
      return
    }

    if (!pet.type) {
      wx.showToast({ title: '请选择宠物类型', icon: 'none' })
      return
    }

    wx.showLoading({ title: '保存中...' })

    try {
      const { result } = await wx.cloud.callFunction({
        name: 'pets-api',
        data: {
          httpMethod: 'PUT',
          path: `/pets/${petId}`,
          body: JSON.stringify({
            name: pet.name.trim(),
            type: pet.type,
            breed: pet.breed.trim(),
            age: pet.age ? parseFloat(pet.age) : 0,
            weight: pet.weight ? parseFloat(pet.weight) : 0,
            gender: pet.gender,
            avatar: pet.avatar,
            notes: pet.notes.trim()
          })
        }
      })

      wx.hideLoading()

      if (result && result.success) {
        wx.showToast({ title: '保存成功', icon: 'success' })

        // 返回上一页并刷新
        setTimeout(() => {
          const pages = getCurrentPages()
          const prevPage = pages[pages.length - 2]
          if (prevPage && prevPage.loadPets) {
            prevPage.loadPets()
          }
          wx.navigateBack()
        }, 1500)
      } else {
        throw new Error(result?.error || '保存失败')
      }
    } catch (err) {
      wx.hideLoading()
      console.error('保存失败:', err)
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },

  // 删除
  onDelete() {
    const { pet } = this.data

    wx.showModal({
      title: '确认删除',
      content: `确定要删除宠物「${pet.name}」吗？删除后无法恢复。`,
      confirmColor: '#EF4444',
      success: (res) => {
        if (res.confirm) {
          this.doDelete()
        }
      }
    })
  },

  // 执行删除
  async doDelete() {
    wx.showLoading({ title: '删除中...' })

    try {
      const { result } = await wx.cloud.callFunction({
        name: 'pets-api',
        data: {
          httpMethod: 'DELETE',
          path: `/pets/${this.data.petId}`
        }
      })

      wx.hideLoading()

      if (result && result.success) {
        wx.showToast({ title: '删除成功', icon: 'success' })

        // 返回上一页并刷新
        setTimeout(() => {
          const pages = getCurrentPages()
          const prevPage = pages[pages.length - 2]
          if (prevPage && prevPage.loadPets) {
            prevPage.loadPets()
          }
          wx.navigateBack()
        }, 1500)
      } else {
        throw new Error(result?.error || '删除失败')
      }
    } catch (err) {
      wx.hideLoading()
      console.error('删除失败:', err)
      wx.showToast({ title: '删除失败', icon: 'none' })
    }
  }
})