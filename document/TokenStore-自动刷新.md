# TokenStore 自动刷新功能

## ✨ 新增功能

TokenStore 现在支持**自动刷新 Token**，无需手动管理刷新逻辑！

### 核心特性

1. ⏰ **自动定时刷新** - Token 即将过期时自动刷新
2. 🔒 **防并发刷新** - 多个请求同时触发时只刷新一次
3. 🎯 **智能调度** - 根据 token 剩余时间智能安排刷新
4. 🔄 **循环刷新** - 刷新成功后自动安排下次刷新
5. 📊 **剩余时间查询** - 随时查询 token 还有多久过期

---

## 🚀 快速开始

### 1. 配置自动刷新

在 `app.js` 中初始化时配置：

```typescript
import { initTokenStore } from './store/tokenStore';
import { authorizationHandler } from './util/authorization';

// 定义刷新函数
async function refreshTokenFunction() {
  // 调用后端刷新接口
  const newToken = await authorizationHandler.refreshToken();
  
  // 返回完整的 token 数据
  return newToken; // 必须包含 access_token, refresh_token, expires_in 等字段
}

// 初始化 TokenStore 并启用自动刷新
initTokenStore({
  refreshFunction: refreshTokenFunction,
  enableAutoRefresh: true,
  refreshBeforeExpire: 5 * 60 * 1000  // 提前 5 分钟刷新（可选）
});
```

### 2. 自动刷新开始工作

```typescript
// 登录后保存 token
setToken({
  access_token: "eyJhbGci...",
  refresh_token: "b32a57f6-...",
  token_type: "Bearer",
  expires_in: 899  // 899 秒后过期
});

// TokenStore 会自动计算：
// 过期时间 = 当前时间 + 899 秒
// 刷新时间 = 过期时间 - 5 分钟
// 在 599 秒后自动触发刷新
```

---

## 📖 API 文档

### 新增类型

#### `TokenRefreshFunction`

```typescript
type TokenRefreshFunction = () => Promise<TokenData>;
```

刷新函数类型，必须返回完整的 `TokenData` 对象。

#### `TokenStoreConfig`

```typescript
interface TokenStoreConfig {
  /** 自动刷新函数 */
  refreshFunction?: TokenRefreshFunction;
  /** 提前刷新时间（毫秒），默认 5 分钟 */
  refreshBeforeExpire?: number;
  /** 是否启用自动刷新检查，默认 false */
  enableAutoRefresh?: boolean;
}
```

---

### 新增方法

#### `configureTokenStore(config)`

配置 TokenStore

```typescript
configureTokenStore({
  refreshFunction: myRefreshFunction,
  enableAutoRefresh: true,
  refreshBeforeExpire: 10 * 60 * 1000  // 提前 10 分钟刷新
});
```

#### `refreshToken()`

手动触发刷新

```typescript
try {
  const newAccessToken = await refreshToken();
  console.log('刷新成功:', newAccessToken);
} catch (error) {
  console.error('刷新失败:', error);
}
```

#### `getTokenRemainingTime()`

获取 token 剩余有效时间（毫秒）

```typescript
const remaining = getTokenRemainingTime();
if (remaining) {
  console.log(`Token 还有 ${Math.round(remaining / 1000)} 秒过期`);
}
```

#### `isTokenExpired(advanceTime?)`

检查 token 是否过期（支持自定义提前时间）

```typescript
// 使用默认提前时间（配置的 refreshBeforeExpire）
if (isTokenExpired()) {
  console.log('Token 即将过期');
}

// 自定义提前时间：提前 10 分钟判定为过期
if (isTokenExpired(10 * 60 * 1000)) {
  console.log('Token 10 分钟内会过期');
}
```

---

## 🎯 完整示例

### 示例 1: 基本配置

```typescript
// app.js
import { initTokenStore } from './store/tokenStore';
import { authorizationHandler } from './util/authorization';

class App extends Component {
  async componentDidMount() {
    // 配置并初始化 TokenStore
    initTokenStore({
      // 刷新函数
      refreshFunction: async () => {
        console.log('[App] 开始刷新 token');
        const newToken = await authorizationHandler.refreshToken();
        console.log('[App] Token 刷新成功');
        return newToken;
      },
      
      // 启用自动刷新
      enableAutoRefresh: true,
      
      // 提前 5 分钟刷新
      refreshBeforeExpire: 5 * 60 * 1000
    });
  }
}
```

### 示例 2: 在 authorization.js 中实现刷新函数

