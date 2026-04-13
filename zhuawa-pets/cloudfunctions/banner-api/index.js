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
        console.log('[banner-api] 开始查询 banners');
        
        // 先查询所有数据，看看是否有数据
        const allDataResult = await db.collection('banners').get();
        console.log('[banner-api] 所有数据条数:', allDataResult.data.length);
        if (allDataResult.data.length > 0) {
          console.log('[banner-api] 第一条数据:', JSON.stringify(allDataResult.data[0]));
          console.log('[banner-api] 第一条 status 值:', allDataResult.data[0].status);
          console.log('[banner-api] 第一条 status 类型:', typeof allDataResult.data[0].status);
        }
        
        // 使用命令式查询，避免 where 条件问题
        let listResult;
        try {
          listResult = await db.collection('banners')
            .where({
              status: db.command.eq('active')
            })
            .orderBy('sort', 'asc')
            .get();
          console.log('[banner-api] active 状态数据条数:', listResult.data.length);
        } catch (queryErr) {
          console.log('[banner-api] where 查询失败，使用全量查询:', queryErr.message);
          listResult = allDataResult;
        }
        
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
