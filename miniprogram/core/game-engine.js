'use strict';

/**
 * 创世余烬 (Evolve 增强版) 核心纯 JS 游戏引擎
 * 完整对齐 evolve_web/rna.html 与 evolve_web/js/* 全部模拟、计算、任务、转生与存档逻辑
 */

const createDefinitions = require('./defs.js');
const dl = require('./data-loader.js');
const bridge = require('./evolve-bridge.js');

const SAVE_KEY = 'pixel_human_era_save_v3';

/**
 * 创建游戏引擎实例
 * @param {object} [callbacks]
 * @param {Function} [callbacks.toast] 消息提示回调
 * @param {Function} [callbacks.sound] 音效回调 (click|build|tech|era|nuke)
 * @param {Function} [callbacks.float] 飘字回调 (label, color, x, y)
 * @param {Function} [callbacks.spawnParticles] 像素粒子回调 (nx, ny, color)
 * @returns {object}
 */
function createEvolveGame(callbacks) {
  const cb = callbacks || {};
  const notifyToast = msg => { if (cb.toast) cb.toast(msg); };
  const playSound = name => { if (cb.sound) cb.sound(name); };
  const emitFloat = (label, color, pos) => { if (cb.float) cb.float(label, color, pos); };
  const emitParticles = (nx, ny, color) => { if (cb.spawnParticles) cb.spawnParticles(nx, ny, color); };

  const metrics = {
    caps: {},
    netRates: {},
    popCap: 0,
    popGrowthRate: 0,
    popBaseRate: 0,
    popVacancyBonus: 0,
    popProsperityMult: 1.0,
    happyMult: 1.0,
    taxIncome: 0,
    powerGen: 0,
    powerReq: 0,
    powerSurplus: 0,
    powerRatio: 1.0,
    moraleBreakdown: null
  };

  const defs = createDefinitions(metrics);
  const {
    ERAS_DEF, RESOURCES_DEF, RES_MAP, EVO_CHAIN_IDS, JOBS_DEF,
    BUILDINGS_DEF, TECHS_DEF, TECH_MAP, MISSIONS_DEF, PERKS_DEF,
    EVOLVE_CELL_STRUCTURES_DEF, EVOLVE_CITY_TITLES, EVOLVE_GOV_DEF, EVOLVE_EXTRA_BLDS_DEF
  } = defs;

  function createInitialWorld() {
    const res = {};
    const unlockedRes = {};
    for (const r of RESOURCES_DEF) {
      res[r.id] = 0;
      unlockedRes[r.id] = r.era === 0;
    }
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
      clicks: 0,
      evoCells: {
        membrane: 0,
        organelles: 0,
        nucleus: 0,
        eukaryotic_cell: 0,
        mitochondria: 0
      },
      kingdom: 'animal',
      species: 'human',
      gov: 'anarchy',
      taxRate: 20,
      smelterMode: 'coal',
      craftFocus: 'balanced',
      extraBlds: {},
      madArmed: false
    };
  }

  function createDefaultSave() {
    return {
      version: 3,
      lastActiveAt: Date.now(),
      prestige: {
        count: 0,
        madCount: 0,
        arkCount: 0,
        genesisShards: 0,
        lifetimeShards: 0,
        phage: 0,
        rapidMutation: false,
        ancientRuins: false,
        perks: {}
      },
      settings: {
        sound: true,
        crt: false,
        theme: 'pixel',
        numFormat: 'metric',
        boring: false,
        mKeys: true
      },
      world: createInitialWorld()
    };
  }

  let save = createDefaultSave();
  let envMods = {};
  let buildBatch = 1;
  let hideResearchedTechs = false;

  function ensureEvolveWorldFields() {
    const w = save.world;
    if (!w.evoCells || typeof w.evoCells !== 'object') {
      w.evoCells = { membrane: 0, organelles: 0, nucleus: 0, eukaryotic_cell: 0, mitochondria: 0 };
    }
    if (!w.kingdom) w.kingdom = 'animal';
    if (!w.species) w.species = 'human';
    if (!w.gov) w.gov = 'anarchy';
    if (typeof w.taxRate !== 'number') w.taxRate = 20;
    if (!w.smelterMode) w.smelterMode = 'coal';
    if (!w.craftFocus) w.craftFocus = 'balanced';
    if (!w.extraBlds || typeof w.extraBlds !== 'object') w.extraBlds = {};
    if (typeof w.madArmed !== 'boolean') w.madArmed = false;

    const p = save.prestige;
    if (typeof p.madCount !== 'number') p.madCount = 0;
    if (typeof p.arkCount !== 'number') p.arkCount = 0;
    if (typeof p.phage !== 'number') p.phage = 0;
    if (typeof p.rapidMutation !== 'boolean') p.rapidMutation = p.madCount > 0 || p.count > 0;
    if (typeof p.ancientRuins !== 'boolean') p.ancientRuins = p.madCount > 0 || p.count > 0;

    bridge.ensureAllFields(save);
  }

  function fmt(n) {
    return dl.formatNumber(n, (save.settings && save.settings.numFormat) || 'metric');
  }

  function fmtRate(r) {
    return dl.formatRate(r);
  }

  function getCityTitle(pop) {
    const p = Math.floor(pop || 0);
    for (const item of EVOLVE_CITY_TITLES) {
      if (p <= item.maxPop) return item.name;
    }
    return '联合城市群';
  }

  function getExtraBuildingDef(bId) {
    return EVOLVE_EXTRA_BLDS_DEF.find(b => b.id === bId) || dl.MAPS.extraBuildings[bId] || null;
  }

  function isJobUnlocked(jobId) {
    const w = save.world;
    const extraJobs = dl.DATA.extraJobs || [];
    const jDef = JOBS_DEF.find(j => j.id === jobId) || extraJobs.find(j => j.id === jobId);
    if (!jDef) return false;
    if (jDef.reqTech && !w.techs[jDef.reqTech]) return false;
    if (jobId === 'priest') {
      return w.gov === 'theocracy'
        || dl.hasCrispr(save, 'ancients')
        || ((w.extraBlds && w.extraBlds.temple) > 0);
    }
    return true;
  }

  function getHostApi() {
    return {
      ERAS_DEF,
      RESOURCES_DEF,
      JOBS_DEF,
      BUILDINGS_DEF,
      TECHS_DEF,
      TECH_MAP,
      MISSIONS_DEF,
      PERKS_DEF,
      EVO_CHAIN_IDS,
      EVOLVE_CELL_STRUCTURES_DEF,
      EVOLVE_EXTRA_BLDS_DEF,
      getSave: () => save,
      getMetrics: () => metrics,
      getEnvMods: () => envMods,
      setEnvMods: m => { envMods = m || {}; },
      getResName: id => (RES_MAP[id] ? RES_MAP[id].name : id),
      addResourceClamped,
      recomputeCapacities,
      showToast: notifyToast,
      isJobUnlocked,
      tryBuyBuildingSingle: (bId, isExtra) => buyBuilding(bId, isExtra, 1),
      tryBuyTechnology: tId => buyTechnology(tId),
      getBatch: () => buildBatch,
      getHideResearchedTechs: () => hideResearchedTechs,
      fmt,
      fmtRate,
      getPerkLevel,
      getCellStructureCost,
      canAffordCost,
      getEffectiveTechCost,
      getRecruitFoodCost,
      getCityTitle,
      getMaxAffordableBuilding,
      getBuildingCost,
      canMadResetNow,
      calcMadPlasmidGain,
      canPrestigeNow,
      calcPrestigeGain,
      calcPhageGain
    };
  }

  function getPerkLevel(id) {
    return (save.prestige.perks && save.prestige.perks[id]) || 0;
  }

  function getShardMultiplier() {
    const lifetime = save.prestige.lifetimeShards || save.prestige.genesisShards || 0;
    const phage = save.prestige.phage || 0;
    return 1 + lifetime * 0.02 + phage * 0.03;
  }

  function getCellStructureCost(cellDef) {
    ensureEvolveWorldFields();
    const w = save.world;
    const cnt = w.evoCells[cellDef.id] || 0;
    const isMulticellular = !!w.techs.evo_multicellular;
    const incRna = (cellDef.id === 'nucleus' && isMulticellular) ? cellDef.incRnaMulti : cellDef.incRna;
    const incDna = (cellDef.id === 'nucleus' && isMulticellular) ? cellDef.incDnaMulti : cellDef.incDna;
    const cost = {};
    if (cellDef.baseRna > 0) cost.rna = cellDef.baseRna + cnt * incRna;
    if (cellDef.baseDna > 0) cost.dna = cellDef.baseDna + cnt * incDna;
    return cost;
  }

  function addResourceClamped(id, delta) {
    const w = save.world;
    const cap = metrics.caps[id] || (RES_MAP[id] ? RES_MAP[id].baseCap : 100);
    const next = Math.max(0, Math.min(cap, (w.res[id] || 0) + delta));
    w.res[id] = next;
    if (next > 0) w.unlockedRes[id] = true;
  }

  function recomputeCapacities() {
    ensureEvolveWorldFields();
    const w = save.world;
    const b = w.buildings;
    const eb = w.extraBlds;
    const t = w.techs;
    const cells = w.evoCells;
    const phageStorageMult = 1 + (save.prestige.phage || 0) * 0.05;
    const caps = {};

    for (const r of RESOURCES_DEF) {
      caps[r.id] = r.baseCap;
    }

    const mitoCnt = cells.mitochondria || 0;
    const memPerLevel = 5 + mitoCnt * 5;
    const eukPerLevel = 10 + mitoCnt * 10;
    caps.rna += (cells.membrane || 0) * memPerLevel + (save.prestige.madCount > 0 ? 50 : 0);
    caps.dna += (cells.eukaryotic_cell || 0) * eukPerLevel;

    const wh = b.warehouse || 0;
    if (wh > 0) {
      caps.food += wh * 200;
      caps.lumber += wh * 150;
      caps.stone += wh * 150;
    }

    const fwh = b.freightWarehouse || 0;
    if (fwh > 0) {
      for (const r of RESOURCES_DEF) {
        if (r.era >= 2 && r.id !== 'money' && r.id !== 'knowledge') {
          caps[r.id] += fwh * 300;
        }
      }
    }

    caps.money += (b.bank || 0) * 10000;
    caps.knowledge += (b.library || 0) * 250;
    caps.knowledge += (b.university || 0) * 2000;
    caps.knowledge += (eb.wardenclyffe || 0) * 2500;
    caps.knowledge += (eb.biolab || 0) * 5000;
    caps.knowledge += (b.researchCenter || 0) * 10000;
    caps.knowledge += (b.datacenter || 0) * 30000;
    caps.money += (b.datacenter || 0) * 30000;
    caps.knowledge += (b.supercomputer || 0) * 100000;
    caps.money += (b.supercomputer || 0) * 100000;

    if (phageStorageMult > 1) {
      for (const k of Object.keys(caps)) {
        if (k !== 'rna' && k !== 'dna') {
          caps[k] = Math.round(caps[k] * phageStorageMult);
        }
      }
    }

    let rawPopCap = (b.primitiveHut || 0) * 5
      + (eb.cottage || 0) * 3
      + (eb.apartment || 0) * 6
      + (b.marsColony || 0) * 25;
    if (t.construction) rawPopCap = Math.floor(rawPopCap * 1.10);

    rawPopCap = bridge.applyExtendedCapacities(getHostApi(), caps, rawPopCap);
    metrics.caps = caps;
    metrics.popCap = rawPopCap;

    for (const r of RESOURCES_DEF) {
      if (r.era <= w.eraIndex) {
        if (r.id === 'copper' && !t.copperAge && w.eraIndex < 3) continue;
        if (r.id === 'iron' && !t.ironAge && w.eraIndex < 3) continue;
        if (r.id === 'coal' && !t.advancedMining && w.eraIndex < 3) continue;
        if ((r.id === 'plywood' || r.id === 'brick' || r.id === 'wroughtIron') && !t.smelting && w.eraIndex < 3) continue;
        if (r.id === 'money' && !t.currency && w.eraIndex < 3) continue;
        w.unlockedRes[r.id] = true;
      }
    }
  }

  function getBuildingCostDiscount() {
    const w = save.world;
    let mult = w.techs.mathematics ? 0.97 : 1.0;
    if (w.kingdom === 'fungi') mult *= 0.96;
    if (w.species === 'dwarf') mult *= 0.95;
    if (envMods && envMods.buildCostMult) mult *= envMods.buildCostMult;
    return mult;
  }

  function getBuildingCost(bDef, countToBuy, isExtra) {
    const store = isExtra ? save.world.extraBlds : save.world.buildings;
    const owned = store[bDef.id] || 0;
    const discount = getBuildingCostDiscount();
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

  function getMaxAffordableBuilding(bDef, isExtra) {
    const store = isExtra ? save.world.extraBlds : save.world.buildings;
    const owned = store[bDef.id] || 0;
    const maxAllowed = bDef.maxCount ? Math.max(0, bDef.maxCount - owned) : 200;
    if (maxAllowed <= 0) return 0;

    const discount = getBuildingCostDiscount();
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

  function getEffectiveTechCost(tDef) {
    const w = save.world;
    let knowMult = 1.0;
    if (w.species === 'human') knowMult *= 0.95;
    if (w.gov === 'technocracy') knowMult *= 0.92;
    if (envMods && envMods.techKnowCostMult) knowMult *= envMods.techKnowCostMult;
    const out = {};
    for (const [rId, amt] of Object.entries(tDef.cost)) {
      out[rId] = rId === 'knowledge' ? Math.max(1, Math.floor(amt * knowMult)) : amt;
    }
    return out;
  }

  function canAffordCost(costObj) {
    for (const [resId, amt] of Object.entries(costObj || {})) {
      if ((save.world.res[resId] || 0) < amt) return false;
    }
    return true;
  }

  function payCost(costObj) {
    for (const [resId, amt] of Object.entries(costObj || {})) {
      save.world.res[resId] = Math.max(0, (save.world.res[resId] || 0) - amt);
    }
  }

  function getRecruitFoodCost() {
    const pop = Math.max(0, Math.floor(save.world.pop));
    return Math.floor(150 * Math.pow(1.04, Math.max(0, pop - 2)));
  }

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
        const msg = `✅ 完成任务 [${m.id}] ${m.name}！`;
        notifyToast(msg);
        bridge.modules.evMod.addLog({ save }, 'progress', msg, 'emerald');
      } else {
        break;
      }
    }
    if (anyCompleted) {
      recomputeCapacities();
    }
    return anyCompleted;
  }

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
      playSound('era');
      const era = ERAS_DEF[w.eraIndex];
      const msg = `🎉 文明跃迁：进入【${era.name}】！`;
      notifyToast(msg);
      bridge.modules.evMod.addLog({ save }, 'progress', msg, 'amber');
    }
    return advanced;
  }

  function stepSimulation(dt) {
    ensureEvolveWorldFields();
    const w = save.world;
    const b = w.buildings;
    const eb = w.extraBlds;
    const t = w.techs;
    const cells = w.evoCells;
    const shardMult = getShardMultiplier();
    const autoLv = getPerkLevel('automation');
    const eco = bridge.modules.ecoMod;
    const activeCnt = (id, isEx = false) => eco.getActiveBuildingCount(w, id, isEx);

    if (w.eraIndex >= 1 && autoLv > 0) {
      const assigned = Object.values(w.jobs).reduce((a, c) => a + c, 0);
      const idle = Math.floor(w.pop) - assigned;
      if (idle > 0) {
        w.jobs.farmer = (w.jobs.farmer || 0) + idle;
      }
    }

    const rates = {};
    for (const r of RESOURCES_DEF) rates[r.id] = 0;

    if (w.eraIndex === 0) {
      let lifeMult = shardMult * (save.prestige.rapidMutation ? 2.0 : 1.0);
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

      const orgCnt = cells.organelles || 0;
      if (orgCnt > 0) {
        const perOrg = (t.evo_organelle ? 2.0 : 1.0) * (save.prestige.rapidMutation ? 2.0 : 1.0);
        rates.rna += orgCnt * perOrg * shardMult;
      }

      const nucCnt = cells.nucleus || 0;
      if (nucCnt > 0 && (w.res.dna || 0) < (metrics.caps.dna || 150)) {
        const rnaNeedPerSec = nucCnt * 2.0;
        const availRna = (w.res.rna || 0) + Math.max(0, rates.rna * dt);
        const ratio = rnaNeedPerSec * dt > 0 ? Math.min(1, availRna / (rnaNeedPerSec * dt)) : 0;
        const dnaOutPerNuc = t.evo_vertebrate ? 2.0 : 1.0;
        rates.rna -= rnaNeedPerSec * ratio;
        rates.dna += nucCnt * dnaOutPerNuc * ratio * shardMult;
      }
    }

    let happyMult = 1.0;
    let powerRatio = 1.0;
    let foodNeed = 0;

    if (w.eraIndex >= 1) {
      const ruinsMult = (save.prestige.ancientRuins && w.eraIndex <= 2) ? 1.25 : 1.0;
      const fedMult = w.gov === 'federation' ? 1.25 : 1.0;

      rates.knowledge += 0.30 * shardMult * ruinsMult * fedMult;

      const baseFoodPerPop = w.kingdom === 'plant' ? 0.15 : 0.20;
      foodNeed = w.pop * baseFoodPerPop * ((envMods && envMods.foodNeedMult) || 1.0);
      rates.food -= foodNeed;

      const garCnt = eb.garrison || 0;
      if (garCnt > 0) {
        const milMult = (w.kingdom === 'animal' ? 1.25 : 1)
          * (w.species === 'orc' ? 1.30 : 1)
          * (w.gov === 'autocracy' ? 1.18 : 1)
          * shardMult * fedMult;
        rates.food += garCnt * 1.2 * milMult;
        if (t.currency) rates.money += garCnt * 0.8 * milMult;
      }

      const foodSat = foodNeed <= 0 ? 1 : Math.min(1, (w.res.food + Math.max(0, rates.food)) / Math.max(0.1, foodNeed));
      if (w.happiness >= 120) happyMult = 1.25;
      else if (w.happiness >= 90) happyMult = 1.10;
      else if (w.happiness >= 70) happyMult = 1.00;
      else if (w.happiness >= 50) happyMult = 0.90;
      else if (w.happiness >= 30) happyMult = 0.75;
      else happyMult = 0.60;
      metrics.happyMult = happyMult;

      const agriMult = (1 + getPerkLevel('agriculturalRevolution') * 0.05) * (w.species === 'ent' ? 1.20 : 1) * fedMult;
      const lumberTraitMult = (w.kingdom === 'plant' ? 1.20 : 1) * (w.species === 'elf' ? 1.30 : (w.species === 'ent' ? 1.40 : 1)) * fedMult;
      const mineTraitMult = (w.kingdom === 'fungi' ? 1.20 : 1) * (w.species === 'dwarf' ? 1.25 : 1) * (w.gov === 'socialist' ? 1.22 : 1) * fedMult;
      const indPerkMult = (1 + getPerkLevel('industrialRevolution') * 0.05) * (w.gov === 'autocracy' ? 1.18 : (w.gov === 'socialist' ? 1.22 : 1)) * fedMult;
      const sciMult = (1 + getPerkLevel('scientificRevolution') * 0.06)
        * (1 + (b.satelliteNetwork || 0) * 0.05)
        * (t.particlePhysics ? 1.20 : 1)
        * (t.internet ? 1.20 : 1)
        * (w.species === 'human' ? 1.12 : (w.species === 'elf' ? 1.15 : 1))
        * (w.gov === 'democracy' ? 1.12 : (w.gov === 'technocracy' ? 1.20 : 1))
        * ruinsMult * fedMult;
      const moneyMult = (t.trade ? 1.20 : 1)
        * (t.internet ? 1.20 : 1)
        * (w.gov === 'democracy' ? 1.12 : (w.gov === 'oligarchy' ? 1.25 : 1))
        * fedMult;

      if (t.currency && w.pop > 0) {
        let govTaxFactor = 1.0;
        if (w.gov === 'oligarchy') govTaxFactor = 1.20;
        else if (w.gov === 'corpocracy') govTaxFactor = 0.50;
        else if (w.gov === 'socialist') govTaxFactor = 0.85;
        const taxMult = govTaxFactor * moneyMult * happyMult * shardMult;
        const taxInc = Math.floor(w.pop) * 0.16 * (w.taxRate / 20) * taxMult;
        metrics.taxIncome = taxInc;
        rates.money += taxInc;
      } else {
        metrics.taxIncome = 0;
      }

      for (const j of JOBS_DEF) {
        const workers = w.jobs[j.id] || 0;
        if (workers <= 0) continue;

        let jobMult = happyMult * shardMult * ruinsMult;
        if (j.id === 'farmer') jobMult *= (1 + (b.farmland || 0) * 0.20) * agriMult;
        if (j.id === 'lumberjack') jobMult *= (1 + (b.lumberCamp || 0) * 0.25) * (t.tools ? 1.10 : 1) * lumberTraitMult;
        if (j.id === 'quarryWorker') jobMult *= (1 + (b.quarry || 0) * 0.25) * (t.tools ? 1.10 : 1) * mineTraitMult;
        if (j.id === 'scholar') jobMult *= (1 + (b.library || 0) * 0.20) * (t.writing ? 1.10 : 1) * sciMult;
        if (j.id === 'professor') jobMult *= (1 + (b.university || 0) * 0.15) * sciMult;
        if (j.id === 'scientist') jobMult *= sciMult;
        if (j.id === 'miner') jobMult *= (1 + (b.mine || 0) * 0.10) * mineTraitMult;
        if (j.id === 'coalMiner') jobMult *= (1 + (b.coalMine || 0) * 0.10) * mineTraitMult;
        if (j.id === 'merchant' || j.id === 'engineer') jobMult *= moneyMult;
        if (j.id === 'craftsman') {
          jobMult *= (1 + (b.smelter || 0) * 0.15) * (1 + (b.foundry || 0) * 0.15) * indPerkMult * (w.species === 'dwarf' ? 1.25 : 1);
        }

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
          let focusMult = 1.0;
          if (j.id === 'craftsman' && w.craftFocus !== 'balanced') {
            focusMult = (w.craftFocus === outId) ? 1.65 : 0.65;
          }
          rates[outId] += workers * perWorker * jobMult * inputScale * focusMult;
        }
      }

      const mineCnt = b.mine || 0;
      if (mineCnt > 0) {
        rates.copper += mineCnt * 0.20 * shardMult * mineTraitMult;
        rates.iron += mineCnt * 0.25 * shardMult * mineTraitMult;
        if (t.aluminiumIndustry) rates.aluminium += mineCnt * 0.40 * shardMult * mineTraitMult;
      }
      if ((b.coalMine || 0) > 0) rates.coal += b.coalMine * 0.30 * shardMult * mineTraitMult;
      if ((b.market || 0) > 0) rates.money += b.market * 0.50 * moneyMult * shardMult;
      if ((eb.amphitheatre || 0) > 0) rates.knowledge += eb.amphitheatre * 0.50 * sciMult * shardMult;
      if ((b.researchCenter || 0) > 0) rates.knowledge += activeCnt('researchCenter') * 2.0 * sciMult * shardMult;
      if ((b.datacenter || 0) > 0) rates.knowledge += activeCnt('datacenter') * 10.0 * sciMult * shardMult;
      if ((b.moonBase || 0) > 0) rates.waterIce += b.moonBase * 0.40 * shardMult * fedMult;
      if ((b.marsColony || 0) > 0) rates.rareMineral += b.marsColony * 0.30 * shardMult * fedMult;

      const energyMult = (1 + getPerkLevel('efficientEnergy') * 0.04)
        * (t.electricalEngineering ? 1.15 : 1)
        * ((envMods && envMods.powerMult) || 1.0);
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
      const extraPowerReq = bridge.getExtraPowerReq(w);
      const rawPowerReq = (
        activeCnt('steelMill') * 8 +
        activeCnt('cementPlant') * 5 +
        activeCnt('oilWell') * 3 +
        activeCnt('refinery') * 6 +
        activeCnt('factory') * 10 +
        activeCnt('researchCenter') * 5 +
        activeCnt('uraniumMine') * 10 +
        activeCnt('cleanRoom') * 15 +
        activeCnt('chipFab') * 20 +
        activeCnt('datacenter') * 25 +
        activeCnt('launchPad') * 15 +
        activeCnt('helium3Harvester') * 20 +
        activeCnt('apartment', true) * 1 +
        activeCnt('wardenclyffe', true) * 2 +
        activeCnt('biolab', true) * 2 +
        extraPowerReq
      ) * gridDiscount;

      metrics.powerGen = totalGen;
      metrics.powerReq = rawPowerReq;
      metrics.powerSurplus = totalGen - rawPowerReq;
      powerRatio = rawPowerReq <= 0 ? 1 : Math.min(1, totalGen / rawPowerReq);
      metrics.powerRatio = powerRatio;

      if (activeCnt('wardenclyffe', true) > 0) {
        rates.knowledge += activeCnt('wardenclyffe', true) * 4.5 * Math.max(0.3, powerRatio) * sciMult * shardMult;
      }
      if (activeCnt('biolab', true) > 0) {
        rates.knowledge += activeCnt('biolab', true) * 12.0 * Math.max(0.3, powerRatio) * sciMult * shardMult;
      }

      let indOutputMult = indPerkMult * shardMult * (t.mechanicalEngineering ? 1.15 : 1);
      if (t.artificialIntelligence && (b.supercomputer || 0) >= 1) indOutputMult *= 1.25;

      const runRecipe = (count, inputs, outputs, usePower = true, extraMult = 1.0) => {
        if (count <= 0) return;
        const pScale = usePower ? powerRatio : 1;
        if (pScale <= 0) return;
        let inScale = 1;
        for (const [inId, perUnit] of Object.entries(inputs)) {
          const need = count * perUnit * pScale * dt;
          if (need > 0 && (w.res[inId] || 0) < need) {
            inScale = Math.min(inScale, (w.res[inId] || 0) / need);
          }
        }
        const finalScale = pScale * inScale;
        if (finalScale <= 0) return;
        for (const [inId, perUnit] of Object.entries(inputs)) {
          rates[inId] -= count * perUnit * finalScale;
        }
        for (const [outId, perUnit] of Object.entries(outputs)) {
          rates[outId] += count * perUnit * finalScale * indOutputMult * extraMult;
        }
      };

      let smelterBoost = 1.0;
      const smCnt = b.smelter || 0;
      if (smCnt > 0) {
        if (w.smelterMode === 'oil' && (w.res.oil || 0) >= smCnt * 0.2 * dt) {
          rates.oil -= smCnt * 0.2;
          smelterBoost = 1.50;
        } else if (w.smelterMode === 'coal' && (w.res.coal || 0) >= smCnt * 0.15 * dt) {
          rates.coal -= smCnt * 0.15;
          smelterBoost = 1.25;
        }
      }
      runRecipe(smCnt, { iron: 0.7 }, { wroughtIron: 0.35 }, false, smelterBoost);
      runRecipe(b.foundry || 0, { lumber: 0.6, stone: 0.6 }, { plywood: 0.3, brick: 0.3 }, false);

      runRecipe(activeCnt('steelMill'), { iron: 2, coal: 1 }, { steel: 1 }, true, smelterBoost);
      runRecipe(activeCnt('cementPlant'), { stone: 3 }, { cement: 1 }, true);
      runRecipe(activeCnt('oilWell'), {}, { oil: 1 }, true);
      runRecipe(activeCnt('refinery'), { oil: 2 }, { polymer: 1 }, true);

      const uMult = t.radioChemistry ? 1.20 : 1.0;
      runRecipe(activeCnt('uraniumMine'), {}, { uranium: 0.3 * uMult }, true);

      const facCnt = activeCnt('factory');
      if (facCnt > 0 && t.electronics) {
        if (t.rocketry) {
          runRecipe(facCnt * 0.6, { aluminium: 1, polymer: 1 }, { electronics: 1 }, true);
          runRecipe(facCnt * 0.4, { steel: 2, aluminium: 1, polymer: 1, electronics: 1 }, { rocketParts: 1 }, true);
        } else {
          runRecipe(facCnt, { aluminium: 1, polymer: 1 }, { electronics: 1 }, true);
        }
      }

      runRecipe(activeCnt('cleanRoom'), { electronics: 1, polymer: 2 }, { wafer: 1 }, true);
      runRecipe(activeCnt('chipFab'), { wafer: 1, aluminium: 1 }, { microprocessor: 1 }, true);
      runRecipe(activeCnt('launchPad'), { steel: 1.2, aluminium: 0.6, polymer: 0.6, electronics: 0.6 }, { rocketParts: 0.6 }, true);
      runRecipe(activeCnt('helium3Harvester'), {}, { helium3: 0.5 }, true);

      const popPerkMult = (1 + getPerkLevel('populationBonus') * 0.05)
        * (w.species === 'orc' ? 1.20 : 1)
        * ((envMods && envMods.popGrowthMult) || 1.0);
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

    bridge.stepExtendedSimulation(getHostApi(), dt, rates, {
      happyMult,
      shardMult,
      powerRatio,
      foodNeed
    });

    for (const r of RESOURCES_DEF) {
      const net = rates[r.id] || 0;
      metrics.netRates[r.id] = net;
      if (net !== 0) {
        addResourceClamped(r.id, net * dt);
      }
    }
  }

  function tick(dt = 0.25) {
    recomputeCapacities();
    stepSimulation(dt);
    checkMissions();
    checkEraAdvancement();
  }

  function handleStageManualClick(tapInfo) {
    ensureEvolveWorldFields();
    const w = save.world;
    w.clicks = (w.clicks || 0) + 1;
    playSound('click');

    const shardMult = getShardMultiplier();
    const animalMult = w.kingdom === 'animal' ? 1.25 : 1.0;
    const orcMult = w.species === 'orc' ? 1.30 : 1.0;
    const rapidMult = (w.eraIndex === 0 && save.prestige.rapidMutation) ? 2.0 : 1.0;
    const clickMult = shardMult * (1 + getPerkLevel('automation') * 0.10) * (w.techs.tools ? 1.10 : 1) * animalMult * orcMult * rapidMult;
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

    const nx = tapInfo && typeof tapInfo.nx === 'number' ? Math.max(0.1, Math.min(0.9, tapInfo.nx)) : 0.5;
    const ny = tapInfo && typeof tapInfo.ny === 'number' ? Math.max(0.1, Math.min(0.9, tapInfo.ny)) : 0.45;
    emitFloat(floatLabel, floatColor, tapInfo);
    emitParticles(nx, ny, floatColor);

    checkMissions();
    checkEraAdvancement();
    return { floatLabel, floatColor };
  }

  function handleEraActionButton(tapInfo) {
    ensureEvolveWorldFields();
    const w = save.world;
    if (w.eraIndex === 0) {
      if (w.techs.evo_membrane) {
        if ((w.res.rna || 0) >= 2 && (w.res.dna || 0) < (metrics.caps.dna || 150)) {
          w.res.rna -= 2;
          const gain = save.prestige.rapidMutation ? 2 : 1;
          addResourceClamped('dna', gain);
          playSound('tech');
          emitFloat(`+${gain} DNA (-2 RNA)`, '#34d399', tapInfo);
          emitParticles(0.5, 0.5, '#34d399');
        } else {
          notifyToast('RNA 不足 2 或 DNA 已达上限！');
        }
      } else {
        const gain = save.prestige.rapidMutation ? 4 : 2;
        addResourceClamped('rna', gain);
        playSound('click');
        emitFloat(`+${gain} RNA`, '#34d399', tapInfo);
        emitParticles(0.5, 0.5, '#34d399');
      }
    } else if (w.eraIndex === 1) {
      addResourceClamped('lumber', 2.5);
      addResourceClamped('stone', 1.5);
      addResourceClamped('knowledge', 1.5);
      playSound('click');
      emitFloat('+2.5木 +1.5石 +1.5知', '#fbbf24', tapInfo);
      emitParticles(0.5, 0.5, '#fbbf24');
    } else {
      return handleStageManualClick(tapInfo);
    }

    checkMissions();
    checkEraAdvancement();
    return true;
  }

  function buyCellStructure(cellId) {
    ensureEvolveWorldFields();
    const w = save.world;
    const cDef = EVOLVE_CELL_STRUCTURES_DEF.find(c => c.id === cellId);
    if (!cDef) return false;
    if (cDef.reqEvo && !w.techs[cDef.reqEvo]) return false;
    const cost = getCellStructureCost(cDef);
    if (!canAffordCost(cost)) return false;

    payCost(cost);
    w.evoCells[cellId] = (w.evoCells[cellId] || 0) + 1;
    playSound('build');
    recomputeCapacities();
    checkMissions();
    return true;
  }

  function buyTechnology(techId) {
    const w = save.world;
    const tDef = TECH_MAP[techId];
    if (!tDef || w.techs[techId]) return false;
    if (!tDef.req.every(r => !!w.techs[r])) return false;
    const effCost = getEffectiveTechCost(tDef);
    if (!canAffordCost(effCost)) return false;

    payCost(effCost);
    w.techs[techId] = true;
    playSound('tech');
    const msg = `🔬 研究完成：【${tDef.name}】`;
    notifyToast(msg);
    bridge.modules.evMod.addLog({ save }, 'progress', msg, 'sky');

    recomputeCapacities();
    checkMissions();
    checkEraAdvancement();
    return true;
  }

  function buyBuilding(bId, isExtra = false, batchOverride = null) {
    ensureEvolveWorldFields();
    const w = save.world;
    const store = isExtra ? w.extraBlds : w.buildings;
    const bDef = isExtra ? getExtraBuildingDef(bId) : BUILDINGS_DEF.find(b => b.id === bId);
    if (!bDef) return false;
    if (bDef.reqTech && !w.techs[bDef.reqTech]) return false;

    const owned = store[bId] || 0;
    const maxAllowed = bDef.maxCount ? Math.max(0, bDef.maxCount - owned) : 200;
    if (maxAllowed <= 0) return false;

    const effBatch = batchOverride || buildBatch;
    const qty = effBatch === 'MAX' ? getMaxAffordableBuilding(bDef, isExtra) : Math.min(effBatch, maxAllowed);
    if (qty <= 0) return false;

    const cost = getBuildingCost(bDef, qty, isExtra);
    if (!canAffordCost(cost)) return false;

    payCost(cost);
    store[bId] = owned + qty;
    playSound('build');
    notifyToast(`🏛️ 建成 ${bDef.name} ×${qty}`);

    recomputeCapacities();
    checkMissions();
    checkEraAdvancement();
    return true;
  }

  function recruitPopulation(tapInfo) {
    const w = save.world;
    if (w.eraIndex < 1) return false;
    recomputeCapacities();
    const curPop = Math.floor(w.pop);
    const vacant = Math.max(0, metrics.popCap - curPop);
    const cost = getRecruitFoodCost();
    if (vacant <= 0 || (w.res.food || 0) < cost) return false;

    const gain = Math.min(2, vacant);
    w.res.food -= cost;
    w.pop = Math.min(metrics.popCap, curPop + gain);
    playSound('build');
    emitFloat(`+${gain} 人口`, '#38bdf8', tapInfo);
    emitParticles(0.5, 0.45, '#38bdf8');

    checkMissions();
    checkEraAdvancement();
    return true;
  }

  function adjustJob(jobId, delta) {
    const w = save.world;
    const cur = w.jobs[jobId] || 0;
    const assigned = Object.values(w.jobs).reduce((a, c) => a + c, 0);
    const idle = Math.max(0, Math.floor(w.pop) - assigned);

    if (delta > 0) {
      const add = Math.min(delta, idle);
      if (add <= 0) return false;
      w.jobs[jobId] = cur + add;
    } else {
      const sub = Math.min(-delta, cur);
      if (sub <= 0) return false;
      w.jobs[jobId] = cur - sub;
    }
    playSound('click');
    checkMissions();
    return true;
  }

  function switchSpecies(specId) {
    const w = save.world;
    if (w.eraIndex >= 1 || w.techs.evo_sapiens) {
      notifyToast('🧬 当前轮回物种已完成进化定型，无法再次转化！可在【核爆/跃迁】中预设下一轮物种。');
      return false;
    }
    w.species = specId;
    const sp = dl.MAPS.species[specId];
    if (sp) {
      w.genus = sp.genus;
      w.kingdom = sp.genus === 'plant' ? 'plant' : (sp.genus === 'fungi' ? 'fungi' : 'animal');
      notifyToast(`🧬 已适应演化为：【${sp.name}】`);
    }
    playSound('click');
    recomputeCapacities();
    return true;
  }

  function switchGovernment(govId) {
    const w = save.world;
    w.gov = govId;
    playSound('click');
    const govDef = dl.MAPS.governments[govId] || EVOLVE_GOV_DEF.find(g => g.id === govId);
    notifyToast(`🏛️ 政体已切换为：【${govDef ? govDef.name : govId}】`);
    recomputeCapacities();
    return true;
  }

  function canMadResetNow() {
    ensureEvolveWorldFields();
    const w = save.world;
    return w.eraIndex >= 4 && !!w.techs.nuclearFission && (w.extraBlds.missile_silo || 0) >= 1;
  }

  function calcMadPlasmidGain() {
    ensureEvolveWorldFields();
    const w = save.world;
    const citizens = Math.floor(w.pop || 0);
    const soldiers = (w.extraBlds.garrison || 0) * 3 + (w.extraBlds.missile_silo || 0) * 5;
    const techCnt = Object.keys(w.techs).filter(k => w.techs[k]).length;
    const base = Math.max(5, Math.round((citizens + soldiers) / 3 + techCnt * 0.4));
    const mult = bridge.computePrestigeBonusMultiplier(save, true);
    return Math.max(5, Math.round(base * mult));
  }

  function executeMadReset() {
    if (!canMadResetNow()) return 0;
    const gain = calcMadPlasmidGain();
    save.prestige.count += 1;
    save.prestige.madCount = (save.prestige.madCount || 0) + 1;
    save.prestige.genesisShards += gain;
    save.prestige.lifetimeShards += gain;
    save.prestige.rapidMutation = true;
    save.prestige.ancientRuins = true;
    bridge.modules.evMod.checkAchievements(bridge.createContext(getHostApi()));
    save.world = createInitialWorld();
    bridge.applyNextWorldPreset(save);
    save.lastActiveAt = Date.now();
    recomputeCapacities();
    playSound('nuke');
    notifyToast(`☢️ 核爆重置完成！获得 ${gain} 枚质粒/余烬，已激活【快速突变】与【远古遗迹】！`);
    return gain;
  }

  function calcPrestigeGain() {
    const w = save.world;
    const techCnt = Object.keys(w.techs).filter(k => w.techs[k]).length;
    const bldCnt = Object.values(w.buildings).reduce((a, c) => a + c, 0);
    const base = Math.max(15, Math.floor(Math.sqrt(Math.floor(w.pop) / 10) + techCnt / 2 + bldCnt / 50) + 10);
    const mult = bridge.computePrestigeBonusMultiplier(save, false);
    return Math.max(15, Math.round(base * mult));
  }

  function calcPhageGain() {
    const w = save.world;
    return Math.max(2, Math.floor(Math.sqrt(Math.floor(w.pop) / 25)) + 2);
  }

  function canPrestigeNow() {
    const w = save.world;
    return w.eraIndex === 6 && !!w.techs.interstellarTravel && (w.buildings.colonyShip || 0) >= 1;
  }

  function executePrestige() {
    if (!canPrestigeNow()) return null;
    const gain = calcPrestigeGain();
    const phageGain = calcPhageGain();
    save.prestige.count += 1;
    save.prestige.arkCount = (save.prestige.arkCount || 0) + 1;
    save.prestige.genesisShards += gain;
    save.prestige.lifetimeShards += gain;
    save.prestige.phage = (save.prestige.phage || 0) + phageGain;
    save.prestige.rapidMutation = true;
    save.prestige.ancientRuins = true;
    bridge.modules.evMod.checkAchievements(bridge.createContext(getHostApi()));
    save.world = createInitialWorld();
    bridge.applyNextWorldPreset(save);
    save.lastActiveAt = Date.now();
    recomputeCapacities();
    playSound('era');
    notifyToast(`🚀 星际播种成功！获得 ${gain} 余烬与 ${phageGain} 噬菌体！`);
    return { gain, phageGain };
  }

  function buyPerk(perkId) {
    const pDef = PERKS_DEF.find(p => p.id === perkId);
    if (!pDef) return false;
    const lv = getPerkLevel(perkId);
    if (lv >= 5) return false;
    const cost = pDef.costs[lv];
    if ((save.prestige.genesisShards || 0) < cost) return false;

    save.prestige.genesisShards -= cost;
    save.prestige.perks[perkId] = lv + 1;
    playSound('tech');
    notifyToast(`✨ 永久天赋升级：【${pDef.name}】Lv.${lv + 1}`);
    return true;
  }

  function catchUp(elapsedSeconds) {
    const maxHours = [8, 12, 18, 24, 36, 48][getPerkLevel('deepHibernation')] || 8;
    const clamped = Math.min(maxHours * 3600, Math.max(0, Number(elapsedSeconds) || 0));
    if (clamped < 1) return 0;
    const steps = Math.min(360, Math.max(1, Math.floor(clamped / 2)));
    const stepDt = clamped / steps;
    for (let i = 0; i < steps; i++) {
      recomputeCapacities();
      stepSimulation(stepDt);
    }
    recomputeCapacities();
    checkMissions();
    checkEraAdvancement();
    return clamped;
  }

  function loadSaveData(parsed) {
    if (!parsed || typeof parsed !== 'object' || !parsed.world) {
      throw new Error('无效存档数据');
    }
    const defSave = createDefaultSave();
    save = Object.assign({}, defSave, parsed);
    save.world = Object.assign(createInitialWorld(), parsed.world || {});
    save.prestige = Object.assign(
      { count: 0, madCount: 0, arkCount: 0, genesisShards: 0, lifetimeShards: 0, phage: 0, rapidMutation: false, ancientRuins: false, perks: {} },
      parsed.prestige || {}
    );
    save.settings = Object.assign({ sound: true, crt: false, theme: 'pixel', numFormat: 'metric', boring: false, mKeys: true }, parsed.settings || {});
    ensureEvolveWorldFields();

    recomputeCapacities();
    checkMissions();
    checkEraAdvancement();

    const elapsedRaw = (Date.now() - (save.lastActiveAt || Date.now())) / 1000;
    let settled = 0;
    if (elapsedRaw >= 10) {
      settled = catchUp(elapsedRaw);
      if (settled >= 10) {
        notifyToast(`💤 欢迎回来！已结算 ${Math.floor(settled / 60)} 分钟离线收益`);
      }
    }
    return settled;
  }

  function reset() {
    save = createDefaultSave();
    ensureEvolveWorldFields();
    recomputeCapacities();
    return save;
  }

  ensureEvolveWorldFields();
  recomputeCapacities();

  return {
    SAVE_KEY,
    defs,
    get save() { return save; },
    get metrics() { return metrics; },
    get envMods() { return envMods; },
    get batch() { return buildBatch; },
    setBatch(v) { buildBatch = v === 'MAX' ? 'MAX' : Number(v) || 1; },
    get hideDoneTechs() { return hideResearchedTechs; },
    toggleHideDoneTechs() { hideResearchedTechs = !hideResearchedTechs; return hideResearchedTechs; },
    fmt,
    fmtRate,
    getShardMultiplier,
    getCityTitle,
    getHostApi,
    getBridgeContext: () => bridge.createContext(getHostApi()),
    ensureEvolveWorldFields,
    recomputeCapacities,
    getCellStructureCost,
    getBuildingCost,
    getMaxAffordableBuilding,
    getEffectiveTechCost,
    canAffordCost,
    getRecruitFoodCost,
    getPerkLevel,
    isJobUnlocked,
    stepSimulation,
    tick,
    checkMissions,
    checkEraAdvancement,
    handleStageManualClick,
    handleEraActionButton,
    buyCellStructure,
    buyTechnology,
    buyBuilding,
    recruitPopulation,
    adjustJob,
    switchSpecies,
    switchGovernment,
    canMadResetNow,
    calcMadPlasmidGain,
    executeMadReset,
    calcPrestigeGain,
    calcPhageGain,
    canPrestigeNow,
    executePrestige,
    buyPerk,
    catchUp,
    loadSaveData,
    reset
  };
}

module.exports = {
  SAVE_KEY,
  createEvolveGame
};
