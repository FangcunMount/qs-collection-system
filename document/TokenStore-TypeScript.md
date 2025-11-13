# TokenStore TypeScript 版本

## 📦 文件结构

```
src/store/
├── tokenStore.ts         # TypeScript 实现（主文件）
├── tokenStore.js         # JavaScript 版本（已废弃）
├── tokenStore.types.js   # JSDoc 类型定义（为 JS 文件提供类型提示）
└── index.js              # 导出入口
```

## 🎯 类型定义

### TokenData

```typescript
interface TokenData {
  access_token: string;       // 访问令牌（JWT）
  refresh_token: string | null; // 刷新令牌（UUID）
  token_type: string;         // Token 类型（"Bearer"）
  expires_in?: number;        // 过期时间（秒）
  created_at: number;         // 创建时间戳
  updated_at: number;         // 更新时间戳
}
```

### TokenStoreState

```typescript
interface TokenStoreState {
  tokenData: TokenData | null;
  isRefreshing: boolean;
  refreshPromise: Promise<string> | null;
}
```

### RefreshingState

```typescript
interface RefreshingState {
  isRefreshing: boolean;
  refreshPromise: Promise<string> | null;
}
```

## 📝 API 文档

### 核心方法

#### `getAccessToken(): string | null`
获取当前的 access_token

```typescript
const token = getAccessToken();
if (token) {
  // 使用 token
}
```

#### `getRefreshToken(): string | null`
获取当前的 refresh_token

```typescript
const refreshToken = getRefreshToken();
```

#### `getTokenData(): TokenData | null`
获取完整的 Token 数据

```typescript
const data = getTokenData();
console.log(data?.expires_in); // 899
```

#### `setToken(token: TokenInput, refreshToken?: string): void`
设置 Token 数据，支持多种输入格式

```typescript
// 方式 1: 完整对象
setToken({
  access_token: "eyJhbGci...",
  refresh_token: "b32a57f6-...",
  token_type: "Bearer",
  expires_in: 899
});

// 方式 2: 字符串 + refresh_token
setToken("eyJhbGci...", "b32a57f6-...");

// 方式 3: 只有字符串（兼容旧版）
setToken("eyJhbGci...");
```

#### `updateAccessToken(newAccessToken: string, newRefreshToken?: string): void`
更新 access_token（刷新后使用）

```typescript
updateAccessToken("new-token", "new-refresh-token");
```

#### `clearToken(): void`
清除所有 Token 数据

```typescript
clearToken(); // 登出时使用
```

### 检查方法

#### `hasToken(): boolean`
检查是否存在 token

```typescript
if (hasToken()) {
  console.log('用户已登录');
}
```

#### `isTokenExpired(): boolean`
检查 token 是否过期（需要 expires_in 字段）

```typescript
if (isTokenExpired()) {
  console.log('Token 已过期，需要刷新');
}
```

### 刷新状态管理

#### `setRefreshingState(isRefreshing: boolean, promise?: Promise<string> | null): void`
设置刷新状态（防止并发刷新）

```typescript
const refreshPromise = authHandler.refreshToken();
setRefreshingState(true, refreshPromise);

refreshPromise
  .then(() => setRefreshingState(false))
  .catch(() => setRefreshingState(false));
```

#### `getRefreshingState(): RefreshingState`
获取当前刷新状态

```typescript
const { isRefreshing, refreshPromise } = getRefreshingState();

if (isRefreshing && refreshPromise) {
  await refreshPromise; // 等待刷新完成
}
```

### 订阅机制

#### `subscribeTokenStore(listener: Listener): () => void`
订阅 Token 变化，返回取消订阅函数

```typescript
const unsubscribe = subscribeTokenStore((state) => {
  console.log('Token 已更新:', state.tokenData);
  console.log('是否正在刷新:', state.isRefreshing);
});

// 取消订阅
unsubscribe();
```

#### `getTokenStoreState(): TokenStoreState`
获取当前状态快照

```typescript
const state = getTokenStoreState();
console.log(state);
```

### 初始化

#### `initTokenStore(): void`
从本地存储加载 Token（应用启动时调用）

```typescript
// app.js
import { initTokenStore } from './store/tokenStore';

initTokenStore(); // 自动从 Taro.getStorageSync('token') 加载
```

## 🔧 在 JavaScript 中使用

### 方式 1: 直接导入（推荐）

```javascript
import { 
  getAccessToken, 
  setToken, 
  clearToken 
} from '../store/tokenStore.ts';

// 使用
const token = getAccessToken();
```

### 方式 2: 使用 JSDoc 类型提示

