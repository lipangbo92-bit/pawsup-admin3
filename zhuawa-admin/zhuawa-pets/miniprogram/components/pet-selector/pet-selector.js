Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    }
  },

  data: {
    pets: [],
    selectedPet: null,
    loading: false,
    errorMsg: ''
  },

  observers: {
    'visible': function(visible) {
      if (visible) {
        this.loadPets()
      }
    }
  },

  methods: {
    // 加载宠物列表
    async loadPets() {
      this.setData({ loading: true, errorMsg: '' })
      
      try {
        const { result } = await wx.cloud.callFunction({
          name: 'pets-api',
          data: {
            httpMethod: 'GET',
            path: '/pets'
          }
        })
        
        console.log('pets-api result:', result)
        
        if (result && result.success && result.data) {
          this.setData({ 
            pets: result.data,
            loading: false 
          })
          
          // 如果没有宠物，显示提示
          if (result.data.length === 0) {
            console.log('没有宠物数据')
          }
        } else {
          // 使用本地模拟数据
          console.log('使用本地模拟数据')
          this.setData({
            pets: [
              { _id: '1', name: '豆豆', type: 'dog', breed: '柯基', age: 2, weight: '10kg', avatar: '' },
              { _id: '2', name: '咪咪', type: 'cat', breed: '英短', age: 1, weight: '5kg', avatar: '' }
            ],
            loading: false
          })
        }
      } catch (err) {
        console.error('加载宠物失败:', err)
        // 降级到本地数据
        this.setData({
          pets: [
            { _id: '1', name: '豆豆', type: 'dog', breed: '柯基', age: 2, weight: '10kg', avatar: '' },
            { _id: '2', name: '咪咪', type: 'cat', breed: '英短', age: 1, weight: '5kg', avatar: '' }
          ],
          loading: false
        })
      }
    },

    // 选择宠物
    onSelectPet(e) {
      const { index } = e.currentTarget.dataset
      const pet = this.data.pets[index]
      this.setData({ selectedPet: pet })
    },

    // 添加宠物
    onAddPet() {
      this.triggerEvent('addPet')
    },

    // 确认选择
    onConfirm() {
      if (!this.data.selectedPet) {
        wx.showToast({ title: '请先选择宠物', icon: 'none' })
        return
      }
      this.triggerEvent('confirm', { pet: this.data.selectedPet })
      this.setData({ selectedPet: null })
    },

    // 关闭弹窗
    onClose() {
      this.triggerEvent('close')
      this.setData({ selectedPet: null })
    },

    // 点击遮罩关闭
    onMaskTap() {
      this.onClose()
    },

    // 阻止冒泡
    onPopupTap() {
      // 什么都不做，只是阻止冒泡
    }
  }
})
