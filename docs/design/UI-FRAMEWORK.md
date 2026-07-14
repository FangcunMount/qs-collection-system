# Qlume UI 框架与迁移规则

## 结论

Qlume 使用 `@taroify/core@0.9.2` 与 `@taroify/icons@0.9.2` 作为基础交互实现，并锁定精确版本。Taroify 不定义视觉，不允许被业务页面直接导入；`tokens.less`、`UI-DESIGN.md` 与 `shared/ui` 才是稳定产品接口。

```text
业务页面
├── shared/ui
├── modules/*/components
└── Taro View/Text/Image
          ↓
shared/ui/internal/taroify
          ↓
@taroify/core + @taroify/icons
```

## 技术基线

- Taro 3.6.25、React 18、Node 16.20.2、Webpack 4。
- Less 继续承载页面与 Qlume 组件样式；Taroify Sass 样式由 `src/styles/taroify.scss` 集中按需导入。
- `src/styles/tokens.less` 是设计字面量唯一真源。
- `src/styles/taroify-theme.less` 在小程序 `page` 根节点映射 CSS 变量；领域色由 `PageShell tone` 局部覆盖。
- 不在 `app.js` 使用 `ConfigProvider`。只有真实动态主题子树才允许局部使用。

## 导入与依赖边界

- 只有 `src/shared/ui/internal/taroify/` 可以导入 `@taroify/*`。
- 业务页面只能使用 `@/shared/ui`、领域组件或 Taro 原生展示元素。
- `taro-ui`、`taro-ui-fc` 已退出依赖，禁止重新加入。
- `npm run check:ui-boundaries` 同时检查源码导入与 `package.json` 依赖。
- 新增 Taroify 组件时，必须先建立有隔离价值的 Qlume 适配器，再把对应样式加入集中清单。

## 组件框架的职责边界

Taroify 可以提供按钮、输入、单选、多选、选择器、日期、步进器、评分、弹窗、浮层、Toast、加载、空状态和通用图标。以下能力必须保留在 Qlume 或领域模块：

- 首页与领域 Banner、品牌插图和人格吉祥物；
- 测评题目容器、答案序列化、断点恢复和填写人语义；
- 医学风险、人格摘要、行为能力解释和报告图表；
- 档案、授权、扫码、订阅及报告状态机。

## 主题映射

| Qlume 语义 | Taroify 变量方向 |
|---|---|
| 品牌主色 | `--primary-color`、链接、选中控件 |
| 状态色 | success / warning / danger |
| 中性画布 | background / border / text |
| 按钮 | 44px 最小高度、12px 圆角 |
| 弹窗和浮层 | 受控圆角、仅浮层使用阴影 |
| 领域 tone | medical / personality / ability 局部覆盖 |

## 升级流程

1. 在非生产路由 UI Lab 验证组件、遮罩、滚动锁定、键盘和安全区。
2. 更新精确版本和 lockfile，不使用 `^`。
3. 依次通过严格类型、UI 测试、契约测试、生产构建、包体和导入边界。
4. 在微信开发者工具与真机验证 Dialog、Popup、Picker、DatePicker 和问卷控件。
5. 若出现答案值漂移、遮罩/键盘异常或包体门禁失败，保留当前版本并停止升级。
