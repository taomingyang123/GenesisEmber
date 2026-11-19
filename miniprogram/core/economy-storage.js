'use strict';

/**
 * 仓储(板条箱/集装箱)、动态市场、自动贸易路线、电力开关调度与队列模块
 * 与 evolve_web/js/economy-storage.js 保持完全一致
 */

const dl = require('./data-loader.js');

const BASE_MARKET_PRICES = {
  food: 2.0,
  lumber: 2.5,
  stone: 3.0,
  money: 1.0,
  copper: 6.0,
  iron: 7.0,
  coal: 8.5,
  plywood: 12.0,
  brick: 12.0,
  wroughtIron: 16.0,
  steel: 24.0,
  cement: 18.0,
  oil: 14.0,
  polymer: 32.0,
  aluminium: 22.0,
  uranium: 120.0,
  electronics: 65.0,
  wafer: 140.0,
  microprocessor: 260.0,
  rocketParts: 350.0,
  helium3: 300.0,
  waterIce: 180.0,
  rareMineral: 420.0
};

const TRADE_UNIT_RATES = {
  food: 2.5, lumber: 2.0, stone: 1.8, copper: 1.0, iron: 1.0,
  coal: 0.8, plywood: 0.6, brick: 0.6, wroughtIron: 0.45,
  steel: 0.4, cement: 0.5, oil: 0.8, polymer: 0.35, aluminium: 0.5,
  uranium: 0.15, electronics: 0.25, wafer: 0.15, microprocessor: 0.1,
  rocketParts: 0.08, helium3: 0.1, waterIce: 0.2, rareMineral: 0.08
};

function ensureEconomyFields(world) {
  if (!world.storage || typeof world.storage !== 'object') {
    world.storage = { crates: 0, containers: 0, assignedCrates: {}, assignedContainers: {} };
  }
  if (typeof world.storage.crates !== 'number') world.storage.crates = 0;
  if (typeof world.storage.containers !== 'number') world.storage.containers = 0;
  if (!world.storage.assignedCrates) world.storage.assignedCrates = {};
  if (!world.storage.assignedContainers) world.storage.assignedContainers = {};

  if (!world.market || typeof world.market !== 'object') {
    world.market = { qty: 10, prices: {}, routes: {} };
  }
  if (typeof world.market.qty !== 'number' || world.market.qty < 1) world.market.qty = 10;
  if (!world.market.prices) world.market.prices = {};
  if (!world.market.routes) world.market.routes = {};
  for (const [rId, baseP] of Object.entries(BASE_MARKET_PRICES)) {
    if (rId !== 'money' && typeof world.market.prices[rId] !== 'number') {
      world.market.prices[rId] = baseP;
    }
  }

  if (!world.powerOff || typeof world.powerOff !== 'object') world.powerOff = {};
  if (!Array.isArray(world.buildQueue)) world.buildQueue = [];
  if (!Array.isArray(world.researchQueue)) world.researchQueue = [];
  if (typeof world.queuePaused !== 'boolean') world.queuePaused = false;
}

/**
 * 计算板条箱/集装箱总容量上限、已使用数量及单个扩容额度
 * @param {object} ctx
 * @returns {object}
 */
function getStorageStats(ctx) {
  const w = ctx.save.world;
  ensureEconomyFields(w);
  const b = w.buildings || {};
  const eb = w.extraBlds || {};
  const t = w.techs || {};
  const env = ctx.envMods || { crateCapMult: 1, storageCapMult: 1 };

  let crateCap = 8 + (eb.storage_yard || 0) * 8 + (b.freightWarehouse || 0) * 4;
  if (t.construction) crateCap += 6;
  if (t.industrialization) crateCap += 10;
  if (t.computing) crateCap += 15;

  let containerCap = t.steel ? (6 + (b.freightWarehouse || 0) * 4 + (b.warehouse || 0) * 2) : 0;
  if (t.industrialization && containerCap > 0) containerCap += 8;
  if (t.rocketry && containerCap > 0) containerCap += 12;

  const usedCrates = Object.values(w.storage.assignedCrates).reduce((a, c) => a + (c || 0), 0);
  const usedContainers = Object.values(w.storage.assignedContainers).reduce((a, c) => a + (c || 0), 0);

  let perCrate = 350;
  if (t.smelting) perCrate += 150;
  if (t.industrialization) perCrate += 400;
  if (t.computing) perCrate += 800;
  perCrate = Math.round(perCrate * (env.crateCapMult || 1));

  let perContainer = 900;
  if (t.mechanicalEngineering) perContainer += 500;
  if (t.semiconductors) perContainer += 1200;
  if (t.spaceExploration) perContainer += 2000;
  perContainer = Math.round(perContainer * (env.crateCapMult || 1));

  const phageMult = 1 + ((ctx.save.prestige && ctx.save.prestige.phage) || 0) * 0.05;
  perCrate = Math.round(perCrate * phageMult);
  perContainer = Math.round(perContainer * phageMult);

  return {
    cratesOwned: w.storage.crates,
    crateCap,
    usedCrates,
    freeCrates: Math.max(0, w.storage.crates - usedCrates),
    perCrate,
    containersOwned: w.storage.containers,
    containerCap,
    usedContainers,
    freeContainers: Math.max(0, w.storage.containers - usedContainers),
    perContainer
  };
}

