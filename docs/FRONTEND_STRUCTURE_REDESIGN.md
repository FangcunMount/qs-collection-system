# Frontend Structure Redesign

> Route migration report:
> `docs/FRONTEND_ROUTE_MIGRATION_REPORT.md`

## Goal

重新梳理 `qs-collection-system` 的前端目录结构、页面路径和命名规则，解决当前项目中这几个长期问题：

- 路由路径和实际业务实体不一致
- `pages/` 目录同时承担“路由入口”和“业务实现”两种职责
- 公共层被拆成 `src/components`、`src/pages/common`、各业务域 `shared/` 多套结构
- 组件反向依赖页面目录，导致边界混乱
- 历史遗留目录和空目录较多，阅读成本偏高

这份方案的目标不是引入复杂框架，而是把现有 Taro 项目整理成一套更稳定的“按业务域组织”的结构。

## Current Diagnosis

### 1. Route names do not match real business meaning

当前几个核心页面的路径和它们实际做的事并不一致：

- `src/pages/questionnaire/list/index.jsx`
  - 页面实际调用的是 `getScales()`，展示的是“量表列表”，不是问卷列表
- `src/pages/questionnaire/fill/index.jsx`
  - 页面实际做了入口解析、档案选择、问卷加载、提交答卷、等待报告等完整测评流程
  - 这个页面的业务语义更接近“开始一次测评”，而不是单纯“填写问卷”
- `src/pages/answersheet/list/index.jsx`
  - 页面实际围绕 `getAssessments()` 组织，展示的是“测评记录”，不是原始答卷列表
- `src/pages/analysis/index.jsx`
  - 页面实际获取的是 `getAssessmentReport()`，它是“测评报告页”，不是泛化的 analysis 页面
- `src/pages/analysis/trend/index.jsx`
  - 页面是“报告趋势页”，但路径没有体现 report / assessment 语义

结论：

- 当前路径更多是“技术实现名”或“历史命名”，不是“稳定的业务路由名”
- 路由名混用了 `questionnaire / answersheet / analysis / assessment / testee / user`

### 2. `pages/` contains too much implementation

当前 `src/pages` 下不只是路由入口，还混入了大量业务实现代码：

- `src/pages/analysis/widget/*`
- `src/pages/questionnaire/fill/components/*`
- `src/pages/questionnaire/fill/weight/*`
- `src/pages/answersheet/list/widget/*`
- `src/pages/common/*`

结果是：

- 页面目录越来越重
- 相同业务域的代码被分散到多个 page 子目录
- 页面一旦改路径，就会牵动大量实现文件

### 3. Shared layers are split into multiple competing locations

当前“公共层”至少有三套：

- `src/components/*`
- `src/pages/common/*`
- `src/pages/<domain>/shared/*`

但实际使用并不统一：

- `src/pages/common/*` 里有 loading、empty、utils、hooks
- `src/components/common/*` 里又有 `SearchBox`、`ScaleCard`、`RiskTag`、`StatusTag`
- `src/pages/questionnaire/shared/*`、`src/pages/testee/shared/*`、`src/pages/answersheet/shared/*` 目前几乎没有形成有效层次

结论：

- `common` 和 `shared` 的边界没有定义
- 很多所谓的公共代码，其实应该归到业务域

### 4. There are reverse dependencies from generic components to page-local code

目前有一类明显的反向依赖：

- `src/components/question/*`
  - 依赖 `src/pages/questionnaire/shared/utils.js`

这意味着：

- 一个通用题型组件，竟然依赖某个 page 目录下的逻辑
- 业务边界是倒置的

正确方向应该是：

- 页面依赖领域模块
- 领域模块依赖共享层
- 共享层不能依赖页面层

### 5. Naming is inconsistent

当前目录中存在一批不稳定命名：

- `home/index/index`
- `system/error/errpage.jsx`
- `questionnaire/fill/weight/*`
- `user/profile` 与 `testee/list` 并列，但二者不是同一层业务概念
- `analysis` 和 `answersheet` 是结果视角命名，`questionnaire` 和 `testee` 是实体视角命名

这会让人很难直接回答这些问题：

- 这个页面属于哪个业务域？
- 这个组件是跨页面复用，还是页面私有？
- 这个路径是用户功能入口，还是后端资源名？

