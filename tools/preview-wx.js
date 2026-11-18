'use strict';
// 开发用浏览器平台替身；不会被打包到微信小游戏。
(() => {
  const callbacks = {}, canvases = [];
  const emit = (name, event) => { if (callbacks[name]) callbacks[name](event); };
  const api = {
    createCanvas() {
      const canvas = document.createElement('canvas');
      if (!canvases.length) document.body.appendChild(canvas);
      canvases.push(canvas); return canvas;
    },
    getWindowInfo: () => ({ windowWidth: innerWidth, windowHeight: innerHeight, pixelRatio: devicePixelRatio,
      safeArea: { top: 0, bottom: innerHeight } }),
    getMenuButtonBoundingClientRect: () => ({ bottom: 0, height: 0 }),
    getStorageSync: key => localStorage.getItem('wx-preview:' + key),
    setStorageSync: (key, value) => localStorage.setItem('wx-preview:' + key, value),
    createInnerAudioContext() {
      const audio = new Audio();
      return {
        set src(value) { audio.src = '/' + value; },
        set volume(value) { audio.volume = value; },
        onError(callback) { audio.addEventListener('error', callback); },
        play() { audio.play().catch(() => {}); }, stop() { audio.pause(); audio.currentTime = 0; }
      };
    },
    showModal(options) {
      const result = window.confirm(options.title + '\n\n' + options.content);
      if (options.success) options.success({ confirm: result, cancel: !result });
      if (options.complete) options.complete();
    },
    setClipboardData(options) { navigator.clipboard.writeText(options.data).then(() => options.success && options.success(), () => options.fail && options.fail()); },
    getClipboardData(options) { navigator.clipboard.readText().then(data => options.success({ data }), () => options.fail && options.fail()); }
  };
  ['TouchStart', 'TouchMove', 'TouchEnd', 'TouchCancel', 'Hide', 'Show', 'WindowResize'].forEach(name => { api['on' + name] = callback => { callbacks[name] = callback; }; });
  const app = window.GenesisStart(api);
  // 便于本地调试和跨时代视觉检查；小游戏包内不暴露这个对象。
  window.genesis = app;
  const canvas = canvases[0];
  ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'].forEach((type, i) => {
    canvas.addEventListener(type, e => {
      if (type === 'pointerdown') canvas.setPointerCapture(e.pointerId);
      emit(['TouchStart', 'TouchMove', 'TouchEnd', 'TouchCancel'][i], {
        changedTouches: [{ clientX: e.clientX, clientY: e.clientY, identifier: e.pointerId }]
      });
    });
  });
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    app.ui.scroll(e.clientX - app.ui.left, e.clientY, e.deltaY);
  }, { passive: false });
  window.addEventListener('resize', () => emit('WindowResize'));
  document.addEventListener('visibilitychange', () => emit(document.hidden ? 'Hide' : 'Show'));
  window.addEventListener('pagehide', () => emit('Hide'));
  window.addEventListener('keydown', e => { if (e.code === 'Space' && !document.hidden) { e.preventDefault(); app.game.collect(); app.ui.render(); } });
})();
