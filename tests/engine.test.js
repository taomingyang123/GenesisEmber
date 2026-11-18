'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const createGame = require('../js/engine');
const { encodeSave, decodeSave } = require('../js/save-code');
const { mature } = require('./helpers');

test('完整迁移原始定义，并兼容原版 Base64 存档码', () => {
  const game = createGame();
  assert.deepEqual(['ERAS_DEF', 'RESOURCES_DEF', 'JOBS_DEF', 'BUILDINGS_DEF', 'TECHS_DEF', 'MISSIONS_DEF', 'PERKS_DEF'].map(k => game.defs[k].length), [7, 26, 12, 35, 44, 51, 7]);
  const original = fs.readFileSync(require.resolve('../evolve_web/rna.html'), 'utf8');
  const definitions = original.slice(original.indexOf('const ERAS_DEF = ['), original.indexOf('        /* =====================================================================\n           2. 存档结构'));
  const baseline = vm.runInNewContext(definitions + '\nJSON.stringify({ERAS_DEF,RESOURCES_DEF,JOBS_DEF,BUILDINGS_DEF,TECHS_DEF,PERKS_DEF})');
  const actual = {}; ['ERAS_DEF', 'RESOURCES_DEF', 'JOBS_DEF', 'BUILDINGS_DEF', 'TECHS_DEF', 'PERKS_DEF'].forEach(k => { actual[k] = game.defs[k]; });
  assert.deepEqual(JSON.parse(JSON.stringify(actual)), JSON.parse(baseline));
  const fixture = { ...game.save, note: '从 RNA 到星际方舟 🧬' };
  const legacyCode = Buffer.from(JSON.stringify(fixture)).toString('base64');
  assert.equal(encodeSave(fixture), legacyCode);
  assert.deepEqual(decodeSave(legacyCode), fixture);
});

test('新玩家可完成 RNA、DNA、八次进化并获得初始农业人口与住房', () => {
  const g = createGame();
  for (const id of g.defs.EVO_CHAIN_IDS) {
    const def = g.defs.TECH_MAP[id];
    for (let i = 0; g.save.world.res.rna < (def.cost.rna || 0) && i < 200; i++) g.collect();
    for (let i = 0; g.save.world.res.dna < (def.cost.dna || 0) && i < 200; i++) {
      while (g.save.world.res.rna < 2) g.collect();
      g.action();
    }
    while (g.save.world.res.rna < (def.cost.rna || 0)) g.collect();
    g.research(id);
    assert(g.save.world.techs[id], id);
  }
  assert.equal(g.save.world.eraIndex, 1);
  assert.equal(g.save.world.pop, 2);
  assert.equal(g.metrics.popCap, 5);
  g.adjustJob('farmer', 5);
  assert.equal(g.save.world.jobs.farmer, 2);
  g.tick(.25);
  assert(g.metrics.netRates.food > 0);
  g.adjustJob('scientist', 1);
  assert.equal(g.save.world.jobs.scientist, undefined);
});

test('建筑批量、逐座取整、最大数量与唯一方舟限制', () => {
  const g = mature(createGame());
  const hut = g.defs.BUILDINGS_DEF.find(b => b.id === 'primitiveHut');
  const before = g.save.world.buildings.primitiveHut;
  const cost = g.getBuildingCost(hut, 10), lumber = g.save.world.res.lumber;
  g.setBatch(10); g.build(hut.id);
  assert.equal(g.save.world.buildings.primitiveHut, before + 10);
  assert.equal(lumber - g.save.world.res.lumber, cost.lumber);
  const ship = g.save.world.buildings.colonyShip;
  g.setBatch('MAX'); g.build('colonyShip');
  assert.equal(g.save.world.buildings.colonyShip, ship);
});

test('任务奖励只发一次，科技与建筑不可跨时代购买', () => {
  const g = createGame();
  for (let i = 0; i < 10; i++) g.collect();
  assert.equal(g.save.world.missionIndex, 1);
  const rna = g.save.world.res.rna;
  g.tick(.25); assert.equal(g.save.world.res.rna, rna);
  g.save.world.techs.evo_sapiens = true;
  g.save.world.res.knowledge = 1e9;
  g.research('rocketry'); g.build('launchPad');
  assert.equal(g.save.world.techs.rocketry, undefined);
  assert.equal(g.save.world.buildings.launchPad, undefined);
});

