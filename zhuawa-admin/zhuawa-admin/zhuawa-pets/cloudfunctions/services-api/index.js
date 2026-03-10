const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const body = event.body ? JSON.parse(event.body) : event;
  const action = body.action || 'list';
  
  try {
    switch (action) {
      case 'list':
        const listResult = await db.collection('services').get();
        return { success: true, data: listResult.data };
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
    return { success: false, error: error.message };
  }
};