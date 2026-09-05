# AI 解读：小程序接入分析与前端设计

日期：2026-09-05。状态：设计已批准，前端已实施，本地验证已完成（保留已有资产门禁问题）。原分析章节为实施前快照；本文不是生产验收记录。

## 结论

采用“标准报告页内入口卡片 + 独立 AI 解读详情页”。沿用 assessment 模块与 Qlume 组件体系，新增独立 AI 状态控制器，不复用标准报告的生成状态机。首版 locale 固定 zh-CN、focus_areas 固定空数组；用户主动请求，页面进入、显示和刷新均不自动 POST。

用户看到的名称是“AI 补充解读”，避免“AI 测评”造成重新计分、重新诊断的误解。AI 不影响标准报告加载、问卷提交和计划任务完成。

## P. 代码分析报告

本节保留实施前的分析快照，当前实现与验证结果见第 9 节。

### 分析目标

核对当前报告阅读链能否接入 Participant AI Explanation，确定页面、接口、状态、恢复与展示边界，再给出最小可实施设计。

### 分析范围

- 前端：页面路由、assessment 报告页、ViewModel、报告等待、通用 request、会话与本地存储、UI 规范及测试。
- 后端事实源：qs-server 的 Collection REST handler、AI BFF/port、Participant application、标准报告 DTO。
- 未验证：线上开关和 Profile、真实模型调用、微信真机、后台恢复与包体。本轮不修改业务代码、不启用用户流量。

### 入口与调用路径

```text
pages/assessment/report/index.tsx
 → AssessmentReportPage
 → loadMedicalReportByAssessmentId / loadMedicalReportByAnswerSheet
 → report-status → /assessments/{id}/report
 → buildMedicalReportViewModel
 → ReportPageShell + Overview + TrendSummary + Content
```

AssessmentReportPage 同时承载医学和行为能力报告，人格报告被转到独立页面。页面已有 assessmentContext.assessmentId/testeeId；AI 必须使用这份已解析上下文，不能使用全局当前选中的其他受试者。aid/rid 是现有路由中的 assessment 身份，不能当作 AI generation 或标准报告 artifact ID。

后端链路：Collection REST → 已鉴权的 delegated subject → Participant capability/request/get → Generation/Run/Artifact。前端只访问 collectionHost，不接入 apiserver 内部治理接口。

### 当前职责与依赖

| 现有位置 | 当前职责 | 接入策略 |
|---|---|---|
| src/modules/assessment/pages/AssessmentReportPage.tsx | 加载标准报告、趋势、计划动作 | 标准报告成功后独立查询 AI 能力并挂入口 |
| src/modules/assessment/components/report/ReportPageShell.tsx | 标准报告整页 loading/error 和布局 | AI 局部失败不能写入这里的 error/loading |
| src/modules/assessment/viewModels/medicalReport.ts | 标准报告到展示模型 | AI 新建专用 ViewModel，不写回 factors/suggestions/total |
| src/services/servers.js | token、响应解包、鉴权重放、429 重试 | 保留认证能力，补请求级重试/日志/生命周期控制 |
| waitForReportReady.js / reportEventsClient.js | 标准报告 WebSocket 与轮询 | 不作为 AI 完成信号，不套用 completed/interpreted 状态 |
| src/shared/ui 与 src/styles/tokens.less | 统一 UI 与设计 token | 复用 PageShell、SurfaceCard、ActionButton、StatePanel |

当前 src/docs/scripts 没有 AI 解读调用和页面；前端 docs/collection.yaml、15-小程序接入文档.md 也没有该能力，不能以这两份旧快照推断后端接口不存在。

### 行为 / 契约 / 不变量边界

