# 受试者首页 v1

2026-09-08：按用户确认的双状态首页设计实施。一个首页，随当前受试者变化；不新增“自我成长 / 儿童成长”导航模式，不实现换装、动作、心理状态驱动的表情或 AI 对话。

## 页面与流程

- 保留共享受试者 Store、已选成员持久化、成员订阅以及防止旧报告串入新成员的请求标识。选择器末项可管理家庭成员。
- 出生日期与性别决定四种静态形象；缺失、非法日期、未来日期与未知性别不猜测。18 岁仅是人物分组边界。
- 成人：心理健康（情绪分类）、压力、睡眠、人格探索。儿童：情绪、睡眠、注意力分类、行为能力目录。生日未知时显示三个领域入口与睡眠入口。
- “全部服务”使用原生菜单保留医学量表、人格探索、行为能力三个目录。关注入口是分类导航，不自动判断量表适用性。填写时继续沿用既有受试者确认流程。
- 保留机构 task_id / token / scene 入口与底部扫码。评估记录继续走现有页。最近医学报告可展开查看，不把医学接口包装为所有领域的综合报告。
- 移除首页热门量表请求与大幅 Banner。报告分数不控制人物外貌；首页不展示评分装饰或虚构状态。

## 资产生成

使用内置 image_gen。参考图：`exec-0e6b2f60-200a-4495-be22-a562e6af8bf7.png`（本次会话生成的受试者首页双状态设计）。

通用提示词（四次独立生成，将 PERSON 替换为下表描述）：

> Use case: stylized-concept. Production UI image asset for Qlume home. Reference only for the 3D character style, not the UI. Generate ONE full body character: PERSON Isolated on genuinely transparent alpha background. Standing front facing, one hand gently waving, entire head body hands and both shoes visible, centered within portrait composition with modest 5% clear margin. Same premium softly rounded 3D clay/toy rendering and friendly Chinese appearance as reference, soft upper-left studio lighting, subtle material detail, mint cream peach restrained palette. No scenery, NO plinth or ground plane, NO cast ground shadow, NO plants, NO props, NO text, NO UI, NO borders, NO labels, no other characters. Character occupies most image height, ready to composite onto a CSS oval platform. These are generic identity markers, no health or personality cues. Transparent background mandatory.

| 资源 | PERSON | 源图文件 |
|---|---|---|
| adult-male | Adult man about thirty, short dark hair, round dark glasses, mint green overshirt, cream tshirt, dark trousers, white sneakers. Adult proportions, same person as left reference. | exec-92cb9049-3153-414d-b523-91b3f094d56b.png |
| adult-female | Adult woman about thirty, shoulder-length dark brown hair, mint green cardigan over cream top, dark straight trousers, white sneakers. Clearly adult proportions and face, gentle calm smile. | exec-d120fdf2-4eb5-4037-bc2a-4dc6f4b05f39.png |
| child-male | Boy about eight, short dark brown hair, mint green sweatshirt, peach beige shorts and white sneakers. Clearly child proportions, gentle natural smile. | exec-073e88ca-80f7-4670-b1f3-2fb5a2db07c6.png |
| child-female | Girl about eight, chestnut bob haircut, mint green cardigan, soft peach overalls and white sneakers. Clearly child proportions, same girl as right reference. | exec-23f45b38-c3ab-4827-9048-d731d53de6ef.png |

源图位于 `/Users/yangshujie/.codex/generated_images/01a07e95-10a7-7ae2-a50e-4338029b8c36/`。运行资源已保存到项目 `src/assets/home/subjects/`，不依赖生成目录。

## 验证范围

使用真实页面与样式建立了临时浏览器排版预览；受试者数据、Taro 平台组件和图标渲染在预览中作了替代，不能视为微信真机验证。检查了成人与儿童布局、切换后的文案和人物变化。自动测试覆盖四种形象、18 岁边界、缺失和无效资料、分类路由、图片失败、报告重试与切换成员后的迟到响应。微信真机的大字体、原生选择器、扫码和完整填写链路仍需验收。
