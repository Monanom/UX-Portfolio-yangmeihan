import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
const moduleAmbient = await import('../ambient-field.mjs');
const ambient = globalThis.AmbientField ?? moduleAmbient;
const { createParticles, createStars, stepParticles } = ambient;

test('装饰画布限制像素密度，首屏无可见星点时跳过绘制', () => {
  assert.equal(ambient.canvasDensity(2), 1.5);
  assert.equal(ambient.canvasDensity(1), 1);
  assert.equal(ambient.shouldDrawField(900, 4000, 4500, 900), false);
  assert.equal(ambient.shouldDrawField(600, 4000, 4500, 900), true);
  assert.equal(ambient.shouldDrawField(900, 400, 1200, 900), true);
});

test('首页使用可在 file 协议下加载的普通脚本', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const browserScript = await readFile(new URL('../ambient-field.mjs', import.meta.url), 'utf8');

  assert.match(html, /<a class="nav-logo" href="#top">UX Portfolio<\/a>/);
  assert.doesNotMatch(html, /<a class="nav-logo" href="#top"><span class="mark">/);
  assert.match(html, /<script src="ambient-field\.mjs"><\/script>/);
  assert.doesNotMatch(html, /type="module" src="ambient-field\.mjs"/);
  assert.doesNotMatch(browserScript, /\bexport\s+(?:function|const|let|class)\b/);
});

test('首屏使用本地静音循环视频并保留静态封面', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(html, /<link rel="preload" as="image" href="assets\/hero-video-poster\.webp" fetchpriority="high" \/>/);
  assert.match(
    html,
    /<video id="heroVideo" muted loop playsinline preload="none" poster="assets\/hero-video-poster\.webp" aria-hidden="true">[\s\S]*?<source src="assets\/videos\/hero-background-faststart\.mp4" type="video\/mp4" \/>[\s\S]*?<\/video>/,
  );
  assert.match(html, /<script src="hero-video\.mjs"><\/script>/);
  assert.doesNotMatch(html, /type="module" src="hero-video\.mjs"/);

  const video = await readFile(new URL('../assets/videos/hero-background-faststart.mp4', import.meta.url));
  const poster = await readFile(new URL('../assets/hero-video-poster.webp', import.meta.url));
  assert.ok(video.byteLength > 1_000_000);
  assert.ok(poster.byteLength > 1_000);
});

test('手机先显示封面，空闲后才尝试播放；播放失败仍显示封面', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /<video id="heroVideo" muted loop playsinline preload="none" poster="assets\/hero-video-poster\.webp"/);
  assert.match(html, /\.hero-bg\{[^}]*url\("assets\/hero-video-poster\.webp"\)/);

  const source = await readFile(new URL('../hero-video.mjs', import.meta.url), 'utf8');
  let startIdle;
  let playCount = 0;
  const video = {
    dataset: {}, style: {}, currentTime: 0, duration: 10, paused: true,
    closest: () => ({ classList: { contains: () => true }, addEventListener() {} }),
    addEventListener() {}, pause() {},
    play() { playCount += 1; return Promise.reject(new Error('autoplay blocked')); },
  };
  const document = {
    readyState: 'loading', hidden: false,
    getElementById: () => video, addEventListener() {},
  };
  const window = {
    matchMedia: query => ({ matches: query.includes('max-width'), addEventListener() {} }),
    requestIdleCallback: callback => { startIdle = callback; },
  };
  const context = { document, window, globalThis: null, setTimeout, clearTimeout };
  context.globalThis = context;
  runInNewContext(source, context);
  context.HeroVideo.initHeroVideo();
  assert.equal(playCount, 0);
  assert.equal(typeof startIdle, 'function');
  startIdle();
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(playCount, 1);
  assert.equal(video.style.opacity, '0');
});

