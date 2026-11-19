'use strict';

/**
 * 构建并校验 evolve_web/data/*.json -> evolve_web/data/evolve-bundle.js
 * 使 evolve_web/rna.html 既能在纯本地 file:// 双击无 CORS 限制运行，也能在 HTTP / Node 环境直接加载。
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'evolve_web', 'data');

const files = [
  'biomes_planets.json',
  'species_traits.json',
  'gov_arpa_crispr.json',
  'events_achieves.json'
];

const bundle = {};
for (const f of files) {
  const full = path.join(DATA_DIR, f);
  const raw = fs.readFileSync(full, 'utf8');
  const parsed = JSON.parse(raw);
  Object.assign(bundle, parsed);
}

// 交叉引用完整性校验
const genusSet = new Set(bundle.genera.map(g => g.id));
const traitMap = bundle.traits || {};

for (const g of bundle.genera) {
  for (const tid of g.traits) {
    if (!traitMap[tid]) {
      throw new Error(`种群 ${g.id} 引用了不存在的特质: ${tid}`);
    }
  }
}

for (const sp of bundle.species) {
  if (!genusSet.has(sp.genus)) {
    throw new Error(`物种 ${sp.id} 引用了不存在的种群: ${sp.genus}`);
  }
  for (const tid of sp.traits) {
    if (!traitMap[tid]) {
      throw new Error(`物种 ${sp.id} 引用了不存在的特质: ${tid}`);
    }
  }
}

const outPath = path.join(DATA_DIR, 'evolve-bundle.js');
const miniOutPath = path.join(ROOT, 'miniprogram', 'data', 'evolve-bundle.js');
const content = `/* 自动生成文件，请勿直接手工修改；请修改 evolve_web/data/*.json 后运行 node tools/build-evolve-data.js */
(function (root) {
  'use strict';
  const data = ${JSON.stringify(bundle, null, 2)};
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = data;
  }
  if (root) {
    root.EVOLVE_WEB_DATA = data;
  }
})(typeof window !== 'undefined' ? window : globalThis);
`;

fs.writeFileSync(outPath, content, 'utf8');
fs.mkdirSync(path.dirname(miniOutPath), { recursive: true });
fs.writeFileSync(miniOutPath, content, 'utf8');
console.log(
  `[build-evolve-data] 成功生成 ${path.relative(ROOT, outPath)} 与 ${path.relative(ROOT, miniOutPath)}: ` +
  `${bundle.biomes.length} 群系, ${bundle.planetTraits.length} 行星特性, ` +
  `${bundle.genera.length} 种群, ${bundle.species.length} 物种, ` +
  `${Object.keys(bundle.traits).length} 主修特质, ${bundle.minorTraits.length} 次要特质, ` +
  `${bundle.governments.length} 政体, ${bundle.arpaProjects.length} ARPA工程, ` +
  `${bundle.crisprUpgrades.length} CRISPR升级, ${bundle.events.length} 事件, ${bundle.achievements.length} 成就`
);
