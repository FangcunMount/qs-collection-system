# 问卷收集系统 (qs-collection-system)

面向医疗咨询场景的问卷收集小程序，覆盖问卷发放、答卷填写、历史查询与分析评估全流程。

## 功能特性
- 问卷加载与填写：支持多种题型（单选、多选、评分、图片等）并校验必填项。
- 答卷管理：查看历史答卷、展示测评结果、支持从渠道入口跳转。
- 数据分析：输出问卷统计与分析页面，辅助咨询师评估。
- 用户与渠道：支持被测者注册、咨询师管理、渠道参数解析与埋点。
- 文件上传：集成 OSS 签名、文件回调及隐私授权流程。

## 软件架构
- 前端框架：Taro 3 + React，统一小程序多端开发方案。
- 组件体系：taro-ui、taro-ui-fc 以及自定义业务组件（问卷题型、页面容器、隐私授权）。
- 服务层：`src/services/servers.js` 封装请求、鉴权与全局 Loading；`src/services/api/` 按领域划分业务接口。
- 工具层：`src/util/` 提供 URL 构造、场景解析、环境检测、日志等通用能力。

## 快速开始
### 依赖检查
- Node.js 版本建议 ≥ 12.x。
- 全局安装 Taro CLI（如需命令行构建）：`npm install -g @tarojs/cli@3.0.21`。
- 项目依赖：执行 `npm install` 安装 `package.json` 中列出的运行与开发依赖。

### 构建
```bash
npm run build:weapp       # 构建微信小程序产物
# 其他端：npm run build:<platform>，如 swan / alipay / tt / h5 等
```

### 运行
```bash
npm run dev:weapp         # 微信小程序实时编译
# 其他端：npm run dev:<platform>
```
构建完成后，使用微信开发者工具或 Taro 小程序开发工具导入 `dist` 目录进行调试。

## 使用指南
1. 依据项目需求在 `src/config.js` 中配置域名、token、wxshopid 等信息。
2. 通过 `src/config/from.js` 定义渠道入参校验规则。
3. 若需要 OSS 上传，确认接口 `getOSSSignature` / `saveUploadFile` 与后端配置一致。
4. 页面入口与路由在 `src/app.config.js` 中维护，可按需增删页面。
5. 若扩展问卷题型，请在 `src/components/question/` 目录新增组件并在问卷渲染逻辑中注册。

## 如何贡献
- Fork 本仓库并创建特性分支（命名建议 `feature/<name>` 或 `fix/<issue>`）。
- 保持代码风格一致，必要时补充注释或单元测试。
- 提交 PR 前使用微信开发者工具或相关命令验证功能可用。
- 在 PR 描述中说明改动内容、影响范围及测试情况。

## 社区
- 如需讨论或反馈，请通过团队内部协作工具（如企业微信、飞书等）联系项目维护者。

## 许可证
- 本项目为内部项目，默认遵循公司内部使用授权。如需开源协议或对外授权，请联系项目负责人。
