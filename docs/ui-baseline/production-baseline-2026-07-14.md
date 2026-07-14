# 微信小程序生产包基线（2026-07-14）

- Node：16.20.2
- Taro：3.6.25
- 构建命令：`rm -rf dist && npm run build:weapp`
- 主包：1224.74 KiB
- 硬门禁：1800 KiB
- 旧文档中的 1576 KiB 不再作为最终比较值；本记录来自干净重建后的 production `dist`。

最大主包资源：

| 文件 | 大小 |
|---|---:|
| `vendors.js` | 173.84 KiB |
| `assets/home/home-entry-medical-scale.png` | 165.57 KiB |
| `assets/banner/banner_3.webp` | 125.74 KiB |
| `taro.js` | 124.60 KiB |
| `base.wxml` | 108.92 KiB |

Taroify 样式清单首次接入、但旧 UI 样式尚未退出时，主包为 1289.11 KiB，临时增长 64.37 KiB。最终清理完成后主包不得高于 1224.74 KiB。
