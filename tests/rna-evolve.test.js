'use strict';

/**
 * Evolve 网页版增强系统与 rna.html 端到端单元测试
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');

function loadJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relPath), 'utf8'));
}

/**
 * 构建用于模块单测的轻量 Host 与 Context
 */
function createMockHost() {
  const RESOURCES_DEF = [
    { id: 'rna', name: 'RNA', era: 0, baseCap: 100 },
    { id: 'dna', name: 'DNA', era: 0, baseCap: 150 },
    { id: 'food', name: '食物', era: 1, baseCap: 500 },
    { id: 'lumber', name: '木材', era: 1, baseCap: 300 },
    { id: 'stone', name: '石头', era: 1, baseCap: 200 },
    { id: 'knowledge', name: '知识', era: 1, baseCap: 250 },
    { id: 'money', name: '金币', era: 2, baseCap: 1000 },
    { id: 'copper', name: '铜矿', era: 2, baseCap: 150 },
    { id: 'iron', name: '铁矿', era: 2, baseCap: 150 },
    { id: 'plywood', name: '木板', era: 2, baseCap: 100 },
    { id: 'brick', name: '红砖', era: 2, baseCap: 100 },
    { id: 'wroughtIron', name: '锻铁', era: 2, baseCap: 100 },
    { id: 'steel', name: '钢材', era: 3, baseCap: 120 },
    { id: 'cement', name: '水泥', era: 3, baseCap: 120 },
    { id: 'coal', name: '煤炭', era: 2, baseCap: 200 },
    { id: 'oil', name: '石油', era: 4, baseCap: 150 },
    { id: 'polymer', name: '聚合物', era: 4, baseCap: 100 },
    { id: 'aluminium', name: '铝材', era: 4, baseCap: 120 },
    { id: 'uranium', name: '铀矿', era: 5, baseCap: 50 },
    { id: 'electronics', name: '电子元件', era: 5, baseCap: 80 },
    { id: 'wafer', name: '晶圆', era: 5, baseCap: 60 },
    { id: 'microprocessor', name: '微处理器', era: 5, baseCap: 40 },
    { id: 'rocketParts', name: '火箭部件', era: 5, baseCap: 30 },
    { id: 'helium3', name: '氦-3', era: 6, baseCap: 80 },
    { id: 'waterIce', name: '水冰', era: 6, baseCap: 120 },
    { id: 'rareMineral', name: '稀有矿物', era: 6, baseCap: 60 }
  ];

  const unlockedRes = {};
  RESOURCES_DEF.forEach(r => { unlockedRes[r.id] = true; });
  const res = {};
  const caps = {};
  RESOURCES_DEF.forEach(r => {
    res[r.id] = 0;
    caps[r.id] = r.baseCap;
  });

  const save = {
    version: 3,
    lastActiveAt: Date.now(),
    settings: { sound: false, crt: false, theme: 'pixel', numFormat: 'metric', boring: false, mKeys: true },
    prestige: {
      count: 1,
      madCount: 1,
      arkCount: 0,
      genesisShards: 120,
      lifetimeShards: 200,
      phage: 25,
      rapidMutation: true,
      ancientRuins: true,
      perks: {},
      crispr: {},
      achievements: {},
      nextPreset: { biome: 'grassland', planetTrait: 'none', universe: 'standard', species: 'human' }
    },
    world: {
      eraIndex: 1,
      biome: 'grassland',
      planetTrait: 'none',
      universe: 'standard',
      kingdom: 'animal',
      genus: 'humanoid',
      species: 'human',
      gov: 'oligarchy',
      taxRate: 20,
      happiness: 100,
      pop: 12,
      popAccum: 0,
      clicks: 0,
      smelterMode: 'wood',
      craftFocus: 'balanced',
      madArmed: false,
      res,
      unlockedRes,
      evoCells: {},
      jobs: { farmer: 4, lumberjack: 2, banker: 1, soldier: 0 },
      buildings: { library: 1, shed: 0 },
      extraBlds: { garrison: 2, amphitheatre: 1 },
      techs: {
        currency: true,
        copperAge: true,
        ironAge: true,
        smelting: true,
        trade: true,
        steel: true
      }
    }
  };

  const metrics = {
    popCap: 25,
    caps,
    netRates: {},
    powerGen: 0,
    powerReq: 0,
    powerSurplus: 0,
    powerRatio: 1,
    taxIncome: 10
  };
  let envMods = {};
  const toasts = [];

  const host = {
    ERAS_DEF: [
      { id: 'proto', name: '生命起源' }, { id: 'agri', name: '农业文明' },
      { id: 'ancient', name: '古代文明' }, { id: 'ind', name: '工业时代' },
      { id: 'atomic', name: '原子时代' }, { id: 'info', name: '信息时代' },
      { id: 'space', name: '太空文明' }
    ],
    RESOURCES_DEF,
    JOBS_DEF: [],
    BUILDINGS_DEF: [
      { id: 'farmland', name: '肥沃农田', baseCost: { lumber: 15 }, growth: 1.15 },
      { id: 'steelMill', name: '炼钢厂', baseCost: { steel: 20 }, growth: 1.2, reqTech: 'steel' }
    ],
    TECHS_DEF: [
      { id: 'sampleTech', name: '示例科技', era: 1, req: [], cost: { knowledge: 10 } }
    ],
    TECH_MAP: {
      sampleTech: { id: 'sampleTech', name: '示例科技', era: 1, req: [], cost: { knowledge: 10 } }
    },
    EVOLVE_EXTRA_BLDS_DEF: [],
    getSave: () => save,
    getMetrics: () => metrics,
    getEnvMods: () => envMods,
    setEnvMods: (m) => { envMods = m; },
    getResName: (id) => {
      const r = RESOURCES_DEF.find(x => x.id === id);
      return r ? r.name : id;
    },
    addResourceClamped: (id, delta) => {
      const cap = metrics.caps[id] || 999999;
      save.world.res[id] = Math.max(0, Math.min(cap, (save.world.res[id] || 0) + delta));
    },
    recomputeCapacities: () => {
      RESOURCES_DEF.forEach(r => { metrics.caps[r.id] = r.baseCap; });
      const bridge = require('../evolve_web/js/evolve-bridge.js');
      metrics.popCap = bridge.applyExtendedCapacities(host, metrics.caps, 25);
    },
    showToast: (msg) => { toasts.push(msg); },
    tryBuyBuildingSingle: (bId) => {
      save.world.buildings[bId] = (save.world.buildings[bId] || 0) + 1;
      return true;
    },
    tryBuyTechnology: (tId) => {
      save.world.techs[tId] = true;
      return true;
    },
    canAffordCost: (costObj) => Object.entries(costObj || {}).every(([k, v]) => (save.world.res[k] || 0) >= v),
    getEffectiveTechCost: (t) => t.cost || {},
    getBuildingCost: (b) => b.baseCost || {},
    toasts
  };

  return host;
}