test('首屏视频在任意桌面宽度保持右侧主体并为手机使用独立裁切锚点', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(html, /\.hero-bg video\{[^}]*position:relative[^}]*left:13vw[^}]*width:130%[^}]*max-width:none[^}]*object-fit:cover[^}]*object-position:center[^}]*scale:\.8[^}]*filter:brightness\(\.82\) saturate\(\.9\)/s);
  assert.match(html, /\.hero-bg::before\{[^}]*linear-gradient\(90deg,rgba\(5,7,17,\.82\)[^}]*transparent/s);
  assert.match(html, /@media \(max-width:900px\)[\s\S]*?\.hero-bg video\{[^}]*width:260%[^}]*max-width:none[^}]*object-fit:cover[^}]*object-position:45% center[^}]*transform:translateX\(-24%\)/);
  assert.match(html, /@media \(max-width:900px\)[\s\S]*?\.hero-bg video\{[^}]*left:2vw[^}]*width:260%/);
  assert.doesNotMatch(html, /@keyframes heroDrift/);
});

test('手机端视频缩放后仍覆盖首屏上下边缘，不露出下方渐变带', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const baseRule = html.match(/\.hero-bg video\{([^}]*)\}/)?.[1];
  const mobileCss = html.match(/@media \(max-width:900px\)\{([\s\S]*?)\n\}\n@media \(max-width:560px\)/)?.[1];
  const mobileRule = mobileCss?.match(/\.hero-bg video\{([^}]*)\}/)?.[1];
  const scale = Number(baseRule?.match(/scale:([\d.]+)/)?.[1]);
  const height = Number(mobileRule?.match(/height:([\d.]+)%/)?.[1]);
  const top = Number(mobileRule?.match(/top:([\d.-]+)%/)?.[1]);

  assert.ok(scale > 0 && scale <= 1);
  assert.ok(height > 0 && Number.isFinite(top), '手机视频需要补偿缩放造成的上下空隙');
  assert.match(mobileRule, /object-fit:cover/);
  assert.ok(top + height * (1 - scale) / 2 <= 0, '视频上缘须覆盖首屏');
  assert.ok(top + height * (1 + scale) / 2 >= 100, '视频下缘须覆盖首屏');
});

test('手机视频和静态封面一起向画面中央靠近', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const mobileCss = html.match(/@media \(max-width:900px\)\{([\s\S]*?)\n\}\n@media \(max-width:560px\)/)?.[1];
  const videoRule = mobileCss?.match(/\.hero-bg video\{([^}]*)\}/)?.[1];
  const backgroundRule = mobileCss?.match(/\.hero-bg\{([^}]*)\}/)?.[1];
  const videoLeft = Number(videoRule?.match(/left:(-?[\d.]+)vw/)?.[1]);
  const posterPosition = Number(backgroundRule?.match(/background-position:([\d.]+)% center/)?.[1]);
  const posterSize = Number(backgroundRule?.match(/background-size:([\d.]+)% auto/)?.[1]) / 100;
  assert.ok(videoLeft >= 0 && videoLeft <= 5, '视频主体应从右侧向中间靠近');
  assert.ok(posterPosition > 39, '加载视频前的封面也应同步移动');
  const videoShift = videoLeft - 10;
  const posterShift = (1 - posterSize) * (posterPosition - 39);
  assert.ok(Math.abs(videoShift - posterShift) <= 1, '视频与封面的移动距离应接近');
  assert.match(html, /@media \(max-width:900px\) and \(prefers-reduced-motion:reduce\)\{\s*\.hero-bg\{background-position:[\d.]+% center/);
});

test('视频播放和循环期间不逐帧改写透明度，避免画面跳层', async () => {
  const source = await readFile(new URL('../hero-video.mjs', import.meta.url), 'utf8');
  const listeners = new Map();
  let frameCallback;
  const video = {
    dataset: {}, style: {}, currentTime: 0, duration: 10, paused: false,
    closest: () => ({ classList: { contains: () => true }, addEventListener() {} }),
    addEventListener(type, callback) { listeners.set(type, callback); },
    pause() {},
    play() { return Promise.resolve(); },
    requestVideoFrameCallback(callback) { frameCallback = callback; return 1; },
    cancelVideoFrameCallback() {},
  };
  const document = {
    readyState: 'loading', hidden: false,
    getElementById: () => video, addEventListener() {},
  };
  const window = {
    matchMedia: () => ({ matches: false, addEventListener() {} }),
  };
  const context = { document, window, globalThis: null, setTimeout, clearTimeout };
  context.globalThis = context;
  runInNewContext(source, context);
  context.HeroVideo.initHeroVideo();
  await Promise.resolve();
  const initialOpacity = video.style.opacity;

  video.currentTime = 9.95;
  listeners.get('timeupdate')?.();
  frameCallback?.();
  video.currentTime = 0.05;
  listeners.get('timeupdate')?.();
  frameCallback?.();

  assert.equal(video.style.opacity, initialOpacity);
  assert.equal(initialOpacity, '1');
});