test('电网燃料限制会降低工业产出，库存始终有限且非负', () => {
  const g = mature(createGame(), 3);
  const w = g.save.world;
  w.jobs = {}; w.buildings.coalPowerPlant = 0;
  const before = w.res.steel; g.tick(.25);
  assert.equal(g.metrics.powerRatio, 0);
  assert.equal(w.res.steel, before);
  w.buildings.coalPowerPlant = 30; w.res.coal = 100;
  w.res.steel = 0; g.tick(.25);
  assert(g.metrics.powerRatio > 0);
  assert(w.res.steel > 0);
  g.catchUp(1800);
  Object.keys(w.res).forEach(id => { assert(Number.isFinite(w.res[id])); assert(w.res[id] >= 0 && w.res[id] <= g.metrics.caps[id]); });
});

test('旧存档缺失字段可补齐，坏存档不能替换当前状态', () => {
  const g = createGame();
  const raw = JSON.parse(JSON.stringify(g.save));
  raw.world.res = { rna: -99, dna: 10 };
  raw.world.jobs = { farmer: 1e99, unknown: 999 };
  raw.prestige = { genesisShards: 8, perks: { automation: 500 } };
  raw.lastActiveAt = Date.now();
  g.load(raw);
  assert.equal(g.save.world.res.rna, 0);
  assert.equal(g.save.world.res.dna, 10);
  assert.equal(g.getPerkLevel('automation'), 5);
  assert.equal(g.save.prestige.lifetimeShards, 8);
  assert.equal(Object.keys(g.save.world.res).length, 26);
  const previous = JSON.stringify(g.save);
  [null, [], { version: 99, world: {} }, { version: 3, world: null }].forEach(x => assert.throws(() => g.load(x)));
  assert.equal(JSON.stringify(g.save), previous);
  ['', 'invalid', 'AAAA====', '////'].forEach(code => assert.throws(() => decodeSave(code)));
});

test('离线收益上限与单次结算时间戳，跃迁保留加成和天赋', () => {
  const g = mature(createGame());
  g.save.prestige.genesisShards = 50; g.save.prestige.lifetimeShards = 50;
  const mult = g.getShardMultiplier();
  g.buyPerk('agriculturalRevolution');
  assert.equal(g.getShardMultiplier(), mult);
  assert(g.prestige());
  assert.equal(g.save.world.eraIndex, 0);
  assert.equal(g.getPerkLevel('agriculturalRevolution'), 1);
  assert(g.getShardMultiplier() > mult);
  assert.equal(g.metrics.powerGen, 0);
  const raw = JSON.parse(JSON.stringify(g.save));
  raw.world.techs = { evo_membrane: true, evo_organelle: true };
  const now = Date.now(); raw.lastActiveAt = now - 100 * 3600000;
  assert.equal(g.load(raw, now), 8 * 3600);
  assert.equal(g.load(JSON.parse(JSON.stringify(g.save)), now), 0);
  g.save.prestige.perks.deepHibernation = 5;
  assert.equal(g.catchUp(100 * 3600), 48 * 3600);
  g.reset();
  assert.equal(g.metrics.powerGen, 0);
  assert.equal(g.save.prestige.count, 0);
});

test('时代晋升条件覆盖农业、城市、工业、原子、信息、太空与终局任务', () => {
  const g = createGame(); const w = g.save.world;
  w.techs.evo_sapiens = true; g.tick(.25); assert.equal(w.eraIndex, 1);
  w.pop = 45; w.techs.mining = true; w.techs.mathematics = true; w.missionIndex = 17;
  g.tick(.25); assert.equal(w.eraIndex, 2);
  w.pop = 120; w.techs.steel = true; w.buildings.university = 1; w.missionIndex = 26;
  g.tick(.25); assert.equal(w.eraIndex, 3);
  w.techs.electronics = true; w.buildings.coalPowerPlant = 2; w.res.coal = 50; w.missionIndex = 34;
  g.tick(.25); assert.equal(w.eraIndex, 4);
  w.techs.particlePhysics = true; w.buildings.nuclearPowerPlant = 1; w.missionIndex = 37;
  g.tick(.25); assert.equal(w.eraIndex, 5);
  w.techs.artificialIntelligence = true; w.buildings.supercomputer = 1; w.missionIndex = 43;
  g.tick(.25); assert.equal(w.eraIndex, 6);
  w.missionIndex = 50; w.techs.interstellarTravel = true; w.buildings.colonyShip = 1;
  g.tick(.25); assert.equal(w.missionIndex, 51); assert(g.canPrestigeNow());
});
