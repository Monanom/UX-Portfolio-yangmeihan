function seededRandom(seed){
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let next = value;
    next = Math.imul(next ^ next >>> 15, next | 1);
    next ^= next + Math.imul(next ^ next >>> 7, next | 61);
    return ((next ^ next >>> 14) >>> 0) / 4294967296;
  };
}

function createStars(width, height, count, seed = 20260805){
  const random = seededRandom(seed + Math.round(width) * 17 + Math.round(height) * 31);
  return Array.from({ length: count }, (_, index) => {
    const group = index % 4;
    const column = group % 2;
    const row = Math.floor(group / 2);
    return {
      x: Math.round(((column + random()) * width / 2) * 100) / 100,
      y: Math.round(((row + random()) * height / 2) * 100) / 100,
      radius: Math.round((.45 + random() * 1.75) * 100) / 100,
      baseAlpha: Math.round((.018 + random() * .052) * 1000) / 1000,
      peakAlpha: Math.round((.44 + random() * .46) * 1000) / 1000,
      group,
    };
  });
}

function createStarsForViewport(width, height, seed = 20260805){
  return createStars(width, height, width <= 560 ? 22 : 40, seed);
}

function starGroupIntensity(group, time, staticFrame = false){
  if(staticFrame) return group === 0 ? .72 : 0;
  const groupDuration = 1700;
  const groupCount = 4;
  const cyclePosition = ((time / groupDuration) % groupCount + groupCount) % groupCount;
  const currentGroup = Math.floor(cyclePosition);
  const nextGroup = (currentGroup + 1) % groupCount;
  const progress = cyclePosition - currentGroup;
  const eased = progress * progress * (3 - 2 * progress);
  if(group === currentGroup) return 1 - eased;
  if(group === nextGroup) return eased;
  return 0;
}

function createParticles(width, height, count, seed = 8086){
  const random = seededRandom(seed + Math.round(width) * 13 + Math.round(height) * 19);
  return Array.from({ length: count }, (_, index) => ({
    x: width * (.26 + random() * .48),
    y: random() * height,
    radius: .55 + random() * 1.55,
    alpha: .14 + random() * .64,
    speed: .008 + random() * .027,
    drift: (random() - .5) * .009,
    phase: random() * Math.PI * 2,
    cycle: index,
  }));
}

function createParticlesForViewport(width, height, seed = 8086){
  return createParticles(width, height, width <= 560 ? 8 : 10, seed);
}

function createMicroParticles(width, height, count, seed = 8087){
  const random = seededRandom(seed + Math.round(width) * 23 + Math.round(height) * 29);
  return Array.from({ length: count }, (_, index) => ({
    x: width * (.29 + random() * .42),
    y: random() * height,
    radius: .18 + random() * .32,
    alpha: .62 + random() * .34,
    speed: .028 + random() * .018,
    drift: (random() - .5) * .005,
    phase: random() * Math.PI * 2,
    cycle: index,
    rangeMin: .29,
    rangeMax: .71,
    micro: true,
  }));
}

function createMicroParticlesForViewport(width, height, seed = 8087){
  return createMicroParticles(width, height, width <= 560 ? 8 : 12, seed);
}

function stepParticles(particles, elapsed, width, height){
  return particles.map(particle => {
    const rangeMin = particle.rangeMin ?? .26;
    const rangeMax = particle.rangeMax ?? .74;
    if(particle.y < -particle.radius * 4){
      const random = seededRandom(90210 + particle.cycle * 101 + Math.round(width));
      return {
        ...particle,
        x: width * (rangeMin + random() * (rangeMax - rangeMin)),
        y: height + random() * Math.min(120, height * .22),
        cycle: particle.cycle + particles.length,
      };
    }
    return {
      ...particle,
      x: Math.max(width * rangeMin, Math.min(width * rangeMax, particle.x + particle.drift * elapsed)),
      y: particle.y - particle.speed * elapsed,
    };
  });
}

function starGlowStyle(star, intensity){
  const coreAlpha = star.baseAlpha + (star.peakAlpha - star.baseAlpha) * intensity;
  return {
    coreAlpha,
    haloAlpha: coreAlpha * .14,
    haloRadius: star.radius * 3.6,
  };
}

function shouldEnableCursorStarlight(width, finePointer, hover, reducedMotion){
  return width > 900 && finePointer && hover && !reducedMotion;
}

function createCursorSpark(x, y, seed = Date.now()){
  const random = seededRandom(seed);
  const angle = random() * Math.PI * 2;
  const distance = 14 + random() * 22;
  const directionX = Math.cos(angle);
  const directionY = Math.sin(angle);
  const peakAlpha = .36 + random() * .48;
  return {
    x: x + directionX * distance,
    y: y + directionY * distance,
    vx: directionX * (.008 + random() * .022),
    vy: directionY * (.008 + random() * .022) - .006,
    radius: .45 + random() * 1.1,
    life: 450 + random() * 330,
    age: 0,
    alpha: peakAlpha,
    peakAlpha,
    cross: random() < .2,
    color: random() < .28 ? '#91a8ff' : '#e8edff',
  };
}