test('减少动态效果时停止视频并显示本地静态封面', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const script = await readFile(new URL('../hero-video.mjs', import.meta.url), 'utf8');

  assert.match(html, /@media \(prefers-reduced-motion:reduce\)\{[\s\S]*?\.hero-bg\{[^}]*url\("assets\/hero-video-poster\.webp"\)[^}]*\}[\s\S]*?\.hero-bg video\{display:none\}/);
  assert.match(script, /matchMedia\('\(prefers-reduced-motion: reduce\)'\)/);
  assert.match(script, /visibilitychange/);
  assert.match(script, /video\.pause\(\)/);
  assert.match(script, /video\.play\(\)/);
  assert.match(script, /viewportmotionchange/);
  assert.match(script, /motion-active/);
  assert.match(script, /if\(!heroActive\)[\s\S]*?pauseVideo\(\)/);
  assert.doesNotMatch(script, /\bexport\s+(?:function|const|let|class)\b/);
});

test('桌面联系区按视口扣除页脚后垂直居中', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(html, /@media\s*\(min-width:901px\)/);
  assert.match(html, /min-height:calc\(100svh - 96px\)/);
  assert.match(html, /\.footer-cta\s*\{[^}]*justify-content:center/s);
});

test('白色外发光只覆盖五类主标题', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const titleGlowMatches = html.match(/class="[^"]*title-glow[^"]*"/g) ?? [];

  assert.equal(titleGlowMatches.length, 5);
  assert.match(
    html,
    /\.title-glow::after\{[^}]*content:attr\(data-glow\)[^}]*filter:blur\(var\(--title-glow-blur\)\)/s,
  );
  assert.match(
    html,
    /@media\s*\(max-width:560px\)\{[\s\S]*?\.hero-kicker\.title-glow,\.footer-cta h2\.title-glow,\.title-glow\{[^}]*--title-glow-blur:6px/,
  );
  assert.doesNotMatch(html, /class="[^"]*project-name[^"]*title-glow/);
});

test('首屏标题以原始白色外发光作为实时效果的失败降级', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(
    html,
    /\.hero-kicker\.title-glow\{[^}]*color:var\(--ink\)[^}]*background:none[^}]*-webkit-text-fill-color:currentColor[^}]*-webkit-text-stroke:0[^}]*text-shadow:none/s,
  );
  assert.match(
    html,
    /\.hero-metal-layer\{[^}]*position:absolute[^}]*pointer-events:none[^}]*mix-blend-mode:screen[^}]*opacity:0/s,
  );
  assert.match(html, /\.hero-kicker\.title-glow\.metal-shader-ready \.hero-metal-layer\{visibility:visible;opacity:\.92\}/);
  assert.match(html, /\.hero-kicker\.title-glow::after\{content:attr\(data-glow\)\}/);
  assert.match(html, /\.hero-kicker\.title-glow\.metal-shader-ready::after\{content:none\}/);
  assert.doesNotMatch(html, /\.hero-kicker\.title-glow::before\{/);
  assert.match(
    html,
    /@media\s*\(max-width:560px\)\{[\s\S]*?\.hero-kicker\.title-glow[^}]*--title-glow-blur:6px;--title-glow-opacity:\.3/,
  );
  assert.doesNotMatch(html, /\.hero-kicker\.title-glow(?:\{|::after\{)[^}]*animation:/s);
});

