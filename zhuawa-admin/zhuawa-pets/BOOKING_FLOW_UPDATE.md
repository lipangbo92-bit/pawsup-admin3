# 预约流程数据对接 - 更新记录

## 更新日期
2026-03-16

## 更新内容

### 1. booking-time-1.js（服务驱动路径）
- 接入 `technicians-api` 获取真实美容师列表
- 接入 `availability-api` 获取时段可用性
- 添加加载状态管理
- 优化时段选择逻辑

### 2. booking-time-2.js（美容师驱动路径）
- 接入 `availability-api` 获取指定美容师的可用时段
- 根据日期切换动态加载时段
- 添加加载状态管理

### 3. booking-confirm.js（确认页面）
- 接入 `orders-api` 创建真实订单
- 添加订单数据构建逻辑
- 添加错误处理和用户提示
- 添加提交状态锁防止重复提交

### 4. booking-success.js（成功页面）
- 支持从订单ID加载订单详情
- 添加日期格式化函数

### 5. services.js（服务列表）
- 修复 `bookService` 函数，传递完整服务信息
- 添加服务时长字段

### 6. index.js（首页）
- 修复美容师预约跳转逻辑
- 添加 `navigateToBookingTime2` 函数
- 美容师点击跳转到 booking-time-2

## 预约流程

### 路径1：服务驱动
```
首页/服务页 → booking-time-1（选服务、时间）→ 弹窗选美容师 → booking-confirm → booking-success
```

### 路径2：美容师驱动
```
首页美容师卡片 → booking-time-2（选时间）→ booking-confirm → booking-success
```

## 已接入的云函数

| 云函数 | 用途 |
|--------|------|
| `services-api` | 获取服务列表 |
| `technicians-api` | 获取美容师列表 |
| `availability-api` | 查询时段可用性 |
| `orders-api` | 创建订单 |
| `banner-api` | 获取Banner（已有） |

## 待完善功能

- [ ] 宠物选择页面（目前订单中宠物信息为可选）
- [ ] 地址管理（上门服务用）
- [ ] 优惠券功能
- [ ] 支付集成
- [ ] 订单列表页面
- [ ] 订单详情页面

## 测试步骤

1. 部署所有云函数到云端
2. 确保数据库中有 services、technicians、orders 集合
3. 测试路径1：从服务页点击预约
4. 测试路径2：从首页美容师卡片点击预约
5. 验证订单是否正确创建
