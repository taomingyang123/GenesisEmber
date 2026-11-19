'use strict';

/**
 * 创世余烬 (Evolve 增强版) 微信小程序主页面控制器
 * 负责 250ms 固定逻辑 Tick、15 FPS 2D Canvas 舞台动画、路径级最小化 setData、
 * 前后台切换离线收益结算、30s 自动保存与全面板事件分发
 */

const { SAVE_KEY, createEvolveGame } = require('../../core/game-engine.js');
const { createSceneRenderer } = require('../../core/scene-renderer.js');
const { buildViewModel, diffViewModel, getSubTabs } = require('../../core/ui-presenter.js');
const { encodeSave, decodeSave } = require('../../core/save-code.js');
const bridge = require('../../core/evolve-bridge.js');
const dl = require('../../core/data-loader.js');
const platform = require('../../utils/platform.js');

function getWx() {
  return typeof wx !== 'undefined' ? wx : {};
}

Page({
  data: {
    viewport: {
      width: 375,
      height: 667,
      isWide: false,
      headerTopPad: 24,
      capsuleOccupyWidth: 0,
      capsuleRowHeight: 0,
      shellBottomPad: 4
    },
    themeVarsStyle: '',
    isLightTheme: false,
    crtEnabled: false,
    header: {},
    stage: {},
    leftResCount: '已解锁 2/26',
    leftRes: [],
    activeTab: 'evo',
    evoTabIcon: '🧬',
    evoTabLabel: '生命进化',
    badges: { evo: false, bld: false, tech: false, prestige: false },
    subTabs: [],
    activeSubTab: 'evo_species',
    panel: { kind: 'evo_species' },
    tabScrollTop: 0,
    floatPool: Array.from({ length: 8 }, (_, slot) => ({
      slot, text: '', color: '#6ee7b7', x: -200, y: -200, animClass: ''
    })),
    toastShow: false,
    toastMsg: '',
    modal: { open: false, title: '', lines: [], showTextarea: false, textareaValue: '', readonly: false, buttons: [] }
  },

  onLoad() {
    const api = getWx();
    this._api = api;
    this._active = true;
    this._hiddenAt = null;
    this._lastTickAt = Date.now();
    this._accumulator = 0;
    this._lastSaveAt = this._lastTickAt;
    this._lastFrameAt = 0;
    this._floatIdx = 0;
    this._floatSeq = 0;
    this._toastTimer = null;
    this._rafTimer = null;
    this._lastVm = null;
    this._modalButtons = [];
    this._canvasRect = null;
    this._sceneRenderer = null;

    this._uiState = {
      activeTab: 'evo',
      activeSubTab: 'evo_species',
      genusFilter: 'all',
      logCatFilter: 'all',
      showAllMissions: false
    };

    const viewport = platform.getViewport(api);
    this.setData({ viewport });

    const sound = platform.createSound(api, () => !!(this._game && this._game.save.settings.sound));
    this._sound = sound;

    let startupToast = '';
    const game = createEvolveGame({
      toast: msg => {
        if (this._ready) this.showToast(msg);
        else startupToast = msg;
      },
      sound: name => sound.play(name),
      float: (label, color, pos) => this.spawnFloat(label, color, pos),
      spawnParticles: (nx, ny, color) => {
        if (this._sceneRenderer) this._sceneRenderer.spawnParticles(nx, ny, color);
      }
    });
    this._game = game;

    const { parsed, corrupt, backedUp } = platform.readStorageSave(api, SAVE_KEY);
    if (parsed) {
      try {
        game.loadSaveData(parsed);
      } catch (_) {
        startupToast = '本地存档无法解析，已进入新游戏。';
      }
    } else if (corrupt) {
      startupToast = backedUp
        ? '本地存档无法读取，已备份原数据并进入新游戏。'
        : '本地存档无法读取，且备份失败，请检查微信存储空间。';
    }

    this._ready = true;
    this.syncNavigationTheme();
    this.syncUI(true);
    if (startupToast) this.showToast(startupToast);

    // 启动即落盘，避免重复领取冷启动离线收益
    this.saveGame(false);
    this.initPixelCanvas();

    if (api.onWindowResize) {
      this._onResizeHandler = () => {
        const nextVp = platform.getViewport(api);
        this.setData({ viewport: nextVp });
        this.refreshCanvasRect();
      };
      api.onWindowResize(this._onResizeHandler);
    }
    if (api.onAudioInterruptionBegin) {
      api.onAudioInterruptionBegin(() => sound.stop());
    }
    if (api.showShareMenu) {
      try { api.showShareMenu({ menus: ['shareAppMessage'] }); } catch (_) {}
    }

    this.startLoop();
  },

  onReady() {
    this.initPixelCanvas();
    this.refreshCanvasRect();
  },

  onShow() {
    if (!this._game) return;
    if (this._hiddenAt !== null) {
      const now = Date.now();
      const elapsed = (now - this._hiddenAt) / 1000;
      const settled = this._game.catchUp(elapsed);
      this._hiddenAt = null;
      this._game.save.lastActiveAt = now;
      if (settled >= 10) {
        this.showToast(`💤 已结算 ${Math.floor(settled / 60)} 分钟离线收益`);
      }
      this.saveGame(false);
      this.syncUI(true);
    }
    this._active = true;
    this._lastTickAt = Date.now();
    this._accumulator = 0;
    this.startLoop();
  },

  onHide() {
    this._active = false;
    this._hiddenAt = Date.now();
    this.stopLoop();
    this.saveGame(false);
    if (this._sound) this._sound.stop();
  },

  onUnload() {
    this._active = false;
    this.stopLoop();
    this.saveGame(false);
    if (this._sound) this._sound.stop();
    if (this._toastTimer) clearTimeout(this._toastTimer);
    if (this._api && this._api.offWindowResize && this._onResizeHandler) {
      this._api.offWindowResize(this._onResizeHandler);
    }
  },

  onShareAppMessage() {
    return {
      title: '创世余烬：从一条 RNA，进化到星际方舟文明',
      path: '/pages/index/index'
    };
  },

  initPixelCanvas() {
    if (this._canvasInited || !this.createSelectorQuery) return;
    const query = this.createSelectorQuery();
    query.select('#pixel-canvas').fields({ node: true, size: true, rect: true }).exec(res => {
      const info = res && res[0];
      if (!info || !info.node) return;
      this._canvasInited = true;
      const canvas = info.node;
      const dpr = Math.min((this.data.viewport && this.data.viewport.dpr) || 1, 2);
      const w = Math.max(64, Math.round((info.width || 112) * dpr));
      const h = Math.max(64, Math.round((info.height || 112) * dpr));
      canvas.width = w;
      canvas.height = h;
      this._canvasRect = { left: info.left || 12, top: info.top || 140, width: info.width || 112, height: info.height || 112 };

      let offCanvas = null;
      if (this._api && this._api.createOffscreenCanvas) {
        try {
          offCanvas = this._api.createOffscreenCanvas({ type: '2d', width: 64, height: 64 });
        } catch (_) {
          offCanvas = null;
        }
      }
      this._sceneRenderer = createSceneRenderer(canvas, offCanvas);
      this._sceneRenderer.render(this._game);
    });
  },

  refreshCanvasRect() {
    if (!this.createSelectorQuery) return;
    this.createSelectorQuery().select('#pixel-canvas').fields({ node: true, size: true, rect: true }).exec(res => {
      const info = res && res[0];
      if (!info) return;
      this._canvasRect = {
        left: info.left || 12,
        top: info.top || 140,
        width: info.width || 112,
        height: info.height || 112
      };
      if (info.node) {
        const dpr = Math.min((this.data.viewport && this.data.viewport.dpr) || 1, 2);
        info.node.width = Math.max(64, Math.round(this._canvasRect.width * dpr));
        info.node.height = Math.max(64, Math.round(this._canvasRect.height * dpr));
        if (this._sceneRenderer) this._sceneRenderer.render(this._game);
      }
    });
  },

  startLoop() {
    if (this._rafTimer) return;
    const step = () => {
      if (!this._active) {
        this._rafTimer = null;
        return;
      }
      const now = Date.now();
      this._accumulator += Math.max(0, (now - this._lastTickAt) / 1000);
      this._lastTickAt = now;

      let ticked = false;
      if (this._accumulator > 5) {
        this._game.catchUp(this._accumulator);
        this._accumulator = 0;
        ticked = true;
      }
      while (this._accumulator >= 0.25) {
        this._game.tick(0.25);
        this._accumulator -= 0.25;
        ticked = true;
      }
      if (ticked) {
        this.syncUI(false);
      }
      if (now - this._lastSaveAt >= 30000) {
        this.saveGame(false);
      }
      if (this._sceneRenderer && now - this._lastFrameAt >= 1000 / 15) {
        this._lastFrameAt = now;
        this._sceneRenderer.render(this._game);
      }
      this._rafTimer = setTimeout(step, 66);
    };
    this._rafTimer = setTimeout(step, 66);
  },

  stopLoop() {
    if (this._rafTimer) {
      clearTimeout(this._rafTimer);
      this._rafTimer = null;
    }
  },

  syncNavigationTheme() {
    const themeId = (this._game && this._game.save.settings && this._game.save.settings.theme) || 'pixel';
    const cfg = dl.getThemeConfig(themeId);
    if (this._api && this._api.setNavigationBarColor) {
      try {
        this._api.setNavigationBarColor({
          frontColor: cfg.isLight ? '#000000' : '#ffffff',
          backgroundColor: cfg.bgMain,
          animation: { duration: 150, timingFunc: 'easeIn' }
        });
      } catch (_) {}
    }
    if (this._api && this._api.setBackgroundColor) {
      try {
        this._api.setBackgroundColor({ backgroundColor: cfg.bgMain });
      } catch (_) {}
    }
  },

  syncUI(forceFull = false) {
    if (!this._game) return;
    const vm = buildViewModel(this._game, this._uiState);
    this._uiState.activeSubTab = vm.activeSubTab;

    if (forceFull || !this._lastVm) {
      this._lastVm = vm;
      this.setData(vm);
      return;
    }

    const patch = diffViewModel(this._lastVm, vm);
    this._lastVm = vm;
    const keys = Object.keys(patch);
    if (keys.length > 0) {
      this.setData(patch);
    }
  },

  saveGame(notify = true) {
    if (!this._game) return false;
    const prevTime = this._game.save.lastActiveAt;
    this._game.save.lastActiveAt = this._hiddenAt === null ? Date.now() : this._hiddenAt;
    const ok = platform.writeStorageSave(this._api, SAVE_KEY, this._game.save);
    if (ok) {
      this._lastSaveAt = Date.now();
      if (notify) this.showToast('💾 游戏进度已保存！');
      return true;
    }
    this._game.save.lastActiveAt = prevTime;
    this.showToast('保存失败，请检查微信存储空间');
    return false;
  },

  showToast(msg) {
    if (!msg) return;
    this.setData({ toastMsg: msg, toastShow: true });
    if (this._toastTimer) clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      this.setData({ toastShow: false });
    }, 2300);
  },

  spawnFloat(text, color = '#6ee7b7', pos) {
    const rect = this._canvasRect || { left: 12, top: 140, width: 112, height: 112 };
    const x = pos && typeof pos.x === 'number' ? pos.x : (rect.left + rect.width * 0.5);
    const y = pos && typeof pos.y === 'number' ? pos.y : (rect.top + rect.height * 0.45);
    const slot = this._floatIdx;
    this._floatIdx = (this._floatIdx + 1) % 8;
    this._floatSeq++;
    const animClass = (this._floatSeq % 2 === 0) ? 'anim-a' : 'anim-b';
    this.setData({
      [`floatPool[${slot}]`]: { slot, text, color, x: Math.round(x), y: Math.round(y), animClass }
    });
  },

  openModal({ title, lines = [], showTextarea = false, textareaValue = '', readonly = false, buttons = [] }) {
    this._modalButtons = buttons;
    this.setData({
      modal: {
        open: true,
        title,
        lines: lines.map((l, idx) => ({ ...l, idx })),
        showTextarea,
        textareaValue,
        readonly,
        buttons: buttons.map(b => ({ text: b.text, cls: b.cls || 'bg-slate' }))
      }
    });
  },

  onModalClose() {
    this._modalButtons = [];
    this.setData({ 'modal.open': false });
  },

  onStopProp() {},

  onModalInput(e) {
    const val = (e && e.detail && e.detail.value) || '';
    this.data.modal.textareaValue = val;
  },

  onModalBtnTap(e) {
    const idx = Number(e.currentTarget.dataset.idx);
    const btn = this._modalButtons[idx];
    if (!btn) {
      this.onModalClose();
      return;
    }
    const textVal = this.data.modal.textareaValue || '';
    if (btn.onClick) btn.onClick(textVal);
    if (btn.close !== false) this.onModalClose();
  },

  switchTab(nextTab, subTabId) {
    if (subTabId) {
      this._uiState.activeSubTab = subTabId;
    } else if (this._uiState.activeTab !== nextTab) {
      const list = getSubTabs(this._game.save, nextTab);
      this._uiState.activeSubTab = list[0] ? list[0].id : '';
    }
    this._uiState.activeTab = nextTab;
    this.setData({ tabScrollTop: this.data.tabScrollTop === 0 ? 1 : 0 });
    this.syncUI(true);
  },

  /* ======================== 顶部与舞台事件 ======================== */
  onStageTap(e) {
    const d = (e && e.detail) || {};
    const rect = this._canvasRect || { left: 12, top: 140, width: 112, height: 112 };
    const cx = typeof d.x === 'number' ? d.x : (rect.left + rect.width * 0.5);
    const cy = typeof d.y === 'number' ? d.y : (rect.top + rect.height * 0.45);
    const nx = (cx - rect.left) / Math.max(1, rect.width);
    const ny = (cy - rect.top) / Math.max(1, rect.height);
    this._game.handleStageManualClick({ x: cx, y: cy, nx, ny });
    this.syncUI(false);
  },

  onEraActionTap() {
    const rect = this._canvasRect || { left: 12, top: 140, width: 112, height: 112 };
    this._game.handleEraActionButton({
      x: rect.left + rect.width * 0.5,
      y: rect.top + rect.height * 0.4,
      nx: 0.5,
      ny: 0.4
    });
    this.syncUI(false);
  },

  onNextEraTap() {
    const g = this._game;
    if (g.save.world.eraIndex === 6 && g.canPrestigeNow()) {
      this.onTriggerPrestige();
    } else if (g.canMadResetNow()) {
      this.switchTab('prestige', 'pres_reset');
    }
  },

  onMissionBannerTap() { this.switchTab('prestige', 'pres_perks'); },
  onPrestigePillTap() { this.switchTab('prestige', 'pres_crispr'); },
  onPopPillTap() { this.switchTab('evo', 'evo_pop'); },
  onKpiResTap() { this.switchTab('sys', 'sys_wiki'); },
  onWeatherTap() { this.switchTab('sys', 'sys_ach'); },
  onLeftResTap() {
    if (this._game.save.world.eraIndex >= 1) this.switchTab('bld', 'bld_storage');
    else this.switchTab('sys', 'sys_wiki');
  },

  onSwitchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    if (!tab) return;
    if (this._sound) this._sound.play('click');
    this.switchTab(tab);
  },

  onSwitchSubTab(e) {
    const subId = e.currentTarget.dataset.subtab;
    if (!subId) return;
    if (this._sound) this._sound.play('click');
    this._uiState.activeSubTab = subId;
    this.setData({ tabScrollTop: this.data.tabScrollTop === 0 ? 1 : 0 });
    this.syncUI(true);
  },

  onGotoTab(e) {
    const val = e.currentTarget.dataset.goto || '';
    const [mTab, sTab] = val.split(':');
    if (this._sound) this._sound.play('click');
    if (mTab) this.switchTab(mTab, sTab);
  },

  /* ======================== 进化 / 人口 / 政体 / 总督 ================= */
  onSelectGenusFilter(e) {
    this._uiState.genusFilter = e.currentTarget.dataset.genus || 'all';
    if (this._sound) this._sound.play('click');
    this.syncUI(false);
  },

  onSelectSpecies(e) {
    this._game.switchSpecies(e.currentTarget.dataset.species);
    this.syncUI(false);
  },

  onBuyCell(e) {
    this._game.buyCellStructure(e.currentTarget.dataset.cell);
    this.syncUI(false);
  },

  onResearchTech(e) {
    this._game.buyTechnology(e.currentTarget.dataset.tech);
    this.syncUI(false);
  },

  onRecruitPop() {
    const rect = this._canvasRect || { left: 12, top: 140, width: 112, height: 112 };
    this._game.recruitPopulation({ x: rect.left + rect.width * 0.5, y: rect.top + rect.height * 0.45 });
    this.syncUI(false);
  },

  onAdjustJob(e) {
    const { job, delta } = e.currentTarget.dataset;
    this._game.adjustJob(job, Number(delta));
    this.syncUI(false);
  },

  onSwitchGov(e) {
    this._game.switchGovernment(e.currentTarget.dataset.gov);
    this.syncUI(false);
  },

  onSetTax(e) {
    this._game.save.world.taxRate = Number(e.currentTarget.dataset.tax);
    if (this._sound) this._sound.play('click');
    this.syncUI(false);
  },

  onAdjustRaid(e) {
    bridge.modules.diploMod.adjustRaidSize(this._game.getBridgeContext(), Number(e.currentTarget.dataset.delta));
    if (this._sound) this._sound.play('click');
    this.syncUI(false);
  },

  onHireMerc() {
    const res = bridge.modules.diploMod.hireMercenary(this._game.getBridgeContext());
    this.showToast(res.msg);
    if (res.ok && this._sound) this._sound.play('build');
    this.syncUI(false);
  },

  onSetTactic(e) {
    this._game.save.world.garrison.tactic = Number(e.currentTarget.dataset.tactic);
    if (this._sound) this._sound.play('click');
    this.syncUI(false);
  },

  onLaunchCampaign(e) {
    const res = bridge.modules.diploMod.launchCampaign(this._game.getBridgeContext(), Number(e.currentTarget.dataset.idx));
    this.showToast(res.msg);
    if (res.ok && this._sound) this._sound.play('tech');
    this._game.recomputeCapacities();
    this.syncUI(false);
  },

  onTrainSpy(e) {
    const res = bridge.modules.diploMod.trainSpy(this._game.getBridgeContext(), Number(e.currentTarget.dataset.idx));
    this.showToast(res.msg);
    if (res.ok && this._sound) this._sound.play('click');
    this.syncUI(false);
  },

  onSpyOp(e) {
    const { idx, op } = e.currentTarget.dataset;
    const res = bridge.modules.diploMod.runSpyOp(this._game.getBridgeContext(), Number(idx), op);
    this.showToast(res.msg);
    if (res.ok && this._sound) this._sound.play('tech');
    this._game.recomputeCapacities();
    this.syncUI(false);
  },

  onRerollGovCandidates() {
    bridge.modules.arpaMod.rerollGovernorCandidates(this._game.getBridgeContext());
    if (this._sound) this._sound.play('click');
    this.syncUI(false);
  },

  onFireGovernor() {
    const res = bridge.modules.arpaMod.appointGovernor(this._game.getBridgeContext(), null);
    this.showToast(res.msg);
    this.syncUI(false);
  },

  onAppointGovernor(e) {
    const res = bridge.modules.arpaMod.appointGovernor(this._game.getBridgeContext(), e.currentTarget.dataset.id);
    this.showToast(res.msg);
    if (res.ok && this._sound) this._sound.play('tech');
    this._game.recomputeCapacities();
    this.syncUI(false);
  },

  onToggleGovernorTask(e) {
    const res = bridge.modules.arpaMod.toggleGovernorTask(this._game.getBridgeContext(), e.currentTarget.dataset.id);
    if (!res.ok && res.msg) this.showToast(res.msg);
    if (this._sound) this._sound.play('click');
    this.syncUI(false);
  },

  /* ======================== 建筑 / 电力队列 / 市场 / 仓储 ================= */
  onSetBatch(e) {
    const val = e.currentTarget.dataset.batch;
    this._game.setBatch(val === 'MAX' ? 'MAX' : Number(val));
    if (this._sound) this._sound.play('click');
    this.syncUI(false);
  },

  onSetSmelter(e) {
    this._game.save.world.smelterMode = e.currentTarget.dataset.mode;
    if (this._sound) this._sound.play('click');
    this.syncUI(false);
  },

  onSetCraftFocus(e) {
    this._game.save.world.craftFocus = e.currentTarget.dataset.focus;
    if (this._sound) this._sound.play('click');
    this.syncUI(false);
  },

  onBuildExtra(e) {
    this._game.buyBuilding(e.currentTarget.dataset.id, true);
    this.syncUI(false);
  },

  onBuildStd(e) {
    this._game.buyBuilding(e.currentTarget.dataset.id, false);
    this.syncUI(false);
  },

  onQueueBuild(e) {
    const { kind, id } = e.currentTarget.dataset;
    const res = bridge.modules.ecoMod.enqueueBuild(this._game.getBridgeContext(), id, kind === 'extra');
    if (!res.ok && res.msg) this.showToast(res.msg);
    else this.showToast('📋 已加入建筑队列！');
    if (this._sound) this._sound.play('click');
    this.syncUI(false);
  },

  onTogglePower(e) {
    const { kind, id, delta } = e.currentTarget.dataset;
    bridge.modules.ecoMod.toggleBuildingPower(this._game.getBridgeContext(), id, Number(delta), kind === 'extra');
    if (this._sound) this._sound.play('click');
    this.syncUI(false);
  },

  onToggleQueuePause() {
    this._game.save.world.queuePaused = !this._game.save.world.queuePaused;
    if (this._sound) this._sound.play('click');
    this.syncUI(false);
  },

  onRemoveBuildQueue(e) {
    this._game.save.world.buildQueue.splice(Number(e.currentTarget.dataset.idx), 1);
    if (this._sound) this._sound.play('click');
    this.syncUI(false);
  },

  onRemoveResearchQueue(e) {
    this._game.save.world.researchQueue.splice(Number(e.currentTarget.dataset.idx), 1);
    if (this._sound) this._sound.play('click');
    this.syncUI(false);
  },

  onSetMarketQty(e) {
    this._game.save.world.market.qty = Number(e.currentTarget.dataset.qty);
    if (this._sound) this._sound.play('click');
    this.syncUI(false);
  },

  onMarketOrder(e) {
    const { id, side } = e.currentTarget.dataset;
    const res = bridge.modules.ecoMod.tradeMarketOrder(this._game.getBridgeContext(), id, side);
    this.showToast(res.msg);
    if (res.ok && this._sound) this._sound.play('click');
    this.syncUI(false);
  },

  onAdjustRoute(e) {
    const { id, delta } = e.currentTarget.dataset;
    const res = bridge.modules.ecoMod.adjustTradeRoute(this._game.getBridgeContext(), id, Number(delta));
    if (!res.ok && res.msg) this.showToast(res.msg);
    if (this._sound) this._sound.play('click');
    this.syncUI(false);
  },

  onMakeStorage(e) {
    const { kind, count } = e.currentTarget.dataset;
    const res = bridge.modules.ecoMod.constructStorageUnit(this._game.getBridgeContext(), kind, Number(count));
    this.showToast(res.msg);
    if (res.ok && this._sound) this._sound.play('build');
    this._game.recomputeCapacities();
    this.syncUI(false);
  },

  onAssignStorage(e) {
    const { kind, id, delta } = e.currentTarget.dataset;
    const res = bridge.modules.ecoMod.assignStorageUnit(this._game.getBridgeContext(), kind, id, Number(delta));
    if (!res.ok && res.msg) this.showToast(res.msg);
    if (this._sound) this._sound.play('click');
    this._game.recomputeCapacities();
    this.syncUI(false);
  },

  /* ======================== 科技 / ARPA / 基因室 ================= */
  onToggleHideDoneTechs() {
    this._game.toggleHideDoneTechs();
    this.syncUI(false);
  },

  onQueueTech(e) {
    const res = bridge.modules.ecoMod.enqueueResearch(this._game.getBridgeContext(), e.currentTarget.dataset.tech);
    if (!res.ok && res.msg) this.showToast(res.msg);
    else this.showToast('📋 已加入研究队列！');
    if (this._sound) this._sound.play('click');
    this.syncUI(false);
  },

  onInvestArpa(e) {
    const { id, pct } = e.currentTarget.dataset;
    const res = bridge.modules.arpaMod.investArpaProject(this._game.getBridgeContext(), id, Number(pct));
    this.showToast(res.msg);
    if (res.ok && this._sound) this._sound.play(res.completed ? 'tech' : 'build');
    this._game.recomputeCapacities();
    this.syncUI(false);
  },

  onToggleSeqActive() {
    const gl = this._game.save.world.geneLab;
    gl.seqActive = !gl.seqActive;
    if (this._sound) this._sound.play('click');
    this.syncUI(false);
  },

  onToggleSeqBoost() {
    const gl = this._game.save.world.geneLab;
    gl.seqBoost = !gl.seqBoost;
    if (this._sound) this._sound.play('click');
    this.syncUI(false);
  },

  onRemoveNegTrait(e) {
    const res = bridge.modules.arpaMod.removeNegativeTrait(this._game.getBridgeContext(), e.currentTarget.dataset.id);
    this.showToast(res.msg);
    if (res.ok && this._sound) this._sound.play('tech');
    this._game.recomputeCapacities();
    this.syncUI(false);
  },

  onBuyMinorTrait(e) {
    const res = bridge.modules.arpaMod.buyMinorTrait(this._game.getBridgeContext(), e.currentTarget.dataset.id);
    this.showToast(res.msg);
    if (res.ok && this._sound) this._sound.play('tech');
    this._game.recomputeCapacities();
    this.syncUI(false);
  },

  /* ======================== 转生 / CRISPR / 天赋 / 任务 ================= */
  onToggleMadArm() {
    this._game.save.world.madArmed = !this._game.save.world.madArmed;
    if (this._sound) this._sound.play('click');
    this.syncUI(false);
  },

  onTriggerMad() {
    const g = this._game;
    if (!g.canMadResetNow()) {
      this.showToast('需达到原子时代、研究【核裂变】并建造至少 1 座【导弹发射井】！');
      return;
    }
    const gain = g.calcMadPlasmidGain();
    this.openModal({
      title: '☢️ 相互保证毁灭 (MAD 核弹重置)',
      lines: [
        { text: '“按下红色按钮，核火洗礼大地，旧文明化为灰烬，但辐射促成了基因的极速飞跃！”', cls: 'text-rose' },
        { text: `🧬 获得质粒 / 创世余烬：+${gain} 枚`, cls: 'text-amber font-bold' },
        { text: '⚡ 激活永久基因特质：【快速突变】(RNA/DNA进化产出×2)', cls: 'text-emerald' },
        { text: '🏛️ 激活先祖遗产：【远古遗迹】(农业/城市时代产出+25%)', cls: 'text-sky' }
      ],
      buttons: [
        { text: '取消发射', cls: 'bg-slate' },
        {
          text: `☢️ 发射核弹 (+${gain}余烬)`,
          cls: 'bg-rose',
          onClick: () => {
            g.executeMadReset();
            this.saveGame(false);
            this.syncUI(true);
          }
        }
      ]
    });
  },

  onTriggerPrestige() {
    const g = this._game;
    if (!g.canPrestigeNow()) {
      this.showToast('需达到太空文明、研究【星际航行】并建造【恒星际殖民方舟】！');
      return;
    }
    const gain = g.calcPrestigeGain();
    const phageGain = g.calcPhageGain();
    this.openModal({
      title: '🚀 启动恒星际文明跃迁 (Bioseed / 方舟播种)',
      lines: [
        { text: '恒星际殖民方舟已装载基因库准备启航！飞向新星系将重置当前行星进度并获得高等传承：', cls: 'text-muted' },
        { text: `🔥 获得质粒 / 创世余烬：+${gain} 枚`, cls: 'text-purple font-bold' },
        { text: `🦠 获得噬菌体 (Phage)：+${phageGain} 枚 (全资源仓储上限 +${phageGain * 5}% & 产能 +${phageGain * 3}%)`, cls: 'text-emerald font-bold' },
        { text: '✨ 激活/保留【快速突变】与【远古遗迹】特质', cls: 'text-sky' }
      ],
      buttons: [
        { text: '取消', cls: 'bg-slate' },
        {
          text: `🚀 启航播种 (+${gain}余烬 +${phageGain}噬菌体)`,
          cls: 'bg-purple',
          onClick: () => {
            g.executePrestige();
            this.saveGame(false);
            this.syncUI(true);
          }
        }
      ]
    });
  },

  onSetPreset(e) {
    const { field, val } = e.currentTarget.dataset;
    const pre = this._game.save.prestige.nextPreset;
    if (!pre || !field) return;
    pre[field] = val;
    if (field === 'species') {
      const sp = dl.MAPS.species[val];
      if (sp) this.showToast(`🌌 已预设下轮物种：【${sp.name}】`);
    }
    if (this._sound) this._sound.play('click');
    this.syncUI(false);
  },

  onBuyCrispr(e) {
    const res = bridge.modules.arpaMod.buyCrisprUpgrade(this._game.getBridgeContext(), e.currentTarget.dataset.id);
    this.showToast(res.msg);
    if (res.ok && this._sound) this._sound.play('tech');
    this._game.recomputeCapacities();
    this.saveGame(false);
    this.syncUI(false);
  },

  onBuyPerk(e) {
    if (this._game.buyPerk(e.currentTarget.dataset.id)) {
      this.saveGame(false);
      this.syncUI(false);
    }
  },

  onToggleAllMissions() {
    this._uiState.showAllMissions = !this._uiState.showAllMissions;
    this.syncUI(false);
  },

  /* ======================== 日志 / 主题 / 设置 / 存档 ================= */
  onSelectLogCat(e) {
    this._uiState.logCatFilter = e.currentTarget.dataset.cat || 'all';
    this.syncUI(false);
  },

  onToggleSound() {
    this._game.save.settings.sound = !this._game.save.settings.sound;
    this.saveGame(false);
    this.syncUI(false);
  },

  onToggleCrt() {
    this._game.save.settings.crt = !this._game.save.settings.crt;
    this.saveGame(false);
    this.syncUI(false);
  },

  onToggleBoring() {
    this._game.save.settings.boring = !this._game.save.settings.boring;
    if (this._sound) this._sound.play('click');
    this.saveGame(false);
    this.syncUI(false);
  },

  onSetNumFormat(e) {
    this._game.save.settings.numFormat = e.currentTarget.dataset.fmt || 'metric';
    if (this._sound) this._sound.play('click');
    this.saveGame(false);
    this.syncUI(false);
  },

  onSetTheme(e) {
    this._game.save.settings.theme = e.currentTarget.dataset.theme || 'pixel';
    if (this._sound) this._sound.play('click');
    this.syncNavigationTheme();
    this.saveGame(false);
    this.syncUI(false);
  },

  onManualSave() {
    this.saveGame(true);
  },

  onExportSave() {
    this.saveGame(false);
    const code = encodeSave({ ...this._game.save, lastActiveAt: Date.now() });
    this.openModal({
      title: '📤 导出跨设备存档码',
      lines: [{ text: '请复制下方 Base64 存档码，在另一台设备点击【导入存档码】即可无缝同步进度：', cls: '' }],
      showTextarea: true,
      textareaValue: code,
      readonly: true,
      buttons: [
        { text: '关闭', cls: 'bg-slate' },
        {
          text: '📋 复制存档码',
          cls: 'bg-sky',
          close: false,
          onClick: () => {
            if (this._api && this._api.setClipboardData) {
              this._api.setClipboardData({
                data: code,
                success: () => this.showToast('📋 存档码已复制到剪贴板！'),
                fail: () => this.showToast('复制失败，请手动全选复制！')
              });
            }
          }
        }
      ]
    });
  },

  onImportSave() {
    const readClip = () => {
      if (this._api && this._api.getClipboardData) {
        this._api.getClipboardData({
          success: ({ data }) => {
            if (this.data.modal.open && data) {
              this.setData({ 'modal.textareaValue': data });
            }
          },
          fail: () => this.showToast('未能读取剪贴板，请手动粘贴存档码')
        });
      }
    };
    this.openModal({
      title: '📥 导入存档码',
      lines: [{ text: '请在下方粘贴之前导出的 Base64 存档码（与 evolve_web 完全互通）。确认导入将替换当前进度：', cls: '' }],
      showTextarea: true,
      textareaValue: '',
      readonly: false,
      buttons: [
        { text: '取消', cls: 'bg-slate' },
        {
          text: '📋 剪贴板',
          cls: 'bg-indigo',
          close: false,
          onClick: readClip
        },
        {
          text: '✅ 确认导入',
          cls: 'bg-emerald',
          close: false,
          onClick: val => {
            try {
              const decoded = decodeSave((val || '').trim());
              this._game.loadSaveData(decoded);
              this.saveGame(false);
              this.syncNavigationTheme();
              this.switchTab('evo');
              this.onModalClose();
              this.showToast('🎉 存档导入成功！');
            } catch (err) {
              this.showToast(`❌ ${err.message || '存档码格式无效，导入失败！'}`);
            }
          }
        }
      ]
    });
  },

  onHardReset() {
    this.openModal({
      title: '⚠️ 确认清空全部存档？',
      lines: [{ text: '此操作将彻底清除当前进度与创世余烬并从头开始，无法撤销！', cls: 'text-rose' }],
      buttons: [
        { text: '取消', cls: 'bg-slate' },
        {
          text: '🗑️ 确认清空',
          cls: 'bg-rose',
          onClick: () => {
            platform.removeStorageSave(this._api, SAVE_KEY);
            this._game.reset();
            this.syncNavigationTheme();
            this.switchTab('evo');
            this.saveGame(false);
            this.showToast('🗑️ 存档已重置为全新宇宙！');
          }
        }
      ]
    });
  }
});
