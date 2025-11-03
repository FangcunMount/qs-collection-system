# UserStore 使用说明

## 概述

`userStore` 是一个全局状态管理模块，用于管理用户信息、受试者列表及当前选中的受试者。

## 自动初始化

小程序启动时会自动初始化 UserStore，无需手动调用：

```javascript
// src/app.js 中已配置
async componentDidMount() {
  initConfig(config)
  
  // 自动初始化用户 store
  const result = await initUserStore();
  console.log('UserStore 初始化完成:', result);
}
```

## 初始化流程

`initUserStore()` 会按顺序完成以下操作：

1. **加载用户信息** - 调用 `/user/info` 接口
2. **加载受试者列表** - 调用 `/user/childlist` 接口
3. **自动选择受试者** - 如果列表不为空，自动选中第一个受试者

### 初始化特性

- ✅ **并行加载**：用户信息和受试者列表同时请求，提升性能
- ✅ **容错处理**：即使接口失败也不会阻断小程序启动
- ✅ **日志记录**：详细的控制台日志，便于调试
- ✅ **避免循环依赖**：使用动态 import 导入 API 模块

## API 说明

### 用户信息

```javascript
import { getUserInfo, setUserInfo } from '@/store/userStore';

// 获取当前用户信息
const userInfo = getUserInfo();

// 设置用户信息
setUserInfo({
  id: '123',
  name: '张三',
  // ...其他字段
});
```

### 受试者列表

```javascript
import { 
  getTesteeList, 
  setTesteeList, 
  addTestee 
} from '@/store/userStore';

// 获取受试者列表
const testeeList = getTesteeList();
// 返回格式: [{ id: '1', name: '受试者A' }, { id: '2', name: '受试者B' }]

// 设置受试者列表（会自动归一化数据）
setTesteeList([
  { id: 1, name: '受试者A' },
  { testeeid: 2, testee_name: '受试者B' },  // 支持多种字段名
  { childid: 3, name: '受试者C' }
]);

// 添加单个受试者
addTestee({ id: 4, name: '受试者D' });
```

### 当前选中的受试者

```javascript
import { 
  getSelectedTesteeId, 
  setSelectedTesteeId 
} from '@/store/userStore';

// 获取当前选中的受试者 ID
const selectedId = getSelectedTesteeId();

// 设置选中的受试者
setSelectedTesteeId('2');
```

### 订阅状态变化

```javascript
import { subscribeUserStore } from '@/store/userStore';

// 在组件中订阅状态变化
useEffect(() => {
  const unsubscribe = subscribeUserStore((state) => {
    console.log('UserStore 状态更新:', state);
    // state 包含: { userInfo, testeeList, selectedTesteeId }
  });
  
  return () => unsubscribe(); // 组件卸载时取消订阅
}, []);
```

### 重置 Store

```javascript
import { resetUserStore } from '@/store/userStore';

// 清空所有数据（登出时调用）
resetUserStore();
```

## 数据归一化

`userStore` 会自动归一化受试者数据，支持多种字段名：

| 原始字段 | 归一化后 |
|---------|---------|
| `id` / `testeeid` / `childid` | `id` (String) |
| `name` / `testee_name` | `name` (String) |

```javascript
// 输入
setTesteeList([
  { testeeid: 123, testee_name: '张三' },
  { childid: '456', name: '李四' }
]);

// 输出
getTesteeList();
// [
//   { id: '123', name: '张三' },
//   { id: '456', name: '李四' }
// ]
```

## 在页面中使用示例

### 示例 1: 显示当前用户和受试者

```javascript
import React, { useState, useEffect } from 'react';
import { View, Text } from '@tarojs/components';
import { 
  getUserInfo, 
  getTesteeList, 
  getSelectedTesteeId,
  subscribeUserStore 
} from '@/store/userStore';

function MyPage() {
  const [userInfo, setUserInfo] = useState(getUserInfo());
  const [testeeList, setTesteeList] = useState(getTesteeList());
  const [selectedId, setSelectedId] = useState(getSelectedTesteeId());
  
  useEffect(() => {
    // 订阅状态变化
    const unsubscribe = subscribeUserStore((state) => {
      setUserInfo(state.userInfo);
      setTesteeList(state.testeeList);
      setSelectedId(state.selectedTesteeId);
    });
    
    return unsubscribe;
  }, []);
  
  return (
    <View>
      <Text>当前用户: {userInfo?.name}</Text>
      <Text>受试者数量: {testeeList.length}</Text>
      <Text>当前选中: {selectedId}</Text>
    </View>
  );
}
```

### 示例 2: 切换受试者

```javascript
import React from 'react';
import { View } from '@tarojs/components';
import { AtRadio } from 'taro-ui';
import { 
  getTesteeList, 
  getSelectedTesteeId,
  setSelectedTesteeId 
} from '@/store/userStore';

function TesteeSelector() {
  const testeeList = getTesteeList();
  const selectedId = getSelectedTesteeId();
  
  const options = testeeList.map(testee => ({
    label: testee.name,
    value: testee.id
  }));
  
  const handleChange = (value) => {
    setSelectedTesteeId(value);
  };
  
  return (
    <View>
      <AtRadio
        options={options}
        value={selectedId}
        onClick={handleChange}
      />
    </View>
  );
}
```

### 示例 3: 手动刷新用户数据

```javascript
import { initUserStore } from '@/store/userStore';

async function refreshUserData() {
  try {
    const result = await initUserStore();
    console.log('刷新成功:', result);
    Taro.showToast({ title: '数据已更新', icon: 'success' });
  } catch (error) {
    console.error('刷新失败:', error);
    Taro.showToast({ title: '更新失败', icon: 'none' });
  }
}
```

## 注意事项

1. **初始化时机**
   - UserStore 在 `app.js` 的 `componentDidMount` 中自动初始化
   - 首次渲染时可能数据还未加载完成，需要处理空值情况

2. **订阅管理**
   - 使用 `subscribeUserStore` 时记得在组件卸载时取消订阅
   - 避免内存泄漏

3. **数据持久化**
   - 当前实现为内存存储，小程序关闭后数据会丢失
   - 如需持久化可结合 `Taro.setStorageSync` 使用

4. **错误处理**
   - 所有 API 调用失败都会被捕获，不会阻断应用运行
   - 查看控制台日志了解详细错误信息

## 调试技巧

### 查看当前状态

在控制台执行：

```javascript
import userStore from '@/store/userStore';

console.log('用户信息:', userStore.getUserInfo());
console.log('受试者列表:', userStore.getTesteeList());
console.log('当前选中:', userStore.getSelectedTesteeId());
```

### 开启详细日志

UserStore 已内置详细日志，查看控制台即可：

```
[UserStore] 用户信息加载成功: { id: '123', name: '张三' }
[UserStore] 受试者列表加载成功，共 3 个
[App] UserStore 初始化完成: { userInfo: {...}, testeeList: [...], selectedTesteeId: '1' }
```

## 相关接口

UserStore 依赖以下后端接口：

- `GET /user/info` - 获取当前用户信息
- `GET /user/childlist` - 获取受试者列表

确保后端接口已正确配置并返回预期格式的数据。