test('关于我使用渐隐圆点时间轴和下方双卡片布局', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(html, /@media \(min-width:901px\)\{[\s\S]*?\.about-header > \.wechat-contact\{margin-top:34px\}/);
  assert.doesNotMatch(html, /设计理念|about-belief\.jpg/);
  assert.match(html, /\.experience-grid\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)[^}]*grid-template-rows:300px 320px/s);
  assert.match(html, /\.work-card\{[^}]*grid-column:1\/-1/s);
  assert.match(html, /\.work-card \.career-list::before\{[^}]*radial-gradient\(circle[^}]*repeat-x[^}]*mask-image:linear-gradient\(90deg,transparent/s);
  assert.match(html, /\.work-card \.career-list::before\{[^}]*left:0;right:0;top:50px[^}]*linear-gradient\(90deg,transparent,#000 10%,#000 90%,transparent\)/s);
  assert.match(html, /\.work-card \.career-list\{[^}]*position:absolute[^}]*top:88px[^}]*grid-template-columns:repeat\(4,minmax\(0,1fr\)\)[^}]*padding:0 28px 24px/s);
  assert.match(html, /\.work-card \.career-star\{[^}]*width:24px;height:24px[^}]*fill:#fff[^}]*filter:drop-shadow\(0 0 4px rgba\(255,255,255,\.49\)\) drop-shadow\(0 0 10px rgba\(255,255,255,\.33\)\) drop-shadow\(0 0 18px rgba\(255,255,255,\.15\)\)/s);
  assert.match(html, /\.work-card \.career-row::after\{[^}]*width:48px;height:48px[^}]*radial-gradient\(circle,rgba\(255,255,255,\.25\) 0,rgba\(255,255,255,\.11\) 32%,rgba\(255,255,255,0\) 72%\)[^}]*filter:blur\(5px\)/s);
  assert.match(html, /\.work-card \.career-row\{[^}]*align-items:flex-start[^}]*padding:0 8px[^}]*border:0[^}]*background:none/s);
  assert.match(html, /\.work-card \.career-star\{[^}]*top:40px[^}]*left:16px/s);
  assert.match(html, /\.work-card \.career-row::after\{[^}]*top:28px[^}]*left:-8px/s);
  assert.match(html, /\.work-card \.career-row span:first-child\{line-height:20px;font-size:clamp\(12px,1\.25vw,16px\)\}/);
  assert.match(html, /\.work-card \.career-row strong\{margin-top:61px;font-size:clamp\(15px,1\.4vw,17px\);overflow-wrap:anywhere\}/);
  assert.match(html, /@media \(max-width:900px\)[\s\S]*\.work-card \.career-star\{top:11px;left:19px\}[\s\S]*\.work-card \.career-row::after\{top:-1px;left:-5px\}/);
  assert.match(html, /@media \(max-width:900px\)[\s\S]*\.work-card \.career-row span:first-child\{font-size:16px\}/);
  assert.match(html, /@media \(max-width:900px\)[\s\S]*\.work-card \.career-row strong\{font-size:17px\}/);
  assert.match(html, /@media \(max-width:900px\)[\s\S]*\.work-card \.career-list\{position:relative;top:auto;grid-template-columns:1fr;[^}]*\}/);
  assert.match(html, /class="experience-grid"[\s\S]*class="feature-card work-card[^"]*"[\s\S]*专业技能[\s\S]*个人优势/);
  assert.doesNotMatch(html, /class="feature-card tall work-card/);
  assert.match(html, /<span>工作经历<\/span>/);
  assert.match(html, /src="assets\/about-career-abstract\.webp"[^>]*loading="lazy"/);
  assert.match(html, /<img class="bgimg" src="assets\/about-tools-stars\.webp" alt="" loading="lazy"/);
  assert.match(html, /<img class="bgimg portrait-base" src="assets\/about-portrait-id-badge\.webp" alt="" loading="lazy"/);

  const background = await readFile(new URL('../assets/about-career-abstract.webp', import.meta.url));
  assert.ok(background.byteLength > 1000);
  const toolsBackground = await readFile(new URL('../assets/about-tools-stars.webp', import.meta.url));
  assert.ok(toolsBackground.byteLength > 100_000);
  const portrait = await readFile(new URL('../assets/about-portrait-id-badge.webp', import.meta.url));
  assert.ok(portrait.byteLength > 100_000);
  const starAsset = await readFile(new URL('../assets/four-point-star.svg', import.meta.url), 'utf8');
  assert.match(starAsset, /viewBox="0 0 960 960"[\s\S]*M843\.5712 478\.481067/);
  const inlineStars = [...html.matchAll(/<svg class="career-star"[^>]*><path d="([^"]+)"\/><\/svg>/g)];
  assert.equal(inlineStars.length, 4);
  assert.equal(new Set(inlineStars.map((match) => match[1])).size, 1);
  assert.doesNotMatch(html, /mask:url\("assets\/four-point-star\.svg"\)/);
});

