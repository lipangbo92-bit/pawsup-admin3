# 预约流程 - 3个路径完整说明

## 路径结构

### 路径1：洗护美容入口（服务驱动）
```
首页/服务页 → pet-select → service-select(mode=path1) → 
booking-time-1 → technician-select → booking-confirm → booking-success
```

**参数传递：**
- pet-select → service-select: `mode=path1&petId=xxx`
- service-select → booking-time-1: `mode=path1&petId=xxx&serviceId=xxx`
- booking-time-1 → technician-select: `mode=path1&petId=xxx&serviceId=xxx&date=xxx&time=xxx`
- technician-select → booking-confirm: `mode=path1&petId=xxx&serviceId=xxx&technicianId=xxx&date=xxx&time=xxx`

### 路径2：美容师卡片入口（美容师驱动）
```
首页美容师 → service-select(mode=path2) → 
booking-time-2 → booking-confirm → booking-success
```

**参数传递：**
- 首页 → service-select: `mode=path2&technicianId=xxx`
- service-select → booking-time-2: `mode=path2&petId=xxx&serviceId=xxx&technicianId=xxx`
- booking-time-2 → booking-confirm: `mode=path2&petId=xxx&serviceId=xxx&technicianId=xxx&date=xxx&time=xxx`

### 路径3：热门服务入口（快速预约）
```
首页热门服务 → booking-time-1(mode=path3) → 
technician-select → booking-confirm → booking-success
```

**参数传递：**
- 首页 → booking-time-1: `mode=path3&serviceId=xxx`
- booking-time-1 → technician-select: `mode=path3&serviceId=xxx&date=xxx&time=xxx`
- technician-select → booking-confirm: `mode=path3&serviceId=xxx&technicianId=xxx&date=xxx&time=xxx`

---

## 页面API对接状态

| 页面 | 已对接API | 说明 |
|------|----------|------|
| pet-select | pets-api | ✅ 获取宠物列表 |
| service-select | services-api, technicians-api | ✅ 获取服务列表和美容师详情 |
| booking-time-1 | services-api | ✅ 加载服务详情 |
| booking-time-2 | services-api, technicians-api, availability-api | ✅ 加载服务、美容师和时段 |
| technician-select | technicians-api, availability-api | ✅ 加载美容师和可用性 |
| booking-confirm | services-api, pets-api, technicians-api, orders-api | ✅ 加载详情并创建订单 |
| booking-success | orders-api | ✅ 加载订单详情 |

---

## 云函数清单

| 云函数 | 用途 | 状态 |
|--------|------|------|
| services-api | 服务列表、详情 | ✅ 已有 |
| technicians-api | 美容师列表、详情 | ✅ 已有 |
| pets-api | 宠物列表、详情 | ✅ 已有 |
| availability-api | 时段可用性查询 | ✅ 已有 |
| orders-api | 订单创建、查询 | ✅ 已有 |
| banner-api | Banner列表 | ✅ 已有 |

---

## 数据库集合

| 集合名 | 用途 |
|--------|------|
| services | 服务项目 |
| technicians | 美容师 |
| pets | 宠物信息 |
| orders | 订单数据 |
| technician_schedules | 美容师排班 |
| banners | 首页Banner |

---

## 待完善功能

- [ ] 支付功能集成
- [ ] 订单列表页面完善
- [ ] 宠物添加页面
- [ ] 地址管理（上门服务）
- [ ] 优惠券功能
- [ ] 消息通知

