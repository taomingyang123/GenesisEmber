'use strict';

/**
 * 微信小程序 UI ViewModel 构建器与路径级差量 Diff 引擎
 * 仅计算当前激活主/子页签数据，配合路径级 diff 最大限度降低 setData 通信开销
 */

const dl = require('./data-loader.js');
const bridge = require('./evolve-bridge.js');

const SUB_TABS_FALLBACK = {
  evo: [
    { id: 'evo_species', label: '🧬进化物种' },
    { id: 'evo_pop', label: '👥人口职业' },
    { id: 'evo_gov', label: '🏛️政体外交' },
    { id: 'evo_governor', label: '👔总督' }
  ],
  bld: [
    { id: 'bld_city', label: '🏗️城市建筑' },
    { id: 'bld_power', label: '⚡电力队列' },
    { id: 'bld_market', label: '⚖️市场贸易' },
    { id: 'bld_storage', label: '📦仓储箱柜' }
  ],
  tech: [
    { id: 'tech_tree', label: '🔬科技树' },
    { id: 'tech_arpa', label: '🗼ARPA工程' },
    { id: 'tech_gene', label: '🧬基因室' }
  ],
  prestige: [
    { id: 'pres_reset', label: '☢️转生预设' },
    { id: 'pres_crispr', label: '🧬CRISPR池' },
    { id: 'pres_perks', label: '✨天赋主线' }
  ],
  sys: [
    { id: 'sys_logs', label: '📜日志' },
    { id: 'sys_ach', label: '🏆成就士气' },
    { id: 'sys_wiki', label: '📚百科' },
    { id: 'sys_cfg', label: '⚙️主题存档' }
  ]
};

const POWER_SPECS = [
  { id: 'steelMill', name: '钢铁厂', mw: 8, isExtra: false },
  { id: 'cementPlant', name: '水泥厂', mw: 5, isExtra: false },
  { id: 'oilWell', name: '油井', mw: 3, isExtra: false },
  { id: 'refinery', name: '炼油厂', mw: 6, isExtra: false },
  { id: 'factory', name: '工业厂房', mw: 10, isExtra: false },
  { id: 'researchCenter', name: '工业研究中心', mw: 5, isExtra: false },
  { id: 'uraniumMine', name: '铀矿井', mw: 10, isExtra: false },
  { id: 'cleanRoom', name: '无尘室', mw: 15, isExtra: false },
  { id: 'chipFab', name: '光刻代工厂', mw: 20, isExtra: false },
  { id: 'datacenter', name: '云数据中心', mw: 25, isExtra: false },
  { id: 'launchPad', name: '航天发射场', mw: 15, isExtra: false },
  { id: 'helium3Harvester', name: '氦-3开采站', mw: 20, isExtra: false },
  { id: 'apartment', name: '现代公寓', mw: 1, isExtra: true },
  { id: 'wardenclyffe', name: '沃登克里弗塔', mw: 2, isExtra: true },
  { id: 'biolab', name: '生科实验室', mw: 2, isExtra: true },
  { id: 'hospital', name: '医院', mw: 2, isExtra: true },
  { id: 'casino', name: '赌场', mw: 3, isExtra: true },
  { id: 'tourist_center', name: '游客中心', mw: 4, isExtra: true }
];

function getSubTabs(save, mainTab) {
  const fallback = SUB_TABS_FALLBACK[mainTab] || [];
  const w = (save && save.world) || { eraIndex: 0, techs: {} };
  const { arpaMod } = bridge.modules;

  if (mainTab === 'evo') {
    if (w.eraIndex === 0) return [{ id: 'evo_species', label: '🧬进化物种' }];
    return [
      { id: 'evo_pop', label: '👥人口职业' },
      { id: 'evo_gov', label: w.eraIndex >= 2 ? '🏛️政体外交' : '🏛️政府税率' },
      { id: 'evo_governor', label: (arpaMod.isGovernorUnlocked(save) ? '👔' : '🔒') + '总督' }
    ];
  }
  if (mainTab === 'bld') {
    if (w.eraIndex === 0) return [];
    return [
      { id: 'bld_city', label: '🏗️城市建筑' },
      { id: 'bld_power', label: w.techs.electricity ? '⚡电力队列' : '📋建造队列' },
      { id: 'bld_market', label: (w.techs.currency ? '⚖️' : '🔒') + '市场贸易' },
      { id: 'bld_storage', label: '📦仓储箱柜' }
    ];
  }
  if (mainTab === 'tech') {
    if (w.eraIndex === 0) return [];
    const hasArpa = (dl.DATA.arpaProjects || []).some(p => !p.reqTech || !!w.techs[p.reqTech]);
    return [
      { id: 'tech_tree', label: '🔬科技树' },
      { id: 'tech_arpa', label: (hasArpa ? '🗼' : '🔒') + 'ARPA工程' },
      { id: 'tech_gene', label: (arpaMod.isGeneLabUnlocked(save) ? '🧬' : '🔒') + '基因室' }
    ];
  }
  return fallback;
}

function buildCostParts(game, costObj) {
  const w = game.save.world;
  return Object.entries(costObj || {}).map(([rId, amt]) => ({
    id: rId,
    name: game.defs.RES_MAP[rId] ? game.defs.RES_MAP[rId].name : rId,
    val: game.fmt(amt),
    ok: (w.res[rId] || 0) >= amt
  }));
}

function buildSpeciesSummary(game, locked) {
  const w = game.save.world;
  const env = game.envMods || {};
  const curSpec = dl.MAPS.species[w.species] || dl.DATA.species[0];
  const curGenus = dl.MAPS.genera[curSpec.genus] || dl.DATA.genera[0];
  const effTraits = dl.getEffectiveTraits(w);
  const biome = env.biome || dl.MAPS.biomes[w.biome];
  const pt = env.planetTrait || dl.MAPS.planetTraits[w.planetTrait];
  const univ = dl.MAPS.universes[w.universe] || dl.DATA.universes[0];

  return {
    locked,
    specTitle: `${curSpec.icon} ${curSpec.name} · [${curGenus.name}]`,
    envTitle: `${biome.icon} ${biome.name} | ${pt.name} | ${univ.name}`,
    descHome: `${curSpec.desc}（母星：${curSpec.home}）`,
    traits: effTraits.map(tid => {
      const tr = dl.DATA.traits[tid];
      return tr ? { id: tid, name: tr.name, desc: tr.desc, positive: !!tr.positive } : null;
    }).filter(Boolean)
  };
}