/**
 * 建造板条箱 / 集装箱
 */
function constructStorageUnit(ctx, kind, count) {
  const w = ctx.save.world;
  ensureEconomyFields(w);
  const st = getStorageStats(ctx);
  const qtyReq = Math.max(1, count || 1);

  if (kind === 'crate') {
    const room = Math.max(0, st.crateCap - st.cratesOwned);
    if (room <= 0) return { ok: false, msg: '板条箱已达容量上限，请建造【货场】或【货运仓库】！' };
    const usePlywood = !!w.techs.smelting && (w.res.plywood || 0) >= 10;
    const costRes = usePlywood ? 'plywood' : 'lumber';
    const unitCost = usePlywood ? 10 : 25;
    const maxAfford = Math.floor((w.res[costRes] || 0) / unitCost);
    const buy = Math.min(qtyReq, room, maxAfford);
    if (buy <= 0) return { ok: false, msg: `建造板条箱需要 ${unitCost} ${usePlywood ? '木板' : '木材'}！` };
    w.res[costRes] -= buy * unitCost;
    w.storage.crates += buy;
    return { ok: true, count: buy, msg: `📦 建造板条箱 ×${buy}` };
  }

  if (kind === 'container') {
    if (!w.techs.steel) return { ok: false, msg: '需研究【钢铁】以解锁集装箱制造！' };
    const room = Math.max(0, st.containerCap - st.containersOwned);
    if (room <= 0) return { ok: false, msg: '集装箱已达容量上限，请建造【仓库】或【货运仓库】！' };
    const unitCost = 35;
    const maxAfford = Math.floor((w.res.steel || 0) / unitCost);
    const buy = Math.min(qtyReq, room, maxAfford);
    if (buy <= 0) return { ok: false, msg: `建造集装箱需要 ${unitCost} 钢材！` };
    w.res.steel -= buy * unitCost;
    w.storage.containers += buy;
    return { ok: true, count: buy, msg: `🚢 建造集装箱 ×${buy}` };
  }
  return { ok: false, msg: '未知仓储类型' };
}

/**
 * 分配或回收板条箱/集装箱到指定资源
 */
function assignStorageUnit(ctx, kind, resId, delta) {
  const w = ctx.save.world;
  ensureEconomyFields(w);
  if (resId === 'rna' || resId === 'dna' || resId === 'knowledge' || resId === 'money') {
    return { ok: false, msg: '该特殊资源不使用板条箱/集装箱仓储！' };
  }
  const st = getStorageStats(ctx);
  const map = kind === 'container' ? w.storage.assignedContainers : w.storage.assignedCrates;
  const cur = map[resId] || 0;

  if (delta > 0) {
    const avail = kind === 'container' ? st.freeContainers : st.freeCrates;
    const add = Math.min(delta, avail);
    if (add <= 0) return { ok: false, msg: `空闲${kind === 'container' ? '集装箱' : '板条箱'}不足！` };
    map[resId] = cur + add;
    return { ok: true, delta: add };
  }
  const sub = Math.min(-delta, cur);
  if (sub <= 0) return { ok: false, msg: '当前资源未分配此类仓储箱！' };
  map[resId] = cur - sub;
  return { ok: true, delta: -sub };
}

/**
 * 获取当前可用/已用自动贸易路线上限
 */
