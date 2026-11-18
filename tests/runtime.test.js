'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const startGame = require('../js/app');
const createGame = require('../js/engine');
const createScene = require('../js/scene');
const { GameUI } = require('../js/ui');
const { decodeSave, encodeSave } = require('../js/save-code');
const { mockCanvas, mockAPI, mature } = require('./helpers');
const KEY = 'pixel_human_era_save_v3';

function fixture(v = { width: 375, height: 812, dpr: 3, safeTop: 44, safeBottom: 34, menuBottom: 80 }, era = 0) {
  const game = era ? mature(createGame(), era) : createGame();
  const canvas = mockCanvas();
  const scene = createScene(mockCanvas(), game);
  const noop = () => {};
  const ui = new GameUI(canvas, game, scene, { save: noop, prestige: noop, reset: noop, exportSave: noop, importSave: noop }, v);
  ui.render(); return { ui, game, canvas };
}

test('七个时代、五个页签在小屏、刘海屏和平板上均可绘制与滚动', () => {
  const sizes = [
    { width: 320, height: 568, dpr: 2 },
    { width: 1440, height: 800, dpr: 2 },
    { width: 375, height: 667, dpr: 2 },
    { width: 393, height: 852, dpr: 3, safeTop: 59, menuBottom: 95, safeBottom: 34 },
    { width: 1024, height: 1366, dpr: 2, safeTop: 24, safeBottom: 20, menuBottom: 60 }
  ];
  for (let era = 0; era <= 6; era++) for (const size of sizes) {
    const { ui } = fixture(size, era);
    for (const tab of ['evo', 'bld', 'tech', 'prestige', 'sys']) {
      ui.changeTab(tab); ui.render();
      assert(ui.list.h >= 44, `${size.width}: list too short`);
      assert(ui.list.y + ui.list.h <= ui.height);
      ui.hits.forEach(r => {
        assert(r.x >= 0 && r.x + r.w <= ui.width + 1);
        assert(r.y >= 0 && r.y + r.h <= ui.height + 1);
      });
      const top = ui.list.y + 20, scale = ui.scale, listX = ui.left + ui.list.x + 20;
      ui.touchStart(listX, top * scale, 1);
      ui.touchMove(listX, (top - 90) * scale, 1);
      ui.touchEnd(listX, (top - 90) * scale, 1);
      assert.equal(ui.game.save.world.clicks, 0);
      if (ui.maxScroll > 0) assert(ui.scrolls[tab] > 0);
    }
  }
});

test('触摸采集仅触发一次，滑动、取消、多点和移出目标不触发采集', () => {
  const { ui, game } = fixture();
  const stageX = 40, stageY = 190;
  ui.touchStart(stageX, stageY, 1); ui.touchEnd(stageX, stageY, 1);
  assert.equal(game.save.world.clicks, 1);
  ui.touchStart(stageX, stageY, 1); ui.touchMove(stageX, stageY + 50, 1); ui.touchEnd(stageX, stageY + 50, 1);
  ui.touchStart(stageX, stageY, 1); ui.touchCancel(); ui.touchEnd(stageX, stageY, 1);
  ui.touchStart(stageX, stageY, 1); ui.touchEnd(stageX, stageY, 2); ui.touchCancel();
  assert.equal(game.save.world.clicks, 1);
});

test('启动创建正确画布、30秒存档、切后台暂停、回来仅结算一次', () => {
  const originalNow = Date.now; let now = 1700000000000;
  Date.now = () => now;
  try {
    const mock = mockAPI();
    const app = startGame(mock.api, mock.schedule);
    assert.equal(mock.canvases.length, 2);
    assert.equal(mock.canvases[0].width, 1125);
    assert.equal(mock.canvases[1].width, 64);
    app.game.save.world.techs.evo_organelle = true;
    app.game.save.world.techs.evo_membrane = true;
    now += 30000; mock.frames.shift()();
    assert(mock.writes.length >= 2);
    mock.events.Hide(); const before = app.game.save.world.res.rna;
    now += 60000; mock.frames.shift()();
    assert.equal(app.game.save.world.res.rna, before);
    mock.events.Show();
    const after = app.game.save.world.res.rna;
    assert(after > before);
    mock.events.Show(); assert.equal(app.game.save.world.res.rna, after);
    assert.equal(JSON.parse(mock.storage[KEY]).lastActiveAt, now);
    mock.api.setStorageSync = () => { throw new Error('full'); };
    assert.equal(app.save(true), false);
    assert.match(app.ui.toastMessage, /保存失败/);
  } finally { Date.now = originalNow; }
});

test('导入有效存档需确认，取消或非法存档不替换进度；导出可回读', () => {
  const mock = mockAPI(), app = startGame(mock.api, mock.schedule);
  app.game.collect();
  app.actions.exportSave(); app.ui.dialog.confirm(); app.ui.closeDialog(); assert.equal(decodeSave(mock.api.clipboard).world.clicks, 1);
  const raw = JSON.parse(JSON.stringify(app.game.save)); raw.world.clicks = 99;
  mock.api.clipboard = encodeSave(raw);
  app.actions.importSave();
  assert.equal(app.game.save.world.clicks, 1);
  app.ui.closeDialog();
  assert.equal(app.game.save.world.clicks, 1);
  app.actions.importSave(); app.ui.dialog.confirm();
  assert.equal(app.game.save.world.clicks, 99);
  mock.api.clipboard = 'invalid'; app.actions.importSave();
  assert.equal(app.game.save.world.clicks, 99);
  app.actions.reset(); app.ui.closeDialog();
  assert.equal(app.game.save.world.clicks, 99);
  app.actions.reset(); app.ui.dialog.confirm();
  assert.equal(app.game.save.world.clicks, 0);
});

test('损坏存档进入新局前保留原始备份', () => {
  const mock = mockAPI(); mock.storage[KEY] = '{bad json';
  const app = startGame(mock.api, mock.schedule);
  assert.equal(mock.storage[KEY + '_unreadable'], '{bad json');
  assert.equal(app.game.save.world.eraIndex, 0);
});

test('开发者工具导入根目录后能通过 game.js 初始化并处理微信触摸事件', () => {
  const mock = mockAPI();
  assert.equal(require('../project.config.json').compileType, 'game');
  assert.equal(require('../game.json').deviceOrientation, 'portrait');
  global.wx = mock.api;
  global.requestAnimationFrame = mock.schedule;
  try {
    require('../game');
    const event = { changedTouches: [{ clientX: 40, clientY: 200, identifier: 1 }] };
    mock.events.TouchStart(event);
    mock.events.TouchEnd(event);
    mock.events.Hide();
    assert.equal(JSON.parse(mock.storage[KEY]).world.clicks, 1);
  } finally {
    delete global.wx;
    delete global.requestAnimationFrame;
  }
});