1. 标准报告始终独立可读；用户请求 AI 不触发重新答题、重新测评或标准报告重建。
2. capability=ready 仅代表可请求，不代表尚未生成；该方法没有查询已有 Generation。
3. POST 成功可以直接返回 generated，也可以返回 pending/generating；202 本身不能当作成品。
4. failure.retryable 是服务端技术属性，不授权小程序创建新 attempt。相同 POST 会复用失败 Generation；没有 Participant retry API。
5. source_state 与业务 status 是两个轴。generated 不等于 current。
6. 所有 ID 保持字符串，禁止 Number/parseInt 转换；请求必须携带正确 testee_id。
7. reference 是后端事实引用；前端不能用数组下标猜引用、不能补造缺失结论或建议。

### 测试与可观测性现状

2026-09-05，Node 16.20.2 下验证：typecheck:strict 通过；报告 Shell、医学正文、医学 ViewModel、报告等待及生命周期 5 套测试共 11 项通过；test:collection-contracts 通过。

这些测试只证明现有报告能力，本轮未实现或测试 AI 前端。没有执行生产构建或真机验收。

通用 request 目前记录完整响应内容，并打印 token 前缀。新 AI 接口必须禁用正文与凭据日志，只保留操作、状态、错误码和耗时；suppressErrorToast 不能代替日志脱敏。

### 分析指标与判定

| 指标 | 判定 | 证据与触发标准 |
|---|---|---|
| 入口清晰 | 绿 | 页面、服务、ViewModel 和布局链可直接定位 |
| 职责内聚 | 绿 | 已有 API/service/viewModel/component 接缝 |
| AI 契约完整 | 黄 | 后端三接口存在，前端快照和实现缺失 |
| 失败与重试边界 | 红 | request 对所有 429 自动重试，AI 日容量也返回 429 且 Retry-After 可到次日 |
| 恢复能力 | 黄 | GET 必须有 generation_id；没有无副作用的按当前请求查询接口 |
| 来源可追溯展示 | 黄 | AI 有 source_report_id；标准报告读取 DTO 没有不可变 report_id；AI 也没有引用展示快照 |
| 测试保护 | 黄 | 现有报告有测试，AI 状态与身份隔离还没有保护 |

### 主要风险点

- **长时间悬挂与隐藏重放**：servers.js 的 429 分支最多自动重试三次，以 Retry-After 设置定时器；日预算耗尽可一直等待到次日。页面卸载不会取消它。仅在外层 Promise.race 超时不能阻止后续 POST。
- **业务失败误重试**：不能直接复制标准报告等待页的“重新等待”到“重新生成”。明确区分 GET 刷新、网络不确定后的重新请求和管理员业务重试。
- **生命周期串扰**：现有等待函数主要依赖 shouldContinue 和卸载标记，AI 必须额外在页面隐藏、账号改变和受试者上下文改变时取消计时并忽略旧响应。
- **恢复信息不足**：capability 不返回现有任务；本地指针丢失或换设备后不能自动找回。export 是数据主体导出，不应被用作任务列表。
- **来源不一致**：标准报告 DTO 无 report_id，不能证明界面正在显示的报告版本与 AI 的来源版本相同。首版不提供“点击证据跳到当前维度”的交互，不把 AI 拼入标准因子结论。
- **权限误判**：能打开报告或知道 testee_id 不代表 AI 请求必然获准。403 必须停止并提示访问受限，不自行绕过照护关系授权。

### 初步发现或假设

已有前端分层足够承载这项能力，无需新增全局状态框架或通用任务引擎。实际工作量集中在有副作用请求的控制、前后台恢复、异常语义及内容渲染，而不只是一个按钮。

### 下一步建议

实施第一步：补齐本地接口契约和 AI DTO，并为 request 的“AI 429 立即返回且不自动重放”写直接测试。随后再接卡片、详情和轮询。后文为设计提案，均非当前已实现能力。

## 1. 页面与交互设计

### 1.1 标准报告页入口

首版入口置于医学报告概览之后、趋势与维度详情之前。它是轻量的可选补充，标准报告的计划订阅、完成任务按钮保持原职责，AI 不占用已有底部固定操作位。

