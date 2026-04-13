const cloud = require('wx-server-sdk');
cloud.init({ env: 'cloud1-4gy1jyan842d73ab' });
const db = cloud.database();

exports.main = async (event, context) => {
  const body = event.body ? JSON.parse(event.body) : event;
  const action = body.action || 'list';
  
  try {
    switch (action) {
      case 'list':
        // 获取所有显示的banner，按排序字段排序
        const listResult = await db.collection('banners')
          .where({ status: 'active' })
          .orderBy('sort', 'asc')
          .get();
        // 展开嵌套的数据格式
        const processedData = listResult.data.map(item => {
          if (item.data && typeof item.data === 'object') {
            return {
              _id: item._id,
              ...item.data
            };
          }
          return item;
        });
        return { success: true, data: processedData };
        
      case 'listAll':
        // 管理端获取所有banner
        const allResult = await db.collection('banners')
          .orderBy('sort', 'asc')
          .get();
        return { success: true, data: allResult.data };
        
      case 'add':
        const addResult = await db.collection('banners').add({
          data: {
            ...body.data,
            createTime: db.serverDate()
          }
        });
        return { success: true, id: addResult._id };
        
      case 'update':
        await db.collection('banners').doc(body.id).update({
          data: {
            ...body.data,
            updateTime: db.serverDate()
          }
        });
        return { success: true };
        
      case 'delete':
        await db.collection('banners').doc(body.id).remove();
        return { success: true };
        
      default:
        return { success: false, error: 'Unknown action' };
    }
  } catch (error) {
    console.error('错误:', error);
    return { success: false, error: error.message };
  }
};
