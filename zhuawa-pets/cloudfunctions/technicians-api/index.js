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
        console.log('[technicians-api] 当前环境:', cloud.DYNAMIC_CURRENT_ENV);
        
        try {
          const listResult = await db.collection('technicians').get();
          console.log('[technicians-api] 查询结果:', listResult);
          console.log('[technicians-api] 数据条数:', listResult.data ? listResult.data.length : 0);
          
          return {
            success: true,
            data: listResult.data || [],
            count: listResult.data ? listResult.data.length : 0,
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
