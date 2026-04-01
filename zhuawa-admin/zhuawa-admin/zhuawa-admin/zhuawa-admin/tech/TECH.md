# 宠物店小程序 - 技术方案

## 1. 技术架构

- **前端**: 微信小程序 (原生开发)
- **后端**: 微信云开发 (CloudBase)
- **数据库**: MongoDB (云开发内置)
- **支付**: 微信支付
- **消息**: 微信服务号模板消息

## 2. 云开发目录结构

```
cloudfunctions/
├── login/              # 微信登录
├── create-order/       # 创建订单
├── cancel-order/       # 取消订单
├── get-appointments/   # 获取预约列表
├── get-schedule/       # 获取排班
├── update-schedule/    # 更新排班（管理员）
└── refund/             # 退款

miniprogram/
├── pages/
│   ├── index/          # 首页
│   ├── technician/     # 技师详情
│   ├── booking-time/  # 选择时间
│   ├── pet-select/    # 选择宠物
│   ├── booking-confirm/ # 确认订单
│   ├── booking-success/ # 成功页
│   ├── orders/        # 订单列表
│   ├── order-detail/  # 订单详情
│   ├── profile/       # 我的
│   └── admin/         # 管理端（独立入口）
├── components/
├── utils/
├── app.js
├── app.json
└── app.wxss
```

## 3. 数据库设计（6张表）

### users (用户表)
```json
{
  "_id": "ObjectId",
  "openid": "String",
  "nickname": "String",
  "avatar": "String",
  "phone": "String",
  "role": "customer|technician|admin",
  "createdAt": "DateTime"
}
```

### pets (宠物表)
```json
{
  "_id": "ObjectId",
  "userId": "String",
  "name": "String",
  "type": "dog|cat|other",
  "breed": "String",
  "age": "Number",
  "weight": "Number",
  "image": "String",
  "createdAt": "DateTime"
}
```

### services (服务项目表)
```json
{
  "_id": "ObjectId",
  "name": "String",
  "description": "String",
  "price": "Number",
  "duration": "Number",
  "category": "String",
  "image": "String",
  "isActive": "Boolean"
}
```

### technicians (技师表)
```json
{
  "_id": "ObjectId",
  "userId": "String",
  "name": "String",
  "avatar": "String",
  "level": "String",
  "rating": "Number",
  "serviceIds": ["String"],
  "isActive": "Boolean"
}
```

### schedules (排班表)
```json
{
  "_id": "ObjectId",
  "technicianId": "String",
  "date": "String",
  "shift": "morning|afternoon|all",
  "slots": [
    { "time": "09:00", "available": true },
    { "time": "09:30", "available": true }
  ]
}
```

### appointments (预约表)
```json
{
  "_id": "ObjectId",
  "orderNo": "String",
  "userId": "String",
  "petId": "String",
  "technicianId": "String",
  "serviceId": "String",
  "date": "String",
  "time": "String",
  "price": "Number",
  "status": "pending|paid|canceled|completed|refunded",
  "payTime": "DateTime",
  "cancelTime": "DateTime",
  "remark": "String",
  "createdAt": "DateTime"
}
```

## 4. 微信支付流程

1. 小程序调用 `wx.login` 获取 code
2. 云函数调用微信支付统一下单接口
3. 返回支付参数给小程序
4. 小程序调用 `wx.requestPayment`
5. 支付回调通知云函数
6. 更新订单状态

## 5. 服务号通知

模板消息：
- 预约成功通知
- 预约提醒（服务前1小时）
- 取消成功通知
- 退款到账通知
