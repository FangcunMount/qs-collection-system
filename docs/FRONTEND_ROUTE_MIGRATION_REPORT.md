# Frontend Route Migration Report

## 1. Purpose

这份报告用于说明 `qs-collection-system` 本次大规模前端重构后的**路由变化**，重点服务于两个场景：

- 仓库内后续开发需要统一使用新的路由命名
- 其他项目、扫码入口、跳转中台、分享链接生成器需要把旧路径批量更新为新路径

这份文档关注的是**最终已落地结果**，不是早期重构草案。

## 2. Executive Summary

本次重构对前端路由做了三件关键事情：

1. 将历史上按后端资源或旧实现命名的路径，统一改成按用户能力和业务语义命名。
2. 不保留旧运行时路径，不做新旧双栈兼容。旧路径在当前项目中已经退场。
3. 新增统一路由源：`src/shared/config/routes.js`。后续所有代码和外部集成都应以这里的路径为准。

这意味着：

- 如果其他项目还在跳旧路径，必须更新，否则会直接失效。
- 本次变更中，**绝大多数 query 参数语义保持不变**，主要变化是 path。
- 路由入口层已经收敛到 `src/pages/*`，业务实现迁到了 `src/modules/*`，所以以后再调整页面实现，不应该再影响外部路径。

## 3. Source of Truth

当前路由的两个权威来源如下：

- 页面注册清单：`src/app.config.js`
- 页面路径常量与 query builder：`src/shared/config/routes.js`

补充说明：

- `app.config.js` 里的路径写法没有前导 `/`，例如 `pages/tab/home/index`
- 运行时跳转路径、外部集成路径应使用带前导 `/` 的形式，例如 `/pages/tab/home/index`

## 4. Final Route Inventory

### 4.1 Main Pages

当前已注册的主路由如下：

- `/pages/tab/home/index`
- `/pages/tab/scales/index`
- `/pages/assessment/fill/index`
- `/pages/assessment/records/index`
- `/pages/assessment/response/index`
- `/pages/assessment/report/index`
- `/pages/assessment/report-trend/index`
- `/pages/assessment/report-pending/index`
- `/pages/tab/me/index`
- `/pages/system/error/index`

### 4.2 Subpackages

当前分包只有两组：

- `pages/account/*`
  - `/pages/account/register/index`
  - `/pages/account/subscription/index`
- `pages/testees/*`
  - `/pages/testees/list/index`
  - `/pages/testees/create/index`
  - `/pages/testees/edit/index`

说明：

- 早期方案里曾考虑把部分 assessment 页面放进 subpackage，但**当前实际落地结果**是 assessment 页面仍在主包。
- 其他项目如果只关心路径替换，应以本节清单为准，不要再引用旧方案中的包划分描述。

## 5. Old to New Route Mapping

下表是本次最重要的迁移信息。

