# 注册组件快速开始

## 🚀 快速使用

### 导入方式

```javascript
// 方式 1: 导入独立组件（推荐）
import { UserRegister, ChildRegister } from '@/components/register';

// 方式 2: 导入核心组件（高级用法）
import Register, { REGISTER_TYPE } from '@/components/register';
```

### 基础示例

#### 用户注册
```jsx
import { UserRegister } from '@/components/register';

function RegisterPage() {
  return (
    <UserRegister 
      goUrl="/pages/home/index"
      submitClose={false}
    />
  );
}
```

#### 受试者注册
```jsx
import { ChildRegister } from '@/components/register';

function RegisterChildPage() {
  return (
    <ChildRegister 
      goUrl="/pages/home/index"
      submitClose={false}
    />
  );
}
```

## 📦 导出内容

`@/components/register` 模块提供以下导出：

| 导出名称 | 类型 | 说明 |
|---------|------|------|
| `UserRegister` | Component | 用户注册组件 |
| `ChildRegister` | Component | 受试者注册组件 |
| `Register` | Component | 核心注册组件 |
| `REGISTER_TYPE` | Enum | 注册类型枚举 |

## 🔧 Props 说明

### UserRegister / ChildRegister

| 属性 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| goUrl | string | 是 | - | 注册成功后跳转的页面路径 |
| submitClose | boolean | 否 | false | 是否在提交后关闭小程序 |

### Register

| 属性 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| type | 'user' \| 'child' | 是 | - | 注册类型 |
| goUrl | string | 是 | - | 注册成功后跳转的页面路径 |
| submitClose | boolean | 否 | false | 是否在提交后关闭小程序 |

## 💡 常见用法

### 1. 标准注册流程

```jsx
// 用户注册 -> 首页
<UserRegister goUrl="/pages/home/index" />

// 受试者注册 -> 问卷列表
<ChildRegister goUrl="/pages/questionsheet/index" />
```

### 2. 注册后关闭小程序

```jsx
<UserRegister 
  goUrl="/pages/home/index"
  submitClose={true}
/>
```

### 3. 动态注册类型（高级）

```jsx
import Register, { REGISTER_TYPE } from '@/components/register';

function DynamicRegister() {
  const [type, setType] = useState(REGISTER_TYPE.USER);
  
  return (
    <>
      <Tabs onChange={(t) => setType(t)}>
        <Tab value={REGISTER_TYPE.USER}>用户注册</Tab>
        <Tab value={REGISTER_TYPE.CHILD}>受试者注册</Tab>
      </Tabs>
      
      <Register 
        type={type}
        goUrl="/pages/home/index"
      />
    </>
  );
}
```

## 📝 表单字段

### 用户注册表单

- **用户名**: 必填，文本输入
- **手机号码**: 必填，数字输入，限制 11 位
- **隐私协议**: 必须同意

### 受试者注册表单

- **姓名**: 必填，文本输入
- **性别**: 必填，图片选择（男/女）
- **出生日期**: 必填，日期选择器

## ⚙️ 注册流程

### 用户注册

1. 验证表单（姓名、手机号）
2. 调用 `POST /users` API
3. 保存用户信息到本地存储
4. 跳转到指定页面

### 受试者注册

1. 验证表单（姓名、性别、生日）
2. 调用 `POST /children` API
3. 添加到受试者列表
4. 设置为当前选中受试者
5. 跳转到指定页面

## 🎨 样式定制

如需自定义样式，可以覆盖以下 CSS 类：

```less
// 容器
.register-container { }

// 头部
.register-header { }
.register-title { }
.register-subtitle { }

// 表单卡片
.register-card { }

// 分组
.section-title { }
.section-group { }
```

## 🐛 常见问题

### Q: 如何修改注册成功后的提示？
A: 在 `Register.jsx` 的 `registerUser` 或 `registerChild` 方法中修改成功提示。

### Q: 如何添加自定义验证规则？
A: 在 `verifyUserInfo` 或 `verifyChildInfo` 方法中添加验证逻辑。

### Q: 如何处理注册失败？
A: 组件已内置错误处理，会自动显示 Toast 提示。如需自定义，修改 catch 块。

### Q: 旧组件还能用吗？
A: 可以，但建议迁移到新组件。旧组件目录：
- `@/components/qsRegister`
- `@/components/qsRegisterChild`

## 📚 更多文档

- [完整 API 文档](./README.md)
- [重构总结](../../document/register-refactor-summary.md)
