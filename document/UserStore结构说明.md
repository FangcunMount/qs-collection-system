# UserStore 结构说明

## 📋 State 结构

### 完整结构定义

```typescript
interface UserStoreState {
  userInfo: UserInfo | null;        // 当前用户信息
  testeeList: Testee[];              // 受试者列表
  selectedTesteeId: string;          // 当前选中的受试者ID
  isInitialized: boolean;            // 是否已初始化
  isLoading: boolean;                // 是否正在加载
}

interface UserInfo {
  id: string;                        // 用户ID
  name: string;                      // 用户名称
  avatar?: string;                   // 用户头像
  phone?: string;                    // 手机号
  [key: string]: any;                // 后端返回的其他字段
}

interface Testee {
  id: string;                        // 受试者ID（已归一化为字符串）
  name: string;                      // 受试者名称
}
```

## 🔧 新增字段说明

### 1. `isInitialized` - 初始化状态
- **类型**: `boolean`
- **默认值**: `false`
- **用途**: 标记 UserStore 是否已完成初始化
- **使用场景**:
  ```javascript
  import { isStoreInitialized } from '@/store/userStore';
  
  if (!isStoreInitialized()) {
    // 显示加载提示或引导用户登录
  }
  ```

### 2. `isLoading` - 加载状态
- **类型**: `boolean`
- **默认值**: `false`
- **用途**: 标记是否正在加载用户数据
- **使用场景**:
  ```javascript
  import { isStoreLoading, subscribeUserStore } from '@/store/userStore';
  
  // 订阅状态变化
  subscribeUserStore((state) => {
    if (state.isLoading) {
      Taro.showLoading({ title: '加载中...' });
    } else {
      Taro.hideLoading();
    }
  });
  ```

## 📦 新增 API

### 1. `getSelectedTestee()` - 获取选中的受试者对象

```javascript
import { getSelectedTestee } from '@/store/userStore';

const selectedTestee = getSelectedTestee();
// 返回: { id: '1', name: '张三' } 或 null
```

**与 `getSelectedTesteeId()` 的区别**:
- `getSelectedTesteeId()`: 返回 ID 字符串 `'1'`
- `getSelectedTestee()`: 返回完整对象 `{ id: '1', name: '张三' }`

### 2. `removeTestee(testeeId)` - 删除受试者

```javascript
import { removeTestee } from '@/store/userStore';

// 删除指定受试者
removeTestee('2');

// 如果删除的是当前选中的受试者，会自动选择列表中的第一个
```

### 3. `isStoreInitialized()` - 检查初始化状态

```javascript
import { isStoreInitialized } from '@/store/userStore';

if (!isStoreInitialized()) {
  console.log('UserStore 尚未初始化');
}
```

### 4. `isStoreLoading()` - 检查加载状态

```javascript
import { isStoreLoading } from '@/store/userStore';

if (isStoreLoading()) {
  console.log('正在加载用户数据...');
}
```

### 5. `getStoreState()` - 获取完整状态快照

```javascript
import { getStoreState } from '@/store/userStore';

const snapshot = getStoreState();
console.log(snapshot);
// {
//   userInfo: { id: '1', name: '张三' },
//   testeeList: [{ id: '1', name: '受试者A' }],
//   selectedTesteeId: '1',
//   isInitialized: true,
//   isLoading: false
// }
```

### 6. `initUserStore(force)` - 初始化（增强版）

```javascript
import { initUserStore } from '@/store/userStore';

// 正常初始化（如果已初始化则跳过）
await initUserStore();

// 强制重新初始化
await initUserStore(true);
```

**新增特性**:
- ✅ 防止重复初始化（除非 `force = true`）
- ✅ 加载状态管理（自动设置 `isLoading`）
- ✅ 并发控制（如果正在加载，等待完成而不是重复请求）
- ✅ 初始化标记（成功后设置 `isInitialized = true`）

## 🎯 完整 API 列表

### 用户信息
```javascript
getUserInfo()           // 获取用户信息
setUserInfo(info)       // 设置用户信息
```

### 受试者列表
```javascript
getTesteeList()         // 获取受试者列表
setTesteeList(list)     // 设置受试者列表
addTestee(testee)       // 添加单个受试者（已存在则更新）
removeTestee(testeeId)  // 删除受试者 [新增]
```

### 选中状态
```javascript
getSelectedTesteeId()   // 获取选中的受试者 ID
getSelectedTestee()     // 获取选中的受试者对象 [新增]
setSelectedTesteeId(id) // 设置选中的受试者
```

### Store 状态
```javascript
isStoreInitialized()    // 检查是否已初始化 [新增]
isStoreLoading()        // 检查是否正在加载 [新增]
getStoreState()         // 获取完整状态快照 [新增]
```

