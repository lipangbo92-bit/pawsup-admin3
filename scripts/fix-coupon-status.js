// 修复优惠券状态脚本
// 运行方式: node fix-coupon-status.js

const cloudbase = require('@cloudbase/node-sdk');

const app = cloudbase.init({
  env: 'cloud1-4gy1jyan842d73ab'
});

const db = app.database();

async function fixCouponStatus() {
  console.log('开始修复优惠券状态...');
  
  try {
    // 获取所有没有 status 字段或 status 为空的优惠券
    const result = await db.collection('coupons').get();
    
    console.log(`找到 ${result.data.length} 个优惠券`);
    
    let fixedCount = 0;
    
    for (const coupon of result.data) {
      // 如果没有 status 字段，设置为 'active'
      if (!coupon.status) {
        console.log(`修复优惠券: ${coupon.name} (${coupon.code})`);
        
        await db.collection('coupons').doc(coupon._id).update({
          status: 'active',
          updateTime: new Date()
        });
        
        fixedCount++;
      }
    }
    
    console.log(`修复完成！共修复 ${fixedCount} 个优惠券`);
    
  } catch (error) {
    console.error('修复失败:', error);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  fixCouponStatus();
}

module.exports = { fixCouponStatus };
