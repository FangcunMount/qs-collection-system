# TokenStore TypeScript - 快速参考

## 📦 核心类型

```typescript
interface TokenData {
  access_token: string;
  refresh_token: string | null;
  token_type: string;           // "Bearer"
  expires_in?: number;          // 899
  created_at: number;
  updated_at: number;
}
```

## 🎯 常用 API

| API | 说明 | 返回值 |
|-----|------|--------|
| `getAccessToken()` | 获取 access_token | `string \| null` |
| `getRefreshToken()` | 获取 refresh_token | `string \| null` |
| `setToken(data)` | 保存 token（自动持久化） | `void` |
| `clearToken()` | 清除 token | `void` |
| `hasToken()` | 检查是否有 token | `boolean` |
| `isTokenExpired()` | 检查是否过期 | `boolean` |

## ⚡ 快速示例

### 保存 Token
```typescript
// 后端返回的完整数据
setToken({
  access_token: "eyJhbGci...",
  refresh_token: "b32a57f6-...",
  token_type: "Bearer",
  expires_in: 899
});
```

### 获取 Token
```typescript
const token = getAccessToken();
const header = token ? `Bearer ${token}` : null;
```

### 清除 Token（登出）
```typescript
clearToken();
```

### 检查状态
```typescript
if (!hasToken()) {
  // 未登录，跳转登录页
}

if (isTokenExpired()) {
  // Token 过期，刷新
}
```

## 🔄 刷新防并发

```typescript
const { isRefreshing, refreshPromise } = getRefreshingState();

if (isRefreshing && refreshPromise) {
  // 等待其他请求完成刷新
  await refreshPromise;
} else {
  // 开始刷新
  const promise = refreshTokenAPI();
  setRefreshingState(true, promise);
  await promise;
  setRefreshingState(false);
}
```

## 📡 订阅变化

```typescript
const unsubscribe = subscribeTokenStore((state) => {
  console.log('Token 更新:', state.tokenData);
});

// 取消订阅
unsubscribe();
```

## 🚀 初始化

```typescript
// app.js/app.ts
import { initTokenStore } from './store/tokenStore';

initTokenStore(); // 从本地存储加载
```

## ✅ 类型安全

```typescript
// 导入类型
import type { TokenData, TokenStoreState } from './store/tokenStore';

// 使用类型
const data: TokenData | null = getTokenData();
```

## 💡 最佳实践

1. ✅ **总是通过 TokenStore 操作**
   ```typescript
   setToken(data);  // ✅
   Taro.setStorageSync('token', data);  // ❌
   ```

2. ✅ **刷新时使用防并发**
   ```typescript
   const { isRefreshing, refreshPromise } = getRefreshingState();
   if (isRefreshing) await refreshPromise;
   ```

3. ✅ **应用启动时初始化**
   ```typescript
   initTokenStore();
   ```

4. ✅ **使用 TypeScript 导入类型**
   ```typescript
   import type { TokenData } from './store/tokenStore';
   ```
