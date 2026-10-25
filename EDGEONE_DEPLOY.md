# EdgeOne 作品集发布

- 项目名：`yangmeihan-portfolio`
- 公开网址：`https://yangmeihan-portfolio-1wjybd3s.edgeone.cool/`
- 发布区域参数：`--region china`

修改网站或替换项目图片后，在本目录执行：

```sh
node publish-edgeone.mjs --deploy
```

该命令先运行页面检查，再生成全新的发布文件夹，然后使用官方 `@edgeone/makers-mcp@latest` 上传到同名项目，最后抽查公开首页、二维码和视频。首次在新电脑上使用时，需要在浏览器完成腾讯云登录。发布工具的本地认证信息不写入项目文件。

只检查、不打包：`node publish-edgeone.mjs --check-only`。
只检查并生成发布包、不上传：`node publish-edgeone.mjs --prepare`。

发布包在上一级 `output/edgeone-release-时间戳/` 中，不含 Git、测试、文档或生成脚本。每次生成新文件夹，不覆盖旧包。腾讯工具可能在该文件夹内额外生成空的 `.env` 和 `.edgeone/` 构建目录；它们不会进入网站静态资源目录。不要把令牌写进这里。
