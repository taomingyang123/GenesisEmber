'use strict';

/**
 * Evolve 核心桥接引擎（小程序纯 JS 版）
 * 与 evolve_web/js/evolve-bridge.js 保持完全一致
 */

const dl = require('./data-loader.js');
const calMod = require('./calendar-weather.js');
const ecoMod = require('./economy-storage.js');
const diploMod = require('./diplomacy-military.js');
const arpaMod = require('./arpa-genetics.js');
const evMod = require('./events-achieves.js');

function createContext(host) {
  const ctx = {
    dl,
    calMod,
    ecoMod,
    diploMod,
    arpaMod,
    evMod,
    economyMod: ecoMod,
    save: host.getSave(),
    metrics: host.getMetrics(),
    envMods: host.getEnvMods ? host.getEnvMods() : {},
    getResName: host.getResName,
    addResourceClamped: host.addResourceClamped,
    recomputeCapacities: host.recomputeCapacities,
    showToast: host.showToast,
    isJobUnlocked: host.isJobUnlocked,
    BUILDINGS_DEF: host.BUILDINGS_DEF,
    EVOLVE_EXTRA_BLDS_DEF: host.EVOLVE_EXTRA_BLDS_DEF,
    tryBuyBuildingSingle: host.tryBuyBuildingSingle,
    tryBuyTechnology: host.tryBuyTechnology,
    addLog: (cat, text, tone) => evMod.addLog(ctx, cat, text, tone)
  };
  return ctx;
}

function ensureAllFields(save) {
  if (!save || !save.world) return;
  const w = save.world;
  const s = save.settings || (save.settings = {});

  if (!w.biome) w.biome = 'grassland';
  if (!w.planetTrait) w.planetTrait = 'none';
  if (!w.universe) w.universe = 'standard';
  if (!w.species || !dl.MAPS.species[w.species]) {
    w.species = dl.MAPS.species[w.species] ? w.species : 'human';
  }
  if (!w.genus) {
    const sp = dl.MAPS.species[w.species];
    w.genus = sp ? sp.genus : 'humanoid';
  }
  if (typeof w.govCooldown !== 'number') w.govCooldown = 0;

  if (!s.theme) s.theme = 'pixel';
  if (!s.numFormat) s.numFormat = 'metric';
  if (typeof s.boring !== 'boolean') s.boring = false;
  if (typeof s.mKeys !== 'boolean') s.mKeys = true;

  calMod.ensureCalendar(w);
  ecoMod.ensureEconomyFields(w);
  diploMod.ensureDiplomacyFields(w);
  arpaMod.ensureArpaGeneticsFields(save);
  evMod.ensureEventAchieveFields(save);
}

function applyExtendedCapacities(host, caps, popCap) {
  const ctx = createContext(host);
  const save = ctx.save;
  const w = save.world;
  const eb = w.extraBlds || {};
  const arpa = w.arpa || {};
  const env = calMod.computeEnvironmentMods(ctx);
  host.setEnvMods(env);

  const shedCnt = eb.shed || 0;
  if (shedCnt > 0) {
    caps.food = (caps.food || 500) + shedCnt * 300;
    caps.lumber = (caps.lumber || 300) + shedCnt * 200;
    caps.stone = (caps.stone || 200) + shedCnt * 200;
  }
  if ((eb.casino || 0) > 0) {
    caps.money = (caps.money || 1000) + eb.casino * 5000;
  }

  const lhcRank = (arpa.lhc && arpa.lhc.rank) || 0;
  if (lhcRank > 0) {
    caps.knowledge = Math.round((caps.knowledge || 250) * (1 + lhcRank * 0.15));
  }
  const stockRank = (arpa.stock_exchange && arpa.stock_exchange.rank) || 0;
  if (stockRank > 0) {
    caps.money = Math.round((caps.money || 1000) * (1 + stockRank * 0.15));
  }

  const st = ecoMod.getStorageStats(ctx);
  for (const [rId, cnt] of Object.entries(w.storage.assignedCrates || {})) {
    if (cnt > 0 && caps[rId] !== undefined) {
      caps[rId] += cnt * st.perCrate;
    }
  }
  for (const [rId, cnt] of Object.entries(w.storage.assignedContainers || {})) {
    if (cnt > 0 && caps[rId] !== undefined) {
      caps[rId] += cnt * st.perContainer;
    }
  }

  const capMult = (env.storageCapMult || 1.0)
    * (dl.hasTrait(w, 'smart') ? 1.15 : 1.0)
    * (dl.hasTrait(w, 'hoarder') ? 1.15 : 1.0);
  if (capMult !== 1.0) {
    for (const k of Object.keys(caps)) {
      if (k !== 'rna' && k !== 'dna') {
        caps[k] = Math.round(caps[k] * capMult);
      }
    }
  }
  if (dl.hasTrait(w, 'smart')) {
    caps.knowledge = Math.round((caps.knowledge || 250) * 1.15);
  }

  let nextPopCap = popCap;
  if (dl.hasTrait(w, 'high_pop')) nextPopCap = Math.round(nextPopCap * 1.20);
  if (dl.hasTrait(w, 'solitary') && nextPopCap > 5) nextPopCap = Math.max(5, Math.round(nextPopCap * 0.92));

  if (w.techs.currency) w.unlockedRes.money = true;
  if (w.techs.copperAge) w.unlockedRes.copper = true;
  if (w.techs.ironAge) w.unlockedRes.iron = true;
  if (w.techs.advancedMining) w.unlockedRes.coal = true;
  if (w.techs.smelting) {
    w.unlockedRes.plywood = true;
    w.unlockedRes.brick = true;
    w.unlockedRes.wroughtIron = true;
  }

  return nextPopCap;
}

