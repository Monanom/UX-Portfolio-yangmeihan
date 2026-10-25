(function(root, factory){
  const api = factory();
  root.ViewportMotion = api;

  if(typeof document !== 'undefined'){
    if(document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', api.initViewportMotion, { once:true });
    }else{
      api.initViewportMotion();
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function(){
  function shouldRunViewportMotion(inViewport, pageVisible, reducedMotion){
    return Boolean(inViewport && pageVisible && !reducedMotion);
  }

  function initViewportMotion(){
    const targets = [...document.querySelectorAll('[data-motion-viewport]')];
    if(!targets.length || document.documentElement.dataset.viewportMotionReady === 'true') return targets;

    document.documentElement.dataset.viewportMotionReady = 'true';
    const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');

    function syncTarget(target){
      const active = shouldRunViewportMotion(
        target.dataset.motionVisible === 'true',
        !document.hidden,
        motionQuery.matches,
      );
      if(target.classList.contains('motion-active') === active) return;
      target.classList.toggle('motion-active', active);
      target.dispatchEvent(new CustomEvent('viewportmotionchange', { detail:{ active } }));
    }

    function syncAll(){
      targets.forEach(syncTarget);
    }

    if(typeof IntersectionObserver === 'function'){
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          entry.target.dataset.motionVisible = String(entry.isIntersecting);
          syncTarget(entry.target);
        });
      }, { threshold:.08 });
      targets.forEach(target => {
        target.dataset.motionVisible = 'false';
        observer.observe(target);
      });
    }else{
      targets.forEach(target => { target.dataset.motionVisible = 'true'; });
      syncAll();
    }

    document.addEventListener('visibilitychange', syncAll);
    motionQuery.addEventListener?.('change', syncAll);
    return targets;
  }

  return { initViewportMotion, shouldRunViewportMotion };
});
