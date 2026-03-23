// 云函数入口文件 - 修复版
const cloud = require('wx-server-sdk');

// 初始化云开发环境 - 使用固定环境ID，确保和管理端一致
cloud.init({
  env: 'cloud1-4gy1jyan842d73ab'
});

const db = cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {
  console.log('收到请求:', event);
  
  const action = event.action || 'list';
  
  try {
    switch (action) {
      case 'list':
        console.log('[technicians-api] 执行 list 操作');
        
        try {
          // 使用 limit 限制返回数量，避免超过 1MB
          const listResult = await db.collection('technicians').limit(10).get();
          console.log('[technicians-api] 查询结果条数:', listResult.data ? listResult.data.length : 0);
          
          // 只返回最少必要字段
          const processedData = (listResult.data || []).map(item => {
            return {
              _id: item._id,
              name: item.name,
              level: item.level,
              position: item.position,
              rating: item.rating || 5,
              orders: item.orders || item.orderCount || 0,
              specialty: item.specialty,
              introduction: item.introduction,
              status: item.status,
              // 完全不返回图片字段，避免超过限制
              avatar: '',
              works: []
            };
          });
          
          return {
            success: true,
            data: processedData,
            count: processedData.length,
            message: '获取成功'
          };
        } catch (dbError) {
          console.error('[technicians-api] 数据库查询错误:', dbError);
          return {
            success: false,
            error: dbError.message,
            message: '数据库查询失败'
          };
        }
        
      case 'add':
        const addResult = await db.collection('technicians').add({
          data: {
            ...event.data,
            createTime: db.serverDate()
          }
        });
        return {
          success: true,
          id: addResult._id,
          message: '添加成功'
        };
        
      case 'update':
        await db.collection('technicians').doc(event.id).update({
          data: {
            ...event.data,
            updateTime: db.serverDate()
          }
        });
        return {
          success: true,
          message: '更新成功'
        };
        
      case 'delete':
        await db.collection('technicians').doc(event.id).remove();
        return {
          success: true,
          message: '删除成功'
        };
        
      case 'get':
        const getResult = await db.collection('technicians').doc(event.id).get();
        return {
          success: true,
          data: getResult.data
        };
        
      default:
        return {
          success: false,
          error: '未知操作: ' + action
        };
    }
  } catch (error) {
    console.error('操作失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