function stepExtendedSimulation(host, dt, rates, contextInfo) {
  const ctx = createContext(host);
  const save = ctx.save;
  const w = save.world;
  const arpa = w.arpa || {};
  const env = ctx.envMods || calMod.computeEnvironmentMods(ctx);

  calMod.stepCalendar(ctx, dt);

  const gMult = env.globalMult || 1.0;
  const applyPosMult = (resId, m) => {
    if ((rates[resId] || 0) > 0 && m !== 1.0) {
      rates[resId] *= m;
    }
  };
  applyPosMult('food', (env.foodMult || 1) * gMult);
  applyPosMult('lumber', (env.lumberMult || 1) * gMult);
  applyPosMult('stone', (env.stoneMult || 1) * gMult);
  for (const k of ['copper', 'iron', 'coal', 'uranium', 'aluminium', 'helium3', 'rareMineral']) {
    applyPosMult(k, (env.mineMult || 1) * gMult);
  }
  applyPosMult('knowledge', (env.knowledgeMult || 1) * gMult);
  applyPosMult('money', (env.moneyMult || 1) * gMult);
  for (const k of ['plywood', 'brick', 'wroughtIron', 'steel', 'cement', 'polymer', 'electronics', 'wafer', 'microprocessor', 'rocketParts']) {
    applyPosMult(k, (env.industryMult || 1) * gMult);
  }

  const happyMult = contextInfo.happyMult || 1.0;
  const shardMult = contextInfo.shardMult || 1.0;
  if (w.eraIndex >= 1) {
    const bankerCnt = (w.jobs && w.jobs.banker) || 0;
    if (bankerCnt > 0) {
      const repBoost = w.gov === 'republic' ? 1.25 : 1.0;
      rates.money += bankerCnt * 0.9 * repBoost * (env.moneyMult || 1) * happyMult * shardMult;
      if (ctx.metrics.taxIncome > 0) {
        const extraTax = ctx.metrics.taxIncome * (bankerCnt * 0.06 * repBoost);
        ctx.metrics.taxIncome += extraTax;
        rates.money += extraTax;
      }
    }

    const priestCnt = (w.jobs && w.jobs.priest) || 0;
    if (priestCnt > 0) {
      rates.knowledge += priestCnt * 0.4 * (env.knowledgeMult || 1) * happyMult * shardMult;
    }

    const pRatio = contextInfo.powerRatio ?? 1.0;
    const stockMult = 1 + ((arpa.stock_exchange && arpa.stock_exchange.rank) || 0) * 0.12;
    const corpMult = w.gov === 'corpocracy' ? 2.5 : 1.0;

    const casinoOn = ecoMod.getActiveBuildingCount(w, 'casino', true);
    if (casinoOn > 0 && w.techs.trade) {
      rates.money += casinoOn * 6.0 * pRatio * stockMult * corpMult * (env.moneyMult || 1) * shardMult;
    }

    const tourOn = ecoMod.getActiveBuildingCount(w, 'tourist_center', true);
    if (tourOn > 0 && w.techs.electricity) {
      const monCnt = (arpa.monument && arpa.monument.rank) || 0;
      const tIncome = tourOn * (5.0 + monCnt * 4.5 + (w.happiness / 50)) * pRatio * corpMult * (env.moneyMult || 1) * shardMult;
      rates.money += tIncome;
    }
  }

  ecoMod.stepMarketAndTrade(ctx, dt, rates);
  diploMod.stepDiplomacyAndMilitary(ctx, dt, rates);
  calMod.computeMoraleAndCheckRevolt(ctx, contextInfo.foodNeed || 0, rates, ctx.metrics.popCap || 0, dt);
  arpaMod.stepGeneLab(ctx, dt);
  arpaMod.stepGovernor(ctx, dt);
  ecoMod.stepQueues(ctx);
  evMod.stepRandomEvents(ctx, dt);
  evMod.checkAchievements(ctx);
}

