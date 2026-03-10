// cloudfunctions/get-schedule/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { technicianId, startDate, endDate } = event
  
  try {
    // 获取排班数据
    let query = {}
    if (technicianId) {
      query.technicianId = technicianId
    }
    if (startDate && endDate) {
      query.date = _.gte(startDate).lte(endDate)
    }
    
    const scheduleRes = await db.collection('schedules').where(query).get()
    
    // 获取已预约的时间段
    const appointmentRes = await db.collection('appointments').where({
      technicianId: technicianId,
      date: _.gte(startDate).lte(endDate),
      status: _.in(['paid', 'pending'])
    }).get()
    
    // 处理排班数据，标记已被预约的时间段
    const schedules = scheduleRes.data.map(schedule => {
      const bookedTimes = appointmentRes.data
        .filter(a => a.date === schedule.date)
        .map(a => a.time)
      
      return {
        ...schedule,
        slots: schedule.slots.map(slot => ({
          ...slot,
          available: !bookedTimes.includes(slot.time)
        }))
      }
    })
    
    return {
      success: true,
      schedules
    }
  } catch (err) {
    return {
      success: false,
      error: err.message
    }
  }
}
