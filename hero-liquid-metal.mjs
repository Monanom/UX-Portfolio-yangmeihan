const HERO_METAL_SETTINGS = Object.freeze({
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

function resolveBackgroundColor(color, alpha){
  if(alpha >= 1 || !/^#[0-9a-f]{6}$/i.test(color)) return color;
  const channel = Math.round(Math.max(0, alpha) * 255).toString(16).padStart(2, '0');
  return `${color}${channel}`;
}

const state = {
  title: null,
  hero: null,
  layer: null,
  controller: null,
  resizeObserver: null,
  motionQuery: null,
  mobileQuery: null,
  rebuildTimer: 0,
  generation: 0,
  initialized: false,
  layoutKey: '',
  contextLostHandler: null,
  contextRestoredHandler: null,
};

function escapeXml(value){
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function browserTextMeasurer(fontFamily, fontSize, fontWeight, letterSpacing){
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if(!context) return text => text.length * fontSize * .56;
  context.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  return text => context.measureText(text).width + Math.max(0, text.length - 1) * letterSpacing;
}

function createTextMask({
  text,
  width,
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  letterSpacing = 0,
  measureText,
  fontMetrics,
}){
  const safeWidth = Math.max(1, Math.floor(width));
  const measure = measureText ?? browserTextMeasurer(fontFamily, fontSize, fontWeight, letterSpacing);
  const lines = [];
  const paragraphs = String(text).trim().split(/\r?\n/);

  for(const paragraph of paragraphs){
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    let current = '';
    for(const word of words){
      const candidate = current ? `${current} ${word}` : word;
      if(current && measure(candidate) > safeWidth){
        lines.push(current);
        current = word;
      }else{
        current = candidate;
      }
    }
    lines.push(current);
  }

  const padding = 14;
  const ascent = fontMetrics?.ascent ?? fontSize * .8;
  const descent = fontMetrics?.descent ?? fontSize * .2;
  const halfLeading = Math.max(0, lineHeight - ascent - descent) / 2;
  const baseline = padding + halfLeading + ascent;
  const svgWidth = safeWidth + padding * 2;
  const glyphBottom = baseline + Math.max(0, lines.length - 1) * lineHeight + descent + halfLeading;
  const height = Math.max(1, Math.ceil(glyphBottom + padding));
  const textNodes = lines.map((line, index) =>
    `<text x="${padding}" y="${baseline + index * lineHeight}" fill="#fff">${escapeXml(line)}</text>`
  ).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${height}" viewBox="0 0 ${svgWidth} ${height}"><g font-family="${escapeXml(fontFamily)}" font-size="${fontSize}" font-weight="${fontWeight}" letter-spacing="${letterSpacing}">${textNodes}</g></svg>`;

  return {
    dataUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    height,
    lines,
    svg,
    width: svgWidth,
  };
}

function shouldEnableShader(reducedMotion, hidden, webgl2Available, inViewport = true){
  return !reducedMotion && !hidden && webgl2Available && inViewport;
}

function hasWebGL2(){
  try{
    return Boolean(document.createElement('canvas').getContext('webgl2'));
  }catch{
    return false;
  }
}

function effectStillWanted(){
  const gate = globalThis.HeroTitleGate;
  return !gate || gate.canTryEffect() || gate.isEffect();
}

function removeMountedLayer(){
  state.generation += 1;
  if(state.controller){
    state.controller.dispose();
    state.controller = null;
  }
  if(state.layer){
    const canvas = state.layer.querySelector('canvas');
    if(canvas && state.contextLostHandler) canvas.removeEventListener('webglcontextlost', state.contextLostHandler);
    if(canvas && state.contextRestoredHandler) canvas.removeEventListener('webglcontextrestored', state.contextRestoredHandler);
    state.layer.remove();
    state.layer = null;
  }
  state.contextLostHandler = null;
  state.contextRestoredHandler = null;
  state.title?.classList.remove('metal-shader-ready');
}

function readTitleMaskOptions(title){
  const style = getComputedStyle(title);
  const rect = title.getBoundingClientRect();
  const fontSize = parseFloat(style.fontSize);
  const lineHeight = style.lineHeight === 'normal' ? fontSize * 1.02 : parseFloat(style.lineHeight);
  const letterSpacing = style.letterSpacing === 'normal' ? 0 : parseFloat(style.letterSpacing);
  const measure = browserTextMeasurer(style.fontFamily, fontSize, style.fontWeight, letterSpacing);
  const metricCanvas = document.createElement('canvas');
  const metricContext = metricCanvas.getContext('2d');
  let fontMetrics;
  if(metricContext){
    metricContext.font = `${style.fontWeight} ${fontSize}px ${style.fontFamily}`;
    const metrics = metricContext.measureText('Hg');
    fontMetrics = {
      ascent: metrics.fontBoundingBoxAscent || metrics.actualBoundingBoxAscent || fontSize * .8,
      descent: metrics.fontBoundingBoxDescent || metrics.actualBoundingBoxDescent || fontSize * .2,
    };
  }
  return {
    text: title.dataset.glow?.trim() || 'UX Experience\nDesigner',
    width: rect.width,
    fontFamily: style.fontFamily,
    fontSize,
    fontWeight: style.fontWeight,
    lineHeight,
    letterSpacing,
    measureText: measure,
    fontMetrics,
  };
}

async function rebuildShader(){
  if(!state.title || !state.motionQuery) return;
  if(!effectStillWanted()){
    removeMountedLayer();
    return;
  }
  const inViewport = !state.hero || state.hero.classList.contains('motion-active');
  const motionAllowed = !state.mobileQuery?.matches && shouldEnableShader(state.motionQuery.matches, document.hidden, true, inViewport);
  if(!motionAllowed || !globalThis.PaperLiquidMetal?.mount){
    removeMountedLayer();
    return;
  }

  const options = readTitleMaskOptions(state.title);
  const layoutKey = `${Math.round(options.width)}:${Math.round(options.fontSize * 100)}:${Math.round(options.lineHeight * 100)}`;
  if(state.layer && layoutKey === state.layoutKey){
    state.controller?.setSpeed(HERO_METAL_SETTINGS.speed);
    return;
  }
  if(!hasWebGL2()){
    removeMountedLayer();
    return;
  }

  removeMountedLayer();
  state.layoutKey = layoutKey;
  const generation = state.generation;
  const mask = createTextMask(options);
  const layer = document.createElement('span');
  layer.className = 'hero-metal-layer';
  layer.setAttribute('aria-hidden', 'true');
  layer.style.setProperty('--metal-mask-height', `${mask.height}px`);
  state.title.append(layer);
  state.layer = layer;

  try{
    // 直接提供适合标题尺寸的位图，避免第三方对 SVG 强制放大到 4096px 后再处理。
    const maskImage = new Image();
    maskImage.src = mask.dataUrl;
    await maskImage.decode();
    if(generation !== state.generation || layer !== state.layer) return;
    const maskCanvas = document.createElement('canvas');
    const maskScale = Math.min(1.5, 1800 / mask.width);
    maskCanvas.width = Math.ceil(mask.width * maskScale);
    maskCanvas.height = Math.ceil(mask.height * maskScale);
    const maskContext = maskCanvas.getContext('2d');
    if(!maskContext) throw new Error('Text mask canvas unavailable');
    maskContext.drawImage(maskImage, 0, 0, maskCanvas.width, maskCanvas.height);
    const controller = await globalThis.PaperLiquidMetal.mount(layer, maskCanvas.toDataURL('image/png'), {
      ...HERO_METAL_SETTINGS,
      colorBack: resolveBackgroundColor(HERO_METAL_SETTINGS.colorBack, HERO_METAL_SETTINGS.backgroundAlpha),
      maxPixelCount: 900_000,
      minPixelRatio: 1.5,
      scale: 1,
    });
    if(generation !== state.generation || layer !== state.layer){
      controller.dispose();
      return;
    }
    state.controller = controller;
    // 等待画布尺寸更新和首帧绘制后，才统一显示标题。
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    if(generation !== state.generation || layer !== state.layer) return;
    if(!effectStillWanted() || (globalThis.HeroTitleGate && !globalThis.HeroTitleGate.chooseEffect())){
      removeMountedLayer();
      return;
    }
    controller.canvas.setAttribute('aria-hidden', 'true');
    state.contextLostHandler = event => {
      event.preventDefault();
      globalThis.HeroTitleGate?.forceFallback();
      state.title?.classList.remove('metal-shader-ready');
      state.controller?.setSpeed(0);
    };
    state.contextRestoredHandler = () => scheduleRebuild(true);
    controller.canvas.addEventListener('webglcontextlost', state.contextLostHandler);
    controller.canvas.addEventListener('webglcontextrestored', state.contextRestoredHandler);
    state.title.classList.add('metal-shader-ready');
  }catch(error){
    if(layer === state.layer) removeMountedLayer();
    globalThis.HeroTitleGate?.forceFallback();
    console.warn('首页金属标题特效未能启动，已保留静态标题。', error);
  }
}

function scheduleRebuild(force = false){
  if(state.mobileQuery?.matches || !effectStillWanted()) return;
  clearTimeout(state.rebuildTimer);
  if(force) state.layoutKey = '';
  // 首次显示立即准备；只有已挂载后的窗口缩放才做防抖。
  state.rebuildTimer = setTimeout(rebuildShader, state.controller ? 180 : 0);
}

function syncVisibility(){
  if(state.mobileQuery?.matches){
    removeMountedLayer();
    return;
  }
  const inViewport = !state.hero || state.hero.classList.contains('motion-active');
  if(document.hidden || !inViewport){
    state.controller?.setSpeed(0);
  }else if(state.motionQuery?.matches){
    removeMountedLayer();
  }else if(state.controller){
    state.controller.setSpeed(HERO_METAL_SETTINGS.speed);
  }else{
    scheduleRebuild();
  }
}

function syncMotionPreference(){
  if(state.mobileQuery?.matches || state.motionQuery?.matches){
    globalThis.HeroTitleGate?.forceFallback();
    removeMountedLayer();
  }else if(!document.hidden){
    scheduleRebuild();
  }
}

function syncScreenSize(){
  if(state.mobileQuery?.matches){
    globalThis.HeroTitleGate?.forceFallback();
    clearTimeout(state.rebuildTimer);
    removeMountedLayer();
  }else if(!document.hidden){
    scheduleRebuild();
  }
}

function initHeroLiquidMetal(){
  if(typeof document === 'undefined' || state.initialized) return;
  state.title = document.querySelector('.hero-kicker.title-glow');
  if(!state.title) return;
  state.initialized = true;
  state.hero = state.title.closest('[data-motion-viewport]');
  state.motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  state.mobileQuery = matchMedia('(max-width:900px)');
  state.resizeObserver = new ResizeObserver(() => scheduleRebuild());
  state.resizeObserver.observe(state.title);
  document.addEventListener('visibilitychange', syncVisibility);
  state.hero?.addEventListener('viewportmotionchange', syncVisibility);
  state.motionQuery.addEventListener?.('change', syncMotionPreference);
  state.mobileQuery.addEventListener?.('change', syncScreenSize);
  const ready = document.fonts?.ready ?? Promise.resolve();
  ready.then(() => {
    if(state.initialized) scheduleRebuild();
  });
}

function destroyHeroLiquidMetal(){
  clearTimeout(state.rebuildTimer);
  state.resizeObserver?.disconnect();
  document.removeEventListener('visibilitychange', syncVisibility);
  state.hero?.removeEventListener('viewportmotionchange', syncVisibility);
  state.motionQuery?.removeEventListener?.('change', syncMotionPreference);
  state.mobileQuery?.removeEventListener?.('change', syncScreenSize);
  removeMountedLayer();
  state.title = null;
  state.hero = null;
  state.resizeObserver = null;
  state.motionQuery = null;
  state.mobileQuery = null;
  state.initialized = false;
  state.layoutKey = '';
}

globalThis.HeroLiquidMetal = {
  createTextMask,
  destroyHeroLiquidMetal,
  initHeroLiquidMetal,
  settings: HERO_METAL_SETTINGS,
  resolveBackgroundColor,
  shouldEnableShader,
};

if(typeof document !== 'undefined'){
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initHeroLiquidMetal, { once: true });
  }else{
    initHeroLiquidMetal();
  }
}
