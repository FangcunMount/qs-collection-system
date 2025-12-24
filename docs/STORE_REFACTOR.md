# Store 重构分析报告

## 当前状态分析

### 1. 架构不一致问题

#### userStore.js（Redux-like 模式）
- 使用 `reducers` 和 `effects` 模式
- 通过 `dispatch(type, payload)` 更新状态
- 导出了 `UserModel` 对象（包含 namespace、state、reducers、effects）
- **问题**：架构复杂，代码量大，与其他 store 不一致

#### tokenStore.ts & testeeStore.ts（函数式 API）
- 使用简单的函数式 API
- 直接调用函数更新状态（如 `setToken()`, `setTesteeList()`）
- 导出了默认对象和多个函数
- **优点**：简单、直观、易维护

### 2. 语言混用问题

- `userStore.js` - JavaScript
- `tokenStore.ts` - TypeScript
- `testeeStore.ts` - TypeScript
- `tokenStore.types.js` - JavaScript（应该是 TypeScript）

**问题**：类型安全不一致，维护困难

### 3. 代码重复问题

三个 store 都有类似的模式：
- `state` - 状态对象
- `listeners` - 监听器集合
- `cloneState()` - 克隆状态
- `notify()` - 通知监听器
- `subscribe()` - 订阅函数
- 本地存储操作

**问题**：代码重复，维护成本高

### 4. 初始化时机问题

在 `app.js` 中：
- ✅ 初始化了 `tokenStore`
- ✅ 初始化了 `userStore`
- ❌ **未初始化 `testeeStore`**（在需要时才初始化）

**问题**：初始化时机不一致，可能导致数据不一致

### 5. 导出方式不一致

- `userStore`: 导出 `UserModel` 默认对象 + 多个函数
- `tokenStore`: 导出默认对象 + 多个函数
- `testeeStore`: 导出默认对象 + 多个函数

**问题**：使用方式不统一

## 重构建议

### 方案一：统一为函数式 API（推荐）

**优点**：
- 简单、直观、易维护
- 与现有 `tokenStore` 和 `testeeStore` 保持一致
- 减少代码量
- 更好的类型支持

**步骤**：
1. 将 `userStore.js` 重构为 `userStore.ts`
2. 移除 reducer/effect 模式，改为函数式 API
3. 使用公共的 `createStore` 工具函数（已创建）
4. 统一导出方式

### 方案二：统一为 Redux-like 模式

**缺点**：
- 需要重构 `tokenStore` 和 `testeeStore`
- 代码复杂度增加
- 对于小程序项目来说过于重量级

**不推荐**：不符合项目当前架构

## 具体重构计划

### 1. 重构 userStore

**当前问题**：
```javascript
// 当前：使用 reducer/effect 模式
dispatch('save', { userInfo: info });
await runEffect('getUserInfo');
```

**重构后**：
```typescript
// 重构后：使用函数式 API
setUserInfo(info);
await fetchUserInfo();
```

### 2. 统一初始化逻辑

**当前问题**：
- `testeeStore` 未在应用启动时初始化
- 各 store 初始化时机不一致

**重构后**：
```typescript
// app.js
async componentDidMount() {
  initTokenStore();
  await initUserStore();
  await initTesteeStore(); // 添加
}
```

### 3. 使用公共工具函数

**已创建**：`src/store/utils/createStore.ts`

**使用方式**：
```typescript
import { createStore } from './utils/createStore';

const store = createStore({
  name: 'UserStore',
  initialState: { ... },
  storageKey: 'user_store'
});

// 使用
store.setState({ userInfo: ... });
store.getState();
store.subscribe(listener);
```

## 重构优先级

### 高优先级（必须）
1. ✅ 统一架构模式（已完成工具函数创建）
2. ⚠️ 统一语言（将 userStore.js 改为 TypeScript）
3. ⚠️ 统一初始化逻辑

### 中优先级（建议）
4. ⚠️ 使用公共工具函数重构各 store
5. ⚠️ 统一导出方式

### 低优先级（可选）
6. ⚠️ 删除 tokenStore.types.js（类型已在 tokenStore.ts 中定义）

## 风险评估

### 低风险
- 重构 `userStore`：使用频率较低，影响面小
- 统一初始化逻辑：只影响启动流程

### 中风险
- 使用公共工具函数：需要充分测试

## 建议

**立即执行**：
1. 统一初始化逻辑（添加 testeeStore 初始化）
2. 将 userStore.js 改为 TypeScript

**后续执行**：
3. 使用公共工具函数重构各 store
4. 统一导出方式

## 注意事项

1. **向后兼容**：重构时保持 API 不变，避免影响现有代码
2. **充分测试**：重构后需要全面测试各功能
3. **渐进式重构**：可以分步骤进行，不需要一次性完成

