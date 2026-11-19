'use strict';

/**
 * 微信小程序平台能力适配层
 * 负责安全区与胶囊几何计算、5 类 8-bit 音效播放、本地存档读写与备份、剪贴板操作
 */

/**
 * 计算视口、安全区与右上角胶囊避让几何信息
 * @param {object} api wx 全局对象或模拟对象
 * @returns {object}
 */
function getViewport(api) {
  const info = api.getWindowInfo ? api.getWindowInfo() : (api.getSystemInfoSync ? api.getSystemInfoSync() : {});
  const winW = info.windowWidth || 375;
  const winH = info.windowHeight || 667;
  const dpr = Math.min(info.pixelRatio || 1, 3);
  const safe = info.safeArea || {};
  const safeTop = safe.top !== undefined ? safe.top : (info.statusBarHeight || 0);
  const safeBottom = Math.max(0, winH - (safe.bottom || winH));

  let menu = { top: safeTop, bottom: safeTop, height: 0, left: winW, right: winW, width: 0 };
  try {
    if (api.getMenuButtonBoundingClientRect) {
      const m = api.getMenuButtonBoundingClientRect();
      if (m && m.height > 0) menu = m;
    }
  } catch (_) {}

  const isWide = winW >= 768;
  // 窄屏端把顶部时代名称排在胶囊左侧；宽屏端将整体头部下移至胶囊下方避免右上角 KPI 被遮挡
  const hasCapsule = menu.height > 0 && menu.left < winW;
  const headerTopPad = isWide
    ? (hasCapsule ? Math.max(safeTop, menu.bottom + 4) : Math.max(safeTop, 8))
    : (hasCapsule ? Math.max(4, menu.top) : Math.max(4, safeTop));
  const capsuleOccupyWidth = (!isWide && hasCapsule) ? Math.max(0, winW - menu.left + 8) : 0;
  const capsuleRowHeight = (!isWide && hasCapsule) ? menu.height : 0;

  return {
    width: winW,
    height: winH,
    dpr,
    safeTop,
    safeBottom,
    menu,
    isWide,
    headerTopPad,
    capsuleOccupyWidth,
    capsuleRowHeight,
    shellBottomPad: Math.max(4, safeBottom)
  };
}

/**
 * 创建小程序音效池（使用包内 /assets/audio/*.wav）
 * @param {object} api
 * @param {Function} isSoundEnabled 判断是否开启音效
 * @returns {{play: Function, stop: Function}}
 */
function createSound(api, isSoundEnabled) {
  const pools = {};
  const names = new Set(['click', 'build', 'tech', 'era', 'nuke']);

  function play(name) {
    if (typeof isSoundEnabled === 'function' && !isSoundEnabled()) return;
    if (!api || !api.createInnerAudioContext || !names.has(name)) return;
    try {
      if (!pools[name]) {
        pools[name] = [0, 1].map(() => {
          const audio = api.createInnerAudioContext();
          audio.src = `/assets/audio/${name}.wav`;
          audio.volume = name === 'click' ? 0.22 : 0.35;
          if (audio.onError) audio.onError(() => {});
          return audio;
        });
        pools[name].next = 0;
      }
      const pool = pools[name];
      const audio = pool[pool.next++ % pool.length];
      audio.stop();
      audio.play();
    } catch (_) {
      /* 音效异常不阻断主循环 */
    }
  }

  function stop() {
    for (const key of Object.keys(pools)) {
      for (const audio of pools[key]) {
        try { audio.stop(); } catch (_) {}
      }
    }
  }

  return { play, stop };
}

/**
 * 读取本地存档并校验
 * @param {object} api
 * @param {string} key
 * @returns {{parsed: object|null, corrupt: boolean, backedUp: boolean}}
 */
function readStorageSave(api, key) {
  if (!api || !api.getStorageSync) return { parsed: null, corrupt: false, backedUp: false };
  const raw = api.getStorageSync(key);
  if (!raw) return { parsed: null, corrupt: false, backedUp: false };
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!parsed || typeof parsed !== 'object' || !parsed.world) {
      throw new Error('Invalid save object');
    }
    return { parsed, corrupt: false, backedUp: false };
  } catch (_) {
    let backedUp = false;
    try {
      api.setStorageSync(`${key}_unreadable`, raw);
      backedUp = true;
    } catch (_) {}
    return { parsed: null, corrupt: true, backedUp };
  }
}

/**
 * 写入本地存档
 * @param {object} api
 * @param {string} key
 * @param {object} data
 * @returns {boolean}
 */
function writeStorageSave(api, key, data) {
  if (!api || !api.setStorageSync) return false;
  try {
    api.setStorageSync(key, JSON.stringify(data));
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * 移除本地存档
 * @param {object} api
 * @param {string} key
 */
function removeStorageSave(api, key) {
  if (!api || !api.removeStorageSync) return;
  try { api.removeStorageSync(key); } catch (_) {}
}

module.exports = {
  getViewport,
  createSound,
  readStorageSave,
  writeStorageSave,
  removeStorageSave
};