入口只对本轮接入的医学报告分支挂载；即使前端分类匹配，也必须取得后端 capability=ready 才能开始。人格/行为能力分支首版不挂入口，后续扩展仍以 capability 为准，不能根据 factor 数量自行判定可用。

首次卡片：标题“AI 补充解读”；说明“基于本次测评结果，帮助理解多个维度之间的关系，并提供日常建议。仅作补充参考，不替代标准报告。”；按钮“请求 AI 解读”。首次点击导航至详情页的准备态，不直接发 POST；详情页点击“开始解读”才发 POST。

已有已知任务：pending/generating 显示“解读正在生成 · 查看进度”；generated 显示“查看 AI 解读”；failed 显示“本次 AI 解读未完成 · 查看状态”。入口页仅 GET，不驱动高频轮询；详情页是唯一轮询所有者。返回入口页时重新 GET 一次。

feature_disabled 隐藏卡片；source_not_supported/not_applicable 隐藏主动入口；profile_unresolved/profile_mismatch 不展示开始按钮。能力网络故障不遮挡标准报告，可用低强调的“AI 解读暂时不可用 · 刷新”提示。直达详情页时上述情况都需有明确状态页和返回入口。

### 1.2 独立详情页

拟新增 /pages/assessment/ai-explanation/index?aid=...&t=...&gid=...。gid 可省略，仅进入准备态；地址参数不携带内容、token、Prompt、Profile 或风险结果。页面默认禁止携带身份参数的分享配置。

```text
返回                 AI 补充解读
关联本次测评 / AI 生成内容
来源状态提示（有变化或不能核实时始终可见）

整体理解               ← summary
维度之间的联系         ← integrated_insights
可以尝试的小步骤       ← suggestions
使用边界               ← limitations（不折叠）

返回标准报告
```

准备态解释用途、数据范围和操作，配报告页与放大镜插图，没有生成内容占位。点击后即时锁定按钮，等待期间用明确状态文字配轻量三点动效；减少动态效果时使用静态等效状态。无虚构百分比、模型思考步骤、token 动画或完成时刻承诺。页面可离开，服务端任务继续。

不加入聊天输入、追问、自由 focus 文本、模型切换、force regenerate、诊断结论、分享海报或导出入口。focus allowlist 尚未由 capability 返回，首版使用 `{locale:"zh-CN", focus_areas:[]}`。

### 1.3 业务状态与 UI 状态

| 输入 | UI 与操作 | 请求行为 |
|---|---|---|
| capability 检查中 | 卡片不跳动，局部加载 | 仅 GET |
| ready 且无已知 gid | 用途说明、开始解读 | 仅点击开始才 POST |
| POST 发送中 | “正在提交请求”，按钮锁定 | 不自动重放 |
| pending | “请求已接收，等待开始” | 进入详情轮询 |
| generating | “正在整理本次测评的补充解读” | 串行轮询，无假进度 |
| generated + current | 展示完整成品 | 停止轮询 |
| failed | safe_message；“刷新状态”“返回标准报告” | 刷新只 GET，不新建 attempt |
| not_ready | “标准报告尚未就绪” | 停止 AI 等待，返回标准报告 |
| not_applicable | 根据 reason_code 隐藏或解释不可用 | 不重试生成 |
| 429 | “请求暂受限制，请稍后再试”；有 Retry-After 时展示可再次操作时间 | 不将所有 429 命名为日额度耗尽；遵守服务端等待时间 |
| GET 网络错误/503 | “暂时无法更新解读状态”，保留已知 gid | 有界 GET 恢复，不改为 failed |
| POST 网络超时且无 gid | “暂未确认请求结果” | 不假定请求失败，不自动第二次 POST |
| 本地等待超过 5 分钟 | “生成仍未结束，可稍后查看” | 暂停定时，手动刷新/重新进入后 GET |
| 未知状态/Schema | “当前版本暂不支持展示” | 停止，不能按成功渲染 |

