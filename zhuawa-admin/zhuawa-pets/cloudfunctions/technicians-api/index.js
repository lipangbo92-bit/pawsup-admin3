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
          const listResult = await db.collection('technicians').get();
          console.log('[technicians-api] 查询结果条数:', listResult.data ? listResult.data.length : 0);
          
          // 处理数据，过滤掉过大的 base64 图片
          const processedData = (listResult.data || []).map(item => {
            const processed = { ...item };
            
            // 处理头像：只保留 URL，过滤 base64
            let avatar = item.avatar || item.avatarUrl || '';
            if (avatar && avatar.startsWith('data:')) {
              // 如果是 base64，清空（让前端显示默认头像）
              avatar = '';
            }
            processed.avatar = avatar;
            
            // 处理作品图片：只保留 URL，过滤 base64
            let works = [];
            if (item.works && item.works.length > 0) {
              works = item.works.filter(work => {
                // 只保留非 base64 的 URL
                return work && !work.startsWith('data:');
              }).slice(0, 6);
            }
            processed.works = works;
            
            return processed;
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
        const detailData = getResult.data;
        
        // 处理头像：如果是 base64 过大，清空
        let avatar = detailData.avatar || detailData.avatarUrl || '';
        if (avatar && avatar.length > 200000 && avatar.startsWith('data:')) {
          avatar = '';
        }
        
        // 处理作品图片：过滤掉过大的 base64
        let works = [];
        if (detailData.works && detailData.works.length > 0) {
          works = detailData.works.filter(work => {
            if (!work) return false;
            // 如果是 base64 且超过 500KB，过滤掉
            if (work.length > 700000 && work.startsWith('data:')) {
              return false;
            }
            return true;
          }).slice(0, 6);
        }
        
        return {
          success: true,
          data: {
            ...detailData,
            avatar,
            works
          }
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
