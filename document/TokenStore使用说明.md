# TokenStore 使用说明

## 概述

`tokenStore` 是一个 TypeScript 编写的全局状态管理模块，用于管理 Token 的存储、过期检查和刷新状态。

## 特性

- ✅ **TypeScript** - 完整的类型定义和类型安全
- ✅ **自动持久化** - Token 自动保存到本地存储
- ✅ **防并发刷新** - 避免多次刷新请求
- ✅ **状态订阅** - 支持订阅 Token 变化
- ✅ **兼容多种格式** - 支持字符串和对象格式的 Token
- ✅ **请求前检查** - 在请求拦截器中按需刷新，无需定时器

## 快速开始

### 1. 初始化 TokenStore

在 `src/app.js` 中已经配置了自动初始化：

```javascript
import { initTokenStore } from './store/tokenStore'

async componentDidMount() {
  // 初始化 TokenStore（加载本地存储的 token）
  initTokenStore();
}
```

### 2. 基本使用

```javascript
import { 
  setToken, 
  getAccessToken, 
  getRefreshToken,
  clearToken,
  hasToken
} from '@/store/tokenStore';

// 登录成功后设置 Token
const loginResponse = {
  access_token: "eyJhbGciOiJIUzI1NiIs...",
  refresh_token: "550e8400-e29b-41d4-a716-446655440000",
  token_type: "Bearer",
  expires_in: 899
};
setToken(loginResponse);

// 获取 access_token（用于请求头）
const token = getAccessToken();

// 获取 refresh_token（用于刷新）
const refreshToken = getRefreshToken();

// 检查是否有 Token
if (hasToken()) {
  console.log('用户已登录');
}

// 登出时清除 Token
clearToken();
```

## API 文档

### Token 管理

#### `setToken(token, refreshToken?)`

设置 Token 数据。

**参数：**

- `token`: `string | TokenData` - Token 字符串或完整对象
- `refreshToken?`: `string` - 可选的 refresh_token（当第一个参数是字符串时使用）

**示例：**

```javascript
// 方式 1：传入完整对象（推荐）
setToken({
  access_token: "eyJhbGciOiJIUzI1NiIs...",
  refresh_token: "550e8400-e29b-41d4-a716-446655440000",
  token_type: "Bearer",
  expires_in: 899
});

// 方式 2：传入字符串（兼容旧代码）
setToken("eyJhbGciOiJIUzI1NiIs...", "550e8400-e29b-41d4-a716-446655440000");
```

#### `getAccessToken()`

获取 access_token。

**返回：** `string | null`

#### `getRefreshToken()`

获取 refresh_token。

**返回：** `string | null`

#### `getTokenData()`

获取完整的 Token 数据对象。

**返回：** `TokenData | null`

#### `clearToken()`

清除所有 Token 数据（包括内存和本地存储）。

```javascript
// 用户登出
clearToken();
```

#### `hasToken()`

检查是否存在 Token。

**返回：** `boolean`

### Token 过期检查

#### `isTokenExpired(advanceTime?)`

检查 Token 是否过期或即将过期。

**参数：**

- `advanceTime?`: `number` - 提前判定时间（毫秒），默认 5 分钟

**返回：** `boolean`

**注意：** 需要后端返回 `expires_in` 字段才能判断。

```javascript
import { isTokenExpired } from '@/store/tokenStore';

if (isTokenExpired()) {
  console.log('Token 已过期或即将过期');
  // 在请求拦截器中会自动处理刷新
}

// 提前 10 分钟判断
if (isTokenExpired(10 * 60 * 1000)) {
  console.log('Token 将在 10 分钟内过期');
}
```

#### `getTokenRemainingTime()`

获取 Token 剩余有效时间。

**返回：** `number | null` - 剩余时间（毫秒），如果无法判断返回 `null`

```javascript
const remaining = getTokenRemainingTime();
if (remaining !== null) {
  console.log(`Token 剩余有效时间: ${Math.round(remaining / 1000)} 秒`);
}
```

### 刷新状态管理

#### `setRefreshingState(isRefreshing, promise)`

设置刷新状态（用于防止并发刷新）。

**参数：**

- `isRefreshing`: `boolean` - 是否正在刷新
- `promise`: `Promise<string> | null` - 刷新 Promise

#### `getRefreshingState()`

获取刷新状态。

**返回：** `RefreshingState`

```typescript
interface RefreshingState {
  isRefreshing: boolean;
  refreshPromise: Promise<string> | null;
}
```

### 状态订阅

#### `subscribeTokenStore(listener)`

订阅 Token 状态变化。

**参数：**

- `listener`: `(state: TokenStoreState) => void` - 监听器函数

**返回：** `() => void` - 取消订阅函数

**示例：**

```javascript
import { subscribeTokenStore } from '@/store/tokenStore';

// 订阅状态变化
const unsubscribe = subscribeTokenStore((state) => {
  console.log('Token 状态变化:', state);
  console.log('是否有 token:', !!state.tokenData);
  console.log('是否正在刷新:', state.isRefreshing);
});

// 组件卸载时取消订阅
componentWillUnmount() {
  unsubscribe();
}
```

## 请求前检查刷新（推荐方式）

在 `src/services/servers.js` 中已实现请求前检查：

