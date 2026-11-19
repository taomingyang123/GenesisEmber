(function (root) {
  'use strict';

  /**
   * 数据加载与格式化工具模块
   * 负责索引 Evolve 增强数据、数字格式切换、主题注入与星座月相查询
   */

  function getData() {
    if (root && root.EVOLVE_WEB_DATA) return root.EVOLVE_WEB_DATA;
    if (typeof require === 'function') {
      try {
        return require('../data/evolve-bundle.js');
      } catch (_) {}
    }
    return {
      biomes: [], planetTraits: [], universes: [], seasons: [], weathers: [], temps: [],
      moons: [], zodiac: [], genera: [], species: [], traits: {}, minorTraits: [],
      governments: [], governorBackgrounds: [], governorTasks: [], arpaProjects: [],
      crisprUpgrades: [], extraBuildings: [], extraJobs: [],
      foreign: { prefixes: [], suffixes: [], tactics: [] },
      events: [], achievements: [], themes: []
    };
  }

  const DATA = getData();

  function toMap(arr) {
    const m = {};
    if (Array.isArray(arr)) {
      for (const item of arr) {
        if (item && item.id) m[item.id] = item;
      }
    }
    return m;
  }

  const MAPS = {
    biomes: toMap(DATA.biomes),
    planetTraits: toMap(DATA.planetTraits),
    universes: toMap(DATA.universes),
    genera: toMap(DATA.genera),
    species: toMap(DATA.species),
    minorTraits: toMap(DATA.minorTraits),
    governments: toMap(DATA.governments),
    governorBackgrounds: toMap(DATA.governorBackgrounds),
    arpaProjects: toMap(DATA.arpaProjects),
    crisprUpgrades: toMap(DATA.crisprUpgrades),
    extraBuildings: toMap(DATA.extraBuildings),
    extraJobs: toMap(DATA.extraJobs),
    themes: toMap(DATA.themes)
  };

  /**
   * 计算当前现实日期对应的 12 星座星象（与 Evolve Ya() 一致）
   * @param {Date} [nowDate]
   * @returns {object}
   */
  function getZodiacSign(nowDate) {
    const d = nowDate instanceof Date ? nowDate : new Date();
    const m = d.getMonth();
    const day = d.getDate();
    let id = 'capricorn';
    if ((m === 0 && day >= 20) || (m === 1 && day <= 18)) id = 'aquarius';
    else if ((m === 1 && day >= 19) || (m === 2 && day <= 20)) id = 'pisces';
    else if ((m === 2 && day >= 21) || (m === 3 && day <= 19)) id = 'aries';
    else if ((m === 3 && day >= 20) || (m === 4 && day <= 20)) id = 'taurus';
    else if ((m === 4 && day >= 21) || (m === 5 && day <= 20)) id = 'gemini';
    else if ((m === 5 && day >= 21) || (m === 6 && day <= 22)) id = 'cancer';
    else if ((m === 6 && day >= 23) || (m === 7 && day <= 22)) id = 'leo';
    else if ((m === 7 && day >= 23) || (m === 8 && day <= 22)) id = 'virgo';
    else if ((m === 8 && day >= 23) || (m === 9 && day <= 22)) id = 'libra';
    else if ((m === 9 && day >= 23) || (m === 10 && day <= 22)) id = 'scorpio';
    else if ((m === 10 && day >= 23) || (m === 11 && day <= 21)) id = 'sagittarius';
    return (DATA.zodiac || []).find(z => z.id === id) || (DATA.zodiac || [])[0] || {
      id: 'taurus', name: '金牛座', symbol: '♉︎', desc: '全局产能 +4%', mods: { global: 1.04 }
    };
  }

  /**
   * 获取物种与所属种群的有效特质列表（剔除基因突变已移除的负面特质）
   * @param {object} world
   * @returns {string[]}
   */
  function getEffectiveTraits(world) {
    if (!world) return [];
    const sp = MAPS.species[world.species] || MAPS.species.human;
    if (!sp) return [];
    const genus = MAPS.genera[sp.genus];
    const removed = world.removedTraits || {};
    const list = [];
    if (genus && Array.isArray(genus.traits)) {
      for (const tid of genus.traits) {
        if (!removed[tid] && !list.includes(tid)) list.push(tid);
      }
    }
    if (Array.isArray(sp.traits)) {
      for (const tid of sp.traits) {
        if (!removed[tid] && !list.includes(tid)) list.push(tid);
      }
    }
    return list;
  }

  /**
   * 判断是否持有某个有效特质
   * @param {object} world
   * @param {string} traitId
   * @returns {boolean}
   */
  function hasTrait(world, traitId) {
    return getEffectiveTraits(world).includes(traitId);
  }

  /**
   * 判断 CRISPR 基因池升级是否已解锁
   * @param {object} save
   * @param {string} id
   * @returns {boolean}
   */
  function hasCrispr(save, id) {
    return !!(save && save.prestige && save.prestige.crispr && save.prestige.crispr[id]);
  }

  /**
   * 按设置的数字格式格式化数值
   * @param {number} n
   * @param {string} [mode='metric'] 'metric' | 'scientific' | 'engineering' | 'compact'
   * @returns {string}
   */
  function formatNumber(n, mode) {
    if (!Number.isFinite(n)) return '0';
    const abs = Math.abs(n);
    if (abs < 1000) {
      return (n < 0 ? Math.ceil(n) : Math.floor(n)).toString();
    }
    const fmtMode = mode || 'metric';
    if (fmtMode === 'scientific') {
      const exp = Math.floor(Math.log10(abs));
      const mant = n / Math.pow(10, exp);
      return `${mant.toFixed(2)}e${exp}`;
    }
    if (fmtMode === 'engineering') {
      const exp = Math.floor(Math.log10(abs) / 3) * 3;
      const mant = n / Math.pow(10, exp);
      return `${mant.toFixed(2)}e${exp}`;
    }
    // metric / compact：保留固定小数位，避免在有无小数点间反复跳动导致布局抖动
    const suffixes = ['', 'K', 'M', 'G', 'T', 'P', 'E'];
    const tier = Math.min(suffixes.length - 1, Math.floor(Math.log10(abs) / 3));
    const scaled = n / Math.pow(10, tier * 3);
    const digits = Math.abs(scaled) >= 100 ? 1 : 2;
    return scaled.toFixed(digits) + suffixes[tier];
  }

  /**
   * 应用 Evolve 主题配色 CSS 变量
   * @param {string} themeId
   */
  function applyTheme(themeId) {
    if (typeof document === 'undefined' || !document.documentElement) return;
    const theme = MAPS.themes[themeId] || MAPS.themes.pixel;
    if (!theme || !theme.vars) return;
    const rootStyle = document.documentElement.style;
    for (const [key, val] of Object.entries(theme.vars)) {
      rootStyle.setProperty(key, val);
    }
    const isLight = themeId === 'light' || themeId === 'gruvboxLight';
    document.body.classList.toggle('theme-light-mode', isLight);
    document.body.setAttribute('data-theme', theme.id);
  }

  const api = {
    DATA,
    MAPS,
    getZodiacSign,
    getEffectiveTraits,
    hasTrait,
    hasCrispr,
    formatNumber,
    applyTheme
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.EvolveModules = root.EvolveModules || {};
    root.EvolveModules.DataLoader = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