function stepCursorSparks(sparks, elapsed){
  return sparks.map(spark => {
    const age = spark.age + elapsed;
    const remaining = Math.max(0, 1 - age / spark.life);
    return {
      ...spark,
      x: spark.x + spark.vx * elapsed,
      y: spark.y + spark.vy * elapsed,
      age,
      alpha: spark.peakAlpha * remaining * remaining,
    };
  }).filter(spark => spark.age < spark.life).slice(-12);
}

function startAmbientField(){
  const canvas = document.getElementById('dotField');
  const cursorCanvas = document.getElementById('cursorStarlight');
  const footer = document.getElementById('contact');
  const hero = document.getElementById('top');
  if(!canvas || !footer || !hero) return;

  const context = canvas.getContext('2d');
  const cursorContext = cursorCanvas?.getContext('2d');
  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointerQuery = matchMedia('(pointer: fine)');
  const hoverQuery = matchMedia('(hover: hover)');
  let width = 0;
  let height = 0;
  let stars = [];
  let particles = [];
  let microParticles = [];
  let particleHeight = 0;
  let frame = 0;
  let previousTime = 0;
  let cursorSparks = [];
  let lastPointer = null;
  let sparkSeed = 1;

  function cursorStarlightEnabled(){
    return Boolean(cursorContext) && shouldEnableCursorStarlight(
      width,
      finePointerQuery.matches,
      hoverQuery.matches,
      motionQuery.matches,
    );
  }

  function resizeCanvas(targetCanvas, targetContext, density){
    if(!targetCanvas || !targetContext) return;
    targetCanvas.width = Math.round(width * density);
    targetCanvas.height = Math.round(height * density);
    targetCanvas.style.width = `${width}px`;
    targetCanvas.style.height = `${height}px`;
    targetContext.setTransform(density, 0, 0, density, 0, 0);
  }

  function resize(){
    width = innerWidth;
    height = innerHeight;
    const density = Math.min(devicePixelRatio || 1, 2);
    resizeCanvas(canvas, context, density);
    resizeCanvas(cursorCanvas, cursorContext, density);
    stars = createStarsForViewport(width, height);
    particleHeight = Math.max(footer.offsetHeight, 560);
    particles = createParticlesForViewport(width, particleHeight);
    microParticles = createMicroParticlesForViewport(width, particleHeight);
    cursorSparks = [];
    lastPointer = null;
    render(performance.now(), 0, true);
  }

  function drawStar(star, time, staticFrame){
    const intensity = starGroupIntensity(star.group, time, staticFrame);
    const style = starGlowStyle(star, intensity);
    context.save();
    context.globalCompositeOperation = 'lighter';
    context.globalAlpha = style.haloAlpha;
    context.fillStyle = '#7698ff';
    context.beginPath();
    context.arc(star.x, star.y, style.haloRadius, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = style.coreAlpha;
    context.fillStyle = '#d7e1ff';
    context.beginPath();
    context.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function drawParticle(particle, footerRect, time, staticFrame){
    const screenY = footerRect.top + particle.y;
    if(screenY < -8 || screenY > height + 8) return;
    const shimmerRange = particle.micro ? .08 : .12;
    const shimmer = staticFrame ? 0 : Math.sin(time * .001 + particle.phase) * shimmerRange;
    const alpha = Math.max(.08, Math.min(.96, particle.alpha + shimmer));
    if(particle.micro){
      context.save();
      context.globalCompositeOperation = 'lighter';
      context.globalAlpha = alpha * .2;
      context.fillStyle = '#7698ff';
      context.beginPath();
      context.arc(particle.x, screenY, particle.radius * 2.6, 0, Math.PI * 2);
      context.fill();
      context.globalAlpha = alpha;
      context.fillStyle = '#f2f5ff';
      context.beginPath();
      context.arc(particle.x, screenY, particle.radius, 0, Math.PI * 2);
      context.fill();
      context.restore();
      return;
    }
    context.globalAlpha = alpha;
    context.fillStyle = '#e8edff';
    context.beginPath();
    context.arc(particle.x, screenY, particle.radius, 0, Math.PI * 2);
    context.fill();
  }

  function drawCursorSpark(spark){
    if(!cursorContext) return;
    cursorContext.save();
    cursorContext.globalCompositeOperation = 'lighter';
    cursorContext.fillStyle = spark.color;
    cursorContext.globalAlpha = spark.alpha * .16;
    cursorContext.beginPath();
    cursorContext.arc(spark.x, spark.y, spark.radius * 4, 0, Math.PI * 2);
    cursorContext.fill();
    cursorContext.globalAlpha = spark.alpha;
    cursorContext.beginPath();
    cursorContext.arc(spark.x, spark.y, spark.radius, 0, Math.PI * 2);
    cursorContext.fill();
    if(spark.cross){
      const ray = spark.radius * 3.6;
      cursorContext.strokeStyle = spark.color;
      cursorContext.lineWidth = .6;
      cursorContext.globalAlpha = spark.alpha * .66;
      cursorContext.beginPath();
      cursorContext.moveTo(spark.x - ray, spark.y);
      cursorContext.lineTo(spark.x + ray, spark.y);
      cursorContext.moveTo(spark.x, spark.y - ray);
      cursorContext.lineTo(spark.x, spark.y + ray);
      cursorContext.stroke();
    }
    cursorContext.restore();
  }

  function renderCursorSparks(elapsed, staticFrame){
    if(!cursorContext) return;
    cursorContext.clearRect(0, 0, width, height);
    if(staticFrame || !cursorStarlightEnabled()) return;
    cursorSparks = stepCursorSparks(cursorSparks, elapsed);
    cursorSparks.forEach(drawCursorSpark);
  }

  function render(time, elapsed, staticFrame = false){
    context.clearRect(0, 0, width, height);
    const heroBottom = hero.getBoundingClientRect().bottom;
    context.save();
    context.beginPath();
    context.rect(0, Math.max(0, heroBottom), width, height);
    context.clip();
    stars.forEach(star => drawStar(star, time, staticFrame));

    const footerRect = footer.getBoundingClientRect();
    const footerVisible = footerRect.bottom > 0 && footerRect.top < height;
    if(footerVisible){
      if(!staticFrame){
        particles = stepParticles(particles, elapsed, width, particleHeight);
        microParticles = stepParticles(microParticles, elapsed, width, particleHeight);
      }
      particles.forEach(particle => drawParticle(particle, footerRect, time, staticFrame));
      microParticles.forEach(particle => drawParticle(particle, footerRect, time, staticFrame));
    }
    context.restore();
    context.globalAlpha = 1;
    renderCursorSparks(elapsed, staticFrame);
  }

  function animate(time){
    if(document.hidden || motionQuery.matches) return;
    frame = requestAnimationFrame(animate);
    if(time - previousTime < 1000 / 30) return;
    const elapsed = Math.min(50, previousTime ? time - previousTime : 16);
    previousTime = time;
    render(time, elapsed);
  }

  function syncMotion(){
    cancelAnimationFrame(frame);
    previousTime = 0;
    if(document.hidden || motionQuery.matches){
      cursorSparks = [];
      lastPointer = null;
      cursorContext?.clearRect(0, 0, width, height);
    }
    if(motionQuery.matches){
      render(performance.now(), 0, true);
    }else if(!document.hidden){
      frame = requestAnimationFrame(animate);
    }
  }

  function syncCursorPolicy(){
    if(cursorStarlightEnabled()) return;
    cursorSparks = [];
    lastPointer = null;
    cursorContext?.clearRect(0, 0, width, height);
  }

  function handlePointerMove(event){
    if(!cursorStarlightEnabled()){
      lastPointer = null;
      return;
    }
    const pointer = { x: event.clientX, y: event.clientY };
    if(!lastPointer){
      cursorSparks = [...cursorSparks, createCursorSpark(pointer.x, pointer.y, sparkSeed++)].slice(-12);
      lastPointer = pointer;
      return;
    }
    const distance = Math.hypot(pointer.x - lastPointer.x, pointer.y - lastPointer.y);
    if(distance < 10) return;
    const count = distance >= 28 ? 2 : 1;
    const additions = Array.from({ length: count }, () => createCursorSpark(pointer.x, pointer.y, sparkSeed++));
    cursorSparks = [...cursorSparks, ...additions].slice(-12);
    lastPointer = pointer;
  }

  addEventListener('resize', resize, { passive: true });
  addEventListener('pointermove', handlePointerMove, { passive: true });
  addEventListener('pointerleave', () => { lastPointer = null; }, { passive: true });
  addEventListener('scroll', () => {
    if(motionQuery.matches) render(performance.now(), 0, true);
  }, { passive: true });
  document.addEventListener('visibilitychange', syncMotion);
  motionQuery.addEventListener?.('change', syncMotion);
  finePointerQuery.addEventListener?.('change', syncCursorPolicy);
  hoverQuery.addEventListener?.('change', syncCursorPolicy);
  resize();
  syncMotion();
}

globalThis.AmbientField = {
  createMicroParticles,
  createMicroParticlesForViewport,
  createParticles,
  createParticlesForViewport,
  createStars,
  createStarsForViewport,
  createCursorSpark,
  shouldEnableCursorStarlight,
  starGlowStyle,
  starGroupIntensity,
  stepCursorSparks,
  stepParticles,
};

if(typeof document !== 'undefined') startAmbientField();
