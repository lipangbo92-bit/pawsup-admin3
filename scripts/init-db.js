// 数据库初始化脚本 - 创建所需集合
const cloudbase = require('@cloudbase/node-sdk');

const app = cloudbase.init({
  env: 'cloud1-4gy1jyan842d73ab',
  secretId: process.env.TENCENT_SECRET_ID,
  secretKey: process.env.TENCENT_SECRET_KEY
});

const db = app.database();

// 需要创建的集合列表
const collections = [
  'boarding_rooms',   // 房型管理
  'boarding_orders'   // 寄养订单
];

async function initDatabase() {
  console.log('开始初始化数据库...');
  
  for (const collectionName of collections) {
    try {
      // 检查集合是否存在
      await db.collection(collectionName).limit(1).get();
      console.log(`✅ 集合 ${collectionName} 已存在`);
    } catch (error) {
      if (error.code === 'DATABASE_COLLECTION_NOT_EXIST') {
        // 集合不存在，创建它
        try {
          await db.createCollection(collectionName);
          console.log(`✅ 集合 ${collectionName} 创建成功`);
          
          // 添加默认数据
          if (collectionName === 'boarding_rooms') {
            await addDefaultRooms();
          }
        } catch (createError) {
          console.error(`❌ 创建集合 ${collectionName} 失败:`, createError.message);
        }
      } else {
        console.error(`❌ 检查集合 ${collectionName} 失败:`, error.message);
      }
    }
  }
  
  console.log('数据库初始化完成');
}

// 添加默认房型数据
async function addDefaultRooms() {
  const defaultRooms = [
    {
      name: '狗狗标准间',
      petType: 'dog',
      price: 88,
      roomCount: 5,
      area: '6平米',
      facilities: ['独立空调', '24h监控', '每日遛弯'],
      images: [],
      description: '适合中小型犬，基础配置',
      status: 'active',
      createTime: new Date()
    },
    {
      name: '狗狗豪华间',
      petType: 'dog',
      price: 168,
      roomCount: 3,
      area: '10平米',
      facilities: ['独立空调', '24h监控', '每日遛弯', '独立阳台'],
      images: [],
      description: '适合大型犬，豪华配置',
      status: 'active',
      createTime: new Date()
    },
    {
      name: '猫咪标准间',
      petType: 'cat',
      price: 68,
      roomCount: 5,
      area: '4平米',
      facilities: ['独立空调', '24h监控', '猫爬架'],
      images: [],
      description: '适合猫咪，基础配置',
      status: 'active',
      createTime: new Date()
    },
    {
      name: '猫咪豪华间',
      petType: 'cat',
      price: 128,
      roomCount: 3,
      area: '6平米',
      facilities: ['独立空调', '24h监控', '猫爬架', '观景窗'],
      images: [],
      description: '适合猫咪，豪华配置',
      status: 'active',
      createTime: new Date()
    }
  ];
  
  for (const room of defaultRooms) {
    try {
      await db.collection('boarding_rooms').add(room);
      console.log(`  ✅ 添加默认房型: ${room.name}`);
    } catch (error) {
      console.error(`  ❌ 添加房型失败: ${room.name}`, error.message);
    }
  }
}

// 执行初始化
initDatabase().catch(console.error);
