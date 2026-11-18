(function (root) {
  'use strict';

  /**
   * Evolve 增强界面渲染与事件调度模块
   * 适配 PC 宽屏双栏与移动端 320px/375px 单屏锁定布局
   */

  function getBridge() {
    if (root && root.EvolveModules && root.EvolveModules.Bridge) {
      return root.EvolveModules.Bridge;
    }
    return require('./evolve-bridge.js');
  }

  const SUB_TABS = {
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

  let activeSubTabs = {
    evo: 'evo_species',
    bld: 'bld_city',
    tech: 'tech_tree',
    prestige: 'pres_reset',
    sys: 'sys_logs'
  };
  let selectedGenusFilter = 'all';
  let logCatFilter = 'all';
  let showAllMissions = false;

  function getSubTabs(host, mainTab) {
    const fallback = SUB_TABS[mainTab] || [];
    if (!host || typeof host.getSave !== 'function') return fallback;
    const bridge = getBridge();
    const { dl, arpaMod } = bridge.modules;
    const save = host.getSave();
    const w = (save && save.world) || { eraIndex: 0, techs: {} };

    if (mainTab === 'evo') {
      if (w.eraIndex === 0) {
        return [{ id: 'evo_species', label: '🧬进化物种' }];
      }
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

  function getActiveSubTab(mainTab, host) {
    const list = getSubTabs(host, mainTab);
    const cur = activeSubTabs[mainTab];
    if (list.some(s => s.id === cur)) return cur;
    const first = list[0] ? list[0].id : '';
    if (first) activeSubTabs[mainTab] = first;
    return first;
  }

  function setSubTab(mainTab, subId) {
    activeSubTabs[mainTab] = subId;
  }

  /**
   * 渲染顶部历法/气象/月相/星座/电力紧凑指示栏
   */
  function updateTopWeatherBar(host) {
    const bar = document.getElementById('hdr-weather-strip');
    if (!bar) return;
    const bridge = getBridge();
    const { dl } = bridge.modules;
    const w = host.getSave().world;
    const env = host.getEnvMods ? host.getEnvMods() : {};
    const cal = w.calendar || { year: 0, day: 1, season: 0, weather: 0, moon: 0 };

    const season = env.season || dl.DATA.seasons[cal.season] || { icon: '🌸', name: '春天' };
    const weather = env.weather || dl.DATA.weathers[cal.weather] || { icon: '☀️', name: '晴朗' };
    const moon = env.moon || dl.DATA.moons[cal.moon] || { icon: '🌑', name: '新月' };
    const zodiac = env.zodiac || dl.getZodiacSign();
    const biome = env.biome || dl.MAPS.biomes[w.biome] || { icon: '🌾', name: '草原' };
    const univ = dl.MAPS.universes[w.universe] || { name: '标准宇宙' };
    const m = host.getMetrics();

    if (w.eraIndex === 0) {
      bar.innerHTML = `
        <span>${biome.icon} ${biome.name}星</span>
        <span>·</span>
        <span>${univ.name}</span>
        <span>·</span>
        <span title="${zodiac.desc}">${zodiac.symbol} ${zodiac.name}</span>
        <span>·</span>
        <span class="text-purple">🧬 原初汤演化中</span>
      `;
    } else {
      const pText = w.techs.electricity
        ? `<span class="${m.powerSurplus >= 0 ? 'text-emerald' : 'text-rose'}">⚡${m.powerSurplus >= 0 ? '+' : ''}${Math.round(m.powerSurplus)}MW</span>`
        : '';
      const masterText = dl.hasCrispr(host.getSave(), 'unlocked')
        ? `<span class="text-amber">🏆精通+${(env.masteryPct || 0).toFixed(1)}%</span>` : '';
      bar.innerHTML = `
        <span>📅 ${cal.year}年${cal.day}日</span>
        <span>${season.icon}${season.name}</span>
        <span>${weather.icon}${weather.name}</span>
        <span title="${moon.bonusText}">${moon.icon}${moon.name}</span>
        <span title="${zodiac.desc}">${zodiac.symbol}${zodiac.name}</span>
        ${pText}
        ${masterText}
      `;
    }
  }

  /**
   * 渲染子标签导航栏
   */
  function renderSubTabBar(host, mainTab) {
    const bar = document.getElementById('subtab-bar');
    if (!bar) return;
    const list = getSubTabs(host, mainTab);
    if (list.length === 0) {
      bar.innerHTML = '';
      bar.style.display = 'none';
      return;
    }
    bar.style.display = '';
    const cur = getActiveSubTab(mainTab, host);
    bar.innerHTML = list.map(s => `
      <button type="button" class="subtab-btn ${s.id === cur ? 'active' : ''}" data-subtab="${s.id}">
        ${s.label}
      </button>
    `).join('');
  }

  function fmtCostHtml(host, costObj) {
    const w = host.getSave().world;
    return Object.entries(costObj || {}).map(([rId, amt]) => {
      const have = w.res[rId] || 0;
      const cls = have >= amt ? 'text-emerald' : 'text-rose';
      return `<span class="${cls}">${host.getResName(rId)}:${host.fmt(amt)}</span>`;
    }).join(' ');
  }

  /**
   * 渲染当前主 Tab 下的完整子面板
   */
  function renderSubTabContent(host, container, mainTab) {
    const bridge = getBridge();
    const { dl, ecoMod, diploMod, arpaMod } = bridge.modules;
    const ctx = bridge.createContext(host);
    const save = ctx.save;
    const w = save.world;
    const subId = getActiveSubTab(mainTab, host);

    if (w.eraIndex === 0 && (mainTab === 'bld' || mainTab === 'tech')) {
      container.innerHTML = `
        <div class="pixel-card flex flex-col items-center gap-3 text-center" style="padding:22px 14px;">
          <div class="font-bold text-amber text-xs">${mainTab === 'bld' ? '🏛️ 当前处于【生命起源】原生质阶段' : '🔬 当前处于【生命起源】原生质阶段'}</div>
          <div class="text-11 text-muted">${mainTab === 'bld' ? '请在【生命进化】完成 8 阶段进化并研究【智人诞生】，进入农业文明后解锁全部城市建筑、电网与贸易仓储！' : '请在【生命进化】完成生命基因主链，进入农业文明后开启 36 项文明科技树、ARPA 超级工程与基因实验室！'}</div>
          <button type="button" class="pixel-btn bg-emerald text-11 font-bold" style="padding:6px 14px;" data-goto-tab="evo:evo_species">🧬 前往【生命进化】</button>
        </div>
      `;
      return;
    }

    if (mainTab === 'evo') {
      if (subId === 'evo_species') renderEvoSpecies(host, ctx, container);
      else if (subId === 'evo_pop') renderEvoPopJobs(host, ctx, container);
      else if (subId === 'evo_gov') renderEvoGovDiplo(host, ctx, container);
      else renderEvoGovernor(host, ctx, container);
      return;
    }

    if (mainTab === 'bld') {
      if (subId === 'bld_city') renderBldCity(host, ctx, container);
      else if (subId === 'bld_power') renderBldPowerQueue(host, ctx, container);
      else if (subId === 'bld_market') renderBldMarket(host, ctx, container);
      else renderBldStorage(host, ctx, container);
      return;
    }

    if (mainTab === 'tech') {
      if (subId === 'tech_tree') renderTechTree(host, ctx, container);
      else if (subId === 'tech_arpa') renderTechArpa(host, ctx, container);
      else renderTechGeneLab(host, ctx, container);
      return;
    }

    if (mainTab === 'prestige') {
      if (subId === 'pres_reset') renderPrestigeReset(host, ctx, container);
      else if (subId === 'pres_crispr') renderPrestigeCrispr(host, ctx, container);
      else renderPrestigePerksMissions(host, ctx, container);
      return;
    }

    if (mainTab === 'sys') {
      if (subId === 'sys_logs') renderSysLogs(host, ctx, container);
      else if (subId === 'sys_ach') renderSysAchievesMorale(host, ctx, container);
      else if (subId === 'sys_wiki') renderSysWiki(host, ctx, container);
      else renderSysConfig(host, ctx, container);
    }
  }

  /**
   * 构建当前星系环境与物种基因概览卡片（进化前可调整物种，进化完成后锁定只读）
   */
  function buildSpeciesEnvSummaryCard(ctx, locked) {
    const { dl } = ctx;
    const w = ctx.save.world;
    const env = ctx.envMods || {};
    const curSpec = dl.MAPS.species[w.species] || dl.DATA.species[0];
    const curGenus = dl.MAPS.genera[curSpec.genus] || dl.DATA.genera[0];
    const effTraits = dl.getEffectiveTraits(w);
    const biome = env.biome || dl.MAPS.biomes[w.biome];
    const pt = env.planetTrait || dl.MAPS.planetTraits[w.planetTrait];
    const univ = dl.MAPS.universes[w.universe] || dl.DATA.universes[0];

    const envCard = document.createElement('div');
    envCard.className = 'pixel-card flex flex-col gap-2';
    envCard.style.padding = '8px';
    envCard.innerHTML = `
      <div class="flex items-center justify-between flex-wrap gap-1" style="border-bottom:1px solid var(--border-dim); padding-bottom:4px;">
        <span class="font-bold text-purple text-xs">${curSpec.icon} ${curSpec.name} · [${curGenus.name}] ${locked ? '<span class="text-10 text-dim">🔒本轮已定型</span>' : ''}</span>
        <span class="text-10 text-emerald">${biome.icon} ${biome.name} | ${pt.name} | ${univ.name}</span>
      </div>
      <div class="text-10 text-muted">${curSpec.desc}（母星：${curSpec.home}）</div>
      <div class="flex items-center gap-1 flex-wrap">
        ${effTraits.map(tid => {
          const tr = dl.DATA.traits[tid];
          if (!tr) return '';
          return `<span title="${tr.desc}" class="text-10 font-bold" style="padding:2px 6px; border-radius:3px; border:1px solid ${tr.positive ? '#059669' : '#e11d48'}; background:${tr.positive ? 'rgba(16,185,129,0.12)' : 'rgba(244,63,94,0.12)'}; color:${tr.positive ? '#34d399' : '#fb7185'};">
            ${tr.positive ? '✦' : '▼'} ${tr.name}
          </span>`;
        }).join('')}
      </div>
      <div class="text-10 text-sky" style="background:var(--bg-main); padding:5px 7px; border-radius:4px;">
        ${effTraits.map(tid => {
          const tr = dl.DATA.traits[tid];
          return tr ? `<div>• <strong>${tr.name}</strong>：${tr.desc}</div>` : '';
        }).join('')}
      </div>
    `;
    return envCard;
  }

  /* =====================================================================
     Tab 1: 进化 / 内政 子面板
     ===================================================================== */
  function renderEvoSpecies(host, ctx, container) {
    const { dl } = ctx;
    const w = ctx.save.world;
    const speciesLocked = w.eraIndex >= 1 || !!w.techs.evo_sapiens;

    // 1. 当前星系环境与物种基因卡片
    container.appendChild(buildSpeciesEnvSummaryCard(ctx, speciesLocked));

    // 2. 智慧物种图谱选择器（仅生命起源进化定型前可切换当前轮回物种）
    if (!speciesLocked) {
      const spCard = document.createElement('div');
      spCard.className = 'pixel-card flex flex-col gap-2';
      spCard.style.padding = '8px';
      const filteredSpecies = selectedGenusFilter === 'all'
        ? dl.DATA.species
        : dl.DATA.species.filter(s => s.genus === selectedGenusFilter);

      spCard.innerHTML = `
        <div class="flex items-center justify-between flex-wrap gap-1">
          <span class="font-bold text-sky text-xs">🧬 物种演化图谱 (34 物种 / 16 种群)</span>
          <span class="text-10 text-muted">定型前可选择本轮演化物种</span>
        </div>
        <div class="flex items-center gap-1 flex-wrap">
          <button type="button" class="pixel-btn ${selectedGenusFilter === 'all' ? 'bg-sky' : 'bg-slate'} text-10" style="padding:2px 6px;" data-genus-filter="all">全部</button>
          ${dl.DATA.genera.map(g => `
            <button type="button" class="pixel-btn ${selectedGenusFilter === g.id ? 'bg-sky' : 'bg-slate'} text-10" style="padding:2px 6px;" data-genus-filter="${g.id}">${g.icon}${g.name.slice(0,2)}</button>
          `).join('')}
        </div>
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(96px, 1fr)); gap:4px; max-height:150px; overflow-y:auto;">
          ${filteredSpecies.map(s => `
            <button type="button" class="pixel-btn ${w.species === s.id ? 'bg-emerald' : 'bg-slate'} text-10 font-bold" style="padding:4px 5px; justify-content:flex-start;" data-species="${s.id}" title="${s.desc}">
              <span>${s.icon}</span><span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${s.name}</span>
            </button>
          `).join('')}
        </div>
      `;
      container.appendChild(spCard);
    }

    // 3. 生命起源：5 大细胞亚结构
    if (w.eraIndex === 0) {
      const cellCard = document.createElement('div');
      cellCard.className = 'pixel-card flex flex-col gap-2';
      cellCard.style.padding = '8px';
      cellCard.innerHTML = `
        <div class="flex items-center justify-between" style="border-bottom:1px solid var(--border-dim); padding-bottom:4px;">
          <span class="font-bold text-amber text-xs">🦠 细胞亚结构合成 (原生质阶段)</span>
          <span class="text-10 text-muted">可重复扩建RNA/DNA上限与自动转录</span>
        </div>
        <div class="flex flex-col gap-2" id="evolve-cells-list"></div>
      `;
      const listEl = cellCard.querySelector('#evolve-cells-list');
      host.EVOLVE_CELL_STRUCTURES_DEF.forEach(cDef => {
        if (cDef.reqEvo && !w.techs[cDef.reqEvo]) return;
        const cnt = w.evoCells[cDef.id] || 0;
        const cost = host.getCellStructureCost(cDef);
        const afford = host.canAffordCost(cost);
        const row = document.createElement('div');
        row.style.cssText = 'background:var(--bg-main); border:1px solid var(--border-dim); border-radius:4px; padding:6px 8px;';
        row.className = 'flex items-center justify-between gap-2';
        row.innerHTML = `
          <div class="min-w-0">
            <div class="font-bold text-xs text-amber">${cDef.name} <span class="text-sky">[Lv.${cnt}]</span></div>
            <div class="text-10 text-muted">${cDef.desc}</div>
            <div class="text-10">消耗: ${fmtCostHtml(host, cost)}</div>
          </div>
          <button type="button" class="pixel-btn ${afford ? 'bg-amber' : 'bg-slate'} text-11 font-bold shrink-0" style="min-height:34px; padding:4px 10px;" data-cell="${cDef.id}" ${!afford ? 'disabled' : ''}>合成 +1</button>
        `;
        listEl.appendChild(row);
      });
      container.appendChild(cellCard);
    }

    // 4. 8 阶段生命进化主链
    const evoCard = document.createElement('div');
    evoCard.className = 'pixel-card flex flex-col gap-2';
    evoCard.style.padding = '8px';
    evoCard.innerHTML = `
      <div class="flex items-center justify-between" style="border-bottom:1px solid var(--border-dim); padding-bottom:4px;">
        <span class="font-bold text-emerald text-xs">🧬 生命基因进化主链 (8 阶段)</span>
        <span class="text-10 text-muted">${w.techs.evo_sapiens ? '✅ 已完成智人演化' : '向智慧生命演进'}</span>
      </div>
      <div id="evo-list" class="flex flex-col gap-2"></div>
    `;
    const evoList = evoCard.querySelector('#evo-list');
    host.EVO_CHAIN_IDS.forEach((id, idx) => {
      const tDef = host.TECH_MAP[id];
      const done = !!w.techs[id];
      const reqOk = tDef.req.every(r => !!w.techs[r]);
      const effCost = host.getEffectiveTechCost(tDef);
      const afford = !done && reqOk && host.canAffordCost(effCost);
      const item = document.createElement('div');
      item.style.cssText = `background:${done ? 'rgba(16,185,129,0.1)' : 'var(--bg-main)'}; border:1px solid ${done ? '#059669' : 'var(--border-dim)'}; border-radius:4px; padding:6px 8px;`;
      item.className = 'flex items-center justify-between gap-2';
      item.innerHTML = `
        <div class="min-w-0">
          <div class="font-bold text-xs ${done ? 'text-emerald' : 'text-sky'}">${idx + 1}. ${tDef.name}</div>
          <div class="text-10 text-muted">${tDef.desc}</div>
          ${done ? '<div class="text-10 text-emerald">✅ 已完成进化</div>' :
            (!reqOk ? `<div class="text-10 text-rose">前置: ${tDef.req.map(r => host.TECH_MAP[r].name).join(', ')}</div>` :
            `<div class="text-10">消耗: ${fmtCostHtml(host, effCost)}</div>`)}
        </div>
        ${done ? '' : `<button type="button" class="pixel-btn ${afford ? 'bg-emerald' : 'bg-slate'} text-11 font-bold shrink-0" style="min-height:34px; padding:4px 10px;" data-research="${id}" ${!afford ? 'disabled' : ''}>进化</button>`}
      `;
      evoList.appendChild(item);
    });
    container.appendChild(evoCard);
  }

  function renderEvoPopJobs(host, ctx, container) {
    const w = ctx.save.world;
    if (w.eraIndex < 1) {
      container.innerHTML = `<div class="pixel-card text-center text-muted text-xs" style="padding:20px;">请先在【进化物种】研究【智人诞生】，开启定居点后再分配人口与职业！</div>`;
      return;
    }
    container.appendChild(buildSpeciesEnvSummaryCard(ctx, true));
    const { dl } = ctx;
    const m = ctx.metrics;
    const allJobs = [...host.JOBS_DEF, ...(dl.DATA.extraJobs || [])];
    const assigned = Object.values(w.jobs).reduce((a, c) => a + c, 0);
    const idle = Math.max(0, Math.floor(w.pop) - assigned);
    const vacant = Math.max(0, m.popCap - Math.floor(w.pop));
    const recruitCost = host.getRecruitFoodCost();
    const recruitGain = Math.min(2, vacant);
    const canRecruit = recruitGain > 0 && (w.res.food || 0) >= recruitCost;

    const popCard = document.createElement('div');
    popCard.className = 'pixel-card flex flex-col gap-2';
    popCard.style.padding = '8px';
    popCard.innerHTML = `
      <div class="flex items-center justify-between flex-wrap gap-1" style="border-bottom:1px solid var(--border-dim); padding-bottom:4px;">
        <span class="font-bold text-sky text-xs">👥 市民人口与 15 种职业分工</span>
        <span class="text-11">空闲市民: <strong id="job-idle-cnt" class="text-amber">${idle}</strong> / <span id="job-total-cnt">${Math.floor(w.pop)}</span> (住房 ${m.popCap})</span>
      </div>
      <div style="background:var(--bg-main); border:1px solid #1e3a2f; border-radius:4px; padding:6px;" class="flex items-center justify-between flex-wrap gap-2">
        <div class="min-w-0">
          <div class="text-emerald font-bold text-11">📈 人口自然增速: <span id="pop-growth-rate">+${m.popGrowthRate.toFixed(2)} 人/秒</span></div>
          <div id="pop-growth-detail" class="text-10 text-muted">基础 +${m.popBaseRate.toFixed(2)}/s | 空房引力 +${m.popVacancyBonus.toFixed(2)}/s | 繁荣 ×${m.popProsperityMult.toFixed(1)}</div>
        </div>
        <button type="button" id="btn-recruit-pop" class="pixel-btn ${canRecruit ? 'bg-emerald' : 'bg-slate'} text-11 font-bold shrink-0" style="min-height:34px; padding:4px 8px;" ${!canRecruit ? 'disabled' : ''}>
          ${vacant <= 0 ? '住房已满' : `📣 吸引流民 (+${recruitGain}人 / ${host.fmt(recruitCost)}食物)`}
        </button>
      </div>
      <div id="jobs-list" class="flex flex-col gap-1"></div>
    `;
    const jobsList = popCard.querySelector('#jobs-list');
    allJobs.forEach(j => {
      if (j.reqTech && !w.techs[j.reqTech]) return;
      if (j.id === 'priest' && w.gov !== 'theocracy' && !dl.hasCrispr(ctx.save, 'ancients') && !(w.extraBlds && w.extraBlds.temple > 0)) return;
      const cnt = w.jobs[j.id] || 0;
      const row = document.createElement('div');
      row.style.cssText = 'background:var(--bg-main); border:1px solid var(--border-dim); border-radius:4px; padding:5px 7px;';
      row.className = 'flex items-center justify-between gap-2';
      row.innerHTML = `
        <div class="min-w-0">
          <div class="font-bold text-xs">${j.name} <span class="text-amber">[<span id="job-cnt-${j.id}">${cnt}</span>人]</span></div>
          <div class="text-10 text-muted">${j.desc}</div>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <button type="button" class="pixel-btn bg-slate font-bold text-10" style="height:28px; padding:0 6px;" data-job="${j.id}" data-delta="-5">-5</button>
          <button type="button" class="pixel-btn bg-slate font-bold" style="width:28px; height:28px;" data-job="${j.id}" data-delta="-1">-</button>
          <button type="button" class="pixel-btn bg-sky font-bold" style="width:28px; height:28px;" data-job="${j.id}" data-delta="1">+</button>
          <button type="button" class="pixel-btn bg-indigo font-bold text-10" style="height:28px; padding:0 6px;" data-job="${j.id}" data-delta="5">+5</button>
        </div>
      `;
      jobsList.appendChild(row);
    });
    container.appendChild(popCard);
  }

  function renderEvoGovDiplo(host, ctx, container) {
    const { dl, diploMod } = ctx;
    const w = ctx.save.world;
    if (w.eraIndex < 1) {
      container.innerHTML = `<div class="pixel-card text-center text-muted text-xs" style="padding:20px;">进入农业文明后解锁政体体制、税收与邻国外交军事系统！</div>`;
      return;
    }

    // 1. 政体与税收卡片 (10 大 Evolve 政体)
    const govs = dl.DATA.governments || [];
    const curGov = dl.MAPS.governments[w.gov] || govs[0];
    const cityTitle = host.getCityTitle(w.pop);
    const maxTax = w.gov === 'oligarchy' ? 50 : 40;
    const taxLevels = w.gov === 'oligarchy' ? [0, 10, 20, 30, 40, 50] : [0, 10, 20, 30, 40];

    const govCard = document.createElement('div');
    govCard.className = 'pixel-card flex flex-col gap-2';
    govCard.style.padding = '8px';
    govCard.innerHTML = `
      <div class="flex items-center justify-between flex-wrap gap-1" style="border-bottom:1px solid var(--border-dim); padding-bottom:4px;">
        <span class="font-bold text-amber text-xs">🏛️ 政府体制 · 【${cityTitle}】</span>
        <span class="text-10 text-emerald">税收: +${ctx.metrics.taxIncome.toFixed(1)}/s | 士气: ${w.happiness}%</span>
      </div>
      <div class="flex items-center gap-1 flex-wrap">
        ${govs.filter(g => !g.reqTech || !!w.techs[g.reqTech]).map(g => `
          <button type="button" class="pixel-btn ${w.gov === g.id ? 'bg-indigo' : 'bg-slate'} text-10 font-bold" style="padding:3px 7px; min-height:26px;" data-gov="${g.id}">
            ${g.name}
          </button>
        `).join('')}
      </div>
      <div class="text-10 text-sky" style="background:var(--bg-main); padding:4px 6px; border-radius:3px;">
        📜 <strong>${curGov.name}</strong>：${curGov.desc}
      </div>
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div class="flex items-center gap-1 flex-wrap">
          <span class="text-10 text-muted">税率:</span>
          ${taxLevels.map(tr => `
            <button type="button" class="pixel-btn ${w.taxRate === tr ? 'bg-amber' : 'bg-slate'} text-10 font-bold" style="padding:2px 7px; min-height:24px;" data-tax="${tr}">${tr}%</button>
          `).join('')}
        </div>
        ${w.taxRate > (w.gov === 'oligarchy' ? 45 : 25) && w.happiness < 90 ? '<span class="text-10 text-rose font-bold">⚠️ 税率过高有抗税暴动风险！</span>' : ''}
      </div>
    `;
    container.appendChild(govCard);

    if (w.eraIndex < 2) {
      const hint = document.createElement('div');
      hint.className = 'pixel-card text-11 text-muted';
      hint.style.padding = '10px';
      hint.textContent = '⚔️ 晋升【城市文明】后将开启周边三国地图、军事驻军、战役掠夺与间谍情报战！';
      container.appendChild(hint);
      return;
    }

    // 2. 驻军与战术面板
    diploMod.ensureDiplomacyFields(w);
    const gar = w.garrison;
    const maxS = diploMod.getMaxSoldiers(ctx);
    const combatPower = diploMod.getCombatRating(ctx, Math.min(gar.soldiers, gar.raidSize));
    const mercCost = diploMod.getMercCost(ctx);
    const tactics = (dl.DATA.foreign && dl.DATA.foreign.tactics) || [];
    const curTac = tactics[gar.tactic] || tactics[1];

    const garCard = document.createElement('div');
    garCard.className = 'pixel-card flex flex-col gap-2';
    garCard.style.padding = '8px';
    garCard.innerHTML = `
      <div class="flex items-center justify-between flex-wrap gap-1" style="border-bottom:1px solid var(--border-dim); padding-bottom:4px;">
        <span class="font-bold text-rose text-xs">⚔️ 军事驻军与作战指挥</span>
        <span class="text-10 text-amber">士兵: ${gar.soldiers}/${maxS} (伤兵:${gar.wounded}) | 出征战力: ${combatPower}</span>
      </div>
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div class="flex items-center gap-1">
          <span class="text-10 text-muted">投入兵力:</span>
          <button type="button" class="pixel-btn bg-slate text-10 font-bold" style="width:26px;height:26px;" data-raid-delta="-5">-5</button>
          <button type="button" class="pixel-btn bg-slate text-10 font-bold" style="width:26px;height:26px;" data-raid-delta="-1">-</button>
          <strong class="text-sky text-xs" style="min-width:24px; text-align:center;">${gar.raidSize}</strong>
          <button type="button" class="pixel-btn bg-sky text-10 font-bold" style="width:26px;height:26px;" data-raid-delta="1">+</button>
          <button type="button" class="pixel-btn bg-indigo text-10 font-bold" style="width:26px;height:26px;" data-raid-delta="5">+5</button>
        </div>
        <button type="button" id="btn-hire-merc" class="pixel-btn ${(w.res.money || 0) >= mercCost && gar.soldiers < maxS ? 'bg-amber' : 'bg-slate'} text-10 font-bold" style="min-height:28px; padding:2px 8px;">
          💰 聘请雇佣兵 (${host.fmt(mercCost)}币)
        </button>
      </div>
      <div class="flex items-center gap-1 flex-wrap">
        <span class="text-10 text-muted">战术规模:</span>
        ${tactics.map(tc => `
          <button type="button" class="pixel-btn ${gar.tactic === tc.id ? 'bg-rose' : 'bg-slate'} text-10" style="padding:2px 7px;" data-tactic="${tc.id}">${tc.name}</button>
        `).join('')}
      </div>
      <div class="text-10 text-muted">${curTac ? curTac.desc : ''}</div>
    `;
    container.appendChild(garCard);

    // 3. 周边三国列表
    for (let i = 0; i < 3; i++) {
      const g = w.foreign[`gov${i}`];
      const controlled = g.occ || g.anx || g.buy;
      const assess = diploMod.assessBattle(ctx, i);
      const spyCost = diploMod.getSpyTrainCost(ctx, i);
      const buyPrice = Math.round(g.eco * 35 * (g.hstl > 50 ? 1.25 : 1.0));
      const fCard = document.createElement('div');
      fCard.className = 'pixel-card flex flex-col gap-2';
      fCard.style.cssText = `padding:7px 8px; border-color:${controlled ? '#10b981' : 'var(--border-dim)'};`;
      fCard.innerHTML = `
        <div class="flex items-center justify-between flex-wrap gap-1">
          <span class="font-bold text-xs ${controlled ? 'text-emerald' : 'text-sky'}">
            🏴 ${g.name} ${g.occ ? '[已占领]' : (g.anx ? '[已吞并]' : (g.buy ? '[已收购]' : ''))}
          </span>
          <span class="text-10 text-muted">军力:${Math.round(g.mil)} | 敌意:${g.hstl}% | 内乱:${g.unrest}% | 间谍:${g.spy}${g.spyTrain > 0 ? `(培训${Math.ceil(g.spyTrain)}s)` : ''}</span>
        </div>
        <div class="flex items-center justify-between flex-wrap gap-1">
          <span class="text-10 ${assess.cls}">战力预估: ${assess.label} (${assess.myPower} vs ${assess.enemyPower})</span>
          <div class="flex items-center gap-1 flex-wrap">
            <button type="button" class="pixel-btn ${controlled ? 'bg-slate' : 'bg-rose'} text-10 font-bold" style="padding:3px 8px; min-height:26px;" data-campaign="${i}">
              ${controlled ? '🏳️ 撤出释放' : '⚔️ 发起战役'}
            </button>
            ${!controlled ? `
              <button type="button" class="pixel-btn ${g.spyTrain > 0 ? 'bg-slate' : 'bg-sky'} text-10 font-bold" style="padding:3px 8px; min-height:26px;" data-train-spy="${i}" ${g.spyTrain > 0 ? 'disabled' : ''}>
                🕵️ ${g.spyTrain > 0 ? '培训中' : `派间谍(${host.fmt(spyCost)}币)`}
              </button>
            ` : ''}
          </div>
        </div>
        ${!controlled && g.spy > 0 ? `
          <div class="flex items-center gap-1 flex-wrap" style="border-top:1px dashed var(--border-dim); padding-top:4px;">
            <span class="text-10 text-muted">谍报:</span>
            <button type="button" class="pixel-btn bg-sky text-10" style="padding:2px 6px;" data-spyop="${i}:influence">🕊️ 亲善</button>
            <button type="button" class="pixel-btn bg-amber text-10" style="padding:2px 6px;" data-spyop="${i}:sabotage">💣 破坏</button>
            <button type="button" class="pixel-btn bg-amber text-10" style="padding:2px 6px;" data-spyop="${i}:incite">🔥 煽动</button>
            <button type="button" class="pixel-btn ${g.hstl <= 45 && g.unrest >= 50 ? 'bg-emerald' : 'bg-slate'} text-10" style="padding:2px 6px;" data-spyop="${i}:annex">🏛️ 吞并</button>
            <button type="button" class="pixel-btn ${g.spy >= 2 && (w.res.money || 0) >= buyPrice ? 'bg-purple' : 'bg-slate'} text-10" style="padding:2px 6px;" data-spyop="${i}:purchase">💼 收购(${host.fmt(buyPrice)})</button>
          </div>
        ` : ''}
      `;
      container.appendChild(fCard);
    }
  }

  function renderEvoGovernor(host, ctx, container) {
    const { dl, arpaMod } = ctx;
    const w = ctx.save.world;
    if (!arpaMod.isGovernorUnlocked(ctx.save)) {
      container.innerHTML = `
        <div class="pixel-card flex flex-col items-center gap-2 text-center" style="padding:20px;">
          <div class="text-muted text-xs">研究【货币】或解锁 CRISPR【总督】后即可招募并任命总督自动管理城邦内政！</div>
          <div class="flex items-center gap-2 flex-wrap justify-center">
            <button type="button" class="pixel-btn bg-sky text-11 font-bold" style="padding:5px 12px;" data-goto-tab="tech:tech_tree">🔬 前往【科技树】</button>
            <button type="button" class="pixel-btn bg-purple text-11 font-bold" style="padding:5px 12px;" data-goto-tab="prestige:pres_crispr">🧬 前往【CRISPR池】</button>
          </div>
        </div>`;
      return;
    }

    const govData = w.governor;
    const appointedBg = govData.appointed ? dl.MAPS.governorBackgrounds[govData.appointed] : null;
    const maxSlots = dl.hasCrispr(ctx.save, 'civil_service') ? 6 : 3;
    const activeTasks = Object.values(govData.tasks || {}).filter(Boolean).length;

    const topCard = document.createElement('div');
    topCard.className = 'pixel-card flex flex-col gap-2';
    topCard.style.padding = '8px';
    topCard.innerHTML = `
      <div class="flex items-center justify-between flex-wrap gap-1" style="border-bottom:1px solid var(--border-dim); padding-bottom:4px;">
        <span class="font-bold text-sky text-xs">👔 总督任命与自动内政 (${activeTasks}/${maxSlots} 任务槽)</span>
        <button type="button" id="btn-gov-reroll" class="pixel-btn bg-indigo text-10 font-bold" style="padding:2px 8px;">🎲 更换候选人</button>
      </div>
      ${appointedBg ? `
        <div class="flex items-center justify-between gap-2" style="background:rgba(16,185,129,0.1); border:1px solid #059669; border-radius:4px; padding:6px 8px;">
          <div>
            <div class="font-bold text-emerald text-xs">当前在任：${appointedBg.name} · 【${appointedBg.title}】</div>
            <div class="text-10 text-muted">${appointedBg.desc} | 效果: ${appointedBg.effectText}</div>
          </div>
          <button type="button" id="btn-gov-fire" class="pixel-btn bg-rose text-10 font-bold shrink-0" style="padding:3px 8px;">解任</button>
        </div>
      ` : '<div class="text-11 text-amber">尚未任命总督，请从下方 3 位候选人中挑选一位辅助执政：</div>'}
      <div class="flex flex-col gap-1">
        ${(govData.candidates || []).map(cid => {
          const c = dl.MAPS.governorBackgrounds[cid];
          if (!c) return '';
          const isCur = govData.appointed === cid;
          return `
            <div style="background:var(--bg-main); border:1px solid var(--border-dim); border-radius:4px; padding:6px 8px;" class="flex items-center justify-between gap-2">
              <div class="min-w-0">
                <div class="font-bold text-xs text-amber">${c.name} (${c.title})</div>
                <div class="text-10 text-muted">${c.effectText}</div>
              </div>
              <button type="button" class="pixel-btn ${isCur ? 'bg-slate' : 'bg-emerald'} text-10 font-bold shrink-0" style="padding:3px 9px;" data-appoint-gov="${cid}" ${isCur ? 'disabled' : ''}>${isCur ? '在任中' : '任命'}</button>
            </div>
          `;
        }).join('')}
      </div>
    `;
    container.appendChild(topCard);

    // 任务配置卡片
    const taskCard = document.createElement('div');
    taskCard.className = 'pixel-card flex flex-col gap-2';
    taskCard.style.padding = '8px';
    taskCard.innerHTML = `<div class="font-bold text-emerald text-xs">⚙️ 总督自动化治理任务配置</div>`;
    (dl.DATA.governorTasks || []).forEach(tk => {
      const on = !!govData.tasks[tk.id];
      const row = document.createElement('div');
      row.style.cssText = 'background:var(--bg-main); border:1px solid var(--border-dim); border-radius:4px; padding:5px 8px;';
      row.className = 'flex items-center justify-between gap-2';
      row.innerHTML = `
        <div class="min-w-0">
          <div class="font-bold text-11 ${on ? 'text-emerald' : 'text-main'}">${tk.name}</div>
          <div class="text-10 text-muted">${tk.desc}</div>
        </div>
        <button type="button" class="pixel-btn ${on ? 'bg-emerald' : 'bg-slate'} text-10 font-bold shrink-0" style="min-width:56px; padding:3px 8px;" data-gov-task="${tk.id}">
          ${on ? '✓ 开启' : '关闭'}
        </button>
      `;
      taskCard.appendChild(row);
    });
    container.appendChild(taskCard);
  }

  /* =====================================================================
     Tab 2: 建筑 / 工业 子面板
     ===================================================================== */
  function renderBldCity(host, ctx, container) {
    const { dl } = ctx;
    const w = ctx.save.world;
    const m = ctx.metrics;
    const batch = host.getBatch();

    const topBar = document.createElement('div');
    topBar.className = 'pixel-card flex items-center justify-between flex-wrap gap-2';
    topBar.style.padding = '7px 8px';
    topBar.innerHTML = `
      <div class="text-xs font-bold text-amber">
        🏛️ 批量建造:
        ${w.techs.electricity ? `<span class="text-10 text-sky" style="margin-left:6px;">⚡${m.powerGen.toFixed(0)}/${m.powerReq.toFixed(0)}MW</span>` : ''}
      </div>
      <div class="flex items-center gap-1 flex-wrap">
        ${[1, 10, 25, 'MAX'].map(mode => `
          <button type="button" class="pixel-btn ${batch === mode ? 'bg-amber' : 'bg-slate'} text-11 font-bold" style="min-height:28px; padding:2px 8px;" data-batch="${mode}">
            ${mode === 'MAX' ? 'MAX' : 'x' + mode}
          </button>
        `).join('')}
        ${batch === 100 ? '<span class="text-10 text-emerald font-bold" style="padding:0 4px;">Alt:x100</span>' : ''}
      </div>
    `;
    container.appendChild(topBar);

    if (w.techs.smelting) {
      const indCtrl = document.createElement('div');
      indCtrl.className = 'pixel-card flex flex-col gap-1';
      indCtrl.style.padding = '6px 8px';
      indCtrl.innerHTML = `
        <div class="flex items-center justify-between flex-wrap gap-1">
          <span class="text-11 font-bold text-sky">🔥 冶炼厂燃料 & 工匠焦点</span>
          <div class="flex items-center gap-1 flex-wrap">
            ${[{ id: 'wood', label: '木常压(1x)' }, { id: 'coal', label: '焦煤(1.25x)' }, { id: 'oil', label: '重油(1.5x)' }].map(f => `
              <button type="button" class="pixel-btn ${w.smelterMode === f.id ? 'bg-amber' : 'bg-slate'} text-10" style="padding:2px 6px;" data-smelter="${f.id}">${f.label}</button>
            `).join('')}
          </div>
        </div>
        <div class="flex items-center justify-between flex-wrap gap-1">
          <span class="text-10 text-muted">工匠锻造偏向:</span>
          <div class="flex items-center gap-1 flex-wrap">
            ${[{ id: 'balanced', label: '均衡' }, { id: 'plywood', label: '主木板' }, { id: 'brick', label: '主砌砖' }, { id: 'wroughtIron', label: '主锻铁' }].map(c => `
              <button type="button" class="pixel-btn ${w.craftFocus === c.id ? 'bg-sky' : 'bg-slate'} text-10" style="padding:2px 6px;" data-craft="${c.id}">${c.label}</button>
            `).join('')}
          </div>
        </div>
      `;
      container.appendChild(indCtrl);
    }

    // 合并所有 Evolve 扩展建筑（7 原有 + 7 新增）
    const allExtras = [...host.EVOLVE_EXTRA_BLDS_DEF, ...(dl.DATA.extraBuildings || [])];
    const unlockedExtras = allExtras.filter(b => !b.reqTech || !!w.techs[b.reqTech]);
    if (unlockedExtras.length > 0) {
      const exHdr = document.createElement('div');
      exHdr.className = 'text-11 font-bold text-purple';
      exHdr.textContent = '✨ Evolve 战略、信仰、民生与核威慑建筑';
      container.appendChild(exHdr);

      unlockedExtras.forEach(bDef => {
        const owned = w.extraBlds[bDef.id] || 0;
        const qty = batch === 'MAX' ? Math.max(1, host.getMaxAffordableBuilding(bDef, true)) : batch;
        const cost = host.getBuildingCost(bDef, qty, true);
        const afford = batch === 'MAX' ? host.getMaxAffordableBuilding(bDef, true) >= 1 : host.canAffordCost(cost);

        const card = document.createElement('div');
        card.className = 'pixel-card flex items-center justify-between gap-2';
        card.style.cssText = 'padding:7px 8px; border-color:#5b21b6;';
        card.innerHTML = `
          <div class="min-w-0">
            <div class="flex items-center gap-1 flex-wrap">
              <span class="font-bold text-purple text-xs">${bDef.name}</span>
              <span style="background:var(--bg-main); padding:1px 5px; border-radius:3px;" class="text-10">已建 ${owned}</span>
              <span class="text-10 text-dim">[${host.ERAS_DEF[bDef.era].name}]</span>
            </div>
            <div class="text-10 text-muted" style="margin:2px 0;">${bDef.desc}</div>
            <div class="text-10">费用(+${qty}): ${fmtCostHtml(host, cost)}</div>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <button type="button" class="pixel-btn bg-slate text-10 font-bold" style="min-height:34px; padding:4px 6px;" data-queue-bld="extra:${bDef.id}" title="加入建筑队列">+Q</button>
            <button type="button" class="pixel-btn ${afford ? 'bg-purple' : 'bg-slate'} text-11 font-bold" style="min-height:34px; padding:4px 9px;" data-extra-build="${bDef.id}" ${!afford ? 'disabled' : ''}>建+${qty}</button>
          </div>
        `;
        container.appendChild(card);
      });
    }

    // 35 种核心标准建筑
    let shown = 0;
    host.BUILDINGS_DEF.forEach(bDef => {
      if (bDef.reqTech && !w.techs[bDef.reqTech]) return;
      shown++;
      const owned = w.buildings[bDef.id] || 0;
      const maxed = bDef.maxCount && owned >= bDef.maxCount;
      const qty = maxed ? 0 : (batch === 'MAX' ? Math.max(1, host.getMaxAffordableBuilding(bDef)) : batch);
      const cost = maxed ? {} : host.getBuildingCost(bDef, qty);
      const afford = !maxed && (batch === 'MAX' ? host.getMaxAffordableBuilding(bDef) >= 1 : host.canAffordCost(cost));

      const card = document.createElement('div');
      card.className = 'pixel-card flex items-center justify-between gap-2';
      card.style.padding = '7px 8px';
      card.innerHTML = `
        <div class="min-w-0">
          <div class="flex items-center gap-1 flex-wrap">
            <span class="font-bold text-amber text-xs">${bDef.name}</span>
            <span style="background:var(--bg-main); padding:1px 5px; border-radius:3px;" class="text-10">已建 ${owned}${bDef.maxCount ? '/' + bDef.maxCount : ''}</span>
            <span class="text-10 text-dim">[${host.ERAS_DEF[bDef.era].name}]</span>
          </div>
          <div class="text-10 text-muted" style="margin:2px 0;">${bDef.desc}</div>
          <div class="text-10">${maxed ? '<span class="text-emerald">✅ 已达上限</span>' : `费用(+${qty}): ${fmtCostHtml(host, cost)}`}</div>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          ${maxed ? '' : `<button type="button" class="pixel-btn bg-slate text-10 font-bold" style="min-height:34px; padding:4px 6px;" data-queue-bld="std:${bDef.id}" title="加入建筑队列">+Q</button>`}
          <button type="button" class="pixel-btn ${afford ? 'bg-amber' : 'bg-slate'} text-11 font-bold" style="min-height:34px; padding:4px 9px;" data-build="${bDef.id}" ${!afford ? 'disabled' : ''}>${maxed ? '已满' : `建+${qty}`}</button>
        </div>
      `;
      container.appendChild(card);
    });

    if (shown === 0 && unlockedExtras.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'pixel-card text-center text-muted text-xs';
      empty.style.padding = '20px';
      empty.textContent = '请先在【进化/内政】研究【智人诞生】开启农业与建筑建造！';
      container.appendChild(empty);
    }
  }

  function renderBldPowerQueue(host, ctx, container) {
    const { ecoMod, dl } = ctx;
    const w = ctx.save.world;
    const m = ctx.metrics;

    // 1. 电网调度卡片
    const powerSpecs = [
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

    const pCard = document.createElement('div');
    pCard.className = 'pixel-card flex flex-col gap-2';
    pCard.style.padding = '8px';
    pCard.innerHTML = `
      <div class="flex items-center justify-between flex-wrap gap-1" style="border-bottom:1px solid var(--border-dim); padding-bottom:4px;">
        <span class="font-bold text-amber text-xs">⚡ 电网电力分配与通断控制</span>
        <span id="power-summary-label" class="text-11 font-bold ${m.powerSurplus >= 0 ? 'text-emerald' : 'text-rose'}">
          发电 ${m.powerGen.toFixed(0)}MW | 负荷 ${m.powerReq.toFixed(0)}MW | 供电率 ${Math.round((m.powerRatio || 1) * 100)}%
        </span>
      </div>
      <div id="power-switch-list" class="flex flex-col gap-1"></div>
    `;
    const swList = pCard.querySelector('#power-switch-list');
    let anyPow = false;
    powerSpecs.forEach(sp => {
      const total = sp.isExtra ? (w.extraBlds[sp.id] || 0) : (w.buildings[sp.id] || 0);
      if (total <= 0) return;
      anyPow = true;
      const on = ecoMod.getActiveBuildingCount(w, sp.id, sp.isExtra);
      const row = document.createElement('div');
      row.style.cssText = 'background:var(--bg-main); border:1px solid var(--border-dim); border-radius:4px; padding:4px 7px;';
      row.className = 'flex items-center justify-between gap-2';
      row.innerHTML = `
        <span class="text-11">${sp.name} <span class="text-muted">(${sp.mw}MW/座)</span></span>
        <div class="flex items-center gap-1">
          <button type="button" class="pixel-btn bg-slate text-10 font-bold" style="width:26px;height:24px;" data-pwr="${sp.isExtra ? 'extra' : 'std'}:${sp.id}:-1">-</button>
          <span class="text-11 font-bold ${on === total ? 'text-emerald' : 'text-amber'}" style="min-width:46px; text-align:center;">${on}/${total} 开</span>
          <button type="button" class="pixel-btn bg-emerald text-10 font-bold" style="width:26px;height:24px;" data-pwr="${sp.isExtra ? 'extra' : 'std'}:${sp.id}:1">+</button>
        </div>
      `;
      swList.appendChild(row);
    });
    if (!anyPow) {
      swList.innerHTML = `<div class="text-10 text-muted">尚未建造耗电设施。进入工业时代并建造工厂、钢厂或电厂后可在此精细管理电力配额。</div>`;
    }
    container.appendChild(pCard);

    // 2. 建筑队列 & 研究队列卡片
    const { bMax, rMax } = ecoMod.getQueueLimits(ctx.save);
    const qCard = document.createElement('div');
    qCard.className = 'pixel-card flex flex-col gap-2';
    qCard.style.padding = '8px';
    qCard.innerHTML = `
      <div class="flex items-center justify-between flex-wrap gap-1" style="border-bottom:1px solid var(--border-dim); padding-bottom:4px;">
        <span class="font-bold text-sky text-xs">📋 建筑队列 (${w.buildQueue.length}/${bMax}) & 研究队列 (${w.researchQueue.length}/${rMax})</span>
        <button type="button" id="btn-queue-pause" class="pixel-btn ${w.queuePaused ? 'bg-rose' : 'bg-emerald'} text-10 font-bold" style="padding:2px 8px;">
          ${w.queuePaused ? '▶ 恢复队列' : '⏸ 暂停队列'}
        </button>
      </div>
      <div class="text-10 text-muted">在建筑或科技页点击【+Q】即可排队；资源攒够后自动顺序竣工/研发！</div>
      <div class="text-11 font-bold text-amber">建筑队列:</div>
      <div class="flex flex-col gap-1">
        ${w.buildQueue.length === 0 ? '<div class="text-10 text-dim">暂无排队建筑</div>' : w.buildQueue.map((item, idx) => {
          const bDef = item.isExtra
            ? [...host.EVOLVE_EXTRA_BLDS_DEF, ...(dl.DATA.extraBuildings || [])].find(x => x.id === item.id)
            : host.BUILDINGS_DEF.find(x => x.id === item.id);
          return `
            <div style="background:var(--bg-main); border:1px solid var(--border-dim); border-radius:3px; padding:4px 7px;" class="flex items-center justify-between">
              <span class="text-11">${idx + 1}. ${bDef ? bDef.name : item.id}</span>
              <button type="button" class="pixel-btn bg-rose text-10" style="padding:1px 6px;" data-rm-bq="${idx}">移除</button>
            </div>
          `;
        }).join('')}
      </div>
      <div class="text-11 font-bold text-sky" style="margin-top:4px;">研究队列:</div>
      <div class="flex flex-col gap-1">
        ${w.researchQueue.length === 0 ? '<div class="text-10 text-dim">暂无排队科技</div>' : w.researchQueue.map((tid, idx) => {
          const tDef = host.TECH_MAP[tid];
          return `
            <div style="background:var(--bg-main); border:1px solid var(--border-dim); border-radius:3px; padding:4px 7px;" class="flex items-center justify-between">
              <span class="text-11">${idx + 1}. ${tDef ? tDef.name : tid}</span>
              <button type="button" class="pixel-btn bg-rose text-10" style="padding:1px 6px;" data-rm-rq="${idx}">移除</button>
            </div>
          `;
        }).join('')}
      </div>
    `;
    container.appendChild(qCard);
  }

  function renderBldMarket(host, ctx, container) {
    const { ecoMod } = ctx;
    const w = ctx.save.world;
    if (!w.techs.currency) {
      container.innerHTML = `
        <div class="pixel-card flex flex-col items-center gap-2 text-center" style="padding:20px;">
          <div class="text-muted text-xs">需研究【货币】后解锁动态市场交易；研究【贸易】后解锁自动贸易路线！</div>
          <button type="button" class="pixel-btn bg-sky text-11 font-bold" style="padding:5px 12px;" data-goto-tab="tech:tech_tree">🔬 前往【科技树】</button>
        </div>`;
      return;
    }

    const trStats = ecoMod.getTradeRouteStats(ctx);
    const hdr = document.createElement('div');
    hdr.className = 'pixel-card flex items-center justify-between flex-wrap gap-2';
    hdr.style.padding = '7px 8px';
    hdr.innerHTML = `
      <div>
        <div class="font-bold text-amber text-xs">⚖️ 自由市场与自动贸易路线</div>
        <div class="text-10 text-muted">
          ${trStats.unlocked ? `自动贸易路线已用: <strong class="text-emerald">${trStats.usedRoutes}/${trStats.maxRoutes}</strong> (正=自动买入 / 负=自动卖出)` : '研究【贸易】后解锁自动进出口路线'}
        </div>
      </div>
      <div class="flex items-center gap-1">
        <span class="text-10 text-muted">单次数量:</span>
        ${[1, 10, 100, 1000].map(q => `
          <button type="button" class="pixel-btn ${w.market.qty === q ? 'bg-sky' : 'bg-slate'} text-10 font-bold" style="padding:2px 6px;" data-mkt-qty="${q}">${q}</button>
        `).join('')}
      </div>
    `;
    container.appendChild(hdr);

    host.RESOURCES_DEF.forEach(r => {
      if (!w.unlockedRes[r.id]) return;
      const quote = ecoMod.getMarketQuote(ctx, r.id);
      if (!quote) return;
      const rt = (w.market.routes && w.market.routes[r.id]) || 0;

      const row = document.createElement('div');
      row.className = 'pixel-card flex items-center justify-between flex-wrap gap-2';
      row.style.padding = '6px 8px';
      row.innerHTML = `
        <div class="min-w-0">
          <div class="font-bold text-xs text-main">${r.name} <span class="text-10 text-muted">存量:${host.fmt(w.res[r.id] || 0)}</span></div>
          <div class="text-10 text-muted">买价: <span class="text-rose">${quote.buyPrice}</span>币 | 卖价: <span class="text-emerald">${quote.sellPrice}</span>币</div>
        </div>
        <div class="flex items-center gap-1 flex-wrap shrink-0">
          <button type="button" class="pixel-btn bg-sky text-10 font-bold" style="padding:3px 7px;" data-mkt-buy="${r.id}">买</button>
          <button type="button" class="pixel-btn bg-amber text-10 font-bold" style="padding:3px 7px;" data-mkt-sell="${r.id}">卖</button>
          ${trStats.unlocked ? `
            <button type="button" class="pixel-btn bg-slate text-10 font-bold" style="width:24px;height:24px;" data-route="${r.id}:-1">-</button>
            <span class="text-10 font-bold ${rt > 0 ? 'text-sky' : (rt < 0 ? 'text-amber' : 'text-muted')}" style="min-width:22px; text-align:center;">${rt > 0 ? '+' + rt : rt}</span>
            <button type="button" class="pixel-btn bg-emerald text-10 font-bold" style="width:24px;height:24px;" data-route="${r.id}:1">+</button>
            ${rt !== 0 ? `<button type="button" class="pixel-btn bg-rose text-10" style="padding:2px 5px;" data-route="${r.id}:0">清</button>` : ''}
          ` : ''}
        </div>
      `;
      container.appendChild(row);
    });
  }

  function renderBldStorage(host, ctx, container) {
    const { ecoMod } = ctx;
    const w = ctx.save.world;
    if (w.eraIndex < 1) {
      container.innerHTML = `<div class="pixel-card text-center text-muted text-xs" style="padding:20px;">进入农业文明后解锁板条箱与集装箱自由扩容仓储！</div>`;
      return;
    }

    const st = ecoMod.getStorageStats(ctx);
    const hdr = document.createElement('div');
    hdr.className = 'pixel-card flex flex-col gap-2';
    hdr.style.padding = '8px';
    hdr.innerHTML = `
      <div class="font-bold text-amber text-xs">📦 物流板条箱 & 钢铁集装箱管理</div>
      <div class="flex items-center justify-between flex-wrap gap-2" style="background:var(--bg-main); padding:6px 8px; border-radius:4px;">
        <div>
          <div class="text-11 font-bold text-sky">板条箱: ${st.freeCrates} 空闲 / ${st.cratesOwned} 拥有 (上限 ${st.crateCap})</div>
          <div class="text-10 text-muted">每箱扩容 +${st.perCrate} | 造价: ${w.techs.smelting ? '10 木板' : '25 木材'}</div>
        </div>
        <div class="flex items-center gap-1">
          <button type="button" class="pixel-btn bg-amber text-10 font-bold" style="padding:3px 8px;" data-make-store="crate:1">造+1</button>
          <button type="button" class="pixel-btn bg-amber text-10 font-bold" style="padding:3px 8px;" data-make-store="crate:5">造+5</button>
        </div>
      </div>
      ${w.techs.steel ? `
        <div class="flex items-center justify-between flex-wrap gap-2" style="background:var(--bg-main); padding:6px 8px; border-radius:4px;">
          <div>
            <div class="text-11 font-bold text-purple">集装箱: ${st.freeContainers} 空闲 / ${st.containersOwned} 拥有 (上限 ${st.containerCap})</div>
            <div class="text-10 text-muted">每柜扩容 +${st.perContainer} | 造价: 35 钢材</div>
          </div>
          <div class="flex items-center gap-1">
            <button type="button" class="pixel-btn bg-purple text-10 font-bold" style="padding:3px 8px;" data-make-store="container:1">造+1</button>
            <button type="button" class="pixel-btn bg-purple text-10 font-bold" style="padding:3px 8px;" data-make-store="container:5">造+5</button>
          </div>
        </div>
      ` : '<div class="text-10 text-dim">研究【钢铁】后可制造高容量钢铁集装箱！</div>'}
    `;
    container.appendChild(hdr);

    host.RESOURCES_DEF.forEach(r => {
      if (!w.unlockedRes[r.id]) return;
      if (r.id === 'rna' || r.id === 'dna' || r.id === 'knowledge' || r.id === 'money') return;
      const ac = (w.storage.assignedCrates && w.storage.assignedCrates[r.id]) || 0;
      const an = (w.storage.assignedContainers && w.storage.assignedContainers[r.id]) || 0;
      const cap = ctx.metrics.caps[r.id] || r.baseCap;
      const row = document.createElement('div');
      row.className = 'pixel-card flex items-center justify-between flex-wrap gap-2';
      row.style.padding = '5px 8px';
      row.innerHTML = `
        <div class="text-11"><strong>${r.name}</strong> <span class="text-muted">(上限 ${host.fmt(cap)})</span></div>
        <div class="flex items-center gap-2 flex-wrap">
          <div class="flex items-center gap-1">
            <span class="text-10 text-sky">箱:</span>
            <button type="button" class="pixel-btn bg-slate text-10" style="width:22px;height:22px;" data-assign-store="crate:${r.id}:-1">-</button>
            <span class="text-10 font-bold" style="min-width:18px;text-align:center;">${ac}</span>
            <button type="button" class="pixel-btn bg-sky text-10" style="width:22px;height:22px;" data-assign-store="crate:${r.id}:1">+</button>
          </div>
          ${w.techs.steel ? `
            <div class="flex items-center gap-1">
              <span class="text-10 text-purple">柜:</span>
              <button type="button" class="pixel-btn bg-slate text-10" style="width:22px;height:22px;" data-assign-store="container:${r.id}:-1">-</button>
              <span class="text-10 font-bold" style="min-width:18px;text-align:center;">${an}</span>
              <button type="button" class="pixel-btn bg-purple text-10" style="width:22px;height:22px;" data-assign-store="container:${r.id}:1">+</button>
            </div>
          ` : ''}
        </div>
      `;
      container.appendChild(row);
    });
  }

  /* =====================================================================
     Tab 3: 科技研究 子面板
     ===================================================================== */
  function renderTechTree(host, ctx, container) {
    const { dl } = ctx;
    const w = ctx.save.world;
    const hideDone = host.getHideResearchedTechs();
    const maxEraView = dl.hasCrispr(ctx.save, 'precognition') ? w.eraIndex + 2 : w.eraIndex + 1;
    const civTechs = host.TECHS_DEF.filter(t => t.era >= 1);
    const doneCnt = civTechs.filter(t => !!w.techs[t.id]).length;

    const filterBar = document.createElement('div');
    filterBar.className = 'pixel-card flex items-center justify-between gap-2';
    filterBar.style.padding = '6px 8px';
    filterBar.innerHTML = `
      <span class="text-xs font-bold text-sky">🔬 文明科技树 (${doneCnt}/${civTechs.length})</span>
      <button type="button" id="btn-toggle-done-tech" class="pixel-btn ${hideDone ? 'bg-sky' : 'bg-slate'} text-10 font-bold" style="min-height:28px; padding:2px 8px;">
        ${hideDone ? '显示已研究' : '隐藏已研究'}
      </button>
    `;
    container.appendChild(filterBar);

    const visibleTechs = civTechs.filter(tDef => {
      const done = !!w.techs[tDef.id];
      if (done && hideDone) return false;
      if (tDef.era > maxEraView && !done) return false;
      return true;
    });
    // 未研究科技置顶展示，已研究科技沉淀到底部
    visibleTechs.sort((a, b) => (w.techs[a.id] ? 1 : 0) - (w.techs[b.id] ? 1 : 0));

    visibleTechs.forEach(tDef => {
      const done = !!w.techs[tDef.id];

      const reqOk = tDef.req.every(r => !!w.techs[r]);
      const effCost = host.getEffectiveTechCost(tDef);
      const afford = !done && reqOk && host.canAffordCost(effCost);
      const inQueue = w.researchQueue.includes(tDef.id);

      const card = document.createElement('div');
      card.className = 'pixel-card flex items-center justify-between gap-2';
      card.style.cssText = `padding:7px 8px; ${done ? 'background:rgba(16,185,129,0.08); border-color:#065f46;' : ''}`;
      card.innerHTML = `
        <div class="min-w-0">
          <div class="flex items-center gap-1 flex-wrap">
            <span class="font-bold text-xs ${done ? 'text-emerald' : 'text-sky'}">${tDef.name}</span>
            <span style="background:var(--bg-main); padding:1px 5px; border-radius:3px;" class="text-10 text-muted">${host.ERAS_DEF[tDef.era].name}</span>
          </div>
          <div class="text-10 text-muted" style="margin:2px 0;">${tDef.desc}</div>
          ${done ? '<div class="text-10 text-emerald">✅ 已完成研究</div>' :
            (!reqOk ? `<div class="text-10 text-rose">前置: ${tDef.req.map(r => host.TECH_MAP[r].name).join(' + ')}</div>` :
            `<div class="text-10">消耗: ${fmtCostHtml(host, effCost)}</div>`)}
        </div>
        <div class="flex items-center gap-1 shrink-0">
          ${!done && !inQueue ? `<button type="button" class="pixel-btn bg-slate text-10 font-bold" style="min-height:34px; padding:4px 6px;" data-queue-tech="${tDef.id}" title="加入研究队列">+Q</button>` : ''}
          <button type="button" class="pixel-btn ${done ? 'bg-slate' : (afford ? 'bg-sky' : 'bg-slate')} text-11 font-bold" style="min-height:34px; padding:4px 9px;" data-research="${tDef.id}" ${(done || !afford) ? 'disabled' : ''}>
            ${done ? '已研究' : '研究'}
          </button>
        </div>
      `;
      container.appendChild(card);
    });
  }

  function renderTechArpa(host, ctx, container) {
    const { dl, arpaMod } = ctx;
    const w = ctx.save.world;
    const list = dl.DATA.arpaProjects || [];
    const unlocked = list.filter(p => !p.reqTech || !!w.techs[p.reqTech]);

    if (unlocked.length === 0) {
      container.innerHTML = `
        <div class="pixel-card flex flex-col items-center gap-2 text-center" style="padding:20px;">
          <div class="text-muted text-xs">研究【建筑学】或进入城市/工业时代后，将逐步解锁纪念碑、证券交易所、铁路、超级对撞机与发射设施等 ARPA 超级工程！</div>
          <button type="button" class="pixel-btn bg-sky text-11 font-bold" style="padding:5px 12px;" data-goto-tab="tech:tech_tree">🔬 前往【科技树】</button>
        </div>`;
      return;
    }

    const hdr = document.createElement('div');
    hdr.className = 'pixel-card text-11 text-muted';
    hdr.style.padding = '6px 8px';
    hdr.innerHTML = `🗼 <strong class="text-amber">ARPA 分段超级工程</strong>：支持按 1% / 10% / 25% / 100% 逐步注资建造！`;
    container.appendChild(hdr);

    unlocked.forEach(p => {
      const st = w.arpa[p.id] || { rank: 0, progress: 0, variantIdx: 0 };
      const maxed = p.maxRank && st.rank >= p.maxRank;
      const totalCost = arpaMod.getArpaTotalCost(ctx, p);
      const title = p.variants ? `${p.name} (${p.variants[st.variantIdx % p.variants.length]})` : p.name;

      const card = document.createElement('div');
      card.className = 'pixel-card flex flex-col gap-2';
      card.style.padding = '8px';
      card.innerHTML = `
        <div class="flex items-center justify-between flex-wrap gap-1">
          <span class="font-bold text-amber text-xs">${title} <span class="text-sky">[Lv.${st.rank}${p.maxRank ? '/' + p.maxRank : ''}]</span></span>
          <span class="text-10 text-emerald">当前进度: ${Math.round(st.progress)}%</span>
        </div>
        <div style="width:100%; height:8px; background:var(--bg-main); border:1px solid var(--border-dim); border-radius:4px; overflow:hidden;">
          <div style="width:${Math.min(100, st.progress)}%; height:100%; background:#10b981;"></div>
        </div>
        <div class="text-10 text-muted">${p.desc} | <span class="text-sky">${p.effectText}</span></div>
        ${maxed ? '<div class="text-10 text-emerald font-bold">✅ 已达到满级工程规模</div>' : `
          <div class="text-10">整级造价: ${fmtCostHtml(host, totalCost)}</div>
          <div class="flex items-center gap-1 flex-wrap">
            ${[1, 10, 25, 100].map(pct => `
              <button type="button" class="pixel-btn bg-indigo text-10 font-bold" style="flex:1; min-height:28px;" data-arpa-invest="${p.id}:${pct}">+${pct}%</button>
            `).join('')}
          </div>
        `}
      `;
      container.appendChild(card);
    });
  }

  function renderTechGeneLab(host, ctx, container) {
    const { dl, arpaMod } = ctx;
    const w = ctx.save.world;
    if (!arpaMod.isGeneLabUnlocked(ctx.save)) {
      container.innerHTML = `
        <div class="pixel-card flex flex-col items-center gap-2 text-center" style="padding:20px;">
          <div class="text-muted text-xs">研究【电子学】、进入【原子时代】或建造【生命科学实验室】后解锁基因组测序与基因编辑实验室！</div>
          <button type="button" class="pixel-btn bg-sky text-11 font-bold" style="padding:5px 12px;" data-goto-tab="tech:tech_tree">🔬 前往【科技树】</button>
        </div>`;
      return;
    }

    const gl = w.geneLab;
    const pct = Math.min(100, Math.round((gl.seqProgress / Math.max(1, gl.seqMax)) * 100));
    const topCard = document.createElement('div');
    topCard.className = 'pixel-card flex flex-col gap-2';
    topCard.style.padding = '8px';
    topCard.innerHTML = `
      <div class="flex items-center justify-between flex-wrap gap-1">
        <span class="font-bold text-purple text-xs">🧬 基因组测序实验室 (Genes: <strong id="gene-seq-pts" class="text-amber">${gl.genes}</strong> 枚)</span>
        <div class="flex items-center gap-1">
          <button type="button" id="btn-seq-toggle" class="pixel-btn ${gl.seqActive ? 'bg-emerald' : 'bg-slate'} text-10 font-bold" style="padding:3px 8px;">${gl.seqActive ? '🧬 测序中' : '▶ 开始测序'}</button>
          <button type="button" id="btn-seq-boost" class="pixel-btn ${gl.seqBoost ? 'bg-amber' : 'bg-slate'} text-10 font-bold" style="padding:3px 8px;">⚡ 2倍速</button>
        </div>
      </div>
      <div style="width:100%; height:8px; background:var(--bg-main); border:1px solid var(--border-dim); border-radius:4px; overflow:hidden;">
        <div id="gene-seq-bar" style="width:${pct}%; height:100%; background:#a855f7;"></div>
      </div>
      <div id="gene-seq-text" class="text-10 text-muted">测序进度: ${Math.floor(gl.seqProgress)} / ${gl.seqMax} (${pct}%) — 消耗少量知识自动解码基因点数</div>
    `;
    container.appendChild(topCard);

    // 负面基因突变移除区
    const negTraits = dl.getEffectiveTraits(w).filter(tid => dl.DATA.traits[tid] && !dl.DATA.traits[tid].positive);
    if (negTraits.length > 0) {
      const canMut = dl.hasCrispr(ctx.save, 'mutation');
      const mutCard = document.createElement('div');
      mutCard.className = 'pixel-card flex flex-col gap-1';
      mutCard.style.padding = '8px';
      mutCard.innerHTML = `
        <div class="font-bold text-rose text-xs">✂️ 物种负面特质消除 ${canMut ? '(每次消耗 3 基因)' : '(需在 CRISPR 解锁【突变】)'}</div>
        <div class="flex items-center gap-1 flex-wrap">
          ${negTraits.map(tid => {
            const tr = dl.DATA.traits[tid];
            return `<button type="button" class="pixel-btn ${canMut && gl.genes >= 3 ? 'bg-rose' : 'bg-slate'} text-10 font-bold" style="padding:3px 8px;" data-remove-trait="${tid}" ${!(canMut && gl.genes >= 3) ? 'disabled' : ''}>消除【${tr.name}】</button>`;
          }).join('')}
        </div>
      `;
      container.appendChild(mutCard);
    }

    // 15 项次要基因特质升级
    const minCard = document.createElement('div');
    minCard.className = 'pixel-card flex flex-col gap-2';
    minCard.style.padding = '8px';
    minCard.innerHTML = `<div class="font-bold text-sky text-xs">🧪 次要基因强化特质 (消耗 Genes 点数永久叠层)</div>`;
    (dl.DATA.minorTraits || []).forEach(mt => {
      if (mt.reqCrispr && !dl.hasCrispr(ctx.save, mt.reqCrispr)) return;
      const lv = (w.minorTraits && w.minorTraits[mt.id]) || 0;
      const cost = lv + 1;
      const ok = gl.genes >= cost;
      const row = document.createElement('div');
      row.style.cssText = 'background:var(--bg-main); border:1px solid var(--border-dim); border-radius:4px; padding:5px 7px;';
      row.className = 'flex items-center justify-between gap-2';
      row.innerHTML = `
        <div class="min-w-0">
          <div class="font-bold text-11 text-amber">${mt.name} <span class="text-sky">[Lv.${lv}]</span></div>
          <div class="text-10 text-muted">${mt.desc}</div>
        </div>
        <button type="button" class="pixel-btn ${ok ? 'bg-purple' : 'bg-slate'} text-10 font-bold shrink-0" style="padding:3px 9px;" data-minor-trait="${mt.id}" ${!ok ? 'disabled' : ''}>升级(${cost}基因)</button>
      `;
      minCard.appendChild(row);
    });
    container.appendChild(minCard);
  }

  /* =====================================================================
     Tab 4: 核爆 / 跃迁 子面板
     ===================================================================== */
  function renderPrestigeReset(host, ctx, container) {
    const { dl } = ctx;
    const save = ctx.save;
    const w = save.world;
    const canMad = host.canMadResetNow();
    const madGain = host.calcMadPlasmidGain();
    const canP = host.canPrestigeNow();
    const gain = host.calcPrestigeGain();
    const phageGain = host.calcPhageGain();

    // 1. MAD 核弹重置
    const madCard = document.createElement('div');
    madCard.className = 'pixel-card flex flex-col gap-2';
    madCard.style.cssText = 'padding:8px; border-color:#e11d48; background:rgba(225,29,72,0.08);';
    madCard.innerHTML = `
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div class="font-bold text-rose text-xs">☢️ 第一阶转生：相互保证毁灭 (MAD 核弹重置)</div>
          <div class="text-10 text-muted">核爆次数: <strong class="text-amber">${save.prestige.madCount || 0}</strong> | ${save.prestige.rapidMutation ? '<span class="text-emerald">✅快速突变</span>' : '未激活'} ${save.prestige.ancientRuins ? '<span class="text-sky">✅远古遗迹</span>' : ''}</div>
        </div>
        <div class="flex items-center gap-1">
          <button type="button" id="btn-mad-arm" class="pixel-btn ${w.madArmed ? 'bg-amber' : 'bg-slate'} text-10 font-bold" style="min-height:32px; padding:4px 8px;" ${!canMad ? 'disabled' : ''}>
            ${w.madArmed ? '🔓 已解锁保险' : '🔒 武装核弹'}
          </button>
          <button type="button" id="btn-mad-go" class="pixel-btn ${(canMad && w.madArmed) ? 'bg-rose' : 'bg-slate'} text-11 font-bold" style="min-height:32px; padding:4px 10px;" ${!(canMad && w.madArmed) ? 'disabled' : ''}>
            ☢️ 发射 (+${madGain}余烬)
          </button>
        </div>
      </div>
      <div class="text-10 text-muted">条件：进入【原子时代】、研究【核裂变】并建造至少 1 座【导弹发射井】。</div>
    `;
    container.appendChild(madCard);

    // 2. Bioseed 星际方舟
    const pCard = document.createElement('div');
    pCard.className = 'pixel-card flex flex-col gap-2';
    pCard.style.cssText = 'padding:8px; border-color:#6b21a8;';
    pCard.innerHTML = `
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div class="font-bold text-purple text-xs">🚀 第二阶终局跃迁：恒星际殖民方舟 (Bioseed)</div>
          <div class="text-10 text-muted">累计质粒/余烬: <strong class="text-amber">${save.prestige.lifetimeShards}</strong> | 可用: <strong class="text-purple">${save.prestige.genesisShards}</strong> | 噬菌体: <strong class="text-emerald">${save.prestige.phage || 0}</strong></div>
        </div>
        <button type="button" id="btn-prestige-go" class="pixel-btn ${canP ? 'bg-purple' : 'bg-slate'} text-11 font-bold" style="min-height:34px; padding:4px 10px;" ${!canP ? 'disabled' : ''}>
          ${canP ? `🚀 启航 (+${gain}余烬 +${phageGain}噬菌体)` : `未达太空终局 (预计+${gain})`}
        </button>
      </div>
      <div class="text-10 text-muted">条件：进入【太空文明】、研究【星际航行】并建造【恒星际殖民方舟】。</div>
    `;
    container.appendChild(pCard);

    // 3. 下一周目星球、宇宙与目标物种预设选择器
    const pre = save.prestige.nextPreset || { biome: 'grassland', planetTrait: 'none', universe: 'standard', species: 'human' };
    const preSpec = dl.MAPS.species[pre.species] || dl.DATA.species[0];
    const preCard = document.createElement('div');
    preCard.className = 'pixel-card flex flex-col gap-2';
    preCard.style.padding = '8px';
    preCard.innerHTML = `
      <div class="font-bold text-sky text-xs">🌌 下一轮转生降临星系预设 (Bioseed / MAD 生效)</div>
      <div class="flex flex-col gap-1">
        <div class="text-10 text-muted">目标宇宙法则:</div>
        <div class="flex items-center gap-1 flex-wrap">
          ${dl.DATA.universes.map(u => `
            <button type="button" class="pixel-btn ${pre.universe === u.id ? 'bg-purple' : 'bg-slate'} text-10" style="padding:2px 7px;" data-preset-univ="${u.id}" title="${u.effect}">${u.icon}${u.name}</button>
          `).join('')}
        </div>
        <div class="text-10 text-muted" style="margin-top:4px;">目标星球群系:</div>
        <div class="flex items-center gap-1 flex-wrap">
          ${dl.DATA.biomes.map(b => `
            <button type="button" class="pixel-btn ${pre.biome === b.id ? 'bg-emerald' : 'bg-slate'} text-10" style="padding:2px 6px;" data-preset-biome="${b.id}" title="${b.effectsText}">${b.icon}${b.name}</button>
          `).join('')}
        </div>
        <div class="text-10 text-muted" style="margin-top:4px;">目标行星特性:</div>
        <div class="flex items-center gap-1 flex-wrap">
          ${dl.DATA.planetTraits.map(pt => `
            <button type="button" class="pixel-btn ${pre.planetTrait === pt.id ? 'bg-amber' : 'bg-slate'} text-10" style="padding:2px 6px;" data-preset-pt="${pt.id}" title="${pt.desc}">${pt.name}</button>
          `).join('')}
        </div>
        <div class="text-10 text-muted" style="margin-top:4px;">目标演化物种: <strong class="text-sky">${preSpec.icon} ${preSpec.name}</strong> <span class="text-dim">(${preSpec.desc})</span></div>
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(92px, 1fr)); gap:4px; max-height:130px; overflow-y:auto;">
          ${dl.DATA.species.map(s => `
            <button type="button" class="pixel-btn ${pre.species === s.id ? 'bg-sky' : 'bg-slate'} text-10 font-bold" style="padding:3px 5px; justify-content:flex-start;" data-preset-species="${s.id}" title="${s.desc}">
              <span>${s.icon}</span><span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${s.name}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;
    container.appendChild(preCard);
  }

  function renderPrestigeCrispr(host, ctx, container) {
    const { dl } = ctx;
    const save = ctx.save;
    const shards = save.prestige.genesisShards || 0;
    const unlockedCnt = Object.values(save.prestige.crispr || {}).filter(Boolean).length;

    const hdr = document.createElement('div');
    hdr.className = 'pixel-card flex items-center justify-between';
    hdr.style.padding = '7px 8px';
    hdr.innerHTML = `
      <span class="font-bold text-purple text-xs">🧬 CRISPR 基因池升级 (${unlockedCnt}/${dl.DATA.crisprUpgrades.length})</span>
      <span class="text-xs font-bold text-amber">可用质粒/余烬: ${host.fmt(shards)}</span>
    `;
    container.appendChild(hdr);

    dl.DATA.crisprUpgrades.forEach(upg => {
      const done = !!(save.prestige.crispr && save.prestige.crispr[upg.id]);
      const reqOk = (upg.req || []).every(r => !!(save.prestige.crispr && save.prestige.crispr[r]));
      const afford = !done && reqOk && shards >= upg.cost;
      const reqNames = (upg.req || []).map(r => (dl.MAPS.crisprUpgrades[r] ? dl.MAPS.crisprUpgrades[r].name : r)).join(' + ');

      const row = document.createElement('div');
      row.className = 'pixel-card flex items-center justify-between gap-2';
      row.style.cssText = `padding:6px 8px; ${done ? 'border-color:#059669; background:rgba(16,185,129,0.08);' : ''}`;
      row.innerHTML = `
        <div class="min-w-0">
          <div class="font-bold text-xs ${done ? 'text-emerald' : 'text-purple'}">${upg.name}</div>
          <div class="text-10 text-muted">${upg.desc}</div>
          ${!done && !reqOk ? `<div class="text-10 text-rose">前置CRISPR: ${reqNames}</div>` : ''}
        </div>
        <button type="button" class="pixel-btn ${done ? 'bg-slate' : (afford ? 'bg-purple' : 'bg-slate')} text-10 font-bold shrink-0" style="min-height:32px; padding:4px 9px;" data-crispr="${upg.id}" ${(done || !afford) ? 'disabled' : ''}>
          ${done ? '已激活' : `${upg.cost} 余烬`}
        </button>
      `;
      container.appendChild(row);
    });
  }

  function renderPrestigePerksMissions(host, ctx, container) {
    const w = ctx.save.world;
    host.PERKS_DEF.forEach(p => {
      const lv = host.getPerkLevel(p.id);
      const maxed = lv >= 5;
      const cost = maxed ? 0 : p.costs[lv];
      const afford = !maxed && (ctx.save.prestige.genesisShards || 0) >= cost;
      const row = document.createElement('div');
      row.className = 'pixel-card flex items-center justify-between gap-2';
      row.style.padding = '6px 8px';
      row.innerHTML = `
        <div class="min-w-0">
          <div class="font-bold text-xs text-amber">${p.icon} ${p.name} <span class="text-sky">[Lv.${lv}/5]</span></div>
          <div class="text-10 text-muted">${p.desc}</div>
        </div>
        <button type="button" class="pixel-btn ${afford ? 'bg-purple' : 'bg-slate'} text-11 font-bold shrink-0" style="min-height:32px; padding:4px 9px;" data-perk="${p.id}" ${!afford ? 'disabled' : ''}>
          ${maxed ? '已满级' : `升级 (${cost})`}
        </button>
      `;
      container.appendChild(row);
    });

    const mHdr = document.createElement('div');
    mHdr.className = 'flex items-center justify-between';
    mHdr.style.marginTop = '4px';
    mHdr.innerHTML = `
      <span class="font-bold text-emerald text-xs">📜 51 项顺序主线 (${w.missionIndex} / 51)</span>
      <button type="button" id="btn-toggle-all-missions" class="pixel-btn bg-slate text-10" style="padding:2px 7px;">${showAllMissions ? '仅看当前进度' : '展开全部 51 项'}</button>
    `;
    container.appendChild(mHdr);

    const startIdx = showAllMissions ? 0 : Math.max(0, w.missionIndex - 2);
    const endIdx = showAllMissions ? host.MISSIONS_DEF.length : Math.min(host.MISSIONS_DEF.length, w.missionIndex + 6);
    for (let i = startIdx; i < endIdx; i++) {
      const m = host.MISSIONS_DEF[i];
      const isDone = i < w.missionIndex;
      const isCur = i === w.missionIndex;
      const mRow = document.createElement('div');
      mRow.className = 'pixel-card flex items-center justify-between gap-2';
      mRow.style.cssText = `padding:5px 8px; ${isCur ? 'border-color:#10b981; background:rgba(16,185,129,0.08);' : ''}`;
      mRow.innerHTML = `
        <div class="text-11 font-bold ${isDone ? 'text-muted' : (isCur ? 'text-emerald' : 'text-main')}">
          [${m.id}] ${m.name}：<span class="text-muted font-normal">${m.desc}</span>
        </div>
        <span class="text-10 shrink-0 ${isDone ? 'text-emerald' : 'text-amber'}">${isDone ? '✅已完成' : m.rewardText}</span>
      `;
      container.appendChild(mRow);
    }
  }

  /* =====================================================================
     Tab 5: 百科 / 设置 子面板
     ===================================================================== */
  function renderSysLogs(host, ctx, container) {
    const w = ctx.save.world;
    const logs = w.logs || [];
    const filterBar = document.createElement('div');
    filterBar.className = 'pixel-card flex items-center justify-between flex-wrap gap-1';
    filterBar.style.padding = '6px 8px';
    filterBar.innerHTML = `
      <span class="font-bold text-sky text-xs">📜 文明历史与事件日志</span>
      <div class="flex items-center gap-1 flex-wrap">
        ${[
          { id: 'all', name: '全部' },
          { id: 'progress', name: '进度' },
          { id: 'events', name: '事件' },
          { id: 'combat', name: '战斗谍报' },
          { id: 'achievements', name: '成就' }
        ].map(f => `
          <button type="button" class="pixel-btn ${logCatFilter === f.id ? 'bg-sky' : 'bg-slate'} text-10" style="padding:2px 7px;" data-log-cat="${f.id}">${f.name}</button>
        `).join('')}
      </div>
    `;
    container.appendChild(filterBar);

    const filtered = logCatFilter === 'all' ? logs : logs.filter(l => l.cat === logCatFilter);
    const listBox = document.createElement('div');
    listBox.className = 'pixel-card flex flex-col gap-1';
    listBox.style.padding = '8px';
    if (filtered.length === 0) {
      listBox.innerHTML = `<div class="text-11 text-muted text-center" style="padding:16px;">暂无相关记录。时代推进、随机事件、外交战役和成就达成都会自动收录至此。</div>`;
    } else {
      filtered.slice(0, 60).forEach(l => {
        const row = document.createElement('div');
        row.style.cssText = 'border-bottom:1px dashed var(--border-dim); padding:3px 0;';
        row.className = 'text-11';
        row.innerHTML = `<span class="text-dim">${l.stamp}</span> <span class="text-${l.tone || 'main'}">${l.text}</span>`;
        listBox.appendChild(row);
      });
    }
    container.appendChild(listBox);
  }

  function renderSysAchievesMorale(host, ctx, container) {
    const { dl } = ctx;
    const save = ctx.save;
    const m = ctx.metrics;
    const env = ctx.envMods || {};
    const achs = (save.prestige && save.prestige.achievements) || {};
    const doneCnt = dl.DATA.achievements.filter(a => !!achs[a.id]).length;
    const unlockedCrispr = dl.hasCrispr(save, 'unlocked');

    // 1. 士气详细分解卡片
    if (m.moraleBreakdown) {
      const mb = m.moraleBreakdown;
      const mCard = document.createElement('div');
      mCard.className = 'pixel-card flex flex-col gap-1';
      mCard.style.padding = '8px';
      mCard.innerHTML = `
        <div class="font-bold text-emerald text-xs" style="margin-bottom:2px;">😊 城市士气构成明细 (${mb.final}% / 上限 ${mb.cap}%)</div>
        <div class="text-10" style="display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:4px;">
          <div>粮食住房基础: <strong>${mb.base}%</strong></div>
          <div>环境特质月相: <strong class="${mb.envAndTraits >= 0 ? 'text-emerald' : 'text-rose'}">${mb.envAndTraits >= 0 ? '+' : ''}${mb.envAndTraits}%</strong></div>
          <div>税率影响: <strong class="${mb.tax >= 0 ? 'text-emerald' : 'text-rose'}">${mb.tax >= 0 ? '+' : ''}${mb.tax}%</strong></div>
          <div>政体加成: <strong class="${mb.government >= 0 ? 'text-emerald' : 'text-rose'}">${mb.government >= 0 ? '+' : ''}${mb.government}%</strong></div>
          <div>剧场茅屋: <strong class="text-sky">+${mb.buildings}%</strong></div>
          <div>艺人娱乐: <strong class="text-sky">+${mb.entertainers}%</strong></div>
          <div>失业压力: <strong class="text-rose">${mb.unemployed}%</strong></div>
          <div>工作压力: <strong class="text-rose">${mb.stress}%</strong></div>
        </div>
      `;
      container.appendChild(mCard);
    }

    // 2. 成就墙与精通加成
    const aCard = document.createElement('div');
    aCard.className = 'pixel-card flex flex-col gap-2';
    aCard.style.padding = '8px';
    aCard.innerHTML = `
      <div class="flex items-center justify-between flex-wrap gap-1">
        <span class="font-bold text-amber text-xs">🏆 文明成就 (${doneCnt}/${dl.DATA.achievements.length})</span>
        <span class="text-11 ${unlockedCrispr ? 'text-emerald' : 'text-muted'}">
          累计精通: +${(env.masteryPct || 0).toFixed(1)}% ${unlockedCrispr ? '(已激活全局产能)' : '(需 CRISPR【基因解锁】激活)'}
        </span>
      </div>
    `;
    dl.DATA.achievements.forEach(a => {
      const got = !!achs[a.id];
      const row = document.createElement('div');
      row.style.cssText = `background:${got ? 'rgba(245,158,11,0.1)' : 'var(--bg-main)'}; border:1px solid ${got ? '#d97706' : 'var(--border-dim)'}; border-radius:4px; padding:5px 7px;`;
      row.className = 'flex items-center justify-between gap-2';
      row.innerHTML = `
        <div class="min-w-0">
          <div class="font-bold text-11 ${got ? 'text-amber' : 'text-muted'}">${got ? '🏆' : '🔒'} ${a.name} <span class="text-10 text-dim">[${a.category}]</span></div>
          <div class="text-10 text-muted">${a.desc}</div>
        </div>
        <span class="text-10 shrink-0 ${got ? 'text-emerald' : 'text-dim'}">+${a.mastery}%</span>
      `;
      aCard.appendChild(row);
    });
    container.appendChild(aCard);
  }

  function renderSysWiki(host, ctx, container) {
    const w = ctx.save.world;
    const env = ctx.envMods || {};
    const zodiac = env.zodiac || ctx.dl.getZodiacSign();
    const moon = env.moon || { icon: '🌑', name: '新月', bonusText: '' };

    container.appendChild(buildSpeciesEnvSummaryCard(ctx, w.eraIndex >= 1 || !!w.techs.evo_sapiens));

    const envCard = document.createElement('div');
    envCard.className = 'pixel-card flex flex-col gap-1';
    envCard.style.padding = '8px';
    envCard.innerHTML = `
      <div class="font-bold text-sky text-xs">🌍 当前星球与天文环境百科</div>
      <div class="text-10 text-muted">
        <div>• 群系：<strong>${env.biome ? env.biome.name : ''}</strong> — ${env.biome ? env.biome.desc : ''} (${env.biome ? env.biome.effectsText : ''})</div>
        <div>• 行星特性：<strong>${env.planetTrait ? env.planetTrait.name : ''}</strong> — ${env.planetTrait ? env.planetTrait.desc : ''}</div>
        <div>• 月相：${moon.icon} <strong>${moon.name}</strong> (${moon.bonusText}) | 星象：${zodiac.symbol} <strong>${zodiac.name}</strong> (${zodiac.desc})</div>
      </div>
    `;
    container.appendChild(envCard);

    const wikiResources = host.RESOURCES_DEF.filter(r => w.eraIndex === 0 || (r.id !== 'rna' && r.id !== 'dna'));
    const resAllCard = document.createElement('div');
    resAllCard.className = 'pixel-card flex flex-col gap-1';
    resAllCard.style.padding = '8px';
    resAllCard.innerHTML = `<div class="font-bold text-emerald text-xs" style="margin-bottom:4px;">📦 ${wikiResources.length} 种${w.eraIndex >= 1 ? '文明' : '全文明'}资源百科与上限明细</div>`;
    wikiResources.forEach(r => {
      const unlocked = !!w.unlockedRes[r.id];
      const val = w.res[r.id] || 0;
      const cap = ctx.metrics.caps[r.id] || r.baseCap;
      const net = ctx.metrics.netRates[r.id] || 0;
      const row = document.createElement('div');
      row.style.cssText = 'background:var(--bg-main); border:1px solid var(--border-dim); border-radius:3px; padding:4px 7px;';
      row.className = 'flex items-center justify-between text-11';
      row.innerHTML = `
        <span><strong class="${unlocked ? 'text-main' : 'text-dim'}">${r.name}</strong> <span class="text-10 text-dim">[${host.ERAS_DEF[r.era].name}]</span></span>
        <span>${unlocked ? `${host.fmt(val)} / ${host.fmt(cap)} <span class="${net > 0 ? 'text-emerald' : (net < 0 ? 'text-rose' : 'text-muted')}">(${host.fmtRate(net)})</span>` : '<span class="text-dim">未解锁</span>'}</span>
      `;
      resAllCard.appendChild(row);
    });
    container.appendChild(resAllCard);
  }

  function renderSysConfig(host, ctx, container) {
    const { dl } = ctx;
    const s = ctx.save.settings;
    const sysCard = document.createElement('div');
    sysCard.className = 'pixel-card flex flex-col gap-2';
    sysCard.style.padding = '8px';
    sysCard.innerHTML = `
      <div class="font-bold text-sky text-xs">💾 终端设置与跨设备存档</div>
      <div style="display:grid; grid-template-columns:repeat(3, minmax(0,1fr)); gap:6px;">
        <button type="button" id="btn-set-sound" class="pixel-btn ${s.sound ? 'bg-emerald' : 'bg-slate'} text-11 font-bold" style="min-height:36px;">🔊 音效: ${s.sound ? '开' : '关'}</button>
        <button type="button" id="btn-set-crt" class="pixel-btn ${s.crt ? 'bg-sky' : 'bg-slate'} text-11 font-bold" style="min-height:36px;">📺 扫描线: ${s.crt ? '开' : '关'}</button>
        <button type="button" id="btn-set-boring" class="pixel-btn ${s.boring ? 'bg-amber' : 'bg-slate'} text-11 font-bold" style="min-height:36px;">🎭 趣味事件: ${s.boring ? '关' : '开'}</button>
        <button type="button" id="btn-set-save" class="pixel-btn bg-amber text-11 font-bold" style="min-height:36px;">💾 手动存档</button>
        <button type="button" id="btn-set-export" class="pixel-btn bg-sky text-11 font-bold" style="min-height:36px;">📤 导出存档码</button>
        <button type="button" id="btn-set-import" class="pixel-btn bg-indigo text-11 font-bold" style="min-height:36px;">📥 导入存档码</button>
      </div>
      <button type="button" id="btn-set-reset" class="pixel-btn bg-rose text-11 font-bold w-full" style="min-height:34px;">🗑️ 清空全部存档（硬重置）</button>
    `;
    container.appendChild(sysCard);

    // 主题与数字格式卡片
    const fmtCard = document.createElement('div');
    fmtCard.className = 'pixel-card flex flex-col gap-2';
    fmtCard.style.padding = '8px';
    fmtCard.innerHTML = `
      <div class="font-bold text-purple text-xs">🎨 Evolve 视觉主题与数字格式</div>
      <div class="flex items-center gap-1 flex-wrap">
        <span class="text-10 text-muted">数字格式:</span>
        ${[
          { id: 'metric', name: '公制 (K/M/G)' },
          { id: 'scientific', name: '科学计数法' },
          { id: 'engineering', name: '工程计数法' }
        ].map(f => `
          <button type="button" class="pixel-btn ${s.numFormat === f.id ? 'bg-sky' : 'bg-slate'} text-10 font-bold" style="padding:3px 8px;" data-numfmt="${f.id}">${f.name}</button>
        `).join('')}
      </div>
      <div class="text-10 text-muted">界面主题:</div>
      <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(110px, 1fr)); gap:5px;">
        ${(dl.DATA.themes || []).map(th => `
          <button type="button" class="pixel-btn ${s.theme === th.id ? 'bg-emerald' : 'bg-slate'} text-10 font-bold" style="min-height:30px;" data-theme="${th.id}">${th.name}</button>
        `).join('')}
      </div>
      <div class="text-10 text-dim">快捷键提示：桌面端按住 [Ctrl]=10x / [Shift]=25x / [Alt]=100x 可快捷联动批量建造；[Space] 采集资源。</div>
    `;
    container.appendChild(fmtCard);
  }

  /**
   * 处理新增 UI 控件的点击事件委派
   * @returns {boolean} 如果已拦截处理则返回 true
   */
  function handleSubTabClick(host, target) {
    const bridge = getBridge();
    const { dl, ecoMod, diploMod, arpaMod } = bridge.modules;
    const ctx = bridge.createContext(host);
    const save = ctx.save;
    const w = save.world;

    // 1. 子页签切换
    const stBtn = target.closest('button[data-subtab]');
    if (stBtn) {
      setSubTab(host.getActiveTab(), stBtn.dataset.subtab);
      host.playClick();
      host.markDirtyAndRender();
      return true;
    }

    // 2. 物种筛选 / 切换
    const gfBtn = target.closest('button[data-genus-filter]');
    if (gfBtn) {
      selectedGenusFilter = gfBtn.dataset.genusFilter;
      host.playClick();
      host.markDirtyAndRender();
      return true;
    }

    // 3. 外交与军事
    const raidBtn = target.closest('button[data-raid-delta]');
    if (raidBtn) {
      diploMod.adjustRaidSize(ctx, Number(raidBtn.dataset.raidDelta));
      host.playClick();
      host.markDirtyAndRender();
      return true;
    }
    if (target.closest('#btn-hire-merc')) {
      const res = diploMod.hireMercenary(ctx);
      host.showToast(res.msg);
      if (res.ok) host.playBuild();
      host.markDirtyAndRender();
      return true;
    }
    const tacBtn = target.closest('button[data-tactic]');
    if (tacBtn) {
      w.garrison.tactic = Number(tacBtn.dataset.tactic);
      host.playClick();
      host.markDirtyAndRender();
      return true;
    }
    const campBtn = target.closest('button[data-campaign]');
    if (campBtn) {
      const res = diploMod.launchCampaign(ctx, Number(campBtn.dataset.campaign));
      host.showToast(res.msg);
      if (res.ok) host.playTech();
      host.recomputeCapacities();
      host.markDirtyAndRender();
      return true;
    }
    const spyTrainBtn = target.closest('button[data-train-spy]');
    if (spyTrainBtn) {
      const res = diploMod.trainSpy(ctx, Number(spyTrainBtn.dataset.trainSpy));
      host.showToast(res.msg);
      if (res.ok) host.playClick();
      host.markDirtyAndRender();
      return true;
    }
    const spyOpBtn = target.closest('button[data-spyop]');
    if (spyOpBtn) {
      const [gIdx, op] = spyOpBtn.dataset.spyop.split(':');
      const res = diploMod.runSpyOp(ctx, Number(gIdx), op);
      host.showToast(res.msg);
      if (res.ok) host.playTech();
      host.recomputeCapacities();
      host.markDirtyAndRender();
      return true;
    }

    // 4. 总督
    if (target.closest('#btn-gov-reroll')) {
      arpaMod.rerollGovernorCandidates(ctx);
      host.playClick();
      host.markDirtyAndRender();
      return true;
    }
    if (target.closest('#btn-gov-fire')) {
      const res = arpaMod.appointGovernor(ctx, null);
      host.showToast(res.msg);
      host.markDirtyAndRender();
      return true;
    }
    const appGov = target.closest('button[data-appoint-gov]');
    if (appGov) {
      const res = arpaMod.appointGovernor(ctx, appGov.dataset.appointGov);
      host.showToast(res.msg);
      if (res.ok) host.playTech();
      host.recomputeCapacities();
      host.markDirtyAndRender();
      return true;
    }
    const govTask = target.closest('button[data-gov-task]');
    if (govTask) {
      const res = arpaMod.toggleGovernorTask(ctx, govTask.dataset.govTask);
      if (!res.ok && res.msg) host.showToast(res.msg);
      host.playClick();
      host.markDirtyAndRender();
      return true;
    }

    // 5. 电力开关 & 队列
    const pwrBtn = target.closest('button[data-pwr]');
    if (pwrBtn) {
      const [kind, bId, delta] = pwrBtn.dataset.pwr.split(':');
      ecoMod.toggleBuildingPower(ctx, bId, Number(delta), kind === 'extra');
      host.playClick();
      host.markDirtyAndRender();
      return true;
    }
    const qBldBtn = target.closest('button[data-queue-bld]');
    if (qBldBtn) {
      const [kind, bId] = qBldBtn.dataset.queueBld.split(':');
      const res = ecoMod.enqueueBuild(ctx, bId, kind === 'extra');
      if (!res.ok && res.msg) host.showToast(res.msg);
      else host.showToast('📋 已加入建筑队列！');
      host.playClick();
      host.markDirtyAndRender();
      return true;
    }
    const qTechBtn = target.closest('button[data-queue-tech]');
    if (qTechBtn) {
      const res = ecoMod.enqueueResearch(ctx, qTechBtn.dataset.queueTech);
      if (!res.ok && res.msg) host.showToast(res.msg);
      else host.showToast('📋 已加入研究队列！');
      host.playClick();
      host.markDirtyAndRender();
      return true;
    }
    if (target.closest('#btn-queue-pause')) {
      w.queuePaused = !w.queuePaused;
      host.playClick();
      host.markDirtyAndRender();
      return true;
    }
    const rmBq = target.closest('button[data-rm-bq]');
    if (rmBq) {
      w.buildQueue.splice(Number(rmBq.dataset.rmBq), 1);
      host.playClick();
      host.markDirtyAndRender();
      return true;
    }
    const rmRq = target.closest('button[data-rm-rq]');
    if (rmRq) {
      w.researchQueue.splice(Number(rmRq.dataset.rmRq), 1);
      host.playClick();
      host.markDirtyAndRender();
      return true;
    }

    // 6. 市场与仓储
    const mktQty = target.closest('button[data-mkt-qty]');
    if (mktQty) {
      w.market.qty = Number(mktQty.dataset.mktQty);
      host.playClick();
      host.markDirtyAndRender();
      return true;
    }
    const mktBuy = target.closest('button[data-mkt-buy]');
    if (mktBuy) {
      const res = ecoMod.tradeMarketOrder(ctx, mktBuy.dataset.mktBuy, 'buy');
      host.showToast(res.msg);
      if (res.ok) host.playClick();
      host.markDirtyAndRender();
      return true;
    }
    const mktSell = target.closest('button[data-mkt-sell]');
    if (mktSell) {
      const res = ecoMod.tradeMarketOrder(ctx, mktSell.dataset.mktSell, 'sell');
      host.showToast(res.msg);
      if (res.ok) host.playClick();
      host.markDirtyAndRender();
      return true;
    }
    const rtBtn = target.closest('button[data-route]');
    if (rtBtn) {
      const [rId, delta] = rtBtn.dataset.route.split(':');
      const res = ecoMod.adjustTradeRoute(ctx, rId, Number(delta));
      if (!res.ok && res.msg) host.showToast(res.msg);
      host.playClick();
      host.markDirtyAndRender();
      return true;
    }
    const mkStore = target.closest('button[data-make-store]');
    if (mkStore) {
      const [kind, cnt] = mkStore.dataset.makeStore.split(':');
      const res = ecoMod.constructStorageUnit(ctx, kind, Number(cnt));
      host.showToast(res.msg);
      if (res.ok) host.playBuild();
      host.recomputeCapacities();
      host.markDirtyAndRender();
      return true;
    }
    const asStore = target.closest('button[data-assign-store]');
    if (asStore) {
      const [kind, rId, delta] = asStore.dataset.assignStore.split(':');
      const res = ecoMod.assignStorageUnit(ctx, kind, rId, Number(delta));
      if (!res.ok && res.msg) host.showToast(res.msg);
      host.playClick();
      host.recomputeCapacities();
      host.markDirtyAndRender();
      return true;
    }

    // 7. ARPA & 基因实验室 & CRISPR & 预设
    const arpaInv = target.closest('button[data-arpa-invest]');
    if (arpaInv) {
      const [pId, pct] = arpaInv.dataset.arpaInvest.split(':');
      const res = arpaMod.investArpaProject(ctx, pId, Number(pct));
      host.showToast(res.msg);
      if (res.ok) res.completed ? host.playTech() : host.playBuild();
      host.recomputeCapacities();
      host.markDirtyAndRender();
      return true;
    }
    if (target.closest('#btn-seq-toggle')) {
      w.geneLab.seqActive = !w.geneLab.seqActive;
      host.playClick();
      host.markDirtyAndRender();
      return true;
    }
    if (target.closest('#btn-seq-boost')) {
      w.geneLab.seqBoost = !w.geneLab.seqBoost;
      host.playClick();
      host.markDirtyAndRender();
      return true;
    }
    const mtBtn = target.closest('button[data-minor-trait]');
    if (mtBtn) {
      const res = arpaMod.buyMinorTrait(ctx, mtBtn.dataset.minorTrait);
      host.showToast(res.msg);
      if (res.ok) host.playTech();
      host.recomputeCapacities();
      host.markDirtyAndRender();
      return true;
    }
    const rmTrBtn = target.closest('button[data-remove-trait]');
    if (rmTrBtn) {
      const res = arpaMod.removeNegativeTrait(ctx, rmTrBtn.dataset.removeTrait);
      host.showToast(res.msg);
      if (res.ok) host.playTech();
      host.recomputeCapacities();
      host.markDirtyAndRender();
      return true;
    }
    const crBtn = target.closest('button[data-crispr]');
    if (crBtn) {
      const res = arpaMod.buyCrisprUpgrade(ctx, crBtn.dataset.crispr);
      host.showToast(res.msg);
      if (res.ok) host.playTech();
      host.recomputeCapacities();
      host.saveGame(false);
      host.markDirtyAndRender();
      return true;
    }
    const preUniv = target.closest('button[data-preset-univ]');
    if (preUniv) {
      save.prestige.nextPreset.universe = preUniv.dataset.presetUniv;
      host.playClick();
      host.markDirtyAndRender();
      return true;
    }
    const preBio = target.closest('button[data-preset-biome]');
    if (preBio) {
      save.prestige.nextPreset.biome = preBio.dataset.presetBiome;
      host.playClick();
      host.markDirtyAndRender();
      return true;
    }
    const prePt = target.closest('button[data-preset-pt]');
    if (prePt) {
      save.prestige.nextPreset.planetTrait = prePt.dataset.presetPt;
      host.playClick();
      host.markDirtyAndRender();
      return true;
    }
    const preSpec = target.closest('button[data-preset-species]');
    if (preSpec) {
      save.prestige.nextPreset.species = preSpec.dataset.presetSpecies;
      const sp = dl.MAPS.species[preSpec.dataset.presetSpecies];
      if (sp) host.showToast(`🌌 已预设下轮物种：【${sp.name}】`);
      host.playClick();
      host.markDirtyAndRender();
      return true;
    }
    const gotoBtn = target.closest('button[data-goto-tab]');
    if (gotoBtn && host.switchTab) {
      const [mTab, sTab] = gotoBtn.dataset.gotoTab.split(':');
      host.playClick();
      host.switchTab(mTab, sTab);
      return true;
    }

    // 8. 系统设置、日志、主线展开
    if (target.closest('#btn-toggle-all-missions')) {
      showAllMissions = !showAllMissions;
      host.markDirtyAndRender();
      return true;
    }
    const logCat = target.closest('button[data-log-cat]');
    if (logCat) {
      logCatFilter = logCat.dataset.logCat;
      host.markDirtyAndRender();
      return true;
    }
    if (target.closest('#btn-set-boring')) {
      save.settings.boring = !save.settings.boring;
      host.playClick();
      host.markDirtyAndRender();
      return true;
    }
    const nfBtn = target.closest('button[data-numfmt]');
    if (nfBtn) {
      save.settings.numFormat = nfBtn.dataset.numfmt;
      host.playClick();
      host.markDirtyAndRender();
      return true;
    }
    const thBtn = target.closest('button[data-theme]');
    if (thBtn) {
      save.settings.theme = thBtn.dataset.theme;
      dl.applyTheme(save.settings.theme);
      host.playClick();
      host.markDirtyAndRender();
      return true;
    }

    return false;
  }

  /**
   * 在 250ms 逻辑 Tick 时轻量增量刷新扩展子界面内的动态进度与按钮状态（不重建 DOM）
   */
  function refreshLiveWidgets(host) {
    const bridge = getBridge();
    const { arpaMod } = bridge.modules;
    const ctx = bridge.createContext(host);
    const w = ctx.save.world;
    const m = ctx.metrics;

    // 1. 供电总览
    const pwrSummary = document.getElementById('power-summary-label');
    if (pwrSummary) {
      pwrSummary.className = `text-11 font-bold ${m.powerSurplus >= 0 ? 'text-emerald' : 'text-rose'}`;
      pwrSummary.textContent = `发电 ${m.powerGen.toFixed(0)}MW | 负荷 ${m.powerReq.toFixed(0)}MW | 供电率 ${Math.round((m.powerRatio || 1) * 100)}%`;
    }

    // 2. 基因实验室实时测序进度与基因操作按钮
    const gl = w.geneLab;
    const seqBar = document.getElementById('gene-seq-bar');
    if (seqBar && gl) {
      const pct = Math.min(100, Math.round((gl.seqProgress / Math.max(1, gl.seqMax)) * 100));
      seqBar.style.width = `${pct}%`;
      const seqPts = document.getElementById('gene-seq-pts');
      if (seqPts) seqPts.textContent = gl.genes;
      const seqTxt = document.getElementById('gene-seq-text');
      if (seqTxt) {
        seqTxt.textContent = `测序进度: ${Math.floor(gl.seqProgress)} / ${gl.seqMax} (${pct}%) — 消耗少量知识自动解码基因点数`;
      }
      document.querySelectorAll('#tab-content button[data-minor-trait]').forEach(btn => {
        const lv = (w.minorTraits && w.minorTraits[btn.dataset.minorTrait]) || 0;
        const ok = gl.genes >= (lv + 1);
        btn.disabled = !ok;
        btn.className = `pixel-btn ${ok ? 'bg-purple' : 'bg-slate'} text-10 font-bold shrink-0`;
      });
      document.querySelectorAll('#tab-content button[data-remove-trait]').forEach(btn => {
        const ok = gl.genes >= 3;
        btn.disabled = !ok;
        btn.className = `pixel-btn ${ok ? 'bg-rose' : 'bg-slate'} text-10 font-bold`;
      });
    }

    // 3. ARPA 投资按钮可用性刷新
    const arpaBtns = document.querySelectorAll('#tab-content button[data-arpa-invest]');
    if (arpaBtns.length > 0) {
      arpaBtns.forEach(btn => {
        const [pId, pctStr] = btn.dataset.arpaInvest.split(':');
        const proj = arpaMod.getArpaProjects().find(x => x.id === pId);
        if (!proj) return;
        const total = arpaMod.getArpaTotalCost(ctx, proj);
        const frac = Number(pctStr) / 100;
        const stepCost = {};
        Object.keys(total).forEach(k => { stepCost[k] = Math.max(1, Math.round(total[k] * frac)); });
        const ok = host.canAffordCost(stepCost);
        btn.disabled = !ok;
        btn.className = `pixel-btn ${ok ? 'bg-indigo' : 'bg-slate'} text-10 font-bold`;
      });
    }

    // 4. 转生按钮状态刷新
    const madArm = document.getElementById('btn-mad-arm');
    const madGo = document.getElementById('btn-mad-go');
    if (madArm && madGo) {
      const canMad = host.canMadResetNow();
      const madGain = host.calcMadPlasmidGain();
      madArm.disabled = !canMad;
      madArm.className = `pixel-btn ${w.madArmed ? 'bg-amber' : 'bg-slate'} text-10 font-bold`;
      madArm.textContent = w.madArmed ? '🔓 已解锁保险' : '🔒 武装核弹';
      madGo.disabled = !(canMad && w.madArmed);
      madGo.className = `pixel-btn ${(canMad && w.madArmed) ? 'bg-rose' : 'bg-slate'} text-11 font-bold`;
      madGo.textContent = `☢️ 发射 (+${madGain}余烬)`;
    }
    const presGo = document.getElementById('btn-prestige-go');
    if (presGo) {
      const canP = host.canPrestigeNow();
      const gain = host.calcPrestigeGain();
      const phage = host.calcPhageGain();
      presGo.disabled = !canP;
      presGo.className = `pixel-btn ${canP ? 'bg-purple' : 'bg-slate'} text-11 font-bold`;
      presGo.textContent = canP ? `🚀 启航 (+${gain}余烬 +${phage}噬菌体)` : `未达太空终局 (预计+${gain})`;
    }
  }

  const api = {
    SUB_TABS,
    getSubTabs,
    getActiveSubTab,
    setSubTab,
    updateTopWeatherBar,
    renderSubTabBar,
    renderSubTabContent,
    handleSubTabClick,
    refreshLiveWidgets
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.EvolveModules = root.EvolveModules || {};
    root.EvolveModules.UI = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
