# 爪哇宠屋小程序原型图 - 版本记录

## 当前版本
**2026-03-02-v1** - 2026年3月2日

### 版本内容
- 顾客端：12个页面（首页、服务项目、选择时间1/2、预约确认等）
- 技师端：4个页面
- 管理端：8个页面
- 共计：26个页面

### 主要功能
1. 预约流程：两条路径（服务→时间→技师 / 技师→服务→时间）
2. 技师详情弹窗
3. 管理端技师CRUD + 作品图片上传

---

## 版本管理规则
1. 每次大改动创建新版本：`versions/YYYY-MM-DD-vN/`
2. 不修改旧版本文件
3. 回滚：直接切换到旧版本文件夹
4. 当前开发版本在根目录

---

## 页面清单
### 顾客端
- index-new.html（首页）
- login.html
- services.html
- booking-time.html / booking-time-1.html / booking-time-2.html
- booking-confirm.html
- booking-success.html
- orders.html
- order-detail.html
- profile.html
- pet-select.html
- pet-register.html
- pet-info.html

### 技师端
- technician-login.html
- technician-appointments.html
- technician-appointment-detail.html
- technician-schedule.html

### 管理端
- admin-login.html
- admin-dashboard.html
- admin-technicians.html
- admin-services.html
- admin-appointments.html
- admin-schedule.html
- admin-statistics.html

### 其他
- README.html（目录页）