```javascript
import { isTokenExpired, getRefreshingState, setRefreshingState } from '../store/tokenStore';
import { authorizationHandler } from '../util/authorization';

export async function request(url, params = {}, options = {}) {
  // 1. 请求前检查 token 是否即将过期
  if (options.needToken !== false) {
    const token = loadToken();
    if (token && isTokenExpired()) {
      console.log('[Request] Token 即将过期，先刷新再请求');
      try {
        await ensureTokenRefreshed();
      } catch (error) {
        console.error('[Request] Token 刷新失败:', error);
      }
    }
  }
  
  // 2. 继续发送请求
  return baseRequest(requestParams);
}

// 确保 token 已刷新（带防并发保护）
async function ensureTokenRefreshed() {
  const { isRefreshing, refreshPromise } = getRefreshingState();
  
  // 如果正在刷新，等待完成
  if (isRefreshing && refreshPromise) {
    console.log('[Request] 等待其他请求完成 token 刷新');
    return refreshPromise;
  }
  
  // 开始刷新
  const newRefreshPromise = authorizationHandler.refreshToken();
  setRefreshingState(true, newRefreshPromise);
  
  try {
    const newToken = await newRefreshPromise;
    setRefreshingState(false, null);
    return newToken;
  } catch (error) {
    setRefreshingState(false, null);
    throw error;
  }
}
```

**优点：**

- ✅ 无需定时器和清理逻辑
- ✅ 按需刷新，节省资源
- ✅ 简单可靠，适合小程序场景

## 类型定义

### TokenData

```typescript
interface TokenData {
  /** 访问令牌（JWT） */
  access_token: string;
  /** 刷新令牌（UUID） */
  refresh_token: string | null;
  /** Token 类型（通常是 "Bearer"） */
  token_type: string;
  /** access_token 过期时间（秒） */
  expires_in?: number;
  /** 创建时间戳 */
  created_at: number;
  /** 更新时间戳 */
  updated_at: number;
}
```

### TokenStoreState

```typescript
interface TokenStoreState {
  /** Token 数据 */
  tokenData: TokenData | null;
  /** 是否正在刷新 Token */
  isRefreshing: boolean;
  /** 刷新 Promise（用于防止并发刷新） */
  refreshPromise: Promise<string> | null;
}
```

## 最佳实践

### 1. 在应用启动时初始化

```javascript
// src/app.js
import { initTokenStore } from './store/tokenStore';

class App extends Component {
  async componentDidMount() {
    // 初始化（加载本地存储的 token）
    initTokenStore();
  }
}
```

### 2. 登录时设置 Token

```javascript
// 登录接口返回
const loginResponse = {
  access_token: "eyJhbGciOiJIUzI1NiIs...",
  refresh_token: "550e8400-e29b-41d4-a716-446655440000",
  token_type: "Bearer",
  expires_in: 899
};

// 设置 Token（会自动保存到本地存储）
setToken(loginResponse);
```

### 3. 请求时使用 Token

```javascript
import { getAccessToken } from '@/store/tokenStore';

const token = getAccessToken();
Taro.request({
  url: 'https://api.example.com/data',
  header: {
    'Authorization': `Bearer ${token}`
  }
});
```

### 4. 登出时清理

```javascript
import { clearToken } from '@/store/tokenStore';

function logout() {
  // 清除 Token
  clearToken();
  
  // 跳转到登录页
  Taro.reLaunch({ url: '/pages/login/index' });
}
```

### 5. 处理 Token 过期

推荐在请求拦截器中统一处理，而不是在每个请求中单独检查：

```javascript
// src/services/servers.js 中已实现
// 请求前自动检查 token 是否过期
// 如果过期，自动刷新后再发送请求
// 如果刷新失败，返回 401 错误，由业务代码处理
```

## 常见问题

### Q1: Token 存储在哪里？

A: Token 存储在两个地方：

1. **内存** - 应用运行时的状态
2. **本地存储** - Taro.setStorageSync，应用重启后仍然存在

### Q2: 如何检查 Token 是否过期？

A: 使用 `isTokenExpired()` 方法。需要注意的是，这个方法依赖后端返回的 `expires_in` 字段。如果后端没有返回，将无法判断，默认返回 `false`（假设未过期）。

### Q3: 为什么不使用自动刷新定时器？

A: 因为：

- 小程序后台运行时定时器不可靠
- 需要管理定时器生命周期，增加复杂度
- 请求前检查的方式更简单可靠

### Q4: 如何防止并发刷新？

A: TokenStore 内置了防并发机制：

- 使用 `isRefreshing` 标志位
- 使用 `refreshPromise` 保存刷新 Promise
- 如果正在刷新，后续请求会等待当前刷新完成

### Q5: 组件中订阅 Token 变化

```javascript
import { subscribeTokenStore } from '@/store/tokenStore';

class MyComponent extends Component {
  componentDidMount() {
    // 订阅 Token 变化
    this.unsubscribe = subscribeTokenStore((state) => {
      if (!state.tokenData) {
        // Token 被清除，跳转登录
        Taro.redirectTo({ url: '/pages/login/index' });
      }
    });
  }
  
  componentWillUnmount() {
    // 取消订阅
    this.unsubscribe?.();
  }
}
```

## 迁移指南

### 从旧版本迁移

如果你之前使用的是 `tokenStore.js`：

```javascript
// 旧版本
import { getAccessToken, setToken } from '@/store/tokenStore.js';

// 新版本（路径不变，但现在使用 TypeScript）
import { getAccessToken, setToken } from '@/store/tokenStore';
```

主要变化：

- ✅ 完整的 TypeScript 类型支持
- ✅ 移除了自动刷新定时器
- ✅ 改用请求前检查的方式
- ✅ API 保持兼容，无需修改现有代码

## 总结

TokenStore 提供了简洁的 Token 管理解决方案：

1. **自动持久化** - Token 自动保存到本地存储
2. **请求前检查** - 在请求拦截器中按需刷新
3. **防并发** - 避免重复刷新
4. **类型安全** - 完整的 TypeScript 类型定义
5. **易于集成** - 简单的 API，易于在现有项目中使用

如有问题，请查看源码注释或联系开发团队。
