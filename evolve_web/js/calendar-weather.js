(function (root) {
  'use strict';

  /**
   * 历法、气象、月相、星象与全文明环境修正引擎
   * 参考 Evolve main.js 历法系统 (calendar, weather, moon, astroSign, morale)
   */

  function getDL() {
    if (root && root.EvolveModules && root.EvolveModules.DataLoader) {
      return root.EvolveModules.DataLoader;
    }
    return require('./data-loader.js');
  }

  function ensureCalendar(world) {
    const dl = getDL();
    const pt = dl.MAPS.planetTraits[world.planetTrait];
    const orbit = (pt && pt.mods && pt.mods.orbit) ? pt.mods.orbit : 365;
    if (!world.calendar || typeof world.calendar !== 'object') {
      world.calendar = {
        day: 1,
        year: 0,
        season: 0,
        weather: 0,
        temp: 1,
        moon: 0,
        orbit,
        dayAccum: 0
      };
    }
    world.calendar.orbit = orbit;
    if (typeof world.calendar.dayAccum !== 'number') world.calendar.dayAccum = 0;
    if (typeof world.calendar.day !== 'number') world.calendar.day = 1;
    if (typeof world.calendar.year !== 'number') world.calendar.year = 0;
    if (typeof world.calendar.season !== 'number') world.calendar.season = 0;
    if (typeof world.calendar.weather !== 'number') world.calendar.weather = 0;
    if (typeof world.calendar.temp !== 'number') world.calendar.temp = 1;
    if (typeof world.calendar.moon !== 'number') world.calendar.moon = 0;
    return world.calendar;
  }

  /**
   * 按季节、群系和星球特性抽取天气与气温
   */
  function rollWeatherAndTemp(world, cal) {
    const biome = world.biome || 'grassland';
    const pt = world.planetTrait || 'none';
    const season = cal.season;

    // 气温判定: 0=寒冷, 1=适中, 2=炎热
    const rT = Math.random();
    if (biome === 'tundra' || biome === 'taiga' || pt === 'permafrost') {
      cal.temp = (season === 1 && rT > 0.7) ? 1 : 0;
    } else if (biome === 'desert' || biome === 'volcanic' || biome === 'ashland') {
      cal.temp = (season === 3 && rT > 0.75) ? 1 : 2;
    } else if (season === 3) {
      cal.temp = rT < 0.75 ? 0 : 1;
    } else if (season === 1) {
      cal.temp = rT < 0.70 ? 2 : 1;
    } else {
      cal.temp = rT < 0.12 ? 0 : (rT > 0.88 ? 2 : 1);
    }

    // 天气判定: 0晴朗, 1晴风, 2多云, 3多云有风, 4雨, 5暴风雨, 6雪, 7暴风雪
    const windyBias = pt === 'stormy' ? 0.30 : 0.0;
    const rW = Math.random();
    if (cal.temp === 0 && rW < 0.35 + windyBias * 0.5) {
      cal.weather = rW < 0.14 + windyBias * 0.4 ? 7 : 6;
    } else if (rW < 0.25 + windyBias) {
      cal.weather = rW < 0.10 + windyBias * 0.5 ? 5 : 4;
    } else if (rW < 0.55) {
      cal.weather = Math.random() < (0.35 + windyBias) ? 3 : 2;
    } else {
      cal.weather = Math.random() < (0.30 + windyBias) ? 1 : 0;
    }
  }

  /**
   * 推进历法周期（每 4 秒推进 1 个游戏日）
   * @param {object} ctx
   * @param {number} dt
   */
  function stepCalendar(ctx, dt) {
    const w = ctx.save.world;
    const cal = ensureCalendar(w);
    if (w.eraIndex < 1) return;

    cal.dayAccum += dt;
    const SEC_PER_DAY = 4.0;
    if (cal.dayAccum < SEC_PER_DAY) return;

    const daysPassed = Math.floor(cal.dayAccum / SEC_PER_DAY);
    cal.dayAccum -= daysPassed * SEC_PER_DAY;

    const prevSeason = cal.season;
    cal.day += daysPassed;
    while (cal.day > cal.orbit) {
      cal.day -= cal.orbit;
      cal.year += 1;
      if (w.govCooldown > 0) w.govCooldown = Math.max(0, w.govCooldown - 1);
    }

    const q = cal.orbit / 4;
    cal.season = Math.min(3, Math.floor((cal.day - 1) / q));
    cal.moon = Math.floor(((cal.day - 1) % 28) / 3.5) % 8;

    // 换季或每 3 天刷新一次天气
    if (cal.season !== prevSeason || (cal.day % 3 === 0)) {
      rollWeatherAndTemp(w, cal);
    }
  }

  /**
   * 计算环境、物种特质、宇宙、政体、ARPA、CRISPR、成就精通等全部动态修正乘数
   * @param {object} ctx
   * @returns {object}
   */
  function computeEnvironmentMods(ctx) {
    const dl = getDL();
    const save = ctx.save;
    const w = save.world;
    const cal = ensureCalendar(w);
    const eb = w.extraBlds || {};
    const arpa = w.arpa || {};
    const minor = w.minorTraits || {};

    const biome = dl.MAPS.biomes[w.biome] || dl.MAPS.biomes.grassland;
    const pt = dl.MAPS.planetTraits[w.planetTrait] || dl.MAPS.planetTraits.none;
    const seasonObj = dl.DATA.seasons[cal.season] || dl.DATA.seasons[0];
    const weatherObj = dl.DATA.weathers[cal.weather] || dl.DATA.weathers[0];
    const tempObj = dl.DATA.temps[cal.temp] || dl.DATA.temps[1];
    const moonObj = dl.DATA.moons[cal.moon] || dl.DATA.moons[0];
    const zodiac = dl.getZodiacSign();
    const traits = dl.getEffectiveTraits(w);
    const hasT = tid => traits.includes(tid);
    const hasC = cid => dl.hasCrispr(save, cid);

    const out = {
      foodMult: 1.0,
      lumberMult: 1.0,
      stoneMult: 1.0,
      mineMult: 1.0,
      knowledgeMult: 1.0,
      moneyMult: 1.0,
      industryMult: 1.0,
      powerMult: 1.0,
      popGrowthMult: 1.0,
      foodNeedMult: 1.0,
      buildCostMult: 1.0,
      techKnowCostMult: 1.0,
      arpaCostMult: 1.0,
      storageCapMult: 1.0,
      crateCapMult: 1.0,
      combatMult: 1.0,
      casualtyMult: 1.0,
      healMult: 1.0,
      tradeVolMult: 1.0,
      spyDiscountMult: 1.0,
      globalMult: 1.0,
      moraleBonus: 0,
      moraleCapBonus: 0,
      workStressDelta: 0,
      masteryPct: 0,
      zodiac,
      season: seasonObj,
      weather: weatherObj,
      temp: tempObj,
      moon: moonObj,
      biome,
      planetTrait: pt
    };

    // 1. 群系效果
    if (biome && biome.mods) {
      const m = biome.mods;
      if (m.food) out.foodMult *= m.food;
      if (m.lumber) out.lumberMult *= m.lumber;
      if (m.stone) out.stoneMult *= m.stone;
      if (m.mine) out.mineMult *= m.mine;
      if (m.knowledge) out.knowledgeMult *= m.knowledge;
      if (m.morale) out.moraleBonus += m.morale;
    }

    // 2. 星球特性
    if (pt && pt.mods) {
      const m = pt.mods;
      if (m.popGrowth) out.popGrowthMult *= m.popGrowth;
      if (m.morale) out.moraleBonus += m.morale;
      if (m.globalProd) out.globalMult *= m.globalProd;
      if (m.combat) out.combatMult *= m.combat;
      if (m.power) out.powerMult *= m.power;
      if (m.knowledge) out.knowledgeMult *= m.knowledge;
      if (m.lumber) out.lumberMult *= m.lumber;
      if (m.stone) out.stoneMult *= m.stone;
      if (m.mine) out.mineMult *= m.mine;
      if (m.industry) out.industryMult *= m.industry;
      if (m.buildCost) out.buildCostMult *= m.buildCost;
    }

    // 3. 宇宙法则
    const univ = w.universe || 'standard';
    if (univ === 'heavy') {
      out.mineMult *= 1.10;
      if (w.eraIndex >= 6) out.buildCostMult *= 1.15;
    } else if (univ === 'antimatter') {
      out.storageCapMult *= 1.20;
      out.powerMult *= 1.15;
      out.globalMult *= 0.92;
    } else if (univ === 'evil') {
      out.combatMult *= 1.35;
    } else if (univ === 'micro') {
      out.buildCostMult *= 0.80;
      out.techKnowCostMult *= 0.85;
    } else if (univ === 'magic') {
      out.knowledgeMult *= 1.15;
      out.globalMult *= 1.08;
    }

    // 4. 季节、天气、气温（水下生物免疫雨雪风负面影响）
    const isSubmerged = hasT('submerged');
    if (w.eraIndex >= 1) {
      out.foodMult *= seasonObj.foodMult * (isSubmerged && weatherObj.foodMult < 1 ? 1 : weatherObj.foodMult) * tempObj.foodMult;
      out.moraleBonus += seasonObj.morale + (isSubmerged && weatherObj.morale < 0 ? 0 : weatherObj.morale) + tempObj.morale;
    }

    // 5. 月相与星座（占星家特质使其收益 +50%）
    const astroMult = hasT('astrologer') ? 1.5 : 1.0;
    const applyAstroMod = (mods) => {
      if (!mods) return;
      if (mods.morale) out.moraleBonus += Math.round(mods.morale * astroMult);
      if (mods.food) out.foodMult *= 1 + (mods.food - 1) * astroMult;
      if (mods.mine) out.mineMult *= 1 + (mods.mine - 1) * astroMult;
      if (mods.knowledge) out.knowledgeMult *= 1 + (mods.knowledge - 1) * astroMult;
      if (mods.industry) out.industryMult *= 1 + (mods.industry - 1) * astroMult;
      if (mods.tax) out.moneyMult *= 1 + (mods.tax - 1) * astroMult;
      if (mods.global) out.globalMult *= 1 + (mods.global - 1) * astroMult;
      if (mods.trade) out.tradeVolMult *= 1 + (mods.trade - 1) * astroMult;
      if (mods.combat) out.combatMult *= 1 + (mods.combat - 1) * astroMult;
      if (mods.heal) out.healMult *= 1 + (mods.heal - 1) * astroMult;
      if (mods.power) out.powerMult *= 1 + (mods.power - 1) * astroMult;
      if (mods.popGrowth) out.popGrowthMult *= 1 + (mods.popGrowth - 1) * astroMult;
      if (mods.spyDiscount) out.spyDiscountMult *= mods.spyDiscount;
    };
    applyAstroMod(moonObj.mods);
    applyAstroMod(zodiac.mods);

    // 6. 物种与种群主修/负面特质
    if (hasT('adaptable')) out.knowledgeMult *= 1.05;
    if (hasT('wasteful')) out.buildCostMult *= 1.05;
    if (hasT('beast')) out.combatMult *= 1.15;
    if (hasT('cautious') && (cal.weather === 4 || cal.weather === 5)) out.combatMult *= 0.90;
    if (hasT('herbivore')) out.foodMult *= 1.15;
    if (hasT('instinct')) out.casualtyMult *= 0.85;
    if (hasT('small')) out.buildCostMult *= 0.92;
    if (hasT('weak')) { out.lumberMult *= 0.92; out.stoneMult *= 0.92; }
    if (hasT('large')) out.buildCostMult *= 1.08;
    if (hasT('strong')) { out.lumberMult *= 1.15; out.stoneMult *= 1.15; out.mineMult *= 1.15; }
    if (hasT('cold_blooded') && cal.temp === 0) out.globalMult *= 0.94;
    if (hasT('scales')) out.casualtyMult *= 0.80;
    if (hasT('flier')) out.buildCostMult *= 0.96;
    if (hasT('hollow_bones')) out.industryMult *= 1.10;
    if (hasT('sky_lover') && (cal.weather === 0 || cal.weather === 1)) out.moraleBonus += 5;
    if (hasT('fast_growth')) out.popGrowthMult *= 1.25;
    if (hasT('high_metabolism')) out.foodNeedMult *= 1.15;
    if (hasT('photosynth')) out.foodNeedMult *= (cal.weather <= 1 ? 0.65 : 0.75);
    if (hasT('sappy')) out.lumberMult *= 1.15;
    if (hasT('detritivore')) { out.foodNeedMult *= 0.80; out.mineMult *= 1.10; }
    if (hasT('spongy') && cal.weather >= 4) out.popGrowthMult *= 0.25;
    if (hasT('low_light')) out.foodMult *= 0.90;
    if (hasT('iron_allergy')) out.mineMult *= 0.90;
    if (hasT('smoldering') && cal.temp === 2) out.globalMult *= 1.12;
    if (hasT('cold_intolerance') && cal.temp === 0) out.globalMult *= 0.90;
    if (hasT('chilled') && cal.temp === 0) out.globalMult *= 1.12;
    if (hasT('heat_intolerance') && cal.temp === 2) out.globalMult *= 0.90;
    if (hasT('blissful')) out.moraleBonus += 15;
    if (hasT('creative')) { out.arpaCostMult *= 0.88; out.knowledgeMult *= 1.10; }
    if (hasT('studious')) { out.knowledgeMult *= 1.20; out.techKnowCostMult *= 0.96; }
    if (hasT('brute')) out.combatMult *= 1.25;
    if (hasT('curious')) out.knowledgeMult *= 1.12;
    if (hasT('pack_mentality')) out.combatMult *= (1 + Math.min(0.30, (eb.garrison || 0) * 0.04));
    if (hasT('tracker')) { out.foodMult *= 1.12; out.tradeVolMult *= 1.12; }
    if (hasT('sniper')) out.combatMult *= 1.20;
    if (hasT('rage')) out.combatMult *= 1.25;
    if (hasT('gnawer')) { out.lumberMult *= 1.10; out.stoneMult *= 1.10; }
    if (hasT('calm')) out.moraleBonus += 10;
    if (hasT('pack_rat')) out.crateCapMult *= 1.25;
    if (hasT('merchant')) { out.tradeVolMult *= 1.25; out.moneyMult *= 1.20; }
    if (hasT('smart')) { out.knowledgeMult *= 1.12; }
    if (hasT('puny')) out.combatMult *= 0.85;
    if (hasT('artisan')) { out.industryMult *= 1.25; out.buildCostMult *= 0.94; }
    if (hasT('dumb')) out.knowledgeMult *= 0.88;
    if (hasT('tough')) { out.mineMult *= 1.18; out.casualtyMult *= 0.80; }
    if (hasT('intelligent')) { out.knowledgeMult *= 1.15; out.globalMult *= 1.05; }
    if (hasT('regenerative')) out.healMult *= 2.0;
    if (hasT('gluttony')) out.foodNeedMult *= 1.20;
    if (hasT('optimistic')) out.moraleBonus += 8;
    if (hasT('chameleon')) out.spyDiscountMult *= 0.75;
    if (hasT('slow')) out.popGrowthMult *= 0.90;
    if (hasT('armored')) out.casualtyMult *= 0.50;
    if (hasT('slow_digestion')) out.foodNeedMult *= 0.75;
    if (hasT('resourceful')) out.storageCapMult *= 1.12;
    if (hasT('selenophobia') && cal.moon === 4) out.moraleBonus -= 4;
    if (hasT('hoarder')) out.crateCapMult *= 1.20;
    if (hasT('kindling_kindred')) out.lumberMult *= 1.35;
    if (hasT('hyper')) out.globalMult *= 1.08;
    if (hasT('skittish')) out.combatMult *= 0.90;
    if (hasT('toxic')) out.globalMult *= 1.06;
    if (hasT('nyctophilia')) out.mineMult *= 1.25;
    if (hasT('cannibalize')) out.combatMult *= 1.18;
    if (hasT('malnutrition')) out.foodMult *= 0.88;
    if (hasT('tunneler')) out.mineMult *= 1.25;
    if (hasT('apex_predator')) out.combatMult *= 1.30;
    if (hasT('suction_grip')) { out.industryMult *= 1.15; out.knowledgeMult *= 1.10; }
    if (hasT('snowy') && (cal.temp === 0 || cal.weather >= 6)) out.globalMult *= 1.15;
    if (hasT('fiery')) out.industryMult *= 1.22;
    if (hasT('terrifying')) out.combatMult *= 1.35;
    if (hasT('unified')) out.globalMult *= 1.12;

    // 7. 次要基因特质 (Minor Traits)
    out.combatMult *= 1 + (minor.tactical || 0) * 0.05;
    out.knowledgeMult *= 1 + (minor.analytical || 0) * 0.04;
    out.popGrowthMult *= 1 + (minor.promiscuous || 0) * 0.05;
    out.mineMult *= 1 + (minor.resilient || 0) * 0.04 + (minor.industrious || 0) * 0.04;
    out.foodMult *= 1 + (minor.cunning || 0) * 0.04;
    out.stoneMult *= 1 + (minor.hardy || 0) * 0.04;
    out.industryMult *= 1 + (minor.ambidextrous || 0) * 0.04 + (minor.metallurgist || 0) * 0.04;
    out.moraleBonus += (minor.content || 0) * 1;
    out.healMult *= 1 + (minor.fibroblast || 0) * 0.10;
    out.moneyMult *= 1 + (minor.gambler || 0) * 0.05;
    out.tradeVolMult *= 1 + (minor.persuasive || 0) * 0.04;
    out.storageCapMult *= 1 + (minor.fortify || 0) * 0.03;

    // 8. 政体深入效果 (补全 10 种 Evolve 政体)
    const gov = w.gov || 'anarchy';
    if (gov === 'anarchy' && w.pop > 25) out.globalMult *= 0.90;
    if (gov === 'autocracy') { out.combatMult *= 1.35; out.workStressDelta -= 5; }
    if (gov === 'democracy') { out.combatMult *= 0.95; }
    if (gov === 'theocracy') { out.knowledgeMult *= 0.85; out.globalMult *= 1.08; }
    if (gov === 'republic') { out.moraleBonus += 12; }
    if (gov === 'corpocracy') { out.moraleBonus -= 8; out.industryMult *= 1.25; }
    if (gov === 'technocracy') { out.techKnowCostMult *= 0.92; out.buildCostMult *= 1.03; }

    // 9. 总督加成 (若任命)
    const govn = w.governor && w.governor.appointed ? dl.MAPS.governorBackgrounds[w.governor.appointed] : null;
    if (govn && govn.mods) {
      const gmMult = hasC('civil_service') ? 1.5 : 1.0;
      const gm = govn.mods;
      if (gm.combat) out.combatMult *= 1 + (gm.combat - 1) * gmMult;
      if (gm.casualty) out.casualtyMult *= gm.casualty;
      if (gm.money) out.moneyMult *= 1 + (gm.money - 1) * gmMult;
      if (gm.spyCost) out.spyDiscountMult *= gm.spyCost;
      if (gm.tradeVol) out.tradeVolMult *= 1 + (gm.tradeVol - 1) * gmMult;
      if (gm.knowledge) out.knowledgeMult *= 1 + (gm.knowledge - 1) * gmMult;
      if (gm.morale) out.moraleBonus += Math.round(gm.morale * gmMult);
      if (gm.moraleCap) out.moraleCapBonus += Math.round(gm.moraleCap * gmMult);
      if (gm.industry) out.industryMult *= 1 + (gm.industry - 1) * gmMult;
      if (gm.mine) out.mineMult *= 1 + (gm.mine - 1) * gmMult;
      if (gm.heal) out.healMult *= 1 + (gm.heal - 1) * gmMult;
      if (gm.buildCost) out.buildCostMult *= gm.buildCost;
    }

    // 10. 寺庙、牧师、ARPA 工程、CRISPR 基因池、世界统一、成就精通
    const templeCnt = eb.temple || 0;
    const priestCnt = (w.jobs && w.jobs.priest) || 0;
    if (templeCnt > 0) {
      let templeMult = 0.03 * (1 + priestCnt * 0.15);
      if (gov === 'theocracy') templeMult *= 1.5;
      if (hasT('holy')) templeMult *= 2.0;
      if (hasT('spiritual')) templeMult *= 1.5;
      if (hasC('ancients')) templeMult *= 2.0;
      out.globalMult *= 1 + templeCnt * templeMult;
    }

    const monRank = (arpa.monument && arpa.monument.rank) || 0;
    if (monRank > 0) {
      out.moraleCapBonus += monRank * 4;
      out.moraleBonus += monRank * 2;
    }
    const lhcRank = (arpa.lhc && arpa.lhc.rank) || 0;
    if (lhcRank > 0) out.knowledgeMult *= 1 + lhcRank * 0.04;
    const railRank = (arpa.railway && arpa.railway.rank) || 0;
    if (railRank > 0) out.tradeVolMult *= 1 + railRank * 0.06;
    const launchRank = (arpa.launch_facility && arpa.launch_facility.rank) || 0;
    if (launchRank > 0 && w.eraIndex >= 6) out.industryMult *= 1 + launchRank * 0.25;

    // CRISPR 基因池增益
    if (hasC('recombination')) { out.globalMult *= 1.06; out.foodMult *= 1.12; }
    if (hasC('artificer')) out.industryMult *= 1.25;
    if (hasC('detail_oriented')) out.industryMult *= 1.25;
    if (hasC('rigorous')) out.industryMult *= 1.25;
    if (hasC('hardened_genes')) out.storageCapMult *= 1.10;

    // 医疗设施医院人口增长加成
    if ((eb.hospital || 0) > 0) {
      out.popGrowthMult *= 1 + eb.hospital * 0.12;
      out.healMult *= 1 + eb.hospital * 0.25;
    }

    // 外交世界统一增益
    if (w.foreign) {
      let unifiedCnt = 0;
      for (const k of ['gov0', 'gov1', 'gov2']) {
        const g = w.foreign[k];
        if (g && (g.occ || g.anx || g.buy)) unifiedCnt++;
      }
      if (unifiedCnt > 0) {
        const perGov = gov === 'federation' ? 0.15 : 0.08;
        out.globalMult *= 1 + unifiedCnt * perGov;
      }
    }

    // 成就精通 (unlocked CRISPR 启用)
    const achStore = (save.prestige && save.prestige.achievements) || {};
    let totalMastery = 0;
    for (const ach of (dl.DATA.achievements || [])) {
      if (achStore[ach.id]) totalMastery += (ach.mastery || 1);
    }
    const masteryBonusPerLv = (minor.mastery || 0) * 0.5;
    out.masteryPct = totalMastery + (totalMastery > 0 ? masteryBonusPerLv : 0);
    if (hasC('unlocked') && out.masteryPct > 0) {
      out.globalMult *= 1 + out.masteryPct * 0.01;
    }

    // 临时事件士气衰减
    if (typeof w.tempMoraleOffset === 'number' && w.tempMoraleOffset !== 0) {
      out.moraleBonus += Math.round(w.tempMoraleOffset);
    }

    return out;
  }

  /**
   * 计算完整精细士气分解与抗税暴动检查
   */
  function computeMoraleAndCheckRevolt(ctx, foodNeed, rates, popCap, dt) {
    const dl = getDL();
    const w = ctx.save.world;
    const eb = w.extraBlds || {};
    const env = (ctx.envMods && ctx.envMods.zodiac) ? ctx.envMods : computeEnvironmentMods(ctx);

    const assigned = Object.values(w.jobs || {}).reduce((a, c) => a + c, 0);
    const totalPop = Math.floor(w.pop || 0);
    const idlePop = Math.max(0, totalPop - assigned);

    const foodSat = foodNeed <= 0 ? 1 : Math.min(1, ((w.res.food || 0) + Math.max(0, rates.food || 0)) / Math.max(0.1, foodNeed));
    const houseSat = popCap <= 0 ? 0 : Math.min(1, popCap / Math.max(1, totalPop));

    const baseScore = Math.round((foodSat * 0.70 + houseSat * 0.30) * 100);
    // 失业惩罚 & 工作压力
    const unemployedPen = Math.min(15, Math.floor(idlePop * 0.6));
    const stressFactor = (w.gov === 'anarchy' ? 0.5 : (w.gov === 'autocracy' || w.gov === 'socialist' ? 1.2 : 1.0));
    const stressPen = Math.min(20, Math.floor(assigned * 0.15 * stressFactor));

    // 税率修正（0%=+12, 10%=+6, 20%=0, 30%=-10, 40%=-22, 50%=-36；寡头减半高税惩罚）
    let taxMod = 0;
    if (w.taxRate <= 0) taxMod = 12;
    else if (w.taxRate <= 10) taxMod = 6;
    else if (w.taxRate <= 20) taxMod = 0;
    else if (w.taxRate <= 30) taxMod = -10;
    else if (w.taxRate <= 40) taxMod = -22;
    else taxMod = -36;
    if (w.gov === 'oligarchy' && taxMod < 0) taxMod = Math.round(taxMod * 0.55);

    // 艺人 & 文娱建筑
    const entertainerCnt = (w.jobs && w.jobs.entertainer) || 0;
    const entertainerMult = (w.gov === 'democracy' ? 1.25 : 1.0) * (dl.hasTrait(w, 'playful') ? 1.3 : 1.0) * (env.zodiac.id === 'sagittarius' ? 1.15 : 1.0);
    const entMod = Math.round(entertainerCnt * 3 * entertainerMult);
    const bldMod = (eb.amphitheatre || 0) * 4 + (eb.cottage || 0) * 1;
    let govMod = 0;
    if (w.gov === 'autocracy') govMod = -8;
    else if (w.gov === 'democracy') govMod = 12;
    else if (w.gov === 'socialist') govMod = 5;
    else if (w.gov === 'federation') govMod = 15;

    const maxCap = 125 + (env.moraleCapBonus || 0) + (eb.amphitheatre || 0) * 2;
    let raw = baseScore - unemployedPen - stressPen + taxMod + entMod + bldMod + govMod + (env.moraleBonus || 0);
    if (w.species === 'ent' || dl.hasTrait(w, 'optimistic')) raw = Math.max(75, raw);

    const finalMorale = Math.max(20, Math.min(maxCap, Math.round(raw)));
    w.happiness = finalMorale;

    // 士气详细构成存储到 metrics 供 UI 弹窗/百科显示
    ctx.metrics.moraleBreakdown = {
      base: baseScore,
      unemployed: -unemployedPen,
      stress: -stressPen,
      tax: taxMod,
      entertainers: entMod,
      buildings: bldMod,
      government: govMod,
      envAndTraits: env.moraleBonus || 0,
      cap: maxCap,
      final: finalMorale
    };

    // 抗税暴动判定 (参考 main.js Qd())
    if (w.eraIndex >= 2 && !dl.hasTrait(w, 'blissful')) {
      const revoltThresh = (w.gov === 'oligarchy' ? 45 : 25) + (w.universe === 'evil' ? 10 : 0);
      if (w.taxRate > revoltThresh && finalMorale < 90) {
        w.revoltCooldown = Math.max(0, (w.revoltCooldown || 0) - dt);
        if (w.revoltCooldown <= 0 && Math.random() < 0.008 * dt) {
          w.revoltCooldown = 120;
          const lossPct = Math.min(0.25, (w.taxRate - revoltThresh) * 0.006);
          for (const key of ['food', 'lumber', 'stone', 'money']) {
            if ((w.res[key] || 0) > 20) {
              w.res[key] = Math.max(0, w.res[key] * (1 - lossPct));
            }
          }
          if (ctx.addLog) {
            ctx.addLog('events', `⚠️ 税率过高 (${w.taxRate}%) 且士气低迷 (${finalMorale}%)，城内爆发抗税暴动！损失约 ${Math.round(lossPct * 100)}% 库存物资。`, 'rose');
          }
          if (ctx.showToast) {
            ctx.showToast('⚠️ 爆发抗税暴动！请适度降低税率或安抚士气！');
          }
        }
      }
    }

    // 临时事件士气缓慢回落
    if (typeof w.tempMoraleOffset === 'number' && w.tempMoraleOffset !== 0) {
      const sign = w.tempMoraleOffset > 0 ? -1 : 1;
      w.tempMoraleOffset += sign * Math.min(Math.abs(w.tempMoraleOffset), 0.1 * dt);
    }

    return finalMorale;
  }

  const api = {
    ensureCalendar,
    stepCalendar,
    computeEnvironmentMods,
    computeMoraleAndCheckRevolt
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.EvolveModules = root.EvolveModules || {};
    root.EvolveModules.CalendarWeather = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
