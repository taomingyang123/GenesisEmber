'use strict';

function getViewport(api) {
  const info = api.getWindowInfo ? api.getWindowInfo() : api.getSystemInfoSync();
  let menu = null;
  try { menu = api.getMenuButtonBoundingClientRect && api.getMenuButtonBoundingClientRect(); } catch (_) {}
  const safe = info.safeArea || {};
  return {
    width: info.windowWidth, height: info.windowHeight, dpr: info.pixelRatio || 1,
    safeTop: safe.top || info.statusBarHeight || 0,
    safeBottom: Math.max(0, info.windowHeight - (safe.bottom || info.windowHeight)),
    menuBottom: menu && menu.height > 0 ? menu.bottom : 0
  };
}

function createSound(api) {
  const pools = {};
  function play(name) {
    if (!api.createInnerAudioContext) return;
    try {
      if (!pools[name]) {
        pools[name] = [0, 1].map(() => {
          const audio = api.createInnerAudioContext();
          audio.src = `assets/audio/${name}.wav`;
          audio.volume = name === 'click' ? 0.22 : 0.35;
          audio.onError(() => {});
          return audio;
        });
        pools[name].next = 0;
      }
      const pool = pools[name], audio = pool[pool.next++ % pool.length];
      audio.stop(); audio.play();
    } catch (_) { /* Unsupported audio never stops the game. */ }
  }
  function stop() { Object.keys(pools).forEach(name => pools[name].forEach(a => a.stop())); }
  return { play, stop };
}
module.exports = { getViewport, createSound };
