'use strict';

/**
 * 外交、驻军、战役与谍报系统
 * 与 evolve_web/js/diplomacy-military.js 保持完全一致
 */

const dl = require('./data-loader.js');

function makeGovName(idx) {
  const f = dl.DATA.foreign || { prefixes: ['北方', '南方', '东方'], suffixes: ['共和国', '同盟', '帝国'] };
  const p = f.prefixes[(idx * 3 + Math.floor(Math.random() * f.prefixes.length)) % f.prefixes.length];
  const s = f.suffixes[(idx * 2 + Math.floor(Math.random() * f.suffixes.length)) % f.suffixes.length];
  return `${p}${s}`;
}

function ensureDiplomacyFields(world) {
  if (!world.garrison || typeof world.garrison !== 'object') {
    world.garrison = {
      soldiers: 0,
      wounded: 0,
      raidSize: 2,
      tactic: 1,
      trainAccum: 0,
      healAccum: 0,
      mercsHired: 0,
      wins: 0,
      attacks: 0
    };
  }
  const g = world.garrison;
  if (typeof g.soldiers !== 'number') g.soldiers = 0;
  if (typeof g.wounded !== 'number') g.wounded = 0;
  if (typeof g.raidSize !== 'number') g.raidSize = 2;
  if (typeof g.tactic !== 'number') g.tactic = 1;
  if (typeof g.trainAccum !== 'number') g.trainAccum = 0;
  if (typeof g.healAccum !== 'number') g.healAccum = 0;
  if (typeof g.wins !== 'number') g.wins = 0;
  if (typeof g.attacks !== 'number') g.attacks = 0;

  if (!world.foreign || typeof world.foreign !== 'object') {
    world.foreign = {
      gov0: { name: makeGovName(0), hstl: 85, mil: 80, eco: 75, unrest: 0, spy: 0, spyTrain: 0, occ: false, anx: false, buy: false },
      gov1: { name: makeGovName(1), hstl: 15, mil: 120, eco: 100, unrest: 0, spy: 0, spyTrain: 0, occ: false, anx: false, buy: false },
      gov2: { name: makeGovName(2), hstl: 50, mil: 200, eco: 150, unrest: 0, spy: 0, spyTrain: 0, occ: false, anx: false, buy: false }
    };
  }
  for (let i = 0; i < 3; i++) {
    const k = `gov${i}`;
    if (!world.foreign[k]) {
      world.foreign[k] = {
        name: makeGovName(i),
        hstl: 50,
        mil: 100 + i * 50,
        eco: 80 + i * 35,
        unrest: 0,
        spy: 0,
        spyTrain: 0,
        occ: false,
        anx: false,
        buy: false
      };
    }
  }
}

function getMaxSoldiers(ctx) {
  const w = ctx.save.world;
  const eb = w.extraBlds || {};
  let maxS = 2 + (eb.garrison || 0) * 4 + (eb.boot_camp || 0) * 2;
  if (w.techs.steel) maxS += 4;
  if (w.techs.industrialization) maxS += 8;
  if (w.techs.nuclearPower) maxS += 10;
  if (dl.hasTrait(w, 'high_pop')) maxS = Math.round(maxS * 1.2);
  if (dl.hasTrait(w, 'grenadier')) maxS = Math.max(2, Math.floor(maxS * 0.7));
  return maxS;
}

function getCombatRating(ctx, soldierCount) {
  const w = ctx.save.world;
  const g = w.garrison;
  const env = ctx.envMods || { combatMult: 1 };
  const effectiveSoldiers = Math.max(0, soldierCount - Math.floor(g.wounded * 0.5));

  let techRating = 5;
  if (w.techs.ironAge) techRating += 3;
  if (w.techs.steel) techRating += 6;
  if (w.techs.mechanicalEngineering) techRating += 8;
  if (w.techs.electronics) techRating += 12;
  if (w.techs.nuclearFission) techRating += 18;
  if (w.techs.artificialIntelligence) techRating += 25;
  if (w.techs.rocketry) techRating += 35;

  if (dl.hasTrait(w, 'grenadier')) techRating *= 1.5;
  const garBonus = 1 + (w.extraBlds.garrison || 0) * 0.08;
  return Math.round(effectiveSoldiers * techRating * garBonus * (env.combatMult || 1));
}

function getMercCost(ctx) {
  const w = ctx.save.world;
  const g = w.garrison;
  const base = 65 * (1 + w.eraIndex * 0.75);
  return Math.round(base * Math.pow(1.06, Math.min(40, g.mercsHired || 0)));
}