| Old path | New path | Route builder | Main query params | Notes |
| --- | --- | --- | --- | --- |
| `/pages/home/index/index` | `/pages/tab/home/index` | `routes.tabHome()` | 无 | 首页路由收口到 `tab/home` |
| `/pages/questionnaire/list/index` | `/pages/tab/scales/index` | `routes.tabScales(params)` | `keyword` `category` | 实际业务是量表目录，不再叫 questionnaire list |
| `/pages/questionnaire/fill/index` | `/pages/assessment/fill/index` | `routes.assessmentFill(params)` | `q` `scene` `token` `t` `signid` `task_id` `sp` | 测评入口页，支持直达、扫码、入口 token |
| `/pages/answersheet/list/index` | `/pages/assessment/records/index` | `routes.assessmentRecords()` | 无 | 展示的是测评记录，不是 raw answersheet list |
| `/pages/answersheet/detail/index` | `/pages/assessment/response/index` | `routes.assessmentResponse(params)` | `a` `task_id` | `a` 为 answersheet id |
| `/pages/analysis/index` | `/pages/assessment/report/index` | `routes.assessmentReport(params)` | `a` 或 `aid` 或 `rid`，以及 `t` `task_id` | 报告页兼容按 answersheet 或 assessment 打开 |
| `/pages/analysis/trend/index` | `/pages/assessment/report-trend/index` | `routes.assessmentReportTrend(params)` | `aid` `t` | 趋势页需要 assessment id 和 testee id |
| `/pages/analysis/wait/index` | `/pages/assessment/report-pending/index` | `routes.assessmentReportPending(params)` | `a` `aid` `t` `task_id` | 等待报告生成页 |
| `/pages/user/profile/index` | `/pages/tab/me/index` | `routes.tabMe()` | 无 | 底部导航“我的”页 |
| `/pages/user/register/index` | `/pages/account/register/index` | `routes.accountRegister(params)` | `submitClose` `goUrl` `goParams` | 用户注册页 |
| `/pages/user/subscription/index` | `/pages/account/subscription/index` | `routes.accountSubscription()` | 无 | 订阅设置页 |
| `/pages/testee/list/index` | `/pages/testees/list/index` | `routes.testeeList()` | 无 | 命名统一为复数实体 |
| `/pages/testee/register/index` | `/pages/testees/create/index` | `routes.testeeCreate(params)` | `submitClose` `goUrl` `goParams` | 新建档案页 |
| `/pages/testee/editor/index` | `/pages/testees/edit/index` | `routes.testeeEdit(params)` | `testeeId` | 编辑档案页 |
| `/pages/system/error/errpage` | `/pages/system/error/index` | `routes.systemError(params)` | `title` `text` `desc` `buttonText` `buttonUrl` | 历史 errpage 命名已删除 |

## 6. Route Builder Mapping

为了避免其他项目继续手写 path，本项目已经把官方路由 builder 固定在 `src/shared/config/routes.js`。

当前 builder 列表如下：

```js
routes.tabHome()
routes.tabScales(params)
routes.tabMe()
routes.assessmentFill(params)
routes.assessmentRecords()
routes.assessmentResponse(params)
routes.assessmentReport(params)
routes.assessmentReportTrend(params)
routes.assessmentReportPending(params)
routes.accountRegister(params)
routes.accountSubscription()
routes.testeeList()
routes.testeeCreate(params)
routes.testeeEdit(params)
routes.systemError(params)
```

如果其他项目也维护一套路由常量，建议直接对齐成同一组命名。

## 7. Query Compatibility Notes

本次重构中，**query 参数名大体保持原样**，所以多数外部调用只需要改 path，不需要改参数字段名。

### 7.1 Assessment Fill

`/pages/assessment/fill/index`

常见参数：

- `q`
  - 量表/问卷编码，普通直达入口最常见
- `scene`
  - 小程序扫码场景串
- `token`
  - 入口 token；支持 assessment entry token
- `t`
  - testee id，预选档案
- `signid`
  - 订阅相关参数
- `task_id`
  - 任务链路参数
- `sp`
  - 单页模式开关，兼容旧入口时仍可能出现

示例：

```text
/pages/assessment/fill/index?q=SNAP_IV
/pages/assessment/fill/index?scene=xxx
/pages/assessment/fill/index?token=ae_xxx
```

### 7.2 Assessment Response

`/pages/assessment/response/index`

常见参数：

- `a`
  - answersheet id
- `task_id`
  - 任务链路参数

示例：

```text
/pages/assessment/response/index?a=12345
```

### 7.3 Assessment Report

`/pages/assessment/report/index`

常见参数：

- `a`
  - answersheet id
- `aid`
  - assessment id
- `rid`
  - 兼容旧报告打开方式时仍可使用，内部会按 assessment 处理
- `t`
  - testee id
- `task_id`
  - 任务链路参数

示例：

```text
/pages/assessment/report/index?a=12345
/pages/assessment/report/index?aid=67890&t=333
```

### 7.4 Assessment Report Trend

`/pages/assessment/report-trend/index`

常见参数：

- `aid`
  - assessment id
- `t`
  - testee id

示例：

```text
/pages/assessment/report-trend/index?aid=67890&t=333
```

### 7.5 Assessment Report Pending

`/pages/assessment/report-pending/index`

常见参数：

- `a`
  - answersheet id
- `aid`
  - assessment id，可选
- `t`
  - testee id，可选
- `task_id`
  - 任务链路参数

示例：

```text
/pages/assessment/report-pending/index?a=12345
```

