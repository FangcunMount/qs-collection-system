# 医疗量表系统主题色规范

## 设计原则
专业、清晰、友好的医学量表小程序设计，以专业蓝为主色调，营造健康、可信赖的医疗健康工具氛围。

## 主色调

### 专业蓝 (Primary Blue)
```less
@primary-color: #1890FF;          // 主色（按钮、选中状态）
@primary-hover: #40A9FF;          // 悬浮状态
@primary-active: #096DD9;         // 按下状态
@primary-light: #E6F7FF;          // 浅色背景
@primary-lighter: #BAE7FF;        // 更浅背景
```

**使用场景：**
- 主要操作按钮（"开始测试"、"提交答案"等）
- 底部导航选中状态
- 链接文字
- 重要图标
- 进度条

## 辅助色

### 健康绿 (Success Green)
```less
@success-color: #52C41A;          // 成功状态
@success-light: #F6FFED;          // 浅色背景
@success-lighter: #D9F7BE;        // 更浅背景
```

**使用场景：**
- 成功提示
- 完成状态
- 工具模块背景
- 正向引导元素

### 警示橙 (Warning Orange)
```less
@warning-color: #FA8C16;          // 警告状态
@warning-light: #FFF7E6;          // 浅色背景
```

**使用场景：**
- 警告提示
- 需要注意的信息

### 错误红 (Error Red)
```less
@error-color: #F5222D;            // 错误状态
@error-light: #FFF1F0;            // 浅色背景
```

**使用场景：**
- 错误提示
- 删除操作
- 禁止状态

## 渐变色

### 主渐变
```less
@gradient-primary: linear-gradient(135deg, #1890FF 0%, #096DD9 100%);
```
**使用场景：** 主按钮、页面头部、重要卡片

### 柔和渐变
```less
@gradient-primary-soft: linear-gradient(135deg, #E6F7FF 0%, #BAE7FF 100%);
```
**使用场景：** 横幅背景、装饰性元素

### 成功渐变
```less
@gradient-success: linear-gradient(135deg, #52C41A 0%, #389E0D 100%);
```
**使用场景：** 成功状态按钮、完成提示

### 头部渐变
```less
@gradient-header: linear-gradient(180deg, #FFFFFF 0%, #F5F7FA 100%);
```
**使用场景：** 页面头部区域

## 中性色

### 文字颜色
```less
@text-primary: #262626;           // 主文字（深灰）
@text-secondary: #595959;         // 次要文字（中灰）
@text-tertiary: #8C8C8C;          // 辅助文字（浅灰）
@text-disabled: #BFBFBF;          // 禁用文字
```

**使用场景：**
- `@text-primary`: 标题、重要信息
- `@text-secondary`: 正文、描述文字
- `@text-tertiary`: 提示文字、占位符
- `@text-disabled`: 禁用状态文字

### 背景颜色
```less
@bg-page: #FAFAFA;                // 页面背景（极浅灰）
@bg-card: #FFFFFF;                // 卡片背景（白色）
@bg-section: #F5F7FA;             // 区域背景（浅灰）
@bg-hover: #F0F0F0;               // 悬浮背景
@bg-active: #E8E8E8;              // 按下背景
@bg-disabled: #F5F5F5;            // 禁用背景
```

**使用场景：**
- `@bg-page`: 整体页面背景
- `@bg-card`: 卡片、弹窗背景
- `@bg-section`: 内容区域背景
- `@bg-hover`: 搜索栏、头像等交互元素悬浮
- `@bg-active`: 交互元素按下状态
- `@bg-disabled`: 禁用状态背景

### 边框颜色
```less
@border-base: #F0F0F0;            // 基础边框
@border-light: #E5E7EB;           // 浅色边框
@border-dark: #D9D9D9;            // 深色边框
```

**使用场景：**
- `@border-base`: 卡片边框、分割线
- `@border-light`: 输入框边框
- `@border-dark`: 强调边框

## 阴影

```less
@shadow-sm: 0 4rpx 8rpx rgba(0, 0, 0, 0.04);
@shadow-md: 0 8rpx 16rpx rgba(0, 0, 0, 0.08);
@shadow-lg: 0 12rpx 24rpx rgba(0, 0, 0, 0.12);
```

**使用场景：**
- `@shadow-sm`: 小卡片
- `@shadow-md`: 悬浮卡片、下拉菜单
- `@shadow-lg`: 弹窗、模态框

## 圆角

```less
@radius-sm: 8rpx;                 // 小圆角
@radius-base: 16rpx;              // 标准圆角
@radius-lg: 24rpx;                // 大圆角
@radius-round: 1000rpx;           // 完全圆角
```

**使用场景：**
- `@radius-sm`: 输入框、小按钮
- `@radius-base`: 卡片、分类项
- `@radius-lg`: 大卡片、工具项
- `@radius-round`: 搜索栏、圆形按钮

## 间距

```less
@spacing-xs: 8rpx;                // 极小间距
@spacing-sm: 16rpx;               // 小间距
@spacing-md: 24rpx;               // 中间距
@spacing-lg: 32rpx;               // 大间距
@spacing-xl: 48rpx;               // 极大间距
```

**使用场景：**
- `@spacing-xs`: 图标与文字间距
- `@spacing-sm`: 列表项间距
- `@spacing-md`: 卡片间距、内边距
- `@spacing-lg`: 页面边距、区块边距
- `@spacing-xl`: 模块间距

## 使用方法

### 1. 导入主题文件
在需要使用主题变量的 .less 文件开头添加：
```less
@import "../../styles/theme.less";  // 根据文件层级调整路径
```

### 2. 使用变量
```less
.my-component {
  background: @bg-card;
  color: @text-primary;
  border: 1px solid @border-base;
  border-radius: @radius-base;
  padding: @spacing-md;
  box-shadow: @shadow-sm;
}

.my-button {
  background: @gradient-primary;
  color: @bg-card;
  
  &:hover {
    background: @primary-hover;
  }
  
  &:active {
    background: @primary-active;
  }
}
```

## 已应用页面

### ✅ 已统一
- [x] 首页 (`src/pages/home/index/index.less`)
- [x] 底部菜单 (`src/components/bottomMenu/index.less`)
- [x] 单页单题模式 (`src/pages/questionnaire/fill/weight/singlePageModel.less`)
- [x] 问卷列表（部分）(`src/pages/questionnaire/list/index.less`)

### 待统一
- [ ] 问卷填写页其他部分
- [ ] 答题卡详情页
- [ ] 测试解读页
- [ ] 受试者列表页
- [ ] 个人中心页

## 注意事项

1. **避免硬编码颜色**：尽量使用主题变量，便于统一调整
2. **保持视觉一致性**：同类元素使用相同的颜色和样式
3. **注意对比度**：确保文字与背景有足够的对比度
4. **渐变使用适度**：主要用于重要按钮和头部，避免滥用
5. **响应交互状态**：按钮需要有hover、active等交互反馈

## 未来优化

1. 考虑支持深色模式
2. 增加更多场景化的渐变色组合
3. 提供主题切换功能
4. 添加无障碍配色方案