POST 结果不确定、且无 gid 时，只提供显式“再次请求”并说明“会由服务端检查是否已有相同请求”。它可能复用旧任务，也可能因报告/发布组合变化创建新请求，不能承诺纯查询或跨版本幂等。

### 1.4 来源状态单独处理

- current：说明关联本次测评；不能声称已验证与页面缓存中的报告完全同版。
- stale：已生成成品可阅读，但显示“标准报告已更新，这份解读基于之前的报告”。主操作为“查看当前标准报告”。重新请求必须回到准备态、重新检查能力并由用户发起。
- unavailable：显示“暂时无法核实关联报告”；不贴“最新解读”，不提供维度跳转。能否继续显示已有成品由 GET 的已授权 content 决定。
- unknown：显示“暂时无法确认报告版本”，允许 GET 刷新。
- 生成中变为 stale：仍按已知 gid 查看原任务，不自动创建替代请求。

## 2. 接口设计：以现有后端为准

所有调用经 `request`，host=config.collectionHost、needToken=true、suppressErrorToast=true。base URL 已包含 API 前缀，模块路径不要再次拼接 /api/v1。

| API 函数（拟新增） | 路径 | 参数 / 返回 |
|---|---|---|
| getAIExplanationCapability | GET /assessments/{aid}/ai-explanation/capability | query testee_id、locale；可选重复 focus_area |
| requestAIExplanation | POST /assessments/{aid}/ai-explanations | query testee_id；JSON locale、focus_areas；200 或 202 |
| getAIExplanation | GET /assessments/{aid}/ai-explanations/{gid} | query testee_id；返回业务状态及可能的 content |

现有 request 已支持 2xx 和 `{code:0,data,...}` 解包；API 模块收到 data，不重复套一层 data。错误保留 statusCode/code/retryAfterMs，正文不记录到日志。

DTO 显式建模 status、reason_code、generation_id、artifact_id、source_report_id、source_state、content、failure、created_at、updated_at。content.schema_version 只接受 ai-explanation-output/v1，必要字段缺失应停止渲染，禁止用默认“成功”或空建议数组掩盖契约错误。

服务端当前不提供百分比、阶段进度、预计完成时间、next_poll_after_ms、可选 focus 列表、按 assessment 查询现有 Generation 的只读接口。设计不能将这些字段当成既有能力。

## 3. 前端结构与责任

拟新增，尚未落地：

```text
src/services/api/aiExplanationApi.ts          三个 Collection API、DTO 和响应校验
src/modules/assessment/
  pages/AIExplanationPage.tsx                参数、页面生命周期、内容组合
  hooks/useAIExplanation.ts                  UI 状态、用户操作、上下文 epoch
  services/waitForAIExplanation.ts           单飞、有界、可停止 GET 轮询
  services/aiExplanationContextStore.ts      账号隔离的 gid 指针，无内容缓存
  viewModels/aiExplanation.ts                DTO → 页面状态与内容模型
  components/ai-explanation/
    AIExplanationEntryCard.tsx               入口、能力与已知任务摘要
    AIExplanationContent.tsx                 summary/insights/suggestions/limitations
    AIExplanationSourceNotice.tsx            current/stale/unavailable/unknown
src/pages/assessment/ai-explanation/index.tsx 薄页面导出与配置
```

