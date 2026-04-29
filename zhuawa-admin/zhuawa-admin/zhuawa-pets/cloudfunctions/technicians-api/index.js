// 云函数入口文件 - 修复版
const cloud = require('wx-server-sdk');

// 初始化云开发环境
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {
  console.log('收到请求:', event);
  
  const action = event.action || 'list';
  
  try {
    switch (action) {
      case 'list':
        console.log('执行 list 操作');
        const listResult = await db.collection('technicians').get();
        console.log('查询结果:', listResult);
        
        return {
          success: true,
          data: listResult.data,
          message: '获取成功'
        };
        
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
