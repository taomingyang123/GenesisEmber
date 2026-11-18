'use strict';
const createGame = require('./engine');
const createScene = require('./scene');
const { GameUI } = require('./ui');
const { getViewport, createSound } = require('./platform');
const { encodeSave, decodeSave } = require('./save-code');
const SAVE_KEY = 'pixel_human_era_save_v3';

module.exports = function startGame(api, schedule) {
  // 必须首先创建屏幕 Canvas，然后创建像素舞台的离屏 Canvas。
  const canvas = api.createCanvas();
  const sound = createSound(api);
  let ui, active = true, hiddenAt = null, frame = 0;
  let last = Date.now(), accumulator = 0, lastSave = last;
  let startupMessage = '';
  const toast = msg => { if (ui) ui.toast(msg); else startupMessage = msg; };
  const game = createGame({ toast, sound: sound.play, float: (label, color) => { if (ui) ui.float(label, color); } });
  function save(notify = false) {
    const previous = game.save.lastActiveAt;
    // 已在后台时，不能把离开时间提前到新的保存时间，避免丢失离线收益。
    game.save.lastActiveAt = hiddenAt === null ? Date.now() : hiddenAt;
    try {
      api.setStorageSync(SAVE_KEY, JSON.stringify(game.save));
      lastSave = Date.now();
      if (notify) toast('游戏进度已保存');
      return true;
    } catch (_) {
      game.save.lastActiveAt = previous;
      toast('保存失败，请检查微信存储空间');
      return false;
    }
  }
  function confirm(title, content, label, tone, callback) {
    ui.openDialog({ title, body: content, label, tone, confirm() { ui.closeDialog(); callback(); } });
  }
  try {
    const raw = api.getStorageSync(SAVE_KEY);
    if (raw) {
      const elapsed = game.load(typeof raw === 'string' ? JSON.parse(raw) : raw);
      if (elapsed >= 5) startupMessage = `欢迎回来！已结算 ${Math.floor(elapsed / 60)} 分钟离线收益`;
    }
  } catch (_) {
    let backedUp = false;
    try { api.setStorageSync(SAVE_KEY + '_unreadable', api.getStorageSync(SAVE_KEY)); backedUp = true; } catch (_) {}
    startupMessage = backedUp ? '本地存档无法读取，已备份原数据并进入新游戏。' : '本地存档无法读取，且备份失败，请检查微信存储空间。';
  }

  const actions = {
    save,
    prestige() {
      if (!game.canPrestigeNow()) return;
      confirm('🚀 启动恒星际文明跃迁 (Prestige)', `重置当前世界并获得 ${game.calcPrestigeGain()} 枚余烬，保留永久天赋。`, '确认跃迁', 'purple', () => { game.prestige(); save(); ui.scrolls = {}; });
    },
    reset() {
      confirm('⚠️ 确认清空全部存档？', '此操作将彻底清除当前进度与创世余烬并从头开始，无法撤销！', '🗑️ 确认清空', 'rose', () => {
        game.reset(); ui.scrolls = {}; ui.floats = []; ui.changeTab('evo');
        if (save()) toast('已重置全部进度');
      });
    },
    exportSave() {
      const code = encodeSave({ ...game.save, lastActiveAt: Date.now() });
      ui.openDialog({ title: '📤 导出跨设备存档码', body: '请复制下方 Base64 存档码，在另一台设备点击【导入存档码】即可同步进度。', code,
        cancel: '关闭', label: '📋 复制存档码', tone: 'sky', confirm() {
          api.setClipboardData({data: code, success: () => toast('📋 存档码已复制到剪贴板！'), fail: () => toast('复制失败，请重试')});
        }
      });
    },
    importSave() {
      const dialog = {title: '📥 导入存档码', body: '请在下方粘贴之前导出的 Base64 存档码。确认导入将替换当前进度。', code: '', label: '✅ 确认导入', tone: 'emerald',
        paste() {
          api.getClipboardData({success: ({data}) => { if(ui.dialog===dialog){ dialog.code=data||''; ui.render(); } }, fail: () => toast('无法读取剪贴板，请先复制有效存档码')});
        },
        confirm() {
          try {
            game.load(decodeSave(dialog.code)); ui.closeDialog(); ui.scrolls={}; ui.floats=[]; ui.changeTab('evo');
            if(save())toast('🎉 存档导入成功！');
          } catch(e) {toast(e.message);}
        }
      };
      ui.openDialog(dialog); dialog.paste();
    }
  };
  const scene = createScene(api.createCanvas(), game);
  ui = new GameUI(canvas, game, scene, actions, getViewport(api));
  if (startupMessage) ui.toast(startupMessage);
  ui.render();
  const coords = touch => [touch.clientX === undefined ? touch.x : touch.clientX, touch.clientY === undefined ? touch.y : touch.clientY, touch.identifier || 0];
  api.onTouchStart(e => { if (!active) return; if (e.changedTouches[0]) ui.touchStart(...coords(e.changedTouches[0])); });
  api.onTouchMove(e => { if (!active) return; e.changedTouches.forEach(t => ui.touchMove(...coords(t))); });
  api.onTouchEnd(e => { if (!active) return; e.changedTouches.forEach(t => ui.touchEnd(...coords(t))); });
  api.onTouchCancel(() => ui.touchCancel());
  api.onHide(() => {
    if (!active) return;
    active = false; hiddenAt = Date.now(); save(); sound.stop(); ui.touchCancel();
  });
  api.onShow(() => {
    if (hiddenAt !== null) {
      const now = Date.now();
      const elapsed = game.catchUp((now - hiddenAt) / 1000);
      hiddenAt = null; game.save.lastActiveAt = now;
      if (elapsed >= 5) ui.toast(`已结算 ${Math.floor(elapsed / 60)} 分钟离线收益`);
      save();
    }
    active = true; last = Date.now(); accumulator = 0;
    ui.resize(getViewport(api)); ui.render();
  });
  if (api.onWindowResize) api.onWindowResize(() => { ui.resize(getViewport(api)); ui.render(); });
  if (api.onAudioInterruptionBegin) api.onAudioInterruptionBegin(sound.stop);
  if (api.setPreferredFramesPerSecond) api.setPreferredFramesPerSecond(15);
  if (api.showShareMenu) api.showShareMenu({ menus: ['shareAppMessage'] });
  if (api.onShareAppMessage) api.onShareAppMessage(() => ({ title: '创世余烬：从一条 RNA，进化到星际文明' }));

  const requestFrame = schedule || requestAnimationFrame;
  function loop() {
    const now = Date.now();
    if (active) {
      accumulator += Math.max(0, (now - last) / 1000);
      // 未触发 onHide 的长卡顿也统一走追赶，不丢时间，不跑无界帧循环。
      if (accumulator > 5) { game.catchUp(accumulator); accumulator = 0; }
      while (accumulator >= 0.25) { game.tick(0.25); accumulator -= 0.25; }
      if (now - lastSave >= 30000) save();
      if (now - frame >= 1000 / 15) { ui.render(); frame = now; }
    }
    last = now;
    requestFrame(loop);
  }
  // 启动结算后立即落盘，避免连续冷启动重复领取同一段离线收益。
  save(); requestFrame(loop);
  return { game, ui, save, actions };
};
