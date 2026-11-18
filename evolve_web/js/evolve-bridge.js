(function (root) {
  'use strict';

  /**
   * Evolve 核心桥接引擎
   * 负责将历法气象、仓储贸易、电力队列、外交军事、ARPA工程、基因测序、CRISPR、随机事件与成就
   * 深度接入 rna.html 主循环与存档体系，同时兼容浏览器与 Node 测试环境。
   */

  function getMod(name, reqPath) {
    if (root && root.EvolveModules && root.EvolveModules[name]) {
      return root.EvolveModules[name];
    }
    if (typeof require === 'function') {
      return require(reqPath);
    }
    return null;
  }

  const dl = getMod('DataLoader', './data-loader.js');
  const calMod = getMod('CalendarWeather', './calendar-weather.js');
  const ecoMod = getMod('EconomyStorage', './economy-storage.js');
  const diploMod = getMod('DiplomacyMilitary', './diplomacy-military.js');
  const arpaMod = getMod('ArpaGenetics', './arpa-genetics.js');
  const evMod = getMod('EventsAchieves', './events-achieves.js');

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
      tryBuyBuildingSingle: host.tryBuyBuildingSingle,
      tryBuyTechnology: host.tryBuyTechnology,
      addLog: (cat, text, tone) => evMod.addLog(ctx, cat, text, tone)
    };
    return ctx;
  }

  /**
   * 初始化/补齐全部 Evolve 扩展存档字段（向后兼容旧版 rna.html 存档）
   */
  function ensureAllFields(save) {
    if (!save || !save.world) return;
    const w = save.world;
    const p = save.prestige || (save.prestige = {});
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

  /**
   * 应用扩展资源容量与住房容量加成（在基础容量计算之后调用）
   */
  function applyExtendedCapacities(host, caps, popCap) {
    const ctx = createContext(host);
    const save = ctx.save;
    const w = save.world;
    const b = w.buildings || {};
    const eb = w.extraBlds || {};
    const arpa = w.arpa || {};
    const env = calMod.computeEnvironmentMods(ctx);
    host.setEnvMods(env);

    // 1. 扩展建筑容量
    const shedCnt = eb.shed || 0;
    if (shedCnt > 0) {
      caps.food = (caps.food || 500) + shedCnt * 300;
      caps.lumber = (caps.lumber || 300) + shedCnt * 200;
      caps.stone = (caps.stone || 200) + shedCnt * 200;
    }
    if ((eb.casino || 0) > 0) {
      caps.money = (caps.money || 1000) + eb.casino * 5000;
    }

    // 2. ARPA 工程容量乘数 (超级对撞机提升知识上限，证券交易所提升银行金币上限)
    const lhcRank = (arpa.lhc && arpa.lhc.rank) || 0;
    if (lhcRank > 0) {
      caps.knowledge = Math.round((caps.knowledge || 250) * (1 + lhcRank * 0.15));
    }
    const stockRank = (arpa.stock_exchange && arpa.stock_exchange.rank) || 0;
    if (stockRank > 0) {
      caps.money = Math.round((caps.money || 1000) * (1 + stockRank * 0.15));
    }

    // 3. 板条箱与集装箱分配扩容
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

    // 4. 环境/宇宙/基因特质全局仓储倍率 (除 RNA/DNA)
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

    // 5. 住房调整 (high_pop +20%, solitary -8%)
    let nextPopCap = popCap;
    if (dl.hasTrait(w, 'high_pop')) nextPopCap = Math.round(nextPopCap * 1.20);
    if (dl.hasTrait(w, 'solitary') && nextPopCap > 5) nextPopCap = Math.max(5, Math.round(nextPopCap * 0.92));

    // 6. 检查资源解锁 (例如提早通过集市/贸易/货场/赌场可见)
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

  /**
   * 扩展每 Tick 模拟逻辑（在核心建筑/职业计算之后、最终限幅提交之前调用）
   */
  function stepExtendedSimulation(host, dt, rates, contextInfo) {
    const ctx = createContext(host);
    const save = ctx.save;
    const w = save.world;
    const eb = w.extraBlds || {};
    const arpa = w.arpa || {};
    const env = ctx.envMods || calMod.computeEnvironmentMods(ctx);

    // 1. 历法推进
    calMod.stepCalendar(ctx, dt);

    // 2. 应用环境/特质/成就精通乘数到对应资源正产出上
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

    // 3. 扩展职业 (银行家、牧师) 与 扩展建筑 (赌场、游客中心)
    const happyMult = contextInfo.happyMult || 1.0;
    const shardMult = contextInfo.shardMult || 1.0;
    if (w.eraIndex >= 1) {
      const bankerCnt = (w.jobs && w.jobs.banker) || 0;
      if (bankerCnt > 0) {
        const repBoost = w.gov === 'republic' ? 1.25 : 1.0;
        rates.money += bankerCnt * 0.9 * repBoost * (env.moneyMult || 1) * happyMult * shardMult;
        // 银行家同步放大税收收入
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

      // 赌场与游客中心
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

    // 4. 自动贸易路线
    ecoMod.stepMarketAndTrade(ctx, dt, rates);

    // 5. 外交与军事（新兵训练、伤兵治愈、间谍倒计时、占领国朝贡）
    diploMod.stepDiplomacyAndMilitary(ctx, dt, rates);

    // 6. 精细士气更新与抗税暴动判定
    calMod.computeMoraleAndCheckRevolt(ctx, contextInfo.foodNeed || 0, rates, ctx.metrics.popCap || 0, dt);

    // 7. 基因组测序 & 总督自动化 & 建筑/研究队列
    arpaMod.stepGeneLab(ctx, dt);
    arpaMod.stepGovernor(ctx, dt);
    ecoMod.stepQueues(ctx);

    // 8. 随机事件与成就检查
    evMod.stepRandomEvents(ctx, dt);
    evMod.checkAchievements(ctx);
  }

  /**
   * 扩展建筑电力消耗计算（包含停用开关扣减）
   */
  function getExtraPowerReq(world) {
    const eco = ecoMod;
    return (
      eco.getActiveBuildingCount(world, 'hospital', true) * 2 +
      eco.getActiveBuildingCount(world, 'casino', true) * 3 +
      eco.getActiveBuildingCount(world, 'tourist_center', true) * 4
    );
  }

  /**
   * 应用转生前的星系预设 (物种、群系、行星特性、宇宙) 与 CRISPR 质粒增益
   */
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
    // ancestors CRISPR 开局即带 1 座寺庙
    if (dl.hasCrispr(save, 'ancients')) {
      w.extraBlds = w.extraBlds || {};
      w.extraBlds.temple = 1;
    }
    ensureAllFields(save);
  }

  /**
   * 64×64 像素舞台叠加气象与星空特效（雨滴、雪花、风沙、月相）
   */
  function renderSceneOverlay(offCtx, animTick, pxRect, world) {
    if (!world || world.eraIndex === 0) return;
    const cal = world.calendar || { weather: 0, moon: 0, season: 0 };

    // 1. 夜晚或高空月相指示点
    const moonColors = ['#334155', '#64748b', '#94a3b8', '#cbd5e1', '#fef08a', '#e2e8f0', '#94a3b8', '#475569'];
    pxRect(55, 4, 4, 4, moonColors[cal.moon % 8] || '#fef08a');

    // 2. 下雨 / 暴风雨动画
    if (cal.weather === 4 || cal.weather === 5) {
      const drops = cal.weather === 5 ? 14 : 8;
      for (let i = 0; i < drops; i++) {
        const rx = (i * 13 + animTick * 2) % 62 + 1;
        const ry = (i * 11 + animTick * 5) % 44;
        pxRect(rx, ry, 1, 3, 'rgba(56, 189, 248, 0.72)');
      }
    }

    // 3. 下雪 / 暴风雪动画
    if (cal.weather === 6 || cal.weather === 7) {
      const flakes = cal.weather === 7 ? 16 : 9;
      for (let i = 0; i < flakes; i++) {
        const sx = (i * 19 + Math.floor(Math.sin(animTick * 0.2 + i) * 3) + animTick) % 62 + 1;
        const sy = (i * 9 + animTick * 2) % 46;
        pxRect(sx, sy, 2, 2, 'rgba(248, 250, 252, 0.85)');
      }
    }

    // 4. 有风气流线
    if (cal.weather === 1 || cal.weather === 3 || cal.weather === 5 || cal.weather === 7) {
      const wy = 10 + (animTick % 3) * 6;
      const wx = (animTick * 6) % 52;
      pxRect(wx, wy, 8, 1, 'rgba(226, 232, 240, 0.35)');
    }
  }

  const api = {
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

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.EvolveModules = root.EvolveModules || {};
    root.EvolveModules.Bridge = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
