/* 自动生成文件，请勿直接手工修改；请修改 evolve_web/data/*.json 后运行 node tools/build-evolve-data.js */
(function (root) {
  'use strict';
  const data = {
  "biomes": [
    {
      "id": "grassland",
      "name": "草原",
      "icon": "🌾",
      "desc": "草原星球与地球类似，四季分明、温度适中，农业与人类居住条件极佳。",
      "effectsText": "食物产出 +20%，人口生长条件稳定",
      "mods": {
        "food": 1.2,
        "lumber": 1,
        "stone": 1,
        "mine": 1,
        "knowledge": 1,
        "morale": 2
      }
    },
    {
      "id": "oceanic",
      "name": "海洋",
      "icon": "🌊",
      "desc": "海洋星球表面几乎全被液态海洋覆盖，少量岛屿星罗棋布，渔业与水下资源丰富。",
      "effectsText": "食物 +12%，水冰/科研 +6%，煤炭/矿采 -5%",
      "mods": {
        "food": 1.12,
        "lumber": 0.95,
        "stone": 0.95,
        "mine": 0.95,
        "knowledge": 1.06,
        "morale": 0
      }
    },
    {
      "id": "forest",
      "name": "森林",
      "icon": "🌲",
      "desc": "森林星球被茂密的远古林海覆盖，拥有几乎取之不尽的木材与植物群落。",
      "effectsText": "木材产出 +20%，食物 +5%",
      "mods": {
        "food": 1.05,
        "lumber": 1.2,
        "stone": 0.98,
        "mine": 1,
        "knowledge": 1,
        "morale": 2
      }
    },
    {
      "id": "desert",
      "name": "沙漠",
      "icon": "🏜️",
      "desc": "沙漠星球终年炎热干燥，但风蚀岩层裸露出丰富的石材与矿产，太阳能充足。",
      "effectsText": "石材 +20%，矿产 +10%，食物 -25%",
      "mods": {
        "food": 0.75,
        "lumber": 0.9,
        "stone": 1.2,
        "mine": 1.1,
        "knowledge": 1,
        "morale": -2
      }
    },
    {
      "id": "volcanic",
      "name": "火山",
      "icon": "🌋",
      "desc": "火山星球地壳剧烈活动，熔岩与矿脉翻涌地表，富含金属却不利农耕。",
      "effectsText": "食物 -10%，石材 +12%，金属矿产 +8%",
      "mods": {
        "food": 0.9,
        "lumber": 0.95,
        "stone": 1.12,
        "mine": 1.08,
        "knowledge": 1,
        "morale": -3
      }
    },
    {
      "id": "tundra",
      "name": "冻原",
      "icon": "❄️",
      "desc": "冻原星球终年冰封寒冷，植被稀少但严酷环境磨砺出极强的生存与耐力。",
      "effectsText": "煤炭/采掘 +25%，食物 -10%",
      "mods": {
        "food": 0.9,
        "lumber": 0.95,
        "stone": 1.05,
        "mine": 1.15,
        "knowledge": 1.05,
        "morale": -2
      }
    },
    {
      "id": "savanna",
      "name": "稀树",
      "icon": "🦒",
      "desc": "稀树草原温暖开阔，兽群奔腾但林木稀疏，适合游牧与畜牧业。",
      "effectsText": "食物 +10%，贸易/金币 +15%，木材 -20%",
      "mods": {
        "food": 1.1,
        "lumber": 0.8,
        "stone": 1,
        "mine": 1,
        "knowledge": 1,
        "morale": 1
      }
    },
    {
      "id": "swamp",
      "name": "沼泽",
      "icon": "🐊",
      "desc": "沼泽星球湿热泥泞、植被浓密，天然防御极佳且蕴含独特矿物沉积。",
      "effectsText": "防御与工业 +10%，食物 -12%",
      "mods": {
        "food": 0.88,
        "lumber": 1.1,
        "stone": 1,
        "mine": 1.1,
        "knowledge": 1.02,
        "morale": -1
      }
    },
    {
      "id": "ashland",
      "name": "灰幕",
      "icon": "🌫️",
      "desc": "灰幕星球被厚重火山灰云遮蔽，极难农耕却藏有极丰富重金属和工业燃料。",
      "effectsText": "矿产 +25%，石材 +10%，食物 -35%",
      "mods": {
        "food": 0.65,
        "lumber": 0.9,
        "stone": 1.1,
        "mine": 1.25,
        "knowledge": 1,
        "morale": -4
      }
    },
    {
      "id": "taiga",
      "name": "针叶林",
      "icon": "🎄",
      "desc": "针叶林星球气候偏冷，但辽阔泰加林与矿床并存。",
      "effectsText": "木材 +50%，矿产 +10%，食物 -8%",
      "mods": {
        "food": 0.92,
        "lumber": 1.5,
        "stone": 1,
        "mine": 1.1,
        "knowledge": 1,
        "morale": 0
      }
    }
  ],
  "planetTraits": [
    {
      "id": "none",
      "name": "标准行星",
      "desc": "轨道稳定、气候温和的正常行星。",
      "mods": {}
    },
    {
      "id": "toxic",
      "name": "毒气",
      "desc": "大气中充满毒气，人口增长 -15%，但基因突变与测序速度 +25%。",
      "mods": {
        "popGrowth": 0.85,
        "geneSpeed": 1.25
      }
    },
    {
      "id": "mellow",
      "name": "温和",
      "desc": "天然镇静气体使市民士气 +8%，但总体劳作产率 -8%。",
      "mods": {
        "morale": 8,
        "globalProd": 0.92
      }
    },
    {
      "id": "rage",
      "name": "怒火",
      "desc": "空气中含易怒化合物，士兵战斗评级 +15%，但略微增加士兵伤亡。",
      "mods": {
        "combat": 1.15,
        "morale": -3
      }
    },
    {
      "id": "stormy",
      "name": "暴风雨",
      "desc": "强风与暴雨天气更加频繁。",
      "mods": {
        "windBias": 0.35
      }
    },
    {
      "id": "ozone",
      "name": "臭氧",
      "desc": "臭氧层薄弱，阳光辐射强，晴天略减士气但提升生物突变率 +15%。",
      "mods": {
        "morale": -3,
        "geneSpeed": 1.15
      }
    },
    {
      "id": "magnetic",
      "name": "磁性",
      "desc": "异常强大的星球磁场使工业电力有效输出 +10%，并提升科研 +6%。",
      "mods": {
        "power": 1.1,
        "knowledge": 1.06
      }
    },
    {
      "id": "trashed",
      "name": "垃圾",
      "desc": "古老星际垃圾场覆盖地表，木材/石材采集 -15%，但回收与工业合金 +15%。",
      "mods": {
        "lumber": 0.85,
        "stone": 0.85,
        "industry": 1.15
      }
    },
    {
      "id": "elliptical",
      "name": "椭圆",
      "desc": "椭圆轨道拉长行星公转周期至 450 天，夏季与冬季季节效应更显著。",
      "mods": {
        "orbit": 450
      }
    },
    {
      "id": "flare",
      "name": "耀斑",
      "desc": "恒星耀斑周期性掠过，发电偶获额外能量 +8%，知识研究 +5%。",
      "mods": {
        "power": 1.08,
        "knowledge": 1.05
      }
    },
    {
      "id": "dense",
      "name": "高密度",
      "desc": "重金属沉积丰富，采矿产出 +20%，建筑成本 +5%。",
      "mods": {
        "mine": 1.2,
        "buildCost": 1.05
      }
    },
    {
      "id": "unstable",
      "name": "地震",
      "desc": "地质活动频繁，偶发地震但地热与石材/矿产 +12%。",
      "mods": {
        "stone": 1.12,
        "mine": 1.12
      }
    },
    {
      "id": "permafrost",
      "name": "永冻",
      "desc": "厚重永冻层下蕴含壮丽极光，采掘 -15% 但知识产率 +18%。",
      "mods": {
        "mine": 0.85,
        "knowledge": 1.18
      }
    }
  ],
  "universes": [
    {
      "id": "standard",
      "name": "标准宇宙",
      "icon": "🌌",
      "desc": "具有正常物理定律的标准宇宙。",
      "effect": "均衡的物理与演化法则，适合稳步推进全科技与全时代。"
    },
    {
      "id": "heavy",
      "name": "高引力宇宙",
      "icon": "🪐",
      "desc": "这个宇宙的引力比标准宇宙强得多。",
      "effect": "太空时代建筑成本 +15%，但核爆以外的威望/方舟余烬收益 +25%，矿物产出 +10%。"
    },
    {
      "id": "antimatter",
      "name": "反物质宇宙",
      "icon": "⚛️",
      "desc": "这个宇宙主要由反物质组成。",
      "effect": "全资源储量上限 +20%，能源建筑发电 +15%，全局产率基础倍率略低 (-10%) 但上限极高。"
    },
    {
      "id": "evil",
      "name": "邪恶宇宙",
      "icon": "😈",
      "desc": "这个宇宙乾坤颠倒，黑白不分。",
      "effect": "战斗评级与战利品 +35%，专制/军营收益强化，高税率不易引发抗议。"
    },
    {
      "id": "micro",
      "name": "微型宇宙",
      "icon": "🔬",
      "desc": "这个宇宙中的一切都很小。",
      "effect": "所有建筑与科技成本 -20%，威望余烬收益 -25%，节奏超快。"
    },
    {
      "id": "magic",
      "name": "魔法宇宙",
      "icon": "🪄",
      "desc": "这个宇宙中真的有魔法存在。",
      "effect": "全局知识 +15%，寺庙/神秘学研究额外赋能全文明产能 +10%。"
    }
  ],
  "seasons": [
    {
      "id": 0,
      "name": "春天",
      "icon": "🌸",
      "foodMult": 1.15,
      "morale": 4
    },
    {
      "id": 1,
      "name": "夏天",
      "icon": "☀️",
      "foodMult": 1.1,
      "morale": 2
    },
    {
      "id": 2,
      "name": "秋天",
      "icon": "🍂",
      "foodMult": 1.05,
      "morale": 0
    },
    {
      "id": 3,
      "name": "冬天",
      "icon": "❄️",
      "foodMult": 0.8,
      "morale": -5
    }
  ],
  "weathers": [
    {
      "id": 0,
      "name": "晴朗",
      "icon": "☀️",
      "foodMult": 1.05,
      "morale": 3,
      "wind": false
    },
    {
      "id": 1,
      "name": "晴朗&有风",
      "icon": "🌤️",
      "foodMult": 1,
      "morale": 2,
      "wind": true
    },
    {
      "id": 2,
      "name": "多云",
      "icon": "☁️",
      "foodMult": 1,
      "morale": 0,
      "wind": false
    },
    {
      "id": 3,
      "name": "多云&有风",
      "icon": "🌬️",
      "foodMult": 0.98,
      "morale": -1,
      "wind": true
    },
    {
      "id": 4,
      "name": "下雨",
      "icon": "🌧️",
      "foodMult": 1.1,
      "morale": -3,
      "wind": false
    },
    {
      "id": 5,
      "name": "暴风雨",
      "icon": "⛈️",
      "foodMult": 0.92,
      "morale": -6,
      "wind": true
    },
    {
      "id": 6,
      "name": "下雪",
      "icon": "🌨️",
      "foodMult": 0.85,
      "morale": -4,
      "wind": false
    },
    {
      "id": 7,
      "name": "暴风雪",
      "icon": "❄️",
      "foodMult": 0.72,
      "morale": -8,
      "wind": true
    }
  ],
  "temps": [
    {
      "id": 0,
      "name": "寒冷",
      "icon": "🥶",
      "foodMult": 0.9,
      "morale": -2
    },
    {
      "id": 1,
      "name": "温度适中",
      "icon": "🌡️",
      "foodMult": 1,
      "morale": 0
    },
    {
      "id": 2,
      "name": "炎热",
      "icon": "🔥",
      "foodMult": 0.95,
      "morale": -2
    }
  ],
  "moons": [
    {
      "id": 0,
      "name": "新月",
      "icon": "🌑",
      "bonusText": "循环过渡",
      "mods": {}
    },
    {
      "id": 1,
      "name": "娥眉月",
      "icon": "🌒",
      "bonusText": "市民士气 +4%",
      "mods": {
        "morale": 4
      }
    },
    {
      "id": 2,
      "name": "上弦月",
      "icon": "🌓",
      "bonusText": "食物产率 +6%",
      "mods": {
        "food": 1.06
      }
    },
    {
      "id": 3,
      "name": "盈凸月",
      "icon": "🌔",
      "bonusText": "金属矿产 +8%",
      "mods": {
        "mine": 1.08
      }
    },
    {
      "id": 4,
      "name": "满月",
      "icon": "🌕",
      "bonusText": "全局产率 +3%",
      "mods": {
        "global": 1.03
      }
    },
    {
      "id": 5,
      "name": "张弦月",
      "icon": "🌖",
      "bonusText": "知识产率 +8%",
      "mods": {
        "knowledge": 1.08
      }
    },
    {
      "id": 6,
      "name": "下弦月",
      "icon": "🌗",
      "bonusText": "工匠/工业 +6%",
      "mods": {
        "industry": 1.06
      }
    },
    {
      "id": 7,
      "name": "残月",
      "icon": "🌘",
      "bonusText": "税收金币 +10%",
      "mods": {
        "tax": 1.1
      }
    }
  ],
  "zodiac": [
    {
      "id": "aquarius",
      "name": "水瓶座",
      "symbol": "♒︎",
      "desc": "象征水流：旅游与贸易收益 +10%",
      "mods": {
        "trade": 1.1
      }
    },
    {
      "id": "pisces",
      "name": "双鱼座",
      "symbol": "♓︎",
      "desc": "象征鱼：随机事件发生频率提升",
      "mods": {
        "eventFreq": 1.25
      }
    },
    {
      "id": "aries",
      "name": "白羊座",
      "symbol": "♈︎",
      "desc": "象征冲撞：驻军战斗评级 +10%",
      "mods": {
        "combat": 1.1
      }
    },
    {
      "id": "taurus",
      "name": "金牛座",
      "symbol": "♉︎",
      "desc": "象征公牛：全局产能稳步 +4%",
      "mods": {
        "global": 1.04
      }
    },
    {
      "id": "gemini",
      "name": "双子座",
      "symbol": "♊︎",
      "desc": "象征孪生子：知识产量 +8%",
      "mods": {
        "knowledge": 1.08
      }
    },
    {
      "id": "cancer",
      "name": "巨蟹座",
      "symbol": "♋︎",
      "desc": "象征螃蟹：伤兵治愈速度 +35%",
      "mods": {
        "heal": 1.35
      }
    },
    {
      "id": "leo",
      "name": "狮子座",
      "symbol": "♌︎",
      "desc": "象征雄狮：发电总功率 +8%",
      "mods": {
        "power": 1.08
      }
    },
    {
      "id": "virgo",
      "name": "处女座",
      "symbol": "♍︎",
      "desc": "象征处女：农场食物产量 +12%",
      "mods": {
        "food": 1.12
      }
    },
    {
      "id": "libra",
      "name": "天秤座",
      "symbol": "♎︎",
      "desc": "象征天平：人口增长速率 +12%",
      "mods": {
        "popGrowth": 1.12
      }
    },
    {
      "id": "scorpio",
      "name": "天蝎座",
      "symbol": "♏︎",
      "desc": "象征蝎子：间谍培训价格 -25% 且行动更隐蔽",
      "mods": {
        "spyDiscount": 0.75
      }
    },
    {
      "id": "sagittarius",
      "name": "射手座",
      "symbol": "♐︎",
      "desc": "象征弓手：剧场/艺人士气加成 +15%",
      "mods": {
        "moraleBonus": 1.15
      }
    },
    {
      "id": "capricorn",
      "name": "摩羯座",
      "symbol": "♑︎",
      "desc": "象征山羊：贸易盈利与自动路线数量 +10%",
      "mods": {
        "trade": 1.1
      }
    }
  ],
  "genera": [
    {
      "id": "humanoid",
      "name": "类人生物",
      "kingdom": "animal",
      "icon": "🧑",
      "traits": [
        "adaptable",
        "wasteful"
      ],
      "oppose": "fungi",
      "desc": "适应力极强且善用工具的直立智人系种族，代表物种：人类、精灵、兽人。"
    },
    {
      "id": "carnivore",
      "name": "肉食动物",
      "kingdom": "animal",
      "icon": "🐺",
      "traits": [
        "carnivore",
        "beast",
        "cautious"
      ],
      "oppose": "herbivore",
      "desc": "天生的猎食者，擅长狩猎与战斗突袭，代表物种：猫族、狼人、妖狐。"
    },
    {
      "id": "herbivore",
      "name": "草食动物",
      "kingdom": "animal",
      "icon": "🦌",
      "traits": [
        "herbivore",
        "instinct"
      ],
      "oppose": "carnivore",
      "desc": "群居农耕与敏锐直觉并存的温和物种，代表物种：半人马、犀牛、水豚。"
    },
    {
      "id": "small",
      "name": "小型种族",
      "kingdom": "animal",
      "icon": "👺",
      "traits": [
        "small",
        "weak"
      ],
      "oppose": "giant",
      "desc": "体型娇小节省建材但体力有限，代表物种：狗头人、哥布林、侏儒、矮人。"
    },
    {
      "id": "giant",
      "name": "巨人种族",
      "kingdom": "animal",
      "icon": "👹",
      "traits": [
        "large",
        "strong"
      ],
      "oppose": "small",
      "desc": "体格庞大需要更多建材，却拥有惊人的体力，代表物种：食人魔、独眼巨人、巨魔。"
    },
    {
      "id": "reptilian",
      "name": "爬行动物",
      "kingdom": "animal",
      "icon": "🦎",
      "traits": [
        "cold_blooded",
        "scales"
      ],
      "oppose": "avian",
      "desc": "覆有坚硬鳞甲的冷血生物，战斗防护强，代表物种：壁虎人、乌龟人、娜迦。"
    },
    {
      "id": "avian",
      "name": "羽翼生物",
      "kingdom": "animal",
      "icon": "🦅",
      "traits": [
        "flier",
        "hollow_bones",
        "sky_lover"
      ],
      "oppose": "reptilian",
      "desc": "翱翔天际的羽翼物种，建筑锻造更轻便，代表物种：陆行鸟、翼手龙、天龙。"
    },
    {
      "id": "insectoid",
      "name": "节肢昆虫",
      "kingdom": "animal",
      "icon": "🐜",
      "traits": [
        "high_pop",
        "fast_growth",
        "high_metabolism"
      ],
      "oppose": "plant",
      "desc": "人口密集与高速繁殖的虫群社会，代表物种：螳螂人、蝎子人、蚂蚁人。"
    },
    {
      "id": "plant",
      "name": "植物生物",
      "kingdom": "plant",
      "icon": "🌳",
      "traits": [
        "photosynth",
        "sappy",
        "asymmetrical"
      ],
      "oppose": "insectoid",
      "desc": "依靠叶绿体自养的智慧植物，木材与光合食物丰沛，代表物种：树人、仙人掌、捕虫堇。"
    },
    {
      "id": "fungi",
      "name": "真菌生物",
      "kingdom": "fungi",
      "icon": "🍄",
      "traits": [
        "detritivore",
        "spongy"
      ],
      "oppose": "humanoid",
      "desc": "分解有机碎屑维生的菌丝群落，代表物种：孢子虫、蘑菇人、霉菌人。"
    },
    {
      "id": "aquatic",
      "name": "水生生物",
      "kingdom": "animal",
      "icon": "🦈",
      "traits": [
        "submerged",
        "low_light"
      ],
      "oppose": "sand",
      "desc": "适应深海环境的族群，不受雨雪气象波动干扰，代表物种：鲨鱼人、八爪鱼。"
    },
    {
      "id": "fey",
      "name": "精怪种族",
      "kingdom": "plant",
      "icon": "🧚",
      "traits": [
        "elusive",
        "iron_allergy"
      ],
      "oppose": "synthetic",
      "desc": "魔法森林中灵巧隐秘的生灵，间接谍报极强但厌恶重铁器，代表物种：树妖、萨提尔。"
    },
    {
      "id": "heat",
      "name": "烈焰生物",
      "kingdom": "animal",
      "icon": "🔥",
      "traits": [
        "smoldering",
        "cold_intolerance"
      ],
      "oppose": "polar",
      "desc": "熔岩与高温中孕育出的耐热生命，代表物种：不死鸟、火蜥蜴。"
    },
    {
      "id": "polar",
      "name": "极地生物",
      "kingdom": "animal",
      "icon": "❄️",
      "traits": [
        "chilled",
        "heat_intolerance"
      ],
      "oppose": "heat",
      "desc": "凛冬冰原中的耐寒猎手，代表物种：雪怪、温迪戈。"
    },
    {
      "id": "demonic",
      "name": "恶魔种族",
      "kingdom": "animal",
      "icon": "😈",
      "traits": [
        "immoral",
        "evil",
        "soul_eater"
      ],
      "oppose": "angelic",
      "desc": "自硫磺火海诞生的好战种族，掠夺与威慑极具破坏力，代表物种：炎魔、小恶魔。"
    },
    {
      "id": "angelic",
      "name": "天堂种族",
      "kingdom": "animal",
      "icon": "👼",
      "traits": [
        "blissful",
        "pompous",
        "holy"
      ],
      "oppose": "demonic",
      "desc": "光芒万丈的高洁生灵，士气永驻巅峰且神权信仰极强，代表物种：大天使、独角兽。"
    }
  ],
  "species": [
    {
      "id": "human",
      "name": "人类",
      "genus": "humanoid",
      "icon": "🧑",
      "home": "地球",
      "traits": [
        "creative",
        "diverse"
      ],
      "desc": "充满野心、好奇心与探索欲的双足灵长类。"
    },
    {
      "id": "elf",
      "name": "精灵",
      "genus": "humanoid",
      "icon": "🧝",
      "home": "圣树林地",
      "traits": [
        "studious",
        "arrogant"
      ],
      "desc": "长寿、敏捷、与林地高度和谐的高智商类人种族。"
    },
    {
      "id": "orc",
      "name": "兽人",
      "genus": "humanoid",
      "icon": "👹",
      "home": "血岩荒原",
      "traits": [
        "brute",
        "angry"
      ],
      "desc": "高大强壮的绿皮战士种族，极度崇尚力量与荣誉。"
    },
    {
      "id": "cath",
      "name": "猫族",
      "genus": "carnivore",
      "icon": "🐱",
      "home": "月爪草原",
      "traits": [
        "lazy",
        "curious"
      ],
      "desc": "优雅敏捷却又嗜睡的猫科智慧生命。"
    },
    {
      "id": "wolven",
      "name": "狼人",
      "genus": "carnivore",
      "icon": "🐺",
      "home": "银牙森林",
      "traits": [
        "pack_mentality",
        "tracker"
      ],
      "desc": "以族群为荣、纪律严明的狼形掠食者。"
    },
    {
      "id": "vulpine",
      "name": "妖狐",
      "genus": "carnivore",
      "icon": "🦊",
      "home": "灵尾丘陵",
      "traits": [
        "playful",
        "freespirit"
      ],
      "desc": "聪慧灵巧、酷爱恶作剧与自由贸易的狐族。"
    },
    {
      "id": "centaur",
      "name": "半人马",
      "genus": "herbivore",
      "icon": "🐎",
      "home": "风蹄平原",
      "traits": [
        "sniper",
        "hooved"
      ],
      "desc": "兼具马匹奔腾耐力与卓越箭术的草原牧族。"
    },
    {
      "id": "rhinotaur",
      "name": "犀牛",
      "genus": "herbivore",
      "icon": "🦏",
      "home": "铁甲盆地",
      "traits": [
        "rage",
        "heavy"
      ],
      "desc": "身披厚甲的强壮冲锋者，愤怒时战力暴涨。"
    },
    {
      "id": "capybara",
      "name": "水豚",
      "genus": "herbivore",
      "icon": "🦫",
      "home": "宁静湿地",
      "traits": [
        "gnawer",
        "calm"
      ],
      "desc": "情绪无比稳定、总能安抚群体士气的啮齿智者。"
    },
    {
      "id": "kobold",
      "name": "狗头人",
      "genus": "small",
      "icon": "🦎",
      "home": "深矿坑道",
      "traits": [
        "pack_rat",
        "paranoid"
      ],
      "desc": "痴迷囤积物资与挖掘深井的警惕小体型穴居族。"
    },
    {
      "id": "goblin",
      "name": "哥布林",
      "genus": "small",
      "icon": "🤑",
      "home": "金牙山谷",
      "traits": [
        "greedy",
        "merchant"
      ],
      "desc": "精于算计与商业讨价还价的贸易奇才。"
    },
    {
      "id": "gnome",
      "name": "侏儒",
      "genus": "small",
      "icon": "🤓",
      "home": "齿轮工坊",
      "traits": [
        "smart",
        "puny"
      ],
      "desc": "痴迷工程学、物理与发明的袖珍天才。"
    },
    {
      "id": "dwarf",
      "name": "矮人",
      "genus": "small",
      "icon": "🧔",
      "home": "铁炉堡",
      "traits": [
        "artisan",
        "stubborn"
      ],
      "desc": "擅长锻造、冶金与岩石采掘的山巅大师。"
    },
    {
      "id": "ogre",
      "name": "食人魔",
      "genus": "giant",
      "icon": "🧌",
      "home": "巨石高原",
      "traits": [
        "dumb",
        "tough"
      ],
      "desc": "力大无穷但头脑简单的重装巨人。"
    },
    {
      "id": "cyclops",
      "name": "独眼巨人",
      "genus": "giant",
      "icon": "👁️",
      "home": "黑曜石峰",
      "traits": [
        "nearsighted",
        "intelligent"
      ],
      "desc": "出人意料地博学多智且善思考的巨型生灵。"
    },
    {
      "id": "troll",
      "name": "巨魔",
      "genus": "giant",
      "icon": "🧟",
      "home": "幽暗密林",
      "traits": [
        "regenerative",
        "gluttony"
      ],
      "desc": "拥有惊人再生能力与庞大食量的巨型掠食者。"
    },
    {
      "id": "gecko",
      "name": "壁虎人",
      "genus": "reptilian",
      "icon": "🦎",
      "home": "暖阳岩漠",
      "traits": [
        "optimistic",
        "chameleon"
      ],
      "desc": "生性乐观、善于伪装与隐蔽渗透的鳞族。"
    },
    {
      "id": "tortoisan",
      "name": "乌龟人",
      "genus": "reptilian",
      "icon": "🐢",
      "home": "玄甲礁岛",
      "traits": [
        "slow",
        "armored"
      ],
      "desc": "拥有天然龟甲护盾、稳扎稳打的长寿爬虫智者。"
    },
    {
      "id": "slitheryn",
      "name": "娜迦",
      "genus": "reptilian",
      "icon": "🐍",
      "home": "迷雾沼泽",
      "traits": [
        "astrologer",
        "slow_digestion"
      ],
      "desc": "崇拜星辰且无需频繁进食的蛇尾智慧物种。"
    },
    {
      "id": "arraak",
      "name": "陆行鸟",
      "genus": "avian",
      "icon": "🐤",
      "home": "羽风台地",
      "traits": [
        "resourceful",
        "selenophobia"
      ],
      "desc": "极具创意与资源整合力的迅捷鸟类。"
    },
    {
      "id": "dracnid",
      "name": "天龙",
      "genus": "avian",
      "icon": "🐉",
      "home": "龙脊云巅",
      "traits": [
        "hoarder",
        "solitary"
      ],
      "desc": "狂热囤积财宝与稀有矿石的高贵翼龙族。"
    },
    {
      "id": "ent",
      "name": "树人",
      "genus": "plant",
      "icon": "🌳",
      "home": "古橡圣林",
      "traits": [
        "kindling_kindred",
        "pyrophobia"
      ],
      "desc": "缓慢却无比睿智的活体巨木长老。"
    },
    {
      "id": "cacti",
      "name": "仙人掌",
      "genus": "plant",
      "icon": "🌵",
      "home": "绯红沙海",
      "traits": [
        "hyper",
        "skittish"
      ],
      "desc": "在烈日沙海依然生机勃勃、高速运转的多刺植物。"
    },
    {
      "id": "sporgar",
      "name": "孢子虫",
      "genus": "fungi",
      "icon": "🦠",
      "home": "菌毯幽谷",
      "traits": [
        "infectious",
        "parasite"
      ],
      "desc": "借孢子漫天繁衍并同化周遭生命的奇特菌族。"
    },
    {
      "id": "shroomi",
      "name": "蘑菇人",
      "genus": "fungi",
      "icon": "🍄",
      "home": "暗影菌林",
      "traits": [
        "toxic",
        "nyctophilia"
      ],
      "desc": "体内充满生物碱毒素、极度喜爱夜幕与地下矿井的蘑菇种族。"
    },
    {
      "id": "mantis",
      "name": "螳螂人",
      "genus": "insectoid",
      "icon": "🦗",
      "home": "翠刃苇原",
      "traits": [
        "cannibalize",
        "malnutrition"
      ],
      "desc": "以血脉掠食驱动战力的凶猛节肢战士。"
    },
    {
      "id": "antid",
      "name": "蚂蚁人",
      "genus": "insectoid",
      "icon": "🐜",
      "home": "地巢迷宫",
      "traits": [
        "hivemind",
        "tunneler"
      ],
      "desc": "具备蜂巢思维与顶尖地下掘进本能的超级工蚁社会。"
    },
    {
      "id": "sharkin",
      "name": "鲨鱼人",
      "genus": "aquatic",
      "icon": "🦈",
      "home": "深渊海沟",
      "traits": [
        "blood_thirst",
        "apex_predator"
      ],
      "desc": "闻到战火血腥便越战越勇的海洋霸主。"
    },
    {
      "id": "octigoran",
      "name": "八爪鱼",
      "genus": "aquatic",
      "icon": "🐙",
      "home": "珊瑚穹境",
      "traits": [
        "invertebrate",
        "suction_grip"
      ],
      "desc": "拥有八只灵巧触腕的深海多工匠与科学家。"
    },
    {
      "id": "dryad",
      "name": "树妖",
      "genus": "fey",
      "icon": "🌿",
      "home": "翡翠秘境",
      "traits": [
        "befuddle",
        "environmentalist"
      ],
      "desc": "与自然融为一体的奇幻精灵，令敌国军队陷入迷茫。"
    },
    {
      "id": "phoenix",
      "name": "不死鸟",
      "genus": "heat",
      "icon": "🔥",
      "home": "余烬火山",
      "traits": [
        "revive",
        "slow_regen"
      ],
      "desc": "即便阵亡也能自灰烬重生的炽热神鸟。"
    },
    {
      "id": "yeti",
      "name": "雪怪",
      "genus": "polar",
      "icon": "❄️",
      "home": "冰风绝壁",
      "traits": [
        "blurry",
        "snowy"
      ],
      "desc": "风雪中的迷雾巨人，士兵自带极高闪避率。"
    },
    {
      "id": "balorg",
      "name": "炎魔",
      "genus": "demonic",
      "icon": "😈",
      "home": "硫磺裂隙",
      "traits": [
        "fiery",
        "terrifying"
      ],
      "desc": "令邻国战栗的炼狱领主，战斗威力无双但傲慢拒贸。"
    },
    {
      "id": "seraph",
      "name": "大天使",
      "genus": "angelic",
      "icon": "👼",
      "home": "圣光浮岛",
      "traits": [
        "unified",
        "spiritual"
      ],
      "desc": "光辉神圣的秩序化身，令帝国生产力高度协同。"
    }
  ],
  "traits": {
    "adaptable": {
      "name": "适应性强",
      "positive": true,
      "desc": "基因测序速度 +15%，科研略微加快。"
    },
    "wasteful": {
      "name": "挥霍无度",
      "positive": false,
      "desc": "资源加工与建筑基础耗材 +5%。"
    },
    "carnivore": {
      "name": "食肉动物",
      "positive": true,
      "desc": "军事掠夺食物与肉类产出 +25%。"
    },
    "beast": {
      "name": "野兽",
      "positive": true,
      "desc": "基础手动采集 +20%，兵营训练速度 +15%。"
    },
    "cautious": {
      "name": "谨慎",
      "positive": false,
      "desc": "雨天战斗评级 -10%。"
    },
    "herbivore": {
      "name": "食草动物",
      "positive": true,
      "desc": "农业食物产量 +15%。"
    },
    "instinct": {
      "name": "直觉",
      "positive": true,
      "desc": "战役士兵阵亡率降低 15%。"
    },
    "small": {
      "name": "矮小",
      "positive": true,
      "desc": "所有建筑材料成本 -8%。"
    },
    "weak": {
      "name": "孱弱",
      "positive": false,
      "desc": "伐木与采石工人效率 -8%。"
    },
    "large": {
      "name": "巨大",
      "positive": false,
      "desc": "所有建筑材料成本 +8%。"
    },
    "strong": {
      "name": "强壮",
      "positive": true,
      "desc": "伐木、采石与采矿工人产出 +15%。"
    },
    "cold_blooded": {
      "name": "冷血",
      "positive": false,
      "desc": "寒冷气温下产量略微下降 (-6%)。"
    },
    "scales": {
      "name": "鳞甲",
      "positive": true,
      "desc": "士兵护甲提升，战役伤亡减少 20%。"
    },
    "flier": {
      "name": "飞行生物",
      "positive": true,
      "desc": "建筑材料压力减轻 (-4%)，外交侦察敏捷。"
    },
    "hollow_bones": {
      "name": "中空骨骼",
      "positive": true,
      "desc": "工匠锻造物效率 +10%。"
    },
    "sky_lover": {
      "name": "天恋",
      "positive": true,
      "desc": "晴朗天气全局士气 +5%。"
    },
    "high_pop": {
      "name": "人口众多",
      "positive": true,
      "desc": "住房额外承载力 +20%。"
    },
    "fast_growth": {
      "name": "高速繁殖",
      "positive": true,
      "desc": "人口自然增长率 +25%。"
    },
    "high_metabolism": {
      "name": "高速代谢",
      "positive": false,
      "desc": "市民粮食消耗 +15%。"
    },
    "photosynth": {
      "name": "光合作用",
      "positive": true,
      "desc": "市民粮食消耗 -25%，晴天再降 10%。"
    },
    "sappy": {
      "name": "多汁",
      "positive": true,
      "desc": "木材产出 +15%。"
    },
    "asymmetrical": {
      "name": "不对称",
      "positive": false,
      "desc": "贸易卖出价格 -10%。"
    },
    "detritivore": {
      "name": "食屑者",
      "positive": true,
      "desc": "市民粮食消耗 -20%，矿物开采 +10%。"
    },
    "spongy": {
      "name": "海绵状",
      "positive": false,
      "desc": "雨雪天人口自然增长暂停。"
    },
    "submerged": {
      "name": "水下生物",
      "positive": true,
      "desc": "免疫雨天与风暴负面天气影响。"
    },
    "low_light": {
      "name": "弱光",
      "positive": false,
      "desc": "农田食物产出 -10%。"
    },
    "elusive": {
      "name": "难以捉摸",
      "positive": true,
      "desc": "间谍行动失败率大幅降低 (-50%)。"
    },
    "iron_allergy": {
      "name": "铁过敏",
      "positive": false,
      "desc": "铁矿采掘效率 -10%。"
    },
    "smoldering": {
      "name": "闷烧",
      "positive": true,
      "desc": "炎热天气全球产出 +12%。"
    },
    "cold_intolerance": {
      "name": "不耐寒",
      "positive": false,
      "desc": "寒冷季节产率 -10%。"
    },
    "chilled": {
      "name": "酷寒",
      "positive": true,
      "desc": "寒冷与冬日全局产出 +12%。"
    },
    "heat_intolerance": {
      "name": "不耐热",
      "positive": false,
      "desc": "炎热季节产率 -10%。"
    },
    "immoral": {
      "name": "不道德",
      "positive": false,
      "desc": "税率不满度略高，但免疫战争贩子惩罚。"
    },
    "evil": {
      "name": "邪恶",
      "positive": true,
      "desc": "掠夺收益 +25%，军营产出提升。"
    },
    "soul_eater": {
      "name": "噬魂",
      "positive": true,
      "desc": "战斗击杀自动转化为额外资源与士气。"
    },
    "blissful": {
      "name": "极乐",
      "positive": true,
      "desc": "全局士气基础 +15%，永不发生抗税暴动。"
    },
    "pompous": {
      "name": "傲慢浮夸",
      "positive": false,
      "desc": "市集与贸易买价略贵 (+5%)。"
    },
    "holy": {
      "name": "神圣",
      "positive": true,
      "desc": "寺庙加成翻倍 (+100%)。"
    },
    "creative": {
      "name": "创造性",
      "positive": true,
      "desc": "ARPA 大型工程成本降低 12%，科研产率 +10%。"
    },
    "diverse": {
      "name": "多样性",
      "positive": false,
      "desc": "士兵训练速度略降 (-10%)。"
    },
    "studious": {
      "name": "好学",
      "positive": true,
      "desc": "学者、教授与科学家知识产出 +20%，科研消耗 -4%。"
    },
    "arrogant": {
      "name": "傲慢",
      "positive": false,
      "desc": "市场买价 +10%。"
    },
    "brute": {
      "name": "野蛮",
      "positive": true,
      "desc": "军事战斗评级 +25%，兵营收益提升。"
    },
    "angry": {
      "name": "易怒",
      "positive": false,
      "desc": "缺粮时士气下降更快。"
    },
    "lazy": {
      "name": "懒惰",
      "positive": false,
      "desc": "高温晴天工人产率 -8%。"
    },
    "curious": {
      "name": "好奇",
      "positive": true,
      "desc": "科研效率 +12%，随机良性事件增多。"
    },
    "pack_mentality": {
      "name": "群体思维",
      "positive": true,
      "desc": "军营彼此联动提升战斗评级 +15%。"
    },
    "tracker": {
      "name": "追踪者",
      "positive": true,
      "desc": "食物与贸易补给 +15%。"
    },
    "playful": {
      "name": "贪玩",
      "positive": true,
      "desc": "艺人/剧场士气效果 +30%。"
    },
    "freespirit": {
      "name": "自由精神",
      "positive": false,
      "desc": "高税率惩罚略微增强。"
    },
    "sniper": {
      "name": "狙击手",
      "positive": true,
      "desc": "士兵火力评级 +20%。"
    },
    "hooved": {
      "name": "蹄足",
      "positive": false,
      "desc": "基础步兵扩编消耗略增。"
    },
    "rage": {
      "name": "狂暴",
      "positive": true,
      "desc": "战斗伤亡转化为额外攻击力 (+25%)。"
    },
    "heavy": {
      "name": "沉重",
      "positive": false,
      "desc": "太空时代发射载荷成本 +10%。"
    },
    "gnawer": {
      "name": "啃咬者",
      "positive": true,
      "desc": "木材与石材采掘 +10%。"
    },
    "calm": {
      "name": "镇定",
      "positive": true,
      "desc": "全局士气额外 +10%，大幅减少压力。"
    },
    "pack_rat": {
      "name": "仓鼠癖",
      "positive": true,
      "desc": "板条箱与集装箱储量上限 +25%。"
    },
    "paranoid": {
      "name": "多疑",
      "positive": false,
      "desc": "间谍培训费 +10%，但极难被渗透。"
    },
    "greedy": {
      "name": "贪婪",
      "positive": false,
      "desc": "银行与税收受高税率期待影响。"
    },
    "merchant": {
      "name": "商人",
      "positive": true,
      "desc": "自动贸易路线吞吐量 +25%，商业金币 +20%。"
    },
    "smart": {
      "name": "聪明",
      "positive": true,
      "desc": "知识上限 +15%，科研效率 +12%。"
    },
    "puny": {
      "name": "弱小",
      "positive": false,
      "desc": "士兵基础战力 -15%。"
    },
    "artisan": {
      "name": "工匠大师",
      "positive": true,
      "desc": "工匠锻造产出 +25%，建筑成本 -6%。"
    },
    "stubborn": {
      "name": "顽固",
      "positive": false,
      "desc": "政体改革冷却延长。"
    },
    "dumb": {
      "name": "愚笨",
      "positive": false,
      "desc": "知识产出 -12%。"
    },
    "tough": {
      "name": "坚韧",
      "positive": true,
      "desc": "全矿产产出 +18%，战斗减伤 20%。"
    },
    "nearsighted": {
      "name": "近视",
      "positive": false,
      "desc": "间谍行动洞察速度 -10%。"
    },
    "intelligent": {
      "name": "智慧",
      "positive": true,
      "desc": "知识产出 +15%，全球协同 +5%。"
    },
    "regenerative": {
      "name": "再生",
      "positive": true,
      "desc": "伤兵自动恢复速度翻倍。"
    },
    "gluttony": {
      "name": "暴食",
      "positive": false,
      "desc": "市民粮食消耗 +20%。"
    },
    "optimistic": {
      "name": "乐观",
      "positive": true,
      "desc": "全局士气下限提升且 +8%。"
    },
    "chameleon": {
      "name": "变色龙",
      "positive": true,
      "desc": "间谍培训成本 -25% 且不易失败。"
    },
    "slow": {
      "name": "缓慢",
      "positive": false,
      "desc": "人口增长 -10%。"
    },
    "armored": {
      "name": "装甲",
      "positive": true,
      "desc": "士兵战斗伤害减半。"
    },
    "astrologer": {
      "name": "占星家",
      "positive": true,
      "desc": "月相与星座加成效果 +50%。"
    },
    "slow_digestion": {
      "name": "慢速消化",
      "positive": true,
      "desc": "食物消耗 -25%。"
    },
    "resourceful": {
      "name": "足智多谋",
      "positive": true,
      "desc": "全资源储量上限 +12%。"
    },
    "selenophobia": {
      "name": "恐月症",
      "positive": false,
      "desc": "满月期间略感焦虑 (-4% 士气)。"
    },
    "hoarder": {
      "name": "囤积癖",
      "positive": true,
      "desc": "银行与货场容量 +30%。"
    },
    "solitary": {
      "name": "独居",
      "positive": false,
      "desc": "住房容纳效率略降 (-8%)。"
    },
    "kindling_kindred": {
      "name": "木之眷族",
      "positive": true,
      "desc": "木材产率 +35%，爱护森林。"
    },
    "pyrophobia": {
      "name": "恐火症",
      "positive": false,
      "desc": "冶炼与燃煤设施需要额外维护。"
    },
    "hyper": {
      "name": "亢奋",
      "positive": true,
      "desc": "全局生产节奏额外 +8%。"
    },
    "skittish": {
      "name": "胆怯",
      "positive": false,
      "desc": "士兵战力略微降低 (-10%)。"
    },
    "infectious": {
      "name": "传染性",
      "positive": true,
      "desc": "战斗击敌有概率补充人口。"
    },
    "parasite": {
      "name": "寄生",
      "positive": true,
      "desc": "掠夺同时回复自身士气。"
    },
    "toxic": {
      "name": "有毒",
      "positive": true,
      "desc": "全基础采集与工业加工 +10%。"
    },
    "nyctophilia": {
      "name": "喜暗",
      "positive": true,
      "desc": "地下矿井采掘效率 +25%。"
    },
    "cannibalize": {
      "name": "吞噬同类",
      "positive": true,
      "desc": "军营掠夺战利品 +30%。"
    },
    "malnutrition": {
      "name": "营养不良",
      "positive": false,
      "desc": "农田产出 -12%。"
    },
    "hivemind": {
      "name": "蜂巢思维",
      "positive": true,
      "desc": "同岗位工人越多产率叠加越快 (+2%/人，最高+20%)。"
    },
    "tunneler": {
      "name": "掘进者",
      "positive": true,
      "desc": "矿井与煤矿产率 +25%。"
    },
    "blood_thirst": {
      "name": "嗜血",
      "positive": true,
      "desc": "作战胜利大幅振奋士气。"
    },
    "apex_predator": {
      "name": "顶级掠食者",
      "positive": true,
      "desc": "战斗评级 +30%，但无法穿戴重甲。"
    },
    "invertebrate": {
      "name": "无脊椎",
      "positive": false,
      "desc": "士兵基础生命值偏低。"
    },
    "suction_grip": {
      "name": "吸盘抓握",
      "positive": true,
      "desc": "工匠、工厂与科研效率 +15%。"
    },
    "befuddle": {
      "name": "迷惑",
      "positive": true,
      "desc": "间谍煽动与外交亲善效率 +35%。"
    },
    "environmentalist": {
      "name": "环保主义",
      "positive": true,
      "desc": "清洁能源加成 +15%，伐木效率略降。"
    },
    "revive": {
      "name": "涅槃重生",
      "positive": true,
      "desc": "战后阵亡士兵 40% 自动复活。"
    },
    "slow_regen": {
      "name": "缓慢恢复",
      "positive": false,
      "desc": "平时伤兵恢复速度略缓。"
    },
    "blurry": {
      "name": "虚幻模糊",
      "positive": true,
      "desc": "雪天与雾天闪避提升，战损 -25%。"
    },
    "snowy": {
      "name": "冰雪亲和",
      "positive": true,
      "desc": "雪天与冬天全局产量 +15%。"
    },
    "fiery": {
      "name": "炽热之躯",
      "positive": true,
      "desc": "冶炼与军工输出 +25%。"
    },
    "terrifying": {
      "name": "可畏",
      "positive": true,
      "desc": "军事威慑极强，他国不敢轻举妄动，战斗评级 +35%。"
    },
    "unified": {
      "name": "大一统",
      "positive": true,
      "desc": "全文明产出 +12%，外交自带高起点。"
    },
    "spiritual": {
      "name": "灵性",
      "positive": true,
      "desc": "寺庙与牧师产出 +50%。"
    }
  },
  "minorTraits": [
    {
      "id": "tactical",
      "name": "战术思维",
      "desc": "每级使士兵战斗评级 +5%，战损降低。",
      "perLevel": 5
    },
    {
      "id": "analytical",
      "name": "善于分析",
      "desc": "每级使所有知识产量 +4%。",
      "perLevel": 4
    },
    {
      "id": "promiscuous",
      "name": "高速繁衍",
      "desc": "每级使人口自然增长速度 +5%。",
      "perLevel": 5
    },
    {
      "id": "resilient",
      "name": "采掘适应",
      "desc": "每级使煤矿与矿井产量 +4%。",
      "perLevel": 4
    },
    {
      "id": "cunning",
      "name": "灵巧狩猎",
      "desc": "每级使军营狩猎与手动采集 +5%。",
      "perLevel": 5
    },
    {
      "id": "hardy",
      "name": "吃苦耐劳",
      "desc": "每级使水泥、石材与砖块产量 +4%。",
      "perLevel": 4
    },
    {
      "id": "ambidextrous",
      "name": "左右开弓",
      "desc": "每级使工匠加工与工厂配方产出 +4%。",
      "perLevel": 4
    },
    {
      "id": "industrious",
      "name": "勤劳采矿",
      "desc": "每级使铜矿与铁矿产量 +5%。",
      "perLevel": 5
    },
    {
      "id": "content",
      "name": "易满足",
      "desc": "每级减少工作压力并额外提供士气 +1%。",
      "perLevel": 1
    },
    {
      "id": "fibroblast",
      "name": "成纤维细胞",
      "desc": "每级使伤兵治愈速度 +10%。",
      "perLevel": 10
    },
    {
      "id": "metallurgist",
      "name": "冶金学家",
      "desc": "每级使冶炼锻铁与钢铁产出 +5%。",
      "perLevel": 5
    },
    {
      "id": "gambler",
      "name": "赌徒",
      "desc": "每级使赌场与商业金币收入 +6%。",
      "perLevel": 6
    },
    {
      "id": "persuasive",
      "name": "说服力",
      "desc": "每级使贸易路线买入/卖出收益 +4%。",
      "perLevel": 4
    },
    {
      "id": "fortify",
      "name": "基因强化",
      "desc": "每级使全文明基础储能上限 +3%。",
      "perLevel": 3
    },
    {
      "id": "mastery",
      "name": "精通",
      "reqCrispr": "mastered",
      "desc": "每级直接提升成就精通加成 +0.5% 乘数。",
      "perLevel": 0.5
    }
  ],
  "governments": [
    {
      "id": "anarchy",
      "name": "无政府",
      "era": 1,
      "reqTech": null,
      "desc": "原始部落自治。工作压力减半，但人口突破 25 人后全局效率微幅分散 (-10%)。"
    },
    {
      "id": "autocracy",
      "name": "专制",
      "era": 2,
      "reqTech": "currency",
      "desc": "军令铁腕统治：战斗评级 +35%、工作压力 +18%、工业重工 +18%，免疫战争贩子惩罚。"
    },
    {
      "id": "democracy",
      "name": "民主",
      "era": 2,
      "reqTech": "currency",
      "desc": "公民议会：艺人/剧场士气效果 +25%、全局士气 +12%、科研与贸易 +10%，战斗评级 -5%。"
    },
    {
      "id": "oligarchy",
      "name": "寡头",
      "era": 2,
      "reqTech": "trade",
      "desc": "财阀议政：税率上限提升至 50%，抗税暴动阈值 +20%，集市与银行效果 +20%。"
    },
    {
      "id": "theocracy",
      "name": "神权",
      "era": 2,
      "reqTech": "writing",
      "desc": "神恩布道：寺庙加成 +50% 且解锁牧师职业，全球凝聚力提升，教授/科学家知识产量 -15%。"
    },
    {
      "id": "republic",
      "name": "共和",
      "era": 2,
      "reqTech": "currency",
      "desc": "代议共和：银行家效果 +25%、全局士气 +20%，但市民可能发起抗议事件。"
    },
    {
      "id": "socialist",
      "name": "社会主义",
      "era": 3,
      "reqTech": "industrialization",
      "desc": "计划协同：工匠锻造物 +35%、工厂/水泥厂产出 +20%，税收金币收入 -15%。"
    },
    {
      "id": "corpocracy",
      "name": "公司官僚主义",
      "era": 3,
      "reqTech": "industrialization",
      "desc": "超级财团统治：税收减半，但赌场/旅游收入 +150%、工厂/水泥产出 +30%，士气 -8%。"
    },
    {
      "id": "technocracy",
      "name": "技术官僚主义",
      "era": 3,
      "reqTech": "industrialization",
      "desc": "科学精英治国：科技研究知识成本 -8%、全局知识产量 +22%，建筑建材成本 +3%。"
    },
    {
      "id": "federation",
      "name": "联邦制",
      "era": 6,
      "reqTech": "spaceExploration",
      "desc": "星际联合联邦：每征服/吞并一国全局产量额外 +15%，全局士气 +15%，所有产出 +25%。"
    }
  ],
  "governorBackgrounds": [
    {
      "id": "soldier",
      "name": "士兵",
      "title": "将军",
      "desc": "拥有丰富战场经验的指挥官。",
      "effectText": "战斗评级 +15%，士兵伤亡 -15%，新兵训练加速",
      "mods": {
        "combat": 1.15,
        "casualty": 0.85
      }
    },
    {
      "id": "criminal",
      "name": "罪犯",
      "title": "教父",
      "desc": "地下世界的话事人，精于灰色收入与潜行渗透。",
      "effectText": "贸易与赌场金币 +20%，间谍成本 -25%",
      "mods": {
        "money": 1.2,
        "spyCost": 0.75
      }
    },
    {
      "id": "entrepreneur",
      "name": "企业家",
      "title": "董事长",
      "desc": "善于投机与供应链优化的商业奇才。",
      "effectText": "银行与税收 +20%，自动贸易路线吞吐 +15%",
      "mods": {
        "tax": 1.2,
        "tradeVol": 1.15
      }
    },
    {
      "id": "educator",
      "name": "教育家",
      "title": "校长",
      "desc": "对科学教育体系有着深刻洞察的学者。",
      "effectText": "图书馆/大学上限 +20%，全局知识产出 +15%",
      "mods": {
        "knowCap": 1.2,
        "knowledge": 1.15
      }
    },
    {
      "id": "spiritual",
      "name": "神使",
      "title": "大主教",
      "desc": "以信仰凝聚民众精神、平息劳作压力的导师。",
      "effectText": "寺庙信仰与全球士气 +10%",
      "mods": {
        "morale": 10,
        "temple": 1.3
      }
    },
    {
      "id": "bluecollar",
      "name": "蓝领工人",
      "title": "总监工",
      "desc": "深入工业一线、熟悉熔炉与流水线的实干派。",
      "effectText": "矿工、工匠与工厂工业配方产出 +15%",
      "mods": {
        "industry": 1.15,
        "mine": 1.12
      }
    },
    {
      "id": "noble",
      "name": "贵族",
      "title": "公爵",
      "desc": "虽略微高傲，却能震慑外邦、扩大税基。",
      "effectText": "税收 +15%，外交收购与安抚成本 -15%",
      "mods": {
        "tax": 1.15,
        "diploDiscount": 0.85
      }
    },
    {
      "id": "media",
      "name": "媒体人",
      "title": "超级主播",
      "desc": "舆论引导大师，擅于维持城市繁荣声望。",
      "effectText": "剧场/旅游收入 +25%，士气上限 +10%",
      "mods": {
        "tourism": 1.25,
        "moraleCap": 10
      }
    },
    {
      "id": "sports",
      "name": "体育人",
      "title": "总教练",
      "desc": "国民健身与团队协作推动者。",
      "effectText": "士气 +8%，伤兵恢复加速 +30%",
      "mods": {
        "morale": 8,
        "heal": 1.3
      }
    },
    {
      "id": "bureaucrat",
      "name": "官僚",
      "title": "首席市政官",
      "desc": "经验丰富的行政专家，大幅压低公共事业内耗。",
      "effectText": "建筑材料成本 -5%，所有总督自动任务效率提升",
      "mods": {
        "buildCost": 0.95
      }
    }
  ],
  "governorTasks": [
    {
      "id": "autoJobs",
      "name": "智能分派空闲市民",
      "desc": "优先保障食物不缺，余下自动填补学者、矿工等空缺岗位。"
    },
    {
      "id": "autoTax",
      "name": "税收士气动态平衡",
      "desc": "自动维持税率在最高收益同时避免士气低于 95% 或触发暴动。"
    },
    {
      "id": "autoStorage",
      "name": "自动构建与分配箱柜",
      "desc": "建材盈余时自动建造板条箱/集装箱并分配给接近满仓的资源。"
    },
    {
      "id": "autoMerc",
      "name": "自动聘请补充士兵",
      "desc": "金币充足且兵营未满编时自动补充新兵或雇佣兵。"
    },
    {
      "id": "autoSpy",
      "name": "自动培训与派遣间谍",
      "desc": "自动向未征服邻国补充间谍并定期执行破坏或亲善行动。"
    },
    {
      "id": "autoInfra",
      "name": "自动辅助建设住房/农田",
      "desc": "住房将满时自动建造简陋居所，粮食紧张时自动扩建农田。"
    }
  ],
  "arpaProjects": [
    {
      "id": "lhc",
      "name": "超级对撞机",
      "era": 3,
      "reqTech": "industrialization",
      "growth": 1.075,
      "baseCost": {
        "money": 3500,
        "knowledge": 1200,
        "copper": 220,
        "steel": 140
      },
      "desc": "高能粒子对撞研究设施，深化人类对基础物理的理解。",
      "effectText": "每完成 1 座：图书馆/大学/研究中心知识上限 +15%，全局科研效率 +4%"
    },
    {
      "id": "stock_exchange",
      "name": "证券交易所",
      "era": 2,
      "reqTech": "trade",
      "growth": 1.06,
      "baseCost": {
        "money": 1800,
        "plywood": 90,
        "brick": 80,
        "wroughtIron": 45
      },
      "desc": "现代化金融资本市场枢纽，大幅放大银行资金容量与商业活力。",
      "effectText": "每完成 1 座：银行金币上限 +15%，集市/银行/赌场收入 +12%"
    },
    {
      "id": "monument",
      "name": "纪念碑",
      "era": 2,
      "reqTech": "construction",
      "growth": 1.08,
      "baseCost": {
        "stone": 250,
        "lumber": 180,
        "cement": 60,
        "steel": 40
      },
      "variants": [
        "方尖碑",
        "英雄雕像",
        "艺术雕塑",
        "玄武独石",
        "凯旋石柱",
        "太古巨石阵"
      ],
      "desc": "建造宏伟纪念碑以赞颂文明的丰功伟业与不朽荣耀。",
      "effectText": "每完成 1 座：全局士气上限 +4%，当前士气 +2%，旅游魅力提升"
    },
    {
      "id": "railway",
      "name": "铁路",
      "era": 3,
      "reqTech": "mechanicalEngineering",
      "growth": 1.08,
      "baseCost": {
        "money": 2600,
        "lumber": 350,
        "iron": 180,
        "steel": 120
      },
      "desc": "横贯大陆的铁路交通干线，连接各大矿区与贸易枢纽。",
      "effectText": "每完成 1 条：贸易路线可用上限 +2，贸易利润 +6%"
    },
    {
      "id": "launch_facility",
      "name": "发射设施",
      "era": 5,
      "reqTech": "artificialIntelligence",
      "growth": 1.12,
      "maxRank": 3,
      "baseCost": {
        "money": 28000,
        "knowledge": 18000,
        "steel": 250,
        "cement": 220,
        "oil": 180
      },
      "desc": "重型航天火箭装配与垂直发射复合体。",
      "effectText": "每升 1 级：火箭部件与深空工业制造效率 +25%，大幅加速方舟建造"
    }
  ],
  "crisprUpgrades": [
    {
      "id": "morphogenesis",
      "name": "形态发生",
      "req": [],
      "cost": 8,
      "desc": "开启基因工程微调，大幅缩减基因测序周期 (-25%)。"
    },
    {
      "id": "recombination",
      "name": "基因重组",
      "req": [
        "morphogenesis"
      ],
      "cost": 20,
      "desc": "基因突变获得额外效果，全局生命与农业产率 +12%。"
    },
    {
      "id": "synthesis",
      "name": "合成",
      "req": [
        "recombination"
      ],
      "cost": 45,
      "desc": "DNA 自动测序速度与 Genes 基因点产量翻倍 (+100%)。"
    },
    {
      "id": "mitosis",
      "name": "有丝分裂",
      "req": [
        "synthesis"
      ],
      "cost": 85,
      "desc": "转生时获得的质粒/创世余烬收益永久 +25%。"
    },
    {
      "id": "mutation",
      "name": "突变",
      "req": [
        "synthesis"
      ],
      "cost": 120,
      "desc": "可在【基因实验室】消耗基因点数移除物种先天负面特质！"
    },
    {
      "id": "artificer",
      "name": "技工",
      "req": [
        "morphogenesis"
      ],
      "cost": 22,
      "desc": "工匠手动与自动锻造产出 +40%，原料利用率优化。"
    },
    {
      "id": "detail_oriented",
      "name": "注重细节",
      "req": [
        "artificer"
      ],
      "cost": 55,
      "desc": "工匠与工业设施原料消耗不变而产出额外 +25%。"
    },
    {
      "id": "rigorous",
      "name": "一丝不苟",
      "req": [
        "detail_oriented"
      ],
      "cost": 110,
      "desc": "全文明制造业（钢、水泥、晶圆、芯片、火箭）产率 +25%。"
    },
    {
      "id": "geographer",
      "name": "地理学家",
      "req": [],
      "cost": 10,
      "desc": "开局直接解锁增强版【建筑队列】与【研究队列】（上限 6 项）。"
    },
    {
      "id": "architect",
      "name": "建筑师",
      "req": [
        "geographer"
      ],
      "cost": 35,
      "desc": "建筑与研究队列上限翻倍至 14 项，队列自动执行速度提升。"
    },
    {
      "id": "precognition",
      "name": "预知未来",
      "req": [
        "architect"
      ],
      "cost": 70,
      "desc": "在研究面板中提前预览下一时代的全部未来科技树！"
    },
    {
      "id": "governance",
      "name": "总督",
      "req": [
        "geographer"
      ],
      "cost": 18,
      "desc": "永久解锁【总督】系统，开局即可任命行政总督自动打理内政。"
    },
    {
      "id": "civil_service",
      "name": "能臣干吏",
      "req": [
        "governance"
      ],
      "cost": 50,
      "desc": "总督可解锁全部 6 项自动治理任务，且总督数值加成 +50%。"
    },
    {
      "id": "hardened_genes",
      "name": "基因硬化",
      "req": [],
      "cost": 12,
      "desc": "提升基因组稳定性与核辐射抗性，全资源上限 +10%。"
    },
    {
      "id": "unlocked",
      "name": "基因解锁",
      "req": [
        "hardened_genes"
      ],
      "cost": 30,
      "desc": "激活成就【精通 Mastery】：每个已解锁成就提供全局产率加成！"
    },
    {
      "id": "mastered",
      "name": "精通掌控",
      "req": [
        "unlocked"
      ],
      "cost": 95,
      "desc": "解锁【精通】次要基因特质升级，成倍放大成就 Mastery 收益。"
    },
    {
      "id": "negotiator",
      "name": "谈判专家",
      "req": [
        "hardened_genes"
      ],
      "cost": 40,
      "desc": "自动贸易路线的吞吐上限与利润额外受精通 % 加成。"
    },
    {
      "id": "ancients",
      "name": "先祖",
      "req": [
        "recombination"
      ],
      "cost": 60,
      "desc": "寺庙与牧师的信仰全局产率加成翻倍，开局赠送 1 座寺庙。"
    }
  ],
  "extraBuildings": [
    {
      "id": "shed",
      "name": "谷仓货棚",
      "era": 1,
      "reqTech": "agriculture",
      "growth": 1.15,
      "baseCost": {
        "lumber": 40,
        "stone": 25
      },
      "desc": "基础存储设施：食物 +300、木材 +200、石材 +200 容量。"
    },
    {
      "id": "storage_yard",
      "name": "货场",
      "era": 2,
      "reqTech": "construction",
      "growth": 1.18,
      "baseCost": {
        "money": 120,
        "lumber": 90,
        "stone": 75
      },
      "desc": "物流仓储中心：板条箱上限 +8/座，可分配板条箱大幅扩容任意资源。"
    },
    {
      "id": "temple",
      "name": "寺庙",
      "era": 2,
      "reqTech": "writing",
      "growth": 1.22,
      "baseCost": {
        "money": 200,
        "stone": 120,
        "lumber": 80
      },
      "desc": "精神信仰殿堂：全局生产产率 +3%/座，释放贸易路线 +1/座（最高+5）。"
    },
    {
      "id": "boot_camp",
      "name": "新兵训练营",
      "era": 2,
      "reqTech": "ironAge",
      "growth": 1.24,
      "baseCost": {
        "money": 260,
        "stone": 140,
        "iron": 40
      },
      "desc": "加快新兵训练与伤兵康复 +20%/座，缩短间谍培训时间。"
    },
    {
      "id": "hospital",
      "name": "医院",
      "era": 3,
      "reqTech": "industrialization",
      "growth": 1.24,
      "baseCost": {
        "money": 950,
        "cement": 70,
        "brick": 50
      },
      "desc": "现代化医疗机构（耗电 2MW）：人口生长速度 +12%/座，加速伤兵治愈。"
    },
    {
      "id": "casino",
      "name": "赌场",
      "era": 3,
      "reqTech": "trade",
      "growth": 1.25,
      "baseCost": {
        "money": 1600,
        "brick": 80,
        "steel": 45
      },
      "desc": "商业娱乐综合体（耗电 3MW）：金币上限 +5,000，自动产出金币 +6/s。"
    },
    {
      "id": "tourist_center",
      "name": "游客中心",
      "era": 3,
      "reqTech": "electricity",
      "growth": 1.24,
      "baseCost": {
        "money": 2400,
        "steel": 65,
        "cement": 80
      },
      "desc": "文旅创收中心（耗电 4MW）：依据城市纪念碑数量与士气持续产出高额旅游金币。"
    }
  ],
  "extraJobs": [
    {
      "id": "entertainer",
      "name": "艺人",
      "era": 2,
      "reqTech": "currency",
      "out": {},
      "desc": "市民士气 +3%/人，缓解高税率与工作压力"
    },
    {
      "id": "banker",
      "name": "银行家",
      "era": 2,
      "reqTech": "currency",
      "out": {
        "money": 0.9
      },
      "desc": "金币 +0.9/s/人，且使全国税收额外 +6%/人"
    },
    {
      "id": "priest",
      "name": "牧师",
      "era": 2,
      "reqTech": "writing",
      "out": {
        "knowledge": 0.4
      },
      "desc": "知识 +0.4/s/人，提升寺庙信仰全局加成 +1.5%/人"
    }
  ],
  "foreign": {
    "prefixes": [
      "神圣",
      "太阳",
      "月亮",
      "联合",
      "北方",
      "南方",
      "东方",
      "西方",
      "人民",
      "贸易",
      "阴影",
      "星辰"
    ],
    "suffixes": [
      "联合政府",
      "共和国",
      "同盟",
      "王国",
      "帝国",
      "联盟",
      "保护国",
      "酋长国",
      "自治领",
      "王朝"
    ],
    "tactics": [
      {
        "id": 0,
        "name": "伏击",
        "powerReq": 15,
        "lootMult": 0.45,
        "risk": 0.1,
        "hstlGain": 2,
        "desc": "极低风险试探性伏击，战损极少但战利品较少。"
      },
      {
        "id": 1,
        "name": "突袭",
        "powerReq": 45,
        "lootMult": 1,
        "risk": 0.25,
        "hstlGain": 5,
        "desc": "常规军事突袭，掠夺基础物资与金币。"
      },
      {
        "id": 2,
        "name": "抢劫",
        "powerReq": 95,
        "lootMult": 1.85,
        "risk": 0.45,
        "hstlGain": 10,
        "desc": "大规模掠夺资源仓库，敌意大幅升高。"
      },
      {
        "id": 3,
        "name": "突击",
        "powerReq": 180,
        "lootMult": 3,
        "risk": 0.65,
        "hstlGain": 18,
        "desc": "主力重兵正面突击，收获巨额战利品并重创敌方军力。"
      },
      {
        "id": 4,
        "name": "围城",
        "powerReq": 320,
        "lootMult": 4.5,
        "risk": 0.85,
        "hstlGain": 30,
        "desc": "决战围城！胜利后可直接【占领】该国获得永久征税与领土增益！"
      }
    ]
  },
  "events": [
    {
      "id": "shooting_star",
      "type": "minor",
      "minEra": 1,
      "text": "一颗璀璨流星划破夜空，学者们观测天文获得了灵感 (+知识)。",
      "effect": {
        "resPct": {
          "knowledge": 0.04
        }
      }
    },
    {
      "id": "meteor_shower",
      "type": "minor",
      "minEra": 1,
      "text": "绚丽的流星雨倾泻而下，全城居民士气微增，天文学家记下星象 (+知识)。",
      "effect": {
        "resPct": {
          "knowledge": 0.06
        },
        "moraleTemp": 3
      }
    },
    {
      "id": "tumbleweed",
      "type": "minor",
      "minEra": 1,
      "text": "风滚草吹遍了整座城市街头，市民略感荒凉。",
      "effect": {}
    },
    {
      "id": "furryfish",
      "type": "minor",
      "minEra": 1,
      "text": "媒体大肆传闻一种长毛小鱼，虽然没人亲眼见过，但寻找毛毛鱼成为街头时尚！",
      "effect": {
        "moraleTemp": 2
      }
    },
    {
      "id": "cucumber",
      "type": "minor",
      "minEra": 1,
      "text": "一位市民品尝了藤蔓上的恐怖圆柱蔬菜（实际为黄瓜）后呕吐不止，引发一阵喧闹。",
      "effect": {}
    },
    {
      "id": "heatwave",
      "type": "minor",
      "minEra": 1,
      "text": "热浪突然袭击了整座城市，气温升高为【炎热】。",
      "effect": {
        "setTemp": 2
      }
    },
    {
      "id": "coldsnap",
      "type": "minor",
      "minEra": 1,
      "text": "突如其来的寒流席卷领地，气温骤降为【寒冷】。",
      "effect": {
        "setTemp": 0
      }
    },
    {
      "id": "dark_cloud",
      "type": "minor",
      "minEra": 1,
      "text": "乌云密布天际，大雨随时可能降临。",
      "effect": {
        "setWeather": 4
      }
    },
    {
      "id": "sun_burst",
      "type": "minor",
      "minEra": 1,
      "text": "阳光穿透云层照耀沃土，天气转为晴朗！",
      "effect": {
        "setWeather": 0
      }
    },
    {
      "id": "ruins",
      "type": "major",
      "minEra": 1,
      "reqAncient": true,
      "text": "考古队在地下发掘出一座远古先祖遗迹，带回大量基础物资！",
      "effect": {
        "resMultiPct": {
          "food": 0.12,
          "lumber": 0.12,
          "stone": 0.12,
          "iron": 0.15,
          "copper": 0.15
        }
      }
    },
    {
      "id": "klepto",
      "type": "major",
      "minEra": 2,
      "text": "一队商旅在集市顺手拾得无主珍宝与钱币 (+金币)。",
      "effect": {
        "resPct": {
          "money": 0.08
        }
      }
    },
    {
      "id": "dollar",
      "type": "minor",
      "minEra": 2,
      "text": "财政司在旧金库夹层中清点出遗失的零散钱币 (+金币)。",
      "effect": {
        "resFlat": {
          "money": 45
        }
      }
    },
    {
      "id": "contest",
      "type": "minor",
      "minEra": 2,
      "text": "城邦举办了盛大的全城角力与艺术竞赛，街头欢呼声不断 (+士气)！",
      "effect": {
        "moraleTemp": 5
      }
    },
    {
      "id": "discover_oil",
      "type": "major",
      "minEra": 2,
      "text": "勘探队意外在岩层裂隙中发现了一处天然浅层油田 (+石油/煤)！",
      "effect": {
        "resFlat": {
          "coal": 35,
          "oil": 20
        }
      }
    },
    {
      "id": "mine_collapse",
      "type": "major",
      "minEra": 2,
      "text": "深处矿井发生局部坍塌事故，工头迅速组织抢险并损失了少量矿产。",
      "effect": {
        "resPct": {
          "stone": -0.04,
          "iron": -0.04
        }
      }
    },
    {
      "id": "flashmob",
      "type": "minor",
      "minEra": 3,
      "text": "一群青年在中心广场表演了一套无懈可击的机械快闪舞蹈，众人拍手叫绝！",
      "effect": {
        "moraleTemp": 4
      }
    },
    {
      "id": "planking",
      "type": "minor",
      "minEra": 3,
      "text": "拍“扑街照”忽然成为城市里的潮流文化，看起来蠢萌蠢萌的。",
      "effect": {}
    },
    {
      "id": "scandal",
      "type": "major",
      "minEra": 3,
      "text": "一家小报刊登了一则关于市政预算的狗仔八卦，引来些许市民议论 (-士气 2%)。",
      "effect": {
        "moraleTemp": -3
      }
    },
    {
      "id": "protest",
      "type": "major",
      "minEra": 2,
      "reqGov": "republic",
      "text": "共和体制下，两派市民就披萨是否应该加菠萝展开激烈游行抗议！",
      "effect": {
        "moraleTemp": -5
      }
    },
    {
      "id": "solar_boom",
      "type": "major",
      "minEra": 4,
      "text": "强烈的电离层磁暴意外启发了高能物理小组的实验突破 (+知识/电子)！",
      "effect": {
        "resPct": {
          "knowledge": 0.08,
          "electronics": 0.06
        }
      }
    },
    {
      "id": "quantum_echo",
      "type": "major",
      "minEra": 5,
      "text": "超算中心捕获到一组极其规律的宇宙微波脉冲信号，算力与知识瞬间飙升！",
      "effect": {
        "resPct": {
          "knowledge": 0.1,
          "money": 0.05
        }
      }
    },
    {
      "id": "asteroid_gift",
      "type": "major",
      "minEra": 6,
      "text": "一颗近地小行星被捕获并顺利分解入库 (+氦-3 / 稀有矿物)！",
      "effect": {
        "resPct": {
          "helium3": 0.12,
          "rareMineral": 0.12
        }
      }
    }
  ],
  "achievements": [
    {
      "id": "ach_first_rna",
      "name": "原初火花",
      "category": "进化",
      "desc": "在生命起源阶段首次合成 DNA。",
      "check": "dna_created",
      "mastery": 1
    },
    {
      "id": "ach_second_evolution",
      "name": "智慧黎明",
      "category": "进化",
      "desc": "研究【智人诞生】，步入农业文明。",
      "check": "era_1",
      "mastery": 1.5
    },
    {
      "id": "ach_city_rise",
      "name": "城邦崛起",
      "category": "时代",
      "desc": "解锁【城市文明】。",
      "check": "era_2",
      "mastery": 1.5
    },
    {
      "id": "ach_industrial_age",
      "name": "蒸汽与钢铁",
      "category": "时代",
      "desc": "解锁【工业文明】。",
      "check": "era_3",
      "mastery": 2
    },
    {
      "id": "ach_atomic_dawn",
      "name": "裂变时代",
      "category": "时代",
      "desc": "解锁【原子时代】。",
      "check": "era_4",
      "mastery": 2
    },
    {
      "id": "ach_info_boom",
      "name": "硅基纪元",
      "category": "时代",
      "desc": "解锁【信息文明】。",
      "check": "era_5",
      "mastery": 2.5
    },
    {
      "id": "ach_space_odyssey",
      "name": "星辰大海",
      "category": "时代",
      "desc": "解锁【太空文明】。",
      "check": "era_6",
      "mastery": 3
    },
    {
      "id": "ach_pop_25",
      "name": "繁荣聚落",
      "category": "人口",
      "desc": "单局总人口达到 25 人。",
      "check": "pop_25",
      "mastery": 1
    },
    {
      "id": "ach_pop_100",
      "name": "百人城邦",
      "category": "人口",
      "desc": "单局总人口达到 100 人。",
      "check": "pop_100",
      "mastery": 1.5
    },
    {
      "id": "ach_pop_250",
      "name": "摩登都会",
      "category": "人口",
      "desc": "单局总人口达到 250 人。",
      "check": "pop_250",
      "mastery": 2
    },
    {
      "id": "ach_morale_130",
      "name": "极乐净土",
      "category": "民生",
      "desc": "城市士气达到 130% 以上。",
      "check": "morale_130",
      "mastery": 1.5
    },
    {
      "id": "ach_scrooge",
      "name": "守财奴",
      "category": "财富",
      "desc": "金币库存突破 50,000。",
      "check": "money_50k",
      "mastery": 1.5
    },
    {
      "id": "ach_millionaire",
      "name": "钱如废纸",
      "category": "财富",
      "desc": "金币库存突破 500,000。",
      "check": "money_500k",
      "mastery": 2.5
    },
    {
      "id": "ach_enlightenment",
      "name": "启蒙时代",
      "category": "科研",
      "desc": "知识库存突破 50,000。",
      "check": "know_50k",
      "mastery": 2
    },
    {
      "id": "ach_trade_fed",
      "name": "贸易联邦",
      "category": "经济",
      "desc": "同时开通至少 5 条自动贸易路线。",
      "check": "trade_5",
      "mastery": 1.5
    },
    {
      "id": "ach_warehouse",
      "name": "仓鼠帝国",
      "category": "仓储",
      "desc": "累计制造 20 个板条箱或集装箱。",
      "check": "storage_20",
      "mastery": 1.5
    },
    {
      "id": "ach_power_100",
      "name": "电力澎湃",
      "category": "工业",
      "desc": "电网总发电量达到 100 MW。",
      "check": "power_100",
      "mastery": 1.5
    },
    {
      "id": "ach_power_1000",
      "name": "聚变奇观",
      "category": "工业",
      "desc": "电网总发电量达到 1,000 MW。",
      "check": "power_1000",
      "mastery": 2.5
    },
    {
      "id": "ach_arpa_1",
      "name": "巨构奠基",
      "category": "ARPA",
      "desc": "完成任意 1 项 ARPA 大型工程。",
      "check": "arpa_1",
      "mastery": 1.5
    },
    {
      "id": "ach_arpa_5",
      "name": "奇迹缔造者",
      "category": "ARPA",
      "desc": "累计完成 5 项 ARPA 大型工程。",
      "check": "arpa_5",
      "mastery": 2.5
    },
    {
      "id": "ach_genelab",
      "name": "基因破译",
      "category": "基因",
      "desc": "通过基因组测序累计获得 5 枚基因点数。",
      "check": "genes_5",
      "mastery": 2
    },
    {
      "id": "ach_warmonger",
      "name": "铁血征服者",
      "category": "军事",
      "desc": "累计发起并赢得 5 次军事战役。",
      "check": "win_5",
      "mastery": 1.5
    },
    {
      "id": "ach_world_domination",
      "name": "统一世界",
      "category": "外交",
      "desc": "通过军事占领、间谍吞并或收购统一全部 3 个邻国！",
      "check": "unify_3",
      "mastery": 3
    },
    {
      "id": "ach_pacifist",
      "name": "和平主义者",
      "category": "外交",
      "desc": "未发动任何战斗，纯靠谍报吞并或收购统一世界！",
      "check": "pacifist_unify",
      "mastery": 3.5
    },
    {
      "id": "ach_mad",
      "name": "启示录",
      "category": "转生",
      "desc": "完成至少 1 次【相互保证毁灭 (MAD)】核弹重置。",
      "check": "mad_1",
      "mastery": 3
    },
    {
      "id": "ach_bioseed",
      "name": "播种者",
      "category": "转生",
      "desc": "建造殖民方舟并完成至少 1 次【恒星际跃迁】。",
      "check": "ark_1",
      "mastery": 4
    },
    {
      "id": "ach_crispr_5",
      "name": "基因编辑师",
      "category": "基因",
      "desc": "在 CRISPR 基因池中解锁至少 5 项升级。",
      "check": "crispr_5",
      "mastery": 2.5
    },
    {
      "id": "ach_governor",
      "name": "垂拱而治",
      "category": "内政",
      "desc": "任命 1 位总督协助管理你的文明。",
      "check": "governor_1",
      "mastery": 1.5
    },
    {
      "id": "ach_mission_51",
      "name": "史诗圆满",
      "category": "任务",
      "desc": "单局完成全部 51 项顺序主线任务。",
      "check": "mission_51",
      "mastery": 3.5
    },
    {
      "id": "ach_heavy_win",
      "name": "引力主宰",
      "category": "宇宙",
      "desc": "在【高引力宇宙】完成至少 1 次跃迁或核爆。",
      "check": "univ_heavy",
      "mastery": 3
    }
  ],
  "themes": [
    {
      "id": "pixel",
      "name": "像素终端 (默认)",
      "vars": {
        "--bg-main": "#0b0f17",
        "--bg-panel": "#111827",
        "--bg-card": "#161f33",
        "--bg-card-hover": "#1e293b",
        "--border-dim": "#263248",
        "--border-bright": "#3b4d6b",
        "--text-main": "#e2e8f0",
        "--text-muted": "#94a3b8",
        "--text-dim": "#64748b"
      }
    },
    {
      "id": "gruvboxDark",
      "name": "GruvBox 黑暗",
      "vars": {
        "--bg-main": "#1d2021",
        "--bg-panel": "#282828",
        "--bg-card": "#32302f",
        "--bg-card-hover": "#3c3836",
        "--border-dim": "#504945",
        "--border-bright": "#7c6f64",
        "--text-main": "#ebdbb2",
        "--text-muted": "#d5c4a1",
        "--text-dim": "#a89984"
      }
    },
    {
      "id": "dracula",
      "name": "德古拉主题",
      "vars": {
        "--bg-main": "#21222c",
        "--bg-panel": "#282a36",
        "--bg-card": "#343746",
        "--bg-card-hover": "#44475a",
        "--border-dim": "#44475a",
        "--border-bright": "#6272a4",
        "--text-main": "#f8f8f2",
        "--text-muted": "#bd93f9",
        "--text-dim": "#6272a4"
      }
    },
    {
      "id": "dark",
      "name": "经典黑暗",
      "vars": {
        "--bg-main": "#161919",
        "--bg-panel": "#1f2424",
        "--bg-card": "#272d2d",
        "--bg-card-hover": "#313838",
        "--border-dim": "#3c4545",
        "--border-bright": "#1abc9c",
        "--text-main": "#ffffff",
        "--text-muted": "#b2c2c2",
        "--text-dim": "#7f8c8d"
      }
    },
    {
      "id": "night",
      "name": "极夜纯黑",
      "vars": {
        "--bg-main": "#000000",
        "--bg-panel": "#0a0a0a",
        "--bg-card": "#141414",
        "--bg-card-hover": "#1f1f1f",
        "--border-dim": "#2a2a2a",
        "--border-bright": "#525252",
        "--text-main": "#f5f5f5",
        "--text-muted": "#a3a3a3",
        "--text-dim": "#737373"
      }
    },
    {
      "id": "orangeSoda",
      "name": "橘子汽水",
      "vars": {
        "--bg-main": "#131516",
        "--bg-panel": "#1a1d1f",
        "--bg-card": "#24282b",
        "--bg-card-hover": "#2f3438",
        "--border-dim": "#3b4045",
        "--border-bright": "#f97316",
        "--text-main": "#f3f4f6",
        "--text-muted": "#fdba74",
        "--text-dim": "#9ca3af"
      }
    },
    {
      "id": "gruvboxLight",
      "name": "GruvBox 明亮",
      "vars": {
        "--bg-main": "#f2e5bc",
        "--bg-panel": "#fbf1c7",
        "--bg-card": "#ebdbb2",
        "--bg-card-hover": "#d5c4a1",
        "--border-dim": "#bdae93",
        "--border-bright": "#7c6f64",
        "--text-main": "#282828",
        "--text-muted": "#504945",
        "--text-dim": "#7c6f64"
      }
    },
    {
      "id": "light",
      "name": "明亮护眼",
      "vars": {
        "--bg-main": "#e2e8f0",
        "--bg-panel": "#f8fafc",
        "--bg-card": "#ffffff",
        "--bg-card-hover": "#f1f5f9",
        "--border-dim": "#cbd5e1",
        "--border-bright": "#64748b",
        "--text-main": "#0f172a",
        "--text-muted": "#475569",
        "--text-dim": "#64748b"
      }
    }
  ]
};
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = data;
  }
  if (root) {
    root.EVOLVE_WEB_DATA = data;
  }
})(typeof window !== 'undefined' ? window : globalThis);