function buildPanelViewModel(game, uiState) {
  const w = game.save.world;
  const m = game.metrics;
  const d = game.defs;
  const ctx = game.getBridgeContext();
  const { ecoMod, diploMod, arpaMod } = bridge.modules;
  const mainTab = uiState.activeTab;
  const subId = uiState.activeSubTab;

  if (w.eraIndex === 0 && (mainTab === 'bld' || mainTab === 'tech')) {
    return {
      kind: 'origin_locked',
      title: mainTab === 'bld' ? '🏛️ 当前处于【生命起源】原生质阶段' : '🔬 当前处于【生命起源】原生质阶段',
      desc: mainTab === 'bld'
        ? '请在【生命进化】完成 8 阶段进化并研究【智人诞生】，进入农业文明后解锁全部城市建筑、电网与贸易仓储！'
        : '请在【生命进化】完成生命基因主链，进入农业文明后开启 36 项文明科技树、ARPA 超级工程与基因实验室！'
    };
  }

  if (mainTab === 'evo') {
    if (subId === 'evo_species') {
      const speciesLocked = w.eraIndex >= 1 || !!w.techs.evo_sapiens;
      const gFilter = uiState.genusFilter || 'all';
      const filteredSpecies = gFilter === 'all'
        ? dl.DATA.species
        : dl.DATA.species.filter(s => s.genus === gFilter);

      return {
        kind: 'evo_species',
        speciesLocked,
        summary: buildSpeciesSummary(game, speciesLocked),
        genusFilter: gFilter,
        genera: speciesLocked ? [] : dl.DATA.genera.map(g => ({
          id: g.id,
          icon: g.icon,
          shortName: g.name.slice(0, 2),
          active: gFilter === g.id
        })),
        speciesList: speciesLocked ? [] : filteredSpecies.map(s => ({
          id: s.id,
          icon: s.icon,
          name: s.name,
          desc: s.desc,
          active: w.species === s.id
        })),
        showCells: w.eraIndex === 0,
        cells: w.eraIndex === 0 ? d.EVOLVE_CELL_STRUCTURES_DEF
          .filter(cDef => !cDef.reqEvo || !!w.techs[cDef.reqEvo])
          .map(cDef => {
            const cost = game.getCellStructureCost(cDef);
            return {
              id: cDef.id,
              name: cDef.name,
              level: w.evoCells[cDef.id] || 0,
              desc: cDef.desc,
              costParts: buildCostParts(game, cost),
              afford: game.canAffordCost(cost)
            };
          }) : [],
        evoSapiensDone: !!w.techs.evo_sapiens,
        evoNodes: d.EVO_CHAIN_IDS.map((id, idx) => {
          const tDef = d.TECH_MAP[id];
          const done = !!w.techs[id];
          const reqOk = tDef.req.every(r => !!w.techs[r]);
          const effCost = game.getEffectiveTechCost(tDef);
          return {
            id,
            title: `${idx + 1}. ${tDef.name}`,
            desc: tDef.desc,
            done,
            reqOk,
            reqText: reqOk ? '' : tDef.req.map(r => d.TECH_MAP[r].name).join(', '),
            costParts: (!done && reqOk) ? buildCostParts(game, effCost) : [],
            afford: !done && reqOk && game.canAffordCost(effCost)
          };
        })
      };
    }

    if (subId === 'evo_pop') {
      if (w.eraIndex < 1) {
        return { kind: 'locked_msg', msg: '请先在【进化物种】研究【智人诞生】，开启定居点后再分配人口与职业！' };
      }
      const allJobs = [...d.JOBS_DEF, ...(dl.DATA.extraJobs || [])];
      const assigned = Object.values(w.jobs).reduce((a, c) => a + c, 0);
      const idle = Math.max(0, Math.floor(w.pop) - assigned);
      const vacant = Math.max(0, m.popCap - Math.floor(w.pop));
      const recruitCost = game.getRecruitFoodCost();
      const recruitGain = Math.min(2, vacant);
      return {
        kind: 'evo_pop',
        summary: buildSpeciesSummary(game, true),
        idle,
        totalPop: Math.floor(w.pop),
        popCap: m.popCap,
        growthRateText: `+${m.popGrowthRate.toFixed(2)} 人/秒`,
        growthDetailText: `基础 +${m.popBaseRate.toFixed(2)}/s | 空房引力 +${m.popVacancyBonus.toFixed(2)}/s | 繁荣 ×${m.popProsperityMult.toFixed(1)}`,
        canRecruit: recruitGain > 0 && (w.res.food || 0) >= recruitCost,
        recruitText: vacant <= 0 ? '住房已满' : `📣 吸引流民 (+${recruitGain}人 / ${game.fmt(recruitCost)}食物)`,
        jobs: allJobs.filter(j => game.isJobUnlocked(j.id)).map(j => ({
          id: j.id,
          name: j.name,
          count: w.jobs[j.id] || 0,
          desc: j.desc
        }))
      };
    }

    if (subId === 'evo_gov') {
      if (w.eraIndex < 1) {
        return { kind: 'locked_msg', msg: '进入农业文明后解锁政体体制、税收与邻国外交军事系统！' };
      }
      const govs = dl.DATA.governments || [];
      const curGov = dl.MAPS.governments[w.gov] || govs[0];
      const taxLevels = w.gov === 'oligarchy' ? [0, 10, 20, 30, 40, 50] : [0, 10, 20, 30, 40];
      const revoltWarning = w.taxRate > (w.gov === 'oligarchy' ? 45 : 25) && w.happiness < 90;

      let military = null;
      if (w.eraIndex >= 2) {
        diploMod.ensureDiplomacyFields(w);
        const gar = w.garrison;
        const maxS = diploMod.getMaxSoldiers(ctx);
        const combatPower = diploMod.getCombatRating(ctx, Math.min(gar.soldiers, gar.raidSize));
        const mercCost = diploMod.getMercCost(ctx);
        const tactics = (dl.DATA.foreign && dl.DATA.foreign.tactics) || [];
        const curTac = tactics[gar.tactic] || tactics[1];
        military = {
          soldiers: gar.soldiers,
          maxS,
          wounded: gar.wounded,
          combatPower,
          raidSize: gar.raidSize,
          mercCostText: game.fmt(mercCost),
          canMerc: (w.res.money || 0) >= mercCost && gar.soldiers < maxS,
          tactics: tactics.map(tc => ({ id: tc.id, name: tc.name, active: gar.tactic === tc.id })),
          curTacticDesc: curTac ? curTac.desc : '',
          foreigns: [0, 1, 2].map(i => {
            const g = w.foreign[`gov${i}`];
            const controlled = !!(g.occ || g.anx || g.buy);
            const assess = diploMod.assessBattle(ctx, i);
            const spyCost = diploMod.getSpyTrainCost(ctx, i);
            const buyPrice = Math.round(g.eco * 35 * (g.hstl > 50 ? 1.25 : 1.0));
            return {
              idx: i,
              name: g.name,
              statusTag: g.occ ? '[已占领]' : (g.anx ? '[已吞并]' : (g.buy ? '[已收购]' : '')),
              controlled,
              mil: Math.round(g.mil),
              hstl: g.hstl,
              unrest: g.unrest,
              spy: g.spy,
              spyTrainSec: g.spyTrain > 0 ? Math.ceil(g.spyTrain) : 0,
              assessLabel: assess.label,
              assessCls: assess.cls,
              assessText: `${assess.myPower} vs ${assess.enemyPower}`,
              spyCostText: game.fmt(spyCost),
              buyPriceText: game.fmt(buyPrice),
              canAnnex: g.hstl <= 45 && g.unrest >= 50,
              canBuy: g.spy >= 2 && (w.res.money || 0) >= buyPrice
            };
          })
        };
      }

      return {
        kind: 'evo_gov',
        cityTitle: game.getCityTitle(w.pop),
        taxIncomeText: m.taxIncome.toFixed(1),
        happiness: w.happiness,
        govs: govs.filter(g => !g.reqTech || !!w.techs[g.reqTech]).map(g => ({
          id: g.id,
          name: g.name,
          active: w.gov === g.id
        })),
        curGovName: curGov.name,
        curGovDesc: curGov.desc,
        taxLevels: taxLevels.map(tr => ({ val: tr, active: w.taxRate === tr })),
        revoltWarning,
        eraLockedMilitary: w.eraIndex < 2,
        military
      };
    }

    // evo_governor
    const unlocked = arpaMod.isGovernorUnlocked(game.save);
    if (!unlocked) {
      return { kind: 'evo_governor', unlocked: false };
    }
    const govData = w.governor;
    const appointedBg = govData.appointed ? dl.MAPS.governorBackgrounds[govData.appointed] : null;
    const maxSlots = dl.hasCrispr(game.save, 'civil_service') ? 6 : 3;
    const activeTasks = Object.values(govData.tasks || {}).filter(Boolean).length;
    return {
      kind: 'evo_governor',
      unlocked: true,
      activeTasks,
      maxSlots,
      appointed: appointedBg ? {
        name: appointedBg.name,
        title: appointedBg.title,
        desc: appointedBg.desc,
        effectText: appointedBg.effectText
      } : null,
      candidates: (govData.candidates || []).map(cid => {
        const c = dl.MAPS.governorBackgrounds[cid];
        return c ? {
          id: cid,
          name: c.name,
          title: c.title,
          effectText: c.effectText,
          isCur: govData.appointed === cid
        } : null;
      }).filter(Boolean),
      tasks: (dl.DATA.governorTasks || []).map(tk => ({
        id: tk.id,
        name: tk.name,
        desc: tk.desc,
        on: !!(govData.tasks && govData.tasks[tk.id])
      }))
    };
  }

  if (mainTab === 'bld') {
    if (subId === 'bld_city') {
      const batch = game.batch;
      const allExtras = [...d.EVOLVE_EXTRA_BLDS_DEF, ...(dl.DATA.extraBuildings || [])];
      const extraBlds = allExtras
        .filter(bDef => !bDef.reqTech || !!w.techs[bDef.reqTech])
        .map(bDef => {
          const owned = w.extraBlds[bDef.id] || 0;
          const qty = batch === 'MAX' ? Math.max(1, game.getMaxAffordableBuilding(bDef, true)) : batch;
          const cost = game.getBuildingCost(bDef, qty, true);
          const afford = batch === 'MAX' ? game.getMaxAffordableBuilding(bDef, true) >= 1 : game.canAffordCost(cost);
          return {
            id: bDef.id,
            name: bDef.name,
            owned,
            eraName: d.ERAS_DEF[bDef.era].name,
            desc: bDef.desc,
            qty,
            costParts: buildCostParts(game, cost),
            afford
          };
        });

      const stdBlds = d.BUILDINGS_DEF
        .filter(bDef => !bDef.reqTech || !!w.techs[bDef.reqTech])
        .map(bDef => {
          const owned = w.buildings[bDef.id] || 0;
          const maxed = !!(bDef.maxCount && owned >= bDef.maxCount);
          const qty = maxed ? 0 : (batch === 'MAX' ? Math.max(1, game.getMaxAffordableBuilding(bDef)) : batch);
          const cost = maxed ? {} : game.getBuildingCost(bDef, qty);
          const afford = !maxed && (batch === 'MAX' ? game.getMaxAffordableBuilding(bDef) >= 1 : game.canAffordCost(cost));
          return {
            id: bDef.id,
            name: bDef.name,
            ownedText: `${owned}${bDef.maxCount ? '/' + bDef.maxCount : ''}`,
            eraName: d.ERAS_DEF[bDef.era].name,
            desc: bDef.desc,
            maxed,
            qty,
            costParts: maxed ? [] : buildCostParts(game, cost),
            afford
          };
        });

      return {
        kind: 'bld_city',
        batch,
        batchModes: [
          { val: 1, label: 'x1', active: batch === 1 },
          { val: 10, label: 'x10', active: batch === 10 },
          { val: 25, label: 'x25', active: batch === 25 },
          { val: 'MAX', label: 'MAX', active: batch === 'MAX' }
        ],
        hasElectricity: !!w.techs.electricity,
        powerText: `${m.powerGen.toFixed(0)}/${m.powerReq.toFixed(0)}MW`,
        hasSmelting: !!w.techs.smelting,
        smelterModes: [
          { id: 'wood', label: '木常压(1x)', active: w.smelterMode === 'wood' },
          { id: 'coal', label: '焦煤(1.25x)', active: w.smelterMode === 'coal' },
          { id: 'oil', label: '重油(1.5x)', active: w.smelterMode === 'oil' }
        ],
        craftModes: [
          { id: 'balanced', label: '均衡', active: w.craftFocus === 'balanced' },
          { id: 'plywood', label: '主木板', active: w.craftFocus === 'plywood' },
          { id: 'brick', label: '主砌砖', active: w.craftFocus === 'brick' },
          { id: 'wroughtIron', label: '主锻铁', active: w.craftFocus === 'wroughtIron' }
        ],
        extraBlds,
        stdBlds
      };
    }

    if (subId === 'bld_power') {
      const powerSwitches = [];
      for (const sp of POWER_SPECS) {
        const total = sp.isExtra ? (w.extraBlds[sp.id] || 0) : (w.buildings[sp.id] || 0);
        if (total <= 0) continue;
        const on = ecoMod.getActiveBuildingCount(w, sp.id, sp.isExtra);
        powerSwitches.push({
          kind: sp.isExtra ? 'extra' : 'std',
          id: sp.id,
          name: sp.name,
          mw: sp.mw,
          on,
          total,
          allOn: on === total
        });
      }
      const { bMax, rMax } = ecoMod.getQueueLimits(game.save);
      const allExtra = [...d.EVOLVE_EXTRA_BLDS_DEF, ...(dl.DATA.extraBuildings || [])];
      return {
        kind: 'bld_power',
        powerSummary: `发电 ${m.powerGen.toFixed(0)}MW | 负荷 ${m.powerReq.toFixed(0)}MW | 供电率 ${Math.round((m.powerRatio || 1) * 100)}%`,
        powerSurplusCls: m.powerSurplus >= 0 ? 'text-emerald' : 'text-rose',
        powerSwitches,
        bMax,
        rMax,
        queuePaused: !!w.queuePaused,
        buildQueue: (w.buildQueue || []).map((item, idx) => {
          const bDef = item.isExtra
            ? allExtra.find(x => x.id === item.id)
            : d.BUILDINGS_DEF.find(x => x.id === item.id);
          return { idx, name: bDef ? bDef.name : item.id };
        }),
        researchQueue: (w.researchQueue || []).map((tid, idx) => {
          const tDef = d.TECH_MAP[tid];
          return { idx, name: tDef ? tDef.name : tid };
        })
      };
    }

    if (subId === 'bld_market') {
      if (!w.techs.currency) {
        return { kind: 'bld_market', unlockedCurrency: false };
      }
      const trStats = ecoMod.getTradeRouteStats(ctx);
      const items = [];
      for (const r of d.RESOURCES_DEF) {
        if (!w.unlockedRes[r.id]) continue;
        const quote = ecoMod.getMarketQuote(ctx, r.id);
        if (!quote) continue;
        const rt = (w.market.routes && w.market.routes[r.id]) || 0;
        items.push({
          id: r.id,
          name: r.name,
          stockText: game.fmt(w.res[r.id] || 0),
          buyPrice: quote.buyPrice,
          sellPrice: quote.sellPrice,
          route: rt,
          routeText: rt > 0 ? `+${rt}` : String(rt),
          routeCls: rt > 0 ? 'text-sky' : (rt < 0 ? 'text-amber' : 'text-muted')
        });
      }
      return {
        kind: 'bld_market',
        unlockedCurrency: true,
        trUnlocked: trStats.unlocked,
        usedRoutes: trStats.usedRoutes,
        maxRoutes: trStats.maxRoutes,
        qtys: [1, 10, 100, 1000].map(q => ({ val: q, active: w.market.qty === q })),
        items
      };
    }

    // bld_storage
    if (w.eraIndex < 1) {
      return { kind: 'locked_msg', msg: '进入农业文明后解锁板条箱与集装箱自由扩容仓储！' };
    }
    const st = ecoMod.getStorageStats(ctx);
    const items = [];
    for (const r of d.RESOURCES_DEF) {
      if (!w.unlockedRes[r.id]) continue;
      if (r.id === 'rna' || r.id === 'dna' || r.id === 'knowledge' || r.id === 'money') continue;
      items.push({
        id: r.id,
        name: r.name,
        capText: game.fmt(m.caps[r.id] || r.baseCap),
        crates: (w.storage.assignedCrates && w.storage.assignedCrates[r.id]) || 0,
        containers: (w.storage.assignedContainers && w.storage.assignedContainers[r.id]) || 0
      });
    }
    return {
      kind: 'bld_storage',
      st,
      crateCostText: w.techs.smelting ? '10 木板' : '25 木材',
      steelUnlocked: !!w.techs.steel,
      items
    };
  }

  if (mainTab === 'tech') {
    if (subId === 'tech_tree') {
      const hideDone = game.hideDoneTechs;
      const maxEraView = dl.hasCrispr(game.save, 'precognition') ? w.eraIndex + 2 : w.eraIndex + 1;
      const civTechs = d.TECHS_DEF.filter(t => t.era >= 1);
      const doneCnt = civTechs.filter(t => !!w.techs[t.id]).length;
      const visibleTechs = civTechs.filter(tDef => {
        const done = !!w.techs[tDef.id];
        if (done && hideDone) return false;
        if (tDef.era > maxEraView && !done) return false;
        return true;
      });
      visibleTechs.sort((a, b) => (w.techs[a.id] ? 1 : 0) - (w.techs[b.id] ? 1 : 0));

      return {
        kind: 'tech_tree',
        doneCnt,
        totalCnt: civTechs.length,
        hideDone,
        items: visibleTechs.map(tDef => {
          const done = !!w.techs[tDef.id];
          const reqOk = tDef.req.every(r => !!w.techs[r]);
          const effCost = game.getEffectiveTechCost(tDef);
          return {
            id: tDef.id,
            name: tDef.name,
            eraName: d.ERAS_DEF[tDef.era].name,
            desc: tDef.desc,
            done,
            reqOk,
            reqText: reqOk ? '' : tDef.req.map(r => d.TECH_MAP[r].name).join(' + '),
            costParts: (!done && reqOk) ? buildCostParts(game, effCost) : [],
            afford: !done && reqOk && game.canAffordCost(effCost),
            inQueue: (w.researchQueue || []).includes(tDef.id)
          };
        })
      };
    }

    if (subId === 'tech_arpa') {
      const list = dl.DATA.arpaProjects || [];
      const unlocked = list.filter(p => !p.reqTech || !!w.techs[p.reqTech]);
      return {
        kind: 'tech_arpa',
        hasUnlocked: unlocked.length > 0,
        projects: unlocked.map(p => {
          const st = w.arpa[p.id] || { rank: 0, progress: 0, variantIdx: 0 };
          const maxed = !!(p.maxRank && st.rank >= p.maxRank);
          const totalCost = arpaMod.getArpaTotalCost(ctx, p);
          const title = p.variants ? `${p.name} (${p.variants[st.variantIdx % p.variants.length]})` : p.name;
          return {
            id: p.id,
            title,
            rank: st.rank,
            maxRankText: p.maxRank ? '/' + p.maxRank : '',
            pct: Math.round(st.progress),
            desc: p.desc,
            effectText: p.effectText,
            maxed,
            totalCostParts: maxed ? [] : buildCostParts(game, totalCost),
            steps: maxed ? [] : [1, 10, 25, 100].map(pct => {
              const { stepCost } = arpaMod.getArpaStepCost(ctx, p, pct);
              return { pct, afford: game.canAffordCost(stepCost) };
            })
          };
        })
      };
    }

    // tech_gene
    const unlocked = arpaMod.isGeneLabUnlocked(game.save);
    if (!unlocked) {
      return { kind: 'tech_gene', unlocked: false };
    }
    const gl = w.geneLab;
    const pct = Math.min(100, Math.round((gl.seqProgress / Math.max(1, gl.seqMax)) * 100));
    const canMut = dl.hasCrispr(game.save, 'mutation');
    const negTraits = dl.getEffectiveTraits(w)
      .filter(tid => dl.DATA.traits[tid] && !dl.DATA.traits[tid].positive)
      .map(tid => ({ id: tid, name: dl.DATA.traits[tid].name, canRemove: canMut && gl.genes >= 3 }));
    const minorTraits = (dl.DATA.minorTraits || [])
      .filter(mt => !mt.reqCrispr || dl.hasCrispr(game.save, mt.reqCrispr))
      .map(mt => {
        const lv = (w.minorTraits && w.minorTraits[mt.id]) || 0;
        const cost = lv + 1;
        return {
          id: mt.id,
          name: mt.name,
          lv,
          desc: mt.desc,
          cost,
          afford: gl.genes >= cost
        };
      });

    return {
      kind: 'tech_gene',
      unlocked: true,
      genes: gl.genes,
      seqActive: !!gl.seqActive,
      seqBoost: !!gl.seqBoost,
      seqProgress: Math.floor(gl.seqProgress),
      seqMax: gl.seqMax,
      seqPct: pct,
      canMut,
      negTraits,
      minorTraits
    };
  }

  if (mainTab === 'prestige') {
    if (subId === 'pres_reset') {
      const pre = game.save.prestige.nextPreset || { biome: 'grassland', planetTrait: 'none', universe: 'standard', species: 'human' };
      const preSpec = dl.MAPS.species[pre.species] || dl.DATA.species[0];
      const preUniv = dl.MAPS.universes[pre.universe] || dl.DATA.universes[0];
      const preBiome = dl.MAPS.biomes[pre.biome] || dl.DATA.biomes[0];
      const prePt = dl.MAPS.planetTraits[pre.planetTrait] || dl.DATA.planetTraits[0];
      return {
        kind: 'pres_reset',
        madCount: game.save.prestige.madCount || 0,
        rapidMutation: !!game.save.prestige.rapidMutation,
        ancientRuins: !!game.save.prestige.ancientRuins,
        canMad: game.canMadResetNow(),
        madArmed: !!w.madArmed,
        madGain: game.calcMadPlasmidGain(),
        lifetimeShards: game.save.prestige.lifetimeShards,
        genesisShards: game.save.prestige.genesisShards,
        phage: game.save.prestige.phage || 0,
        canP: game.canPrestigeNow(),
        gain: game.calcPrestigeGain(),
        phageGain: game.calcPhageGain(),
        preset: {
          universe: pre.universe,
          biome: pre.biome,
          planetTrait: pre.planetTrait,
          species: pre.species,
          curSpecIcon: preSpec.icon,
          curSpecName: preSpec.name,
          curSpecDesc: preSpec.desc,
          curUnivEffect: `${preUniv.name}：${preUniv.effect}`,
          curBiomeEffects: `${preBiome.name}：${preBiome.effectsText}`,
          curPtDesc: `${prePt.name}：${prePt.desc}`
        },
        universes: dl.DATA.universes.map(u => ({ id: u.id, icon: u.icon, name: u.name, active: pre.universe === u.id })),
        biomes: dl.DATA.biomes.map(b => ({ id: b.id, icon: b.icon, name: b.name, active: pre.biome === b.id })),
        planetTraits: dl.DATA.planetTraits.map(pt => ({ id: pt.id, name: pt.name, active: pre.planetTrait === pt.id })),
        speciesList: dl.DATA.species.map(s => ({ id: s.id, icon: s.icon, name: s.name, active: pre.species === s.id }))
      };
    }

    if (subId === 'pres_crispr') {
      const shards = game.save.prestige.genesisShards || 0;
      const crisprMap = game.save.prestige.crispr || {};
      const unlockedCnt = Object.values(crisprMap).filter(Boolean).length;
      return {
        kind: 'pres_crispr',
        unlockedCnt,
        totalCnt: dl.DATA.crisprUpgrades.length,
        shardsText: game.fmt(shards),
        items: dl.DATA.crisprUpgrades.map(upg => {
          const done = !!crisprMap[upg.id];
          const reqOk = (upg.req || []).every(r => !!crisprMap[r]);
          return {
            id: upg.id,
            name: upg.name,
            desc: upg.desc,
            done,
            reqOk,
            reqNames: reqOk ? '' : (upg.req || []).map(r => (dl.MAPS.crisprUpgrades[r] ? dl.MAPS.crisprUpgrades[r].name : r)).join(' + '),
            cost: upg.cost,
            afford: !done && reqOk && shards >= upg.cost
          };
        })
      };
    }

    // pres_perks
    const showAll = !!uiState.showAllMissions;
    const startIdx = showAll ? 0 : Math.max(0, w.missionIndex - 2);
    const endIdx = showAll ? d.MISSIONS_DEF.length : Math.min(d.MISSIONS_DEF.length, w.missionIndex + 6);
    const missions = [];
    for (let i = startIdx; i < endIdx; i++) {
      const ms = d.MISSIONS_DEF[i];
      missions.push({
        id: ms.id,
        name: ms.name,
        desc: ms.desc,
        rewardText: ms.rewardText,
        isDone: i < w.missionIndex,
        isCur: i === w.missionIndex
      });
    }
    return {
      kind: 'pres_perks',
      perks: d.PERKS_DEF.map(p => {
        const lv = game.getPerkLevel(p.id);
        const maxed = lv >= 5;
        const cost = maxed ? 0 : p.costs[lv];
        return {
          id: p.id,
          icon: p.icon,
          name: p.name,
          lv,
          desc: p.desc,
          maxed,
          cost,
          afford: !maxed && (game.save.prestige.genesisShards || 0) >= cost
        };
      }),
      missionIndex: w.missionIndex,
      showAllMissions: showAll,
      missions
    };
  }

  // sys
  if (subId === 'sys_logs') {
    const cat = uiState.logCatFilter || 'all';
    const logs = w.logs || [];
    const filtered = cat === 'all' ? logs : logs.filter(l => l.cat === cat);
    return {
      kind: 'sys_logs',
      logCatFilter: cat,
      filters: [
        { id: 'all', name: '全部' },
        { id: 'progress', name: '进度' },
        { id: 'events', name: '事件' },
        { id: 'combat', name: '战斗谍报' },
        { id: 'achievements', name: '成就' }
      ].map(f => ({ ...f, active: f.id === cat })),
      logs: filtered.slice(0, 60).map((item, idx) => ({ ...item, idx }))
    };
  }

  if (subId === 'sys_ach') {
    const achs = (game.save.prestige && game.save.prestige.achievements) || {};
    const doneCnt = dl.DATA.achievements.filter(a => !!achs[a.id]).length;
    const env = game.envMods || {};
    return {
      kind: 'sys_ach',
      moraleBreakdown: m.moraleBreakdown,
      doneCnt,
      totalCnt: dl.DATA.achievements.length,
      masteryPctText: (env.masteryPct || 0).toFixed(1),
      unlockedCrispr: dl.hasCrispr(game.save, 'unlocked'),
      achievements: dl.DATA.achievements.map(a => ({
        id: a.id,
        name: a.name,
        category: a.category,
        desc: a.desc,
        mastery: a.mastery,
        got: !!achs[a.id]
      }))
    };
  }

  if (subId === 'sys_wiki') {
    const env = game.envMods || {};
    const zodiac = env.zodiac || dl.getZodiacSign();
    const moon = env.moon || { icon: '🌑', name: '新月', bonusText: '' };
    const wikiResources = d.RESOURCES_DEF.filter(r => w.eraIndex === 0 || (r.id !== 'rna' && r.id !== 'dna'));
    return {
      kind: 'sys_wiki',
      summary: buildSpeciesSummary(game, w.eraIndex >= 1 || !!w.techs.evo_sapiens),
      biomeName: env.biome ? env.biome.name : '',
      biomeDesc: env.biome ? env.biome.desc : '',
      biomeEffects: env.biome ? env.biome.effectsText : '',
      ptName: env.planetTrait ? env.planetTrait.name : '',
      ptDesc: env.planetTrait ? env.planetTrait.desc : '',
      moonIcon: moon.icon,
      moonName: moon.name,
      moonBonus: moon.bonusText,
      zodiacSymbol: zodiac.symbol,
      zodiacName: zodiac.name,
      zodiacDesc: zodiac.desc,
      resTitle: `📦 ${wikiResources.length} 种${w.eraIndex >= 1 ? '文明' : '全文明'}资源百科与上限明细`,
      resources: wikiResources.map(r => {
        const unlocked = !!w.unlockedRes[r.id];
        const val = w.res[r.id] || 0;
        const cap = m.caps[r.id] || r.baseCap;
        const net = m.netRates[r.id] || 0;
        return {
          id: r.id,
          name: r.name,
          eraName: d.ERAS_DEF[r.era].name,
          unlocked,
          valText: game.fmt(val),
          capText: game.fmt(cap),
          rateText: game.fmtRate(net),
          rateCls: net > 0 ? 'text-emerald' : (net < 0 ? 'text-rose' : 'text-muted')
        };
      })
    };
  }

  // sys_cfg
  const s = game.save.settings || {};
  return {
    kind: 'sys_cfg',
    sound: !!s.sound,
    crt: !!s.crt,
    boring: !!s.boring,
    numFormat: s.numFormat || 'metric',
    numFormats: [
      { id: 'metric', name: '公制 (K/M/G)' },
      { id: 'scientific', name: '科学计数法' },
      { id: 'engineering', name: '工程计数法' }
    ].map(f => ({ ...f, active: (s.numFormat || 'metric') === f.id })),
    theme: s.theme || 'pixel',
    themes: (dl.DATA.themes || []).map(th => ({ id: th.id, name: th.name, active: (s.theme || 'pixel') === th.id }))
  };
}

