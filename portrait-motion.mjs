(function(global){
  'use strict';

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

  function createPortraitSchedule(seed, mobile = false){
    const random = seededRandom(seed);
    const delay = Math.round((mobile ? 12000 : 8000) + random() * (mobile ? 6000 : 4000));
    const choice = random();
    const expression = choice < .28
      ? 'gaze-left'
      : choice < .56
        ? 'gaze-right'
        : choice < .84
          ? 'blink'
          : 'smile';
    const duration = expression.startsWith('gaze')
      ? Math.round(1200 + random() * 600)
      : expression === 'blink'
        ? Math.round(120 + random() * 60)
        : 1500;
    const repeats = expression === 'blink' && random() < .2 ? 2 : 1;
    return { delay, expression, duration, repeats };
  }

  function shouldRunPortraitMotion(inViewport, pageVisible, reducedMotion){
    return Boolean(inViewport && pageVisible && !reducedMotion);
  }

  let controller = null;

  function initPortraitMotion(){
    if(typeof document === 'undefined') return null;
    destroyPortraitMotion();

    const card = document.querySelector('[data-portrait-motion]');
    if(!card) return null;
    card.setAttribute('data-motion-ready', 'true');

    const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
    let inViewport = false;
    let seed = 20260809;
    let timers = [];

    function setExpression(expression){
      card.setAttribute('data-expression', expression);
    }

    function clearTimers(){
      timers.forEach(timer => clearTimeout(timer));
      timers = [];
    }

    function later(callback, delay){
      const timer = setTimeout(callback, delay);
      timers.push(timer);
      return timer;
    }

    function canRun(){
      return shouldRunPortraitMotion(inViewport, !document.hidden, motionQuery.matches);
    }

    function queueNext(initial = false){
      if(!canRun()) return;
      const schedule = createPortraitSchedule(seed++, innerWidth <= 560);
      later(() => play(schedule), initial ? 2200 : schedule.delay);
    }

    function finishAndQueue(){
      setExpression('neutral');
      later(() => queueNext(false), 320);
    }

    function play(schedule){
      if(!canRun()){
        syncMotion();
        return;
      }

      setExpression(schedule.expression);
      if(schedule.expression === 'blink' && schedule.repeats === 2){
        later(() => setExpression('neutral'), schedule.duration);
        later(() => setExpression('blink'), schedule.duration + 115);
        later(finishAndQueue, schedule.duration * 2 + 115);
        return;
      }
      later(finishAndQueue, schedule.duration);
    }

    function syncMotion(){
      clearTimers();
      setExpression('neutral');
      if(canRun()) queueNext(true);
    }

    const observer = typeof IntersectionObserver === 'function'
      ? new IntersectionObserver(entries => {
          const entry = entries[0];
          inViewport = Boolean(entry?.isIntersecting && entry.intersectionRatio >= .12);
          syncMotion();
        }, { threshold: [.12, .3] })
      : null;

    if(observer) observer.observe(card);
    else inViewport = true;

    document.addEventListener('visibilitychange', syncMotion);
    motionQuery.addEventListener?.('change', syncMotion);
    if(!observer) syncMotion();

    controller = {
      destroy(){
        clearTimers();
        setExpression('neutral');
        card.removeAttribute('data-motion-ready');
        observer?.disconnect();
        document.removeEventListener('visibilitychange', syncMotion);
        motionQuery.removeEventListener?.('change', syncMotion);
      },
    };
    return controller;
  }

  function destroyPortraitMotion(){
    controller?.destroy();
    controller = null;
  }

  global.PortraitMotion = {
    createPortraitSchedule,
    shouldRunPortraitMotion,
    initPortraitMotion,
    destroyPortraitMotion,
  };

  if(typeof document !== 'undefined'){
    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initPortraitMotion, { once:true });
    else initPortraitMotion();
  }
})(globalThis);