```typescript
// util/authorization.js
import { getRefreshToken, setToken } from '../store/tokenStore';

class AuthorizationHandler {
  async refreshToken() {
    const refreshToken = getRefreshToken();
    
    if (!refreshToken) {
      throw new Error('没有 refresh_token');
    }

    const wxApi = getWxApi();
    
    return new Promise((resolve, reject) => {
      wxApi.request({
        url: `${config.iamHost}/auth/refresh?display=json`,
        data: { refresh_token: refreshToken },
        method: 'POST',
        success(res) {
          const { code, data } = res.data;
          
          if (!code || code === '0') {
            // 返回完整的 token 数据
            resolve({
              access_token: data.access_token,
              refresh_token: data.refresh_token || refreshToken,
              token_type: data.token_type || 'Bearer',
              expires_in: data.expires_in,
              created_at: Date.now(),
              updated_at: Date.now()
            });
          } else {
            reject(new Error(data.message || 'Token 刷新失败'));
          }
        },
        fail(err) {
          reject(err);
        }
      });
    });
  }
}
```

### 示例 3: 动态启用/禁用自动刷新

```typescript
import { configureTokenStore, getTokenRemainingTime } from './store/tokenStore';

// 在用户活跃时启用自动刷新
function onUserActive() {
  configureTokenStore({
    enableAutoRefresh: true
  });
  console.log('自动刷新已启用');
}

// 在用户不活跃时禁用自动刷新
function onUserInactive() {
  configureTokenStore({
    enableAutoRefresh: false
  });
  console.log('自动刷新已禁用');
}

// 在某个页面显示 token 状态
function showTokenStatus() {
  const remaining = getTokenRemainingTime();
  if (remaining) {
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    console.log(`Token 剩余时间: ${minutes}分${seconds}秒`);
  }
}
```

### 示例 4: 手动刷新

```typescript
import { refreshToken, isTokenExpired } from './store/tokenStore';

// 在发起重要请求前检查并刷新
async function makeImportantRequest() {
  // 检查 token 是否即将过期（提前 1 分钟）
  if (isTokenExpired(60 * 1000)) {
    console.log('Token 即将过期，先刷新');
    try {
      await refreshToken();
    } catch (error) {
      console.error('刷新失败:', error);
      // 跳转到登录页
      return;
    }
  }
  
  // 发起请求
  const result = await fetch('/api/important-data');
  return result;
}
```

### 示例 5: 订阅 token 变化（显示倒计时）

```typescript
import React, { useEffect, useState } from 'react';
import { subscribeTokenStore, getTokenRemainingTime } from './store/tokenStore';

function TokenCountdown() {
  const [remaining, setRemaining] = useState<number | null>(null);
  
  useEffect(() => {
    // 订阅 token 变化
    const unsubscribe = subscribeTokenStore(() => {
      setRemaining(getTokenRemainingTime());
    });
    
    // 每秒更新一次倒计时
    const timer = setInterval(() => {
      setRemaining(getTokenRemainingTime());
    }, 1000);
    
    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, []);
  
  if (!remaining) {
    return <div>无 Token 或无法判断过期时间</div>;
  }
  
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  
  return (
    <div>
      Token 剩余时间: {minutes}分{seconds}秒
      {remaining < 5 * 60 * 1000 && (
        <span style={{ color: 'red' }}> (即将过期)</span>
      )}
    </div>
  );
}
```

---

## 🔄 工作流程

### 自动刷新时间线

```
登录时间: 0s
Token 有效期: 899s (约 15 分钟)
提前刷新: 300s (5 分钟)
刷新时间: 599s (约 10 分钟后)

Timeline:
|-------|-------|-------|-------|
0s      599s    899s    
登录    自动刷新  过期
        ↑
        TokenStore 自动触发刷新
```

### 刷新流程

```
1. setToken() 保存 token
   ↓
2. scheduleAutoRefresh() 计算刷新时间
   ↓
3. setTimeout() 设置定时器
   ↓
4. 时间到达，执行 performAutoRefresh()
   ↓
5. 调用 config.refreshFunction()
   ↓
6. 刷新成功，setToken() 保存新 token
   ↓
7. 重新 scheduleAutoRefresh() 安排下次刷新
   ↓
8. 循环...
```

---

## ⚙️ 配置选项

### `refreshFunction`

**类型**: `() => Promise<TokenData>`  
**默认值**: `undefined`  
**必需**: 是（启用自动刷新时）

刷新函数必须返回完整的 `TokenData` 对象：

```typescript
{
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;  // 重要！用于计算下次刷新时间
}
```

### `enableAutoRefresh`

**类型**: `boolean`  
**默认值**: `false`

是否启用自动刷新。设置为 `true` 后，TokenStore 会在 token 即将过期时自动调用 `refreshFunction`。

### `refreshBeforeExpire`

**类型**: `number` (毫秒)  
**默认值**: `300000` (5 分钟)

提前多久刷新 token。例如：
- `5 * 60 * 1000` = 提前 5 分钟
- `10 * 60 * 1000` = 提前 10 分钟
- `60 * 1000` = 提前 1 分钟

---

## 🛡️ 错误处理

### 刷新失败处理

```typescript
configureTokenStore({
  refreshFunction: async () => {
    try {
      const newToken = await authorizationHandler.refreshToken();
      return newToken;
    } catch (error) {
      console.error('刷新失败:', error);
      
      // 如果是 refresh_token 过期，清除 token 并跳转登录
      if (error.code === '401' || error.needRelogin) {
        clearToken();
        Taro.reLaunch({ url: '/pages/register/index' });
      }
      
      throw error; // 继续抛出错误
    }
  },
  enableAutoRefresh: true
});
```