/**
 * 构建整页视图数据模型
 * @param {object} game 游戏引擎实例
 * @param {object} uiState UI 状态 { activeTab, activeSubTab, genusFilter, logCatFilter, showAllMissions }
 * @returns {object}
 */
function buildViewModel(game, uiState) {
  const w = game.save.world;
  const m = game.metrics;
  const d = game.defs;
  const era = d.ERAS_DEF[w.eraIndex] || d.ERAS_DEF[0];
  const env = game.envMods || {};
  const cal = w.calendar || { year: 0, day: 1, season: 0, weather: 0, moon: 0 };

  const curSpec = dl.MAPS.species[w.species] || d.EVOLVE_SPECIES_DEF[0];
  const bonusPct = Math.round((game.getShardMultiplier() - 1) * 100);
  const mIdx = w.missionIndex;
  const curMission = mIdx < d.MISSIONS_DEF.length ? d.MISSIONS_DEF[mIdx] : null;

  const season = env.season || dl.DATA.seasons[cal.season] || { icon: '🌸', name: '春天' };
  const weather = env.weather || dl.DATA.weathers[cal.weather] || { icon: '☀️', name: '晴朗' };
  const moon = env.moon || dl.DATA.moons[cal.moon] || { icon: '🌑', name: '新月' };
  const zodiac = env.zodiac || dl.getZodiacSign();
  const biome = env.biome || dl.MAPS.biomes[w.biome] || { icon: '🌾', name: '草原' };
  const univ = dl.MAPS.universes[w.universe] || { name: '标准宇宙' };

  const header = {
    eraIcon: era.icon,
    eraStep: `时代 ${w.eraIndex + 1}/7`,
    eraName: era.name,
    showCityTitle: w.eraIndex >= 1,
    cityTitle: w.eraIndex >= 1 ? `[${game.getCityTitle(w.pop)}]` : '',
    showSpeciesBadge: w.eraIndex >= 1,
    speciesBadge: w.eraIndex >= 1 ? `${curSpec.icon}${curSpec.name.split(' ')[0]}` : '',
    showPopBox: w.eraIndex >= 1,
    popText: `${Math.floor(w.pop)}/${m.popCap}`,
    happyText: `${w.happiness}%`,
    kpi1Label: w.eraIndex === 0 ? 'RNA' : '食物',
    kpi1Val: w.eraIndex === 0
      ? `${game.fmt(w.res.rna)}/${game.fmt(m.caps.rna)}`
      : `${game.fmt(w.res.food)}/${game.fmt(m.caps.food)}`,
    kpi2Label: w.eraIndex === 0 ? 'DNA' : '知识',
    kpi2Val: w.eraIndex === 0
      ? `${game.fmt(w.res.dna)}/${game.fmt(m.caps.dna)}`
      : `${game.fmt(w.res.knowledge)}/${game.fmt(m.caps.knowledge)}`,
    shardBonusText: `+${bonusPct}%`,
    shardsText: game.fmt(game.save.prestige.genesisShards || 0),
    missionId: curMission ? `[${curMission.id}]` : '[通关]',
    missionText: curMission ? `${curMission.name}：${curMission.desc}` : '全部 51 项主线任务已完成！可随时启动方舟跃迁！',
    missionProg: `${mIdx}/51`,
    weatherOrigin: w.eraIndex === 0,
    weatherBiome: `${biome.icon} ${biome.name}星`,
    weatherUniv: univ.name,
    weatherZodiac: `${zodiac.symbol} ${zodiac.name}`,
    weatherDate: `📅 ${cal.year}年${cal.day}日`,
    weatherSeason: `${season.icon}${season.name}`,
    weatherCond: `${weather.icon}${weather.name}`,
    weatherMoon: `${moon.icon}${moon.name}`,
    showWeatherPower: w.eraIndex >= 1 && !!w.techs.electricity,
    weatherPowerText: `⚡${m.powerSurplus >= 0 ? '+' : ''}${Math.round(m.powerSurplus)}MW`,
    weatherPowerCls: m.powerSurplus >= 0 ? 'text-emerald' : 'text-rose',
    showWeatherMastery: w.eraIndex >= 1 && dl.hasCrispr(game.save, 'unlocked'),
    weatherMasteryText: `🏆精通+${(env.masteryPct || 0).toFixed(1)}%`
  };

  let actTitle = era.actionBtn.title;
  let actDisabled = false;
  let actSub;
  if (w.eraIndex === 0) {
    if (w.techs.evo_membrane) {
      const dnaGain = game.save.prestige.rapidMutation ? 2 : 1;
      actTitle = `🧬 合成 DNA (2RNA→${dnaGain})`;
      actDisabled = (w.res.rna || 0) < 2;
    }
    actSub = `RNA:${game.fmt(w.res.rna)}/${m.caps.rna} | DNA:${game.fmt(w.res.dna)}/${m.caps.dna}`;
  } else if (w.eraIndex === 1) {
    actSub = `木:${game.fmt(w.res.lumber)} 石:${game.fmt(w.res.stone)} 知:${game.fmt(w.res.knowledge)}`;
  } else {
    actSub = `币:${game.fmt(w.res.money)} 知:${game.fmt(w.res.knowledge)}`;
  }

  let nextTitle;
  let nextSub;
  let nextCls;
  let nextDisabled;
  if (game.canMadResetNow() && w.eraIndex < 6) {
    nextTitle = `☢️ 核弹重置就绪 (+${game.calcMadPlasmidGain()}余烬)`;
    nextSub = '点击前往【核爆/跃迁】发射核弹或继续冲刺太空';
    nextCls = 'bg-rose';
    nextDisabled = false;
  } else if (w.eraIndex < d.ERAS_DEF.length - 1) {
    nextTitle = `下一时代: ${d.ERAS_DEF[w.eraIndex + 1].name}`;
    nextSub = era.nextReqText;
    nextCls = 'bg-slate';
    nextDisabled = true;
  } else {
    const canP = game.canPrestigeNow();
    nextTitle = canP ? '🚀 启动恒星际跃迁' : '终局时代: 太空文明';
    nextSub = canP ? `可获得 +${game.calcPrestigeGain()} 创世余烬` : era.nextReqText;
    nextCls = canP ? 'bg-purple' : 'bg-slate';
    nextDisabled = !canP;
  }

  const stage = {
    caption: w.eraIndex === 0 ? '+RNA' : (w.eraIndex === 1 ? '+食物/木/知' : '+时代资源'),
    lore: era.desc,
    clicks: w.clicks || 0,
    actTitle,
    actSub,
    actCls: era.actionBtn.color,
    actDisabled,
    nextTitle,
    nextSub,
    nextCls,
    nextDisabled
  };

  const totalResCount = w.eraIndex >= 1 ? d.RESOURCES_DEF.length - 2 : d.RESOURCES_DEF.length;
  const leftRes = [];
  for (const r of d.RESOURCES_DEF) {
    const isRetiredBio = w.eraIndex >= 1 && (r.id === 'rna' || r.id === 'dna');
    if (isRetiredBio || !w.unlockedRes[r.id]) continue;
    const val = w.res[r.id] || 0;
    const cap = m.caps[r.id] || r.baseCap;
    const net = m.netRates[r.id] || 0;
    let etaText = '平衡';
    if (net > 0.05 && val < cap) {
      const sec = Math.ceil((cap - val) / net);
      etaText = sec > 9999 ? '满:>9999s' : `满:${sec}s`;
    } else if (net < -0.05 && val > 0) {
      etaText = `空:${Math.ceil(val / Math.abs(net))}s`;
    }
    leftRes.push({
      id: r.id,
      name: r.name,
      valText: `${game.fmt(val)}/${game.fmt(cap)}`,
      rateText: game.fmtRate(net),
      rateCls: net > 0.05 ? 'text-emerald' : (net < -0.05 ? 'text-rose' : 'text-muted'),
      etaText
    });
  }

  const canEvo = d.EVO_CHAIN_IDS.some(id => {
    const t = d.TECH_MAP[id];
    return !w.techs[id] && t.req.every(r => !!w.techs[r]) && game.canAffordCost(game.getEffectiveTechCost(t));
  }) || (w.eraIndex === 0 && d.EVOLVE_CELL_STRUCTURES_DEF.some(c =>
    (!c.reqEvo || w.techs[c.reqEvo]) && game.canAffordCost(game.getCellStructureCost(c))
  ));
  const assigned = Object.values(w.jobs).reduce((a, c) => a + c, 0);
  const hasIdle = w.eraIndex >= 1 && (Math.floor(w.pop) - assigned) > 0;
  const canTech = d.TECHS_DEF.some(t =>
    t.era >= 1 && !w.techs[t.id] && t.era <= w.eraIndex && t.req.every(r => !!w.techs[r]) && game.canAffordCost(game.getEffectiveTechCost(t))
  );
  const allExtraDefs = [...d.EVOLVE_EXTRA_BLDS_DEF, ...(dl.DATA.extraBuildings || [])];
  const canBld = d.BUILDINGS_DEF.some(b =>
    (!b.reqTech || w.techs[b.reqTech]) && (!b.maxCount || (w.buildings[b.id] || 0) < b.maxCount) && game.canAffordCost(game.getBuildingCost(b, 1))
  ) || allExtraDefs.some(b =>
    (!b.reqTech || w.techs[b.reqTech]) && (!b.maxCount || (w.extraBlds[b.id] || 0) < b.maxCount) && game.canAffordCost(game.getBuildingCost(b, 1, true))
  );

  const subList = getSubTabs(game.save, uiState.activeTab);
  let activeSub = uiState.activeSubTab;
  if (!subList.some(s => s.id === activeSub)) {
    activeSub = subList[0] ? subList[0].id : '';
  }
  const effectiveUi = { ...uiState, activeSubTab: activeSub };
  const themeCfg = dl.getThemeConfig(game.save.settings && game.save.settings.theme);

  return {
    themeVarsStyle: themeCfg.varsStyle,
    isLightTheme: themeCfg.isLight,
    crtEnabled: !!(game.save.settings && game.save.settings.crt),
    themeBgMain: themeCfg.bgMain,
    header,
    stage,
    leftResCount: `已解锁 ${leftRes.length}/${totalResCount}`,
    leftRes,
    activeTab: uiState.activeTab,
    evoTabIcon: w.eraIndex === 0 ? '🧬' : '👥',
    evoTabLabel: w.eraIndex === 0 ? '生命进化' : '人口/内政',
    badges: {
      evo: canEvo || hasIdle,
      bld: canBld,
      tech: canTech,
      prestige: game.canPrestigeNow() || game.canMadResetNow()
    },
    subTabs: subList.map(s => ({ id: s.id, label: s.label, active: s.id === activeSub })),
    activeSubTab: activeSub,
    panel: buildPanelViewModel(game, effectiveUi)
  };
}

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/**
 * 路径级最小化 Diff：仅返回变化字段的 wx setData 路径映射，避免全量序列化传输卡顿
 * @param {object|null} prev
 * @param {object} next
 * @returns {object}
 */
