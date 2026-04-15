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

// 检查新预约的完整时间段是否与已有预约冲突
function hasFullDurationConflict(newStartTime, newDuration, bookedTime, bookedDuration) {
  const newStart = parseTime(newStartTime)
  const newEnd = newStart + newDuration

  const bookedStart = parseTime(bookedTime)
  const bookedEnd = bookedStart + (bookedDuration || 60)

  // 有重叠即冲突
  return newStart < bookedEnd && newEnd > bookedStart
}

// 检查技师是否能承接指定服务
function canTechnicianHandleService(tech, serviceCategory) {
  if (!serviceCategory) return true

  const position = tech.position || '美容师'
  const isGroomingService = serviceCategory.includes('造型')

  // 洗护师不能做造型项目
  if (position === '洗护师' && isGroomingService) {
    return false
  }

  return true
}

// 生成时间段
function generateTimeSlots(date, duration = 60, workEnd = '21:00') {
  const slots = []
  // 正确定义时段：上午9-12，下午12-18，晚上18-21
  const periods = [
    { name: '上午', start: 9, end: 12 },   // 9:00 - 12:00
    { name: '下午', start: 12, end: 18 }, // 12:00 - 18:00
    { name: '晚上', start: 18, end: 21 }  // 18:00 - 21:00
  ]

  // 获取北京时间（UTC+8）
  const now = new Date()
  const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000)
  const todayStr = beijingTime.toISOString().split('T')[0]
  const isToday = date === todayStr

  console.log('生成时段 - 日期:', date, '今天:', todayStr, '是否今天:', isToday, '当前北京时间:', beijingTime.toISOString(), '下班时间:', workEnd)

  // 计算最晚可预约时间（workEnd - 服务时长）
  const workEndMinutes = parseTime(workEnd)
  const latestStartMinutes = workEndMinutes - duration

  console.log('服务时长:', duration, '下班时间(分钟):', workEndMinutes, '最晚开始(分钟):', latestStartMinutes)

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
        // 超过下班时间的不生成
        const currentMinutes = h * 60 + minute
        if (currentMinutes >= workEndMinutes) return

        const timeStr = h.toString().padStart(2, '0') + ':' + minute.toString().padStart(2, '0')

        // 判断是否为今天且时间已过期（至少提前30分钟）- 使用北京时间
        let isExpired = false
        if (isToday) {
          const [hours, mins] = timeStr.split(':').map(Number)
          // 构建预约时间的北京时间
          const bookingTime = new Date(beijingTime)
          bookingTime.setHours(hours, mins, 0, 0)
          // 最早可预约时间 = 当前时间 + 30分钟
          const minBookingTime = new Date(beijingTime.getTime() + 30 * 60 * 1000)
          isExpired = bookingTime < minBookingTime
          console.log('时间检查:', timeStr, '预约时间:', bookingTime.toISOString(), '最早可约:', minBookingTime.toISOString(), '是否过期:', isExpired)
        }

        // 判断是否在可预约范围内（考虑服务时长和实际下班时间）
        const slotStartMinutes = parseTime(timeStr)
        const isTooLate = slotStartMinutes > latestStartMinutes

        const disabled = isExpired || isTooLate
        const status = isExpired ? '已过期' : (isTooLate ? '不可约' : '约满')

        times.push({ time: timeStr, selected: false, disabled: disabled, status: status })
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
      const { technicians = [], serviceCategory = '' } = event

      // 从schedules集合查询该日期所有美容师的排班
      const schedulesRes = await db.collection('schedules').where({
        date: date,
        isRestDay: false
      }).get()

      console.log('Available schedules:', schedulesRes.data.length, 'technicians:', technicians.length, 'service:', serviceCategory)

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

      // 收集所有有排班的美容师的下班时间（取最小值作为全局最晚可约时间）
      let globalWorkEnd = '21:00'
      schedulesRes.data.forEach(s => {
        if (s.workEnd && parseTime(s.workEnd) < parseTime(globalWorkEnd)) {
          globalWorkEnd = s.workEnd
        }
      })

      // 生成时段并标记可用性（传入日期、时长、全局下班时间）
      const timeSections = generateTimeSlots(date, duration, globalWorkEnd)
      timeSections.forEach(section => {
        section.times.forEach(slot => {
          // 如果已经标记为过期或太晚，直接跳过
          if (slot.status === '已过期' || slot.status === '不可约') {
            slot.availableCount = 0
            return
          }

          // 获取该时段可约的美容师列表
          const availableTechIds = slotAvailability[slot.time] || []

          // 过滤掉不能做该服务的技师（洗护师不能做造型项目）
          const serviceCapableTechIds = technicians.length > 0
            ? availableTechIds.filter(id => {
                const tech = technicians.find(t => t.id === id || t._id === id || String(t.id) === String(id) || String(t._id) === String(id))
                if (!tech) return false
                return canTechnicianHandleService(tech, serviceCategory)
              })
            : availableTechIds

          // 额外过滤：服务时长不能超过该技师的下班时间
          const durationCapableTechIds = serviceCapableTechIds.filter(id => {
            const schedule = schedulesRes.data.find(s =>
              s.technicianId === id || s.technicianId === String(id) || String(s.technicianId) === String(id)
            )
            const techWorkEnd = schedule && schedule.workEnd ? schedule.workEnd : '21:00'
            const slotStartMinutes = parseTime(slot.time)
            const workEndMinutes = parseTime(techWorkEnd)
            return slotStartMinutes + duration <= workEndMinutes
          })

          // 过滤掉已被预约的美容师（考虑新预约的完整服务时长与已有预约的冲突）
          const bookedTechIds = ordersRes.data
            .filter(o => {
              // 检查新预约的完整时间段是否与该预约冲突
              return hasFullDurationConflict(slot.time, duration, o.appointmentTime, o.serviceDuration)
            })
            .map(o => o.technicianId)

          const reallyAvailable = durationCapableTechIds.filter(id => !bookedTechIds.includes(id))

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
          data: { date, technicianId, timeSections: generateTimeSlots(date, duration) }
        }
      }

      console.log('Found schedule for tech:', schedule.technicianId)

      const timeSlots = schedule.timeSlots || []
      const isRestDay = schedule.isRestDay

      // 使用该美容师的实际下班时间生成时段
      const techWorkEnd = schedule.workEnd || '21:00'
      console.log('Tech workEnd:', techWorkEnd)

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

      // 生成所有时段并标记可用性（传入日期、时长、实际下班时间）
      const timeSections = generateTimeSlots(date, duration, techWorkEnd)
      timeSections.forEach(section => {
        section.times.forEach(slot => {
          // 检查是否在排班中且未被预约
          const slotInfo = timeSlots.find(s => s.time === slot.time)
          const isScheduled = slotInfo && slotInfo.available && !isRestDay

          // 如果已经标记为过期或太晚，直接跳过
          if (slot.status === '已过期' || slot.status === '不可约') {
            return
          }

          // 检查是否与任何预约冲突（考虑新预约的完整服务时长）
          const isBooked = bookedOrders.some(o => {
            const conflict = hasFullDurationConflict(slot.time, duration, o.appointmentTime, o.serviceDuration || 60)
            if (conflict) {
              console.log('Time conflict:', slot.time, 'duration:', duration, 'vs booking at', o.appointmentTime)
            }
            return conflict
          })

          // 额外检查：服务时长是否超出下班时间
          const slotStartMinutes = parseTime(slot.time)
          const workEndMinutes = parseTime(techWorkEnd)
          const isBeyondWorkEnd = slotStartMinutes + duration > workEndMinutes

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
          } else if (isBeyondWorkEnd) {
            slot.disabled = true
            slot.status = '不可约'
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
      const { technicians, time, serviceCategory } = event

      console.log('getAvailableTechnicians called:', { date, time, techniciansCount: technicians.length, serviceCategory, duration })

      // 从schedules查询该时段可约的美容师
      const schedulesRes = await db.collection('schedules').where({
        date: date,
        isRestDay: false
      }).get()

      console.log('Schedules found:', schedulesRes.data.length)

      // 查询该日期所有预约
      const ordersRes = await db.collection('orders').where({
        appointmentDate: date,
        status: _.in(['pending', 'confirmed'])
      }).get()

      console.log('Booked orders:', ordersRes.data.length)
      ordersRes.data.forEach(o => {
        console.log('Order:', o.technicianId, o.appointmentTime, o.status)
      })

      // 过滤出可约的美容师（考虑服务时长冲突和服务范围）
      const results = technicians.filter(tech => {
        // 支持多种ID格式
        const techId = tech.id || tech._id
        const techIdStr = String(techId)

        console.log('Checking tech:', tech.name, 'id:', techId, 'position:', tech.position)

        // 检查服务范围：洗护师不能做造型项目（仅在传了 technicians 时检查）
        if (technicians.length > 0 && !canTechnicianHandleService(tech, serviceCategory)) {
          console.log('Tech cannot handle this service:', tech.name, 'position:', tech.position, 'service:', serviceCategory)
          return false
        }

        // 检查是否在排班中（支持字符串和数字匹配）
        const schedule = schedulesRes.data.find(s =>
          s.technicianId === techId || s.technicianId === techIdStr || String(s.technicianId) === techIdStr
        )
        const slot = schedule && schedule.timeSlots.find(s => s.time === time && s.available)

        if (!slot) {
          console.log('Tech not in schedule:', tech.name)
          return false
        }

        // 检查服务时长是否超出该技师的下班时间
        const techWorkEnd = schedule.workEnd || '21:00'
        const slotStartMinutes = parseTime(time)
        const workEndMinutes = parseTime(techWorkEnd)
        if (slotStartMinutes + duration > workEndMinutes) {
          console.log('Tech workEnd exceeded:', tech.name, 'time:', time, 'duration:', duration, 'workEnd:', techWorkEnd)
          return false
        }

        // 检查是否与任何预约冲突（支持多种ID格式匹配，考虑新预约的完整服务时长）
        const hasConflict = ordersRes.data.some(o => {
          const orderTechId = o.technicianId
          const orderTechIdStr = String(orderTechId)
          const isSameTech = orderTechId === techId ||
                            orderTechId === techIdStr ||
                            orderTechIdStr === techIdStr

          if (isSameTech) {
            const conflict = hasFullDurationConflict(time, duration, o.appointmentTime, o.serviceDuration)
            console.log('Conflict check:', tech.name, 'time:', time, 'duration:', duration, 'vs order at', o.appointmentTime, 'conflict:', conflict)
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
