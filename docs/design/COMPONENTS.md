# Qlume 公共组件接入清单

业务代码统一从 `@/shared/ui` 导入。组件名称保持产品语义稳定，内部实现可以升级或替换。

## 页面与展示

| 组件 | 用途 | 关键约束 |
|---|---|---|
| `PageShell` | 页面背景、滚动、安全区、固定操作区 | 用 `tone` 表达领域，不复制页面壳层 |
| `AppNavigationBar` | 自定义导航与胶囊避让 | 返回行为由页面控制器提供 |
| `SurfaceCard` | 普通、可点击、领域色容器 | 默认无阴影；单消费者业务卡留在模块内 |
| `SectionHeader` | 区块标题与次操作 | 次操作必须有可读标签 |
| `StatePanel` | loading / empty / error / retry | 首次、分页和降级状态不得混用 |
| `Loading` / `Empty` / `Skeleton` | 低层状态积木 | 页面优先用 `StatePanel` |
| `StatusTag` / `RiskTag` | 状态和医学风险 | 状态不能只靠颜色表达 |

## 操作与导航

| 组件 | 用途 | 关键约束 |
|---|---|---|
| `ActionButton` | 主、次、幽灵、危险操作 | 保留原生 Button 禁用/加载语义；最小 44px |
| `BottomActionBar` | 固定主操作 | 必须预留底部安全区 |
| `BottomMenu` | 五个既有入口 | 中心扫码突出但不高悬浮 |
| `FilterChip` | 短筛选项 | 只用于短标签，选中不只改变颜色 |
| `Icon` | 通用功能图标 | 仅使用 `IconName`；品牌 PNG 不进入注册表 |

## 表单与浮层

| 组件 | 稳定接口 | 说明 |
|---|---|---|
| `Field` / `TextareaField` | `value`、`onValueChange`、label/error/hint | 标签在上，错误就近展示 |
| `RadioGroup` / `Radio` | 受控 `value/onChange` + compound children | 回调始终输出原始 option code |
| `CheckboxGroup` / `Checkbox` | 受控数组值 + compound children | 保持顺序、原始 code 和 `max` |
| `PickerField` / `DatePickerField` | 受控值、选项、确认/取消 | 业务格式转换在领域适配器完成 |
| `Stepper` / `Rate` | 受控数值 | 范围与分值映射由问卷层锁定 |
| `Dialog` | `open`、confirm/cancel/close | 业务不直接操作第三方实例 |
| `Popup` / `BottomSheet` | 受控开关与关闭事件 | 验证遮罩、滚动锁定和安全区 |
| `Toast` | success / fail / loading / close | 由公共适配器统一文案与时长策略 |

## 问卷兼容契约

- 单选、多选回调返回服务端定义的原始 `code`。
- `is_select` 历史结构先归一化，组件不解释服务端字段。
- 扩展输入不能触发父选项误切换。
- 日期保持 `YYYY-MM-DD`，评分映射、数字范围、字数限制和填写人确认保持原行为。
- 修改问卷控件前先更新表征测试，再做内部替换。

## 新组件准入

一个公共组件至少满足以下一项：隔离第三方差异、被多个页面复用、统一可访问性/埋点/状态策略。否则保留在模块领域组件内。新增组件同时需要类型、加载/禁用/长文案测试和文档条目。