function diffViewModel(prev, next) {
  const out = {};
  if (!prev || typeof prev !== 'object') {
    return Object.assign({}, next);
  }

  function walk(p, n, path) {
    if (Object.is(p, n)) return;
    if (Array.isArray(n)) {
      if (!Array.isArray(p) || p.length !== n.length) {
        out[path] = n;
        return;
      }
      for (let i = 0; i < n.length; i++) {
        walk(p[i], n[i], `${path}[${i}]`);
      }
      return;
    }
    if (isPlainObject(n)) {
      if (!isPlainObject(p) || (n.kind !== undefined && p.kind !== n.kind)) {
        out[path] = n;
        return;
      }
      const pKeys = Object.keys(p);
      const nKeys = Object.keys(n);
      if (pKeys.length !== nKeys.length) {
        out[path] = n;
        return;
      }
      for (const k of nKeys) {
        if (!Object.prototype.hasOwnProperty.call(p, k)) {
          out[path] = n;
          return;
        }
      }
      for (const k of nKeys) {
        walk(p[k], n[k], path ? `${path}.${k}` : k);
      }
      return;
    }
    out[path] = n;
  }

  for (const k of Object.keys(next)) {
    walk(prev[k], next[k], k);
  }
  return out;
}

module.exports = {
  SUB_TABS_FALLBACK,
  getSubTabs,
  buildViewModel,
  diffViewModel
};