function hireMercenary(ctx) {
  const w = ctx.save.world;
  ensureDiplomacyFields(w);
  if (!w.techs.currency) return { ok: false, msg: '需先研究【货币】方可使用金币雇佣兵！' };
  const maxS = getMaxSoldiers(ctx);
  if (w.garrison.soldiers >= maxS) return { ok: false, msg: '士兵编制已满，请建造【军营】或【新兵训练营】扩容！' };
  const cost = getMercCost(ctx);
  if ((w.res.money || 0) < cost) return { ok: false, msg: `雇佣兵需要 ${cost} 金币！` };
  w.res.money -= cost;
  w.garrison.soldiers += 1;
  w.garrison.mercsHired = (w.garrison.mercsHired || 0) + 1;
  return { ok: true, msg: `⚔️ 招募雇佣兵 +1 (-${cost} 金币)` };
}

function adjustRaidSize(ctx, delta) {
  const w = ctx.save.world;
  ensureDiplomacyFields(w);
  const maxS = Math.max(1, getMaxSoldiers(ctx));
  w.garrison.raidSize = Math.max(1, Math.min(maxS, (w.garrison.raidSize || 1) + delta));
}

function assessBattle(ctx, govIdx) {
  const w = ctx.save.world;
  ensureDiplomacyFields(w);
  const gov = w.foreign[`gov${govIdx}`];
  const tactics = (dl.DATA.foreign && dl.DATA.foreign.tactics) || [];
  const tac = tactics[w.garrison.tactic] || tactics[1] || { powerReq: 45, lootMult: 1, risk: 0.25, hstlGain: 5 };

  const mySoldiers = Math.min(w.garrison.soldiers, w.garrison.raidSize);
  const myPower = getCombatRating(ctx, mySoldiers);
  const enemyPower = Math.max(10, Math.round(tac.powerReq * (gov.mil / 100)));
  const ratio = myPower / enemyPower;
  let label = '凶多吉少';
  let cls = 'text-rose';
  if (ratio >= 1.45) { label = '压倒性优势'; cls = 'text-emerald'; }
  else if (ratio >= 1.05) { label = '略占优势'; cls = 'text-sky'; }
  else if (ratio >= 0.85) { label = '势均力敌'; cls = 'text-amber'; }

  return { myPower, enemyPower, ratio, label, cls, tactic: tac };
}

function launchCampaign(ctx, govIdx) {
  const w = ctx.save.world;
  ensureDiplomacyFields(w);
  const gov = w.foreign[`gov${govIdx}`];
  if (!gov) return { ok: false, msg: '无效目标国家' };

  if (gov.occ || gov.anx || gov.buy) {
    gov.occ = false;
    gov.anx = false;
    gov.buy = false;
    return { ok: true, msg: `🏳️ 已从【${gov.name}】撤出控制并恢复其独立地位。` };
  }

  const deploy = Math.min(w.garrison.soldiers, w.garrison.raidSize);
  if (deploy <= 0) return { ok: false, msg: '目前没有可用士兵，请等待训练或雇佣兵！' };

  const assess = assessBattle(ctx, govIdx);
  const tac = assess.tactic;
  w.garrison.attacks += 1;
  gov.hstl = Math.min(100, gov.hstl + (tac.hstlGain || 5));

  const roll = 0.8 + Math.random() * 0.45;
  const win = assess.myPower * roll >= assess.enemyPower;
  const casMult = (ctx.envMods && ctx.envMods.casualtyMult) || 1.0;

  if (win) {
    w.garrison.wins += 1;
    const maxHurt = Math.max(1, Math.floor(deploy * tac.risk * casMult));
    const killed = Math.floor(Math.random() * Math.max(1, Math.ceil(maxHurt * 0.45)));
    const wounded = Math.min(deploy - killed, Math.floor(Math.random() * maxHurt));
    const actualKilled = dl.hasTrait(w, 'revive') ? Math.floor(killed * 0.6) : killed;

    w.garrison.soldiers = Math.max(0, w.garrison.soldiers - actualKilled);
    w.garrison.wounded = Math.min(w.garrison.soldiers, w.garrison.wounded + wounded);

    const scale = tac.lootMult * (1 + gov.eco / 150) * (1 + w.eraIndex * 0.45) * (dl.hasTrait(w, 'evil') ? 1.25 : 1);
    const loot = {};
    const pool = ['food', 'lumber', 'stone', 'copper', 'iron', 'coal', 'steel', 'oil', 'money'];
    for (const rId of pool) {
      if (!w.unlockedRes[rId]) continue;
      const baseAmt = rId === 'money' ? 140 : 28;
      const gain = Math.round(baseAmt * scale * (0.7 + Math.random() * 0.6));
      if (gain > 0) {
        ctx.addResourceClamped(rId, gain);
        loot[rId] = gain;
      }
    }

    if (tac.id >= 3) {
      gov.mil = Math.max(20, Math.round(gov.mil * (tac.id === 4 ? 0.68 : 0.85)));
    }
    let occMsg = '';
    if (tac.id === 4 && (gov.mil <= 45 || assess.ratio >= 1.6)) {
      gov.occ = true;
      occMsg = ` 🏴 并成功【军事占领】了 ${gov.name}！`;
    }

    const lootText = Object.entries(loot).slice(0, 4).map(([k, v]) => `${ctx.getResName(k)}+${v}`).join(' ');
    const msg = `⚔️ 攻打【${gov.name}】大捷！(${lootText}) 阵亡 ${actualKilled}，负伤 ${wounded}。${occMsg}`;
    if (ctx.addLog) ctx.addLog('combat', msg, 'emerald');
    return { ok: true, win: true, msg };
  }

  const lost = Math.max(1, Math.min(deploy, Math.ceil(deploy * (0.25 + tac.risk * 0.4) * casMult)));
  const actualLost = dl.hasTrait(w, 'revive') ? Math.floor(lost * 0.6) : lost;
  w.garrison.soldiers = Math.max(0, w.garrison.soldiers - actualLost);
  const msg = `💥 攻打【${gov.name}】受挫败退！阵亡 ${actualLost} 名士兵。`;
  if (ctx.addLog) ctx.addLog('combat', msg, 'rose');
  return { ok: true, win: false, msg };
}

