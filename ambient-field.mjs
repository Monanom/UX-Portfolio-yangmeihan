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

export function createStars(width, height, count, seed = 20260805){
  const random = seededRandom(seed + Math.round(width) * 17 + Math.round(height) * 31);
  return Array.from({ length: count }, () => {
    const animated = random() < .5;
    return {
      x: Math.round(random() * width * 100) / 100,
      y: Math.round(random() * height * 100) / 100,
      radius: Math.round((.45 + random() * 1.75) * 100) / 100,
      alpha: Math.round((.06 + random() * .8) * 100) / 100,
      phase: random() * Math.PI * 2,
      twinkle: animated ? .04 + random() * .18 : 0,
      speed: .00035 + random() * .00075,
    };
  });
}

export function createStarsForViewport(width, height, seed = 20260805){
  return createStars(width, height, width <= 560 ? 22 : 40, seed);
}

export function createParticles(width, height, count, seed = 8086){
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

export function stepParticles(particles, elapsed, width, height){
  return particles.map(particle => {
    if(particle.y < -particle.radius * 4){
      const random = seededRandom(90210 + particle.cycle * 101 + Math.round(width));
      return {
        ...particle,
        x: width * (.26 + random() * .48),
        y: height + random() * Math.min(120, height * .22),
        cycle: particle.cycle + particles.length,
      };
    }
    return {
      ...particle,
      x: Math.max(width * .26, Math.min(width * .74, particle.x + particle.drift * elapsed)),
      y: particle.y - particle.speed * elapsed,
    };
  });
}

function startAmbientField(){
  const canvas = document.getElementById('dotField');
  const footer = document.getElementById('contact');
  const hero = document.getElementById('top');
  if(!canvas || !footer || !hero) return;

  const context = canvas.getContext('2d');
  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  let width = 0;
  let height = 0;
  let stars = [];
  let particles = [];
  let particleHeight = 0;
  let frame = 0;
  let previousTime = 0;

  function resize(){
    width = innerWidth;
    height = innerHeight;
    const density = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * density);
    canvas.height = Math.round(height * density);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(density, 0, 0, density, 0, 0);
    stars = createStarsForViewport(width, height);
    particleHeight = Math.max(footer.offsetHeight, 560);
    particles = createParticles(width, particleHeight, width <= 560 ? 14 : 26);
    render(performance.now(), 0, true);
  }

  function drawStar(star, time, staticFrame){
    const pulse = staticFrame ? 0 : Math.sin(time * star.speed + star.phase) * star.twinkle;
    context.globalAlpha = Math.max(.03, Math.min(.92, star.alpha + pulse));
    context.fillStyle = '#d7e1ff';
    context.beginPath();
    context.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    context.fill();
  }

  function drawParticle(particle, footerRect, time, staticFrame){
    const screenY = footerRect.top + particle.y;
    if(screenY < -8 || screenY > height + 8) return;
    const shimmer = staticFrame ? 0 : Math.sin(time * .001 + particle.phase) * .12;
    context.globalAlpha = Math.max(.08, Math.min(.9, particle.alpha + shimmer));
    context.fillStyle = '#e8edff';
    context.beginPath();
    context.arc(particle.x, screenY, particle.radius, 0, Math.PI * 2);
    context.fill();
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
      if(!staticFrame) particles = stepParticles(particles, elapsed, width, particleHeight);
      particles.forEach(particle => drawParticle(particle, footerRect, time, staticFrame));
    }
    context.restore();
    context.globalAlpha = 1;
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
    if(motionQuery.matches){
      render(performance.now(), 0, true);
    }else if(!document.hidden){
      frame = requestAnimationFrame(animate);
    }
  }

  addEventListener('resize', resize, { passive: true });
  addEventListener('scroll', () => {
    if(motionQuery.matches) render(performance.now(), 0, true);
  }, { passive: true });
  document.addEventListener('visibilitychange', syncMotion);
  motionQuery.addEventListener?.('change', syncMotion);
  resize();
  syncMotion();
}

if(typeof document !== 'undefined') startAmbientField();
