'use strict';

const createDefinitions = require('./data');

module.exports = function createGame(hooks = {}) {
  const metrics = { caps: {}, netRates: {}, popCap: 0, popGrowthRate: 0,
    popBaseRate: 0, popVacancyBonus: 0, popProsperityMult: 1, happyMult: 1,
    powerGen: 0, powerReq: 0, powerSurplus: 0, powerRatio: 1 };
  const defs = createDefinitions(metrics);
  const { ERAS_DEF, RESOURCES_DEF, RES_MAP, EVO_CHAIN_IDS, JOBS_DEF,
    BUILDINGS_DEF, TECHS_DEF, TECH_MAP, MISSIONS_DEF, PERKS_DEF } = defs;
  let quiet = false;
  const showToast = msg => { if (!quiet && hooks.toast) hooks.toast(msg); };
  const sound = {};
  ['Click', 'Build', 'Tech', 'Era'].forEach(name => {
    sound['play' + name] = () => { if (!quiet && save.settings.sound && hooks.sound) hooks.sound(name.toLowerCase()); };
  });
  const feedback = (label, color) => { if (hooks.float) hooks.float(label, color); };
  let buildBatch = 1;

  function createInitialWorld() {
      const res = {};
      const unlockedRes = {};
      RESOURCES_DEF.forEach(r => {
          res[r.id] = 0;
          unlockedRes[r.id] = r.era === 0;
      });
      return {
          eraIndex: 0,
          res,
          unlockedRes,
          pop: 0,
          popAccum: 0,
          happiness: 100,
          jobs: {},
          buildings: {},
          techs: {},
          missionIndex: 0,
          clicks: 0
      };
  }

  const DEFAULT_SAVE = {
      version: 3,
      lastActiveAt: Date.now(),
      prestige: {
          count: 0,
          genesisShards: 0,
          lifetimeShards: 0,
          perks: {}
      },
      settings: {
          sound: true,
          crt: false
      },
      world: createInitialWorld()
  };

  let save = JSON.parse(JSON.stringify(DEFAULT_SAVE));

  function getPerkLevel(id) {
      return save.prestige.perks[id] || 0;
  }

  function getShardMultiplier() {
      // 依据 lifetimeShards 计算全局基础生产倍率（每枚 +2%），购买 Perk 不会导致已有倍率下降
      const lifetime = save.prestige.lifetimeShards || save.prestige.genesisShards || 0;
      return 1 + lifetime * 0.02;
  }

  function addResourceClamped(id, delta) {
      const w = save.world;
      const cap = metrics.caps[id] || (RES_MAP[id] ? RES_MAP[id].baseCap : 100);
      const next = Math.max(0, Math.min(cap, (w.res[id] || 0) + delta));
      w.res[id] = next;
      if (next > 0) w.unlockedRes[id] = true;
  }

  function recomputeCapacities() {
      const w = save.world;
      const b = w.buildings;
      const t = w.techs;
      const caps = {};

      RESOURCES_DEF.forEach(r => {
          caps[r.id] = r.baseCap;
      });

      // 仓库扩容：食物+200、木材+150、石材+150
      const wh = b.warehouse || 0;
      if (wh > 0) {
          caps.food += wh * 200;
          caps.lumber += wh * 150;
          caps.stone += wh * 150;
      }

      // 货运仓库扩容：全部矿产/加工/工业/高科技/太空资源 +300/座
      const fwh = b.freightWarehouse || 0;
      if (fwh > 0) {
          RESOURCES_DEF.forEach(r => {
              if (r.era >= 2 && r.id !== 'money' && r.id !== 'knowledge') {
                  caps[r.id] += fwh * 300;
              }
          });
      }

      // 银行扩容金币 +10,000/座
      caps.money += (b.bank || 0) * 10000;

      // 图书馆/大学/工业研究中心/数据中心/AI超算扩容
      caps.knowledge += (b.library || 0) * 250;
      caps.knowledge += (b.university || 0) * 2000;
      caps.knowledge += (b.researchCenter || 0) * 10000;
      caps.knowledge += (b.datacenter || 0) * 30000;
      caps.money += (b.datacenter || 0) * 30000;
      caps.knowledge += (b.supercomputer || 0) * 100000;
      caps.money += (b.supercomputer || 0) * 100000;

      metrics.caps = caps;

      // 住房容量上限（简陋居所 +5/座，火星殖民穹顶 +25/座，建筑学 +10%）
      let rawPopCap = (b.primitiveHut || 0) * 5 + (b.marsColony || 0) * 25;
      if (t.construction) rawPopCap = Math.floor(rawPopCap * 1.10);
      metrics.popCap = rawPopCap;

      // 同步解锁当前时代及已研究科技对应的资源可见性
      RESOURCES_DEF.forEach(r => {
          if (r.era <= w.eraIndex) {
              if (r.id === 'copper' && !t.copperAge && w.eraIndex < 3) return;
              if (r.id === 'iron' && !t.ironAge && w.eraIndex < 3) return;
              if (r.id === 'coal' && !t.advancedMining && w.eraIndex < 3) return;
              if ((r.id === 'plywood' || r.id === 'brick' || r.id === 'wroughtIron') && !t.smelting && w.eraIndex < 3) return;
              if (r.id === 'money' && !t.currency && w.eraIndex < 3) return;
              w.unlockedRes[r.id] = true;
          }
      });
  }

  /* 计算建筑购买 k 座的逐座向上取整总费用 */
  function getBuildingCost(bDef, countToBuy) {
      const owned = save.world.buildings[bDef.id] || 0;
      const discount = save.world.techs.mathematics ? 0.97 : 1.0;
      const total = {};
      for (const resId of Object.keys(bDef.baseCost)) {
          total[resId] = 0;
      }
      for (let i = 0; i < countToBuy; i++) {
          const n = owned + i;
          for (const [resId, baseVal] of Object.entries(bDef.baseCost)) {
              total[resId] += Math.ceil(baseVal * Math.pow(bDef.growth, n) * discount);
          }
      }
      return total;
  }

  function getMaxAffordableBuilding(bDef) {
      const owned = save.world.buildings[bDef.id] || 0;
      const maxAllowed = bDef.maxCount ? Math.max(0, bDef.maxCount - owned) : 200;
      if (maxAllowed <= 0) return 0;

      const discount = save.world.techs.mathematics ? 0.97 : 1.0;
      const running = {};
      for (const resId of Object.keys(bDef.baseCost)) running[resId] = 0;

      let canBuy = 0;
      for (let i = 0; i < maxAllowed; i++) {
          const n = owned + i;
          let ok = true;
          for (const [resId, baseVal] of Object.entries(bDef.baseCost)) {
              const stepCost = Math.ceil(baseVal * Math.pow(bDef.growth, n) * discount);
              if ((save.world.res[resId] || 0) < running[resId] + stepCost) {
                  ok = false;
                  break;
              }
          }
          if (!ok) break;
          for (const [resId, baseVal] of Object.entries(bDef.baseCost)) {
              running[resId] += Math.ceil(baseVal * Math.pow(bDef.growth, n) * discount);
          }
          canBuy++;
      }
      return canBuy;
  }

  function canAffordCost(costObj) {
      for (const [resId, amt] of Object.entries(costObj)) {
          if ((save.world.res[resId] || 0) < amt) return false;
      }
      return true;
  }

  function payCost(costObj) {
      for (const [resId, amt] of Object.entries(costObj)) {
          save.world.res[resId] = Math.max(0, (save.world.res[resId] || 0) - amt);
      }
  }

  /* 主动吸引流民（消耗盈余食物立即 +2 人口） */
  function getRecruitFoodCost() {
      const pop = Math.max(0, Math.floor(save.world.pop));
      return Math.floor(150 * Math.pow(1.04, Math.max(0, pop - 2)));
  }

  function recruitPopulation() {
      const w = save.world;
      if (w.eraIndex < 1) return;
      recomputeCapacities();
      const curPop = Math.floor(w.pop);
      const vacant = Math.max(0, metrics.popCap - curPop);
      const cost = getRecruitFoodCost();
      if (vacant <= 0 || (w.res.food || 0) < cost) return;

      const gain = Math.min(2, vacant);
      w.res.food -= cost;
      w.pop = Math.min(metrics.popCap, curPop + gain);
      sound.playBuild();

      feedback(`+${gain} 人口`, '#38bdf8');

      checkMissions();
      checkEraAdvancement();

  }

  /* 顺序主线任务检查（支持跨多级自动追溯与防重复发放） */
  function checkMissions() {
      const w = save.world;
      let anyCompleted = false;
      while (w.missionIndex < MISSIONS_DEF.length) {
          const m = MISSIONS_DEF[w.missionIndex];
          if (m.check(w)) {
              w.missionIndex++;
              anyCompleted = true;
              if (m.reward && m.reward.res) {
                  for (const [rId, val] of Object.entries(m.reward.res)) {
                      w.unlockedRes[rId] = true;
                      addResourceClamped(rId, val);
                  }
              }
              showToast(`✅ 完成任务 [${m.id}] ${m.name}！`);
          } else {
              break;
          }
      }
      if (anyCompleted) {
          recomputeCapacities();

      }
  }

  /* 核心时代自动晋升校验 */
  function checkEraAdvancement() {
      const w = save.world;
      const t = w.techs;
      const b = w.buildings;
      let advanced = false;

      if (w.eraIndex === 0 && t.evo_sapiens) {
          w.eraIndex = 1;
          w.pop = 2;
          b.primitiveHut = (b.primitiveHut || 0) + 1;
          ['food', 'lumber', 'stone', 'knowledge'].forEach(id => { w.unlockedRes[id] = true; });
          recomputeCapacities();
          addResourceClamped('food', 40);
          addResourceClamped('lumber', 15);
          addResourceClamped('stone', 10);
          addResourceClamped('knowledge', 10);
          advanced = true;
      } else if (w.eraIndex === 1 && w.pop >= 45 && t.mining && t.mathematics && w.missionIndex >= 17) {
          w.eraIndex = 2;
          advanced = true;
      } else if (w.eraIndex === 2 && w.pop >= 120 && t.steel && (b.university || 0) >= 1 && w.missionIndex >= 26) {
          w.eraIndex = 3;
          advanced = true;
      } else if (w.eraIndex === 3 && t.electronics && (b.coalPowerPlant || 0) >= 1 && metrics.powerSurplus >= 10 && w.missionIndex >= 34) {
          w.eraIndex = 4;
          advanced = true;
      } else if (w.eraIndex === 4 && t.particlePhysics && (b.nuclearPowerPlant || 0) >= 1 && w.missionIndex >= 37) {
          w.eraIndex = 5;
          advanced = true;
      } else if (w.eraIndex === 5 && t.artificialIntelligence && (b.supercomputer || 0) >= 1 && w.missionIndex >= 43) {
          w.eraIndex = 6;
          advanced = true;
      }

      if (advanced) {
          recomputeCapacities();
          sound.playEra();
          const era = ERAS_DEF[w.eraIndex];
          showToast(`🎉 文明跃迁：进入【${era.name}】！`);

      }
  }

  /* 单步模拟 Tick（dt 秒，用于实时 250ms Tick 与离线追赶） */
  function stepSimulation(dt) {
      const w = save.world;
      const b = w.buildings;
      const t = w.techs;
      const shardMult = getShardMultiplier();
      const autoLv = getPerkLevel('automation');

      // 自动化天赋：自动将空闲人口分配至农民（保障粮食供给）
      if (w.eraIndex >= 1 && autoLv > 0) {
          const assigned = Object.values(w.jobs).reduce((a, c) => a + c, 0);
          const idle = Math.floor(w.pop) - assigned;
          if (idle > 0) {
              w.jobs.farmer = (w.jobs.farmer || 0) + idle;
          }
      }

      const rates = {};
      RESOURCES_DEF.forEach(r => { rates[r.id] = 0; });

      // 1. 生命起源自动产出
      let lifeMult = shardMult;
      if (t.evo_organelle) lifeMult *= 1.10;
      if (t.evo_nucleus) lifeMult *= 1.15;
      if (t.evo_multicellular) lifeMult *= 1.15;
      if (t.evo_vertebrate) lifeMult *= 1.20;
      if (t.evo_mammal) lifeMult *= 1.20;
      if (t.evo_primate) lifeMult *= 1.25;

      if (t.evo_organelle) rates.rna += 0.25 * lifeMult;
      if (t.evo_nucleus) rates.rna += 0.35 * lifeMult;
      if (t.evo_nucleus) rates.dna += 0.15 * lifeMult;
      if (t.evo_vertebrate) rates.dna += 0.25 * lifeMult;

      // 2. 农业及之后时代：人口食物消耗、幸福度、职业、建筑、电力与工业配方
      if (w.eraIndex >= 1) {
          // 部落初始自发观察知识（防止农业刚开启时知识断路）
          rates.knowledge += 0.30 * shardMult;

          // 人口食物消耗 0.2/人/秒
          const foodNeed = w.pop * 0.2;
          rates.food -= foodNeed;

          const foodSat = foodNeed <= 0 ? 1 : Math.min(1, (w.res.food + Math.max(0, rates.food)) / Math.max(0.1, foodNeed));
          const houseSat = metrics.popCap <= 0 ? 0 : Math.min(1, metrics.popCap / Math.max(1, Math.floor(w.pop)));
          w.happiness = Math.round((foodSat * 0.7 + houseSat * 0.3) * 100);

          let happyMult = 1.0;
          if (w.happiness >= 90) happyMult = 1.10;
          else if (w.happiness >= 70) happyMult = 1.00;
          else if (w.happiness >= 50) happyMult = 0.90;
          else if (w.happiness >= 30) happyMult = 0.75;
          else happyMult = 0.60;
          metrics.happyMult = happyMult;

          const agriMult = 1 + getPerkLevel('agriculturalRevolution') * 0.05;
          const indPerkMult = 1 + getPerkLevel('industrialRevolution') * 0.05;
          const sciMult = (1 + getPerkLevel('scientificRevolution') * 0.06)
              * (1 + (b.satelliteNetwork || 0) * 0.05)
              * (t.particlePhysics ? 1.20 : 1)
              * (t.internet ? 1.20 : 1);
          const moneyMult = (t.trade ? 1.20 : 1) * (t.internet ? 1.20 : 1);

          // 12 种职业产出与消耗
          JOBS_DEF.forEach(j => {
              const workers = w.jobs[j.id] || 0;
              if (workers <= 0) return;

              let jobMult = happyMult * shardMult;
              if (j.id === 'farmer') jobMult *= (1 + (b.farmland || 0) * 0.20) * agriMult;
              if (j.id === 'lumberjack') jobMult *= (1 + (b.lumberCamp || 0) * 0.25) * (t.tools ? 1.10 : 1);
              if (j.id === 'quarryWorker') jobMult *= (1 + (b.quarry || 0) * 0.25) * (t.tools ? 1.10 : 1);
              if (j.id === 'scholar') jobMult *= (1 + (b.library || 0) * 0.20) * (t.writing ? 1.10 : 1) * sciMult;
              if (j.id === 'professor') jobMult *= (1 + (b.university || 0) * 0.15) * sciMult;
              if (j.id === 'scientist') jobMult *= sciMult;
              if (j.id === 'miner') jobMult *= (1 + (b.mine || 0) * 0.10);
              if (j.id === 'coalMiner') jobMult *= (1 + (b.coalMine || 0) * 0.10);
              if (j.id === 'merchant' || j.id === 'engineer') jobMult *= moneyMult;
              if (j.id === 'craftsman') jobMult *= (1 + (b.smelter || 0) * 0.15) * (1 + (b.foundry || 0) * 0.15) * indPerkMult;

              let inputScale = 1.0;
              if (j.inRes) {
                  for (const [inId, perWorker] of Object.entries(j.inRes)) {
                      const need = workers * perWorker * dt;
                      if (need > 0 && (w.res[inId] || 0) < need) {
                          inputScale = Math.min(inputScale, (w.res[inId] || 0) / need);
                      }
                  }
                  for (const [inId, perWorker] of Object.entries(j.inRes)) {
                      rates[inId] -= workers * perWorker * inputScale;
                  }
              }

              for (const [outId, perWorker] of Object.entries(j.out)) {
                  rates[outId] += workers * perWorker * jobMult * inputScale;
              }
          });

          // 建筑直产资源
          const mineCnt = b.mine || 0;
          if (mineCnt > 0) {
              rates.copper += mineCnt * 0.20 * shardMult;
              rates.iron += mineCnt * 0.25 * shardMult;
              if (t.aluminiumIndustry) rates.aluminium += mineCnt * 0.40 * shardMult;
          }
          if ((b.coalMine || 0) > 0) rates.coal += b.coalMine * 0.30 * shardMult;
          if ((b.market || 0) > 0) rates.money += b.market * 0.50 * moneyMult * shardMult;
          if ((b.moonBase || 0) > 0) rates.waterIce += b.moonBase * 0.40 * shardMult;
          if ((b.marsColony || 0) > 0) rates.rareMineral += b.marsColony * 0.30 * shardMult;

          // 电力系统：三类电厂燃料消耗与发电功率
          const energyMult = (1 + getPerkLevel('efficientEnergy') * 0.04) * (t.electricalEngineering ? 1.15 : 1);
          let totalGen = 0;

          const coalPlants = b.coalPowerPlant || 0;
          if (coalPlants > 0) {
              const needCoal = coalPlants * 0.5 * dt;
              const ratio = needCoal > 0 ? Math.min(1, (w.res.coal || 0) / needCoal) : 1;
              rates.coal -= coalPlants * 0.5 * ratio;
              totalGen += coalPlants * 20 * ratio * energyMult;
          }

          const nucPlants = b.nuclearPowerPlant || 0;
          if (nucPlants > 0) {
              const needU = nucPlants * 0.1 * dt;
              const ratio = needU > 0 ? Math.min(1, (w.res.uranium || 0) / needU) : 1;
              rates.uranium -= nucPlants * 0.1 * ratio;
              totalGen += nucPlants * 100 * ratio * energyMult;
          }

          const fusPlants = b.fusionPowerPlant || 0;
          if (fusPlants > 0) {
              const needH3 = fusPlants * 0.05 * dt;
              const ratio = needH3 > 0 ? Math.min(1, (w.res.helium3 || 0) / needH3) : 1;
              rates.helium3 -= fusPlants * 0.05 * ratio;
              totalGen += fusPlants * 500 * ratio * energyMult;
          }

          const gridDiscount = 1 - Math.min(0.20, (b.gridControl || 0) * 0.05);
          const rawPowerReq = (
              (b.steelMill || 0) * 8 +
              (b.cementPlant || 0) * 5 +
              (b.oilWell || 0) * 3 +
              (b.refinery || 0) * 6 +
              (b.factory || 0) * 10 +
              (b.researchCenter || 0) * 5 +
              (b.uraniumMine || 0) * 10 +
              (b.cleanRoom || 0) * 15 +
              (b.chipFab || 0) * 20 +
              (b.datacenter || 0) * 25 +
              (b.launchPad || 0) * 15 +
              (b.helium3Harvester || 0) * 20
          ) * gridDiscount;

          metrics.powerGen = totalGen;
          metrics.powerReq = rawPowerReq;
          metrics.powerSurplus = totalGen - rawPowerReq;
          const powerRatio = rawPowerReq <= 0 ? 1 : Math.min(1, totalGen / rawPowerReq);
          metrics.powerRatio = powerRatio;
          rates.knowledge += ((b.researchCenter || 0) * 2 + (b.datacenter || 0) * 10) * sciMult * shardMult * powerRatio;

          // 工业转化配方辅助函数（兼顾原料上限与电网供电比）
          let indOutputMult = indPerkMult * shardMult * (t.mechanicalEngineering ? 1.15 : 1);
          if (t.artificialIntelligence && (b.supercomputer || 0) >= 1) indOutputMult *= 1.25;

          const runRecipe = (count, inputs, outputs, usePower = true) => {
              if (count <= 0) return;
              const pScale = usePower ? powerRatio : 1;
              if (pScale <= 0) return;
              let inScale = 1;
              for (const [inId, perUnit] of Object.entries(inputs)) {
                  const need = count * perUnit * pScale * dt;
                  const available = Math.max(0, (w.res[inId] || 0) + rates[inId] * dt);
                  if (need > available) {
                      inScale = Math.min(inScale, available / need);
                  }
              }
              // 满仓流水线释放原料，让下游芯片等生产仍能获得铝和电子元件。
              let outputScale = 0;
              for (const [outId, perUnit] of Object.entries(outputs)) {
                  const free = metrics.caps[outId] - w.res[outId] - rates[outId] * dt;
                  outputScale = Math.max(outputScale, free / (count * perUnit * indOutputMult * dt));
              }
              const finalScale = Math.min(pScale * inScale, outputScale);
              if (finalScale <= 0) return;
              for (const [inId, perUnit] of Object.entries(inputs)) {
                  rates[inId] -= count * perUnit * finalScale;
              }
              for (const [outId, perUnit] of Object.entries(outputs)) {
                  rates[outId] += count * perUnit * finalScale * indOutputMult;
              }
          };

          // 初级加工设施
          runRecipe(b.smelter || 0, { iron: 0.7 }, { wroughtIron: 0.35 }, false);
          runRecipe(b.foundry || 0, { lumber: 0.6, stone: 0.6 }, { plywood: 0.3, brick: 0.3 }, false);

          // 工业与高科技生产线
          runRecipe(b.steelMill || 0, { iron: 2, coal: 1 }, { steel: 1 }, true);
          runRecipe(b.cementPlant || 0, { stone: 3 }, { cement: 1 }, true);
          runRecipe(b.oilWell || 0, {}, { oil: 1 }, true);
          runRecipe(b.refinery || 0, { oil: 2 }, { polymer: 1 }, true);

          const uMult = t.radioChemistry ? 1.20 : 1.0;
          runRecipe(b.uraniumMine || 0, {}, { uranium: 0.3 * uMult }, true);

          // 多功能工业厂房：电子元件 + 火箭部件协同生产
          const facCnt = b.factory || 0;
          if (facCnt > 0 && t.electronics) {
              if (t.rocketry) {
                  runRecipe(facCnt * 0.6, { aluminium: 1, polymer: 1 }, { electronics: 1 }, true);
                  runRecipe(facCnt * 0.4, { steel: 2, aluminium: 1, polymer: 1, electronics: 1 }, { rocketParts: 1 }, true);
              } else {
                  runRecipe(facCnt, { aluminium: 1, polymer: 1 }, { electronics: 1 }, true);
              }
          }

          runRecipe(b.cleanRoom || 0, { electronics: 1, polymer: 2 }, { wafer: 1 }, true);
          runRecipe(b.chipFab || 0, { wafer: 1, aluminium: 1 }, { microprocessor: 1 }, true);
          runRecipe(b.launchPad || 0, { steel: 1.2, aluminium: 0.6, polymer: 0.6, electronics: 0.6 }, { rocketParts: 0.6 }, true);
          runRecipe(b.helium3Harvester || 0, {}, { helium3: 0.5 }, true);

          // 繁荣度动态人口增长结算（基础 0.25/s + 空床位引力 + 粮食满仓繁荣倍率）
          const popPerkMult = 1 + getPerkLevel('populationBonus') * 0.05;
          const basePopRate = 0.25 * popPerkMult;
          const vacantBeds = Math.max(0, metrics.popCap - w.pop);
          const vacancyBonus = (vacantBeds / 10) * 0.15;
          const foodCap = metrics.caps.food || 500;
          const prosperityMult = (w.happiness >= 90 && (w.res.food || 0) >= foodCap * 0.5 && rates.food >= 0) ? 1.5 : 1.0;
          const canGrow = w.pop < metrics.popCap && ((w.res.food || 0) > 0 || foodSat >= 0.8);
          const totalPopRate = canGrow ? (basePopRate + vacancyBonus) * prosperityMult : 0;

          metrics.popBaseRate = basePopRate;
          metrics.popVacancyBonus = vacancyBonus;
          metrics.popProsperityMult = prosperityMult;
          metrics.popGrowthRate = totalPopRate;

          if (totalPopRate > 0) {
              w.popAccum += totalPopRate * dt;
              if (w.popAccum >= 1) {
                  const add = Math.floor(w.popAccum);
                  w.popAccum -= add;
                  w.pop = Math.min(metrics.popCap, w.pop + add);
              }
          }
      }

      // 统一提交各资源净变化（严格限幅在 [0, cap]）
      for (const r of RESOURCES_DEF) {
          const net = rates[r.id] || 0;
          metrics.netRates[r.id] = net;
          if (net !== 0) {
              addResourceClamped(r.id, net * dt);
          }
      }
  }

  /* =====================================================================
     7. 手动交互动作（单次点击、空格采集、时代专属行动按钮）
     ===================================================================== */
  function handleStageManualClick() {
      const w = save.world;
      w.clicks = (w.clicks || 0) + 1;
      sound.playClick();

      const shardMult = getShardMultiplier();
      const clickMult = shardMult * (1 + getPerkLevel('automation') * 0.10) * (w.techs.tools ? 1.10 : 1);
      let floatLabel = '+1 RNA';
      let floatColor = '#34d399';

      if (w.eraIndex === 0) {
          const gain = Math.max(1, Math.round(1 * clickMult));
          addResourceClamped('rna', gain);
          floatLabel = `+${gain} RNA`;
      } else if (w.eraIndex === 1) {
          const f = +(2 * clickMult).toFixed(1);
          const l = +(1.5 * clickMult).toFixed(1);
          const k = +(1 * clickMult).toFixed(1);
          addResourceClamped('food', f);
          addResourceClamped('lumber', l);
          addResourceClamped('knowledge', k);
          floatLabel = `+${f}粮 +${l}木 +${k}知`;
          floatColor = '#fbbf24';
      } else if (w.eraIndex === 2) {
          const m = Math.round(4 * clickMult);
          const k = Math.round(3 * clickMult);
          addResourceClamped('money', m);
          addResourceClamped('knowledge', k);
          if (w.techs.copperAge) addResourceClamped('copper', 1);
          if (w.techs.ironAge) addResourceClamped('iron', 1);
          floatLabel = `+${m}币 +${k}知`;
          floatColor = '#818cf8';
      } else if (w.eraIndex === 3) {
          const k = Math.round(15 * clickMult);
          const m = Math.round(12 * clickMult);
          addResourceClamped('knowledge', k);
          addResourceClamped('money', m);
          if (w.techs.steel) addResourceClamped('steel', 1);
          floatLabel = `+${k}知 +${m}币`;
          floatColor = '#f59e0b';
      } else if (w.eraIndex === 4) {
          const k = Math.round(50 * clickMult);
          addResourceClamped('knowledge', k);
          if (w.techs.nuclearFission) addResourceClamped('uranium', 0.5);
          floatLabel = `+${k}知 +0.5铀`;
          floatColor = '#34d399';
      } else if (w.eraIndex === 5) {
          const k = Math.round(200 * clickMult);
          const m = Math.round(150 * clickMult);
          addResourceClamped('knowledge', k);
          addResourceClamped('money', m);
          floatLabel = `+${k}知 +${m}币`;
          floatColor = '#38bdf8';
      } else {
          const k = Math.round(600 * clickMult);
          addResourceClamped('knowledge', k);
          if (w.techs.rocketry) addResourceClamped('rocketParts', 1);
          floatLabel = `+${k}知 +1部件`;
          floatColor = '#c084fc';
      }

      feedback(floatLabel, floatColor);

      checkMissions();
      checkEraAdvancement();

  }

  function handleEraActionButton() {
      const w = save.world;

      if (w.eraIndex === 0) {
          if (w.techs.evo_membrane) {
              if ((w.res.rna || 0) >= 2 && (w.res.dna || 0) < (metrics.caps.dna || 150)) {
                  w.res.rna -= 2;
                  addResourceClamped('dna', 1);
                  sound.playTech();
                  feedback('+1 DNA (-2 RNA)', '#34d399');
              } else {
                  showToast('RNA 不足 2 或 DNA 已达上限！');
              }
          } else {
              addResourceClamped('rna', 2);
              sound.playClick();
              feedback('+2 RNA', '#34d399');
          }
      } else if (w.eraIndex === 1) {
          addResourceClamped('lumber', 2.5);
          addResourceClamped('stone', 1.5);
          addResourceClamped('knowledge', 1.5);
          sound.playClick();
          feedback('+2.5木 +1.5石 +1.5知', '#fbbf24');
      } else {
          handleStageManualClick();
          return;
      }

      checkMissions();
      checkEraAdvancement();

  }

  /* =====================================================================
     8. 购买科技、建造建筑、分配职业与文明跃迁 Prestige
     ===================================================================== */
  function buyTechnology(techId) {
      const w = save.world;
      const tDef = TECH_MAP[techId];
      if (!tDef || w.techs[techId] || tDef.era > w.eraIndex) return;
      if (!tDef.req.every(r => !!w.techs[r])) return;
      if (!canAffordCost(tDef.cost)) return;

      payCost(tDef.cost);
      w.techs[techId] = true;
      sound.playTech();
      showToast(`🔬 研究完成：【${tDef.name}】`);

      recomputeCapacities();
      checkMissions();
      checkEraAdvancement();

  }

  function buyBuilding(bId) {
      const w = save.world;
      const bDef = BUILDINGS_DEF.find(b => b.id === bId);
      if (!bDef || bDef.era > w.eraIndex) return;
      if (bDef.reqTech && !w.techs[bDef.reqTech]) return;

      const owned = w.buildings[bId] || 0;
      const maxAllowed = bDef.maxCount ? Math.max(0, bDef.maxCount - owned) : 200;
      if (maxAllowed <= 0) return;

      let qty = buildBatch === 'MAX' ? getMaxAffordableBuilding(bDef) : Math.min(buildBatch, maxAllowed);
      if (qty <= 0) return;

      const cost = getBuildingCost(bDef, qty);
      if (!canAffordCost(cost)) return;

      payCost(cost);
      w.buildings[bId] = owned + qty;
      sound.playBuild();
      showToast(`🏛️ 建成 ${bDef.name} ×${qty}`);

      recomputeCapacities();
      checkMissions();
      checkEraAdvancement();

  }

  function adjustJob(jobId, delta) {
      const w = save.world;
      const def = JOBS_DEF.find(j => j.id === jobId);
      if (!def || def.era > w.eraIndex || (def.reqTech && !w.techs[def.reqTech]) || !Number.isInteger(delta)) return;
      const cur = w.jobs[jobId] || 0;
      const assigned = Object.values(w.jobs).reduce((a, c) => a + c, 0);
      const idle = Math.max(0, Math.floor(w.pop) - assigned);

      if (delta > 0) {
          const add = Math.min(delta, idle);
          if (add <= 0) return;
          w.jobs[jobId] = cur + add;
      } else {
          const sub = Math.min(-delta, cur);
          if (sub <= 0) return;
          w.jobs[jobId] = cur - sub;
      }
      sound.playClick();
      checkMissions();

  }

  function calcPrestigeGain() {
      const w = save.world;
      const techCnt = Object.keys(w.techs).filter(k => w.techs[k]).length;
      const bldCnt = Object.values(w.buildings).reduce((a, c) => a + c, 0);
      return Math.max(1, Math.floor(Math.sqrt(Math.floor(w.pop) / 10) + techCnt / 2 + bldCnt / 100));
  }

  function canPrestigeNow() {
      const w = save.world;
      return w.eraIndex === 6 && !!w.techs.interstellarTravel && (w.buildings.colonyShip || 0) >= 1;
  }

  function buyPerk(perkId) {
      const pDef = PERKS_DEF.find(p => p.id === perkId);
      if (!pDef) return;
      const lv = getPerkLevel(perkId);
      if (lv >= 5) return;
      const cost = pDef.costs[lv];
      if ((save.prestige.genesisShards || 0) < cost) return;

      save.prestige.genesisShards -= cost;
      save.prestige.perks[perkId] = lv + 1;
      sound.playTech();
      showToast(`✨ 永久天赋升级：【${pDef.name}】Lv.${lv + 1}`);



  }
  function tick(dt = 0.25) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    recomputeCapacities();
    stepSimulation(dt);
    checkMissions();
    checkEraAdvancement();
  }

  // 离线以最多 5 秒一步近似结算；避免原 HTML 最多 360 个超大步长吞掉生产链。
  function catchUp(seconds) {
    const maxHours = [8, 12, 18, 24, 36, 48][getPerkLevel('deepHibernation')];
    const elapsed = Math.min(maxHours * 3600, Math.max(0, Number(seconds) || 0));
    if (!elapsed) return 0;
    const steps = Math.ceil(elapsed / 5);
    quiet = true;
    try {
      for (let i = 0; i < steps; i++) tick(elapsed / steps);
    } finally { quiet = false; }
    return elapsed;
  }

  const record = value => value && typeof value === 'object' && !Array.isArray(value);
  function number(value, fallback = 0, max = 1e15) {
    return typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(0, value)) : fallback;
  }
  function normalize(raw) {
    if (!record(raw) || raw.version !== 3 || !record(raw.world) ||
        !record(raw.world.res) || !record(raw.world.techs) || !record(raw.world.buildings)) {
      throw new Error('存档格式不正确，请使用原版或小游戏的 v3 存档码');
    }
    const result = JSON.parse(JSON.stringify(DEFAULT_SAVE));
    const src = raw.world, w = result.world;
    w.eraIndex = Math.floor(number(src.eraIndex, 0, 6));
    w.pop = Math.floor(number(src.pop, 0, 1e6));
    w.popAccum = number(src.popAccum, 0, 1) % 1;
    w.happiness = number(src.happiness, 100, 100);
    w.missionIndex = Math.floor(number(src.missionIndex, 0, MISSIONS_DEF.length));
    w.clicks = Math.floor(number(src.clicks));
    RESOURCES_DEF.forEach(r => {
      w.res[r.id] = number(src.res[r.id]);
      w.unlockedRes[r.id] = r.era <= w.eraIndex || !!(src.unlockedRes && src.unlockedRes[r.id]) || w.res[r.id] > 0;
    });
    TECHS_DEF.forEach(t => { if (src.techs[t.id] === true && t.era <= w.eraIndex) w.techs[t.id] = true; });
    BUILDINGS_DEF.forEach(b => {
      if (b.era <= w.eraIndex && (!b.reqTech || w.techs[b.reqTech])) {
        w.buildings[b.id] = Math.floor(number(src.buildings[b.id], 0, b.maxCount || 1000));
      }
    });
    let idle = w.pop;
    JOBS_DEF.forEach(j => {
      if (j.era <= w.eraIndex && (!j.reqTech || w.techs[j.reqTech])) {
        const count = Math.floor(number(src.jobs && src.jobs[j.id], 0, idle));
        w.jobs[j.id] = count;
        idle -= count;
      }
    });
    const p = record(raw.prestige) ? raw.prestige : {};
    result.prestige.count = Math.floor(number(p.count));
    result.prestige.genesisShards = Math.floor(number(p.genesisShards));
    result.prestige.lifetimeShards = Math.max(result.prestige.genesisShards, Math.floor(number(p.lifetimeShards)));
    PERKS_DEF.forEach(pDef => { result.prestige.perks[pDef.id] = Math.floor(number(p.perks && p.perks[pDef.id], 0, 5)); });
    const settings = record(raw.settings) ? raw.settings : {};
    result.settings.sound = settings.sound !== false;
    result.settings.crt = settings.crt === true;
    result.lastActiveAt = number(raw.lastActiveAt, Date.now());
    return result;
  }

  function load(raw, now = Date.now()) {
    // Validate completely before replacing the current game.
    const next = normalize(raw);
    save = next;
    recomputeCapacities();
    RESOURCES_DEF.forEach(r => { save.world.res[r.id] = Math.min(save.world.res[r.id], metrics.caps[r.id]); });
    checkMissions();
    checkEraAdvancement();
    const elapsed = catchUp((now - save.lastActiveAt) / 1000);
    save.lastActiveAt = now;
    return elapsed;
  }

  function prestige() {
    if (!canPrestigeNow()) return false;
    const gain = calcPrestigeGain();
    save.prestige.count++;
    save.prestige.genesisShards += gain;
    save.prestige.lifetimeShards += gain;
    save.world = createInitialWorld();
    save.lastActiveAt = Date.now();
    Object.assign(metrics, { netRates: {}, powerGen: 0, powerReq: 0, powerSurplus: 0,
      powerRatio: 1, popGrowthRate: 0, popBaseRate: 0, popVacancyBonus: 0, popProsperityMult: 1, happyMult: 1 });
    recomputeCapacities();
    sound.playEra();
    showToast(`文明跃迁成功！获得 ${gain} 枚创世余烬`);
    return true;
  }

  recomputeCapacities();
  return {
    get save() { return save; }, metrics, defs,
    tick, catchUp, load, normalize, getPerkLevel, getShardMultiplier,
    getBuildingCost, getMaxAffordableBuilding, canAffordCost, getRecruitFoodCost,
    recruit: recruitPopulation, collect: handleStageManualClick, action: handleEraActionButton,
    research: buyTechnology, build: buyBuilding, adjustJob, buyPerk,
    calcPrestigeGain, canPrestigeNow, prestige,
    setBatch(value) { buildBatch = value === 'MAX' ? value : value === 10 ? 10 : 1; },
    reset() {
      save = JSON.parse(JSON.stringify(DEFAULT_SAVE));
      save.lastActiveAt = Date.now();
      Object.assign(metrics, { netRates: {}, powerGen: 0, powerReq: 0, powerSurplus: 0,
        powerRatio: 1, popGrowthRate: 0, popBaseRate: 0, popVacancyBonus: 0, popProsperityMult: 1, happyMult: 1 });
      recomputeCapacities();
    }
  };
};
