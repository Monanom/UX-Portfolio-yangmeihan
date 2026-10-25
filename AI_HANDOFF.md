# 给下一位 AI 的接手说明

## 项目定位

这是产品设计师的单页静态网页作品集，主要展示 B/G 端政企采购、AI 产品、设计系统与工程化经验。

## 修改入口

- 改首页、个人介绍、案例标题、摘要、标签、数据：编辑 `index.html` 内的 HTML 和 `PROJECTS` / `OTHERS` 数据。
- 改首屏背景视频：替换 `assets/videos/hero-background.mp4`，并同步更新 `assets/hero-video-poster.png` 原图及由 `generate-optimized-images.py` 生成的同名 WebP。播放、循环渐隐、页面隐藏暂停和“减少动态效果”降级由 `hero-video.mjs` 负责；桌面与手机裁切位置在 `index.html` 的 `.hero-bg video` 中调整。原 `assets/hero-poster.jpg` 仍保留。
- 改项目封面、头像、二维码：替换 `assets/` 中对应原图并重新生成 WebP；二维码继续使用 PNG。“个人背景”当前展示 `assets/about-portrait-id-badge.webp`，PNG 原图仍保留。
- 改正文轨道、蓝紫光效和底部光晕：调整 `index.html` 中的 `main::before` 与 `.footer-cta::before`；背景图片位于 `assets/backgrounds/`。
- 改星点数量、明暗或上升速度：编辑 `ambient-field.mjs`。它以普通脚本方式加载，支持直接双击 `index.html` 预览；会自动适配手机，并在“减少动态效果”开启时停止动画。
- 改背景圆点光晕：调整 `ambient-field.mjs` 中的 `softGlowStops`、`starGlowStyle` 与 `drawStar`；当前外晕尺寸为核心的 3.6 倍，使用边缘完全透明的径向渐变。
- 改底部小而亮的微粒：调整 `createMicroParticles`、`createMicroParticlesForViewport` 与 `drawParticle`；主粒子数量保持不变，微粒为桌面 12 颗、手机 8 颗，核心透明度为 0.8–1.0。
- 改鼠标跟随星光：编辑 `ambient-field.mjs` 中的 `createCursorSpark`、`stepCursorSparks` 与 `handlePointerMove`；覆盖画布为 `index.html` 中的 `#cursorStarlight`。该效果只在宽度大于 900px 的桌面精细指针上启用。
- 改主标题光效：通用标题继续由 `.title-glow`、`--title-glow-blur` 和 `--title-glow-opacity` 控制；首屏 `UX Experience Designer` 使用 `hero-liquid-metal.mjs` 的实时银白金属着色器，速度、轮廓、明暗和色偏集中在 `HERO_METAL_SETTINGS`。`vendor/paper-liquid-metal-0.0.78.iife.js` 是固定版本的第三方离线包，一般不要直接修改；WebGL 不可用或开启“减少动态效果”时自动显示 `index.html` 中的静态银白底色。
- 改工作经历卡片：编辑 `index.html` 中的 `.experience-grid`、`.work-card`、`.career-list` 和 `.career-row`；低干扰抽象背景展示 `assets/about-career-abstract.webp`，PNG 原图保留，节点造型为 `assets/four-point-star.svg`。桌面端时间位于轴线上方并与四角星节点、文案左对齐；手机端自动转为纵向时间轴。
- 改项目详情：当前抽屉会重复使用项目封面；若要完善，应为每个项目补充独立的详情文案和多张图片，而不是虚构业务数据。

## 真实性边界

- 姓名、联系方式、头像、二维码及部分数据仍可能是占位，修改前请向本人确认。
- 不要把尚未核实的周期、覆盖数量、转化率或获奖信息写成事实。
- 该项目不包含长版案例集；需要引用其中素材时，先征得本人同意后再单独导入。

## 交付与版本

- 每次完成一组可确认的修改后运行页面检查，再创建一个 Git 提交。
- 页面动效测试命令：`node --test tests/*.test.mjs`，覆盖背景星点、首屏视频和实时金属标题。
- 提交信息用中文且说明改了什么，例如：`更新个人联系方式和封面图`。
- 不要修改或删除 `.git/` 目录；它保存全部版本历史。
