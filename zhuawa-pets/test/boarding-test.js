// 寄养预约流程测试脚本
// 用于验证 boarding-api 云函数的正确性

const testScenarios = [
  {
    name: "测试1：获取房型列表",
    action: "getRoomTypes",
    data: { petType: "dog" }
  },
  {
    name: "测试2：获取单个房型详情",
    action: "getRoomType",
    data: { id: "请替换为实际的房型ID" }
  },
  {
    name: "测试3：检查房态可用性",
    action: "checkAvailability",
    data: {
      roomTypeId: "请替换为实际的房型ID",
      checkinDate: "2026-03-25",
      checkoutDate: "2026-03-28"
    }
  },
  {
    name: "测试4：创建寄养订单",
    action: "createOrder",
    data: {
      userId: "test_user_openid",
      petId: "请替换为实际的宠物ID",
      roomTypeId: "请替换为实际的房型ID",
      checkinDate: "2026-03-25",
      checkoutDate: "2026-03-28",
      nightCount: 3,
      petCount: 1,
      totalPrice: 384,
      finalPrice: 384,
      remark: "测试订单"
    }
  }
];

// 在小程序控制台运行以下代码进行测试：

async function runTests() {
  console.log("=== 寄养预约流程测试开始 ===\n");
  
  for (const test of testScenarios) {
    console.log(`\n【${test.name}】`);
    console.log(`Action: ${test.action}`);
    console.log(`Data:`, test.data);
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'boarding-api',
        data: {
          action: test.action,
          ...test.data
        }
      });
      
      console.log("Result:", res.result);
      
      if (res.result.success) {
        console.log("✅ 测试通过");
      } else {
        console.log("❌ 测试失败:", res.result.error);
      }
    } catch (err) {
      console.log("❌ 调用失败:", err);
    }
    
    console.log("-".repeat(50));
  }
  
  console.log("\n=== 测试结束 ===");
}

// 运行测试
// runTests();

// 导出测试函数
module.exports = { runTests, testScenarios };
