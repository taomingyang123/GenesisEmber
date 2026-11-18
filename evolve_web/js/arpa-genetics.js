(function (root) {
  'use strict';

  /**
   * ARPA 超级工程、基因组测序实验室、次要特质、CRISPR 基因池与总督自动化系统
   * 对应 Evolve main.js 中的 wt (ARPA), bi/sequence (Gene Lab), nl (CRISPR), governor (总督)
   */

  function getDL() {
    if (root && root.EvolveModules && root.EvolveModules.DataLoader) {
      return root.EvolveModules.DataLoader;
    }
    return require('./data-loader.js');
  }

  function ensureArpaGeneticsFields(save) {
    const w = save.world;
    const p = save.prestige;

    if (!w.arpa || typeof w.arpa !== 'object') w.arpa = {};
    const dl = getDL();
    for (const proj of (dl.DATA.arpaProjects || [])) {
      if (!w.arpa[proj.id]) {
        w.arpa[proj.id] = { rank: 0, progress: 0, variantIdx: 0 };
      }
    }

    if (!w.geneLab || typeof w.geneLab !== 'object') {
      w.geneLab = {
        genes: 0,
        totalGenes: 0,
        seqActive: false,
        seqBoost: false,
        seqProgress: 0,
        seqMax: 100
      };
    }
    if (typeof w.geneLab.genes !== 'number') w.geneLab.genes = 0;
    if (typeof w.geneLab.totalGenes !== 'number') w.geneLab.totalGenes = 0;
    if (typeof w.geneLab.seqProgress !== 'number') w.geneLab.seqProgress = 0;
    if (typeof w.geneLab.seqMax !== 'number' || w.geneLab.seqMax < 40) w.geneLab.seqMax = 100;

    if (!w.minorTraits || typeof w.minorTraits !== 'object') w.minorTraits = {};
    if (!w.removedTraits || typeof w.removedTraits !== 'object') w.removedTraits = {};

    if (!w.governor || typeof w.governor !== 'object') {
      w.governor = {
        appointed: null,
        candidates: ['soldier', 'entrepreneur', 'educator'],
        tasks: { autoJobs: true, autoTax: true, autoStorage: false, autoMerc: false, autoSpy: false, autoInfra: false },
        tickAccum: 0
      };
    }
    if (!Array.isArray(w.governor.candidates) || w.governor.candidates.length === 0) {
      w.governor.candidates = ['soldier', 'entrepreneur', 'educator'];
    }
    if (!w.governor.tasks) w.governor.tasks = {};

    if (!p.crispr || typeof p.crispr !== 'object') p.crispr = {};
    if (!p.achievements || typeof p.achievements !== 'object') p.achievements = {};
    if (!p.nextPreset || typeof p.nextPreset !== 'object') {
      p.nextPreset = { biome: 'grassland', planetTrait: 'none', universe: 'standard', species: 'human' };
    }
  }

  /**
   * 计算某 ARPA 工程当前下一等级的 100% 完整成本
   */
  function getArpaTotalCost(ctx, projDef) {
    const w = ctx.save.world;
    ensureArpaGeneticsFields(ctx.save);
    const rank = (w.arpa[projDef.id] && w.arpa[projDef.id].rank) || 0;
    const costMult = (ctx.envMods && ctx.envMods.arpaCostMult) || 1.0;
    const scale = Math.pow(projDef.growth || 1.08, rank) * costMult;
    const out = {};
    for (const [rId, baseVal] of Object.entries(projDef.baseCost || {})) {
      out[rId] = Math.max(1, Math.round(baseVal * scale));
    }
    return out;
  }

  /**
   * 分段投入百分比进度 (1% / 10% / 25% / 100%)
   */
  function investArpaProject(ctx, projId, pctStep) {
    const dl = getDL();
    const w = ctx.save.world;
    ensureArpaGeneticsFields(ctx.save);
    const projDef = dl.MAPS.arpaProjects[projId];
    if (!projDef) return { ok: false, msg: '未找到工程定义' };
    if (projDef.reqTech && !w.techs[projDef.reqTech]) return { ok: false, msg: '前置科技尚未研究！' };

    const st = w.arpa[projId];
    if (projDef.maxRank && st.rank >= projDef.maxRank) {
      return { ok: false, msg: '该工程已达到最高建造等级！' };
    }

    const totalCost = getArpaTotalCost(ctx, projDef);
    const remainPct = Math.max(0, 100 - (st.progress || 0));
    const stepPct = Math.min(remainPct, Math.max(1, pctStep || 10));
    if (stepPct <= 0) return { ok: false, msg: '当前进度已满' };

    const stepCost = {};
    for (const [rId, fullVal] of Object.entries(totalCost)) {
      const need = Math.max(1, Math.ceil(fullVal * (stepPct / 100)));
      if ((w.res[rId] || 0) < need) {
        return { ok: false, msg: `资源不足（需 ${ctx.getResName(rId)} ${need}）！` };
      }
      stepCost[rId] = need;
    }

    for (const [rId, need] of Object.entries(stepCost)) {
      w.res[rId] = Math.max(0, w.res[rId] - need);
    }

    st.progress = Math.min(100, (st.progress || 0) + stepPct);
    if (st.progress >= 100) {
      st.rank += 1;
      st.progress = 0;
      if (Array.isArray(projDef.variants) && projDef.variants.length > 0) {
        st.variantIdx = (st.variantIdx + 1) % projDef.variants.length;
      }
      const msg = `🏗️ 超级工程【${projDef.name} Lv.${st.rank}】竣工！`;
      if (ctx.addLog) ctx.addLog('progress', msg, 'emerald');
      return { ok: true, completed: true, msg };
    }
    return { ok: true, completed: false, msg: `🏗️ 已向【${projDef.name}】投入 +${stepPct}% 工程量` };
  }

  /**
   * 基因组测序推进
   */
  function isGeneLabUnlocked(save) {
    const w = save.world;
    return w.eraIndex >= 4 || (w.extraBlds && (w.extraBlds.biolab || 0) > 0) || !!w.techs.electronics;
  }

  function stepGeneLab(ctx, dt) {
    const dl = getDL();
    const save = ctx.save;
    const w = save.world;
    ensureArpaGeneticsFields(save);
    if (!isGeneLabUnlocked(save)) return;

    const gl = w.geneLab;
    if (!gl.seqActive) return;

    const env = ctx.envMods || {};
    const pt = dl.MAPS.planetTraits[w.planetTrait];
    const ptGene = (pt && pt.mods && pt.mods.geneSpeed) || 1.0;
    const labBonus = 1 + (w.extraBlds.biolab || 0) * 0.35;
    const adaptBonus = dl.hasTrait(w, 'adaptable') ? 1.15 : 1.0;
    const crisprSpeed = (dl.hasCrispr(save, 'morphogenesis') ? 1.35 : 1.0);
    const boostMult = gl.seqBoost ? 2.0 : 1.0;

    // 测序消耗少许知识维持
    const knowNeed = (gl.seqBoost ? 4.0 : 1.5) * dt;
    if ((w.res.knowledge || 0) < knowNeed) return;
    w.res.knowledge -= knowNeed;

    const speed = 3.5 * labBonus * adaptBonus * ptGene * crisprSpeed * boostMult;
    gl.seqProgress += speed * dt;
    if (gl.seqProgress >= gl.seqMax) {
      gl.seqProgress -= gl.seqMax;
      const gain = dl.hasCrispr(save, 'synthesis') ? 2 : 1;
      gl.genes += gain;
      gl.totalGenes += gain;
      gl.seqMax = Math.min(400, Math.round(gl.seqMax * 1.15));
      if (ctx.addLog) ctx.addLog('progress', `🧬 基因组序列破译完成！获得基因点数 +${gain}。`, 'purple');
      if (ctx.showToast) ctx.showToast(`🧬 测序完成：基因点数 +${gain}`);
    }
  }

  /**
   * 消费基因点升级次要特质
   */
  function buyMinorTrait(ctx, traitId) {
    const dl = getDL();
    const save = ctx.save;
    const w = save.world;
    ensureArpaGeneticsFields(save);
    const def = dl.MAPS.minorTraits[traitId];
    if (!def) return { ok: false, msg: '无效特质' };
    if (def.reqCrispr && !dl.hasCrispr(save, def.reqCrispr)) {
      return { ok: false, msg: '需先在 CRISPR 基因池解锁前置基因！' };
    }
    const curLv = w.minorTraits[traitId] || 0;
    const cost = Math.max(1, curLv + 1);
    if (w.geneLab.genes < cost) return { ok: false, msg: `需要 ${cost} 枚基因点数！` };
    w.geneLab.genes -= cost;
    w.minorTraits[traitId] = curLv + 1;
    return { ok: true, msg: `🧬 【${def.name}】提升至 Lv.${curLv + 1}` };
  }

  /**
   * 使用基因点移除物种先天负面特质 (需 CRISPR 'mutation')
   */
  function removeNegativeTrait(ctx, traitId) {
    const dl = getDL();
    const save = ctx.save;
    const w = save.world;
    ensureArpaGeneticsFields(save);
    if (!dl.hasCrispr(save, 'mutation')) {
      return { ok: false, msg: '需在 CRISPR 基因池解锁【突变】方可剔除负面基因！' };
    }
    const tr = dl.DATA.traits[traitId];
    if (!tr || tr.positive) return { ok: false, msg: '仅支持剔除负面先天特质！' };
    if (w.removedTraits[traitId]) return { ok: false, msg: '该负面特质已被移除！' };
    const cost = 3;
    if (w.geneLab.genes < cost) return { ok: false, msg: `剔除负面基因需要 ${cost} 枚基因点数！` };
    w.geneLab.genes -= cost;
    w.removedTraits[traitId] = true;
    const msg = `✂️ 基因编辑成功！永久移除负面特质【${tr.name}】！`;
    if (ctx.addLog) ctx.addLog('progress', msg, 'emerald');
    return { ok: true, msg };
  }

  /**
   * 购买 CRISPR 基因池升级（消耗质粒/创世余烬）
   */
  function buyCrisprUpgrade(ctx, crisprId) {
    const dl = getDL();
    const save = ctx.save;
    ensureArpaGeneticsFields(save);
    const upg = dl.MAPS.crisprUpgrades[crisprId];
    if (!upg) return { ok: false, msg: '未知 CRISPR 节点' };
    if (save.prestige.crispr[crisprId]) return { ok: false, msg: '已激活此基因升级！' };
    if ((upg.req || []).some(r => !save.prestige.crispr[r])) {
      return { ok: false, msg: '尚未满足前置 CRISPR 解锁要求！' };
    }
    if ((save.prestige.genesisShards || 0) < upg.cost) {
      return { ok: false, msg: `质粒/创世余烬不足（需要 ${upg.cost} 枚）！` };
    }
    save.prestige.genesisShards -= upg.cost;
    save.prestige.crispr[crisprId] = true;

    // ancients 立刻馈赠 1 座寺庙
    if (crisprId === 'ancients' && save.world.eraIndex >= 1) {
      save.world.extraBlds.temple = (save.world.extraBlds.temple || 0) + 1;
    }

    const msg = `🧬 CRISPR 激活成功：【${upg.name}】！`;
    if (ctx.addLog) ctx.addLog('progress', msg, 'purple');
    return { ok: true, msg };
  }

  /**
   * 总督候选刷新与自动化治理任务调度
   */
  function isGovernorUnlocked(save) {
    const dl = getDL();
    return dl.hasCrispr(save, 'governance') || !!save.world.techs.currency;
  }

  function rerollGovernorCandidates(ctx) {
    const dl = getDL();
    const w = ctx.save.world;
    ensureArpaGeneticsFields(ctx.save);
    const all = (dl.DATA.governorBackgrounds || []).map(g => g.id);
    const picked = [];
    const pool = [...all];
    while (picked.length < 3 && pool.length > 0) {
      const idx = Math.floor(Math.random() * pool.length);
      picked.push(pool.splice(idx, 1)[0]);
    }
    w.governor.candidates = picked;
  }

  function appointGovernor(ctx, bgId) {
    const dl = getDL();
    const w = ctx.save.world;
    ensureArpaGeneticsFields(ctx.save);
    if (bgId === null) {
      w.governor.appointed = null;
      return { ok: true, msg: '已解任当前总督。' };
    }
    const bg = dl.MAPS.governorBackgrounds[bgId];
    if (!bg) return { ok: false, msg: '未知总督背景' };
    w.governor.appointed = bgId;
    const msg = `👔 已任命【${bg.name} · ${bg.title}】为文明总督！`;
    if (ctx.addLog) ctx.addLog('progress', msg, 'sky');
    return { ok: true, msg };
  }

  function toggleGovernorTask(ctx, taskId) {
    const dl = getDL();
    const save = ctx.save;
    const w = save.world;
    ensureArpaGeneticsFields(save);
    const tasks = w.governor.tasks;
    if (tasks[taskId]) {
      tasks[taskId] = false;
      return { ok: true };
    }
    const maxSlots = dl.hasCrispr(save, 'civil_service') ? 6 : 3;
    const activeCnt = Object.values(tasks).filter(Boolean).length;
    if (activeCnt >= maxSlots) {
      return { ok: false, msg: `当前最多同时开启 ${maxSlots} 项总督自动任务（解锁 CRISPR【能臣干吏】可扩展至 6 项）！` };
    }
    tasks[taskId] = true;
    return { ok: true };
  }

  /**
   * 总督每 2 秒执行一次自动治理
   */
  function stepGovernor(ctx, dt) {
    const w = ctx.save.world;
    ensureArpaGeneticsFields(ctx.save);
    if (!w.governor.appointed || w.eraIndex < 1) return;

    w.governor.tickAccum = (w.governor.tickAccum || 0) + dt;
    if (w.governor.tickAccum < 2.0) return;
    w.governor.tickAccum = 0;

    const tasks = w.governor.tasks || {};

    // 1. 智能分派空闲市民
    if (tasks.autoJobs) {
      const assigned = Object.values(w.jobs || {}).reduce((a, c) => a + c, 0);
      let idle = Math.floor(w.pop || 0) - assigned;
      if (idle > 0) {
        const foodRate = (ctx.metrics.netRates && ctx.metrics.netRates.food) || 0;
        if (foodRate < 1.5) {
          w.jobs.farmer = (w.jobs.farmer || 0) + 1;
          idle--;
        }
        if (idle > 0) {
          const priority = ['scholar', 'miner', 'lumberjack', 'quarryWorker', 'farmer'];
          for (const jId of priority) {
            if (ctx.isJobUnlocked && ctx.isJobUnlocked(jId)) {
              w.jobs[jId] = (w.jobs[jId] || 0) + idle;
              idle = 0;
              break;
            }
          }
        }
      }
    }

    // 2. 动态平衡税率（士气高时可微增至 20~30%，士气低自动降至 10%）
    if (tasks.autoTax && w.techs.currency) {
      if (w.happiness < 85 && w.taxRate > 10) w.taxRate = 10;
      else if (w.happiness >= 115 && w.taxRate < 30 && w.gov === 'oligarchy') w.taxRate = 30;
      else if (w.happiness >= 100 && w.taxRate < 20) w.taxRate = 20;
    }

    // 3. 自动构建与分配箱柜
    if (tasks.autoStorage && ctx.economyMod && w.eraIndex >= 2) {
      const st = ctx.economyMod.getStorageStats(ctx);
      if (st.freeCrates === 0 && st.cratesOwned < st.crateCap) {
        ctx.economyMod.constructStorageUnit(ctx, 'crate', 1);
      }
      const nextSt = ctx.economyMod.getStorageStats(ctx);
      if (nextSt.freeCrates > 0) {
        let bestRes = null;
        let bestRatio = 0.85;
        for (const rId of Object.keys(w.unlockedRes || {})) {
          if (!w.unlockedRes[rId] || rId === 'rna' || rId === 'dna' || rId === 'knowledge' || rId === 'money') continue;
          const cap = ctx.metrics.caps[rId] || 100;
          const ratio = (w.res[rId] || 0) / cap;
          if (ratio >= bestRatio) {
            bestRatio = ratio;
            bestRes = rId;
          }
        }
        if (bestRes) ctx.economyMod.assignStorageUnit(ctx, 'crate', bestRes, 1);
      }
    }

    // 4. 自动雇佣补充士兵
    if (tasks.autoMerc && ctx.diploMod && w.techs.currency) {
      const maxS = ctx.diploMod.getMaxSoldiers(ctx);
      const cost = ctx.diploMod.getMercCost(ctx);
      if (w.garrison.soldiers < maxS && (w.res.money || 0) > cost * 3) {
        ctx.diploMod.hireMercenary(ctx);
      }
    }

    // 5. 自动间谍培训
    if (tasks.autoSpy && ctx.diploMod && w.techs.currency) {
      for (let i = 0; i < 3; i++) {
        const g = w.foreign[`gov${i}`];
        if (g && !g.occ && !g.anx && !g.buy && g.spy < 2 && g.spyTrain === 0) {
          const cost = ctx.diploMod.getSpyTrainCost(ctx, i);
          if ((w.res.money || 0) > cost * 2.5) {
            ctx.diploMod.trainSpy(ctx, i);
            break;
          }
        }
      }
    }

    // 6. 自动辅助扩建简陋居所/农田
    if (tasks.autoInfra && ctx.tryBuyBuildingSingle) {
      if (ctx.metrics.popCap - Math.floor(w.pop) <= 1) {
        ctx.tryBuyBuildingSingle('primitiveHut', false);
      } else if ((ctx.metrics.netRates.food || 0) < 0 && w.techs.agriculture) {
        ctx.tryBuyBuildingSingle('farmland', false);
      }
    }
  }

  const api = {
    ensureArpaGeneticsFields,
    getArpaTotalCost,
    investArpaProject,
    isGeneLabUnlocked,
    stepGeneLab,
    buyMinorTrait,
    removeNegativeTrait,
    buyCrisprUpgrade,
    isGovernorUnlocked,
    rerollGovernorCandidates,
    appointGovernor,
    toggleGovernorTask,
    stepGovernor
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.EvolveModules = root.EvolveModules || {};
    root.EvolveModules.ArpaGenetics = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