test('关于我简介在桌面横跨整行，小屏与联系按钮分行', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /\.about-header\{[^}]*display:grid;grid-template-columns:minmax\(0,1fr\) auto/);
  assert.match(html, /\.about-summary\{[^}]*grid-column:1\/-1;[^}]*max-width:none/);
  assert.match(html, /<\/div>\s*<p class="about-summary fade-in"[^>]*>深耕体验设计领域/);
  assert.match(html, /@media \(max-width:900px\)\{[\s\S]*?\.about-header > \.wechat-contact\{grid-column:1;grid-row:3/);
});

test('个人介绍与精选项目之间的上下留白各缩小一半', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /\.about\{[^}]*padding:var\(--section-space\) 0 calc\(var\(--section-space\) \* \.5\)/);
  assert.match(html, /\.projects\{padding:calc\(var\(--section-space\) \* \.5\) 0 0\}/);
});

test('工作经历按用户提供的四段经历显示', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const list = html.match(/<div class="career-list">([\s\S]*?)<\/div>\s*<\/article>/);
  assert.ok(list);
  const rows = [...list[1].matchAll(/<div class="career-row"><span>(.*?)<\/span><svg class="career-star"[^>]*><path d="[^"]+"\/><\/svg><strong>(.*?)<\/strong><span>(.*?)<\/span><\/div>/g)]
    .map(([, date, company, title]) => [company, title, date]);
  assert.deepEqual(rows, [
    ['政采云', '资深 UX 设计师', '2021.05-2026.07'],
    ['新浪分期', '高级 UI 设计师', '2017.10-2020.11'],
    ['约课科技', '设计负责人', '2015.03-2017.08'],
    ['易观国际', 'UI 设计师', '2013.11-2015.02'],
  ]);
});

test('其他项目模块暂时隐藏且保留可恢复的内容', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /<section class="other-projects" id="other-projects" hidden>/);
  assert.match(html, /<div class="other-grid" id="otherGrid"><\/div>/);
});

test('专业技能使用方形玻璃标签和双向渐隐滚动', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(html, /class="feature-card tools-card fade-in"/);
  assert.match(html, /<div class="tool-row left" id="toolRowA"><\/div>/);
  assert.match(
    html,
    /\.tool-marquee\{[^}]*display:grid[^}]*gap:14px[^}]*mask-image:linear-gradient\(to right,transparent,#000 8%,#000 92%,transparent\)/s,
  );
  assert.match(html, /\.tool-row\.left\{animation:toolScrollLeft 22s linear infinite;animation-play-state:paused\}/);
  assert.match(html, /\.tool-row\.right\{animation:toolScrollRight 26s linear infinite;animation-play-state:paused;transform:translateX\(-50%\)\}/);
  assert.match(
    html,
    /\.tools-card \.tool-tile\{[^}]*width:clamp\(64px,5\.4vw,72px\);height:clamp\(64px,5\.4vw,72px\)[^}]*display:grid;place-items:center[^}]*border-radius:12px[^}]*font-size:13px;font-weight:500/s,
  );
  assert.match(
    html,
    /\.tools-card \.tool-tile\{[^}]*isolation:isolate[^}]*backdrop-filter:blur\(30px\) saturate\(1\.35\)[^}]*text-shadow:0 1px 8px rgba\(0,0,0,\.72\)/s,
  );
  assert.match(
    html,
    /\.tools-card \.tool-tile::before\{[^}]*inset:-18px[^}]*background:url\("assets\/about-tools-stars\.webp"\) var\(--tile-x,50%\) var\(--tile-y,50%\)\/310% auto no-repeat[^}]*filter:blur\(11px\) saturate\(1\.3\)[^}]*opacity:\.92/s,
  );
  assert.match(html, /\.tools-card \.tool-tile::after\{[^}]*linear-gradient\(rgba\(255,255,255,\.15\) 0%,rgba\(255,255,255,\.043\) 22%,transparent 46%,transparent 100%\)/s);
  assert.match(html, /\.tools-card \.shade\{background:linear-gradient\(180deg,rgba\(10,10,10,\.16\),rgba\(10,10,10,\.03\) 42%,rgba\(10,10,10,\.5\)\)\}/);
  assert.match(html, /const TOOL_BACKDROPS = \[\['19%','26%'\]/);
  assert.match(html, /class="glass tool-tile" style="--tile-x:\$\{x\};--tile-y:\$\{y\}"><span class="tool-label">\$\{t === 'Vibe Coding' \? 'Vibe<br>Coding' : t\}<\/span><\/span>/);
});

