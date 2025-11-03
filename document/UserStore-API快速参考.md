# UserStore API 快速参考

## 📊 State 结构

```javascript
{
  userInfo: UserInfo | null,      // 用户信息
  testeeList: Testee[],            // 受试者列表
  selectedTesteeId: string,        // 选中的受试者ID
  isInitialized: boolean,          // 是否已初始化 ⭐新增
  isLoading: boolean               // 是否正在加载 ⭐新增
}
```

## 🔧 完整 API (共 17 个)

### 用户信息 (2)
| API | 参数 | 返回值 | 说明 |
|-----|------|--------|------|
| `getUserInfo()` | - | `UserInfo \| null` | 获取用户信息 |
| `setUserInfo(info)` | `UserInfo \| null` | `void` | 设置用户信息 |

### 受试者列表 (4)
| API | 参数 | 返回值 | 说明 |
|-----|------|--------|------|
| `getTesteeList()` | - | `Testee[]` | 获取受试者列表 |
| `setTesteeList(list)` | `Array` | `void` | 设置列表（自动归一化） |
| `addTestee(testee)` | `Object` | `void` | 添加/更新单个受试者 |
| `removeTestee(testeeId)` ⭐ | `string` | `void` | 删除受试者 |

### 选中状态 (3)
| API | 参数 | 返回值 | 说明 |
|-----|------|--------|------|
| `getSelectedTesteeId()` | - | `string` | 获取选中的 ID |
| `getSelectedTestee()` ⭐ | - | `Testee \| null` | 获取选中的对象 |
| `setSelectedTesteeId(id)` | `string` | `void` | 设置选中的 ID |

### Store 状态 (3) ⭐全新
| API | 参数 | 返回值 | 说明 |
|-----|------|--------|------|
| `isStoreInitialized()` | - | `boolean` | 是否已初始化 |
| `isStoreLoading()` | - | `boolean` | 是否正在加载 |
| `getStoreState()` | - | `UserStoreState` | 获取完整状态快照 |

### 生命周期 (3)
| API | 参数 | 返回值 | 说明 |
|-----|------|--------|------|
| `resetUserStore()` | - | `void` | 重置到初始状态 |
| `subscribeUserStore(fn)` | `Function` | `Function` | 订阅状态变化 |
| `initUserStore(force)` | `boolean?` | `Promise<State>` | 初始化（增强） |

### 初始化增强 ⭐
- ✅ 防止重复初始化
- ✅ 并发控制（正在加载时等待）
- ✅ 自动设置 `isInitialized` 和 `isLoading`
- ✅ 支持强制刷新 `initUserStore(true)`

## 💡 常用代码片段

### 1. 基础使用
```javascript
import { getUserInfo, getTesteeList, getSelectedTestee } from '@/store/userStore';

const user = getUserInfo();
const testees = getTesteeList();
const current = getSelectedTestee();
```

### 2. 订阅状态
```javascript
import { subscribeUserStore } from '@/store/userStore';

useEffect(() => {
  const unsubscribe = subscribeUserStore((state) => {
    console.log('State changed:', state);
  });
  return unsubscribe;
}, []);
```

### 3. 检查状态
```javascript
import { isStoreInitialized, isStoreLoading } from '@/store/userStore';

if (!isStoreInitialized()) {
  console.log('尚未初始化');
}

if (isStoreLoading()) {
  console.log('正在加载...');
}
```

### 4. 强制刷新
```javascript
import { initUserStore } from '@/store/userStore';

// 强制重新加载数据
await initUserStore(true);
```

### 5. 删除受试者
```javascript
import { removeTestee } from '@/store/userStore';

removeTestee('123');  // 自动重新选择第一个
```

## 🔄 类型定义

```typescript
interface UserInfo {
  id: string;
  name: string;
  avatar?: string;
  phone?: string;
  [key: string]: any;
}

interface Testee {
  id: string;      // 已归一化为字符串
  name: string;
}

interface UserStoreState {
  userInfo: UserInfo | null;
  testeeList: Testee[];
  selectedTesteeId: string;
  isInitialized: boolean;  // ⭐新增
  isLoading: boolean;      // ⭐新增
}
```

## 📝 导入方式

```javascript
// 按需导入（推荐）
import { getUserInfo, getTesteeList, initUserStore } from '@/store/userStore';

// 默认导入
import userStore from '@/store/userStore';
userStore.getUserInfo();

// 通过 store/index.js
import { getUserInfo } from '@/store';
```

## ⚡ 性能优化

### 避免重复初始化
```javascript
// ❌ 不推荐
await initUserStore();
await initUserStore();  // 会重复请求

// ✅ 推荐
await initUserStore();
await initUserStore();  // 自动跳过
```

### 并发控制
```javascript
// 多个组件同时调用初始化
Promise.all([
  initUserStore(),  // 发起请求
  initUserStore(),  // 等待第一个完成
  initUserStore()   // 等待第一个完成
]);
// 只会发起一次网络请求
```

## 🎯 快速对照表

| 需求 | API |
|------|-----|
| 获取用户名 | `getUserInfo()?.name` |
| 获取受试者数量 | `getTesteeList().length` |
| 获取当前选中的名字 | `getSelectedTestee()?.name` |
| 检查是否已登录 | `getUserInfo() !== null` |
| 检查是否已初始化 | `isStoreInitialized()` |
| 检查是否正在加载 | `isStoreLoading()` |
| 刷新数据 | `initUserStore(true)` |
| 登出 | `resetUserStore()` |

## 📖 完整文档

- 详细说明: `document/UserStore结构说明.md`
- 使用教程: `document/UserStore使用说明.md`
