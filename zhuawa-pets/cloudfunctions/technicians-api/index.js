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
            
            // 处理头像：如果是 base64 过大（超过 100KB），清空
            const avatar = item.avatar || item.avatarUrl || '';
            const avatarSize = avatar ? Math.round(avatar.length / 1024) : 0;
            console.log(`[technicians-api] 头像大小: ${avatarSize} KB, 类型: ${avatar.startsWith('data:') ? 'base64' : 'url'}`);
            
            if (avatar && avatar.length > 200000 && avatar.startsWith('data:')) {
              // 200000 字符 ≈ 150KB base64
              console.log(`[technicians-api] 头像 base64 过大(${avatarSize}KB > 150KB)，清空:`, item._id);
              processed.avatar = '';
            } else {
              processed.avatar = avatar;
            }
            
            // 处理作品图片：过滤掉过大的 base64（超过 200KB）
            if (item.works && item.works.length > 0) {
              console.log(`[technicians-api] 处理 ${item.works.length} 张作品图片`);
              processed.works = item.works.filter((work, index) => {
                if (!work) return false;
                const workSize = Math.round(work.length / 1024);
                const isBase64 = work.startsWith('data:');
                console.log(`[technicians-api] 作品${index + 1}: ${workSize} KB, ${isBase64 ? 'base64' : 'url'}`);
                
                // 如果是 base64 且超过 300KB，过滤掉
                if (work.length > 420000 && isBase64) {
                  console.log(`[technicians-api] 作品${index + 1} base64 过大(${workSize}KB > 300KB)，过滤`);
                  return false;
                }
                return true;
              }).slice(0, 6); // 最多返回6张
              console.log(`[technicians-api] 最终保留 ${processed.works.length} 张作品图片`);
            } else {
              processed.works = [];
            }
            
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