function getTradeRouteStats(ctx) {
  const w = ctx.save.world;
  ensureEconomyFields(w);
  if (!w.techs.trade) return { unlocked: false, maxRoutes: 0, usedRoutes: 0 };

  const b = w.buildings || {};
  const eb = w.extraBlds || {};
  const arpa = w.arpa || {};
  let maxRoutes = 2
    + (b.market || 0) * 1
    + Math.min(5, eb.temple || 0)
    + ((arpa.railway && arpa.railway.rank) || 0) * 2;
  if (w.techs.computing) maxRoutes += 2;
  if (w.techs.spaceExploration) maxRoutes += 4;
  if (dl.hasTrait(w, 'xenophobic')) maxRoutes = Math.max(1, maxRoutes - 2);

  let usedRoutes = 0;
  for (const val of Object.values(w.market.routes)) {
    usedRoutes += Math.abs(val || 0);
  }
  return { unlocked: true, maxRoutes, usedRoutes, freeRoutes: Math.max(0, maxRoutes - usedRoutes) };
}

/**
 * 市场买价/卖价计算
 */
function getMarketQuote(ctx, resId) {
  const w = ctx.save.world;
  ensureEconomyFields(w);
  const base = BASE_MARKET_PRICES[resId];
  if (!base || resId === 'money') return null;

  const curPrice = w.market.prices[resId] || base;
  let buyMult = 1.0;
  let sellRatio = 0.25;
  if (dl.hasTrait(w, 'arrogant')) buyMult *= 1.10;
  if (dl.hasTrait(w, 'pompous')) buyMult *= 1.05;
  if (dl.hasTrait(w, 'merchant')) sellRatio *= 1.35;
  if (dl.hasTrait(w, 'asymmetrical')) sellRatio *= 0.90;
  if (w.gov === 'oligarchy') buyMult *= 0.92;

  const buyPrice = +(curPrice * buyMult).toFixed(2);
  const sellPrice = +(curPrice * sellRatio).toFixed(2);
  return { buyPrice, sellPrice, basePrice: base };
}

/**
 * 市场单次即时购买/出售
 */
function tradeMarketOrder(ctx, resId, side, qtyOverride) {
  const w = ctx.save.world;
  ensureEconomyFields(w);
  if (!w.techs.currency) return { ok: false, msg: '需先研究【货币】开启市场交易！' };
  if (dl.hasTrait(w, 'terrifying')) return { ok: false, msg: '【可畏】特质令商队不敢靠近，无法直接开展贸易！' };

  const quote = getMarketQuote(ctx, resId);
  if (!quote) return { ok: false, msg: '该资源不支持市场交易！' };
  const qty = Math.max(1, qtyOverride || w.market.qty || 10);
  const cap = ctx.metrics.caps[resId] || 100;
  const moneyCap = ctx.metrics.caps.money || 1000;

  if (side === 'buy') {
    const room = Math.max(0, cap - (w.res[resId] || 0));
    const maxAfford = Math.floor((w.res.money || 0) / quote.buyPrice);
    const deal = Math.floor(Math.min(qty, room, maxAfford));
    if (deal <= 0) return { ok: false, msg: '金币不足或该资源仓储已满！' };
    const cost = Math.round(deal * quote.buyPrice);
    w.res.money = Math.max(0, w.res.money - cost);
    ctx.addResourceClamped(resId, deal);
    w.market.prices[resId] = Math.min(
      quote.basePrice * 2.5,
      (w.market.prices[resId] || quote.basePrice) * (1 + Math.min(0.15, deal * 0.0005))
    );
    return { ok: true, msg: `🛒 买入 ${ctx.getResName(resId)} ×${deal} (-${cost} 金币)` };
  }

  if (side === 'sell') {
    const have = Math.floor(w.res[resId] || 0);
    const moneyRoom = Math.max(0, moneyCap - (w.res.money || 0));
    const maxFit = Math.floor(moneyRoom / Math.max(0.01, quote.sellPrice));
    const deal = Math.floor(Math.min(qty, have, maxFit));
    if (deal <= 0) return { ok: false, msg: '库存不足或金库已满！' };
    const earn = Math.round(deal * quote.sellPrice);
    w.res[resId] = Math.max(0, w.res[resId] - deal);
    ctx.addResourceClamped('money', earn);
    w.market.prices[resId] = Math.max(
      quote.basePrice * 0.4,
      (w.market.prices[resId] || quote.basePrice) * (1 - Math.min(0.15, deal * 0.0005))
    );
    return { ok: true, msg: `💰 卖出 ${ctx.getResName(resId)} ×${deal} (+${earn} 金币)` };
  }
  return { ok: false, msg: '无效交易方向' };
}

