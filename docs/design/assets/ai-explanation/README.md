# AI 补充解读插图 v1

用途：医学标准报告的可选 AI 解读入口、准备页、等待页与成品标题标识。仅为设计候选，尚未接入小程序业务代码。

| 文件 | 实际大小 | 用途 |
|---|---:|---|
| report-lens-v1-source.png | 1,012,412 B | 内置 image_gen 原始输出，1254×1254，透明背景 |
| report-lens-v1.webp | 671,688 B | 无损 WebP 编码的草图预览；未改变插图构图或像素尺寸 |

显示尺寸：入口 88×88、准备/等待 176×176、成品标题 52×52 逻辑像素。使用 contain，不裁切。独立替代文本为“报告页与放大镜”；功能已由正文表达时为空。当前归属 docs/design，主包/分包均未接入；实施时建议由测评详情分包管理，主包入口如需引用须另计预算。

生成方式：内置 image_gen，2026-09-05。PNG 为原始候选，WebP 仅通过 cwebp -lossless -z 9 无损编码，便于草图内嵌。已检查主体、色板、透明背景和无文字/无医疗批准符号；当前预览体积不满足 100 KiB 主包预算，不得直接上线。正式显示尺寸导出、边缘和真机效果需要实施阶段验收。

## 最终生成提示词

Use case: stylized-concept. Asset type: Qlume medical-assessment mini-program optional AI explanation illustration, displayed as 88px square in an entry card and 176px square on a preparation/waiting page. Create ONE compact illustration: two softly layered ivory paper report pages and a small blue-lavender magnifying glass, a few broad abstract blue lines on the page, representing understanding an existing report. Calm editorial paper-cut 2.5D with subtle paper texture, softly rounded silhouette, slightly elevated three-quarter view, soft upper-left light, very restrained shallow shadows. Color palette ivory, powder medical blue #D9ECFF and #4E9ED4, tiny lavender #6657D9 accent. Centered composition filling 80% of a square, visually legible at 88px, isolated on a genuinely transparent background with clean alpha edges. No text, no numerals, no charts implying scores, no logos, no watermark, no checkmark implying medical approval, no people, no robot, no brain, no neural network, no clipboard, no glow, no decorative balls, no marketing badge. Deliver a small clean web illustration, not a full UI screenshot.


## 前端实施导出

`src/pages/assessment/ai-explanation/assets/report-lens-v1.webp`：352×352，13,730 B，使用已有候选导出（cwebp -resize 352 352 -q 88），保留透明背景。组件使用 aspectFit；入口、详情共用一个资源。原始生成稿与提示词保持可追溯。
