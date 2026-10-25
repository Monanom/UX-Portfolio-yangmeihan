import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

await import('../hero-liquid-metal.mjs').catch(() => {});
const metal = globalThis.HeroLiquidMetal;

test('文字蒙版在桌面和手机都强制 Designer 另起一行', () => {
  assert.equal(typeof metal?.createTextMask, 'function');
  const measureText = text => text.length * 20;

  const desktop = metal.createTextMask({
    text: 'UX Experience\nDesigner',
    width: 520,
    fontFamily: 'Arial, sans-serif',
    fontSize: 80,
    fontWeight: 800,
    lineHeight: 82,
    letterSpacing: 0,
    measureText,
  });
  const mobile = metal.createTextMask({
    text: 'UX Experience\nDesigner',
    width: 300,
    fontFamily: 'Arial, sans-serif',
    fontSize: 40,
    fontWeight: 800,
    lineHeight: 41,
    letterSpacing: 0,
    measureText,
  });

  assert.deepEqual(desktop.lines, ['UX Experience', 'Designer']);
  assert.deepEqual(mobile.lines, ['UX Experience', 'Designer']);
  assert.match(desktop.svg, /<text[^>]*>UX Experience<\/text>[\s\S]*<text[^>]*>Designer<\/text>/);
  assert.match(mobile.svg, /<text[^>]*>UX Experience<\/text>[\s\S]*<text[^>]*>Designer<\/text>/);
});

test('文字蒙版转义内容并输出可直接加载的本地数据地址', () => {
  const mask = metal.createTextMask({
    text: 'UX & <Metal>',
    width: 500,
    fontFamily: 'Arial',
    fontSize: 72,
    fontWeight: 800,
    lineHeight: 74,
    letterSpacing: 0,
    measureText: text => text.length * 18,
  });

  assert.match(mask.svg, /UX &amp; &lt;Metal&gt;/);
  assert.match(mask.dataUrl, /^data:image\/svg\+xml;charset=utf-8,/);
  assert.ok(mask.height >= 74);
});

test('两行大标题保留 Designer 中 g 的下伸笔画', () => {
  const padding = 14;
  const ascent = 126;
  const descent = 32;
  const lineHeight = 129.024;
  const mask = metal.createTextMask({
    text: 'UX Experience\nDesigner',
    width: 1240,
    fontFamily: 'Arial',
    fontSize: 134.4,
    fontWeight: 800,
    lineHeight,
    letterSpacing: 0,
    measureText: text => text.length * 70,
    fontMetrics: { ascent, descent },
  });
  const secondLineBottom = padding + ascent + lineHeight + descent;

  assert.ok(mask.height >= Math.ceil(secondLineBottom + padding));
});

test('着色器仅在页面可见且允许动态并支持 WebGL2 时启用', () => {
  assert.equal(typeof metal?.shouldEnableShader, 'function');
  assert.equal(metal.shouldEnableShader(false, false, true, true), true);
  assert.equal(metal.shouldEnableShader(true, false, true, true), false);
  assert.equal(metal.shouldEnableShader(false, true, true, true), false);
  assert.equal(metal.shouldEnableShader(false, false, false, true), false);
  assert.equal(metal.shouldEnableShader(false, false, true, false), false);
});

test('标题使用约十二秒的银白液态金属有效参数', () => {
  assert.deepEqual(metal.settings, {
    colorBack: '#000000',
    backgroundAlpha: 0,
    colorTint: '#ffffff',
    contour: 0.4,
    distortion: 0.07,
    softness: 0.1,
    repetition: 2,
    shiftRed: 0.3,
    shiftBlue: 0.3,
    angle: 70,
    speed: 0.28,
  });
});

test('黑色背景以透明黑传给文字着色器，避免形成矩形底板', () => {
  assert.equal(typeof metal?.resolveBackgroundColor, 'function');
  assert.equal(metal.resolveBackgroundColor('#000000', 0), '#00000000');
  assert.equal(metal.resolveBackgroundColor('#000000', 1), '#000000');
  assert.equal(metal.resolveBackgroundColor('#000000', .5), '#00000080');
});