组件不导入 @taroify/*；使用 shared/ui。状态与内容是 assessment 内部能力，首版不建立全局 AI store，不引入状态机库、Markdown renderer、图表库或 Lottie 资源。

需局部修改：AssessmentReportPage 的医学分支、app.config.js 分包路由、shared/config/routes.js、tsconfig.strict.json 新增文件覆盖、servers.js 的 opt-in 请求策略及会话失效清理接缝。新接口契约写入 docs/collection.yaml、15-小程序接入文档.md；通过选择性同步避免覆盖其他前端契约说明。

## 4. 请求、轮询与恢复

### 4.1 通用 request 必须补的能力

新增请求级选项：`retry429:false`、`refreshOnForbidden:false`、`logPolicy:"metadata_only"`、请求超时与生命周期取消/过期控制。默认维持其他调用的既有行为，AI 三接口显式选择策略；必须从 request → interceptorsRequest → baseRequest 全链透传，不能只声明参数。

AI 429 立即 reject，交由控制器处理 Retry-After。仍保留有界 token 刷新；重放前检查账号、页面/上下文 epoch，禁止后台定时器或会话刷新完成后替旧页面发 POST。能力探测不应触发额外的交互式登录，应在现有有效会话前提下进行；如需交互式登录，由用户操作和原有认证流程负责。

持有 Taro RequestTask 时可 abort；即使能 abort，也必须把已发送 POST 视为结果可能未知，不能把客户端取消等同服务端取消。

### 4.2 轮询规则（首版设计值，非服务端承诺）

- 只对已知 gid 的 pending/generating GET；一次完成再安排下一次，初始约 2 秒，逐渐退避至 5 秒、10 秒，少量抖动。
- 2 分钟后改提示“所需时间较长”；前台连续等待 5 分钟暂停自动查询，任务状态仍是最后一次服务端状态。
- GET 网络错误最多连续自动恢复三次，随后进入 paused/refreshError；已知 gid 不丢失。429 等待不得早于 Retry-After；较长等待直接暂停、显示可再次操作时间，不挂跨天定时器。
- useDidHide/useUnload、上下文改变、退出账号时停止定时器并递增 epoch；晚到响应必须同时匹配账号、testee、assessment、gid、epoch 才能更新 UI。
- useDidShow 重新验证身份，先 GET 一次，再按结果决定是否继续轮询；不能 POST。路由参数变化也重新建立上下文。
- AI 不订阅现有 /report-events；标准报告的 completed/interpreted 不作为 AI 成功依据。

### 4.3 本地恢复

仅保存有界、可清理的恢复指针：schemaVersion、accountId、testeeId、assessmentId、locale、focusAreas、generationId、sourceReportId、updatedAt。缓存按账号及请求范围分区、限制条数与保留时间，不保存 token、模型输出、标准报告正文或审核信息。另有按同一账号/受试者/测评范围保存的 Retry-After 时间戳（最多 30 条），用于无 gid 的 429；到期失效、登出删除，重新进入页面不能提前绕过。

账号身份使用已认证的用户资料稳定 ID；未知时不读取其他缓存。清理/切换账号必须停止所有控制器并清空其内存内容；清理会话时删除对应指针。页面查询结果仍由服务端重新授权，本地缓存不是权限凭证。

有 gid：页面显示时 GET 恢复。无 gid：只 capability，等待主动操作。404 清除失效指针后回准备态，绝不自动 POST；403 停止并清空受限内容。跨设备找回先不承诺。

## 5. 内容、视觉与可访问性

沿用 docs/design/UI-DESIGN.md、UI-FRAMEWORK.md 与 tokens.less；旧 THEME.md 不是此次新增视觉字面量的来源。医学 tone 使用现有 medical 配色，AI 为轻量补充标识，不引入第二套品牌主题。

- summary：原文展示，标题“整体理解”。
- integrated_insights：展示 title/content/why_it_matters，按后端顺序，不用前端重新排序出“高风险”。
- suggestions：展示 title/goal/actions/rationale/caution；origin 对应“标准建议延伸”或“日常尝试”。caution 有值时紧邻行动步骤。
- limitations：完整保留、默认可见。固定 UI 边界说明不能替代后端 limitations，也不能填补缺失内容。
- 仅用 Text/View 渲染普通文本，不执行 HTML、不将模型文本作为链接、Markdown 或操作指令。
- evidence_refs/source_suggestion_refs 在模型中保留。首版无证据名称/来源快照时只提示“依据本次测评事实”，不把 dimension:xxx 当用户可理解标题；不通过当前数组位置猜名字。
- 若后续提供引用明细，需后端增加与该 Artifact 同源的安全展示投影（名称、引用文本、source_report_id），或提供精确报告版本读取；不能简单跳转当前报告。
- 普通正文遵守现有排版与 44px 点击区域；状态文字不能只靠颜色，长文本自然换行，底部安全区与既有固定操作不重叠。

### 5.1 插图与页面层级

本轮视觉修订采用同一张“报告页与放大镜”插图，表达对已有报告的理解。沿用医学入口的纸张母题、柔和蓝色与轻微纸张质感，少量蓝紫色用于放大镜手柄。图片不包含文字、分数、诊断或通过标记，所有说明和操作仍由页面组件承载。

| 位置 | 图片规格（逻辑像素） | 视觉与交互 |
|---|---|---|
| 标准报告 AI 入口 | 88×88 | 放在标题右侧，说明与主按钮完整占行；不遮挡标准结论 |
| 开始前说明 | 176×176 | 居中作为唯一主插图，随后依次显示用途、数据范围、边界与开始按钮 |
| pending / generating | 176×176 | 复用静态插图，下面显示真实状态文字和三点等待动效；插图自身不循环漂浮 |
| generated | 52×52 | 缩为标题旁标识，正文成为主体；不显示“通过”或庆祝图形 |
| failed / limited / paused | 不增加大图 | 以原因和可用操作为主，保持中性，不使用失败表情或红色恐吓插图 |
| stale / unavailable / unknown | 保持内容排版 | 来源提示始终优先于完成标识，不能被插图或过渡遮挡 |

图片使用 contain、不裁切主体，预留固定宽高；加载失败保留所有文字和按钮。它属于装饰，正文已说明功能时设置空替代文本；独立使用时替代文本为“报告页与放大镜”。深色背景保留透明边缘，不反色处理原图。

候选与完整生成说明见 [资产记录](assets/ai-explanation/README.md)。当前是设计资产，未加入 src 或运行时包；无损预览图为 671,688 B，仍超过主包图片 100 KiB 预算。实施阶段须另行导出符合预算的显示尺寸版本、复核透明边缘和小尺寸可读性，并通过资产检查后接入。不能直接将设计源图打包上线。

### 5.2 动效与降级

| 场景 | 动效规范 | 停止与降级 |
|---|---|---|
| 点击开始 | 120ms 按压反馈，按钮即时锁定并显示正在提交 | 请求状态驱动，不等待动画结束才提交 |
| pending / generating | 三点依次轻移 3px、透明度变化，1.6s 一轮，点间延迟 180ms | 仅页面可见且处于等待态播放；文字分别为等待开始 / 正在生成，不解释为进度 |
| generating → generated | 正文整体 220ms、位移 4px 的一次过渡 | 刷新同一成品、重新进入页面不重播；不逐字输出或逐卡飞入 |
| failed / paused / limited | 160～240ms 的普通状态切换或直接更新 | 移除等待动画；失败不震动、不抖动 |

使用现有样式体系的 transform / opacity 即可，不新增 Lottie 或动画库。动效不得触发 POST、GET、完成态或轮询；真实网络状态决定 UI，等待动画结束也不代表任务完成。页面隐藏/卸载、账号或受试者变化时与查询控制器同步停止。

草图支持系统 prefers-reduced-motion 与“减少动画”设计选项。正式小程序须验证目标基础库可用的系统动效偏好；无法可靠读取时提供页面设置或默认静态等效状态，不把浏览器媒体查询当作真机支持证据。静态态保留完整状态文字，辅助技术不朗读每帧变化。

新增视觉验收：320 / 375px 布局、长文案、图片失败、深浅背景、减少动画、页面隐藏后停止；完成过渡只播放一次；生产图片体积符合预算。当前交互草图只演示状态，未连接真实请求，也不能作为真机性能验收。

## 6. 后端配合与发布边界

| 项目 | 首版处理 | 后续触发条件 |
|---|---|---|
| 按当前请求读取已有 Generation | 本地 gid + 显式用户再次请求 | 需要跨设备、清缓存恢复时新增无副作用读取接口；返回 absent/current/stale 等明确结果 |
| 标准报告不可变身份 | 不做证据跳转、不把 AI 内容拼入标准事实 | 如产品要求明确同版展示，给标准报告 DTO 增加 report_id/source identity 并做匹配 |
| AI 引用安全展示投影 | 保留 refs，不猜名称/原文 | 启用“查看依据”前补同源投影 |
| 429 具体原因 | 统一显示暂受限制，尊重 Retry-After | 若要区分日额度和瞬时限流，增加稳定 reason_code |
| 发布身份与门禁 | 不由前端规避 | 前轮发现的路由批准身份绑定、G3/G4 语义问题应在用户开放前完成修复验证 |

前端可先在 stub/受控联调环境完成全部状态，生产只随已批准 Profile 和服务端 Participant 开关开放。前端 capability 探测并不能代替后端发布验收。小程序构建、开发者工具上传、审核/发布也与服务端部署分开。

## 7. 实施顺序与验收

1. 契约与请求层：DTO/三 API、本地文档、请求级禁重试/日志/取消；保护现有标准报告请求行为。
2. 最小页面闭环：能力卡片、详情准备态、单次 POST、直接 generated 和 202 分支、专用内容 ViewModel。
3. 生命周期闭环：轮询、隐藏/返回、失效响应、账号隔离、结果未知、failed、429、stale。
4. 受控联调与微信真机，再进入正式功能验收；不在本轮设计里直接开放生产开关。

最低验收场景：

- AI 关闭、超时、403 时标准报告、趋势和计划动作不受影响。
- capability=ready 不发 POST；双击开始最多一个有效在途 POST；200 generated 立即展示，202 pending 正常等待。
- 429 立即结束请求锁定、保留 Retry-After，不存在长时间隐藏 POST 定时器。
- failed + retryable=true 仍没有“重新生成”业务重试；刷新只 GET。
- POST 响应丢失不被当作服务端失败，恢复操作明确由用户触发。
- 页面隐藏/卸载/账号或受试者改变后不发新的轮询、不接受旧响应；回来先 GET。
- 无 gid、缓存丢失、404 时不自动 POST；跨设备能力不做虚假承诺。
- generated 的 source_state=current/stale/unavailable/unknown 四种提示均正确；不将旧成品并入新报告。
- 缺字段、未知 status/Schema、恶意 HTML 文本、长文本和特殊字符不会伪造内容或执行脚本。
- 日志不出现 AI 正文或认证凭据；缓存只有分账号恢复指针。

新增控制器用可注入计时器和 API 做 fake timers 测试；组件做关键交互断言，避免只用源码字符串扫描代替运行测试。实施后运行 verify:frontend，并在微信开发者工具与真机验证前后台切换、网络断开、下次进入和安全区。

## 8. 事实源索引

前端相对仓库根目录：

- src/modules/assessment/pages/AssessmentReportPage.tsx
- src/modules/assessment/services/loadMedicalReport.js
- src/modules/assessment/services/waitForReportReady.js
- src/modules/assessment/components/report/ReportPageShell.tsx
- src/modules/assessment/viewModels/medicalReport.ts
- src/services/servers.js、src/services/api/assessmentApi.js
- src/services/auth/sessionManager.js、src/store/userStore.ts
- src/app.config.js、src/shared/config/routes.js、tsconfig.strict.json
- docs/design/UI-DESIGN.md、docs/design/UI-FRAMEWORK.md、src/styles/tokens.less

后端 qs-server 相对仓库根目录：

- internal/collection-server/transport/rest/handler/ai_explanation_handler.go
- internal/collection-server/application/aiexplanation/service.go
- internal/collection-server/port/aiexplanation/port.go
- internal/collection-server/infra/grpcclient/ai_explanation_client.go
- internal/collection-server/infra/grpcclient/evaluation_client.go
- internal/apiserver/application/interpretation/aiexplanation/participant/service.go
- api/grpc/proto/interpretation/interpretation.proto、api/rest/collection.yaml

这些是本次阅读时的事实源；生产状态和未来代码变更需另行核验。


## 9. 实施记录（2026-09-05）

已实现三接口与 DTO 校验、医学报告入口、独立 AI 详情页、来源提示、纯文本成品渲染、生命周期控制器、串行轮询和本地恢复指针。
`aiExplanationController.ts` 集中拥有请求/定时器与 epoch；`waitForAIExplanation.ts` 仅存调度策略；Hook 接线账号、路由及小程序生命周期，没有新增全局 AI 状态库。

通用 request 新增 opt-in retry429、refreshOnForbidden、metadata_only、timeout、lifetime；AI 权限 403 不触发原有的 token 刷新/登出逻辑。
401 保留认证恢复；请求结束、页面取消、认证刷新后都校验 scope。认证接口亦使用 metadata_only，避免 AI 刷新链把 token 请求/响应打印到日志。
会话清理通过 shared/stores/sessionPrivacy.ts 删除 session 前缀的私有缓存、清空用户身份并递增 revision；旧用户资料与登录/刷新结果不能在登出后恢复身份。

接口适配修正：Collection 的 Go 转换使用 nil slice，generated_low_risk 的空 source_suggestion_refs 会输出 null。前端只对此明确的空序列做归一化；并未允许缺失核心内容、空成品、未知 schema/status 继续展示。

插图已导出并接入 assessment 分包资源路径：352×352 WebP，13,730 B；设计源文件不进入运行时。采用静态默认与页面上的“开启轻量动画 / 减少动画”，有系统减少动画设置时 CSS 再兜底。只有前台 waiting 才循环，成品只做一次短过渡。

### 本地验证结果

- Node 16.20.2：typecheck:strict 通过；全量 UI 测试 53 套 / 202 项通过，其中本次新增 9 套 / 55 项。
- AI 专项覆盖 API 范围与大整数 ID、空引用传输兼容、错误 schema、429/Retry-After、403 不登出、取消与认证重放、串行轮询/超时、未知 POST、账号/路由/页面生命周期、缓存上限/过期/登出、成品正文与来源提示、页面主操作和动画降级。
- test:contracts 全部通过（IAM、Portal、人格、行为能力、Collection、医学报告 mapper 和人格 seams）；check:ui-boundaries、git diff --check 通过。
- build:weapp 通过；主包 1,537.00 KiB < 1,800 KiB 门禁；新增插图实际位于 dist/pages/assessment/ai-explanation/assets，13,730 B。
- OpenAPI 文档可解析且内部 schema 引用完整；构建产物包含新分包路由。Taro 3.6 将 enableShareAppMessage / enableShareTimeline 放入运行时 Page config，而非输出到页面 JSON；已核验运行时两项均为 false，详情页没有分享 Hook。
- 构建存在共享 UI 样式顺序警告；未将这些警告视为真机显示已验收。

完整 verify:frontend **未全绿**：check:ui-assets 被 HEAD 中已有三张 PNG 阻断，分别为 qlume-home-v2.png（340,327 B）、ability-catalog-v2.png（390,728 B）、medical-catalog-v2.png（338,922 B）。三文件未由本次修改；未放宽门禁或添加例外。因该串行命令在资产门禁停止，后续 build:weapp / check:package-size 已单独执行并通过。

未执行微信开发者工具/真机验证、真实 Participant / Provider 联调、小程序上传/审核/发布或生产开关开放；这些是上线前仍需完成的验收，不由本地测试替代。
