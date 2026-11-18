'use strict';
const assert = require('node:assert/strict');
function mockCanvas() {
  const texts = [];
  const finite = (...args) => args.forEach(n => assert(Number.isFinite(n), `Invalid drawing coordinate ${n}`));
  const context = {
    font: '', fillStyle: '', strokeStyle: '', globalAlpha: 1, texts,
    setTransform: finite, clearRect: finite, fillRect: finite, strokeRect: finite, rect: finite,
    save() {}, restore() {}, beginPath() {}, clip() {},
    drawImage(image, ...args) { assert(image); finite(...args); },
    fillText(text, x, y) { finite(x, y); texts.push(text); },
    measureText(text) { return { width: Array.from(text).reduce((a, ch) => a + (ch.charCodeAt(0) > 255 ? 11 : 6), 0) }; }
  };
  return { width: 0, height: 0, getContext: () => context, context };
}
function mockAPI() {
  const events = {}, storage = {}, frames = [], writes = [], canvases = [];
  const api = {
    createCanvas() { const c = mockCanvas(); canvases.push(c); return c; },
    getWindowInfo: () => ({ windowWidth: 375, windowHeight: 812, pixelRatio: 3, safeArea: { top: 44, bottom: 778 } }),
    getMenuButtonBoundingClientRect: () => ({ height: 32, bottom: 80 }),
    getStorageSync: key => storage[key],
    setStorageSync(key, value) { storage[key] = value; writes.push(key); },
    showModal(options) { api.modal = options; },
    setClipboardData(options) { api.clipboard = options.data; if (options.success) options.success(); },
    getClipboardData(options) { options.success({ data: api.clipboard || '' }); }
  };
  ['TouchStart', 'TouchMove', 'TouchEnd', 'TouchCancel', 'Hide', 'Show', 'WindowResize', 'AudioInterruptionBegin'].forEach(name => { api['on' + name] = callback => { events[name] = callback; }; });
  return { api, events, storage, frames, writes, canvases, schedule: callback => frames.push(callback) };
}
function mature(game, era = 6) {
  const w = game.save.world;
  w.eraIndex = era;
  game.defs.TECHS_DEF.filter(t => t.era <= era).forEach(t => { w.techs[t.id] = true; });
  game.defs.BUILDINGS_DEF.filter(b => b.era <= era).forEach(b => { w.buildings[b.id] = b.maxCount || 3; });
  w.pop = 30; w.missionIndex = 51;
  game.tick(.25);
  game.defs.RESOURCES_DEF.forEach(r => { w.res[r.id] = game.metrics.caps[r.id]; });
  return game;
}
module.exports = { mockCanvas, mockAPI, mature };
