const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

// 解析时间为分钟数
function parseTime(timeStr) {
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + m
}

// 检查两个时间段是否冲突
function hasTimeConflict(slotTime, bookedTime, bookedDuration) {
  const slotStart = parseTime(slotTime)
  const slotEnd = slotStart + 30 // 每个时段30分钟
  
  const bookedStart = parseTime(bookedTime)
  const bookedEnd = bookedStart + (bookedDuration || 60)
  
  // 有重叠即冲突
  return slotStart < bookedEnd && slotEnd > bookedStart
}

// 生成时间段
function generateTimeSlots() {
  const slots = []
  const periods = [
    { name: '上午', start: 9, end: 12 },
    { name: '下午', start: 13, end: 17 },
    { name: '晚上', start: 18, end: 21 }
  ]
  
  periods.forEach(period => {
    const times = []
    for (let h = period.start; h < period.end; h++) {
      times.push({ time: h.toString().padStart(2, '0') + ':00', selected: false, disabled: true, status: '约满' })
      times.push({ time: h.toString().padStart(2, '0') + ':30', selected: false, disabled: true, status: '约满' })
    }
    slots.push({ period: period.name, times })
  })
  return slots
}

exports.main = async (event, context) => {
  const { action, technicianId, date, duration = 60 } = event
  
  // 查询某天所有时段的可约情况（用于路径1：先选时间）
  if (action === 'getAllSlotsAvailability') {
    try {
      // 从schedules集合查询该日期所有美容师的排班
      const schedulesRes = await db.collection('schedules').where({
        date: date,
        isRestDay: false
      }).get()
      
      console.log('Available schedules:', schedulesRes.data.length)
      
      // 按时段分组统计可约美容师
      const slotAvailability = {}
      schedulesRes.data.forEach(schedule => {
        const techId = schedule.technicianId
        const timeSlots = schedule.timeSlots || []
        
        timeSlots.forEach(slot => {
          if (slot.available) {
            if (!slotAvailability[slot.time]) {
              slotAvailability[slot.time] = []
            }
            slotAvailability[slot.time].push(techId)
          }
        })
      })
      
      // 查询该日期所有预约
      const ordersRes = await db.collection('orders').where({
        appointmentDate: date,
        status: _.in(['pending', 'confirmed'])
      }).get()
      
      console.log('Booked orders:', ordersRes.data.length)
      
      // 生成时段并标记可用性
      const timeSections = generateTimeSlots()
      timeSections.forEach(section => {
        section.times.forEach(slot => {
          // 获取该时段可约的美容师列表
          const availableTechs = slotAvailability[slot.time] || []
          
          // 过滤掉已被预约的美容师（考虑服务时长冲突）
          const bookedTechs = ordersRes.data
            .filter(o => {
              // 检查该预约是否与当前时段冲突
              return hasTimeConflict(slot.time, o.appointmentTime, o.serviceDuration)
            })
            .map(o => o.technicianId)
          
          const reallyAvailable = availableTechs.filter(id => !bookedTechs.includes(id))
          
          slot.availableCount = reallyAvailable.length
          
          // 根据可约数量设置状态
          if (reallyAvailable.length === 0) {
            slot.disabled = true
            slot.status = '约满'
          } else if (reallyAvailable.length <= 1) {
            slot.disabled = false
            slot.status = '紧张'
          } else {
            slot.disabled = false
            slot.status = '可约'
          }
        })
      })
      
      return {
        success: true,
        data: { date, timeSections }
      }
      
    } catch (err) {
      console.error('getAllSlotsAvailability error:', err)
      return { success: false, error: err.message }
    }
  }
  
  // 查询指定美容师的可用时段（用于路径2：已选美容师）
  if (action === 'getAvailableSlots') {
    try {
      // 从schedules查询该美容师该日期的排班
      const scheduleRes = await db.collection('schedules').where({
        technicianId: technicianId,
        date: date
      }).get()
      
      if (scheduleRes.data.length === 0) {
        return {
          success: true,
          data: { date, technicianId, timeSections: generateTimeSlots() }
        }
      }
      
      const schedule = scheduleRes.data[0]
      const timeSlots = schedule.timeSlots || []
      const isRestDay = schedule.isRestDay
      
      // 查询该美容师该日期的已有预约
      const ordersRes = await db.collection('orders').where({
        technicianId: technicianId,
        appointmentDate: date,
        status: _.in(['pending', 'confirmed'])
      }).get()
      
      const bookedOrders = ordersRes.data
      
      // 生成所有时段并标记可用性
      const timeSections = generateTimeSlots()
      timeSections.forEach(section => {
        section.times.forEach(slot => {
          // 检查是否在排班中且未被预约
          const slotInfo = timeSlots.find(s => s.time === slot.time)
          const isScheduled = slotInfo && slotInfo.available && !isRestDay
          
          // 检查是否与任何预约冲突（考虑服务时长）
          const isBooked = bookedOrders.some(o => 
            hasTimeConflict(slot.time, o.appointmentTime, o.serviceDuration)
          )
          
          if (isRestDay) {
            slot.disabled = true
            slot.status = '休息'
          } else if (!slotInfo) {
            slot.disabled = true
            slot.status = '休息'
          } else if (isBooked) {
            slot.disabled = true
            slot.status = '已约'
          } else if (!slotInfo.available) {
            slot.disabled = true
            slot.status = '休息'
          } else {
            slot.disabled = false
            slot.status = '可约'
          }
        })
      })
      
      return {
        success: true,
        data: { date, technicianId, timeSections }
      }
      
    } catch (err) {
      console.error('getAvailableSlots error:', err)
      return { success: false, error: err.message }
    }
  }
  
  // 查询某天某时段可约的美容师（用于路径1/3：先选时间）
  if (action === 'getAvailableTechnicians') {
    try {
      const { technicians, time } = event
      
      // 从schedules查询该时段可约的美容师
      const schedulesRes = await db.collection('schedules').where({
        date: date,
        isRestDay: false
      }).get()
      
      const availableTechIds = []
      schedulesRes.data.forEach(schedule => {
        const slot = schedule.timeSlots.find(s => s.time === time && s.available)
        if (slot) {
          availableTechIds.push(schedule.technicianId)
        }
      })
      
      // 查询该日期所有预约
      const ordersRes = await db.collection('orders').where({
        appointmentDate: date,
        status: _.in(['pending', 'confirmed'])
      }).get()
      
      // 过滤出可约的美容师（考虑服务时长冲突）
      const results = technicians.filter(tech => {
        const techId = tech.id || tech._id
        
        // 检查是否在排班中
        if (!availableTechIds.includes(techId)) {
          return false
        }
        
        // 检查是否与任何预约冲突
        const hasConflict = ordersRes.data.some(o => 
          o.technicianId === techId && 
          hasTimeConflict(time, o.appointmentTime, o.serviceDuration)
        )
        
        return !hasConflict
      })
      
      return {
        success: true,
        data: results
      }
      
    } catch (err) {
      console.error('getAvailableTechnicians error:', err)
      return { success: false, error: err.message }
    }
  }
  
  return { success: false, error: 'Unknown action' }
}