test('专业技能以设计能力为主，Vibe Coding 分两行完整显示', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const arrays = html.match(/const TOOLS_A=(\[[^\n]+\]);\s*const TOOLS_B=(\[[^\n]+\]);/);
  assert.ok(arrays);
  const tools = runInNewContext(`[...${arrays[1]},...${arrays[2]}]`);
  assert.ok(tools.includes('Figma'));
  assert.ok(tools.includes('Vibe Coding'));
  for (const technical of ['AntD','Vue3','Token','Codex','MCP']) assert.ok(!tools.includes(technical));
  const renderer = html.match(/const TOOL_BACKDROPS = [^\n]+;\s*const toolTile = [^\n]+;/);
  assert.ok(renderer);
  const tile = runInNewContext(`${renderer[0]}\ntoolTile('Vibe Coding',0)`);
  assert.match(tile, /<span class="tool-label">Vibe<br>Coding<\/span>/);
});

test('首页与项目区使用已确认的个人与项目文案', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(html, /B\/C端体验设计\s*<span class="divider">\|<\/span>\s*AI Agent设计\s*<span class="divider">\|<\/span>\s*设计系统与工程化/);
  assert.match(html, />HI，我是杨美涵。<\/h2>/);
  assert.match(html, />专业技能<\/span>/);
  assert.match(html, /深耕体验设计领域，具备扎实的多端设计实战经验与成熟交付能力，专注 B 端产品、电商平台、AI 产品体验设计，以及设计系统搭建与工程化落地。擅长从业务出发提炼设计策略，搭建可复用、可扩展的标准化设计体系，赋能产品体验升级和业务增长。/);
  assert.doesNotMatch(html, /聚焦 B\/C 双端体验设计/);
  assert.match(html, /欢迎与我交流，一起把复杂业务变成清晰好用的产品。/);
  assert.doesNotMatch(html, /如果你正在构建 B\/G 端系统/);
  assert.match(html, /从业务定位出发推导设计方向，通过视觉强度与气质调节实现多品牌差异化，并落地于实际项目。推进设计资产标准化建设，并借助AI工具开发搭建在线设计资产管理平台，实现多品牌主题一键切换，提升设计交付与协作效率。/);
  assert.match(html, /tags:\['多品牌策略','组件工程化','AI设计提效'\]/);
  assert.match(html, /梳理并改造现有组件库体系，优化统一前台 60\+ 基础组件，Vibe Coding 完成组件开发并落地组件库资产管理平台，建立主题 Token 体系实现多品牌主题一键切换。/);
  assert.match(html, /以设计 OWNER 身份完成从 0-1 视觉语言定义与体验重构，制定课程模板与图片规范，产品上线首年访问量930\+万，覆盖 10\+ 省级区划、5 万\+ 评审专家，项目获公司「锐意创新奖」。/);
  assert.match(html, /name:'乐采百应<br>多 Agent 体验设计', desc:'主导「乐采百应」整体体验框架与核心体验链路，将复杂采购业务转化为用户可理解的智能工作流，统一乐采AI产品视觉规范。'/);
  assert.match(html, /<div class="profile-tags"><span class="glass">2022年度最佳体验奖<\/span><span class="glass">2023年度最佳视觉奖<\/span><\/div>/);
  assert.doesNotMatch(html, /四川大学·本科/);
  assert.match(html, /<strong class="profile-role">UX Designer<\/strong>\s*<div class="profile-tags">/);
  assert.doesNotMatch(html, /B2G\/B2B 体验设计经验/);
  assert.match(html, /\.big-stat-content strong\.profile-role\{font-size:clamp\(34px,3\.7vw,52px\)/);
  assert.match(html, /src="assets\/about-advantage-space\.webp"[^>]*loading="lazy"/);
  assert.match(html, /AI 产品体验<\/span>\s*<span class="glass advantage-tag"[^>]*>定义产品风格<\/span>\s*<span class="glass advantage-tag"[^>]*>设计系统与工程化<\/span>\s*<span class="glass advantage-tag"[^>]*>设计策略落地<\/span>\s*<span class="glass advantage-tag"[^>]*>设计规范Skill<\/span>/);
  assert.match(html, /\.advantage-grid\{position:absolute;z-index:2;top:136px;left:0;right:0;padding:0 24px;display:flex;flex-wrap:wrap;gap:14px;align-content:flex-start\}/);
  assert.match(html, /@media \(max-width:900px\)[\s\S]*?\.advantage-card \.advantage-grid\{top:136px;padding:0 24px;align-content:flex-start\}/);
  assert.match(html, /@keyframes floatTag\{from\{transform:rotate\(var\(--rot,0deg\)\) translate\(0,0\)\}to\{transform:rotate\(var\(--rot,0deg\)\) translate\(var\(--tx,9px\),var\(--ty,-12px\)\)\}\}/);
});