### 6. Historical leftovers still affect readability

项目里当前还能看到这些历史痕迹：

- 旧 `pages/*` 迁移后遗留过一批空目录和中间层文件，这一轮已完成物理清理
- 当前仍需持续关注的历史问题：
  - `services/api/*` 内部实现文件名仍保留部分后端资源命名
  - `store/*` 仍是底层实现目录，需要继续避免业务代码直接依赖
- `@/*` 已经成为业务代码默认导入方式，深层相对路径只应保留在少量局部文件关系中

## Domain Model Recommendation

在结构调整前，需要先统一前端业务词汇：

- `scale`
  - 量表目录、量表选择入口
- `questionnaire`
  - 问卷定义和题目结构
- `assessment`
  - 一次测评流程及其结果，是用户真正感知到的业务主线
- `answersheet`
  - 原始作答快照，属于 assessment 的子资源，不应作为一级页面主命名
- `testee`
  - 受测档案
- `account`
  - 当前登录用户、订阅、账号设置

基于这个模型，建议以后页面路由优先按“用户能力”命名，而不是按后端资源名命名。

## Design Principles

### 1. `pages/` only holds route entries

`src/pages` 只保留路由入口文件和 page config，不再承载大量业务实现。

页面入口职责应该只有：

- 读取路由参数
- 组合页面级 provider / layout
- 引用对应业务模块的 page component

### 2. Organize by business domain first

优先按业务域拆结构，而不是继续按“全部组件 / 全部 hooks / 全部 utils”横切。

推荐域：

- `assessment`
- `catalog`
- `questionnaire`
- `testee`
- `account`
- `entry`

### 3. Keep one shared layer only

通用层只保留一套：`src/shared/*`

它只放：

- 通用 UI
- 通用 lib
- 请求基础设施
- 全局 store
- 配置和路由常量

### 4. Generic code cannot depend on pages

禁止出现这类依赖：

- `src/components/* -> src/pages/*`
- `src/shared/* -> src/pages/*`

页面层必须是依赖最外层。

### 5. Route names should reflect user-facing capability

路由要让人一眼看出这是“什么页面”，而不是“底层返回了什么资源”。

例如：

- 不用 `answersheet/list`
- 用 `assessment/records`

## Target Route Layout

建议把页面路径调整为下面这套结构。

### Main package

主包保留高频入口和首屏关键链路：

```text
pages/tab/home/index
pages/tab/scales/index
pages/assessment/fill/index
pages/tab/me/index
pages/system/error/index
```

解释：

- `home`、`scales`、`me` 是底部导航入口，应该在主包
- `assessment/fill` 是扫码、分享、直接入口的高频首链路，建议保留在主包
- 错误页也建议保留在主包，避免异常兜底时再跨包

### Subpackages

#### assessment package

```text
pages/assessment/records/index
pages/assessment/response/index
pages/assessment/report/index
pages/assessment/report-trend/index
pages/assessment/report-pending/index
```

#### account package

```text
pages/account/register/index
pages/account/subscription/index
```

#### testees package

```text
pages/testees/list/index
pages/testees/create/index
pages/testees/edit/index
```

## Route Mapping

| Current route | Proposed route | Reason |
| --- | --- | --- |
| `/pages/home/index/index` | `/pages/tab/home/index` | 首页属于 tab，不需要双层 `index/index` |
| `/pages/questionnaire/list/index` | `/pages/tab/scales/index` | 实际展示的是量表目录，不是问卷目录 |
| `/pages/questionnaire/fill/index` | `/pages/assessment/fill/index` | 页面承载的是完整测评流程，不只是问卷填写 |
| `/pages/answersheet/list/index` | `/pages/assessment/records/index` | 页面展示的是测评记录，不是原始答卷资源列表 |
| `/pages/answersheet/detail/index` | `/pages/assessment/response/index` | 这是测评下的原始作答详情 |
| `/pages/analysis/index` | `/pages/assessment/report/index` | 页面实际是测评报告页 |
| `/pages/analysis/trend/index` | `/pages/assessment/report-trend/index` | 页面实际是报告趋势页 |
| `/pages/analysis/wait/index` | `/pages/assessment/report-pending/index` | 页面实际是等待报告生成页 |
| `/pages/user/profile/index` | `/pages/tab/me/index` | 这是底部导航“我的”页，不是通用 profile 模块 |
| `/pages/user/register/index` | `/pages/account/register/index` | 属于账号域，不属于 me tab |
| `/pages/user/subscription/index` | `/pages/account/subscription/index` | 属于账号订阅设置 |
| `/pages/testee/list/index` | `/pages/testees/list/index` | 统一实体命名，使用复数列表 |
| `/pages/testee/register/index` | `/pages/testees/create/index` | 页面动作是创建档案，不是 register 用户 |
| `/pages/testee/editor/index` | `/pages/testees/edit/index` | 页面动作是编辑档案 |
| `/pages/system/error/errpage` | `/pages/system/error/index` | 去掉历史残留命名 `errpage` |

