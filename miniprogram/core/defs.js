'use strict';

/**
 * 全量基础数值与规则定义（与 evolve_web/rna.html 完全一致）
 * 涵盖：7 时代 / 26 资源 / 8 进化节点 / 12 职业 / 35 建筑 / 44 科技 / 51 任务 / 7 天赋
 * 以及 5 类细胞亚结构、8 级城市头衔、10 种政体、7 类扩展建筑
 */

/**
 * 构建完整定义集合
 * @param {object} metrics 实时指标引用（供 M29/M35 检查电网余量）
 * @returns {object}
 */
function createDefinitions(metrics) {
  const ERAS_DEF = [
    {
      id: 'origin', index: 0, name: '生命起源', icon: '🧬', bgTop: '#081a24', bgBot: '#0f2f3d',
      desc: '原始汤中涌动着有机分子。点击采集 RNA，合成生命的第一条双螺旋并向智慧演化。',
      nextReqText: '研究【智人诞生】开启农业',
      actionBtn: { title: '🧬 采集原初汤 (+2 RNA)', color: 'bg-emerald' }
    },
    {
      id: 'agriculture', index: 1, name: '农业文明', icon: '🌾', bgTop: '#0f2314', bgBot: '#214d29',
      desc: '智人定居点建立！分配农民、伐木工与学者，积累人口、住房与基础知识。',
      nextReqText: '人口≥45 + 采矿&数学 + M17',
      actionBtn: { title: '🪓 部落采集 (+木/石/知)', color: 'bg-emerald' }
    },
    {
      id: 'city', index: 2, name: '城市文明', icon: '🏛️', bgTop: '#1e1b2e', bgBot: '#3b335c',
      desc: '青铜与铁器冶炼开启，货币流通与矿产开采推动大型城邦崛起。',
      nextReqText: '人口≥120 + 钢铁 + 大学≥1 + M26',
      actionBtn: { title: '⛏️ 勘探与贸易 (+币/知/矿)', color: 'bg-indigo' }
    },
    {
      id: 'industrial', index: 3, name: '工业文明', icon: '🏭', bgTop: '#241914', bgBot: '#473024',
      desc: '蒸汽机与电网轰鸣，钢铁、水泥、石化与现代工厂重塑大地。',
      nextReqText: '电子学 + 燃煤电厂≥1 + 余电≥10MW',
      actionBtn: { title: '⚙️ 工业实验 (+知/币/钢)', color: 'bg-amber' }
    },
    {
      id: 'atomic', index: 4, name: '原子时代', icon: '☢️', bgTop: '#10241c', bgBot: '#1b4534',
      desc: '重核裂变释放出磅礴清洁电力，粒子物理叩响信息革命大门。',
      nextReqText: '粒子物理 + 核电站≥1 + M37',
      actionBtn: { title: '☢️ 核物理实验 (+知/铀)', color: 'bg-emerald' }
    },
    {
      id: 'information', index: 5, name: '信息文明', icon: '💻', bgTop: '#0c1d33', bgBot: '#16355c',
      desc: '半导体晶圆、微处理器与强人工智能带来指数级科研算力爆发。',
      nextReqText: '人工智能 + 超级计算机≥1 + M43',
      actionBtn: { title: '💻 算力超频 (+知/币/芯)', color: 'bg-sky' }
    },
    {
      id: 'space', index: 6, name: '太空文明', icon: '🚀', bgTop: '#090b1a', bgBot: '#171c3b',
      desc: '火箭刺破苍穹，月球氦-3聚变与火星殖民穹顶为恒星际方舟蓄力。',
      nextReqText: '研究【星际航行】并建造殖民方舟',
      actionBtn: { title: '🚀 深空补给 (+知/火箭部件)', color: 'bg-purple' }
    }
  ];

  const RESOURCES_DEF = [
    { id: 'rna', name: 'RNA', era: 0, baseCap: 100 },
    { id: 'dna', name: 'DNA', era: 0, baseCap: 150 },
    { id: 'food', name: '食物', era: 1, baseCap: 500 },
    { id: 'lumber', name: '木材', era: 1, baseCap: 300 },
    { id: 'stone', name: '石材', era: 1, baseCap: 200 },
    { id: 'knowledge', name: '知识', era: 1, baseCap: 250 },
    { id: 'money', name: '金币', era: 2, baseCap: 1000 },
    { id: 'copper', name: '铜', era: 2, baseCap: 200 },
    { id: 'iron', name: '铁', era: 2, baseCap: 200 },
    { id: 'coal', name: '煤', era: 2, baseCap: 300 },
    { id: 'plywood', name: '木板', era: 2, baseCap: 150 },
    { id: 'brick', name: '砖', era: 2, baseCap: 150 },
    { id: 'wroughtIron', name: '锻铁', era: 2, baseCap: 100 },
    { id: 'steel', name: '钢材', era: 3, baseCap: 200 },
    { id: 'cement', name: '水泥', era: 3, baseCap: 200 },
    { id: 'oil', name: '石油', era: 3, baseCap: 500 },
    { id: 'polymer', name: '聚合物', era: 3, baseCap: 200 },
    { id: 'aluminium', name: '铝', era: 3, baseCap: 200 },
    { id: 'uranium', name: '铀', era: 4, baseCap: 50 },
    { id: 'electronics', name: '电子元件', era: 5, baseCap: 200 },
    { id: 'wafer', name: '晶圆', era: 5, baseCap: 100 },
    { id: 'microprocessor', name: '微处理器', era: 5, baseCap: 100 },
    { id: 'rocketParts', name: '火箭部件', era: 6, baseCap: 50 },
    { id: 'helium3', name: '氦-3', era: 6, baseCap: 100 },
    { id: 'waterIce', name: '水冰', era: 6, baseCap: 200 },
    { id: 'rareMineral', name: '稀有矿物', era: 6, baseCap: 100 }
  ];

  const RES_MAP = Object.fromEntries(RESOURCES_DEF.map(r => [r.id, r]));

  /* 8 节点生命进化主链 */
  const EVO_CHAIN_IDS = [
    'evo_membrane', 'evo_organelle', 'evo_nucleus', 'evo_multicellular',
    'evo_vertebrate', 'evo_mammal', 'evo_primate', 'evo_sapiens'
  ];

  /* 12 种基础职业 */
  const JOBS_DEF = [
    { id: 'farmer', name: '农民', era: 1, reqTech: null, out: { food: 1.0 }, desc: '食物 +1.0/s/人' },
    { id: 'lumberjack', name: '伐木工', era: 1, reqTech: 'tools', out: { lumber: 0.8 }, desc: '木材 +0.8/s/人' },
    { id: 'quarryWorker', name: '采石工', era: 1, reqTech: 'mining', out: { stone: 0.6 }, desc: '石材 +0.6/s/人' },
    { id: 'scholar', name: '学者', era: 1, reqTech: 'writing', out: { knowledge: 0.35 }, desc: '知识 +0.35/s/人' },
    { id: 'miner', name: '矿工', era: 2, reqTech: 'ironAge', out: { iron: 0.45, copper: 0.3 }, desc: '铁 +0.45/s, 铜 +0.3/s' },
    { id: 'coalMiner', name: '煤矿工', era: 2, reqTech: 'advancedMining', out: { coal: 0.25 }, desc: '煤 +0.25/s/人' },
    { id: 'craftsman', name: '工匠', era: 2, reqTech: 'smelting', inRes: { lumber: 0.3, stone: 0.3, iron: 0.15 }, out: { plywood: 0.2, brick: 0.2, wroughtIron: 0.1 }, desc: '加工木板/砖/锻铁 (耗木/石/铁)' },
    { id: 'merchant', name: '商人', era: 2, reqTech: 'currency', out: { money: 0.5 }, desc: '金币 +0.5/s/人' },
    { id: 'professor', name: '教授', era: 2, reqTech: 'currency', out: { knowledge: 1.0 }, desc: '知识 +1.0/s/人' },
    { id: 'engineer', name: '工程师', era: 3, reqTech: 'electricity', out: { money: 0.8 }, desc: '金币 +0.8/s/人' },
    { id: 'scientist', name: '科学家', era: 5, reqTech: 'computing', out: { knowledge: 3.0 }, desc: '知识 +3.0/s/人' },
    { id: 'colonist', name: '太空殖民者', era: 6, reqTech: 'lunarColonization', out: { helium3: 0.2, waterIce: 0.3, rareMineral: 0.15 }, desc: '氦-3 +0.2, 水冰 +0.3, 稀矿 +0.15' }
  ];

  /* 35 种标准建筑 */
  const BUILDINGS_DEF = [
    { id: 'primitiveHut', name: '简陋居所', era: 1, reqTech: 'evo_sapiens', growth: 1.13, baseCost: { lumber: 25, stone: 10 }, desc: '住房上限 +5/座' },
    { id: 'farmland', name: '农田', era: 1, reqTech: 'agriculture', growth: 1.15, baseCost: { lumber: 20, stone: 15 }, desc: '农民产量线性 +20%/座' },
    { id: 'lumberCamp', name: '伐木场', era: 1, reqTech: 'tools', growth: 1.15, baseCost: { lumber: 25, stone: 20 }, desc: '伐木工产量线性 +25%/座' },
    { id: 'quarry', name: '采石场', era: 1, reqTech: 'mining', growth: 1.15, baseCost: { lumber: 30, stone: 30 }, desc: '采石工产量线性 +25%/座' },
    { id: 'warehouse', name: '仓库', era: 1, reqTech: 'construction', growth: 1.13, baseCost: { lumber: 55, stone: 45 }, desc: '食物+200, 木材+150, 石材+150容量' },
    { id: 'library', name: '图书馆', era: 1, reqTech: 'writing', growth: 1.18, baseCost: { lumber: 70, stone: 50, knowledge: 80 }, desc: '知识容量+250/座, 学者效率 +20%' },
    { id: 'mine', name: '矿井', era: 2, reqTech: 'copperAge', growth: 1.18, baseCost: { lumber: 120, stone: 100, money: 50 }, desc: '铜+0.2/s, 铁+0.25/s (铝工业后铝+0.4/s)' },
    { id: 'coalMine', name: '煤矿', era: 2, reqTech: 'advancedMining', growth: 1.18, baseCost: { lumber: 150, stone: 120, money: 90 }, desc: '煤 +0.3/s/座, 煤矿工 +10%' },
    { id: 'smelter', name: '冶炼炉', era: 2, reqTech: 'smelting', growth: 1.18, baseCost: { lumber: 100, stone: 120, iron: 45 }, desc: '铁-0.7/s → 锻铁+0.35/s, 工匠 +15%' },
    { id: 'foundry', name: '铸造工坊', era: 2, reqTech: 'smelting', growth: 1.18, baseCost: { lumber: 180, stone: 140, money: 180 }, desc: '木/石-0.6/s → 木板/砖+0.3/s' },
    { id: 'market', name: '城市集市', era: 2, reqTech: 'currency', growth: 1.18, baseCost: { lumber: 100, stone: 90, money: 80 }, desc: '自动产出金币 +0.5/s/座' },
    { id: 'bank', name: '银行', era: 2, reqTech: 'currency', growth: 1.18, baseCost: { lumber: 140, stone: 110, money: 180 }, desc: '金币容量 +10,000/座' },
    { id: 'university', name: '大学', era: 2, reqTech: 'mathematics', growth: 1.18, baseCost: { brick: 75, plywood: 65, money: 250 }, desc: '知识容量+2000/座, 教授效率 +15%' },
    { id: 'freightWarehouse', name: '货运仓库', era: 2, reqTech: 'construction', growth: 1.15, baseCost: { brick: 60, plywood: 60, money: 180 }, desc: '全部矿产/工业/太空容量 +300/座' },
    { id: 'steelMill', name: '钢铁厂', era: 3, reqTech: 'steel', growth: 1.20, baseCost: { iron: 120, coal: 80, money: 600 }, desc: '铁-2, 煤-1 → 钢+1/s (耗电8MW)' },
    { id: 'cementPlant', name: '水泥厂', era: 3, reqTech: 'industrialization', growth: 1.20, baseCost: { stone: 170, steel: 50, money: 500 }, desc: '石材-3 → 水泥+1/s (耗电5MW)' },
    { id: 'coalPowerPlant', name: '燃煤电厂', era: 3, reqTech: 'electricity', growth: 1.20, baseCost: { iron: 140, coal: 100, money: 800 }, desc: '发电 +20MW/座 (满载煤-0.5/s)' },
    { id: 'oilWell', name: '油井', era: 3, reqTech: 'petroleumIndustry', growth: 1.20, baseCost: { steel: 80, money: 900 }, desc: '石油 +1.0/s/座 (耗电3MW)' },
    { id: 'refinery', name: '炼油厂', era: 3, reqTech: 'petroleumIndustry', growth: 1.20, baseCost: { steel: 100, cement: 100, money: 1200 }, desc: '石油-2 → 聚合物+1/s (耗电6MW)' },
    { id: 'factory', name: '多功能工业厂房', era: 3, reqTech: 'industrialization', growth: 1.20, baseCost: { steel: 100, cement: 80, money: 1400 }, desc: '自动制造电子元件与火箭部件 (10MW)' },
    { id: 'researchCenter', name: '工业研究中心', era: 3, reqTech: 'industrialization', growth: 1.20, baseCost: { steel: 80, cement: 75, money: 1000 }, desc: '知识+2/s, 知识容量+10,000 (耗电5MW)' },
    { id: 'gridControl', name: '电网控制中心', era: 3, reqTech: 'electricity', growth: 1.20, baseCost: { steel: 110, cement: 90, money: 1500 }, desc: '降低全局电力负荷 5%/座 (上限20%)' },
    { id: 'uraniumMine', name: '铀矿井', era: 4, reqTech: 'nuclearFission', growth: 1.24, baseCost: { steel: 110, cement: 80, electronics: 40, money: 1800 }, desc: '铀 +0.3/s/座 (耗电10MW)' },
    { id: 'nuclearPowerPlant', name: '压水堆核电站', era: 4, reqTech: 'nuclearPower', growth: 1.24, baseCost: { steel: 150, cement: 130, uranium: 20, money: 2800 }, desc: '发电 +100MW/座 (满载铀-0.1/s)' },
    { id: 'cleanRoom', name: '半导体无尘室', era: 5, reqTech: 'semiconductors', growth: 1.24, baseCost: { steel: 100, polymer: 120, electronics: 100, money: 4000 }, desc: '电子-1, 聚合物-2 → 晶圆+1/s (15MW)' },
    { id: 'chipFab', name: '芯片光刻代工厂', era: 5, reqTech: 'microprocessors', growth: 1.24, baseCost: { steel: 120, polymer: 150, wafer: 80, money: 6500 }, desc: '晶圆-1, 铝-1 → 微处理器+1/s (20MW)' },
    { id: 'datacenter', name: '大型云数据中心', era: 5, reqTech: 'computing', growth: 1.24, baseCost: { steel: 100, electronics: 120, wafer: 50, money: 8000 }, desc: '知识+10/s, 知识/金币容量+30,000 (25MW)' },
    { id: 'supercomputer', name: 'AI超级计算机', era: 5, reqTech: 'artificialIntelligence', growth: 1.24, baseCost: { steel: 140, microprocessor: 80, money: 12000 }, desc: '工业配方×1.25, 知识/金币容量+100,000' },
    { id: 'launchPad', name: '航天发射场', era: 6, reqTech: 'rocketry', growth: 1.28, baseCost: { steel: 120, cement: 120, electronics: 80, money: 15000 }, desc: '组装火箭部件 +0.6/s/座 (耗电15MW)' },
    { id: 'satelliteNetwork', name: '近地卫星网络', era: 6, reqTech: 'spaceExploration', growth: 1.28, baseCost: { rocketParts: 25, electronics: 80, money: 22000 }, desc: '全局知识科研效率线性 +5%/座' },
    { id: 'moonBase', name: '月球阿尔法基地', era: 6, reqTech: 'lunarColonization', growth: 1.30, baseCost: { rocketParts: 35, steel: 90, electronics: 70, money: 30000 }, desc: '水冰 +0.4/s/座, 支持月球开发' },
    { id: 'helium3Harvester', name: '氦-3开采站', era: 6, reqTech: 'lunarColonization', growth: 1.30, baseCost: { rocketParts: 35, steel: 90, money: 35000 }, desc: '氦-3 +0.5/s/座 (耗电20MW)' },
    { id: 'fusionPowerPlant', name: '受控核聚变电厂', era: 6, reqTech: 'fusionPower', growth: 1.30, baseCost: { steel: 140, electronics: 110, helium3: 30, money: 50000 }, desc: '发电 +500MW/座 (满载氦-3 -0.05/s)' },
    { id: 'marsColony', name: '火星殖民穹顶', era: 6, reqTech: 'marsExploration', growth: 1.32, baseCost: { rocketParts: 45, steel: 110, microprocessor: 60, money: 60000 }, desc: '住房上限+25/座, 稀有矿物 +0.3/s/座' },
    { id: 'colonyShip', name: '恒星际殖民方舟', era: 6, reqTech: 'interstellarTravel', growth: 1.32, maxCount: 1, baseCost: { rocketParts: 50, steel: 180, microprocessor: 90, helium3: 70, money: 120000 }, desc: '文明跃迁终极方舟 (限建1艘)' }
  ];

  /* 44 项科技研究节点 */
  const TECHS_DEF = [
    { id: 'evo_membrane', name: '细胞膜', era: 0, req: [], cost: { rna: 10 }, desc: '解锁 DNA 手动合成 (2 RNA → 1 DNA)' },
    { id: 'evo_organelle', name: '细胞器', era: 0, req: ['evo_membrane'], cost: { rna: 8, dna: 2 }, desc: '生命分子自动产率 +10%' },
    { id: 'evo_nucleus', name: '细胞核', era: 0, req: ['evo_organelle'], cost: { rna: 10, dna: 4 }, desc: '生命产出 +15%，开启真核转录' },
    { id: 'evo_multicellular', name: '多细胞', era: 0, req: ['evo_nucleus'], cost: { dna: 6 }, desc: '生命产出 +15%，组织分化' },
    { id: 'evo_vertebrate', name: '脊椎动物', era: 0, req: ['evo_multicellular'], cost: { dna: 9 }, desc: '生命产出 +20%，神经中枢成型' },
    { id: 'evo_mammal', name: '哺乳动物', era: 0, req: ['evo_vertebrate'], cost: { dna: 14 }, desc: '生命产出 +20%，恒温代谢' },
    { id: 'evo_primate', name: '灵长类', era: 0, req: ['evo_mammal'], cost: { dna: 22 }, desc: '生命产出 +25%，工具使用萌芽' },
    { id: 'evo_sapiens', name: '智人诞生', era: 0, req: ['evo_primate'], cost: { dna: 35 }, desc: '晋升【农业文明】，初始化人口与部落！' },

    { id: 'tools', name: '工具制造', era: 1, req: ['evo_sapiens'], cost: { knowledge: 20, lumber: 20 }, desc: '解锁伐木工与伐木场，采集效率 +10%' },
    { id: 'agriculture', name: '农业', era: 1, req: ['evo_sapiens'], cost: { knowledge: 35, food: 40 }, desc: '解锁农田建造，强化粮食供给' },
    { id: 'construction', name: '建筑学', era: 1, req: ['tools'], cost: { knowledge: 55, lumber: 45, stone: 25 }, desc: '解锁仓库与货运仓库，住房容量 +10%' },
    { id: 'mining', name: '采矿', era: 1, req: ['tools'], cost: { knowledge: 80, stone: 40 }, desc: '解锁采石工与采石场' },
    { id: 'writing', name: '文字', era: 1, req: ['evo_sapiens'], cost: { knowledge: 75, food: 50 }, desc: '解锁学者与图书馆，知识产率 +10%' },
    { id: 'mathematics', name: '数学', era: 1, req: ['writing'], cost: { knowledge: 140, lumber: 65 }, desc: '解锁大学，建筑成本永久 -3%' },

    { id: 'copperAge', name: '铜器时代', era: 2, req: ['mining'], cost: { knowledge: 220, stone: 80 }, desc: '解锁矿井建造与铜矿采掘' },
    { id: 'ironAge', name: '铁器时代', era: 2, req: ['copperAge'], cost: { knowledge: 320, stone: 80 }, desc: '解锁矿工职业（产铁与铜）' },
    { id: 'currency', name: '货币', era: 2, req: ['writing'], cost: { knowledge: 280, food: 150 }, desc: '解锁商人、教授、集市与银行' },
    { id: 'trade', name: '贸易', era: 2, req: ['currency'], cost: { knowledge: 450, money: 250 }, desc: '金币产出 +20%' },
    { id: 'smelting', name: '冶炼', era: 2, req: ['ironAge'], cost: { knowledge: 500, iron: 80, stone: 100 }, desc: '解锁工匠、冶炼炉与铸造工坊' },
    { id: 'advancedMining', name: '高级采矿', era: 2, req: ['smelting'], cost: { knowledge: 800, money: 350, iron: 80 }, desc: '解锁煤矿工与煤矿' },
    { id: 'steel', name: '钢铁', era: 2, req: ['advancedMining'], cost: { knowledge: 1200, money: 550, wroughtIron: 80 }, desc: '解锁钢铁厂，工业文明核心前置' },

    { id: 'mechanicalEngineering', name: '机械工程', era: 3, req: ['steel'], cost: { knowledge: 1700, money: 850, iron: 180 }, desc: '工业设施配方产出 +15%' },
    { id: 'industrialization', name: '工业化', era: 3, req: ['mechanicalEngineering'], cost: { knowledge: 2500, money: 1200, steel: 80 }, desc: '解锁水泥厂、工厂与工业研究中心' },
    { id: 'electricity', name: '电力', era: 3, req: ['mechanicalEngineering'], cost: { knowledge: 2100, money: 900, coal: 100 }, desc: '解锁燃煤电厂、电网控制与工程师' },
    { id: 'chemicalIndustry', name: '化学工业', era: 3, req: ['industrialization'], cost: { knowledge: 3500, money: 1400, steel: 100 }, desc: '解锁聚合物化工体系' },
    { id: 'petroleumIndustry', name: '石油工业', era: 3, req: ['chemicalIndustry'], cost: { knowledge: 4200, money: 2100, steel: 120 }, desc: '解锁油井与炼油厂' },
    { id: 'aluminiumIndustry', name: '铝工业', era: 3, req: ['petroleumIndustry'], cost: { knowledge: 5000, money: 2300, steel: 150 }, desc: '矿井解锁铝矿伴生采掘 (+0.4/s/座)' },
    { id: 'electricalEngineering', name: '电气工程', era: 3, req: ['electricity'], cost: { knowledge: 4400, money: 2000, steel: 90 }, desc: '全局发电有效功率 +15%' },
    { id: 'electronics', name: '电子学', era: 3, req: ['aluminiumIndustry', 'electricalEngineering'], cost: { knowledge: 6500, money: 3000, polymer: 100 }, desc: '解锁工厂电子元件自动化制造' },

    { id: 'nuclearFission', name: '核裂变', era: 4, req: ['electronics'], cost: { knowledge: 9000, money: 4000, electronics: 80 }, desc: '解锁铀矿井与核能前置' },
    { id: 'nuclearPower', name: '核电工程', era: 4, req: ['nuclearFission'], cost: { knowledge: 11500, money: 5800, uranium: 20, steel: 120 }, desc: '解锁压水堆核电站 (100MW/座)' },
    { id: 'radioChemistry', name: '放射化学', era: 4, req: ['nuclearFission'], cost: { knowledge: 11000, money: 4300, uranium: 15 }, desc: '铀矿采掘效率 +20%' },
    { id: 'particlePhysics', name: '粒子物理', era: 4, req: ['nuclearPower', 'radioChemistry'], cost: { knowledge: 16500, money: 7000, electronics: 120 }, desc: '知识科研效率 +20%，信息文明前置' },

    { id: 'semiconductors', name: '半导体', era: 5, req: ['particlePhysics'], cost: { knowledge: 21000, money: 9500, electronics: 140 }, desc: '解锁半导体无尘室与晶圆制造' },
    { id: 'computing', name: '计算机', era: 5, req: ['semiconductors'], cost: { knowledge: 27000, money: 12500, wafer: 75 }, desc: '解锁科学家与大型云数据中心' },
    { id: 'microprocessors', name: '微处理器', era: 5, req: ['computing'], cost: { knowledge: 36000, money: 16000, wafer: 90 }, desc: '解锁芯片光刻代工厂' },
    { id: 'internet', name: '互联网', era: 5, req: ['computing'], cost: { knowledge: 42000, money: 19000, microprocessor: 60 }, desc: '知识与金币全局效率 +20%' },
    { id: 'artificialIntelligence', name: '人工智能', era: 5, req: ['microprocessors', 'internet'], cost: { knowledge: 55000, money: 22000, microprocessor: 90 }, desc: '解锁AI超级计算机，工业配方 ×1.25' },

    { id: 'rocketry', name: '火箭工程', era: 6, req: ['artificialIntelligence'], cost: { knowledge: 70000, money: 35000, steel: 180, electronics: 100 }, desc: '解锁航天发射场与火箭部件量产' },
    { id: 'spaceExploration', name: '太空探索', era: 6, req: ['rocketry'], cost: { knowledge: 90000, money: 45000, rocketParts: 30 }, desc: '解锁近地卫星网络' },
    { id: 'lunarColonization', name: '月球殖民', era: 6, req: ['spaceExploration'], cost: { knowledge: 120000, money: 60000, rocketParts: 40 }, desc: '解锁太空殖民者、月球基地与氦-3开采' },
    { id: 'fusionPower', name: '核聚变', era: 6, req: ['lunarColonization'], cost: { knowledge: 145000, money: 75000, helium3: 40 }, desc: '解锁受控核聚变电厂 (500MW/座)' },
    { id: 'marsExploration', name: '火星探索', era: 6, req: ['lunarColonization'], cost: { knowledge: 190000, money: 100000, rocketParts: 50, helium3: 50 }, desc: '解锁火星殖民穹顶与稀有矿物' },
    { id: 'interstellarTravel', name: '星际航行', era: 6, req: ['marsExploration', 'fusionPower'], cost: { knowledge: 280000, money: 140000, rocketParts: 80, microprocessor: 90 }, desc: '解锁恒星际殖民方舟与终极跃迁' }
  ];

  const TECH_MAP = Object.fromEntries(TECHS_DEF.map(t => [t.id, t]));

  /* 51 项顺序主线任务 */
  const MISSIONS_DEF = [
    { id: 'M01', era: 'origin', name: '首次采集', desc: '累计获得 RNA ≥ 10', check: s => (s.res.rna || 0) >= 10, rewardText: 'RNA +5', reward: { res: { rna: 5 } } },
    { id: 'M02', era: 'origin', name: '第一次合成', desc: '研究【细胞膜】并合成 DNA ≥ 2', check: s => !!s.techs.evo_membrane && (s.res.dna || 0) >= 2, rewardText: 'DNA +2', reward: { res: { dna: 2 } } },
    { id: 'M03', era: 'origin', name: '形成细胞核', desc: '研究进化节点【细胞核】', check: s => !!s.techs.evo_nucleus, rewardText: 'DNA +3', reward: { res: { dna: 3 } } },
    { id: 'M04', era: 'origin', name: '多细胞生命', desc: '研究进化节点【多细胞】', check: s => !!s.techs.evo_multicellular, rewardText: 'DNA +4', reward: { res: { dna: 4 } } },
    { id: 'M05', era: 'origin', name: '哺乳动物', desc: '研究进化节点【哺乳动物】', check: s => !!s.techs.evo_mammal, rewardText: 'DNA +6', reward: { res: { dna: 6 } } },
    { id: 'M06', era: 'origin', name: '灵长动物', desc: '研究进化节点【灵长类】', check: s => !!s.techs.evo_primate, rewardText: 'DNA +10', reward: { res: { dna: 10 } } },
    { id: 'M07', era: 'origin', name: '智人诞生', desc: '研究【智人诞生】开启农业文明', check: s => !!s.techs.evo_sapiens, rewardText: '开启农业文明', reward: {} },

    { id: 'M08', era: 'agriculture', name: '建立定居点', desc: '拥有简陋居所 ≥ 1', check: s => (s.buildings.primitiveHut || 0) >= 1, rewardText: '食物 +30, 木材 +20', reward: { res: { food: 30, lumber: 20 } } },
    { id: 'M09', era: 'agriculture', name: '稳定食物', desc: '分配农民 ≥ 2', check: s => (s.jobs.farmer || 0) >= 2, rewardText: '木材 +25, 知识 +15', reward: { res: { lumber: 25, knowledge: 15 } } },
    { id: 'M10', era: 'agriculture', name: '初始部落', desc: '总人口 ≥ 10', check: s => s.pop >= 10, rewardText: '食物 +60, 木材 +40', reward: { res: { food: 60, lumber: 40 } } },
    { id: 'M11', era: 'agriculture', name: '林业生产', desc: '建造伐木场 ≥ 1', check: s => (s.buildings.lumberCamp || 0) >= 1, rewardText: '木材 +50, 石材 +30', reward: { res: { lumber: 50, stone: 30 } } },
    { id: 'M12', era: 'agriculture', name: '掌握石材', desc: '石材库存 ≥ 30', check: s => (s.res.stone || 0) >= 30, rewardText: '知识 +40', reward: { res: { knowledge: 40 } } },
    { id: 'M13', era: 'agriculture', name: '采石基础', desc: '建造采石场 ≥ 1', check: s => (s.buildings.quarry || 0) >= 1, rewardText: '石材 +60, 知识 +40', reward: { res: { stone: 60, knowledge: 40 } } },
    { id: 'M14', era: 'agriculture', name: '知识储备', desc: '建造图书馆 ≥ 1', check: s => (s.buildings.library || 0) >= 1, rewardText: '知识 +80', reward: { res: { knowledge: 80 } } },
    { id: 'M15', era: 'agriculture', name: '职业分工', desc: '分配学者 ≥ 1', check: s => (s.jobs.scholar || 0) >= 1, rewardText: '知识 +60', reward: { res: { knowledge: 60 } } },
    { id: 'M16', era: 'agriculture', name: '繁荣聚落', desc: '总人口 ≥ 25', check: s => s.pop >= 25, rewardText: '食物 +150, 知识 +100', reward: { res: { food: 150, knowledge: 100 } } },
    { id: 'M17', era: 'agriculture', name: '掌握采矿', desc: '研究【采矿】与【数学】', check: s => !!s.techs.mining && !!s.techs.mathematics, rewardText: '石材 +100, 知识 +120', reward: { res: { stone: 100, knowledge: 120 } } },
    { id: 'M18', era: 'agriculture', name: '农业时代完成', desc: '总人口 ≥ 45 (晋升城市文明)', check: s => s.pop >= 45, rewardText: '金币 +200', reward: { res: { money: 200 } } },

    { id: 'M19', era: 'city', name: '首次开采铜矿', desc: '研究【铁器时代】、矿井≥1 且 铜≥20', check: s => !!s.techs.ironAge && (s.buildings.mine || 0) >= 1 && (s.res.copper || 0) >= 20, rewardText: '铜 +30, 铁 +20', reward: { res: { copper: 30, iron: 20 } } },
    { id: 'M20', era: 'city', name: '获得铁矿', desc: '分配矿工 ≥ 1 且 铁库存 ≥ 20', check: s => (s.jobs.miner || 0) >= 1 && (s.res.iron || 0) >= 20, rewardText: '铁 +40', reward: { res: { iron: 40 } } },
    { id: 'M21', era: 'city', name: '发展采矿', desc: '拥有矿井 ≥ 2', check: s => (s.buildings.mine || 0) >= 2, rewardText: '金币 +250', reward: { res: { money: 250 } } },
    { id: 'M22', era: 'city', name: '煤炭发现', desc: '研究【高级采矿】且 煤矿 ≥ 1', check: s => !!s.techs.advancedMining && (s.buildings.coalMine || 0) >= 1, rewardText: '煤 +60', reward: { res: { coal: 60 } } },
    { id: 'M23', era: 'city', name: '贸易开端', desc: '研究【货币】且 城市集市 ≥ 1', check: s => !!s.techs.currency && (s.buildings.market || 0) >= 1, rewardText: '金币 +300', reward: { res: { money: 300 } } },
    { id: 'M24', era: 'city', name: '累积财富', desc: '金币库存 ≥ 200', check: s => (s.res.money || 0) >= 200, rewardText: '知识 +200', reward: { res: { knowledge: 200 } } },
    { id: 'M25', era: 'city', name: '建立工坊', desc: '研究【冶炼】且 铸造工坊 ≥ 1', check: s => !!s.techs.smelting && (s.buildings.foundry || 0) >= 1, rewardText: '木板 +30, 砖 +30, 锻铁 +20', reward: { res: { plywood: 30, brick: 30, wroughtIron: 20 } } },
    { id: 'M26', era: 'city', name: '钢铁技术', desc: '研究科技【钢铁】', check: s => !!s.techs.steel, rewardText: '铁 +100, 煤 +80', reward: { res: { iron: 100, coal: 80 } } },
    { id: 'M27', era: 'city', name: '现代城市', desc: '总人口 ≥ 120 且 大学 ≥ 1 (晋升工业文明)', check: s => s.pop >= 120 && (s.buildings.university || 0) >= 1, rewardText: '金币 +800, 知识 +500', reward: { res: { money: 800, knowledge: 500 } } },

    { id: 'M28', era: 'industrial', name: '第一座电厂', desc: '建造燃煤电厂 ≥ 1', check: s => (s.buildings.coalPowerPlant || 0) >= 1, rewardText: '煤 +120, 金币 +600', reward: { res: { coal: 120, money: 600 } } },
    { id: 'M29', era: 'industrial', name: '稳定电网', desc: '电网电力余量 ≥ +10 MW', check: () => metrics.powerSurplus >= 10, rewardText: '知识 +800', reward: { res: { knowledge: 800 } } },
    { id: 'M30', era: 'industrial', name: '钢铁生产', desc: '钢铁厂 ≥ 1 且 钢材库存 ≥ 20', check: s => (s.buildings.steelMill || 0) >= 1 && (s.res.steel || 0) >= 20, rewardText: '钢材 +40', reward: { res: { steel: 40 } } },
    { id: 'M31', era: 'industrial', name: '工厂体系', desc: '建造多功能工业厂房 ≥ 1', check: s => (s.buildings.factory || 0) >= 1, rewardText: '水泥 +40, 钢材 +40', reward: { res: { cement: 40, steel: 40 } } },
    { id: 'M32', era: 'industrial', name: '化工材料', desc: '聚合物库存 ≥ 30', check: s => (s.res.polymer || 0) >= 30, rewardText: '石油 +100, 聚合物 +25', reward: { res: { oil: 100, polymer: 25 } } },
    { id: 'M33', era: 'industrial', name: '工业研究', desc: '建造工业研究中心 ≥ 1', check: s => (s.buildings.researchCenter || 0) >= 1, rewardText: '知识 +1500', reward: { res: { knowledge: 1500 } } },
    { id: 'M34', era: 'industrial', name: '铝工业', desc: '研究【铝工业】且 铝库存 ≥ 30', check: s => !!s.techs.aluminiumIndustry && (s.res.aluminium || 0) >= 30, rewardText: '铝 +40', reward: { res: { aluminium: 40 } } },
    { id: 'M35', era: 'industrial', name: '工业巅峰', desc: '研究【电子学】且 余电 ≥ 10MW (晋升原子时代)', check: s => !!s.techs.electronics && metrics.powerSurplus >= 10, rewardText: '电子元件 +30, 金币 +2000', reward: { res: { electronics: 30, money: 2000 } } },

    { id: 'M36', era: 'atomic', name: '发现铀', desc: '铀库存 ≥ 10', check: s => (s.res.uranium || 0) >= 10, rewardText: '铀 +15', reward: { res: { uranium: 15 } } },
    { id: 'M37', era: 'atomic', name: '原子能源', desc: '研究【核电工程】且 压水堆核电站 ≥ 1', check: s => !!s.techs.nuclearPower && (s.buildings.nuclearPowerPlant || 0) >= 1, rewardText: '知识 +3000, 钢材 +80', reward: { res: { knowledge: 3000, steel: 80 } } },
    { id: 'M38', era: 'atomic', name: '粒子物理', desc: '研究【粒子物理】 (晋升信息文明)', check: s => !!s.techs.particlePhysics, rewardText: '电子元件 +50, 知识 +4000', reward: { res: { electronics: 50, knowledge: 4000 } } },

    { id: 'M39', era: 'information', name: '净化无尘室', desc: '建造半导体无尘室 ≥ 1', check: s => (s.buildings.cleanRoom || 0) >= 1, rewardText: '聚合物 +80, 电子元件 +40', reward: { res: { polymer: 80, electronics: 40 } } },
    { id: 'M40', era: 'information', name: '晶圆生产', desc: '晶圆库存 ≥ 20', check: s => (s.res.wafer || 0) >= 20, rewardText: '晶圆 +25', reward: { res: { wafer: 25 } } },
    { id: 'M41', era: 'information', name: '计算时代', desc: '研究科技【计算机】', check: s => !!s.techs.computing, rewardText: '知识 +8000, 金币 +5000', reward: { res: { knowledge: 8000, money: 5000 } } },
    { id: 'M42', era: 'information', name: '代工芯片', desc: '建造芯片光刻代工厂 ≥ 1', check: s => (s.buildings.chipFab || 0) >= 1, rewardText: '晶圆 +30, 铝 +50', reward: { res: { wafer: 30, aluminium: 50 } } },
    { id: 'M43', era: 'information', name: '微处理器量产', desc: '微处理器库存 ≥ 20', check: s => (s.res.microprocessor || 0) >= 20, rewardText: '微处理器 +25', reward: { res: { microprocessor: 25 } } },
    { id: 'M44', era: 'information', name: '强人工智能', desc: '研究【人工智能】且 AI超算 ≥ 1 (晋升太空文明)', check: s => !!s.techs.artificialIntelligence && (s.buildings.supercomputer || 0) >= 1, rewardText: '知识 +20000, 金币 +15000', reward: { res: { knowledge: 20000, money: 15000 } } },

    { id: 'M45', era: 'space', name: '航天基础', desc: '建造航天发射场 ≥ 1', check: s => (s.buildings.launchPad || 0) >= 1, rewardText: '钢材 +100, 电子元件 +60', reward: { res: { steel: 100, electronics: 60 } } },
    { id: 'M46', era: 'space', name: '火箭部件', desc: '火箭部件库存 ≥ 20', check: s => (s.res.rocketParts || 0) >= 20, rewardText: '火箭部件 +15', reward: { res: { rocketParts: 15 } } },
    { id: 'M47', era: 'space', name: '近地卫星', desc: '建造近地卫星网络 ≥ 1', check: s => (s.buildings.satelliteNetwork || 0) >= 1, rewardText: '知识 +35000', reward: { res: { knowledge: 35000 } } },
    { id: 'M48', era: 'space', name: '月球基地', desc: '建造月球阿尔法基地 ≥ 1', check: s => (s.buildings.moonBase || 0) >= 1, rewardText: '火箭部件 +20, 水冰 +40', reward: { res: { rocketParts: 20, waterIce: 40 } } },
    { id: 'M49', era: 'space', name: '获得氦-3', desc: '氦-3库存 ≥ 20', check: s => (s.res.helium3 || 0) >= 20, rewardText: '氦-3 +25', reward: { res: { helium3: 25 } } },
    { id: 'M50', era: 'space', name: '火星拓殖', desc: '建造火星殖民穹顶 ≥ 1', check: s => (s.buildings.marsColony || 0) >= 1, rewardText: '微处理器 +40, 氦-3 +30', reward: { res: { microprocessor: 40, helium3: 30 } } },
    { id: 'M51', era: 'space', name: '发射殖民方舟', desc: '研究【星际航行】并建造恒星际殖民方舟', check: s => !!s.techs.interstellarTravel && (s.buildings.colonyShip || 0) >= 1, rewardText: '解锁文明跃迁！', reward: {} }
  ];

  /* 7 类永久天赋 × 5 级 */
  const PERKS_DEF = [
    { id: 'agriculturalRevolution', name: '农业革命', icon: '🌾', desc: '食物生产 +5%/级', costs: [2, 4, 7, 11, 16] },
    { id: 'industrialRevolution', name: '工业革命', icon: '⚙️', desc: '工业配方产量 +5%/级', costs: [3, 5, 9, 14, 20] },
    { id: 'scientificRevolution', name: '科学革命', icon: '🔬', desc: '知识产出 +6%/级', costs: [3, 6, 10, 15, 22] },
    { id: 'populationBonus', name: '人口红利', icon: '👥', desc: '人口增长率 +5%/级', costs: [2, 5, 8, 13, 19] },
    { id: 'efficientEnergy', name: '高效能源', icon: '⚡', desc: '发电有效功率 +4%/级', costs: [3, 5, 9, 14, 20] },
    { id: 'automation', name: '自动化', icon: '🤖', desc: '自动分配空闲农民 & 基础采集 +10%/级', costs: [5, 8, 12, 18, 26] },
    { id: 'deepHibernation', name: '深度休眠', icon: '💤', desc: '离线收益上限提升至 12/18/24/36/48 小时', costs: [3, 6, 10, 16, 24] }
  ];

  /* 5 大细胞亚结构 */
  const EVOLVE_CELL_STRUCTURES_DEF = [
    {
      id: 'membrane', name: '细胞膜', reqEvo: null,
      baseRna: 2, incRna: 2, baseDna: 0, incDna: 0,
      desc: '将细胞内部组件包裹并同外部隔离的生物膜。每级增加 RNA 上限 +5（每个线粒体额外使其 +5）。'
    },
    {
      id: 'organelles', name: '细胞器', reqEvo: 'evo_membrane',
      baseRna: 12, incRna: 8, baseDna: 4, incDna: 4,
      desc: '细胞内部具有特定功能的亚结构。自动自我复制产生 RNA +1/s（研究【细胞器/有性繁殖】后翻倍至 +2/s）。'
    },
    {
      id: 'nucleus', name: '细胞核', reqEvo: 'evo_organelle',
      baseRna: 38, incRna: 32, incRnaMulti: 16, baseDna: 18, incDna: 16, incDnaMulti: 12,
      desc: '真核细胞内含有遗传物质的核心结构。每秒自动将 2 RNA 转录合成为 1 DNA（脊椎/对称演化后翻倍至 2 DNA/s）。'
    },
    {
      id: 'eukaryotic_cell', name: '真核细胞', reqEvo: 'evo_nucleus',
      baseRna: 20, incRna: 20, baseDna: 40, incDna: 12,
      desc: '具有完整细胞核与复杂内膜系统的细胞。每级增加 DNA 上限 +10（每个线粒体额外使其 +10）。'
    },
    {
      id: 'mitochondria', name: '线粒体', reqEvo: 'evo_multicellular',
      baseRna: 75, incRna: 50, baseDna: 65, incDna: 35,
      desc: '细胞的动力工厂！每座线粒体使每级【细胞膜】额外 +5 RNA 上限，每级【真核细胞】额外 +10 DNA 上限。'
    }
  ];

  /* 回退物种与界别定义 */
  const EVOLVE_KINGDOMS_DEF = [
    { id: 'animal', name: '动物界·细胞吞噬', icon: '🐾', trait: '捕食本能', desc: '吞噬营养物质，采集效率 +25%，猎人/驻军产出 +25%' },
    { id: 'plant', name: '植物界·叶绿体', icon: '🌿', trait: '光合自养', desc: '转化阳光，市民食物消耗永久 -25%，木材产率 +20%' },
    { id: 'fungi', name: '真菌界·几丁质', icon: '🍄', trait: '外骨骼与菌丝', desc: '坚韧细胞壁，石材与全矿产产率 +20%，建筑成本 -4%' }
  ];

  const EVOLVE_SPECIES_DEF = [
    { id: 'human', name: '人类 (Human)', icon: '🧑', trait: '适应力 / 野心', desc: '全能智慧物种：科技研究知识消耗 -5%，全局知识产出 +12%' },
    { id: 'elf', name: '精灵 (Elf)', icon: '🧝', trait: '森林亲和', desc: '优雅林地种族：木材产出 +30%，学者与教授科研效率 +15%' },
    { id: 'dwarf', name: '矮人 (Dwarf)', icon: '🧔', trait: '锻造大师', desc: '地下工匠种族：采石、矿工与工匠锻造产出 +25%，建筑造价 -5%' },
    { id: 'orc', name: '兽人 (Orc)', icon: '👹', trait: '好战狂热', desc: '荒原强悍氏族：军营战利品与基础采集 +30%，初始人口增长 +20%' },
    { id: 'ent', name: '树人 (Ent)', icon: '🌳', trait: '活体森林', desc: '远古植物智慧：木材产率 +40%，农田产量 +20%，士气下限提升' }
  ];

  /* 8 级动态城市头衔 */
  const EVOLVE_CITY_TITLES = [
    { maxPop: 5, name: '营地' },
    { maxPop: 20, name: '村庄' },
    { maxPop: 75, name: '村镇' },
    { maxPop: 250, name: '市镇' },
    { maxPop: 600, name: '城市' },
    { maxPop: 1200, name: '大城市' },
    { maxPop: 2500, name: '城市群' },
    { maxPop: Infinity, name: '联合城市群' }
  ];

  /* 回退政体定义 */
  const EVOLVE_GOV_DEF = [
    { id: 'anarchy', name: '部落自治', era: 1, reqTech: null, desc: '原始氏族自治，无特殊加成或惩罚' },
    { id: 'autocracy', name: '独裁政府', era: 2, reqTech: 'currency', desc: '铁腕统治：军营与重工业配方产出 +18%，全局士气 -8%' },
    { id: 'democracy', name: '民主政府', era: 2, reqTech: 'currency', desc: '自由议会：全局士气 +15%，学者/教授/科学家与贸易产出 +12%' },
    { id: 'oligarchy', name: '寡头政府', era: 2, reqTech: 'trade', desc: '财阀议政：市民税收金币 +30%，集市与银行效率 +20%' },
    { id: 'technocracy', name: '技术官僚', era: 3, reqTech: 'industrialization', desc: '专家治国：科技研究知识消耗 -8%，全局科研效率 +20%' },
    { id: 'socialist', name: '社会主义', era: 3, reqTech: 'industrialization', desc: '计划协同：工匠加工与全矿产产出 +22%，市民士气 +5%' },
    { id: 'federation', name: '银河联邦', era: 6, reqTech: 'spaceExploration', desc: '星际大同：全文明所有资源产出 +25%，全局士气 +15%' }
  ];

  /* 7 种内建 Evolve 扩展建筑 */
  const EVOLVE_EXTRA_BLDS_DEF = [
    {
      id: 'cottage', name: '茅屋', era: 2, reqTech: 'smelting', growth: 1.15,
      baseCost: { money: 300, plywood: 25, brick: 20, wroughtIron: 15 },
      desc: '舒适的砖木结构住宅，住房上限 +3/座，全局士气 +1%/座。'
    },
    {
      id: 'garrison', name: '军营', era: 2, reqTech: 'ironAge', growth: 1.25,
      baseCost: { money: 240, stone: 160, wroughtIron: 10 },
      desc: '训练驻军士兵守卫城邦并外出狩猎：每座自动产出食物 +1.2/s、金币战利品 +0.8/s，提升核威慑评级。'
    },
    {
      id: 'amphitheatre', name: '圆形剧场', era: 2, reqTech: 'currency', growth: 1.22,
      baseCost: { money: 350, stone: 200, lumber: 150 },
      desc: '用戏剧和竞技场娱乐公民，减少高税率不满，每座提升全局士气 +4%、知识 +0.5/s。'
    },
    {
      id: 'apartment', name: '现代公寓', era: 3, reqTech: 'industrialization', growth: 1.22,
      baseCost: { money: 1500, cement: 80, steel: 65 },
      desc: '高密度现代化住宅楼（耗电 1MW/座），每座提供住房上限 +6。'
    },
    {
      id: 'wardenclyffe', name: '沃登克里弗塔', era: 3, reqTech: 'electricity', growth: 1.22,
      baseCost: { money: 2200, copper: 120, cement: 90, steel: 60 },
      desc: '特斯拉无线电能与科学实验高塔（耗电 2MW/座），知识产出 +4.5/s，知识上限 +2,500/座。'
    },
    {
      id: 'biolab', name: '生命科学实验室', era: 4, reqTech: 'nuclearFission', growth: 1.25,
      baseCost: { money: 6000, steel: 110, polymer: 80, electronics: 45 },
      desc: '基因测序与分子生物学研究中心（耗电 2MW/座），知识产出 +12/s，知识上限 +5,000/座。'
    },
    {
      id: 'missile_silo', name: '导弹发射井', era: 4, reqTech: 'nuclearFission', growth: 1.30,
      baseCost: { money: 8500, cement: 140, steel: 130, uranium: 15, oil: 120 },
      desc: '战略核反击发射阵列！建成至少 1 座后，可在【核爆/跃迁】面板解锁【☢️ 相互保证毁灭 (MAD)】核弹重置！'
    }
  ];

  return {
    ERAS_DEF,
    RESOURCES_DEF,
    RES_MAP,
    EVO_CHAIN_IDS,
    JOBS_DEF,
    BUILDINGS_DEF,
    TECHS_DEF,
    TECH_MAP,
    MISSIONS_DEF,
    PERKS_DEF,
    EVOLVE_CELL_STRUCTURES_DEF,
    EVOLVE_KINGDOMS_DEF,
    EVOLVE_SPECIES_DEF,
    EVOLVE_CITY_TITLES,
    EVOLVE_GOV_DEF,
    EVOLVE_EXTRA_BLDS_DEF
  };
}

module.exports = createDefinitions;
