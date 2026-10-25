# 网页作品集

这是一个不依赖安装环境的静态网页作品集：直接打开 `index.html` 即可预览。

## 内容位置

- `index.html`：页面结构、样式、案例文案与交互逻辑都在这里。
- `assets/`：网页使用的封面、项目图、头像和二维码。
- `SOURCE.md`：原始素材来源与本次导入范围。
- `AI_HANDOFF.md`：交给 Codex 或其他 AI 继续修改时的说明。

## 图片更新

网页使用 WebP 展示项目图和部分背景图，本地保留 JPG/PNG 原图。替换项目原图后，先运行 `node generate-project-previews.mjs`，再运行 `python3 generate-optimized-images.py`；第二步需要 Pillow。二维码继续使用无损 PNG，不参与转换。首屏视频封面不延后加载，页面下方的介绍图、项目预览和详情长图按需加载。

首屏播放 `assets/videos/hero-background-faststart.mp4`，原片 `hero-background.mp4` 保留在本地。替换原片后，需用 FFmpeg 执行 `ffmpeg -i assets/videos/hero-background.mp4 -map 0 -c copy -movflags +faststart assets/videos/hero-background-faststart.mp4` 重新生成播放文件；这一步只重排 MP4 索引，不重新编码画面。

## 版本记录

此目录是独立 Git 仓库。每完成一轮可确认的改动，就创建一次提交；需要回退时可以回到任一历史版本。不要把 `.git/` 删除或复制到发布目录。

## Git 连接的 Cloudflare Pages

新 Pages 项目从私有 Git 仓库的 `main` 分支自动构建。根目录保持默认；构建命令为 `node prepare-edgeone-release.mjs dist`，输出目录为 `dist`。私有仓库保留用于重建图片的原图；构建脚本只复制网页运行需要的文件，JPG 原图、测试和文档不会进入公开网站。提交前运行 `node --test tests/*.test.mjs`，并检查暂存清单。不要使用 `git add -A` 把临时材料一起上传。

后续修改先保存在独立分支，确认预览和测试后再合入 `main`。每次 `main` 更新都会产生一个可追溯的部署版本；需要撤销时优先用新提交恢复旧内容，不强制改写公共分支历史。