## Target Source Tree

推荐采用“route entry + domain module + shared”三层结构。

```text
src/
  app.js
  app.config.js

  pages/
    tab/
      home/
        index.jsx
        index.config.js
      scales/
        index.jsx
        index.config.js
      me/
        index.jsx
        index.config.js
    assessment/
      fill/
        index.jsx
        index.config.js
      records/
        index.jsx
        index.config.js
      response/
        index.jsx
        index.config.js
      report/
        index.jsx
        index.config.js
      report-trend/
        index.jsx
        index.config.js
      report-pending/
        index.jsx
        index.config.js
    account/
      register/
        index.jsx
        index.config.js
      subscription/
        index.jsx
        index.config.js
    testees/
      list/
        index.jsx
        index.config.js
      create/
        index.jsx
        index.config.js
      edit/
        index.jsx
        index.config.js
    system/
      error/
        index.jsx
        index.config.js

  modules/
    assessment/
      api/
        assessmentApi.js
        reportApi.js
      pages/
        AssessmentFillPage.jsx
        AssessmentRecordsPage.jsx
        AssessmentResponsePage.jsx
        AssessmentReportPage.jsx
        AssessmentReportTrendPage.jsx
        AssessmentReportPendingPage.jsx
      components/
        ReportTrendChart.jsx
        RiskTimeline.jsx
        RecordCard.jsx
      hooks/
      lib/
        routeParsers.js
        assessmentMappers.js
    catalog/
      api/
        scaleApi.js
      pages/
        ScaleCatalogPage.jsx
      components/
      hooks/
    questionnaire/
      components/
        QuestionRenderer.jsx
        QuestionnaireForm.jsx
        SinglePageQuestionnaire.jsx
      lib/
        questionUtils.js
        answerMappers.js
    testee/
      api/
        testeeApi.js
      pages/
        TesteeListPage.jsx
        TesteeCreatePage.jsx
        TesteeEditPage.jsx
      components/
      hooks/
    account/
      api/
        accountApi.js
      pages/
        AccountRegisterPage.jsx
        AccountProfilePage.jsx
        AccountSubscriptionPage.jsx
    entry/
      lib/
        resolveEntryParams.js
        scanEntry.js
      hooks/

  shared/
    api/
      request.js
      hosts.js
    config/
      routes.js
    stores/
      userStore.ts
      testeeStore.ts
      tokenStore.ts
      entryContextStore.ts
    ui/
      BottomTabBar/
      EmptyState/
      LoadingState/
      PageContainer/
      PrivacyAuthorization/
      RiskTag/
      ScaleCard/
      SearchBox/
      StatusTag/
    lib/
      date/
      logger/
      query/
      taro/
      wechat/
```

## File Responsibility Rules

### `src/pages/*`

只做 route entry，不写复杂业务逻辑。

例如：

- 读路由参数
- 引入对应 `modules/*/pages/*`
- 设置 page config

### `src/modules/*`

每个业务域自己的页面实现、组件、hooks、数据转换和局部 API 都放这里。

### `src/shared/*`

只放跨业务域复用的基础能力。

以下内容才能进入 `shared`：

- 不依赖具体业务域的 UI
- 不依赖具体页面路径
- 不依赖单一业务实体

## Naming Rules

### Route and folder naming

- 路由目录统一用 kebab-case
- 一级目录表达业务域，二级目录表达页面能力
- 避免 `index/index/index` 这种重复语义
- 避免 `errpage`、`weight`、`widget` 这种历史或含糊命名