```javascript
/**
 * @typedef {import('./tokenStore.types').TokenData} TokenData
 * @typedef {import('./tokenStore.types').TokenStoreState} TokenStoreState
 */

import { getTokenData } from '../store/tokenStore.ts';

/**
 * @returns {TokenData | null}
 */
function getCurrentToken() {
  return getTokenData();
}
```

## 🎨 完整示例

### 登录场景

```typescript
import { setToken } from '../store/tokenStore';

async function login(username: string, password: string) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
  
  const data = await response.json();
  
  // 保存 token
  setToken(data.data);
  // 输出:
  // {
  //   access_token: "eyJhbGci...",
  //   refresh_token: "b32a57f6-...",
  //   token_type: "Bearer",
  //   expires_in: 899,
  //   created_at: 1763031728000,
  //   updated_at: 1763031728000
  // }
}
```

### 请求拦截器场景

```typescript
import { getAccessToken, isTokenExpired } from '../store/tokenStore';

function getAuthHeader(): string | null {
  const token = getAccessToken();
  
  if (!token) {
    return null;
  }
  
  if (isTokenExpired()) {
    console.warn('Token 已过期');
    // 触发刷新逻辑
    return null;
  }
  
  return `Bearer ${token}`;
}
```

### Token 刷新场景

```typescript
import { 
  getRefreshToken, 
  getRefreshingState, 
  setRefreshingState, 
  setToken 
} from '../store/tokenStore';

async function refreshAccessToken(): Promise<string> {
  // 检查是否正在刷新
  const { isRefreshing, refreshPromise } = getRefreshingState();
  
  if (isRefreshing && refreshPromise) {
    // 等待其他请求完成刷新
    return refreshPromise;
  }
  
  // 开始刷新
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error('没有 refresh_token');
  }
  
  const promise = (async () => {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken })
    });
    
    const data = await response.json();
    
    // 保存新 token
    setToken(data.data);
    
    return data.data.access_token;
  })();
  
  setRefreshingState(true, promise);
  
  try {
    const newToken = await promise;
    setRefreshingState(false, null);
    return newToken;
  } catch (error) {
    setRefreshingState(false, null);
    throw error;
  }
}
```

### React 组件中订阅

```typescript
import React, { useEffect, useState } from 'react';
import { subscribeTokenStore, TokenStoreState } from '../store/tokenStore';

function TokenStatus() {
  const [state, setState] = useState<TokenStoreState | null>(null);
  
  useEffect(() => {
    const unsubscribe = subscribeTokenStore((newState) => {
      setState(newState);
    });
    
    return unsubscribe;
  }, []);
  
  return (
    <div>
      <p>Token: {state?.tokenData?.access_token ? '✅ 已登录' : '❌ 未登录'}</p>
      <p>过期时间: {state?.tokenData?.expires_in}秒</p>
      <p>刷新中: {state?.isRefreshing ? '是' : '否'}</p>
    </div>
  );
}
```

## ✨ TypeScript 优势

### 1. 类型安全

```typescript
// ❌ 编译错误: 缺少必需字段
setToken({
  access_token: "xxx"
  // 缺少 token_type 等字段
});

// ✅ 正确
setToken({
  access_token: "xxx",
  refresh_token: "yyy",
  token_type: "Bearer",
  expires_in: 899
});
```

### 2. 智能提示

```typescript
const data = getTokenData();
// IDE 会自动提示:
// - data?.access_token
// - data?.refresh_token
// - data?.expires_in
// - ...
```

### 3. 重构安全

重命名 `access_token` 时，TypeScript 会自动找出所有使用的地方。

### 4. 文档即代码

接口定义就是最好的文档，无需额外维护 JSDoc。

## 🔄 迁移指南

### 从 tokenStore.js 迁移

1. **更新导入路径**
```javascript
// 旧版
import { getAccessToken } from './store/tokenStore';

// 新版（可以省略 .ts 扩展名）
import { getAccessToken } from './store/tokenStore.ts';
```

2. **API 完全兼容**
所有 API 保持不变，无需修改调用代码。

3. **删除旧文件**
```bash
rm src/store/tokenStore.js
```

## 🛠️ 开发建议

1. **总是通过 TokenStore 操作 token**
   - ✅ `setToken(data)`
   - ❌ `Taro.setStorageSync('token', data)`

2. **使用类型导入获得更好的类型提示**
```typescript
import type { TokenData, TokenStoreState } from './store/tokenStore';
```

3. **刷新时使用防并发机制**
```typescript
const { isRefreshing, refreshPromise } = getRefreshingState();
if (isRefreshing) await refreshPromise;
```

4. **在应用启动时初始化**
```typescript
// app.js/app.ts
initTokenStore();
```