### 网络错误重试

```typescript
async function refreshWithRetry(maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await authorizationHandler.refreshToken();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      console.log(`刷新失败，重试 ${i + 1}/${maxRetries}`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

configureTokenStore({
  refreshFunction: refreshWithRetry,
  enableAutoRefresh: true
});
```

---

## 💡 最佳实践

### 1. ✅ 在应用启动时配置

```typescript
// app.js
componentDidMount() {
  initTokenStore({
    refreshFunction: myRefreshFunction,
    enableAutoRefresh: true
  });
}
```

### 2. ✅ 确保 refreshFunction 返回完整数据

```typescript
// ❌ 错误：只返回 access_token
refreshFunction: async () => {
  return "new-access-token-string";
}

// ✅ 正确：返回完整的 TokenData
refreshFunction: async () => {
  return {
    access_token: "...",
    refresh_token: "...",
    token_type: "Bearer",
    expires_in: 899
  };
}
```

### 3. ✅ 合理设置提前刷新时间

```typescript
// 根据 token 有效期设置
// expires_in = 900s (15分钟) → refreshBeforeExpire = 300s (5分钟)
// expires_in = 3600s (1小时) → refreshBeforeExpire = 600s (10分钟)
// expires_in = 86400s (1天) → refreshBeforeExpire = 3600s (1小时)

const refreshBeforeExpire = Math.min(
  tokenData.expires_in * 1000 * 0.3,  // 30% 的有效期
  10 * 60 * 1000  // 最多提前 10 分钟
);
```

### 4. ✅ 在重要操作前检查

```typescript
// 在支付、提交表单等重要操作前
async function submitImportantForm() {
  if (isTokenExpired(60 * 1000)) {  // 提前 1 分钟
    await refreshToken();  // 手动刷新确保 token 新鲜
  }
  
  // 执行操作
  await submitForm();
}
```

### 5. ⚠️ 不要在刷新函数中使用 TokenStore

```typescript
// ❌ 危险：可能造成循环依赖
refreshFunction: async () => {
  const token = getAccessToken();  // 避免在刷新函数中调用 TokenStore
  // ...
}

// ✅ 正确：直接调用 API
refreshFunction: async () => {
  return await authAPI.refresh();
}
```

---

## 🔍 调试技巧

### 查看刷新日志

TokenStore 会输出详细的日志：

```
[TokenStore] Token 已更新 {hasAccessToken: true, expiresIn: 899}
[TokenStore] 将在 599 秒后自动刷新 token
[TokenStore] 开始自动刷新 token
[TokenStore] 自动刷新成功
[TokenStore] 将在 599 秒后自动刷新 token
```

### 测试自动刷新

```typescript
// 设置一个很短的有效期和刷新时间，快速测试
setToken({
  access_token: "test-token",
  refresh_token: "test-refresh",
  token_type: "Bearer",
  expires_in: 60  // 1 分钟后过期
});

configureTokenStore({
  refreshFunction: async () => {
    console.log('测试刷新触发！');
    return {
      access_token: "new-test-token",
      refresh_token: "new-test-refresh",
      token_type: "Bearer",
      expires_in: 60
    };
  },
  enableAutoRefresh: true,
  refreshBeforeExpire: 30 * 1000  // 提前 30 秒刷新
});

// 30 秒后应该看到刷新日志
```

---

## 📊 与手动刷新对比

| 特性 | 手动刷新 | 自动刷新 |
|------|---------|---------|
| 实现复杂度 | 高 | 低 |
| 维护成本 | 高 | 低 |
| 刷新时机 | 请求失败后 | 提前预防 |
| 用户体验 | 可能中断 | 无感知 |
| 并发控制 | 需手动实现 | 自动处理 |
| 代码分散 | 多处重复 | 集中管理 |

使用自动刷新后，代码从：

```typescript
// 之前：每个请求都要处理 token 过期
async function fetchData() {
  try {
    return await api.getData();
  } catch (error) {
    if (error.code === '401') {
      await refreshToken();
      return await api.getData();  // 重试
    }
    throw error;
  }
}
```

简化为：

```typescript
// 现在：TokenStore 自动处理
async function fetchData() {
  return await api.getData();  // 就这么简单！
}
```

---

## ✅ 总结

TokenStore 的自动刷新功能提供了：

✅ **零配置使用** - 可选功能，不影响现有代码  
✅ **智能调度** - 根据 token 实际过期时间自动安排  
✅ **防并发** - 多个触发只执行一次  
✅ **循环刷新** - 刷新成功自动安排下次  
✅ **手动触发** - 支持手动调用 `refreshToken()`  
✅ **状态查询** - 随时查看剩余时间  
✅ **完整日志** - 方便调试和监控  

一次配置，永久生效！🎉