test('首页保留可复制的真实标题文字，桌面特效按需加载', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const adapter = await readFile(new URL('../hero-liquid-metal.mjs', import.meta.url), 'utf8');
  const vendor = await readFile(new URL('../vendor/paper-liquid-metal-0.0.78.iife.js', import.meta.url));
  const license = await readFile(new URL('../assets/licenses/paper-shaders-LICENSE.txt', import.meta.url), 'utf8');
  const notice = await readFile(new URL('../assets/licenses/paper-shaders-NOTICE.txt', import.meta.url), 'utf8');

  assert.match(html, /<p class="hero-kicker[^\"]*title-glow[^\"]*" data-glow="UX Experience&#10;Designer" aria-label="UX Experience Designer"><span class="hero-title-line">UX Experience<\/span><span class="hero-title-line">Designer<\/span><\/p>/);
  assert.match(html, /\.hero-kicker\{font-size:clamp\(60px,10\.5vw,144px\)[^}]*line-height:\.96/s);
  assert.match(html, /\.hero-title-line\{display:block\}/);
  assert.match(html, /\.hero-subtitle\{margin-top:48px/);
  assert.match(html, /\.hero-actions\{margin-top:48px\}/);
  assert.doesNotMatch(html, /我们习惯仰望星空，却忘了脚下的选择，也能改变未来的轨迹。/);
  assert.match(html, /@media \(max-width:560px\)[\s\S]*?\.hero-kicker\{font-size:clamp\(48px,13vw,58px\)\}/);
  assert.match(html, /<script src="hero-metal-loader\.mjs"><\/script>/);
  assert.doesNotMatch(html, /<script src="vendor\/paper-liquid-metal-0\.0\.78\.iife\.js"><\/script>/);
  assert.doesNotMatch(html, /<script src="hero-liquid-metal\.mjs"><\/script>/);
  assert.doesNotMatch(html, /type="module" src="(?:vendor\/paper-liquid-metal|hero-liquid-metal)/);
  assert.doesNotMatch(html, /https?:\/\/[^\"]*paper-design\/shaders/);
  assert.match(adapter, /globalThis\.HeroLiquidMetal/);
  assert.match(adapter, /text:\s*title\.dataset\.glow\?\.trim\(\)/);
  assert.match(adapter, /viewportmotionchange/);
  assert.match(adapter, /motion-active/);
  assert.ok(vendor.byteLength > 20_000);
  assert.match(license, /Apache License[\s\S]*Version 2\.0/);
  assert.match(notice, /Paper Shaders/i);
});

test('实时层不拦截交互，特效就绪时隐藏普通字形且失败时可恢复', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const adapter = await readFile(new URL('../hero-liquid-metal.mjs', import.meta.url), 'utf8');

  assert.match(html, /\.hero-metal-layer\{[^}]*position:absolute[^}]*top:-14px[^}]*bottom:auto;[^}]*pointer-events:none[^}]*mix-blend-mode:screen[^}]*isolation:auto/s);
  assert.match(html, /\.hero-kicker\.title-glow\{[^}]*color:var\(--ink\)[^}]*isolation:auto[^}]*background:none[^}]*-webkit-text-fill-color:currentColor[^}]*text-shadow:none/s);
  assert.match(html, /\.hero-kicker\.fade-in\{opacity:1;transform:none\}/);
  assert.match(html, /\.hero-kicker\.title-glow\.metal-shader-ready\s+\.hero-title-line\{visibility:hidden\}/);
  assert.doesNotMatch(html, /html\.hero-title-pending \.hero-kicker\.title-glow\{visibility:hidden\}/);
  assert.match(html, /html\.hero-title-effect \.hero-kicker\.title-glow \.hero-title-line\{visibility:hidden\}/);
  assert.match(html, /\.hero-kicker\.title-glow\.metal-shader-ready \.hero-metal-layer\{visibility:visible;opacity:\.92\}/);
  assert.match(html, /\.hero-metal-layer\{[^}]*top:-14px;bottom:auto;[^}]*height:var\(--metal-mask-height\)/s);
  assert.match(html, /@media \(min-width:901px\)\{[\s\S]*?\.hero-kicker\.title-glow \.hero-title-line\{[^}]*background-clip:text/s);
  assert.match(adapter, /state\.title\?\.classList\.remove\('metal-shader-ready'\)/);
  assert.doesNotMatch(html, /\.hero-metal-pending/);
  assert.doesNotMatch(html, /\.hero-kicker\.title-glow::before\{/);
  assert.match(html, /@media \(prefers-reduced-motion:reduce\)[\s\S]*?\.hero-metal-layer\{display:none\}/);
});