test('Evolve 数据文件与 evolve-bundle.js 完整同步且覆盖规模达标', () => {
  const bp = loadJson('evolve_web/data/biomes_planets.json');
  const st = loadJson('evolve_web/data/species_traits.json');
  const ga = loadJson('evolve_web/data/gov_arpa_crispr.json');
  const ea = loadJson('evolve_web/data/events_achieves.json');

  assert.equal(bp.biomes.length, 10);
  assert.equal(bp.planetTraits.length, 13);
  assert.equal(bp.universes.length, 6);
  assert.equal(bp.seasons.length, 4);
  assert.equal(bp.weathers.length, 8);
  assert.equal(bp.moons.length, 8);
  assert.equal(bp.zodiac.length, 12);

  assert.equal(st.genera.length, 16);
  assert.equal(st.species.length, 34);
  assert.ok(Object.keys(st.traits).length >= 100, '特质词条应不少于 100 项');
  assert.equal(st.minorTraits.length, 15);

  assert.equal(ga.governments.length, 10);
  assert.equal(ga.governorBackgrounds.length, 10);
  assert.equal(ga.arpaProjects.length, 5);
  assert.equal(ga.crisprUpgrades.length, 18);

  assert.ok(ea.events.length >= 20);
  assert.equal(ea.achievements.length, 30);
  assert.equal(ea.themes.length, 8);

  const dl = require('../evolve_web/js/data-loader.js');
  assert.equal(dl.DATA.species.length, st.species.length);
  assert.equal(dl.DATA.themes.length, ea.themes.length);
  assert.ok(dl.MAPS.species.human && dl.MAPS.governments.theocracy);
});

