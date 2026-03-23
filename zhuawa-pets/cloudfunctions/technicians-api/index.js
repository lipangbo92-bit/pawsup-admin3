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
          
          // 处理数据，避免返回过大的 base64 图片
          const processedData = (listResult.data || []).map(item => {
            // 如果 avatar 是 base64 且过大，截断或替换
            let avatar = item.avatar || item.avatarUrl || '';
            if (avatar && avatar.length > 1000) {
              console.log('[technicians-api] 头像数据过大，长度:', avatar.length);
              // 保留前100个字符作为标识，或者使用占位符
              avatar = avatar.substring(0, 100) + '...(truncated)';
            }
            
            // 处理作品图片
            let works = item.works || [];
            if (works.length > 0) {
              works = works.map((work, index) => {
                if (work && work.length > 1000) {
                  console.log('[technicians-api] 作品图片过大，索引:', index);
                  return work.substring(0, 100) + '...(truncated)';
                }
                return work;
              });
            }
            
            return {
              ...item,
              avatar,
              works
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
