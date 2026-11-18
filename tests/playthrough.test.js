'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const createGame = require('../js/engine');

test('从空存档采集、分工、建设到完成 M51 并跃迁', () => {
  const game = createGame();
  const world = game.save.world;
  const goals = {
    primitiveHut: 23, warehouse: 5, oilWell: 10, refinery: 5, freightWarehouse: 3,
    bank: 5, library: 5, university: 4, researchCenter: 4, datacenter: 4,
    supercomputer: 3, mine: 3, coalPowerPlant: 6, nuclearPowerPlant: 4,
    farmland: 3, coalMine: 5
  };
  const workers = {
    farmer: 16, lumberjack: 9, scholar: 5, quarryWorker: 9, miner: 8,
    craftsman: 4, coalMiner: 8, merchant: 6, colonist: 4, scientist: 8
  };
  // 只通过玩家操作和时间推进游戏，不写入库存、科技、任务或时代。
  for (let turn = 0; turn < 50000 && world.missionIndex < 51; turn++) {
    for (let click = 0; click < 5; click++) game.collect();
    game.action();
    for (const tech of game.defs.TECHS_DEF) {
      if (!world.techs[tech.id]) game.research(tech.id);
    }
    if (world.eraIndex >= 5) Object.assign(goals, {
      factory: 4, steelMill: 4, mine: 8, refinery: 9, oilWell: 18, coalMine: 12
    });
    for (let level = 1; level <= 16; level++) {
      for (const [job, target] of Object.entries(workers)) {
        if (level <= target && (world.jobs[job] || 0) < level) game.adjustJob(job, 1);
      }
    }
    for (const building of game.defs.BUILDINGS_DEF) {
      if ((world.buildings[building.id] || 0) < (goals[building.id] || 1)) game.build(building.id);
    }
    game.tick(5);
  }
  assert.equal(world.missionIndex, 51);
  assert.equal(world.buildings.colonyShip, 1);
  assert.equal(game.prestige(), true);
  assert.equal(game.save.world.eraIndex, 0);
  assert(game.save.prestige.genesisShards > 0);
});