test('手机真实标题不等待图片或 WebGL，且不加载特效资源', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /<p class="hero-kicker[^\"]*title-glow[^\"]*"[^>]*><span class="hero-title-line">UX Experience<\/span><span class="hero-title-line">Designer<\/span><\/p>/);
  assert.match(html, /@media \(max-width:900px\)[\s\S]*?\.hero-kicker\.title-glow \.hero-title-line\{[^}]*-webkit-text-fill-color:currentColor/);
  assert.doesNotMatch(html, /hero-title-mobile\.webp/);

  const loader = await readFile(new URL('../hero-metal-loader.mjs', import.meta.url), 'utf8');
  const appended = [];
  let onViewportChange;
  const screen = { matches: false, addEventListener(type, callback) { onViewportChange = callback; } };
  const document = {
    readyState: 'complete',
    createElement: () => ({ onload: null, onerror: null, src: '' }),
    body: { append(node) { appended.push(node); } },
  };
  vm.runInNewContext(loader, { document, matchMedia: () => screen, globalThis: {} });
  assert.equal(appended.length, 0);
  screen.matches = true;
  onViewportChange();
  assert.equal(appended[0]?.src, 'vendor/paper-liquid-metal-0.0.78.iife.js');
});

test('桌面静态金属字给下伸笔画留绘制空间且不改变两行间距', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const rule = html.match(/@media \(min-width:901px\)\{\s*\.hero-kicker\.title-glow \.hero-title-line\{([^}]*)\}/)?.[1];
  assert.ok(rule);
  const padding = rule.match(/padding-bottom:\s*([\d.]+)em/)?.[1];
  const margin = rule.match(/margin-bottom:\s*-([\d.]+)em/)?.[1];
  assert.ok(Number(padding) >= .12, '下伸笔画需要额外绘制空间');
  assert.equal(margin, padding, '负边距抵消新增绘制空间，保持布局位置');
});

test('桌面继续加载金属字体特效', async () => {
  const loader = await readFile(new URL('../hero-metal-loader.mjs', import.meta.url), 'utf8');
  const appended = [];
  const document = {
    readyState: 'complete',
    createElement: () => ({ onload: null, onerror: null, src: '' }),
    body: { append(node) { appended.push(node); } },
  };
  vm.runInNewContext(loader, { document, matchMedia: () => ({ matches: true, addEventListener() {} }), globalThis: {} });
  assert.equal(appended[0]?.src, 'vendor/paper-liquid-metal-0.0.78.iife.js');
  appended[0].onload();
  assert.equal(appended[1]?.src, 'hero-liquid-metal.mjs');
});

test('已加载特效的页面进入手机宽度后停止启动，回到桌面后恢复', async () => {
  const source = await readFile(new URL('../hero-liquid-metal.mjs', import.meta.url), 'utf8');
  let onWidthChange;
  let timerCount = 0;
  let idleCount = 0;
  const mobile = { matches: true, addEventListener(type, callback) { onWidthChange = callback; }, removeEventListener() {} };
  const title = {
    classList: { add() {}, remove() {} },
    closest: () => ({ classList: { contains: () => true }, addEventListener() {}, removeEventListener() {} }),
  };
  const document = {
    readyState: 'loading', hidden: false, fonts: { ready: Promise.resolve() },
    querySelector: () => title, addEventListener() {}, removeEventListener() {},
  };
  const sandbox = {
    document,
    matchMedia: query => query.includes('max-width') ? mobile : { matches: false, addEventListener() {}, removeEventListener() {} },
    requestIdleCallback() { idleCount += 1; return idleCount; },
    ResizeObserver: class { observe() {} disconnect() {} },
    setTimeout() { timerCount += 1; return timerCount; },
    clearTimeout() {},
    console,
  };
  vm.runInNewContext(source, sandbox);
  sandbox.HeroLiquidMetal.initHeroLiquidMetal();
  await Promise.resolve();
  assert.equal(idleCount, 0);
  assert.equal(timerCount, 0);

  mobile.matches = false;
  onWidthChange();
  assert.equal(timerCount, 1);
  sandbox.HeroLiquidMetal.destroyHeroLiquidMetal();
});

