# PawsUp 爪哇宠屋 - 云函数 API 部署说明

## 概述

本项目为管理端 H5 提供云函数支持，使其可以在浏览器中正常运行，无需依赖微信小程序 SDK。

## 创建的云函数

### 1. services-api
- **用途**: 服务项目管理 (CRUD)
- **路径**: `/services`

### 2. technicians-api
- **用途**: 技师管理 (CRUD)
- **路径**: `/technicians`

### 3. orders-api
- **用途**: 订单管理 (CRUD)
- **路径**: `/orders`

### 4. upload-avatar
- **用途**: 技师头像上传
- **方法**: POST

## 部署步骤

### 1. 使用微信开发者工具部署

1. 打开微信开发者工具
2. 导入项目 `admin-miniprogram`
3. 右键点击 `cloudfunctions/services-api` 文件夹 -> 上传并部署
4. 同样部署其他云函数

### 2. 启用 HTTP 触发器

在每个云函数的 `config.json` 中已配置 HTTP 触发器。

或在微信开发者工具中：
1. 云函数 -> 更多设置
2. 开启 HTTP 触发
3. 设置路径（如 `/services`）

### 3. 配置自定义域名（可选）

1. 登录微信云开发控制台
2. 环境设置 -> HTTP 访问
3. 绑定自定义域名（需备案域名）

## API 接口文档

### Services API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /services | 获取服务列表 |
| GET | /services/{id} | 获取单个服务 |
| POST | /services | 添加服务 |
| PUT | /services/{id} | 更新服务 |
| DELETE | /services/{id} | 删除服务 |

### Technicians API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /technicians | 获取技师列表 |
| GET | /technicians/{id} | 获取单个技师 |
| POST | /technicians | 添加技师 |
| PUT | /technicians/{id} | 更新技师 |
| DELETE | /technicians/{id} | 删除技师 |

### Orders API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /orders | 获取订单列表 |
| GET | /orders/{id} | 获取单个订单 |
| POST | /orders | 创建订单 |
| PUT | /orders/{id} | 更新订单 |
| DELETE | /orders/{id} | 删除订单 |

### Upload Avatar API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /upload-avatar | 上传头像 |

请求体:
```json
{
  "data": "base64编码的图片数据",
  "fileName": "文件名"
}
```

## 云开发环境

- **环境 ID**: cloud1-4gy1jyan842d73ab
- **基础域名**: https://cloud1-4gy1jyan842d73ab.bastionpay.cn

## H5 调用示例

```javascript
// 获取服务列表
const response = await fetch('https://cloud1-4gy1jyan842d73ab.bastionpay.cn/v2/wx/q/cloudfunction/services-api', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({})
});
const result = await response.json();
```

## 注意事项

1. 云函数 HTTP 触发需要云开发基础版及以上
2. 未配置自定义域名时，使用默认域名可能有访问限制
3. 生产环境建议配置自定义域名
4. 头像上传需要处理 base64 编码