function getExtraPowerReq(world) {
  return (
    ecoMod.getActiveBuildingCount(world, 'hospital', true) * 2 +
    ecoMod.getActiveBuildingCount(world, 'casino', true) * 3 +
    ecoMod.getActiveBuildingCount(world, 'tourist_center', true) * 4
  );
}

function computePrestigeBonusMultiplier(save, isMad) {
  let mult = 1.0;
  if (dl.hasCrispr(save, 'mitosis')) mult *= 1.25;
  const univ = save.world && save.world.universe;
  if (!isMad && univ === 'heavy') mult *= 1.25;
  if (univ === 'micro') mult *= 0.75;
  return mult;
}

function applyNextWorldPreset(save) {
  const p = save.prestige || {};
  const preset = p.nextPreset || {};
  const w = save.world;
  if (preset.biome && dl.MAPS.biomes[preset.biome]) w.biome = preset.biome;
  if (preset.planetTrait && dl.MAPS.planetTraits[preset.planetTrait]) w.planetTrait = preset.planetTrait;
  if (preset.universe && dl.MAPS.universes[preset.universe]) w.universe = preset.universe;
  if (preset.species && dl.MAPS.species[preset.species]) {
    w.species = preset.species;
    w.genus = dl.MAPS.species[preset.species].genus;
  }
  if (dl.hasCrispr(save, 'ancients')) {
    w.extraBlds = w.extraBlds || {};
    w.extraBlds.temple = 1;
  }
  ensureAllFields(save);
}

function renderSceneOverlay(pxRect, animTick, world) {
  if (!world || world.eraIndex === 0) return;
  const cal = world.calendar || { weather: 0, moon: 0, season: 0 };

  const moonColors = ['#334155', '#64748b', '#94a3b8', '#cbd5e1', '#fef08a', '#e2e8f0', '#94a3b8', '#475569'];
  pxRect(55, 4, 4, 4, moonColors[cal.moon % 8] || '#fef08a');

  if (cal.weather === 4 || cal.weather === 5) {
    const drops = cal.weather === 5 ? 14 : 8;
    for (let i = 0; i < drops; i++) {
      const rx = (i * 13 + animTick * 2) % 62 + 1;
      const ry = (i * 11 + animTick * 5) % 44;
      pxRect(rx, ry, 1, 3, 'rgba(56, 189, 248, 0.72)');
    }
  }

  if (cal.weather === 6 || cal.weather === 7) {
    const flakes = cal.weather === 7 ? 16 : 9;
    for (let i = 0; i < flakes; i++) {
      const sx = (i * 19 + Math.floor(Math.sin(animTick * 0.2 + i) * 3) + animTick) % 62 + 1;
      const sy = (i * 9 + animTick * 2) % 46;
      pxRect(sx, sy, 2, 2, 'rgba(248, 250, 252, 0.85)');
    }
  }

  if (cal.weather === 1 || cal.weather === 3 || cal.weather === 5 || cal.weather === 7) {
    const wy = 10 + (animTick % 3) * 6;
    const wx = (animTick * 6) % 52;
    pxRect(wx, wy, 8, 1, 'rgba(226, 232, 240, 0.35)');
  }
}

module.exports = {
  createContext,
  ensureAllFields,
  applyExtendedCapacities,
  stepExtendedSimulation,
  getExtraPowerReq,
  computePrestigeBonusMultiplier,
  applyNextWorldPreset,
  renderSceneOverlay,
  modules: { dl, calMod, ecoMod, diploMod, arpaMod, evMod }
};
