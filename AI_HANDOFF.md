# 给下一位 AI 的接手说明

## 项目定位

这是产品设计师的单页静态网页作品集，主要展示 B/G 端政企采购、AI 产品、设计系统与工程化经验。

## 修改入口

- 改首页、个人介绍、案例标题、摘要、标签、数据：编辑 `index.html` 内的 HTML 和 `PROJECTS` / `OTHERS` 数据。
- 改项目封面、头像、二维码：替换 `assets/` 中同名文件，保持原有文件名和格式。
- 改正文轨道、蓝紫光效和底部光晕：调整 `index.html` 中的 `main::before` 与 `.footer-cta::before`；背景图片位于 `assets/backgrounds/`。
- 改星点数量、明暗或上升速度：编辑 `ambient-field.mjs`。它以普通脚本方式加载，支持直接双击 `index.html` 预览；会自动适配手机，并在“减少动态效果”开启时停止动画。
- 改背景圆点光晕：调整 `ambient-field.mjs` 中的 `softGlowStops`、`starGlowStyle` 与 `drawStar`；当前外晕尺寸为核心的 3.6 倍，使用边缘完全透明的径向渐变。
- 改底部小而亮的微粒：调整 `createMicroParticles`、`createMicroParticlesForViewport` 与 `drawParticle`；主粒子数量保持不变，微粒为桌面 12 颗、手机 8 颗，核心透明度为 0.8–1.0。
- 改鼠标跟随星光：编辑 `ambient-field.mjs` 中的 `createCursorSpark`、`stepCursorSparks` 与 `handlePointerMove`；覆盖画布为 `index.html` 中的 `#cursorStarlight`。该效果只在宽度大于 900px 的桌面精细指针上启用。
- 改项目详情：当前抽屉会重复使用项目封面；若要完善，应为每个项目补充独立的详情文案和多张图片，而不是虚构业务数据。

## 真实性边界

- 姓名、联系方式、头像、二维码及部分数据仍可能是占位，修改前请向本人确认。
- 不要把尚未核实的周期、覆盖数量、转化率或获奖信息写成事实。
- 该项目不包含长版案例集；需要引用其中素材时，先征得本人同意后再单独导入。

## 交付与版本

- 每次完成一组可确认的修改后运行页面检查，再创建一个 Git 提交。
- 背景动效测试命令：`node --test tests/ambient-field.test.mjs`。
- 提交信息用中文且说明改了什么，例如：`更新个人联系方式和封面图`。
- 不要修改或删除 `.git/` 目录；它保存全部版本历史。