### 7.6 Catalog / Register / Testee / Error

`/pages/tab/scales/index`

- `keyword`
- `category`

`/pages/account/register/index`

- `submitClose`
- `goUrl`
- `goParams`

`/pages/testees/create/index`

- `submitClose`
- `goUrl`
- `goParams`

`/pages/testees/edit/index`

- `testeeId`

`/pages/system/error/index`

- `title`
- `text`
- `desc`
- `buttonText`
- `buttonUrl`

## 8. Special Migration Risks

其他项目更新路径时，最容易漏掉的是下面几类情况：

### 8.1 Nested URLs inside query params

`account/register`、`testees/create`、`system/error` 这些页面本身会携带另一个页面地址作为 query 值。

重点字段：

- `goUrl`
- `buttonUrl`

这意味着：

- 不仅页面主路径要更新
- 作为参数传进去的“回跳地址”也必须改成新路径

例如旧写法：

```text
/pages/user/register/index?goUrl=/pages/answersheet/list/index&goParams={}
```

必须改成：

```text
/pages/account/register/index?goUrl=/pages/assessment/records/index&goParams={}
```

### 8.2 Scan / share / task links

扫码、分享、任务系统里如果仍然写着以下旧路径，也必须更新：

- `/pages/questionnaire/fill/index`
- `/pages/analysis/index`
- `/pages/analysis/trend/index`
- `/pages/analysis/wait/index`

这些入口的 query 参数名多数不变，但 path 必须切换。

### 8.3 No legacy compatibility

当前项目没有保留旧页面作为跳转壳，也没有做老路径转发页。

结论：

- 旧路径不会自动跳到新路径
- 其他项目不能指望运行时兼容

## 9. Machine-readable Mapping

如果其他项目要批量更新配置，可以直接使用下面这份映射表：

```json
{
  "/pages/home/index/index": "/pages/tab/home/index",
  "/pages/questionnaire/list/index": "/pages/tab/scales/index",
  "/pages/questionnaire/fill/index": "/pages/assessment/fill/index",
  "/pages/answersheet/list/index": "/pages/assessment/records/index",
  "/pages/answersheet/detail/index": "/pages/assessment/response/index",
  "/pages/analysis/index": "/pages/assessment/report/index",
  "/pages/analysis/trend/index": "/pages/assessment/report-trend/index",
  "/pages/analysis/wait/index": "/pages/assessment/report-pending/index",
  "/pages/user/profile/index": "/pages/tab/me/index",
  "/pages/user/register/index": "/pages/account/register/index",
  "/pages/user/subscription/index": "/pages/account/subscription/index",
  "/pages/testee/list/index": "/pages/testees/list/index",
  "/pages/testee/register/index": "/pages/testees/create/index",
  "/pages/testee/editor/index": "/pages/testees/edit/index",
  "/pages/system/error/errpage": "/pages/system/error/index"
}
```

## 10. Recommended External Update Checklist

建议其他项目按下面顺序更新：

1. 替换所有硬编码页面路径。
2. 替换所有路由常量或 enum。
3. 检查 `goUrl`、`buttonUrl` 这类“路径作为参数”的字段。
4. 检查扫码配置、分享链接生成配置、跳转白名单、任务中心回跳配置。
5. 检查文档、测试用例、埋点配置中的旧路径。
6. 重新验证以下主链路：
   - 首页 -> 专业精选/量表目录 -> 测评填写
   - 填写 -> 等待报告 -> 报告/答卷详情
   - 报告 -> 趋势
   - 我的 -> 档案 -> 记录

## 11. Verification Status

本项目已完成以下核对：

- 当前 `src/app.config.js` 只注册新路径
- 当前 `src/pages/*` 目录只保留新结构下的路由入口
- 当前 `src/shared/config/routes.js` 已成为统一路由常量源
- 在 `src` 下检索旧路径字符串，除历史文档外，业务代码中已不再使用旧路径

## 12. Conclusion

如果你要把这次重构结果同步到其他项目，最重要的结论只有三条：

1. **旧路径全部作废，不能继续使用。**
2. **大多数 query 参数不用改，主要改 path。**
3. **以后以 `src/shared/config/routes.js` 这一套命名作为唯一标准。**

