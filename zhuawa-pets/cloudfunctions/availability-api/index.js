const cloud = require('wx-server-sdk')
cloud.init({ env: 'cloud1-4gy1jyan842d73ab' })

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
  // 正确定义时段：上午9-12，下午12-18，晚上18-21
  const periods = [
    { name: '上午', start: 9, end: 12 },   // 9:00 - 12:00
    { name: '下午', start: 12, end: 18 }, // 12:00 - 18:00
    { name: '晚上', start: 18, end: 21 }  // 18:00 - 21:00
  ]

  periods.forEach((period, periodIndex) => {
    const times = []
    // 生成时段
    for (let h = period.start; h <= period.end; h++) {
      // 每个小时生成 :00 和 :30 两个时段
      const minutesList = [0, 30]
      minutesList.forEach(minute => {
        // 跳过时段分界点的重复时间点
        // 上午的12:30不应该生成（因为下午从12:00开始会生成12:30）
        if (periodIndex === 0 && h === 12 && minute === 30) return
        // 下午的18:30不应该生成（因为晚上从18:00开始会生成18:30）
        if (periodIndex === 1 && h === 18 && minute === 30) return
        // 跳过时段起始整点（除了第一个时段）- 避免12:00、18:00重复
        if (minute === 0 && h === period.start && periodIndex > 0) return
        // 21:00 不生成（营业时间结束）
        if (h === 21) return

        const timeStr = h.toString().padStart(2, '0') + ':' + minute.toString().padStart(2, '0')
        times.push({ time: timeStr, selected: false, disabled: true, status: '约满' })
      })
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
      console.log('getAvailableSlots called:', { technicianId, date, duration })
      
      // 支持多种ID格式
      const techIdStr = String(technicianId)
      
      // 从schedules查询该美容师该日期的排班
      const scheduleRes = await db.collection('schedules').where({
        date: date,
        isRestDay: false
      }).get()
      
      console.log('Schedules found:', scheduleRes.data.length)
      
      // 找到匹配的美容师排班（支持多种ID格式）
      const schedule = scheduleRes.data.find(s => 
        s.technicianId === technicianId || 
        s.technicianId === techIdStr || 
        String(s.technicianId) === techIdStr
      )
      
      if (!schedule) {
        console.log('No schedule found for tech:', technicianId)
        return {
          success: true,
          data: { date, technicianId, timeSections: generateTimeSlots() }
        }
      }
      
      console.log('Found schedule for tech:', schedule.technicianId)
      
      const timeSlots = schedule.timeSlots || []
      const isRestDay = schedule.isRestDay
      
      // 查询该日期所有预约
      const ordersRes = await db.collection('orders').where({
        appointmentDate: date,
        status: _.in(['pending', 'confirmed'])
      }).get()
      
      console.log('Total orders on date:', ordersRes.data.length)
      
      // 过滤出该美容师的预约（支持多种ID格式匹配）
      const bookedOrders = ordersRes.data.filter(o => {
        const orderTechId = o.technicianId
        const orderTechIdStr = String(orderTechId)
        const isMatch = orderTechId === technicianId || 
                       orderTechId === techIdStr || 
                       orderTechIdStr === techIdStr
        
        if (isMatch) {
          console.log('Found booking for tech:', o.technicianId, 'at', o.appointmentTime)
        }
        return isMatch
      })
      
      console.log('Booked orders for this tech:', bookedOrders.length)
      
      // 生成所有时段并标记可用性
      const timeSections = generateTimeSlots()
      timeSections.forEach(section => {
        section.times.forEach(slot => {
          // 检查是否在排班中且未被预约
          const slotInfo = timeSlots.find(s => s.time === slot.time)
          const isScheduled = slotInfo && slotInfo.available && !isRestDay
          
          // 检查是否与任何预约冲突（考虑服务时长）
          const isBooked = bookedOrders.some(o => {
            const conflict = hasTimeConflict(slot.time, o.appointmentTime, o.serviceDuration || 60)
            if (conflict) {
              console.log('Time conflict:', slot.time, 'vs booking at', o.appointmentTime)
            }
            return conflict
          })
          
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
      
      console.log('getAvailableTechnicians called:', { date, time, techniciansCount: technicians.length })
      
      // 从schedules查询该时段可约的美容师
      const schedulesRes = await db.collection('schedules').where({
        date: date,
        isRestDay: false
      }).get()
      
      console.log('Schedules found:', schedulesRes.data.length)
      
      const availableTechIds = []
      schedulesRes.data.forEach(schedule => {
        const slot = schedule.timeSlots.find(s => s.time === time && s.available)
        if (slot) {
          availableTechIds.push(schedule.technicianId)
        }
      })
      
      console.log('Available techIds from schedules:', availableTechIds)
      
      // 查询该日期所有预约
      const ordersRes = await db.collection('orders').where({
        appointmentDate: date,
        status: _.in(['pending', 'confirmed'])
      }).get()
      
      console.log('Booked orders:', ordersRes.data.length)
      ordersRes.data.forEach(o => {
        console.log('Order:', o.technicianId, o.appointmentTime, o.status)
      })
      
      // 过滤出可约的美容师（考虑服务时长冲突）
      const results = technicians.filter(tech => {
        // 支持多种ID格式
        const techId = tech.id || tech._id
        const techIdStr = String(techId)
        
        console.log('Checking tech:', tech.name, 'id:', techId, 'str:', techIdStr)
        
        // 检查是否在排班中（支持字符串和数字匹配）
        const inSchedule = availableTechIds.some(id => 
          id === techId || id === techIdStr || String(id) === techIdStr
        )
        
        if (!inSchedule) {
          console.log('Tech not in schedule:', tech.name)
          return false
        }
        
        // 检查是否与任何预约冲突（支持多种ID格式匹配）
        const hasConflict = ordersRes.data.some(o => {
          const orderTechId = o.technicianId
          const orderTechIdStr = String(orderTechId)
          const isSameTech = orderTechId === techId || 
                            orderTechId === techIdStr || 
                            orderTechIdStr === techIdStr
          
          if (isSameTech) {
            const conflict = hasTimeConflict(time, o.appointmentTime, o.serviceDuration)
            console.log('Conflict check:', tech.name, 'vs order at', o.appointmentTime, 'conflict:', conflict)
            return conflict
          }
          return false
        })
        
        console.log('Tech available:', tech.name, '!conflict:', !hasConflict)
        return !hasConflict
      })
      
      console.log('Final available technicians:', results.length)
      
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