/**
 * 调整自动贸易路线 (+1 进口 / -1 出口 / 0 清零)
 */
function adjustTradeRoute(ctx, resId, delta) {
  const w = ctx.save.world;
  ensureEconomyFields(w);
  const st = getTradeRouteStats(ctx);
  if (!st.unlocked) return { ok: false, msg: '需先研究【贸易】开启自动贸易路线！' };

  if (delta === 0) {
    w.market.routes[resId] = 0;
    return { ok: true };
  }
  const cur = w.market.routes[resId] || 0;
  const next = cur + delta;
  const newUsed = st.usedRoutes - Math.abs(cur) + Math.abs(next);
  if (newUsed > st.maxRoutes) {
    return { ok: false, msg: `贸易路线已满 (${st.usedRoutes}/${st.maxRoutes})，请建造集市/寺庙/铁路扩展路线！` };
  }
  w.market.routes[resId] = next;
  return { ok: true };
}

/**
 * 运行市场均值回归与自动贸易路线每秒收支
 */
function stepMarketAndTrade(ctx, dt, rates) {
  const w = ctx.save.world;
  ensureEconomyFields(w);

  for (const [rId, baseP] of Object.entries(BASE_MARKET_PRICES)) {
    if (rId === 'money') continue;
    const cur = w.market.prices[rId] || baseP;
    if (Math.abs(cur - baseP) > 0.01) {
      w.market.prices[rId] = cur + (baseP - cur) * Math.min(1, 0.03 * dt);
    }
  }

  if (!w.techs.trade) return;
  const env = ctx.envMods || { tradeVolMult: 1, masteryPct: 0 };
  const negBonus = dl.hasCrispr(ctx.save, 'unlocked') && dl.hasCrispr(ctx.save, 'negotiator')
    ? (1 + (env.masteryPct || 0) * 0.005)
    : 1.0;
  const volMult = (env.tradeVolMult || 1) * negBonus * (dl.hasTrait(w, 'merchant') ? 1.25 : 1.0);

  for (const [rId, routeCnt] of Object.entries(w.market.routes)) {
    if (!routeCnt || !w.unlockedRes[rId]) continue;
    const quote = getMarketQuote(ctx, rId);
    const unitRate = TRADE_UNIT_RATES[rId] || 0.25;
    if (!quote) continue;

    if (routeCnt > 0) {
      const wantUnits = routeCnt * unitRate * volMult;
      const costPerSec = wantUnits * quote.buyPrice;
      const availMoney = (w.res.money || 0) + Math.max(0, (rates.money || 0) * dt);
      const capRoom = Math.max(0, (ctx.metrics.caps[rId] || 100) - (w.res[rId] || 0));
      if (availMoney > 0 && capRoom > 0) {
        const ratio = costPerSec * dt > 0 ? Math.min(1, availMoney / (costPerSec * dt)) : 0;
        const actualUnits = Math.min(wantUnits * ratio, capRoom / Math.max(0.01, dt));
        rates.money -= actualUnits * quote.buyPrice;
        rates[rId] = (rates[rId] || 0) + actualUnits;
      }
    } else if (routeCnt < 0) {
      const wantSell = Math.abs(routeCnt) * unitRate * volMult;
      const availRes = (w.res[rId] || 0) + Math.max(0, (rates[rId] || 0) * dt);
      if (availRes > 0) {
        const ratio = wantSell * dt > 0 ? Math.min(1, availRes / (wantSell * dt)) : 0;
        const actualSell = wantSell * ratio;
        rates[rId] = (rates[rId] || 0) - actualSell;
        rates.money = (rates.money || 0) + actualSell * quote.sellPrice;
      }
    }
  }
}

/**
 * 调整耗电建筑启用数量
 */
function toggleBuildingPower(ctx, bldId, delta, isExtra) {
  const w = ctx.save.world;
  ensureEconomyFields(w);
  const store = isExtra ? (w.extraBlds || {}) : (w.buildings || {});
  const total = store[bldId] || 0;
  if (total <= 0) return 0;
  const off = w.powerOff[bldId] || 0;
  const on = Math.max(0, total - off);
  const nextOn = Math.max(0, Math.min(total, on + delta));
  w.powerOff[bldId] = total - nextOn;
  return nextOn;
}

