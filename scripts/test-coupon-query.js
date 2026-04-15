// 测试优惠券查询
const cloudbase = require('@cloudbase/node-sdk');

const app = cloudbase.init({
  env: 'cloud1-4gy1jyan842d73ab'
});

const db = app.database();

async function testQuery() {
  // 测试用 openid 查询
  const testOpenid = 'oViEi7em8rD7GxkF5oN9JxQ1r2s3'; // 请替换为实际的 openid
  
  console.log('Testing with openid:', testOpenid);
  
  const result = await db.collection('user_coupons')
    .where({ userId: testOpenid })
    .get();
    
  console.log('Found with openid:', result.data.length);
  
  // 显示所有 user_coupons 的 userId
  const all = await db.collection('user_coupons').get();
  console.log('\nAll user_coupons:');
  all.data.forEach((item, i) => {
    console.log(`  ${i + 1}. userId: ${item.userId}, status: ${item.status}`);
  });
}

testQuery().catch(console.error);