test('历法天气、月相星座、士气拆解与抗税暴动机制', () => {
  const bridge = require('../evolve_web/js/evolve-bridge.js');
  const calMod = require('../evolve_web/js/calendar-weather.js');
  const host = createMockHost();
  const save = host.getSave();
  bridge.ensureAllFields(save);
  const ctx = bridge.createContext(host);

  const startDay = save.world.calendar.day;
  const startMoon = save.world.calendar.moon;
  calMod.stepCalendar(ctx, 18);
  assert.notEqual(save.world.calendar.day, startDay);
  assert.ok(save.world.calendar.moon !== startMoon || save.world.calendar.day > startDay);

  save.prestige.crispr.unlocked = true;
  save.prestige.achievements.ach_second_evolution = true;
  const env = calMod.computeEnvironmentMods(ctx);
  assert.ok(env.masteryPct > 0);
  assert.ok(env.globalMult > 1);
  assert.ok(env.zodiac && env.zodiac.name);

  // 高税率导致长期低士气并累积暴动风险
  save.world.taxRate = 60;
  save.world.res.food = 500;
  const rates = { food: 10, knowledge: 5, money: 5 };
  for (let i = 0; i < 4; i++) {
    calMod.computeMoraleAndCheckRevolt(ctx, 2, rates, 25, 1.0);
  }
  const mb = host.getMetrics().moraleBreakdown;
  assert.ok(mb && typeof mb.final === 'number' && mb.tax < 0);
});

test('仓储箱柜、市场贸易路线、电力通断与建筑研究队列', () => {
  const bridge = require('../evolve_web/js/evolve-bridge.js');
  const ecoMod = require('../evolve_web/js/economy-storage.js');
  const host = createMockHost();
  const save = host.getSave();
  bridge.ensureAllFields(save);
  const w = save.world;
  w.extraBlds.storage_yard = 2;
  w.res.plywood = 100;
  w.res.steel = 100;
  w.res.money = 1000;
  w.res.iron = 80;
  host.recomputeCapacities();

  const ctx = bridge.createContext(host);
  const baseFoodCap = host.getMetrics().caps.food;

  // 建造并分配板条箱 + 集装箱
  const mkC = ecoMod.constructStorageUnit(ctx, 'crate', 2);
  assert.equal(mkC.ok, true);
  const asC = ecoMod.assignStorageUnit(ctx, 'crate', 'food', 2);
  assert.equal(asC.ok, true);

  const mkN = ecoMod.constructStorageUnit(ctx, 'container', 1);
  assert.equal(mkN.ok, true);
  const asN = ecoMod.assignStorageUnit(ctx, 'container', 'food', 1);
  assert.equal(asN.ok, true);

  host.recomputeCapacities();
  assert.ok(host.getMetrics().caps.food > baseFoodCap, '分配箱柜后食物容量应上升');

  // 市场交易与自动贸易路线
  w.res.money = 500;
  const sellRes = ecoMod.tradeMarketOrder(ctx, 'iron', 'sell', 10);
  assert.equal(sellRes.ok, true);
  const rtRes = ecoMod.adjustTradeRoute(ctx, 'lumber', 1);
  assert.equal(rtRes.ok, true);
  const rates = { money: 0, lumber: 0 };
  ecoMod.stepMarketAndTrade(ctx, 1, rates);
  assert.ok(rates.lumber > 0 && rates.money < 0, '买入贸易路线应增加木材并扣除金币');

  // 电力开关与排队建造/研究
  w.buildings.steelMill = 3;
  ecoMod.toggleBuildingPower(ctx, 'steelMill', -1, false);
  assert.equal(ecoMod.getActiveBuildingCount(w, 'steelMill', false), 2);

  w.res.lumber = 50;
  w.res.knowledge = 50;
  assert.equal(ecoMod.enqueueBuild(ctx, 'farmland', false).ok, true);
  assert.equal(ecoMod.enqueueResearch(ctx, 'sampleTech').ok, true);
  ecoMod.stepQueues(ctx);
  assert.equal(w.buildings.farmland, 1);
  assert.equal(w.techs.sampleTech, true);
});

