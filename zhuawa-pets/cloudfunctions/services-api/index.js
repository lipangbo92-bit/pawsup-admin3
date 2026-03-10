const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  console.log('收到请求:', event);
  
  const body = event.body ? JSON.parse(event.body) : event;
  const action = body.action || 'list';
  
  try {
    switch (action) {
      case 'list':
        console.log('执行 list 操作');
        const listResult = await db.collection('services').get();
        console.log('查询结果:', listResult);
        return { success: true, data: listResult.data, count: listResult.data.length };
      case 'add':
        const addResult = await db.collection('services').add({ data: {...body.data, createTime: db.serverDate()} });
        return { success: true, id: addResult._id };
      case 'update':
        await db.collection('services').doc(body.id).update({ data: {...body.data, updateTime: db.serverDate()} });
        return { success: true };
      case 'delete':
        await db.collection('services').doc(body.id).remove();
        return { success: true };
      default:
        return { success: false, error: 'Unknown action' };
    }
  } catch (error) {
    console.error('错误:', error);
    return { success: false, error: error.message };
  }
};
