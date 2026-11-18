(function (root) {
  'use strict';

  /**
   * 分类消息日志、随机事件触发器与成就/精通引擎
   * 对应 Evolve main.js 中的 lastMsg, events/major_events, stats.achieve & mastery
   */

  function getDL() {
    if (root && root.EvolveModules && root.EvolveModules.DataLoader) {
      return root.EvolveModules.DataLoader;
    }
    return require('./data-loader.js');
  }

  function ensureEventAchieveFields(save) {
    const w = save.world;
    const p = save.prestige;
    if (!Array.isArray(w.logs)) w.logs = [];
    if (typeof w.eventTimer !== 'number') w.eventTimer = 35;
    if (typeof w.tempMoraleOffset !== 'number') w.tempMoraleOffset = 0;
    if (!p.achievements || typeof p.achievements !== 'object') p.achievements = {};
    if (!save.settings) save.settings = {};
    if (typeof save.settings.boring !== 'boolean') save.settings.boring = false;
  }

  /**
   * 添加日志条目（最新在前，保留最多 120 条）
   */
  function addLog(ctx, category, text, tone) {
    const w = ctx.save.world;
    ensureEventAchieveFields(ctx.save);
    const cal = w.calendar || { year: 0, day: 1 };
    const stamp = w.eraIndex === 0 ? '[起源]' : `[${cal.year}年${cal.day}日]`;
    w.logs.unshift({
      cat: category || 'progress',
      stamp,
      text,
      tone: tone || 'muted'
    });
    if (w.logs.length > 120) w.logs.length = 120;
  }

  /**
   * 定期检查并触发随机事件
   */
  function stepRandomEvents(ctx, dt) {
    const dl = getDL();
    const save = ctx.save;
    const w = save.world;
    ensureEventAchieveFields(save);
    if (w.eraIndex < 1) return;

    const env = ctx.envMods || {};
    const piscesBoost = (env.zodiac && env.zodiac.id === 'pisces') ? 1.25 : 1.0;
    const curiousBoost = dl.hasTrait(w, 'curious') ? 1.20 : 1.0;

    w.eventTimer -= dt * piscesBoost * curiousBoost;
    if (w.eventTimer > 0) return;

    // 重置冷却 35~65 秒
    w.eventTimer = 35 + Math.random() * 30;

    const candidates = (dl.DATA.events || []).filter(ev => {
      if (save.settings.boring && ev.type === 'minor') return false;
      if (w.eraIndex < (ev.minEra || 0)) return false;
      if (ev.reqAncient && !save.prestige.ancientRuins) return false;
      if (ev.reqGov && w.gov !== ev.reqGov) return false;
      return true;
    });
    if (candidates.length === 0) return;

    const ev = candidates[Math.floor(Math.random() * candidates.length)];
    const eff = ev.effect || {};

    if (eff.resPct) {
      for (const [rId, pct] of Object.entries(eff.resPct)) {
        if (!w.unlockedRes[rId]) continue;
        const cap = (ctx.metrics.caps && ctx.metrics.caps[rId]) || 100;
        const delta = Math.round(cap * pct);
        if (delta > 0) ctx.addResourceClamped(rId, delta);
        else if (delta < 0) w.res[rId] = Math.max(0, (w.res[rId] || 0) + delta);
      }
    }
    if (eff.resMultiPct) {
      for (const [rId, pct] of Object.entries(eff.resMultiPct)) {
        if (!w.unlockedRes[rId]) continue;
        const cap = (ctx.metrics.caps && ctx.metrics.caps[rId]) || 100;
        ctx.addResourceClamped(rId, Math.round(cap * pct));
      }
    }
    if (eff.resFlat) {
      for (const [rId, amt] of Object.entries(eff.resFlat)) {
        w.unlockedRes[rId] = true;
        ctx.addResourceClamped(rId, amt);
      }
    }
    if (typeof eff.moraleTemp === 'number') {
      w.tempMoraleOffset = Math.max(-15, Math.min(15, (w.tempMoraleOffset || 0) + eff.moraleTemp));
    }
    if (typeof eff.setTemp === 'number' && w.calendar) {
      w.calendar.temp = eff.setTemp;
    }
    if (typeof eff.setWeather === 'number' && w.calendar) {
      w.calendar.weather = eff.setWeather;
    }

    const icon = ev.type === 'major' ? '📰' : '✨';
    const tone = ev.type === 'major' ? 'amber' : 'sky';
    addLog(ctx, 'events', `${icon} ${ev.text}`, tone);
  }

  /**
   * 巡检成就解锁状态
   */
  function checkAchievements(ctx) {
    const dl = getDL();
    const save = ctx.save;
    const w = save.world;
    const p = save.prestige;
    ensureEventAchieveFields(save);

    const achs = p.achievements;
    let newUnlocked = 0;

    const evalAch = (condKey) => {
      switch (condKey) {
        case 'dna_created': return (w.res.dna || 0) >= 1 || !!w.techs.evo_organelle;
        case 'era_1': return w.eraIndex >= 1;
        case 'era_2': return w.eraIndex >= 2;
        case 'era_3': return w.eraIndex >= 3;
        case 'era_4': return w.eraIndex >= 4;
        case 'era_5': return w.eraIndex >= 5;
        case 'era_6': return w.eraIndex >= 6;
        case 'pop_25': return Math.floor(w.pop || 0) >= 25;
        case 'pop_100': return Math.floor(w.pop || 0) >= 100;
        case 'pop_250': return Math.floor(w.pop || 0) >= 250;
        case 'morale_130': return (w.happiness || 0) >= 130;
        case 'money_50k': return (w.res.money || 0) >= 50000;
        case 'money_500k': return (w.res.money || 0) >= 500000;
        case 'know_50k': return (w.res.knowledge || 0) >= 50000;
        case 'trade_5': {
          const routes = (w.market && w.market.routes) || {};
          const used = Object.values(routes).reduce((a, c) => a + Math.abs(c || 0), 0);
          return used >= 5;
        }
        case 'storage_20': {
          const st = w.storage || {};
          return ((st.crates || 0) + (st.containers || 0)) >= 20;
        }
        case 'power_100': return (ctx.metrics.powerGen || 0) >= 100;
        case 'power_1000': return (ctx.metrics.powerGen || 0) >= 1000;
        case 'arpa_1': {
          const total = Object.values(w.arpa || {}).reduce((a, o) => a + (o.rank || 0), 0);
          return total >= 1;
        }
        case 'arpa_5': {
          const total = Object.values(w.arpa || {}).reduce((a, o) => a + (o.rank || 0), 0);
          return total >= 5;
        }
        case 'genes_5': return ((w.geneLab && w.geneLab.totalGenes) || 0) >= 5;
        case 'win_5': return ((w.garrison && w.garrison.wins) || 0) >= 5;
        case 'unify_3': {
          if (!w.foreign) return false;
          return ['gov0', 'gov1', 'gov2'].every(k => w.foreign[k] && (w.foreign[k].occ || w.foreign[k].anx || w.foreign[k].buy));
        }
        case 'pacifist_unify': {
          if (!w.foreign || (w.garrison && w.garrison.attacks > 0)) return false;
          return ['gov0', 'gov1', 'gov2'].every(k => w.foreign[k] && (w.foreign[k].anx || w.foreign[k].buy));
        }
        case 'mad_1': return (p.madCount || 0) >= 1;
        case 'ark_1': return (p.arkCount || 0) >= 1;
        case 'crispr_5': return Object.values(p.crispr || {}).filter(Boolean).length >= 5;
        case 'governor_1': return !!(w.governor && w.governor.appointed);
        case 'mission_51': return (w.missionIndex || 0) >= 51;
        case 'univ_heavy': return w.universe === 'heavy' && (p.madCount > 0 || p.arkCount > 0);
        default: return false;
      }
    };

    for (const ach of (dl.DATA.achievements || [])) {
      if (achs[ach.id]) continue;
      if (evalAch(ach.check)) {
        achs[ach.id] = { unlockedAt: Date.now(), universe: w.universe || 'standard' };
        newUnlocked++;
        addLog(ctx, 'achievements', `🏆 解锁成就：【${ach.name}】(+${ach.mastery}% 精通)`, 'amber');
        if (ctx.showToast) ctx.showToast(`🏆 成就解锁：【${ach.name}】！`);
      }
    }
    return newUnlocked;
  }

  const api = {
    ensureEventAchieveFields,
    addLog,
    stepRandomEvents,
    checkAchievements
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.EvolveModules = root.EvolveModules || {};
    root.EvolveModules.EventsAchieves = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
