// Vercel API Route: /api/membership
// 会员档位管理 API

const cloudbase = require('@cloudbase/node-sdk');

const app = cloudbase.init({
  env: 'cloud1-4gy1jyan842d73ab',
  secretId: process.env.TENCENT_SECRET_ID,
  secretKey: process.env.TENCENT_SECRET_KEY
});

const db = app.database();

// 默认会员档位配置（参考万豪旅享家风格）
const DEFAULT_LEVELS = [
  {
    level: 1,
    name: '普通会员',
    icon: '🏠',
    color: '#8B7355',
    minRecharge: 0,
    maxRecharge: 199999,
    discount: 1.0,
    giftConfig: { enabled: false },
    benefits: ['基础服务'],
    isActive: true,
    sortOrder: 1
  },
  {
    level: 2,
    name: '银卡会员',
    icon: '🥈',
    color: '#4A90A4',
    minRecharge: 200000,
    maxRecharge: 399999,
    discount: 0.9,
    giftConfig: { enabled: true, giftType: 'balance', giftValue: 10000 },
    benefits: ['9折优惠', '充值赠送100元', '优先预约'],
    isActive: true,
    sortOrder: 2
  },
  {
    level: 3,
    name: '金卡会员',
    icon: '🥇',
    color: '#D4AF37',
    minRecharge: 400000,
    maxRecharge: 599999,
    discount: 0.8,
    giftConfig: { enabled: true, giftType: 'balance', giftValue: 30000 },
    benefits: ['8折优惠', '充值赠送300元', '优先预约', '专属客服'],
    isActive: true,
    sortOrder: 3
  },
  {
    level: 4,
    name: '钻石会员',
    icon: '💎',
    color: '#1E3A5F',
    minRecharge: 600000,
    maxRecharge: 99999999,
    discount: 0.75,
    giftConfig: { enabled: true, giftType: 'balance', giftValue: 60000 },
    benefits: ['7.5折优惠', '充值赠送600元', '优先预约', '专属客服', '全年活动'],
    isActive: true,
    sortOrder: 4
  }
];

module.exports = async (req, res) => {
  // 处理 CORS 预检
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  const { action } = req.body || {};
  console.log(`[API Membership] Action: ${action}`);

  try {
    let result;
    
    switch (action) {
      case 'getMembershipLevels':
        result = await getMembershipLevels();
        break;
      case 'initMembershipLevels':
        result = await initMembershipLevels();
        break;
      case 'updateMembershipLevel':
        const { levelId, data: updateData } = req.body;
        result = await updateMembershipLevel(levelId, updateData);
        break;
      default:
        result = { success: false, error: 'Unknown action: ' + action };
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(result);
  } catch (error) {
    console.error('[API Membership] Error:', error);
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 获取会员档位配置
async function getMembershipLevels() {
  try {
    const result = await db.collection('membership_levels').get();

    if (!result.data || result.data.length === 0) {
      return { success: true, data: DEFAULT_LEVELS };
    }

    const sortedData = result.data.sort((a, b) => a.level - b.level);

    const processedData = sortedData.map(doc => {
      const defaultLevel = DEFAULT_LEVELS.find(l => l.level === doc.level);
      return {
        ...defaultLevel,
        ...doc,
        benefits: doc.benefits || defaultLevel?.benefits || []
      };
    });

    return { success: true, data: processedData };
  } catch (error) {
    console.error('获取会员档位失败:', error);
    return { success: true, data: DEFAULT_LEVELS };
  }
}

// 初始化会员档位
async function initMembershipLevels() {
  try {
    const existingResult = await db.collection('membership_levels').get();
    const existingData = existingResult.data || [];

    if (existingData.length > 0) {
      // 更新缺少 benefits 字段的文档
      for (const doc of existingData) {
        if (!doc.benefits) {
          const defaultLevel = DEFAULT_LEVELS.find(l => l.level === doc.level);
          if (defaultLevel) {
            await db.collection('membership_levels').doc(doc._id).update({
              benefits: defaultLevel.benefits,
              updateTime: new Date()
            });
          }
        }
      }
      return { success: true, message: '会员档位已存在' };
    }

    // 插入默认数据
    for (const level of DEFAULT_LEVELS) {
      await db.collection('membership_levels').add({
        ...level,
        createTime: new Date(),
        updateTime: new Date()
      });
    }

    return { success: true, message: '会员档位初始化成功' };
  } catch (error) {
    console.error('初始化会员档位失败:', error);
    return { success: false, error: error.message };
  }
}

// 更新会员档位配置
async function updateMembershipLevel(levelId, data) {
  if (!levelId) {
    return { success: false, error: 'Missing levelId' };
  }

  try {
    const updateData = {
      ...data,
      updateTime: new Date()
    };

    await db.collection('membership_levels').doc(levelId).update(updateData);
    
    return { success: true, message: '更新成功' };
  } catch (error) {
    console.error('更新会员档位失败:', error);
    return { success: false, error: error.message };
  }
}