function getSpyTrainCost(ctx, govIdx) {
  const w = ctx.save.world;
  ensureDiplomacyFields(w);
  const gov = w.foreign[`gov${govIdx}`];
  const disc = (ctx.envMods && ctx.envMods.spyDiscountMult) || 1.0;
  const base = 320 * (1 + w.eraIndex * 0.45);
  return Math.round(base * Math.pow(1.75, gov.spy || 0) * disc);
}

function trainSpy(ctx, govIdx) {
  const w = ctx.save.world;
  ensureDiplomacyFields(w);
  if (!w.techs.currency) return { ok: false, msg: '需先研究【货币】才能培训对外间谍！' };
  const gov = w.foreign[`gov${govIdx}`];
  if (!gov || gov.occ || gov.anx || gov.buy) return { ok: false, msg: '该国已在我国控制之下！' };
  if (gov.spyTrain > 0) return { ok: false, msg: '正在培训派往该国的间谍！' };

  const cost = getSpyTrainCost(ctx, govIdx);
  if ((w.res.money || 0) < cost) return { ok: false, msg: `培训间谍需要 ${cost} 金币！` };
  w.res.money -= cost;
  const campRed = Math.min(8, (w.extraBlds.boot_camp || 0) * 1.5);
  gov.spyTrain = Math.max(4, 12 - campRed);
  return { ok: true, msg: `🕵️ 已派出间谍潜往【${gov.name}】培训中 (-${cost} 金币)` };
}

