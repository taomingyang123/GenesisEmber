'use strict';

/**
 * 数据加载、索引、格式化与主题配置生成模块（微信小程序纯 JS 版）
 * 与 evolve_web/js/data-loader.js 保持数值与逻辑完全一致
 */

const DATA = require('../data/evolve-bundle.js');

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
 * 按设置的数字格式格式化数值（保留固定小数位以防止局部宽度抖动）
 * @param {number} n
 * @param {string} [mode='metric']
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
  const suffixes = ['', 'K', 'M', 'G', 'T', 'P', 'E'];
  const tier = Math.min(suffixes.length - 1, Math.floor(Math.log10(abs) / 3));
  const scaled = n / Math.pow(10, tier * 3);
  const digits = Math.abs(scaled) >= 100 ? 1 : 2;
  return scaled.toFixed(digits) + suffixes[tier];
}

/**
 * 格式化净产率
 * @param {number} r
 * @returns {string}
 */
function formatRate(r) {
  if (!Number.isFinite(r) || Math.abs(r) < 0.05) return '0.0/s';
  const sign = r > 0 ? '+' : '-';
  const abs = Math.abs(r);
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(1)}G/s`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(1)}M/s`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(1)}K/s`;
  return `${sign}${abs.toFixed(1)}/s`;
}

/**
 * 获取小程序主题配置（返回 CSS 变量字符串及明暗标记，供 WXML 根容器绑定）
 * @param {string} themeId
 * @returns {{id: string, isLight: boolean, bgMain: string, varsStyle: string, vars: object}}
 */
function getThemeConfig(themeId) {
  const theme = MAPS.themes[themeId] || MAPS.themes.pixel || {
    id: 'pixel',
    vars: {
      '--bg-main': '#0b0f17',
      '--bg-panel': '#111827',
      '--bg-card': '#161f33',
      '--bg-card-hover': '#1e293b',
      '--border-dim': '#263248',
      '--border-bright': '#3b4d6b',
      '--text-main': '#e2e8f0',
      '--text-muted': '#94a3b8',
      '--text-dim': '#64748b'
    }
  };
  const vars = theme.vars || {};
  const isLight = theme.id === 'light' || theme.id === 'gruvboxLight';
  const varsStyle = Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(';');
  return {
    id: theme.id,
    isLight,
    bgMain: vars['--bg-main'] || '#0b0f17',
    varsStyle,
    vars
  };
}

module.exports = {
  DATA,
  MAPS,
  getZodiacSign,
  getEffectiveTraits,
  hasTrait,
  hasCrispr,
  formatNumber,
  formatRate,
  getThemeConfig
};
