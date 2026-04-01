// 模拟支付云函数 - 用于测试
const cloud = require('wx-server-sdk');

cloud.init({
  env: 'cloud1-4gy1jyan842d73ab'
});

const db = cloud.database();

exports.main = async (event, context) => {
  const { action, orderId, orderNo, amount, type } = event;

  console.log('payment-api called:', { action, orderId, orderNo, amount, type });

  try {
    switch (action) {
      case 'createPayment':
        return await createMockPayment(orderId, orderNo, amount, type);
      default:
        return {
          success: false,
          error: 'Unknown action: ' + action
        };
    }
  } catch (error) {
    console.error('Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// 创建模拟支付
async function createMockPayment(orderId, orderNo, amount, type) {
  if (!orderId || !orderNo) {
    return { success: false, error: 'Missing orderId or orderNo' };
  }

  // 模拟支付参数（实际微信支付需要真实参数）
  const mockPayment = {
    timeStamp: String(Date.now()),
    nonceStr: generateNonceStr(),
    package: 'prepay_id=mock_' + Date.now(),
    signType: 'MD5',
    paySign: 'MOCK_SIGN_' + Date.now()
  };

  console.log('Mock payment created:', mockPayment);

  // 更新订单状态为已支付（模拟支付成功）
  try {
    await db.collection('orders').doc(orderId).update({
      data: {
        paymentStatus: 'paid',
        status: 'confirmed',
        payTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    });
    console.log('Order updated to paid:', orderId);
  } catch (err) {
    console.error('Update order failed:', err);
  }

  return {
    success: true,
    payment: mockPayment,
    message: '模拟支付，实际不会扣款'
  };
}

// 生成随机字符串
function generateNonceStr() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}