test('鼠标星光画布覆盖页面但不拦截交互', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(html, /<canvas class="cursor-starlight" id="cursorStarlight" aria-hidden="true"><\/canvas>/);
  assert.match(html, /\.cursor-starlight\{[^}]*position:fixed[^}]*pointer-events:none[^}]*z-index:50/s);
});

test('鼠标星光只在桌面精细指针和正常动态模式启用', () => {
  assert.equal(typeof ambient.shouldEnableCursorStarlight, 'function');
  assert.equal(ambient.shouldEnableCursorStarlight(1440, true, true, false), true);
  assert.equal(ambient.shouldEnableCursorStarlight(900, true, true, false), false);
  assert.equal(ambient.shouldEnableCursorStarlight(1440, false, true, false), false);
  assert.equal(ambient.shouldEnableCursorStarlight(1440, true, false, false), false);
  assert.equal(ambient.shouldEnableCursorStarlight(1440, true, true, true), false);
});

test('鼠标星光散落在光标周围并在限定时间内淡出', () => {
  assert.equal(typeof ambient.createCursorSpark, 'function');
  assert.equal(typeof ambient.stepCursorSparks, 'function');
  const sparks = Array.from({ length: 20 }, (_, index) => ambient.createCursorSpark(320, 240, index + 1));

  for(const spark of sparks){
    const distance = Math.hypot(spark.x - 320, spark.y - 240);
    assert.ok(distance >= 14 && distance <= 36);
    assert.ok(spark.life >= 450 && spark.life <= 780);
    assert.ok(spark.radius >= .45 && spark.radius <= 1.55);
  }

  const stepped = ambient.stepCursorSparks(sparks, 200);
  assert.equal(stepped.length, 12);
  assert.ok(stepped.every(spark => spark.age === 200));
  assert.ok(stepped.every(spark => spark.alpha < spark.peakAlpha));
  assert.equal(ambient.stepCursorSparks(stepped, 800).length, 0);
});

test('桌面和手机视口使用更克制的星点数量', () => {
  assert.equal(typeof ambient.createStarsForViewport, 'function');
  assert.equal(ambient.createStarsForViewport(1440, 900, 20260805).length, 40);
  assert.equal(ambient.createStarsForViewport(390, 844, 20260805).length, 22);
});

test('底部粒子在桌面为 10 颗，手机进一步精简', () => {
  assert.equal(typeof ambient.createParticlesForViewport, 'function');
  assert.equal(ambient.createParticlesForViewport(1440, 600, 8086).length, 10);
  assert.equal(ambient.createParticlesForViewport(390, 600, 8086).length, 8);
});

test('底部微粒比主粒子更小、更亮且整体上升更快', () => {
  assert.equal(typeof ambient.createMicroParticlesForViewport, 'function');
  const main = ambient.createParticles(1440, 600, 12, 8086);
  const micro = ambient.createMicroParticlesForViewport(1440, 600, 8087);
  const mobileMicro = ambient.createMicroParticlesForViewport(390, 600, 8087);

  assert.equal(micro.length, 12);
  assert.equal(mobileMicro.length, 8);
  assert.ok(micro.every(particle => particle.micro === true));
  assert.ok(micro.every(particle => particle.radius >= .18 && particle.radius <= .5));
  assert.ok(micro.every(particle => particle.radius < Math.min(...main.map(item => item.radius))));
  assert.ok(micro.every(particle => particle.alpha >= .8 && particle.alpha <= 1));
  assert.ok(
    micro.reduce((total, particle) => total + particle.speed, 0) / micro.length
    > main.reduce((total, particle) => total + particle.speed, 0) / main.length,
  );
  assert.ok(micro.every(particle => particle.x >= 1440 * .29 && particle.x <= 1440 * .71));
  assert.ok(stepParticles(micro, 100000, 1440, 600).every(
    particle => particle.x >= 1440 * .29 && particle.x <= 1440 * .71,
  ));
});