test('同一标题尺寸在首次特效尚未完成时只启动一次处理', async () => {
  const source = await readFile(new URL('../hero-liquid-metal.mjs', import.meta.url), 'utf8');
  let resizeCallback;
  let viewportCallback;
  let mountCount = 0;
  let resolveMount;
  let markMountStarted;
  const mountStarted = new Promise(resolve => { markMountStarted = resolve; });
  const layer = {
    style: { setProperty() {} },
    setAttribute() {},
    querySelector() { return null; },
    remove() {},
  };
  const hero = {
    classList: { contains: () => true },
    addEventListener(name, callback) { if(name === 'viewportmotionchange') viewportCallback = callback; },
    removeEventListener() {},
  };
  const title = {
    dataset: { glow: 'UX Experience\nDesigner' },
    classList: { add() {}, remove() {} },
    closest: () => hero,
    getBoundingClientRect: () => ({ width: 800 }),
    append() {},
  };
  const canvas = () => ({
    width: 0,
    height: 0,
    getContext(type) {
      if(type === 'webgl2') return {};
      return {
        measureText: () => ({ width: 150, fontBoundingBoxAscent: 80, fontBoundingBoxDescent: 20 }),
        drawImage() {},
      };
    },
    toDataURL: () => 'data:image/png;base64,AAAA',
  });
  const document = {
    readyState: 'loading',
    hidden: false,
    fonts: { ready: Promise.resolve() },
    querySelector: () => title,
    createElement: tag => tag === 'canvas' ? canvas() : layer,
    addEventListener() {},
    removeEventListener() {},
  };
  const sandbox = {
    document,
    getComputedStyle: () => ({ fontSize: '100px', lineHeight: '96px', letterSpacing: '0px', fontFamily: 'Arial', fontWeight: '800' }),
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    ResizeObserver: class { constructor(callback) { resizeCallback = callback; } observe() {} disconnect() {} },
    Image: class { set src(_) {} decode() { return Promise.resolve(); } },
    PaperLiquidMetal: {
      mount() {
        mountCount += 1;
        markMountStarted();
        return new Promise(resolve => { resolveMount = resolve; });
      },
    },
    requestAnimationFrame: callback => callback(),
    setTimeout,
    clearTimeout,
    console,
  };
  vm.runInNewContext(source, sandbox);
  sandbox.HeroLiquidMetal.initHeroLiquidMetal();
  await mountStarted;
  resizeCallback();
  viewportCallback();
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(mountCount, 1);
  resolveMount({ canvas: { setAttribute() {}, addEventListener() {} }, setSpeed() {}, dispose() {} });
  await new Promise(resolve => setTimeout(resolve, 0));
  sandbox.HeroLiquidMetal.destroyHeroLiquidMetal();
});

test('超过期限的画布不会替换静态标题，并释放图形资源', async () => {
  const source = await readFile(new URL('../hero-liquid-metal.mjs', import.meta.url), 'utf8');
  let pending = true;
  let resolveMount;
  let markStarted;
  let effectShown = false;
  let disposed = false;
  const mountStarted = new Promise(resolve => { markStarted = resolve; });
  const layer = {
    style: { setProperty() {} }, setAttribute() {}, querySelector() { return null; }, remove() {},
  };
  const title = {
    dataset: { glow: 'UX Experience\nDesigner' },
    classList: { add(value) { if(value === 'metal-shader-ready') effectShown = true; }, remove() {} },
    closest: () => ({ classList: { contains: () => true }, addEventListener() {}, removeEventListener() {} }),
    getBoundingClientRect: () => ({ width: 800 }), append() {},
  };
  const canvas = () => ({
    width: 0, height: 0,
    getContext(type) {
      if(type === 'webgl2') return {};
      return { measureText: () => ({ width: 150, fontBoundingBoxAscent: 80, fontBoundingBoxDescent: 20 }), drawImage() {} };
    },
    toDataURL: () => 'data:image/png;base64,AAAA',
  });
  const sandbox = {
    document: {
      readyState: 'loading', hidden: false, fonts: { ready: Promise.resolve() },
      querySelector: () => title, createElement: tag => tag === 'canvas' ? canvas() : layer,
      addEventListener() {}, removeEventListener() {},
    },
    getComputedStyle: () => ({ fontSize: '100px', lineHeight: '96px', letterSpacing: '0px', fontFamily: 'Arial', fontWeight: '800' }),
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    ResizeObserver: class { observe() {} disconnect() {} },
    Image: class { set src(_) {} decode() { return Promise.resolve(); } },
    HeroTitleGate: {
      canTryEffect: () => pending, isEffect: () => false,
      chooseEffect: () => pending,
      chooseFallback() {}, forceFallback() {},
    },
    PaperLiquidMetal: {
      mount() {
        markStarted();
        return new Promise(resolve => { resolveMount = resolve; });
      },
    },
    requestAnimationFrame: callback => callback(), setTimeout, clearTimeout, console,
  };
  vm.runInNewContext(source, sandbox);
  sandbox.HeroLiquidMetal.initHeroLiquidMetal();
  await mountStarted;
  pending = false;
  resolveMount({ canvas: { setAttribute() {}, addEventListener() {} }, setSpeed() {}, dispose() { disposed = true; } });
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(effectShown, false);
  assert.equal(disposed, true);
  sandbox.HeroLiquidMetal.destroyHeroLiquidMetal();
});
