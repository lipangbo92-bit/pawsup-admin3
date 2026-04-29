# 寄养预约流程测试指南

## 测试步骤

### 步骤1：部署云函数

```bash
# 在 zhuawa-pets 目录下
openclaw deploy boarding-api
```

### 步骤2：测试获取房型列表

在小程序开发者工具的控制台运行：

```javascript
wx.cloud.callFunction({
  name: 'boarding-api',
  data: {
    action: 'getRoomTypes',
    petType: 'dog'
  }
}).then(res => {
  console.log('房型列表:', res.result);
}).catch(err => {
  console.error('错误:', err);
});
```

**预期结果：**
- `success: true`
- `data` 数组包含房型信息
- 每个房型包含：`id`, `name`, `petType`, `price`, `area`, `facilities`, `images`, `totalRooms`

### 步骤3：测试检查房态可用性

```javascript
wx.cloud.callFunction({
  name: 'boarding-api',
  data: {
    action: 'checkAvailability',
    roomTypeId: '你的房型ID',
    checkinDate: '2026-03-25',
    checkoutDate: '2026-03-28'
  }
}).then(res => {
  console.log('房态:', res.result);
}).catch(err => {
  console.error('错误:', err);
});
```

**预期结果：**
- `success: true`
- `data` 包含：`roomTypeId`, `totalRooms`, `minAvailable`, `isAvailable`

### 步骤4：测试创建订单

```javascript
wx.cloud.callFunction({
  name: 'boarding-api',
  data: {
    action: 'createOrder',
    data: {
      userId: 'test_openid',
      petId: '你的宠物ID',
      roomTypeId: '你的房型ID',
      checkinDate: '2026-03-25',
      checkoutDate: '2026-03-28',
      nightCount: 3,
      petCount: 1,
      totalPrice: 384,
      finalPrice: 384,
      remark: '测试订单'
    }
  }
}).then(res => {
  console.log('创建结果:', res.result);
}).catch(err => {
  console.error('错误:', err);
});
```

**预期结果：**
- `success: true`
- 返回 `orderId` 和 `orderNo`
- 订单号格式：`BD20260325xxxx`

### 步骤5：验证订单数据

在云开发控制台查看 `orders` 集合，确认：

1. **订单类型正确**：`orderType: "boarding"`
2. **字段完整**：
   - `roomTypeId` 和 `roomTypeName`
   - `roomId` 为空（待分配）
   - `petName`, `petType`, `petBreed`, `petWeight`（扁平化）
   - `checkinDate`, `checkoutDate`, `nightCount`, `petCount`
   - `status: "pending"`
   - `paymentStatus: "unpaid"`

## 常见问题排查

### 问题1：获取房型列表为空

**检查：**
- `boarding_room_types` 集合是否有数据
- 数据字段是否正确（`status: "active"`）

### 问题2：检查房态返回 0 间可用

**检查：**
- `boarding_rooms` 集合是否有该房型的房间
- `roomTypeId` 字段是否正确关联

### 问题3：创建订单失败

**检查：**
- 所有必填字段是否提供
- `petId` 对应的宠物是否存在
- `roomTypeId` 对应的房型是否存在

## 数据字典核对

### boarding_room_types 集合字段

| 字段 | 类型 | 必填 | 示例 |
|------|------|------|------|
| `_id` | String | ✅ | 自动生成 |
| `name` | String | ✅ | "标准间" |
| `petType` | String | ✅ | "dog" / "cat" |
| `price` | Number | ✅ | 128 |
| `area` | String | ❌ | "2m²" |
| `facilities` | Array | ❌ | ["空调", "监控"] |
| `images` | Array | ❌ | ["cloud://..."] |
| `description` | String | ❌ | "适合中小型犬" |
| `sortOrder` | Number | ❌ | 1 |
| `status` | String | ✅ | "active" |

### boarding_rooms 集合字段

| 字段 | 类型 | 必填 | 示例 |
|------|------|------|------|
| `_id` | String | ✅ | 自动生成 |
| `roomTypeId` | String | ✅ | 关联房型ID |
| `roomNumber` | String | ✅ | "101" |
| `status` | String | ✅ | "available" |

### orders 集合（寄养订单）字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `orderType` | String | ✅ | "boarding" |
| `roomTypeId` | String | ✅ | 房型ID |
| `roomTypeName` | String | ✅ | 房型名称快照 |
| `roomId` | String | ❌ | 具体房间ID（待分配） |
| `roomNumber` | String | ❌ | 房间号快照 |
| `checkinDate` | String | ✅ | "2026-03-25" |
| `checkoutDate` | String | ✅ | "2026-03-28" |
| `nightCount` | Number | ✅ | 3 |
| `petCount` | Number | ✅ | 1 |