function getActiveBuildingCount(world, bldId, isExtra) {
  const store = isExtra ? (world.extraBlds || {}) : (world.buildings || {});
  const total = store[bldId] || 0;
  const off = (world.powerOff && world.powerOff[bldId]) || 0;
  return Math.max(0, Math.min(total, total - off));
}

function getQueueLimits(save) {
  let bMax = 3;
  let rMax = 2;
  if (dl.hasCrispr(save, 'geographer')) { bMax = 6; rMax = 6; }
  if (dl.hasCrispr(save, 'architect')) { bMax = 14; rMax = 14; }
  return { bMax, rMax };
}

function getBuildingMaxCount(ctx, bldId, isExtra) {
  let def = null;
  if (isExtra) {
    def = (ctx.EVOLVE_EXTRA_BLDS_DEF && ctx.EVOLVE_EXTRA_BLDS_DEF.find(b => b.id === bldId))
      || (dl.MAPS.extraBuildings && dl.MAPS.extraBuildings[bldId])
      || null;
  } else {
    def = (ctx.BUILDINGS_DEF && ctx.BUILDINGS_DEF.find(b => b.id === bldId)) || null;
    if (!def && bldId === 'colonyShip') return 1;
  }
  return def && def.maxCount ? def.maxCount : 0;
}

function enqueueBuild(ctx, bldId, isExtra) {
  const w = ctx.save.world;
  ensureEconomyFields(w);
  const maxCount = getBuildingMaxCount(ctx, bldId, isExtra);
  if (maxCount > 0) {
    const store = isExtra ? (w.extraBlds || {}) : (w.buildings || {});
    const owned = store[bldId] || 0;
    const queued = w.buildQueue.filter(item => item.id === bldId && !!item.isExtra === !!isExtra).length;
    if (owned + queued >= maxCount) {
      return { ok: false, msg: `该建筑已达建造或排队上限 (${maxCount})！` };
    }
  }
  const { bMax } = getQueueLimits(ctx.save);
  if (w.buildQueue.length >= bMax) {
    return { ok: false, msg: `建筑队列已满 (${w.buildQueue.length}/${bMax})！` };
  }
  w.buildQueue.push({ id: bldId, isExtra: !!isExtra });
  return { ok: true };
}

function enqueueResearch(ctx, techId) {
  const w = ctx.save.world;
  ensureEconomyFields(w);
  const { rMax } = getQueueLimits(ctx.save);
  if (w.techs[techId]) return { ok: false, msg: '该科技已研究完成！' };
  if (w.researchQueue.includes(techId)) return { ok: false, msg: '已在研究队列中！' };
  if (w.researchQueue.length >= rMax) {
    return { ok: false, msg: `研究队列已满 (${w.researchQueue.length}/${rMax})！` };
  }
  w.researchQueue.push(techId);
  return { ok: true };
}

function stepQueues(ctx) {
  const w = ctx.save.world;
  ensureEconomyFields(w);
  if (w.queuePaused) return;

  while (w.buildQueue.length > 0) {
    const head = w.buildQueue[0];
    const maxCount = getBuildingMaxCount(ctx, head.id, head.isExtra);
    const store = head.isExtra ? (w.extraBlds || {}) : (w.buildings || {});
    if (maxCount > 0 && (store[head.id] || 0) >= maxCount) {
      w.buildQueue.shift();
      continue;
    }
    if (ctx.tryBuyBuildingSingle && ctx.tryBuyBuildingSingle(head.id, head.isExtra)) {
      w.buildQueue.shift();
    }
    break;
  }

  if (w.researchQueue.length > 0 && ctx.tryBuyTechnology) {
    for (let i = 0; i < w.researchQueue.length; i++) {
      const tid = w.researchQueue[i];
      if (w.techs[tid]) {
        w.researchQueue.splice(i, 1);
        i--;
        continue;
      }
      if (ctx.tryBuyTechnology(tid)) {
        w.researchQueue.splice(i, 1);
        break;
      }
    }
  }
}

module.exports = {
  BASE_MARKET_PRICES,
  TRADE_UNIT_RATES,
  ensureEconomyFields,
  getStorageStats,
  constructStorageUnit,
  assignStorageUnit,
  getTradeRouteStats,
  getMarketQuote,
  tradeMarketOrder,
  adjustTradeRoute,
  stepMarketAndTrade,
  toggleBuildingPower,
  getActiveBuildingCount,
  getQueueLimits,
  enqueueBuild,
  enqueueResearch,
  stepQueues
};