test('背景星点光晕比核心更大且更淡', () => {
  assert.equal(typeof ambient.starGlowStyle, 'function');
  const star = createStars(900, 600, 1, 42)[0];
  const style = ambient.starGlowStyle(star, .8);

  assert.ok(style.haloRadius >= star.radius * 3);
  assert.ok(style.haloRadius <= star.radius * 4);
  assert.ok(style.haloAlpha > 0);
  assert.ok(style.haloAlpha < style.coreAlpha);
});

test('柔光从中心向外连续衰减并在边缘完全透明', () => {
  assert.equal(typeof ambient.softGlowStops, 'function');
  const stops = ambient.softGlowStops(.4);

  assert.deepEqual(stops.map(stop => stop.offset), [0, .42, 1]);
  assert.equal(stops[0].alpha, .4);
  assert.ok(stops[1].alpha > 0 && stops[1].alpha < stops[0].alpha);
  assert.equal(stops.at(-1).alpha, 0);
});

test('同一尺寸和种子会生成稳定、分区且层次不同的星点', () => {
  const first = createStars(1440, 900, 40, 20260805);
  const second = createStars(1440, 900, 40, 20260805);

  assert.deepEqual(first, second);
  assert.equal(first.length, 40);
  assert.ok(new Set(first.map(star => star.radius)).size >= 8);
  assert.ok(first.every(star => star.baseAlpha < star.peakAlpha));
  assert.ok(Math.min(...first.map(star => star.baseAlpha)) < 0.05);
  assert.ok(Math.max(...first.map(star => star.peakAlpha)) > 0.75);
  assert.ok(first.every(star => star.x >= 0 && star.x <= 1440));
  assert.ok(first.every(star => star.y >= 0 && star.y <= 900));
  assert.deepEqual(new Set(first.map(star => star.group)), new Set([0, 1, 2, 3]));
  assert.ok(first.filter(star => star.group === 0).every(star => star.x <= 720 && star.y <= 450));
  assert.ok(first.filter(star => star.group === 3).every(star => star.x >= 720 && star.y >= 450));
});

test('四组星点每 1.7 秒平滑接力且不会同时亮起', () => {
  assert.equal(typeof ambient.starGroupIntensity, 'function');
  const atStart = [0, 1, 2, 3].map(group => ambient.starGroupIntensity(group, 0, false));
  const atHandoff = [0, 1, 2, 3].map(group => ambient.starGroupIntensity(group, 850, false));
  const atNext = [0, 1, 2, 3].map(group => ambient.starGroupIntensity(group, 1700, false));

  assert.deepEqual(atStart, [1, 0, 0, 0]);
  assert.deepEqual(atHandoff, [.5, .5, 0, 0]);
  assert.deepEqual(atNext, [0, 1, 0, 0]);
  assert.ok(atHandoff.filter(value => value > 0).length <= 2);
  assert.deepEqual(
    [0, 1, 2, 3].map(group => ambient.starGroupIntensity(group, 5000, true)),
    [.72, 0, 0, 0],
  );
});

test('底部粒子集中在中央并在越界后从中央底部重新出现', () => {
  const particles = createParticles(900, 600, 24, 42);
  const rising = stepParticles(particles, 16, 900, 600);

  assert.ok(particles.every(particle => particle.x >= 234 && particle.x <= 666));
  assert.ok(rising.every((particle, index) => particle.y < particles[index].y));
  assert.ok(rising.every(particle => particle.x >= 234 && particle.x <= 666));

  const escaped = [{ ...particles[0], y: -20 }];
  const respawned = stepParticles(escaped, 16, 900, 600);
  assert.ok(respawned[0].y >= 600);
  assert.ok(respawned[0].x >= 234 && respawned[0].x <= 666);
});