function runSpyOp(ctx, govIdx, op) {
  const w = ctx.save.world;
  ensureDiplomacyFields(w);
  const gov = w.foreign[`gov${govIdx}`];
  if (!gov || gov.spy <= 0) return { ok: false, msg: '尚未向该国派遣间谍！' };

  const spyEff = 1 + (gov.spy - 1) * 0.25 + (dl.hasTrait(w, 'befuddle') ? 0.35 : 0);
  const opCost = Math.round((150 + w.eraIndex * 120) * ((ctx.envMods && ctx.envMods.spyDiscountMult) || 1));

  if (op === 'influence') {
    if ((w.res.money || 0) < opCost) return { ok: false, msg: `亲善行动需要 ${opCost} 金币！` };
    w.res.money -= opCost;
    const drop = Math.round((15 + Math.random() * 10) * spyEff);
    gov.hstl = Math.max(0, gov.hstl - drop);
    const msg = `🕊️ 间谍对【${gov.name}】执行亲善，双边敌意下降 ${drop}%！`;
    if (ctx.addLog) ctx.addLog('combat', msg, 'sky');
    return { ok: true, msg };
  }
  if (op === 'sabotage') {
    if ((w.res.money || 0) < opCost) return { ok: false, msg: `破坏行动需要 ${opCost} 金币！` };
    w.res.money -= opCost;
    const cut = Math.round((15 + Math.random() * 12) * spyEff);
    gov.mil = Math.max(20, gov.mil - cut);
    const msg = `💣 间谍在【${gov.name}】制造破坏，其军事实力削弱 ${cut} 点！`;
    if (ctx.addLog) ctx.addLog('combat', msg, 'amber');
    return { ok: true, msg };
  }
  if (op === 'incite') {
    if ((w.res.money || 0) < opCost) return { ok: false, msg: `煽动行动需要 ${opCost} 金币！` };
    w.res.money -= opCost;
    const up = Math.round((18 + Math.random() * 12) * spyEff);
    gov.unrest = Math.min(100, gov.unrest + up);
    const msg = `🔥 间谍在【${gov.name}】煽动舆论，内乱度提升至 ${gov.unrest}%！`;
    if (ctx.addLog) ctx.addLog('combat', msg, 'amber');
    return { ok: true, msg };
  }
  if (op === 'annex') {
    if (gov.hstl > 45 || gov.unrest < 50) {
      return { ok: false, msg: '和平吞并需满足：敌意 ≤ 45% 且内乱 ≥ 50%！' };
    }
    gov.anx = true;
    const msg = `🏛️ 顺应民意，我国已和平吞并【${gov.name}】纳入版图！`;
    if (ctx.addLog) ctx.addLog('combat', msg, 'emerald');
    return { ok: true, msg };
  }
  if (op === 'purchase') {
    if (gov.spy < 2) return { ok: false, msg: '经济收购需至少 2 名间谍运作！' };
    const buyPrice = Math.round(gov.eco * 35 * (gov.hstl > 50 ? 1.25 : 1.0));
    if ((w.res.money || 0) < buyPrice) return { ok: false, msg: `收购【${gov.name}】需 ${buyPrice} 金币！` };
    w.res.money -= buyPrice;
    gov.buy = true;
    const msg = `💼 财阀并购成功！我国斥资 ${buyPrice} 金币收购【${gov.name}】！`;
    if (ctx.addLog) ctx.addLog('combat', msg, 'emerald');
    return { ok: true, msg };
  }
  return { ok: false, msg: '未知谍报指令' };
}

function stepDiplomacyAndMilitary(ctx, dt, rates) {
  const w = ctx.save.world;
  ensureDiplomacyFields(w);
  if (w.eraIndex < 2) return;

  const eb = w.extraBlds || {};
  const env = ctx.envMods || { healMult: 1 };
  const maxS = getMaxSoldiers(ctx);

  if (w.garrison.soldiers < maxS) {
    const trainRate = 0.05 + (eb.garrison || 0) * 0.04 + (eb.boot_camp || 0) * 0.08;
    w.garrison.trainAccum += trainRate * dt;
    if (w.garrison.trainAccum >= 1) {
      const add = Math.floor(w.garrison.trainAccum);
      w.garrison.trainAccum -= add;
      w.garrison.soldiers = Math.min(maxS, w.garrison.soldiers + add);
    }
  }

  if (w.garrison.wounded > 0) {
    const healRate = (0.08 + (eb.hospital || 0) * 0.12) * (env.healMult || 1);
    w.garrison.healAccum += healRate * dt;
    if (w.garrison.healAccum >= 1) {
      const healed = Math.floor(w.garrison.healAccum);
      w.garrison.healAccum -= healed;
      w.garrison.wounded = Math.max(0, w.garrison.wounded - healed);
    }
  }

  for (let i = 0; i < 3; i++) {
    const gov = w.foreign[`gov${i}`];
    if (gov.spyTrain > 0) {
      gov.spyTrain = Math.max(0, gov.spyTrain - dt);
      if (gov.spyTrain === 0) {
        gov.spy += 1;
        if (ctx.addLog) ctx.addLog('combat', `🕵️ 派往【${gov.name}】的新间谍已完成培训并就位！`, 'sky');
      }
    }
    if (gov.occ || gov.anx || gov.buy) {
      const tribute = (gov.eco * 0.04) * (w.gov === 'federation' ? 1.5 : 1.0);
      rates.money = (rates.money || 0) + tribute;
    } else if (gov.mil < 120 + i * 50) {
      gov.mil += 0.15 * dt;
    }
  }
}

module.exports = {
  ensureDiplomacyFields,
  getMaxSoldiers,
  getCombatRating,
  getMercCost,
  hireMercenary,
  adjustRaidSize,
  assessBattle,
  launchCampaign,
  getSpyTrainCost,
  trainSpy,
  runSpyOp,
  stepDiplomacyAndMilitary
};
