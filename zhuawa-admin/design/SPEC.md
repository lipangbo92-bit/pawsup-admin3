# 宠物店小程序 - UI 视觉规范

## 1. 色彩体系

```css
:root {
    /* 主色 - 温柔粉红 */
    --primary: #EC4899;
    --primary-light: #F9A8D4;
    --primary-dark: #DB2777;
    
    /* 辅助色 - 清新薄荷 */
    --secondary: #10B981;
    --secondary-light: #6EE7B7;
    
    /* 中性色 */
    --bg: #FDF2F8;
    --surface: #FFFFFF;
    --text: #1F2937;
    --text-secondary: #6B7280;
    --border: #E5E7EB;
    
    /* 状态色 */
    --success: #10B981;
    --warning: #F59E0B;
    --error: #EF4444;
    
    /* 渐变 */
    --gradient: linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%);
}
```

## 2. 字体

- **主字体**: system-ui, -apple-system, sans-serif
- **标题**: 20px-24px, font-weight: 600
- **正文**: 14px-16px, font-weight: 400
- **小字**: 12px, font-weight: 400

## 3. 组件规范

### 按钮
- 主按钮: 背景 primary, 圆角 12px, 高度 48px
- 次按钮: 边框 primary, 背景透明, 圆角 12px, 高度 48px

### 卡片
- 背景: white
- 圆角: 16px
- 阴影: 0 4px 20px rgba(236, 72, 153, 0.1)
- 内边距: 16px

### 列表项
- 高度: 64px-80px
- 分割线: 1px solid #E5E7EB
- 点击态: 背景 #FDF2F8

## 4. 图标风格

- 线条风格 (line)
- 尺寸: 24px / 32px
- 颜色: 与文字同色

## 5. 页面结构

- 安全边距: 16px
- 底部 tabbar 高度: 56px
- 导航栏高度: 44px

## 6. 动画

- 过渡时间: 0.2s - 0.3s
- 动效: ease-out
- 页面切换: 滑动淡入