test('外邦外交战役、间谍渗入、ARPA工程、基因编辑、CRISPR与总督自动化', () => {
  const bridge = require('../evolve_web/js/evolve-bridge.js');
  const diploMod = require('../evolve_web/js/diplomacy-military.js');
  const arpaMod = require('../evolve_web/js/arpa-genetics.js');
  const evMod = require('../evolve_web/js/events-achieves.js');
  const host = createMockHost();
  const save = host.getSave();
  bridge.ensureAllFields(save);
  const ctx = bridge.createContext(host);
  const w = save.world;

  // 军事招募、强化、战役与间谍（古代文明及以上开启）
  w.eraIndex = 2;
  w.res.money = 2000;
  w.res.knowledge = 250;
  w.res.food = 500;
  w.res.steel = 120;
  w.res.cement = 120;
  w.techs.rocketry = true;
  w.garrison.soldiers = 12;
  w.garrison.raidSize = 10;
  const camp = diploMod.launchCampaign(ctx, 0);
  assert.equal(typeof camp.ok, 'boolean');

  const tr = diploMod.trainSpy(ctx, 1);
  assert.equal(tr.ok, true);
  diploMod.stepDiplomacyAndMilitary(ctx, 20, {});
  const inf = diploMod.runSpyOp(ctx, 1, 'influence');
  assert.equal(inf.ok, true);

  // ARPA 投资并升满1级
  w.techs.construction = true;
  w.techs.electronics = true;
  w.eraIndex = 4;
  w.res.stone = 300;
  w.res.lumber = 200;
  w.res.cement = 100;
  w.res.steel = 100;
  const inv = arpaMod.investArpaProject(ctx, 'monument', 100);
  assert.equal(inv.ok, true);
  assert.equal(inv.completed, true);
  assert.equal(w.arpa.monument.rank, 1);

  // 基因测序 -> 次要特质 & CRISPR 解锁与负面消除
  w.geneLab.seqActive = true;
  w.geneLab.seqProgress = w.geneLab.seqMax - 0.5;
  arpaMod.stepGeneLab(ctx, 2.0);
  assert.ok(w.geneLab.genes >= 1, '测序完成后应产出基因点数');
  const buyMt = arpaMod.buyMinorTrait(ctx, 'tactical');
  assert.equal(buyMt.ok, true);

  // CRISPR 按完整前提链依次解锁（hardened_genes -> unlocked; morphogenesis -> recombination -> synthesis -> mutation; geographer -> governance）
  save.prestige.genesisShards = 500;
  for (const cid of ['hardened_genes', 'unlocked', 'morphogenesis', 'recombination', 'synthesis', 'geographer', 'governance']) {
    assert.equal(arpaMod.buyCrisprUpgrade(ctx, cid).ok, true, `应可购买 CRISPR ${cid}`);
  }
  w.geneLab.genes = 5;
  w.species = 'elf'; // 测试消除负面特质
  const negList = ctx.dl.getEffectiveTraits(w).filter(id => ctx.dl.DATA.traits[id] && !ctx.dl.DATA.traits[id].positive);
  if (negList.length > 0) {
    assert.equal(arpaMod.buyCrisprUpgrade(ctx, 'mutation').ok, true);
    assert.equal(arpaMod.removeNegativeTrait(ctx, negList[0]).ok, true);
  }

  arpaMod.rerollGovernorCandidates(ctx);
  const firstBg = w.governor.candidates[0];
  assert.equal(arpaMod.appointGovernor(ctx, firstBg).ok, true);
  w.governor.tasks.autoTax = true;
  w.happiness = 120;
  arpaMod.stepGovernor(ctx, 3);
  assert.equal(w.taxRate, 30, '寡头制高士气下总督应自动提升税率至 30%');

  // 成就自动解锁（第二次演化 & 建造纪念碑等）
  w.buildings.spaceArk = 0;
  evMod.checkAchievements(ctx);
  assert.ok(save.prestige.achievements.ach_second_evolution);
  assert.equal(save.prestige.achievements.ach_second_evolution.universe, 'standard');
  assert.ok(save.prestige.achievements.ach_arpa_1);
  assert.equal(Boolean(save.prestige.achievements.ach_bioseed), false);
});