### Suggested replacements

- `widget` -> `components`
- `weight` -> `components` 或 `flows`
- `common` -> `shared`
- `user` -> `account`
- `analysis` -> `assessment/report`
- `answersheet` -> `assessment/response` 或 `assessment/records`

### Import rules

- 统一使用 `@/` 路径别名
- 禁止 4 层以上相对路径导入
- 禁止 `shared` 依赖 `pages`

## `app.config.js` target shape

建议最终将 `src/app.config.js` 收敛为类似下面的结构：

```js
export default {
  pages: [
    "pages/tab/home/index",
    "pages/tab/scales/index",
    "pages/assessment/fill/index",
    "pages/tab/me/index",
    "pages/system/error/index",
  ],
  subPackages: [
    {
      root: "pages/assessment",
      name: "assessment",
      pages: [
        "records/index",
        "response/index",
        "report/index",
        "report-trend/index",
        "report-pending/index",
      ],
    },
    {
      root: "pages/account",
      name: "account",
      pages: [
        "register/index",
        "subscription/index",
      ],
    },
    {
      root: "pages/testees",
      name: "testees",
      pages: [
        "list/index",
        "create/index",
        "edit/index",
      ],
    },
  ],
};
```

## Migration Strategy

不要一次性做“大搬家”。建议按下面顺序迁移。

### Phase 1: stabilize routing

已完成：

- 新增 `src/shared/config/routes.js`
- 路由入口统一切到 `tab/*`、`assessment/*`、`account/*`、`testees/*`
- assessment 主链路不再依赖旧 page path

### Phase 2: extract business modules and clear compatibility layers

已完成：

- `assessment` 主链路已落到 `src/modules/assessment/*`
- 问卷渲染落到 `src/modules/questionnaire/*`
- account/testee 注册与编辑组件已落到各自业务域
- 删除兼容层 `src/services/index.js`
- 删除 `src/util/*`，能力改由 `src/shared/*`、`src/services/auth/*`、`src/modules/assessment/lib/*` 承接
- 删除旧 `src/components/register/*`、`src/components/testeeEditor/*`、`src/components/needDialog.jsx`

### Phase 3: reduce remaining historical coupling

已完成当前轮目标：

- 新增 `src/shared/stores/{account,testees,session,assessmentEntry}.js`，业务代码不再直接依赖 `src/store/*`
- 新增 `src/services/api/{account,testees,scales,questionnaires,assessmentSubmissions,assessmentEntries,miniProgramEntries,assessments,assessmentReports,assessmentResponses,auth}.js`
- app、services、modules 已切到新的 shared store / api facade
- `@/*` 别名已配置到 Taro 构建，主要业务代码中的深层相对路径已清理

下一轮若继续推进，建议做：

- 逐步重命名 `src/services/api/*` 的底层实现文件，让文件名也与前端业务词汇对齐
- 评估是否将 `src/store/*` 下沉到 `src/shared/stores/internal/*`，进一步避免被误用
- 继续压缩残余的实现层 re-export，减少 facade 与底层实现之间的历史映射成本

## First Refactor Slice Recommendation

如果只做一轮最值当的重构，建议先做这四件事：

1. 建立 `src/shared/config/routes.js`，把所有路由字符串收口
2. 把 `questionnaire/fill`、`analysis`、`answersheet` 三块合并成 `assessment` 业务域
3. 把 `src/pages/common/*` 与 `src/components/common/*` 合并到 `src/shared/*`
4. 把 `src/components/question/* -> src/pages/questionnaire/shared/utils.js` 这类反向依赖拆掉

这样做之后，后续再改页面路径，风险会小很多。

## Final Recommendation

这个项目现在最适合的不是继续补丁式整理 `pages/*`，而是：

- 用“业务域”重新定义代码边界
- 让 `pages/` 退回到“纯路由入口层”
- 用 `assessment` 作为主业务域，把 `questionnaire + answersheet + analysis` 合并回同一条业务主线
- 用 `shared` 取代当前分裂的 `common/shared/components` 多套公共层

简单说：

- 路由要按用户能力命名
- 代码要按业务域组织
- 页面目录不要再承担业务实现层
