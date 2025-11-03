# Register 组件

统一的注册组件模块，整合了用户注册和受试者注册功能。

## 目录结构

```
register/
├── index.js                  # 统一导出
├── Register.jsx             # 核心注册组件
├── UserRegister.jsx         # 用户注册组件（对外）
├── ChildRegister.jsx        # 受试者注册组件（对外）
├── register.less            # 样式文件
└── widget/                  # 子组件
    ├── api.js              # API 接口
    ├── servers.js          # 服务配置
    ├── registerUser.jsx    # 用户信息表单
    ├── registerChild.jsx   # 受试者信息表单
    ├── registerFooter.jsx  # 注册按钮底栏
    └── ...
```

## 使用方式

### 1. 独立组件（推荐）

对外提供两个独立的注册组件，使用简单直接：

#### 用户注册
```jsx
import { UserRegister } from '@/components/register';

<UserRegister 
  goUrl="/pages/home/index"
  submitClose={false}
/>
```

#### 受试者注册
```jsx
import { ChildRegister } from '@/components/register';

<ChildRegister 
  goUrl="/pages/home/index"
  submitClose={false}
/>
```

### 2. 核心组件（高级用法）

如果需要动态切换注册类型，可以使用核心 Register 组件：

```jsx
import Register, { REGISTER_TYPE } from '@/components/register';

// 用户注册
<Register 
  type={REGISTER_TYPE.USER}
  goUrl="/pages/home/index"
  submitClose={false}
/>

// 受试者注册
<Register 
  type={REGISTER_TYPE.CHILD}
  goUrl="/pages/home/index"
  submitClose={false}
/>
```

## API

### UserRegister / ChildRegister Props

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| goUrl | string | 必填 | 注册成功后跳转的页面路径 |
| submitClose | boolean | false | 是否在提交后关闭小程序 |

### Register Props

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| type | string | 必填 | 注册类型：'user' 或 'child' |
| goUrl | string | 必填 | 注册成功后跳转的页面路径 |
| submitClose | boolean | false | 是否在提交后关闭小程序 |

### REGISTER_TYPE 枚举

```javascript
export const REGISTER_TYPE = {
  USER: 'user',    // 用户注册
  CHILD: 'child'   // 受试者注册
};
```

## 功能特性

### 用户注册
- 用户名输入
- 手机号码输入（11位验证）
- 隐私协议授权确认
- 自动保存用户信息到本地存储

### 受试者注册
- 受试者姓名输入
- 性别选择（图片选择器）
- 出生日期选择（日期选择器）
- 自动添加到受试者列表
- 自动设置为当前选中受试者

## 样式设计

- 紫色渐变主题（#667eea → #764ba2）
- 卡片式布局
- 现代化阴影效果
- 渐变装饰条
- 响应式设计

## 迁移指南

### 从旧组件迁移

旧的 `qsRegister` 和 `qsRegisterChild` 组件已经整合到新的 `register` 模块。

#### 原有代码
```jsx
// pages/register/index.jsx
import QsRegister from "../../components/qsRegister/qsRegister";
<QsRegister goUrl={goUrl} submitClose={submitClose} />

// pages/registerChild/index.jsx
import QsRegisterChild from "../../components/qsRegisterChild/qsRegisterChild";
<QsRegisterChild goUrl={goUrl} submitClose={submitClose} />
```

#### 新代码
```jsx
// pages/register/index.jsx
import { UserRegister } from "../../components/register";
<UserRegister goUrl={goUrl} submitClose={submitClose} />

// pages/registerChild/index.jsx
import { ChildRegister } from "../../components/register";
<ChildRegister goUrl={goUrl} submitClose={submitClose} />
```

## 注意事项

1. **API 兼容性**：新组件保持了与原组件完全相同的 API 接口
2. **样式继承**：使用相同的样式文件，视觉效果保持一致
3. **状态管理**：用户注册和受试者注册的状态完全独立
4. **错误处理**：提供完整的表单验证和错误提示
5. **日志记录**：保留了原有的注册流程日志

## 开发调试

```bash
# 查看组件在开发环境中的运行情况
# 用户注册页面
/pages/register/index

# 受试者注册页面
/pages/registerChild/index
```
