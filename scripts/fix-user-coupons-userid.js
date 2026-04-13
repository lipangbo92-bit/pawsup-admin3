// 修复 user_coupons 中的 userId 脚本
// 将 userId 从 _id 格式改为 openid 格式

const cloudbase = require('@cloudbase/node-sdk');

const app = cloudbase.init({
  env: 'cloud1-4gy1jyan842d73ab'
});

const db = app.database();

async function fixUserCouponsUserId() {
  console.log('开始修复 user_coupons 中的 userId...');

  try {
    // 1. 获取所有用户，建立 _id -> openid 的映射
    console.log('1. 获取所有用户...');
    const usersResult = await db.collection('users').get();
    const users = usersResult.data;

    console.log(`   找到 ${users.length} 个用户`);

    // 建立映射表
    const userIdMap = {};
    users.forEach(user => {
      if (user._id && user.openid) {
        userIdMap[user._id] = user.openid;
      }
    });

    console.log(`   建立了 ${Object.keys(userIdMap).length} 个用户的映射`);

    // 2. 获取所有 user_coupons
    console.log('2. 获取所有 user_coupons...');
    const couponsResult = await db.collection('user_coupons').get();
    const coupons = couponsResult.data;

    console.log(`   找到 ${coupons.length} 张用户优惠券`);

    // 3. 检查并修复
    let fixCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const coupon of coupons) {
      const currentUserId = coupon.userId;

      // 如果 currentUserId 在映射表中，说明是 _id 格式，需要修复
      if (userIdMap[currentUserId]) {
        const newUserId = userIdMap[currentUserId];
        console.log(`   修复: ${currentUserId} -> ${newUserId}`);

        try {
          await db.collection('user_coupons').doc(coupon._id).update({
            userId: newUserId
          });
          fixCount++;
        } catch (err) {
          console.error(`   修复失败 (${coupon._id}):`, err.message);
          errorCount++;
        }
      } else {
        // 检查是否已经是 openid 格式（不在映射表中）
        const isOpenidFormat = users.some(u => u.openid === currentUserId);
        if (isOpenidFormat) {
          console.log(`   跳过: ${currentUserId} (已是 openid 格式)`);
          skipCount++;
        } else {
          console.log(`   警告: ${currentUserId} (未找到对应用户)`);
          errorCount++;
        }
      }
    }

    console.log('\n修复完成！');
    console.log(`  修复: ${fixCount} 张`);
    console.log(`  跳过: ${skipCount} 张`);
    console.log(`  错误: ${errorCount} 张`);

  } catch (error) {
    console.error('修复失败:', error);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  fixUserCouponsUserId();
}

module.exports = { fixUserCouponsUserId };
