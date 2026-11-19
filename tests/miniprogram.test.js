'use strict';

/**
 * 创世余烬微信小程序版本 (miniprogram/) 全面自动化测试
 * 覆盖：数据同源校验、核心逻辑与 evolve_web 对等性、双向存档互通、
 * 7时代全子页签 ViewModel & 最小化 Diff、Canvas 舞台绘制、Page 生命周期与全按钮集成、微信规范静态检查
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const MP_DIR = path.join(ROOT, 'miniprogram');

const createDefinitions = require('../miniprogram/core/defs.js');
const { createEvolveGame, SAVE_KEY } = require('../miniprogram/core/game-engine.js');
const { encodeSave, decodeSave } = require('../miniprogram/core/save-code.js');
const { buildViewModel, diffViewModel, getSubTabs } = require('../miniprogram/core/ui-presenter.js');
const { createSceneRenderer } = require('../miniprogram/core/scene-renderer.js');
const dl = require('../miniprogram/core/data-loader.js');
const bridge = require('../miniprogram/core/evolve-bridge.js');
const platform = require('../miniprogram/utils/platform.js');

function readText(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

test('miniprogram 与 evolve_web 数据包及核心数值定义 100% 一致', () => {
  const webBundle = readText('evolve_web/data/evolve-bundle.js');
  const mpBundle = readText('miniprogram/data/evolve-bundle.js');
  assert.equal(mpBundle, webBundle, 'miniprogram/data/evolve-bundle.js 应与 evolve_web 完全同源同步');

  const html = readText('evolve_web/rna.html');
  const scriptMatch = html.match(/<script>\s*'use strict';([\s\S]*?)const SAVE_KEY =/);
  assert.ok(scriptMatch, '应可解析 evolve_web/rna.html 主脚本数值表');

  const sandbox = { metrics: { powerSurplus: 0 } };
  vm.runInNewContext(`${scriptMatch[1]}\nthis.__defs = { ERAS_DEF, RESOURCES_DEF, EVO_CHAIN_IDS, JOBS_DEF, BUILDINGS_DEF, TECHS_DEF, MISSIONS_DEF, PERKS_DEF, EVOLVE_CELL_STRUCTURES_DEF, EVOLVE_EXTRA_BLDS_DEF };`, sandbox);
  const webDefs = JSON.parse(JSON.stringify(sandbox.__defs));
  const mpDefs = JSON.parse(JSON.stringify(createDefinitions(sandbox.metrics)));

  assert.equal(mpDefs.ERAS_DEF.length, webDefs.ERAS_DEF.length);
  assert.equal(mpDefs.RESOURCES_DEF.length, webDefs.RESOURCES_DEF.length);
  assert.equal(mpDefs.JOBS_DEF.length, webDefs.JOBS_DEF.length);
  assert.equal(mpDefs.BUILDINGS_DEF.length, webDefs.BUILDINGS_DEF.length);
  assert.equal(mpDefs.TECHS_DEF.length, webDefs.TECHS_DEF.length);
  assert.equal(mpDefs.MISSIONS_DEF.length, webDefs.MISSIONS_DEF.length);
  assert.equal(mpDefs.PERKS_DEF.length, webDefs.PERKS_DEF.length);
  assert.equal(mpDefs.EVOLVE_CELL_STRUCTURES_DEF.length, webDefs.EVOLVE_CELL_STRUCTURES_DEF.length);
  assert.equal(mpDefs.EVOLVE_EXTRA_BLDS_DEF.length, webDefs.EVOLVE_EXTRA_BLDS_DEF.length);

  assert.deepEqual(mpDefs.RESOURCES_DEF, webDefs.RESOURCES_DEF);
  assert.deepEqual(mpDefs.JOBS_DEF, webDefs.JOBS_DEF);
  assert.deepEqual(mpDefs.BUILDINGS_DEF, webDefs.BUILDINGS_DEF);
  assert.deepEqual(mpDefs.TECHS_DEF, webDefs.TECHS_DEF);
  assert.deepEqual(mpDefs.PERKS_DEF, webDefs.PERKS_DEF);
  assert.deepEqual(mpDefs.EVOLVE_CELL_STRUCTURES_DEF, webDefs.EVOLVE_CELL_STRUCTURES_DEF);
  assert.deepEqual(mpDefs.EVOLVE_EXTRA_BLDS_DEF, webDefs.EVOLVE_EXTRA_BLDS_DEF);
  assert.deepEqual(
    JSON.parse(JSON.stringify(mpDefs.MISSIONS_DEF.map(m => ({ id: m.id, era: m.era, name: m.name, desc: m.desc, reward: m.reward })))),
    webDefs.MISSIONS_DEF.map(m => ({ id: m.id, era: m.era, name: m.name, desc: m.desc, reward: m.reward }))
  );
});

test('核心引擎完整流程：细胞演化、时代晋升、物种锁定、全增强系统、双轨转生与存档码双向互通', () => {
  const toasts = [];
  const sounds = [];
  const floats = [];
  const g = createEvolveGame({
    toast: msg => toasts.push(msg),
    sound: name => sounds.push(name),
    float: (label, color) => floats.push({ label, color })
  });

  // 1. 生命起源：手动采集 RNA + 切换物种 + 建造细胞亚结构
  assert.equal(g.switchSpecies('ent'), true);
  assert.equal(g.save.world.species, 'ent');
  assert.equal(g.save.world.kingdom, 'plant');
  assert.equal(g.switchSpecies('elf'), true);
  assert.equal(g.save.world.species, 'elf');
  assert.equal(g.save.world.kingdom, 'animal');

  for (let i = 0; i < 12; i++) g.handleStageManualClick({ nx: 0.5, ny: 0.5 });
  assert.ok(g.save.world.res.rna >= 10);
  assert.equal(g.save.world.missionIndex >= 1, true);
  assert.ok(floats.length > 0 && sounds.includes('click'));

  // 建造细胞膜提升 RNA 上限
  assert.equal(g.buyCellStructure('membrane'), true);
  assert.equal(g.metrics.caps.rna, 105);

  // 2. 完成 8 步进化晋升农业文明并验证物种锁定
  for (const tid of g.defs.EVO_CHAIN_IDS) {
    g.save.world.res.rna = 200;
    g.save.world.res.dna = 200;
    assert.equal(g.buyTechnology(tid), true, `应能研究进化节点 ${tid}`);
  }
  assert.equal(g.save.world.eraIndex, 1);
  assert.equal(g.switchSpecies('orc'), false, '进入农业文明后本轮不可再更改物种');
  assert.equal(g.save.world.species, 'elf');
  assert.ok(sounds.includes('era'));

  // 3. 职业分工、吸引流民、建筑与排队、科技树
  g.save.world.res.food = 1000;
  g.save.world.res.lumber = 1000;
  g.save.world.res.stone = 1000;
  g.save.world.res.knowledge = 2000;
  assert.equal(g.recruitPopulation(), true);
  assert.equal(g.adjustJob('farmer', 2), true);
  assert.equal(g.buyTechnology('agriculture'), true);
  g.setBatch(1);
  assert.equal(g.buyBuilding('farmland', false), true);
  assert.equal(g.buyBuilding('shed', true), true);
  assert.ok(g.metrics.caps.food > 500);

  // 4. 推进到原子/太空时代并测试 ARPA、基因、CRISPR、外交、MAD 核弹、Bioseed 跃迁与预设应用
  const w = g.save.world;
  w.eraIndex = 4;
  w.pop = 80;
  w.techs.currency = true;
  w.techs.trade = true;
  w.techs.steel = true;
  w.techs.industrialization = true;
  w.techs.electricity = true;
  w.techs.electronics = true;
  w.techs.nuclearFission = true;
  w.techs.construction = true;
  w.extraBlds.missile_silo = 1;
  w.extraBlds.garrison = 4;
  w.res.money = 50000;
  w.res.stone = 2000;
  w.res.lumber = 2000;
  w.res.cement = 2000;
  w.res.steel = 2000;
  w.res.knowledge = 50000;
  g.recomputeCapacities();

  const ctx = g.getBridgeContext();
  assert.equal(bridge.modules.arpaMod.investArpaProject(ctx, 'monument', 100).completed, true);
  assert.equal(w.arpa.monument.rank, 1);

  w.geneLab.seqActive = true;
  w.geneLab.seqProgress = w.geneLab.seqMax - 1;
  g.tick(1.0);
  assert.ok(w.geneLab.genes >= 1);
  assert.equal(bridge.modules.arpaMod.buyMinorTrait(g.getBridgeContext(), 'tactical').ok, true);

  // 测试 MAD 核弹重置 + nextPreset 生效
  g.save.prestige.nextPreset = { biome: 'volcanic', planetTrait: 'magnetic', universe: 'heavy', species: 'dracnid' };
  assert.equal(g.canMadResetNow(), true);
  const madGain = g.executeMadReset();
  assert.ok(madGain >= 5);
  assert.equal(g.save.world.eraIndex, 0);
  assert.equal(g.save.world.biome, 'volcanic');
  assert.equal(g.save.world.planetTrait, 'magnetic');
  assert.equal(g.save.world.universe, 'heavy');
  assert.equal(g.save.world.species, 'dracnid');
  assert.equal(g.save.prestige.rapidMutation, true);
  assert.equal(g.save.prestige.ancientRuins, true);

  // 测试 Bioseed 太空跃迁 + 双向 Base64 存档码互通
  g.save.world.eraIndex = 6;
  g.save.world.pop = 300;
  g.save.world.techs.interstellarTravel = true;
  g.save.world.buildings.colonyShip = 1;
  assert.equal(g.canPrestigeNow(), true);
  const code = encodeSave(g.save);
  const decoded = decodeSave(code);
  assert.equal(decoded.world.eraIndex, 6);
  assert.equal(decoded.world.species, 'dracnid');
  const presRes = g.executePrestige();
  assert.ok(presRes.gain >= 15 && presRes.phageGain >= 2);
});

test('全时代、全子页签、全主题 ViewModel 生成与路径级 Diff 准确性', () => {
  const g = createEvolveGame();
  const mainTabs = ['evo', 'bld', 'tech', 'prestige', 'sys'];

  // 时代 0 全页签检查
  for (const mTab of mainTabs) {
    const subs = getSubTabs(g.save, mTab);
    const list = subs.length > 0 ? subs : [{ id: '' }];
    for (const st of list) {
      const vm0 = buildViewModel(g, { activeTab: mTab, activeSubTab: st.id, genusFilter: 'all', logCatFilter: 'all', showAllMissions: false });
      assert.ok(vm0 && vm0.panel && vm0.panel.kind, `时代0 ${mTab}/${st.id} 应生成有效面板`);
    }
  }

  // 推进至时代 6 并遍历所有子页签与 8 套主题 + 3 种数字格式
  const w = g.save.world;
  w.eraIndex = 6;
  w.pop = 150;
  Object.keys(g.defs.TECH_MAP).forEach(tid => { w.techs[tid] = true; });
  g.defs.RESOURCES_DEF.forEach(r => { w.unlockedRes[r.id] = true; w.res[r.id] = 12345; });
  w.buildings.colonyShip = 1;
  w.extraBlds.missile_silo = 1;
  w.extraBlds.garrison = 3;
  w.governor.appointed = 'educator';
  g.recomputeCapacities();
  g.tick(0.25);

  for (const theme of dl.DATA.themes) {
    g.save.settings.theme = theme.id;
    for (const nf of ['metric', 'scientific', 'engineering']) {
      g.save.settings.numFormat = nf;
      const vmCfg = buildViewModel(g, { activeTab: 'sys', activeSubTab: 'sys_cfg' });
      assert.ok(vmCfg.themeVarsStyle.includes('--bg-main:'), `主题 ${theme.id} 应生成 CSS 变量字符串`);
      assert.equal(vmCfg.panel.kind, 'sys_cfg');
    }
  }

  for (const mTab of mainTabs) {
    const subs = getSubTabs(g.save, mTab);
    for (const st of subs) {
      const vm1 = buildViewModel(g, { activeTab: mTab, activeSubTab: st.id, genusFilter: 'all', logCatFilter: 'all', showAllMissions: true });
      assert.ok(vm1.panel && vm1.panel.kind, `时代6 ${mTab}/${st.id} 应生成有效面板`);
    }
  }

  // 验证 diffViewModel 最小增量与面板切换全量替换
  const vmA = buildViewModel(g, { activeTab: 'evo', activeSubTab: 'evo_pop' });
  g.save.world.res.food += 50;
  const vmB = buildViewModel(g, { activeTab: 'evo', activeSubTab: 'evo_pop' });
  const patchSmall = diffViewModel(vmA, vmB);
  assert.ok(Object.keys(patchSmall).length > 0 && Object.keys(patchSmall).length < 15, '稳态 tick diff 应仅输出少量变化路径');

  const vmC = buildViewModel(g, { activeTab: 'sys', activeSubTab: 'sys_wiki' });
  const patchSwitch = diffViewModel(vmB, vmC);
  assert.equal(patchSwitch.activeTab, 'sys');
  assert.equal(patchSwitch.panel.kind, 'sys_wiki');
});

test('Canvas 2D 像素舞台与气象/粒子在 7 个时代均可无错渲染（含离屏与直绘双模式）', () => {
  const createMockCanvas = () => {
    const ops = [];
    const ctx = {
      imageSmoothingEnabled: true,
      fillStyle: '',
      fillRect(x, y, w, h) { ops.push(['fillRect', x, y, w, h, this.fillStyle]); },
      clearRect() {},
      drawImage() { ops.push(['drawImage']); }
    };
    return { width: 112, height: 112, ops, getContext: () => ctx };
  };

  const g = createEvolveGame();
  const mainC = createMockCanvas();
  const offC = createMockCanvas();
  const rOff = createSceneRenderer(mainC, offC);
  const rDirect = createSceneRenderer(createMockCanvas(), null);

  rOff.spawnParticles(0.5, 0.5, '#34d399');
  rDirect.spawnParticles(0.5, 0.5, '#38bdf8');

  for (let era = 0; era <= 6; era++) {
    g.save.world.eraIndex = era;
    g.save.world.calendar.weather = (era + 1) % 8;
    g.save.world.calendar.moon = era % 8;
    g.save.world.extraBlds.missile_silo = era >= 4 ? 1 : 0;
    rOff.render(g);
    rDirect.render(g);
  }
  assert.ok(offC.ops.length > 50);
  assert.ok(mainC.ops.some(op => op[0] === 'drawImage'));
});

test('微信小程序 Page 控制器完整集成：冷启动离线结算、损坏存档备份、切后台与全面板交互', () => {
  const storage = new Map();
  let clipboard = '';
  let pageDef = null;
  let barColorCalls = 0;
  const audioPlayed = [];
  const resizeListeners = [];

  // 预先写入一条 1 小时前的存档以测试冷启动离线结算
  const oldGame = createEvolveGame();
  oldGame.save.world.techs.evo_membrane = true;
  oldGame.save.world.techs.evo_organelle = true;
  oldGame.save.world.evoCells.organelles = 2;
  oldGame.save.lastActiveAt = Date.now() - 3600 * 1000;
  storage.set(SAVE_KEY, JSON.stringify(oldGame.save));

  const mockWx = {
    getWindowInfo: () => ({ windowWidth: 390, windowHeight: 844, pixelRatio: 2, safeArea: { top: 47, bottom: 810 } }),
    getMenuButtonBoundingClientRect: () => ({ top: 51, bottom: 83, height: 32, left: 296, right: 383, width: 87 }),
    getStorageSync: k => (storage.has(k) ? storage.get(k) : ''),
    setStorageSync: (k, v) => storage.set(k, String(v)),
    removeStorageSync: k => storage.delete(k),
    createInnerAudioContext: () => ({
      src: '', volume: 1, onError() {},
      play() { audioPlayed.push(this.src); },
      stop() {}
    }),
    setClipboardData: ({ data, success }) => { clipboard = data; if (success) success(); },
    getClipboardData: ({ success }) => { if (success) success({ data: clipboard }); },
    setNavigationBarColor: () => { barColorCalls++; },
    setBackgroundColor: () => {},
    showShareMenu: () => {},
    onWindowResize: fn => resizeListeners.push(fn),
    offWindowResize: () => {},
    onAudioInterruptionBegin: () => {},
    createOffscreenCanvas: () => ({ width: 64, height: 64, getContext: () => ({ imageSmoothingEnabled: false, fillStyle: '', fillRect() {}, clearRect() {} }) })
  };

  const sandbox = {
    console, Math, Date, JSON, Number, String, Array, Object, Set, Map, Error, RegExp,
    parseInt, parseFloat, isNaN, encodeURIComponent, decodeURIComponent,
    setTimeout: () => 1,
    clearTimeout: () => {},
    wx: mockWx,
    Page: def => { pageDef = def; },
    require: reqPath => {
      const resolved = path.resolve(path.join(MP_DIR, 'pages', 'index'), reqPath);
      return require(resolved);
    }
  };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(readText('miniprogram/pages/index/index.js'), sandbox, { filename: 'miniprogram/pages/index/index.js' });
  assert.ok(pageDef, 'index.js 应调用 Page(...) 注册页面');

  const pageInstance = {
    ...pageDef,
    data: JSON.parse(JSON.stringify(pageDef.data)),
    setData(patch) {
      for (const [k, v] of Object.entries(patch || {})) {
        const tokens = [];
        k.replace(/([^.\[\]]+)|\[(\d+)\]/g, (_, prop, idx) => {
          tokens.push(idx !== undefined ? Number(idx) : prop);
        });
        let cur = this.data;
        for (let i = 0; i < tokens.length - 1; i++) {
          cur = cur[tokens[i]];
        }
        cur[tokens[tokens.length - 1]] = v;
      }
    },
    createSelectorQuery() {
      return {
        select() {
          return {
            fields() { return this; },
            boundingClientRect() { return this; },
            exec(cb) {
              cb([{ node: { width: 112, height: 112, getContext: () => ({ imageSmoothingEnabled: false, fillStyle: '', fillRect() {}, clearRect() {}, drawImage() {} }) }, left: 10, top: 150, width: 112, height: 112 }]);
            }
          };
        }
      };
    }
  };

  pageInstance.onLoad();
  pageInstance.onReady();
  assert.ok(pageInstance._game.save.world.res.rna > 0, '冷启动应自动结算 1 小时离线 RNA 收益');
  assert.ok(pageInstance.data.viewport.capsuleOccupyWidth > 0, '窄屏应计算胶囊安全区避让宽度');
  assert.ok(barColorCalls >= 1);

  // 点击舞台采集与切页签操作
  pageInstance.onStageTap({ detail: { x: 60, y: 200 } });
  assert.ok(audioPlayed.some(s => s.includes('click.wav')));
  assert.ok(pageInstance.data.stage.clicks >= 1);

  pageInstance.onSwitchTab({ currentTarget: { dataset: { tab: 'sys' } } });
  pageInstance.onSwitchSubTab({ currentTarget: { dataset: { subtab: 'sys_cfg' } } });
  pageInstance.onSetTheme({ currentTarget: { dataset: { theme: 'light' } } });
  assert.equal(pageInstance.data.isLightTheme, true);

  // 导出再清空再导入存档码，并测试与 evolve_web btoa/unescape 编码完全互通
  pageInstance.onExportSave();
  assert.equal(pageInstance.data.modal.open, true);
  pageInstance.onModalBtnTap({ currentTarget: { dataset: { idx: 1 } } }); // 复制
  assert.ok(clipboard.length > 50);
  pageInstance.onModalClose();

  const webStyleB64 = Buffer.from(
    encodeURIComponent(JSON.stringify(pageInstance._game.save)).replace(/%([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))),
    'latin1'
  ).toString('base64');
  assert.equal(clipboard, webStyleB64, '导出存档码应与 evolve_web 编码逐字节一致');

  pageInstance.onHardReset();
  pageInstance.onModalBtnTap({ currentTarget: { dataset: { idx: 1 } } }); // 确认清空
  assert.equal(pageInstance._game.save.world.res.rna, 0);

  pageInstance.onImportSave();
  pageInstance.onModalBtnTap({ currentTarget: { dataset: { idx: 1 } } }); // 读剪贴板
  pageInstance.onModalBtnTap({ currentTarget: { dataset: { idx: 2 } } }); // 确认导入
  assert.equal(pageInstance.data.modal.open, false);
  assert.ok(pageInstance._game.save.world.techs.evo_organelle, '导入存档码应恢复之前科技进度');

  // 全面覆盖各面板交互事件（细胞/进化/人口/政体/外交/总督/建筑/电力队列/市场/仓储/ARPA/基因/CRISPR/天赋/日志/设置）
  const g2 = pageInstance._game;
  g2.save.world.res.rna = 200;
  g2.save.world.res.dna = 200;
  pageInstance.onSwitchTab({ currentTarget: { dataset: { tab: 'evo' } } });
  pageInstance.onSelectGenusFilter({ currentTarget: { dataset: { genus: 'humanoid' } } });
  pageInstance.onSelectSpecies({ currentTarget: { dataset: { species: 'human' } } });
  pageInstance.onBuyCell({ currentTarget: { dataset: { cell: 'membrane' } } });
  for (const tid of g2.defs.EVO_CHAIN_IDS) {
    g2.save.world.res.rna = 200;
    g2.save.world.res.dna = 200;
    pageInstance.onResearchTech({ currentTarget: { dataset: { tech: tid } } });
  }
  assert.equal(g2.save.world.eraIndex, 1);

  Object.assign(g2.save.world.res, {
    food: 10000, lumber: 10000, stone: 10000, knowledge: 500000, money: 500000,
    copper: 5000, iron: 5000, coal: 5000, plywood: 5000, brick: 5000, wroughtIron: 5000,
    steel: 5000, cement: 5000, oil: 5000, polymer: 5000, aluminium: 5000, uranium: 500,
    electronics: 5000, wafer: 5000, microprocessor: 5000, rocketParts: 5000, helium3: 5000
  });
  g2.save.world.eraIndex = 4;
  g2.save.world.buildings.bank = 2;
  Object.keys(g2.defs.TECH_MAP).forEach(tid => { g2.save.world.techs[tid] = true; });
  g2.recomputeCapacities();
  Object.assign(g2.save.world.res, {
    food: 10000, lumber: 10000, stone: 10000, knowledge: 50000, money: 50000,
    steel: 500, cement: 500, uranium: 40, lumber: 500, plywood: 100, brick: 100
  });

  pageInstance.onRecruitPop();
  pageInstance.onAdjustJob({ currentTarget: { dataset: { job: 'farmer', delta: '1' } } });
  pageInstance.onSwitchGov({ currentTarget: { dataset: { gov: 'democracy' } } });
  pageInstance.onSetTax({ currentTarget: { dataset: { tax: '30' } } });
  pageInstance.onAdjustRaid({ currentTarget: { dataset: { delta: '2' } } });
  pageInstance.onHireMerc();
  pageInstance.onSetTactic({ currentTarget: { dataset: { tactic: '2' } } });
  pageInstance.onLaunchCampaign({ currentTarget: { dataset: { idx: '0' } } });
  pageInstance.onTrainSpy({ currentTarget: { dataset: { idx: '1' } } });
  g2.save.world.foreign.gov1.spy = 2;
  g2.save.world.foreign.gov1.spyTrain = 0;
  pageInstance.onSpyOp({ currentTarget: { dataset: { idx: '1', op: 'influence' } } });

  pageInstance.onRerollGovCandidates();
  pageInstance.onAppointGovernor({ currentTarget: { dataset: { id: g2.save.world.governor.candidates[0] } } });
  pageInstance.onToggleGovernorTask({ currentTarget: { dataset: { id: 'autoTax' } } });
  pageInstance.onFireGovernor();

  pageInstance.onSetBatch({ currentTarget: { dataset: { batch: '1' } } });
  pageInstance.onSetSmelter({ currentTarget: { dataset: { mode: 'oil' } } });
  pageInstance.onSetCraftFocus({ currentTarget: { dataset: { focus: 'brick' } } });
  pageInstance.onBuildStd({ currentTarget: { dataset: { id: 'steelMill' } } });
  pageInstance.onBuildExtra({ currentTarget: { dataset: { id: 'missile_silo' } } });
  pageInstance.onQueueBuild({ currentTarget: { dataset: { kind: 'std', id: 'farmland' } } });
  pageInstance.onTogglePower({ currentTarget: { dataset: { kind: 'std', id: 'steelMill', delta: '-1' } } });
  pageInstance.onToggleQueuePause();
  pageInstance.onRemoveBuildQueue({ currentTarget: { dataset: { idx: '0' } } });

  pageInstance.onSetMarketQty({ currentTarget: { dataset: { qty: '10' } } });
  pageInstance.onMarketOrder({ currentTarget: { dataset: { id: 'lumber', side: 'buy' } } });
  pageInstance.onAdjustRoute({ currentTarget: { dataset: { id: 'lumber', delta: '1' } } });
  pageInstance.onMakeStorage({ currentTarget: { dataset: { kind: 'crate', count: '1' } } });
  pageInstance.onAssignStorage({ currentTarget: { dataset: { kind: 'crate', id: 'lumber', delta: '1' } } });

  pageInstance.onToggleHideDoneTechs();
  pageInstance.onInvestArpa({ currentTarget: { dataset: { id: 'monument', pct: '10' } } });
  pageInstance.onToggleSeqActive();
  pageInstance.onToggleSeqBoost();
  g2.save.world.geneLab.genes = 10;
  pageInstance.onBuyMinorTrait({ currentTarget: { dataset: { id: 'tactical' } } });

  g2.save.prestige.genesisShards = 100;
  pageInstance.onBuyCrispr({ currentTarget: { dataset: { id: 'hardened_genes' } } });
  pageInstance.onBuyPerk({ currentTarget: { dataset: { id: 'automation' } } });
  pageInstance.onToggleAllMissions();
  pageInstance.onSetPreset({ currentTarget: { dataset: { field: 'universe', val: 'magic' } } });
  pageInstance.onToggleMadArm();
  assert.equal(g2.save.world.madArmed, true);
  pageInstance.onTriggerMad();
  assert.equal(pageInstance.data.modal.open, true);
  pageInstance.onModalBtnTap({ currentTarget: { dataset: { idx: 1 } } }); // 确认核爆重置
  assert.equal(g2.save.world.eraIndex, 0);
  assert.equal(g2.save.world.universe, 'magic');

  pageInstance.onSelectLogCat({ currentTarget: { dataset: { cat: 'progress' } } });
  pageInstance.onToggleSound();
  pageInstance.onToggleCrt();
  pageInstance.onToggleBoring();
  pageInstance.onSetNumFormat({ currentTarget: { dataset: { fmt: 'scientific' } } });
  pageInstance.onManualSave();

  // 切后台与返回前台
  pageInstance.onHide();
  pageInstance._hiddenAt = Date.now() - 120 * 1000;
  pageInstance.onShow();
  assert.ok(pageInstance.data.toastMsg.includes('离线收益'));

  // 坏存档备份保护验证
  storage.set(SAVE_KEY, '{bad-json');
  const badRes = platform.readStorageSave(mockWx, SAVE_KEY);
  assert.equal(badRes.corrupt, true);
  assert.equal(badRes.backedUp, true);
  assert.equal(storage.get(`${SAVE_KEY}_unreadable`), '{bad-json');

  // 视口切换至宽屏 >=768px 校验
  mockWx.getWindowInfo = () => ({ windowWidth: 1024, windowHeight: 768, pixelRatio: 2, safeArea: { top: 0, bottom: 768 } });
  resizeListeners.forEach(fn => fn());
  assert.equal(pageInstance.data.viewport.isWide, true);

  pageInstance.onUnload();
});

test('微信小程序配置文件、WXML/WXSS 规范与本地音频资源静态校验', () => {
  const rootProj = JSON.parse(readText('project.config.json'));
  assert.ok(rootProj.packOptions.ignore.some(item => item.value === 'miniprogram'), '根目录小游戏包应忽略 miniprogram 目录');

  const mpProj = JSON.parse(readText('miniprogram/project.config.json'));
  assert.equal(mpProj.compileType, 'miniprogram');

  const appJson = JSON.parse(readText('miniprogram/app.json'));
  assert.equal(appJson.pages[0], 'pages/index/index');
  assert.equal(appJson.window.navigationStyle, 'custom');

  // 音频文件完整性
  for (const wav of ['click.wav', 'build.wav', 'tech.wav', 'era.wav', 'nuke.wav']) {
    const buf = fs.readFileSync(path.join(MP_DIR, 'assets', 'audio', wav));
    assert.equal(buf.toString('ascii', 0, 4), 'RIFF', `${wav} 应为合法 WAV`);
  }

  // WXSS 不允许出现全局 * 选择器
  for (const wxssRel of ['miniprogram/app.wxss', 'miniprogram/pages/index/index.wxss']) {
    const css = readText(wxssRel);
    assert.equal(/\n\s*\*\s*\{/.test(css), false, `${wxssRel} 不应包含 WXSS 不支持的 * 通配符`);
  }

  // core 与 utils 不应直接引用浏览器全局对象
  for (const dir of ['core', 'utils']) {
    for (const file of fs.readdirSync(path.join(MP_DIR, dir))) {
      const raw = fs.readFileSync(path.join(MP_DIR, dir, file), 'utf8');
      const src = raw.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
      assert.equal(/\bdocument\./.test(src), false, `${dir}/${file} 不应引用 document`);
      assert.equal(/\blocalStorage\b/.test(src), false, `${dir}/${file} 不应引用 localStorage`);
      assert.equal(/\b(?:btoa|atob)\(/.test(src), false, `${dir}/${file} 不应依赖 btoa/atob`);
    }
  }

  // WXML 中的所有事件方法在 index.js 中均有实现，且没有误用 wx:key="index"
  const wxml = readText('miniprogram/pages/index/index.wxml');
  assert.equal(/wx:key=["']index["']/.test(wxml), false, 'WXML 不应误用 wx:key="index"');

  const indexJs = readText('miniprogram/pages/index/index.js');
  const handlers = new Set([...wxml.matchAll(/bind(?:tap|input)="([^"]+)"/g)].map(m => m[1]));
  handlers.add('onStopProp');
  for (const h of handlers) {
    assert.ok(new RegExp(`\\b${h}\\s*\\(`).test(indexJs), `index.js 应定义事件处理器 ${h}`);
  }
});

test('miniprogram 引擎与 evolve_web/rna.html 同操作序列数值 1:1 对等', () => {
  const html = readText('evolve_web/rna.html');
  const scripts = [...html.matchAll(/<script(?:\s+src="([^"]+)")?>([\s\S]*?)<\/script>/g)];
  const elements = new Map();
  const makeEl = (id) => {
    const el = {
      id: id || '', tagName: 'DIV', style: {}, dataset: {}, className: '', textContent: '', innerHTML: '',
      disabled: false, value: '', width: 300, height: 180, children: [], _listeners: {},
      classList: { _set: new Set(), toggle() {}, add() {}, remove() {}, contains() { return false; } },
      appendChild(c) { this.children.push(c); return c; },
      setAttribute() {}, getAttribute() { return null; }, removeAttribute() {},
      addEventListener() {}, querySelector() { return makeEl(''); }, querySelectorAll() { return []; }, closest() { return null; },
      getContext: () => ({ imageSmoothingEnabled: true, fillStyle: '', fillRect() {}, clearRect() {}, drawImage() {} }),
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 300, height: 180 })
    };
    if (id) elements.set(id, el);
    return el;
  };
  const sandbox = {
    console, Math, Date, JSON, Number, String, Array, Object, Set, Map, Error, RegExp, parseInt, parseFloat, isNaN,
    btoa: str => Buffer.from(str, 'latin1').toString('base64'),
    atob: b64 => Buffer.from(b64, 'base64').toString('latin1'),
    escape: s => s, unescape: s => s, encodeURIComponent, decodeURIComponent,
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    requestAnimationFrame: () => 0, setInterval: () => 0, setTimeout: () => 0,
    document: {
      hidden: false, activeElement: { tagName: 'BODY' }, body: makeEl('body'), documentElement: makeEl('html'),
      getElementById: id => elements.get(id) || makeEl(id),
      createElement: () => makeEl(''), querySelectorAll: () => [], addEventListener() {}
    },
    navigator: { clipboard: null }
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.window.addEventListener = (ev, fn) => { if (ev === 'load') sandbox.__onLoad = fn; };
  sandbox.document.documentElement.style.setProperty = () => {};
  const ctx = vm.createContext(sandbox);
  for (const m of scripts) {
    if (m[1]) vm.runInContext(fs.readFileSync(path.join(ROOT, 'evolve_web', m[1]), 'utf8'), ctx);
    else if (m[2]) vm.runInContext(m[2], ctx);
  }
  sandbox.__onLoad();

  const mp = createEvolveGame();

  // 执行完全相同的 12 次采集、买细胞膜、20 步 0.25s 模拟、进化至农业并造田
  vm.runInContext(`
    for (let i = 0; i < 12; i++) handleStageManualClick();
    buyCellStructure('membrane');
    for (let s = 0; s < 20; s++) { recomputeCapacities(); stepSimulation(0.25); }
    for (const id of EVO_CHAIN_IDS) { save.world.res.rna = 200; save.world.res.dna = 200; buyTechnology(id); }
    buyTechnology('agriculture');
    buyBuilding('farmland', false);
    adjustJob('farmer', 2);
    for (let s = 0; s < 20; s++) { recomputeCapacities(); stepSimulation(0.25); checkMissions(); checkEraAdvancement(); }
  `, ctx);

  for (let i = 0; i < 12; i++) mp.handleStageManualClick();
  mp.buyCellStructure('membrane');
  for (let s = 0; s < 20; s++) mp.tick(0.25);
  for (const id of mp.defs.EVO_CHAIN_IDS) { mp.save.world.res.rna = 200; mp.save.world.res.dna = 200; mp.buyTechnology(id); }
  mp.buyTechnology('agriculture');
  mp.buyBuilding('farmland', false);
  mp.adjustJob('farmer', 2);
  for (let s = 0; s < 20; s++) mp.tick(0.25);

  const webSnap = vm.runInContext(`({
    eraIndex: save.world.eraIndex,
    missionIndex: save.world.missionIndex,
    pop: save.world.pop,
    food: save.world.res.food,
    lumber: save.world.res.lumber,
    stone: save.world.res.stone,
    knowledge: save.world.res.knowledge,
    foodRate: metrics.netRates.food,
    knowRate: metrics.netRates.knowledge,
    popCap: metrics.popCap
  })`, ctx);

  assert.equal(mp.save.world.eraIndex, webSnap.eraIndex);
  assert.equal(mp.save.world.missionIndex, webSnap.missionIndex);
  assert.equal(mp.save.world.pop, webSnap.pop);
  assert.equal(mp.metrics.popCap, webSnap.popCap);
  assert.ok(Math.abs(mp.save.world.res.food - webSnap.food) < 1e-9);
  assert.ok(Math.abs(mp.save.world.res.lumber - webSnap.lumber) < 1e-9);
  assert.ok(Math.abs(mp.save.world.res.stone - webSnap.stone) < 1e-9);
  assert.ok(Math.abs(mp.save.world.res.knowledge - webSnap.knowledge) < 1e-9);
  assert.ok(Math.abs(mp.metrics.netRates.food - webSnap.foodRate) < 1e-9);
  assert.ok(Math.abs(mp.metrics.netRates.knowledge - webSnap.knowRate) < 1e-9);
});
