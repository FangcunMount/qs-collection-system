# 问卷收集系统 (qs-collection-system)

智能问卷收集平台，为科研、教育、企业、心理健康等领域提供专业的数据收集与分析服务。

## 功能特性

- **问卷加载与填写**：支持多种题型（单选、多选、评分、图片等）并校验必填项
- **答卷管理**：查看历史答卷、展示测评结果、支持从渠道入口跳转
- **数据分析**：输出问卷统计与分析页面，辅助数据评估
- **用户与渠道**：支持被测者注册、管理员管理、渠道参数解析与埋点
- **文件上传**：集成 OSS 签名、文件回调及隐私授权流程
- **全屏切换**：Home 页面支持全屏滑动切换，展示产品核心功能和应用场景

## 软件架构

- **前端框架**：Taro 3.6.25 + React 18，统一小程序多端开发方案
- **组件体系**：taro-ui、taro-ui-fc 以及自定义业务组件（问卷题型、页面容器、隐私授权）
- **服务层**：`src/services/servers.js` 封装请求、鉴权与全局 Loading；`src/services/api/` 按领域划分业务接口
- **工具层**：`src/util/` 提供 URL 构造、场景解析、环境检测、日志等通用能力

## 快速开始

### 环境要求

⚠️ **重要**：本项目对 Node.js 版本有严格要求

- **Node.js**：`>=14.0.0 <17.0.0`（推荐使用 `v16.20.2`）
- **npm**：`>=6.0.0`
- **推荐使用 nvm 管理 Node.js 版本**

### 使用 nvm 设置正确的 Node.js 版本

```bash
# 安装 nvm（如果尚未安装）
# macOS/Linux: https://github.com/nvm-sh/nvm

# 安装并使用 Node.js 16
nvm install 16
nvm use 16

# 设置为默认版本
nvm alias default 16

# 验证版本
node -v  # 应显示 v16.x.x
npm -v   # 应显示 8.x.x
```

### 安装依赖

```bash
# 确保使用 Node.js 16
node -v

# 安装项目依赖
npm install

# 如遇到安装错误，尝试清理后重新安装
rm -rf node_modules package-lock.json
npm install
```

### 构建

```bash
# 构建微信小程序
npm run build:weapp

# 构建其他平台
# npm run build:swan      # 百度小程序
# npm run build:alipay    # 支付宝小程序
# npm run build:tt        # 字节跳动小程序
# npm run build:h5        # H5
```

### 开发模式

```bash
# 微信小程序开发模式（支持热更新）
npm run dev:weapp

# 其他平台开发模式
# npm run dev:swan
# npm run dev:alipay
# npm run dev:tt
# npm run dev:h5
```

构建完成后，使用微信开发者工具导入 `dist` 目录进行调试。

## 常见问题

### 1. 构建时出现 `error:0308010C:digital envelope routines::unsupported` 错误

**原因**：使用了 Node.js 17+ 版本，与项目依赖不兼容。

**解决方案**：
```bash
nvm use 16
npm run build:weapp
```

### 2. 出现 `webpack-chain` 相关错误

**原因**：依赖版本不兼容或 Node.js 版本不正确。

**解决方案**：
```bash
# 1. 确保使用 Node.js 16
nvm use 16

# 2. 清理并重新安装依赖
rm -rf node_modules package-lock.json
npm install

# 3. 重新构建
npm run build:weapp
```

### 3. npm audit 显示安全警告

**说明**：项目依赖的某些包存在已知漏洞，这是由于使用了旧版本的 Taro 3.6.25。

**建议**：

- **不要**运行 `npm audit fix --force`，这会破坏依赖兼容性
- 这些警告不影响开发和生产环境的正常使用
- 如需修复，请升级到 Taro 4.x（需要大量代码改动）

## 使用指南

1. **配置信息**：在 `src/config.js` 中配置域名、token、wxshopid 等信息
2. **OSS 上传**：确认接口 `getOSSSignature` / `saveUploadFile` 与后端配置一致
3. **路由管理**：页面入口与路由在 `src/app.config.js` 中维护，可按需增删页面
4. **扩展题型**：在 `src/components/question/` 目录新增组件并在问卷渲染逻辑中注册
5. **Home 页面**：首页采用三屏全屏切换设计，可通过滑动或滚轮切换屏幕

## 如何贡献

- Fork 本仓库并创建特性分支（命名建议 `feature/<name>` 或 `fix/<issue>`）。
- 保持代码风格一致，必要时补充注释或单元测试。
- 提交 PR 前使用微信开发者工具或相关命令验证功能可用。
- 在 PR 描述中说明改动内容、影响范围及测试情况。

## 社区

- 如需讨论或反馈，请通过团队内部协作工具（如企业微信、飞书等）联系项目维护者。

## 许可证

- 本项目为内部项目，默认遵循公司内部使用授权。如需开源协议或对外授权，请联系项目负责人。
