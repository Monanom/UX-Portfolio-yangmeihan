(function(root, factory){
  const api = factory();
  root.HeroVideo = api;

  if(typeof document !== 'undefined'){
    if(document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', api.initHeroVideo, { once:true });
    }else{
      api.initHeroVideo();
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function(){
  function initHeroVideo(){
    const video = document.getElementById('heroVideo');
    if(!video || video.dataset.heroVideoReady === 'true') return video || null;

    video.dataset.heroVideoReady = 'true';
    const hero = video.closest('[data-motion-viewport]');
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mobileQuery = window.matchMedia('(max-width: 900px)');
    let initialPlaybackReady = !mobileQuery.matches;
    let playAttempt = 0;

    function pauseVideo(){
      playAttempt += 1;
      video.pause();
    }

    function playVideo(){
      const attempt = ++playAttempt;
      video.style.opacity = '1';
      const result = video.play();
      if(result && typeof result.then === 'function'){
        result.catch(function(){
          if(attempt === playAttempt){
            video.style.opacity = '0';
          }
        });
      }
    }

    function syncPlayback(){
      if(motionQuery.matches){
        pauseVideo();
        try{ video.currentTime = 0; }catch(error){}
        video.style.opacity = '1';
        return;
      }
      if(document.hidden){
        pauseVideo();
        return;
      }
      if(!initialPlaybackReady) return;
      const heroActive = !hero || hero.classList.contains('motion-active');
      if(!heroActive){
        pauseVideo();
        return;
      }
      playVideo();
    }

    document.addEventListener('visibilitychange', syncPlayback);
    hero?.addEventListener('viewportmotionchange', syncPlayback);
    if(typeof motionQuery.addEventListener === 'function'){
      motionQuery.addEventListener('change', syncPlayback);
    }else{
      motionQuery.addListener(syncPlayback);
    }

    if(initialPlaybackReady){
      syncPlayback();
    }else{
      const start = function(){
        initialPlaybackReady = true;
        syncPlayback();
      };
      if(typeof window.requestIdleCallback === 'function'){
        window.requestIdleCallback(start, { timeout: 2000 });
      }else{
        setTimeout(start, 700);
      }
    }
    return video;
  }

  return { initHeroVideo };
});
