// pages/orders/orders.js
Page({
  data: {
    // 当前选中的标签
    activeTab: 'all',
    // 标签列表
    tabs: [
      { key: 'all', label: '全部' },
      { key: 'pending', label: '待消费' },
      { key: 'completed', label: '已完成' },
      { key: 'cancelled', label: '已取消' }
    ],
    // 模拟订单数据
    orders: [
      {
        id: 1,
        orderNo: '202402271530',
        status: 'pending',
        service: { name: '狗狗洗护套餐', icon: '🐕', price: 99 },
        technician: '小美',
        pet: '豆豆',
        date: '02月27日',
        time: '15:30'
      },
      {
        id: 2,
        orderNo: '202402201000',
        status: 'completed',
        service: { name: '宠物美容造型', icon: '✂️', price: 199 },
        technician: 'Tony',
        pet: '豆豆',
        date: '02月20日',
        time: '14:00'
      },
      {
        id: 3,
        orderNo: '202402151200',
        status: 'cancelled',
        service: { name: '猫咪洗护套餐', icon: '🐈', price: 129 },
        technician: '小美',
        pet: '咪咪',
        date: '02月15日',
        time: '10:00'
      }
    ],
    // 筛选后的订单
    filteredOrders: []
  },

  onLoad() {
    this.filterOrders()
  },

  // 切换标签
  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ activeTab: tab })
    this.filterOrders()
  },

  // 筛选订单
  filterOrders() {
    const { activeTab, orders } = this.data
    let filtered = orders
    
    if (activeTab !== 'all') {
      filtered = orders.filter(order => order.status === activeTab)
    }
    
    this.setData({ filteredOrders: filtered })
  },

  // 点击订单卡片
  onOrderClick(e) {
    const orderId = e.currentTarget.dataset.id
    console.log('点击订单:', orderId)
    // TODO: 跳转到订单详情页
  },

  // 获取状态标签文本
  getStatusLabel(status) {
    const labels = {
      pending: '待消费',
      completed: '已完成',
      cancelled: '已取消'
    }
    return labels[status] || status
  }
})
