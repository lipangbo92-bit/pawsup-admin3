# PawsUp 爪哇宠屋管理端 H5 - 云函数配置

## 环境信息

- **云开发环境 ID**: `cloud1-4gy1jyan842d73ab`
- **基础 API 域名**: `https://cloud1-4gy1jyan842d73ab.bastionpay.cn`

## 需要部署的云函数

在 `cloudfunctions/` 目录下创建以下云函数：

| 云函数名 | 用途 |
|---------|------|
| services-api | 服务管理 CRUD |
| technicians-api | 技师管理 CRUD |
| orders-api | 订单管理 CRUD |
| upload-avatar | 头像上传 |

## 部署步骤

### 1. 安装依赖

```bash
cd cloudfunctions/services-api
npm install

cd ../technicians-api
npm install

cd ../orders-api
npm install

cd ../upload-avatar
npm install
```

### 2. 使用微信开发者工具部署

1. 打开微信开发者工具
2. 导入 `admin-miniprogram` 项目
3. 右键每个云函数文件夹 -> 上传并部署（云端安装依赖）

### 3. 开启 HTTP 触发器

在每个云函数的 `config.json` 中已配置 HTTP 触发。

或在云开发控制台：
- 云函数 -> 选择函数 -> 更多设置 -> HTTP 触发
- 填写路径，如 `/services`、`/technicians`、`/orders`

## H5 调用方式

在浏览器中，云函数通过以下 URL 调用：

```javascript
const API_BASE = 'https://cloud1-4gy1jyan842d73ab.bastionpay.cn/v2/wx/q/cloudfunction';

// 获取服务列表 (POST)
await fetch(`${API_BASE}/services-api`, {
  method: 'POST',
  body: JSON.stringify({})
});

// 添加服务 (POST)
await fetch(`${API_BASE}/services-api`, {
  method: 'POST',
  body: JSON.stringify({
    name: '新服务',
    price: 100,
    category: 'bath',
    description: '服务描述'
  })
});

// 更新服务 (PUT)
await fetch(`${API_BASE}/services-api`, {
  method: 'PUT',
  body: JSON.stringify({
    name: '更新后的服务',
    price: 150
  })
});

// 删除服务 (DELETE)
await fetch(`${API_BASE}/services-api`, {
  method: 'DELETE',
  body: JSON.stringify({ _id: '服务ID' })
});
```

## 已修改的 H5 文件

- `zhuawa-admin/js/services.js` - 服务管理
- `zhuawa-admin/js/technicians.js` - 技师管理
- `zhuawa-admin/js/orders.js` - 订单管理

这些文件已从 `wx.cloud` 改为使用 `fetch` 调用云函数。

## 测试

部署完成后，在浏览器中打开管理端 H5，尝试添加/编辑/删除服务、技师和订单，验证是否正常工作。

## 注意事项

1. HTTP 触发器需要云开发基础版及以上
2. 头像上传使用 Base64 编码，需要在云函数中处理
3. 生产环境建议配置自定义域名