### 生命周期
```javascript
resetUserStore()        // 重置到初始状态
subscribeUserStore(fn)  // 订阅状态变化
initUserStore(force)    // 初始化 [增强]
```

## 💡 使用示例

### 示例 1: 显示加载状态

```javascript
import React, { useState, useEffect } from 'react';
import { View, Text } from '@tarojs/components';
import { AtActivityIndicator } from 'taro-ui';
import { subscribeUserStore } from '@/store/userStore';

function UserProfile() {
  const [state, setState] = useState({});
  
  useEffect(() => {
    const unsubscribe = subscribeUserStore((snapshot) => {
      setState(snapshot);
    });
    return unsubscribe;
  }, []);
  
  if (state.isLoading) {
    return <AtActivityIndicator mode="center" content="加载中..." />;
  }
  
  if (!state.isInitialized) {
    return <Text>请先登录</Text>;
  }
  
  return (
    <View>
      <Text>用户: {state.userInfo?.name}</Text>
      <Text>受试者: {state.testeeList.length} 个</Text>
    </View>
  );
}
```

### 示例 2: 获取当前选中的受试者

```javascript
import { getSelectedTestee } from '@/store/userStore';

function getCurrentTestee() {
  const testee = getSelectedTestee();
  
  if (!testee) {
    console.log('未选中任何受试者');
    return null;
  }
  
  console.log(`当前选中: ${testee.name} (ID: ${testee.id})`);
  return testee;
}
```

### 示例 3: 删除受试者

```javascript
import Taro from '@tarojs/taro';
import { removeTestee, getTesteeList } from '@/store/userStore';

function handleDeleteTestee(testeeId) {
  Taro.showModal({
    title: '确认删除',
    content: '确定要删除这个受试者吗？',
    success: (res) => {
      if (res.confirm) {
        removeTestee(testeeId);
        
        const remaining = getTesteeList();
        Taro.showToast({
          title: `已删除，剩余 ${remaining.length} 个`,
          icon: 'success'
        });
      }
    }
  });
}
```

### 示例 4: 强制刷新用户数据

```javascript
import Taro from '@tarojs/taro';
import { initUserStore } from '@/store/userStore';

async function refreshUserData() {
  try {
    Taro.showLoading({ title: '刷新中...' });
    
    // 强制重新初始化
    const result = await initUserStore(true);
    
    Taro.hideLoading();
    Taro.showToast({
      title: '刷新成功',
      icon: 'success'
    });
    
    console.log('刷新后的数据:', result);
  } catch (error) {
    Taro.hideLoading();
    Taro.showToast({
      title: '刷新失败',
      icon: 'none'
    });
  }
}
```

### 示例 5: 条件渲染（基于初始化状态）

```javascript
import React, { useState, useEffect } from 'react';
import { View, Button } from '@tarojs/components';
import { isStoreInitialized, initUserStore } from '@/store/userStore';

function AppGuard({ children }) {
  const [initialized, setInitialized] = useState(isStoreInitialized());
  
  useEffect(() => {
    if (!initialized) {
      initUserStore().then(() => {
        setInitialized(true);
      });
    }
  }, []);
  
  if (!initialized) {
    return (
      <View className="loading-screen">
        <Text>正在加载...</Text>
      </View>
    );
  }
  
  return children;
}
```

## 🔄 状态流转

```
未初始化
  ↓
{ isInitialized: false, isLoading: false }
  ↓
调用 initUserStore()
  ↓
{ isInitialized: false, isLoading: true }
  ↓
并行加载数据
  ↓
{ isInitialized: true, isLoading: false }
  ↓
数据就绪，可正常使用
```

## ⚠️ 重要变更

### 兼容性
所有旧 API 保持不变，新增的 API 不会影响现有代码。

### 迁移建议
1. **替换 ID 获取**:
   ```javascript
   // 旧方式（仍然有效）
   const id = getSelectedTesteeId();
   const testee = getTesteeList().find(t => t.id === id);
   
   // 新方式（推荐）
   const testee = getSelectedTestee();
   ```

2. **加载状态检查**:
   ```javascript
   // 旧方式（需要自己管理状态）
   const [loading, setLoading] = useState(true);
   initUserStore().then(() => setLoading(false));
   
   // 新方式（自动管理）
   subscribeUserStore((state) => {
     setLoading(state.isLoading);
   });
   ```

## 📊 完整状态示例

```javascript
{
  userInfo: {
    id: '123',
    name: '张三',
    avatar: 'https://example.com/avatar.jpg',
    phone: '138****8888'
  },
  testeeList: [
    { id: '1', name: '受试者A' },
    { id: '2', name: '受试者B' },
    { id: '3', name: '受试者C' }
  ],
  selectedTesteeId: '1',
  isInitialized: true,
  isLoading: false
}
```
