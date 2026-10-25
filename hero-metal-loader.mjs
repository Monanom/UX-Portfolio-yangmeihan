(function(){
  const desktop = matchMedia('(min-width:901px)');
  let loading = false;
  let loaded = false;

  function effectStillWanted(){
    const gate = globalThis.HeroTitleGate;
    return !gate || gate.canTryEffect() || gate.isEffect();
  }

  function loadDesktopEffect(){
    if(!desktop.matches || !document.body || loading || loaded || !effectStillWanted()) return;
    loading = true;
    const vendor = document.createElement('script');
    vendor.src = 'vendor/paper-liquid-metal-0.0.78.iife.js';
    vendor.onload = function(){
      if(!desktop.matches || !effectStillWanted()){
        loading = false;
        return;
      }
      const effect = document.createElement('script');
      effect.src = 'hero-liquid-metal.mjs';
      effect.onload = function(){ loaded = true; loading = false; };
      effect.onerror = function(){ loading = false; globalThis.HeroTitleGate?.chooseFallback(); };
      document.body.append(effect);
    };
    vendor.onerror = function(){ loading = false; globalThis.HeroTitleGate?.chooseFallback(); };
    document.body.append(vendor);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', loadDesktopEffect, { once:true });
  }else{
    loadDesktopEffect();
  }
  desktop.addEventListener?.('change', loadDesktopEffect);
})();