test('evolve_web/rna.html 在 Node VM 中可完整解析、加载、跨时代推进与转生存档往返', () => {
  const html = fs.readFileSync(path.join(ROOT, 'evolve_web', 'rna.html'), 'utf8');
  const scripts = [...html.matchAll(/<script(?:\s+src="([^"]+)")?>([\s\S]*?)<\/script>/g)];
  assert.ok(scripts.length >= 9, 'rna.html 应引入全部 evolve_web 脚本与主脚本');

  // 创建能运行全量 DOM 查询、canvas 与本地存储的轻量模拟容器
  const elements = new Map();
  const makeEl = (id) => {
    const el = {
      id: id || '',
      tagName: 'DIV',
      style: {},
      dataset: {},
      className: '',
      textContent: '',
      innerHTML: '',
      disabled: false,
      value: '',
      width: 300,
      height: 180,
      children: [],
      _listeners: {},
      classList: {
        _set: new Set(),
        toggle(cls, force) {
          if (force === undefined) {
            if (this._set.has(cls)) this._set.delete(cls);
            else this._set.add(cls);
          } else if (force) this._set.add(cls);
          else this._set.delete(cls);
        },
        add(cls) { this._set.add(cls); },
        remove(cls) { this._set.delete(cls); },
        contains(cls) { return this._set.has(cls); }
      },
      appendChild(child) { this.children.push(child); return child; },
      setAttribute(k, v) { this[k] = String(v); },
      getAttribute(k) { return this[k] ?? null; },
      removeAttribute(k) { delete this[k]; },
      addEventListener(ev, fn) { (this._listeners[ev] = this._listeners[ev] || []).push(fn); },
      querySelector() { return makeEl(''); },
      querySelectorAll() { return []; },
      closest() { return null; },
      getContext() {
        return {
          imageSmoothingEnabled: true,
          fillStyle: '',
          strokeStyle: '',
          lineWidth: 1,
          globalAlpha: 1,
          font: '',
          fillRect() {},
          strokeRect() {},
          clearRect() {},
          beginPath() {},
          moveTo() {},
          lineTo() {},
          arc() {},
          fill() {},
          stroke() {},
          fillText() {},
          drawImage() {}
        };
      },
      getBoundingClientRect() { return { left: 0, top: 0, width: 300, height: 180 }; },
      select() {}
    };
    if (id) elements.set(id, el);
    return el;
  };

  const localStore = new Map();
  const sandbox = {
    console,
    Math,
    Date,
    JSON,
    Number,
    String,
    Array,
    Object,
    Set,
    Map,
    Error,
    RegExp,
    parseInt,
    parseFloat,
    isNaN,
    btoa: (str) => Buffer.from(str, 'latin1').toString('base64'),
    atob: (b64) => Buffer.from(b64, 'base64').toString('latin1'),
    escape: (str) => str.replace(/[^\w@*\-+.\/]/g, c => {
      const code = c.charCodeAt(0);
      return code < 256 ? '%' + code.toString(16).toUpperCase().padStart(2, '0') : '%u' + code.toString(16).toUpperCase().padStart(4, '0');
    }),
    unescape: (str) => str.replace(/%u([0-9A-Fa-f]{4})|%([0-9A-Fa-f]{2})/g, (_, u, h) => String.fromCharCode(parseInt(u || h, 16))),
    encodeURIComponent,
    decodeURIComponent,
    localStorage: {
      getItem: (k) => (localStore.has(k) ? localStore.get(k) : null),
      setItem: (k, v) => localStore.set(k, String(v)),
      removeItem: (k) => localStore.delete(k)
    },
    requestAnimationFrame: () => 0,
    setInterval: () => 0,
    setTimeout: () => 0,
    document: {
      hidden: false,
      activeElement: { tagName: 'BODY' },
      body: makeEl('body'),
      documentElement: makeEl('html'),
      getElementById(id) {
        if (!elements.has(id)) makeEl(id);
        return elements.get(id);
      },
      createElement(tag) {
        const el = makeEl('');
        el.tagName = String(tag || 'DIV').toUpperCase();
        return el;
      },
      querySelectorAll() { return []; },
      addEventListener() {}
    },
    navigator: { clipboard: null }
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.window.addEventListener = (ev, fn) => {
    if (ev === 'load') sandbox.__onLoad = fn;
  };
  sandbox.document.documentElement.style.setProperty = () => {};

  const context = vm.createContext(sandbox);
  for (const m of scripts) {
    if (m[1]) {
      const code = fs.readFileSync(path.join(ROOT, 'evolve_web', m[1]), 'utf8');
      vm.runInContext(code, context, { filename: m[1] });
    } else if (m[2]) {
      vm.runInContext(m[2], context, { filename: 'evolve_web/rna.html:inline' });
    }
  }

  // 执行 onload 与核心游戏循环函数
  assert.equal(typeof sandbox.__onLoad, 'function');
  sandbox.__onLoad();

  // 测试生命起源阶段：子页签仅含 evo_species，且允许切换当前轮回物种
  const originState = vm.runInContext(`
    const h0 = getHostApi();
    const evoTabs0 = EvolveModules.UI.getSubTabs(h0, 'evo').map(s => s.id);
    const bldTabs0 = EvolveModules.UI.getSubTabs(h0, 'bld').map(s => s.id);
    const techTabs0 = EvolveModules.UI.getSubTabs(h0, 'tech').map(s => s.id);
    const fakeBtnElf = { dataset: { species: 'elf' }, closest(sel) { return sel === 'button[data-species]' ? this : null; } };
    document.getElementById('tab-content')._listeners.click.forEach(fn => fn({ target: fakeBtnElf }));
    ({ evoTabs0, bldTabs0, techTabs0, speciesBefore: save.world.species });
  `, context);
  assert.deepEqual(Array.from(originState.evoTabs0), ['evo_species']);
  assert.deepEqual(Array.from(originState.bldTabs0), []);
  assert.deepEqual(Array.from(originState.techTabs0), []);
  assert.equal(originState.speciesBefore, 'elf');

  // 手动采集 RNA 若干次 + 步进模拟 + 购买细胞器 + 研发智人进化进入农业时代
  vm.runInContext(`
    handleStageManualClick();
    save.world.res.rna = 100;
    save.world.res.dna = 150;
    for (let i = 0; i < EVO_CHAIN_IDS.length; i++) {
      const id = EVO_CHAIN_IDS[i];
      save.world.res.rna = 200;
      save.world.res.dna = 200;
      buyTechnology(id);
    }
    recomputeCapacities();
    checkEraAdvancement();
    stepSimulation(1.0);
    updateUI();
    saveGame(false);
  `, context);

  const eraIdx = vm.runInContext('save.world.eraIndex', context);
  assert.ok(eraIdx >= 1, '完成 8 步进化后应进入农业文明');
  assert.ok(localStore.has('pixel_human_era_save_v3'), 'saveGame 应持久化至原存档键');

  // 验证进化完成后：锁定当前轮回物种、移除 evo_species 板块、隐藏并停算 RNA/DNA、科技树排除起源节点、方舟队列防重
  const postEvoCheck = vm.runInContext(`
    const h1 = getHostApi();
    const fakeBtnOrc = { dataset: { species: 'orc' }, closest(sel) { return sel === 'button[data-species]' ? this : null; } };
    document.getElementById('tab-content')._listeners.click.forEach(fn => fn({ target: fakeBtnOrc }));
    const evoTabs1 = EvolveModules.UI.getSubTabs(h1, 'evo').map(s => s.id);
    const activeEvoSub = EvolveModules.UI.getActiveSubTab('evo', h1);
    const rnaHidden = document.getElementById('lres-card-rna').classList.contains('hidden');
    const dnaHidden = document.getElementById('lres-card-dna').classList.contains('hidden');
    const techBox = document.createElement('div');
    EvolveModules.UI.setSubTab('tech', 'tech_tree');
    EvolveModules.UI.renderSubTabContent(h1, techBox, 'tech');
    const techHtml = techBox.children.map(c => c.innerHTML).join('');
    const wikiBox = document.createElement('div');
    EvolveModules.UI.setSubTab('sys', 'sys_wiki');
    EvolveModules.UI.renderSubTabContent(h1, wikiBox, 'sys');
    const wikiHtml = wikiBox.children.map(c => c.innerHTML).join('');
    const presBox = document.createElement('div');
    EvolveModules.UI.setSubTab('prestige', 'pres_reset');
    EvolveModules.UI.renderSubTabContent(h1, presBox, 'prestige');
    const presHtml = presBox.children.map(c => c.innerHTML).join('');
    const ctx1 = EvolveModules.Bridge.createContext(h1);
    const q1 = EvolveModules.EconomyStorage.enqueueBuild(ctx1, 'colonyShip', false);
    const q2 = EvolveModules.EconomyStorage.enqueueBuild(ctx1, 'colonyShip', false);
    ({
      speciesAfter: save.world.species,
      evoTabs1,
      activeEvoSub,
      rnaHidden,
      dnaHidden,
      rnaRate: metrics.netRates.rna,
      dnaRate: metrics.netRates.dna,
      resCountText: document.getElementById('left-res-count').textContent,
      hasEvoMembraneInTech: techHtml.includes('细胞膜'),
      hasRnaInWiki: wikiHtml.includes('>RNA<'),
      hasPresetSpecies: presHtml.includes('data-preset-species='),
      shipQ1: q1.ok,
      shipQ2: q2.ok
    });
  `, context);

  assert.equal(postEvoCheck.speciesAfter, 'elf', '进化完成后当前轮回不可再切换物种');
  assert.deepEqual(Array.from(postEvoCheck.evoTabs1), ['evo_pop', 'evo_gov', 'evo_governor']);
  assert.equal(postEvoCheck.activeEvoSub, 'evo_pop', '进化完成后子页签应自动切换至人口职业');
  assert.equal(postEvoCheck.rnaHidden, true, '进化完成后左侧应隐藏 RNA 卡片');
  assert.equal(postEvoCheck.dnaHidden, true, '进化完成后左侧应隐藏 DNA 卡片');
  assert.equal(postEvoCheck.rnaRate, 0, '进化完成后 RNA 产率应停止计算');
  assert.equal(postEvoCheck.dnaRate, 0, '进化完成后 DNA 产率应停止计算');
  assert.match(postEvoCheck.resCountText, /\/24$/, '进化完成后资源计数应排除 RNA/DNA 变为 24');
  assert.equal(postEvoCheck.hasEvoMembraneInTech, false, '文明科技树不应重复出现起源进化节点');
  assert.equal(postEvoCheck.hasRnaInWiki, false, '进化完成后资源百科应隐藏 RNA/DNA');
  assert.equal(postEvoCheck.hasPresetSpecies, true, '转生预设面板应支持预设下一轮回物种');
  assert.equal(postEvoCheck.shipQ1, true);
  assert.equal(postEvoCheck.shipQ2, false, '唯一建筑恒星际殖民方舟不应允许重复加入队列');

  // 测试核弹 MAD 与星际方舟重置 + preset 应用 + Base64 导入导出兼容性
  const madRes = vm.runInContext(`
    save.world.eraIndex = 4;
    save.world.techs.nuclearFission = true;
    save.world.extraBlds.missile_silo = 1;
    save.world.extraBlds.garrison = 6;
    save.world.pop = 60;
    save.world.res.knowledge = 1000;
    save.prestige.nextPreset = { biome: 'volcanic', planetTrait: 'rich', universe: 'evil', species: 'orc' };
    save.world.madArmed = true;
    const canMad = canMadResetNow();
    const g = calcMadPlasmidGain();
    saveGame(false);
    const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(save))));
    const decoded = JSON.parse(decodeURIComponent(escape(atob(b64))));
    EvolveModules.Bridge.applyNextWorldPreset(save);
    ({ canMad, gain: g, decodedEra: decoded.world.eraIndex, biome: save.world.biome, univ: save.world.universe, species: save.world.species, genus: save.world.genus });
  `, context);

  assert.equal(madRes.canMad, true);
  assert.ok(madRes.gain >= 20);
  assert.equal(madRes.decodedEra, 4);
  assert.equal(madRes.biome, 'volcanic');
  assert.equal(madRes.univ, 'evil');
  assert.equal(madRes.species, 'orc');
  assert.equal(madRes.genus, 'humanoid');
});
