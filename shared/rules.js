/* 潮汐据点 — shared rules. No art paths. Portraits/icons resolve by id via assets/manifest.json. */
(function (factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (typeof globalThis !== "undefined") globalThis.TideRules = api;
})(function () {
  "use strict";

  var SAVE_VERSION = 1;
  var STAMINA_CAP = 60;
  var STAMINA_MS = 6 * 60 * 1000;
  var OFFLINE_CAP_H = 8;
  var MAX_BUILD_LEVEL = 5;
  var MAX_STAR = 3;
  var STAR_COST = { 2: 10, 3: 25 };
  var SPEEDUP_OFFER_DESIGN_SEC = 15 * 60;
  var WALL_FOR_CHAPTER_2 = 2;
  var PARTY_SIZE = 5;

  var ROLE_SLOTS = { front: [0, 1], mid: [2], back: [3, 4] };
  var ROLE_NAME = { front: "前排", mid: "中排", back: "后排" };

  function strike(atk, def) {
    var mitigated = atk * (100 / (100 + def * 8));
    return Math.max(1, Math.round(mitigated));
  }

  var HEROES = {
    reef_guard: hero("reef_guard", "礁卫·岩潮", "front", "把浪压回礁上的人。",
      { hp: 720, atk: 20, def: 10, interval: 1200 },
      { name: "礁盾打击", kind: "single", mult: 2.2 },
      { name: "潮墙反冲", kind: "single_shield", mult: 2.5, shield: 0.12 }),
    tide_blade: hero("tide_blade", "潮刃·折浪", "front", "专砍回涌的浪头。",
      { hp: 560, atk: 26, def: 5, interval: 1100 },
      { name: "劈浪", kind: "single", mult: 2.4 },
      { name: "折浪连斩", kind: "single", mult: 1.7, hits: 2 }),
    tide_medic: hero("tide_medic", "汐医·洄灯", "mid", "用一盏回流的灯替人续潮。",
      { hp: 480, atk: 14, def: 4, interval: 1300 },
      { name: "灯疗", kind: "heal", mult: 4.2 },
      { name: "洄潮", kind: "heal_all", mult: 3.1 }),
    tide_crossbow: hero("tide_crossbow", "弩潮·远汐", "back", "箭上绑着退潮的线。",
      { hp: 420, atk: 28, def: 3, interval: 1150 },
      { name: "穿汐箭", kind: "single", mult: 2.8 },
      { name: "远汐齐射", kind: "aoe", mult: 1.7 }),
    tide_chanter: hero("tide_chanter", "咏潮·歌壳", "back", "用螺壳的空腔给浪定调。",
      { hp: 400, atk: 22, def: 3, interval: 1250 },
      { name: "歌壳震", kind: "aoe", mult: 1.45 },
      { name: "咏潮", kind: "aoe_slow", mult: 1.55 }),
    anchor_guard: hero("anchor_guard", "锚卫·沉钩", "front", "站桩比礁石还烦。",
      { hp: 760, atk: 18, def: 12, interval: 1300 },
      { name: "沉钩砸", kind: "single", mult: 2.0 },
      { name: "锚链横扫", kind: "aoe", mult: 1.5 }),
    white_fang: hero("white_fang", "白牙·裂潮", "front", "笑起来像一道白沫。",
      { hp: 520, atk: 30, def: 4, interval: 1000 },
      { name: "裂潮", kind: "single", mult: 2.5 },
      { name: "白牙三咬", kind: "single", mult: 1.35, hits: 3 }),
    fog_sister: hero("fog_sister", "雾姊·灯塔", "mid", "雾里只留一束能认路的光。",
      { hp: 500, atk: 16, def: 5, interval: 1250 },
      { name: "雾灯", kind: "heal", mult: 4.0 },
      { name: "塔光普照", kind: "heal_all", mult: 2.8 }),
    salt_fire: hero("salt_fire", "盐火·灼贝", "back", "把晒干的盐点着扔出去。",
      { hp: 390, atk: 30, def: 2, interval: 1200 },
      { name: "灼贝", kind: "single", mult: 2.7 },
      { name: "盐火铺滩", kind: "aoe", mult: 1.8 }),
    conch_horn: hero("conch_horn", "螺号·长鸣", "back", "一声号，潮会迟到半拍。",
      { hp: 410, atk: 20, def: 3, interval: 1280 },
      { name: "短鸣", kind: "aoe", mult: 1.3 },
      { name: "长鸣迟潮", kind: "aoe_slow", mult: 1.45 })
  };

  function hero(id, name, role, blurb, base, skill, keySkill) {
    return { id: id, name: name, role: role, roleName: ROLE_NAME[role], blurb: blurb, base: base, skill: skill, keySkill: keySkill };
  }

  var BUILDINGS = {
    hq: { id: "hq", name: "潮心台", icon: "hq", produces: null, blurb: "据点的水准点。其他建筑的等级不能超过它。" },
    farm: { id: "farm", name: "盐畦", icon: "farm", produces: "food", blurb: "晒潮粮。粮食只供英雄，库存要亲手收。" },
    lumber: { id: "lumber", name: "漂木坞", icon: "lumber", produces: "materials", blurb: "打捞漂材。建造和研潮要用它。" },
    goldmine: { id: "goldmine", name: "沉金井", icon: "goldmine", produces: "gold", blurb: "井底沉着汐金，不会自己跳进仓库。" },
    hall: { id: "hall", name: "英灵廊", icon: "hall", produces: null, blurb: "编制上限 5，本切片不增加第六人。廊等级是日后自动战斗的门槛之一。" },
    wall: { id: "wall", name: "防波垣", icon: "wall", produces: null, blurb: "垣高决定能看见的章节。第二章至少要 2 级。" }
  };

  var TECHS = {
    prod: {
      id: "prod", name: "导流增产", icon: "prod", max: 1,
      blurb: "盐畦、漂木坞、沉金井产出 +20%。",
      cost: { materials: 40, gold: 25 },
      designSec: 20 * 60,
      effect: "产出速度"
    },
    march: {
      id: "march", name: "负重绳结", icon: "march", max: 1,
      blurb: "海域胜利的资源 +10%。设计上它是第7日后第二支行军的前置，本切片没有第二支行军。",
      cost: { materials: 60, gold: 40 },
      designSec: 60 * 60,
      effect: "海域奖励"
    },
    bossguard: {
      id: "bossguard", name: "镇潮桩", icon: "bossguard", max: 1,
      blurb: "章节首领造成的伤害降低 12%。",
      cost: { materials: 50, gold: 45 },
      designSec: 40 * 60,
      effect: "首领减伤"
    }
  };

  var STAGES = {
    tutorial: {
      id: "tutorial", chapter: 0, kind: "tutorial", name: "拾潮",
      stamina: 0, food: 0, manual: true,
      guests: ["reef_guard"],
      enemies: [{ portrait: "enemy_crab", name: "饿滩蟹", hp: 210, atk: 12, def: 2, interval: 1400 }],
      first: { heroes: ["reef_guard"], xp: 20 },
      repeat: { xp: 0 },
      intro: "潮退之后，一只滩蟹盯上了你的口袋。看节拍，点释技。"
    },
    "1-1": {
      id: "1-1", chapter: 1, kind: "normal", name: "退潮滩",
      stamina: 6, food: 10, manual: true,
      enemies: [
        { portrait: "enemy_crab", name: "滩蟹", hp: 260, atk: 14, def: 2, interval: 1300 },
        { portrait: "enemy_crab", name: "滩蟹", hp: 260, atk: 14, def: 2, interval: 1500 }
      ],
      first: { heroes: ["tide_blade", "tide_medic"], xp: 40, food: 30, shards: { reef_guard: 3 } },
      repeat: { xp: 16, food: 24, materials: 12 }
    },
    "1-2": {
      id: "1-2", chapter: 1, kind: "normal", name: "盐雾沟",
      stamina: 6, food: 10, manual: true,
      enemies: [
        { portrait: "enemy_lurker", name: "盐雾潜伏者", hp: 620, atk: 22, def: 5, interval: 1250 },
        { portrait: "enemy_crab", name: "滩蟹", hp: 240, atk: 14, def: 2, interval: 1400 }
      ],
      first: { heroes: ["tide_crossbow", "tide_chanter"], xp: 50, materials: 28, shards: { tide_blade: 3, tide_medic: 3 } },
      repeat: { xp: 18, food: 16, materials: 16, gold: 8 }
    },
    "1-boss": {
      id: "1-boss", chapter: 1, kind: "boss", name: "潮喉巨蚌",
      stamina: 12, food: 10, manual: true, isBoss: true,
      enemies: [{ portrait: "enemy_clam", name: "潮喉巨蚌", hp: 1500, atk: 36, def: 8, interval: 1300, aoe: 52 }],
      first: { xp: 80, gold: 40, materials: 20, food: 20, tickets: 1, diamonds: 20, books: 1, shards: { tide_crossbow: 4, tide_chanter: 4 } },
      repeat: { xp: 30, gold: 18, materials: 14, shards: { reef_guard: 2 } }
    },
    "2-1": { id: "2-1", chapter: 2, kind: "normal", name: "盐雾步道", stamina: 6, food: 10, stub: true },
    "2-2": { id: "2-2", chapter: 2, kind: "normal", name: "裂湾栈", stamina: 6, food: 10, stub: true },
    "2-boss": { id: "2-boss", chapter: 2, kind: "boss", name: "雾钟", stamina: 12, food: 10, stub: true, isBoss: true }
  };

  var RIVAL_SEED = [
    { id: "alo", name: "芦花坞的阿萝", city: "芦花坞", power: 260, level: 2, line: "三个人，一口锅，不欠谁的潮。",
      team: [{ name: "阿萝", role: "前排" }, { name: "小岑", role: "前排" }, { name: "灯舟", role: "后排" }] },
    { id: "bone", name: "船骨叔", city: "铁锚湾", power: 430, level: 4, line: "船拆了，人还在岸上。" ,
      team: [{ name: "船骨叔", role: "前排" }, { name: "绳女", role: "中排" }, { name: "二桅", role: "后排" }] },
    { id: "zhou", name: "干潮楼老周", city: "干潮楼", power: 690, level: 7, line: "楼是干的，脾气不是。" ,
      team: [{ name: "老周", role: "前排" }, { name: "盐雀", role: "中排" }, { name: "磨刀", role: "后排" }] },
    { id: "bell", name: "沉钟", city: "贝币集", power: 980, level: 10, line: "钟沉了，集还开着。" ,
      team: [{ name: "沉钟", role: "前排" }, { name: "铜壳", role: "前排" }, { name: "夜桨", role: "后排" }] }
  ];

  var POOL = ["anchor_guard", "white_fang", "fog_sister", "salt_fire", "conch_horn"];

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function createNewState(now) {
    now = now || Date.now();
    var buildings = {};
    Object.keys(BUILDINGS).forEach(function (id) {
      buildings[id] = { level: 1, stored: 0, lastAccrue: now };
    });
    buildings.farm.stored = 80;
    buildings.lumber.stored = 24;
    buildings.goldmine.stored = 12;
    return {
      version: SAVE_VERSION,
      createdAt: now,
      food: 0,
      materials: 70,
      gold: 50,
      diamonds: 0,
      tickets: 0,
      speedups: 0,
      books: 0,
      teamLevel: 1,
      teamXp: 0,
      stamina: STAMINA_CAP,
      staminaTs: now,
      heroes: {},
      formation: [null, null, null, null, null],
      buildings: buildings,
      buildQueue: null,
      tech: { prod: 0, march: 0, bossguard: 0 },
      techQueue: null,
      clears: {},
      rivals: RIVAL_SEED.map(function (r) {
        var c = clone(r);
        c.lastGrow = now;
        c.wins = 0;
        return c;
      }),
      flags: { tutorialWon: false, collectedFood: false },
      offers: { shardUntil: 0 },
      pendingPull: null,
      pendingCost: null,
      gmLog: []
    };
  }

  function productionPerHour(state, buildingId) {
    var spec = BUILDINGS[buildingId];
    if (!spec || !spec.produces) return 0;
    var base = { farm: 120, lumber: 90, goldmine: 50 }[buildingId];
    var tech = 1 + 0.2 * (state.tech.prod || 0);
    return base * state.buildings[buildingId].level * tech;
  }

  function accrue(state, now) {
    ["farm", "lumber", "goldmine"].forEach(function (id) {
      var b = state.buildings[id];
      var perHour = productionPerHour(state, id);
      var cap = perHour * OFFLINE_CAP_H;
      var elapsedH = Math.max(0, (now - b.lastAccrue) / 3600000);
      var room = Math.max(0, cap - b.stored);
      var gained = Math.min(room, perHour * elapsedH);
      b.stored += gained;
      b.lastAccrue = now;
    });
  }

  function syncStamina(state, now) {
    if (state.stamina >= STAMINA_CAP) {
      state.staminaTs = now;
      return;
    }
    var gained = Math.floor((now - state.staminaTs) / STAMINA_MS);
    if (gained > 0) {
      state.stamina = Math.min(STAMINA_CAP, state.stamina + gained);
      state.staminaTs += gained * STAMINA_MS;
      if (state.stamina >= STAMINA_CAP) state.staminaTs = now;
    }
  }

  function growRivals(state, now) {
    state.rivals.forEach(function (r) {
      var minutes = (now - r.lastGrow) / 60000;
      if (minutes < 1) return;
      r.power = Math.max(80, Math.round(r.power * (1 + 0.008 * minutes)));
      r.level = Math.min(40, r.level + Math.floor(minutes / 8));
      r.lastGrow = now;
    });
  }

  function finishQueues(state, now) {
    var messages = [];
    if (state.buildQueue && now >= state.buildQueue.endsAt) {
      var q = state.buildQueue;
      state.buildings[q.buildingId].level = q.targetLevel;
      state.buildQueue = null;
      var nm = BUILDINGS[q.buildingId].name;
      var msg = nm + " 升至 " + q.targetLevel + " 级";
      if (q.buildingId === "hq" && q.targetLevel === 2) msg += "。其他建筑可以升到 2 级，第一章可以进了";
      messages.push(msg);
    }
    if (state.techQueue && now >= state.techQueue.endsAt) {
      var tq = state.techQueue;
      state.tech[tq.techId] = tq.targetLevel;
      state.techQueue = null;
      messages.push(TECHS[tq.techId].name + " 研究完成");
    }
    return messages;
  }

  function tick(state, now) {
    accrue(state, now);
    syncStamina(state, now);
    growRivals(state, now);
    var messages = finishQueues(state, now);
    return { messages: messages };
  }

  function refundPending(state) {
    if (!state.pendingCost) return;
    state.stamina = Math.min(STAMINA_CAP, state.stamina + (state.pendingCost.stamina || 0));
    state.food += state.pendingCost.food || 0;
    state.pendingCost = null;
  }

  function collect(state, buildingId, now) {
    accrue(state, now);
    var spec = BUILDINGS[buildingId];
    if (!spec || !spec.produces) return { ok: false, reason: "这里没有可收的产出" };
    var b = state.buildings[buildingId];
    var amount = Math.floor(b.stored);
    if (amount <= 0) return { ok: false, reason: "库存是空的，过一会儿再来" };
    b.stored -= amount;
    var key = spec.produces;
    state[key] += amount;
    if (buildingId === "farm") state.flags.collectedFood = true;
    var label = { food: "潮粮", materials: "漂材", gold: "汐金" }[key];
    return { ok: true, amount: amount, resource: key, message: "收取 " + label + " +" + amount };
  }

  function hqCost(nextLevel) {
    var table = {
      2: { food: 40, materials: 30, gold: 20, designSec: 10 * 60 },
      3: { food: 90, materials: 80, gold: 50, designSec: 45 * 60 },
      4: { food: 160, materials: 150, gold: 90, designSec: 2 * 3600 },
      5: { food: 260, materials: 240, gold: 150, designSec: 4 * 3600 }
    };
    return table[nextLevel] || null;
  }

  function otherCost(nextLevel) {
    return {
      food: 0,
      materials: 24 * nextLevel,
      gold: 14 * nextLevel,
      designSec: (12 + 8 * nextLevel) * 60
    };
  }

  function buildCost(state, buildingId) {
    var level = state.buildings[buildingId].level;
    var next = level + 1;
    if (next > MAX_BUILD_LEVEL) return null;
    var cost = buildingId === "hq" ? hqCost(next) : otherCost(next);
    if (!cost) return null;
    return {
      next: next,
      food: cost.food,
      materials: cost.materials,
      gold: cost.gold,
      designSec: cost.designSec,
      demoMs: cost.designSec / 60 * 1000
    };
  }

  function canPay(state, cost) {
    if (cost.food && state.food < cost.food) return "潮粮不足";
    if (cost.materials && state.materials < cost.materials) return "漂材不足";
    if (cost.gold && state.gold < cost.gold) return "汐金不足";
    return "";
  }

  function pay(state, cost) {
    state.food -= cost.food || 0;
    state.materials -= cost.materials || 0;
    state.gold -= cost.gold || 0;
  }

  function startBuild(state, buildingId, now) {
    tick(state, now);
    if (!BUILDINGS[buildingId]) return { ok: false, reason: "没有这栋建筑" };
    if (state.buildQueue) return { ok: false, reason: "建造队列忙碌。本切片只有一条免费队列" };
    var level = state.buildings[buildingId].level;
    if (level >= MAX_BUILD_LEVEL) return { ok: false, reason: "已到本切片等级上限" };
    if (buildingId !== "hq" && level >= state.buildings.hq.level) {
      return { ok: false, reason: "不能超过潮心台等级" };
    }
    var cost = buildCost(state, buildingId);
    var why = canPay(state, cost);
    if (why) {
      if (buildingId === "hq" && why === "潮粮不足") why = "潮粮不足。先到盐畦把库存收进仓库";
      return { ok: false, reason: why };
    }
    pay(state, cost);
    state.buildQueue = {
      buildingId: buildingId,
      targetLevel: cost.next,
      designSec: cost.designSec,
      demoMs: cost.demoMs,
      startedAt: now,
      endsAt: now + cost.demoMs
    };
    return {
      ok: true,
      offerSpeedup: cost.designSec > SPEEDUP_OFFER_DESIGN_SEC,
      designSec: cost.designSec,
      message: BUILDINGS[buildingId].name + " 开始升级。设计耗时 " + formatDesign(cost.designSec) + "，演示约 " + Math.round(cost.demoMs / 1000) + " 秒"
    };
  }

  function startTech(state, techId, now) {
    tick(state, now);
    var spec = TECHS[techId];
    if (!spec) return { ok: false, reason: "没有这项研潮" };
    if (state.techQueue) return { ok: false, reason: "研潮队列忙碌" };
    if ((state.tech[techId] || 0) >= spec.max) return { ok: false, reason: "这项已经完成" };
    if (spec.cost.food) return { ok: false, reason: "研潮不消耗潮粮" };
    var why = canPay(state, spec.cost);
    if (why) return { ok: false, reason: why };
    pay(state, spec.cost);
    var demoMs = spec.designSec / 60 * 1000;
    state.techQueue = {
      techId: techId,
      targetLevel: (state.tech[techId] || 0) + 1,
      designSec: spec.designSec,
      demoMs: demoMs,
      startedAt: now,
      endsAt: now + demoMs
    };
    return {
      ok: true,
      message: spec.name + " 开始研究。设计耗时 " + formatDesign(spec.designSec) + "，演示约 " + Math.round(demoMs / 1000) + " 秒。消耗漂材与汐金，不消耗潮粮"
    };
  }

  function useSpeedup(state, which, now, count) {
    var q = which === "tech" ? state.techQueue : state.buildQueue;
    if (!q) return { ok: false, reason: "这条队列是空的" };
    var remainSec = Math.ceil(Math.max(0, q.endsAt - now) / 1000);
    if (remainSec <= 0) {
      tick(state, now);
      return { ok: true, used: 0, message: "已经完成" };
    }
    var want = count === "all" ? remainSec : (count || 1);
    var use = Math.min(state.speedups, remainSec, Math.max(1, want));
    if (state.speedups < 1) return { ok: false, reason: "没有分钟加速" };
    state.speedups -= use;
    q.endsAt -= use * 1000;
    var messages = tick(state, now).messages;
    return { ok: true, used: use, messages: messages, message: "使用分钟加速 ×" + use + "（设计上每个抵 1 分钟，演示中抵 1 秒）" };
  }

  function buyWithDiamonds(state, goodsId) {
    var goods = {
      speedup: { diamonds: 10, apply: function () { state.speedups += 1; }, label: "分钟加速 ×1" },
      food: { diamonds: 15, apply: function () { state.food += 100; }, label: "潮粮 ×100" },
      materials: { diamonds: 15, apply: function () { state.materials += 80; }, label: "漂材 ×80" },
      gold: { diamonds: 15, apply: function () { state.gold += 40; }, label: "汐金 ×40" }
    };
    var g = goods[goodsId];
    if (!g) return { ok: false, reason: "没有这种兑换。招募券不能用钻石购买" };
    if (state.diamonds < g.diamonds) return { ok: false, reason: "钻石不足" };
    state.diamonds -= g.diamonds;
    g.apply();
    return { ok: true, message: "兑换 " + g.label };
  }

  function formatDesign(sec) {
    sec = Math.max(0, Math.round(sec));
    if (sec < 60) return sec + "秒";
    if (sec < 3600) return Math.round(sec / 60) + "分钟";
    var h = Math.floor(sec / 3600);
    var m = Math.round((sec % 3600) / 60);
    return m ? (h + "小时" + m + "分") : (h + "小时");
  }

  function queueRemain(q, now) {
    if (!q) return null;
    var ms = Math.max(0, q.endsAt - now);
    var designLeft = q.demoMs > 0 ? Math.max(0, Math.round(q.designSec * (ms / q.demoMs))) : 0;
    return {
      demoSec: Math.ceil(ms / 1000),
      designSec: designLeft,
      label: "剩余 " + Math.ceil(ms / 1000) + " 秒（设计 " + formatDesign(designLeft) + "）"
    };
  }

  function stageLock(state, stageId) {
    var stage = STAGES[stageId];
    if (!stage) return "没有这一关";
    if (stage.chapter === 2 || stage.stub) {
      if (state.buildings.wall.level < WALL_FOR_CHAPTER_2) {
        return "防波垣需要达到 " + WALL_FOR_CHAPTER_2 + " 级，才能看见第二章";
      }
      return "第二章「盐雾裂湾」还在建造，本切片没有关卡内容";
    }
    if (stageId === "tutorial") {
      if (state.flags.tutorialWon) return "拾潮已经结束";
      return "";
    }
    if (!state.flags.tutorialWon) return "先完成拾潮";
    if (state.buildings.hq.level < 2) return "先把潮心台升到 2 级";
    if (stageId === "1-2" && !state.clears["1-1"]) return "先通关 1-1 退潮滩";
    if (stageId === "1-boss" && !state.clears["1-2"]) return "先通关 1-2 盐雾沟";
    var living = state.formation.filter(Boolean).length;
    if (!living) return "队伍是空的";
    return "";
  }

  function beginBattle(state, battleId, now) {
    tick(state, now);
    if (state.pendingCost) refundPending(state);
    var rival = null;
    var stage = null;
    if (String(battleId).indexOf("rival:") === 0) {
      var rid = battleId.slice(6);
      rival = state.rivals.filter(function (r) { return r.id === rid; })[0];
      if (!rival) return { ok: false, reason: "找不到这个对手" };
      if (!state.flags.tutorialWon) return { ok: false, reason: "先完成拾潮" };
      if (state.stamina < 6) return { ok: false, reason: "潮力不足（需要 6）" };
    } else {
      stage = STAGES[battleId];
      if (!stage) return { ok: false, reason: "没有这一关" };
      var lock = stageLock(state, battleId);
      if (lock) return { ok: false, reason: lock };
      if (state.stamina < stage.stamina) return { ok: false, reason: "潮力不足（需要 " + stage.stamina + "）" };
    }
    var foodCost = rival ? 0 : stage.food;
    var staminaCost = rival ? 6 : stage.stamina;
    var hungry = false;
    if (foodCost > 0) {
      if (state.food >= foodCost) state.food -= foodCost;
      else { hungry = true; foodCost = 0; }
    }
    state.stamina -= staminaCost;
    if (state.stamina < STAMINA_CAP) {
      /* regen clock starts when leaving the cap */
    }
    state.pendingCost = { stamina: staminaCost, food: foodCost, battleId: battleId };
    var battle = rival ? createRivalBattle(state, rival, now, hungry) : createStageBattle(state, stage, now, hungry);
    battle.battleId = battleId;
    return { ok: true, battle: battle, hungry: hungry };
  }

  function combatantFromHero(state, id, uid, hungry) {
    var def = HEROES[id];
    var owned = state.heroes[id];
    var stars = owned ? owned.stars : 1;
    var skillLevel = owned ? owned.skillLevel : 1;
    var mul = (1 + (state.teamLevel - 1) * 0.15) * (1 + (stars - 1) * 0.25);
    if (hungry) mul *= 0.8;
    var hp = Math.round(def.base.hp * mul);
    return {
      uid: uid,
      heroId: id,
      portrait: id,
      name: def.name,
      role: def.role,
      hp: hp,
      maxHp: hp,
      shield: 0,
      atk: def.base.atk * mul,
      def: def.base.def,
      interval: def.base.interval,
      nextAt: 0,
      alive: true,
      stars: stars,
      skillLevel: skillLevel,
      skill: def.skill,
      keySkill: def.keySkill,
      keyUnlocked: stars >= 3
    };
  }

  function createStageBattle(state, stage, now, hungry) {
    var ids = stage.guests && !state.flags.tutorialWon ? stage.guests : state.formation.filter(Boolean);
    if (stage.id === "tutorial") ids = stage.guests;
    var allies = ids.map(function (id, i) {
      var u = combatantFromHero(state, id, "a" + i, hungry);
      u.nextAt = now + 700 + i * 180;
      return u;
    });
    var enemies = stage.enemies.map(function (e, i) {
      return {
        uid: "e" + i,
        portrait: e.portrait,
        name: e.name,
        hp: e.hp,
        maxHp: e.hp,
        shield: 0,
        atk: e.atk,
        def: e.def,
        interval: e.interval,
        baseInterval: e.interval,
        nextAt: now + 1100 + i * 240,
        alive: true,
        aoe: e.aoe || 0
      };
    });
    return {
      title: stage.name,
      intro: stage.intro || "",
      isBoss: !!stage.isBoss,
      bossGuard: state.tech.bossguard || 0,
      manualOnly: true,
      allies: allies,
      enemies: enemies,
      skillReadyAt: now + 900,
      skillIndex: 0,
      warning: false,
      warnEnds: 0,
      nextWarn: now + 9000,
      interrupted: false,
      hungry: hungry,
      ended: null,
      resolved: false,
      startedAt: now
    };
  }

  function createRivalBattle(state, rival, now, hungry) {
    var ids = state.formation.filter(Boolean);
    var allies = ids.map(function (id, i) {
      var u = combatantFromHero(state, id, "a" + i, hungry);
      u.nextAt = now + 700 + i * 160;
      return u;
    });
    var enemies = rival.team.map(function (m, i) {
      var hp = Math.round(150 + rival.power * 0.42);
      var atk = Math.round(10 + rival.power / 55);
      return {
        uid: "e" + i,
        portrait: "rival",
        name: m.name,
        role: m.role,
        hp: hp,
        maxHp: hp,
        shield: 0,
        atk: atk,
        def: 4 + Math.floor(rival.level / 4),
        interval: 1300,
        baseInterval: 1300,
        nextAt: now + 1000 + i * 200,
        alive: true,
        aoe: 0
      };
    });
    return {
      title: rival.city + " · " + rival.name,
      bossGuard: 0,
      intro: "本地模拟对手，不是网上的真人。",
      isBoss: false,
      manualOnly: true,
      allies: allies,
      enemies: enemies,
      skillReadyAt: now + 900,
      skillIndex: 0,
      warning: false,
      warnEnds: 0,
      nextWarn: 0,
      interrupted: false,
      hungry: hungry,
      ended: null,
      resolved: false,
      startedAt: now,
      rivalId: rival.id
    };
  }

  function living(list) { return list.filter(function (u) { return u.alive; }); }
  function firstAlive(list) {
    for (var i = 0; i < list.length; i++) if (list[i].alive) return list[i];
    return null;
  }
  function lowestHp(list) {
    var best = null;
    living(list).forEach(function (u) {
      if (!best || u.hp / u.maxHp < best.hp / best.maxHp) best = u;
    });
    return best;
  }

  function hurt(u, dmg) {
    var left = dmg;
    if (u.shield) {
      var absorbed = Math.min(u.shield, left);
      u.shield -= absorbed;
      left -= absorbed;
    }
    if (left > 0) u.hp = Math.max(0, u.hp - left);
    u.alive = u.hp > 0;
    return dmg;
  }

  function checkEnd(battle) {
    if (battle.ended) return;
    if (!living(battle.enemies).length) battle.ended = "win";
    else if (!living(battle.allies).length) battle.ended = "lose";
  }

  function performBasic(battle, u, now, events) {
    var alliesSide = battle.allies.indexOf(u) >= 0;
    if (alliesSide) {
      var target = firstAlive(battle.enemies);
      if (!target) return;
      var dmg = strike(u.atk, target.def);
      hurt(target, dmg);
      events.push({ type: "hit", uid: target.uid, dmg: dmg, text: "-" + dmg });
    } else {
      var ally = firstAlive(battle.allies);
      if (!ally) return;
      var raw = u.atk;
      if (battle.isBoss && battleAlliesTech) raw = raw; /* placeholder kept out */
      var dmg2 = strike(bossMitigation(battle, raw), ally.def);
      hurt(ally, dmg2);
      events.push({ type: "hit", uid: ally.uid, dmg: dmg2, text: "-" + dmg2 });
    }
    u.nextAt += u.interval;
    checkEnd(battle);
  }

  function bossMitigation(battle, raw) {
    if (!battle.isBoss) return raw;
    var lv = battle.bossGuard || 0;
    return raw * (1 - 0.12 * lv);
  }

  var battleAlliesTech = true;

  function stepBattle(battle, now) {
    if (!battle || battle.ended) return [];
    var events = [];
    var guard = 0;
    while (guard++ < 80 && !battle.ended) {
      var best = null;
      var units = battle.allies.concat(battle.enemies);
      for (var i = 0; i < units.length; i++) {
        var u = units[i];
        if (!u.alive || u.nextAt > now) continue;
        if (!best || u.nextAt < best.nextAt) best = u;
      }
      if (!best) break;
      performBasic(battle, best, now, events);
    }
    if (battle.isBoss && !battle.ended) {
      if (!battle.warning && battle.nextWarn && now >= battle.nextWarn) {
        battle.warning = true;
        battle.warnEnds = now + 2200;
        battle.interrupted = false;
        events.push({ type: "warn", text: "潮喉张开了，趁亮带打断它" });
      } else if (battle.warning && now >= battle.warnEnds) {
        battle.warning = false;
        battle.nextWarn = now + 11000;
        if (!battle.interrupted) {
          battle.allies.forEach(function (a) {
            if (!a.alive) return;
            var dmg = strike(bossMitigation(battle, battle.enemies[0] ? battle.enemies[0].aoe || 52 : 52), a.def);
            hurt(a, dmg);
            events.push({ type: "hit", uid: a.uid, dmg: dmg, text: "-" + dmg });
          });
          events.push({ type: "note", text: "潮喉合上了" });
          checkEnd(battle);
        } else {
          events.push({ type: "note", text: "巨蚌被你打断，闭了回去" });
        }
      }
    }
    return events;
  }

  function currentSkillHero(battle) {
    var list = living(battle.allies);
    if (!list.length) return null;
    return list[battle.skillIndex % list.length];
  }

  function useSkill(battle, quality, now) {
    if (!battle || battle.ended) return { ok: false, reason: "战斗已经结束" };
    if (now < battle.skillReadyAt) return { ok: false, reason: "技能还在酝酿" };
    var hero = currentSkillHero(battle);
    if (!hero) return { ok: false, reason: "没有能动手的人" };
    var skill = hero.keyUnlocked ? hero.keySkill : hero.skill;
    var qMul = quality === "perfect" ? 1.3 : quality === "good" ? 1 : 0.4;
    var skillMul = (1 + (hero.skillLevel - 1) * 0.1) * qMul;
    var events = [];
    var hits = skill.hits || 1;
    var kind = skill.kind;
    if (kind === "heal" || kind === "heal_all") {
      var amount = Math.max(1, Math.round(hero.atk * skill.mult * skillMul));
      var targets = kind === "heal_all" ? living(battle.allies) : [lowestHp(battle.allies)];
      targets.forEach(function (t) {
        if (!t) return;
        t.hp = Math.min(t.maxHp, t.hp + amount);
        events.push({ type: "heal", uid: t.uid, text: "+" + amount });
      });
    } else {
      for (var n = 0; n < hits; n++) {
        var targets2 = (kind === "aoe" || kind === "aoe_slow") ? living(battle.enemies) : [firstAlive(battle.enemies)];
        targets2.forEach(function (t) {
          if (!t) return;
          var dmg = strike(hero.atk * skill.mult * skillMul, t.def);
          hurt(t, dmg);
          events.push({ type: "hit", uid: t.uid, dmg: dmg, text: "-" + dmg });
        });
      }
      if (kind === "aoe_slow") {
        battle.enemies.forEach(function (e) {
          if (!e.alive) return;
          e.interval = Math.min(e.baseInterval * 1.8, Math.round(e.interval * 1.15));
        });
      }
    }
    if (kind === "single_shield" || skill.shield) {
      var ratio = skill.shield || 0.1;
      living(battle.allies).forEach(function (a) {
        a.shield = Math.max(a.shield, Math.round(a.maxHp * ratio));
      });
      events.push({ type: "note", text: "潮墙挡住了一部分冲击" });
    }
    if (battle.warning && quality !== "miss") battle.interrupted = true;
    battle.skillIndex += 1;
    battle.skillReadyAt = now + 4500;
    checkEnd(battle);
    var qName = quality === "perfect" ? "完美" : quality === "good" ? "良好" : "偏离";
    return { ok: true, quality: quality, qualityName: qName, skillName: skill.name, key: hero.keyUnlocked, events: events, heroName: hero.name };
  }

  function flee(battle) {
    if (!battle || battle.ended) return battle;
    battle.ended = "lose";
    battle.fled = true;
    return battle;
  }

  function grantHero(state, id) {
    if (!HEROES[id]) return "missing";
    var fresh = !state.heroes[id];
    if (fresh) state.heroes[id] = { id: id, stars: 1, shards: 0, skillLevel: 1 };
    if (state.formation.indexOf(id) >= 0) return fresh ? "joined" : "already";
    var slots = ROLE_SLOTS[HEROES[id].role];
    for (var i = 0; i < slots.length; i++) {
      if (!state.formation[slots[i]]) {
        state.formation[slots[i]] = id;
        return "joined";
      }
    }
    return "bench";
  }

  function addShards(state, id, n) {
    if (!n) return;
    if (!state.heroes[id]) state.heroes[id] = { id: id, stars: 1, shards: 0, skillLevel: 1 };
    state.heroes[id].shards += n;
  }

  function applyRewardBlock(state, block) {
    var lines = [];
    if (!block) return lines;
    if (block.xp) {
      state.teamXp += block.xp;
      lines.push("队经 +" + block.xp);
    }
    ["food", "materials", "gold", "tickets", "diamonds", "books"].forEach(function (k) {
      if (!block[k]) return;
      state[k] += block[k];
      var label = { food: "潮粮", materials: "漂材", gold: "汐金", tickets: "招募券", diamonds: "钻石", books: "技典" }[k];
      lines.push(label + " +" + block[k]);
    });
    if (block.heroes) {
      block.heroes.forEach(function (id) {
        var how = grantHero(state, id);
        if (how === "joined") lines.push(HEROES[id].name + " 入队（" + HEROES[id].roleName + "）");
        else if (how === "bench") lines.push(HEROES[id].name + " 在廊外等候");
        else lines.push(HEROES[id].name + " 已在队中");
      });
    }
    if (block.shards) {
      Object.keys(block.shards).forEach(function (id) {
        addShards(state, id, block.shards[id]);
        lines.push((HEROES[id] ? HEROES[id].name : id) + " 星屑 +" + block.shards[id]);
      });
    }
    return lines;
  }

  function applyBattle(state, battle) {
    if (!battle) return { ok: false, reason: "没有战斗" };
    if (battle.resolved) return { ok: false, reason: "结算过了" };
    battle.resolved = true;
    state.pendingCost = null;
    if (battle.ended !== "win") {
      return { ok: true, win: false, lines: [battle.fled ? "你离开了。潮力不会退回。" : "没打下来。只消耗了潮力。"] };
    }
    if (battle.rivalId) {
      var rival = state.rivals.filter(function (r) { return r.id === battle.rivalId; })[0];
      if (rival) {
        rival.wins += 1;
        rival.power = Math.max(80, Math.round(rival.power * 0.97));
      }
      var bonus = 1 + 0.1 * (state.tech.march || 0);
      var food = Math.round(36 * bonus);
      var materials = Math.round(22 * bonus);
      var gold = Math.round(14 * bonus);
      state.food += food;
      state.materials += materials;
      state.gold += gold;
      state.teamXp += 22;
      var owned = Object.keys(state.heroes);
      var sid = owned.length ? owned[Math.floor(Math.random() * owned.length)] : "reef_guard";
      addShards(state, sid, 4);
      var lines = ["潮粮 +" + food, "漂材 +" + materials, "汐金 +" + gold, "队经 +22", (HEROES[sid] ? HEROES[sid].name : sid) + " 星屑 +4"];
      return { ok: true, win: true, lines: lines };
    }
    var stage = STAGES[battle.battleId];
    var first = !state.clears[stage.id];
    state.clears[stage.id] = true;
    if (stage.id === "tutorial") state.flags.tutorialWon = true;
    var lines2 = applyRewardBlock(state, first ? stage.first : stage.repeat);
    return { ok: true, win: true, first: first, lines: lines2 };
  }

  function xpNeed(level) { return 40 * level; }
  function foodForLevel(level) { return 25 * level; }

  function teamLevelUp(state) {
    var need = xpNeed(state.teamLevel);
    var food = foodForLevel(state.teamLevel);
    if (state.teamXp < need) return { ok: false, reason: "队经不足" };
    if (state.food < food) return { ok: false, reason: "潮粮不足。英雄升级只吃潮粮" };
    state.teamXp -= need;
    state.food -= food;
    state.teamLevel += 1;
    return { ok: true, message: "队伍升至 " + state.teamLevel + " 级" };
  }

  function starUp(state, heroId) {
    var h = state.heroes[heroId];
    if (!h) return { ok: false, reason: "还没有这位英雄" };
    if (h.stars >= MAX_STAR) return { ok: false, reason: "本切片最高 3 星" };
    var cost = STAR_COST[h.stars + 1];
    if (h.shards < cost) return { ok: false, reason: "星屑不足，还差 " + (cost - h.shards) };
    h.shards -= cost;
    h.stars += 1;
    var extra = h.stars >= 3 ? "。3 星解锁关键技能「" + HEROES[heroId].keySkill.name + "」" : "";
    return { ok: true, message: HEROES[heroId].name + " 升至 " + h.stars + " 星" + extra };
  }

  function skillUp(state, heroId) {
    var h = state.heroes[heroId];
    if (!h) return { ok: false, reason: "还没有这位英雄" };
    if (h.skillLevel >= 5) return { ok: false, reason: "技典已经喂满" };
    if (state.books < 1) return { ok: false, reason: "没有技典" };
    state.books -= 1;
    h.skillLevel += 1;
    return { ok: true, message: HEROES[heroId].name + " 技能等级 " + h.skillLevel };
  }

  function pull(state) {
    if (state.pendingPull) return { ok: false, reason: "先处理上一次招募：替换或分解" };
    if (state.tickets < 1) return { ok: false, reason: "没有招募券。钻石不能直接购买招募" };
    state.tickets -= 1;
    var id = POOL[Math.floor(Math.random() * POOL.length)];
    state.pendingPull = { heroId: id, salvage: 8 };
    return { ok: true, heroId: id };
  }

  function resolvePull(state, action, slotIndex) {
    var p = state.pendingPull;
    if (!p) return { ok: false, reason: "没有待处理的招募" };
    var id = p.heroId;
    if (action === "salvage") {
      addShards(state, id, p.salvage);
      state.pendingPull = null;
      return { ok: true, message: "分解为 " + HEROES[id].name + " 的星屑 +" + p.salvage + "。队伍仍然是五人编制" };
    }
    if (action !== "replace") return { ok: false, reason: "只能替换同排，或分解" };
    if (!HEROES[id]) return { ok: false, reason: "英雄不存在" };
    var slots = ROLE_SLOTS[HEROES[id].role];
    if (slots.indexOf(slotIndex) < 0) return { ok: false, reason: "只能替换" + HEROES[id].roleName };
    if (!state.heroes[id]) state.heroes[id] = { id: id, stars: 1, shards: 0, skillLevel: 1 };
    var existing = state.formation.indexOf(id);
    var displaced = state.formation[slotIndex];
    state.formation[slotIndex] = id;
    if (existing >= 0 && existing !== slotIndex) state.formation[existing] = displaced;
    state.pendingPull = null;
    var note = displaced ? ("替换了 " + (HEROES[displaced] ? HEROES[displaced].name : "空位")) : "放入空位";
    var count = state.formation.filter(Boolean).length;
    return { ok: true, message: HEROES[id].name + " " + note + "。上阵 " + count + "/" + PARTY_SIZE + "，没有第六个位置" };
  }

  function assignSlot(state, heroId, slotIndex) {
    var def = HEROES[heroId];
    if (!def || !state.heroes[heroId]) return { ok: false, reason: "还没有这位英雄" };
    if (ROLE_SLOTS[def.role].indexOf(slotIndex) < 0) return { ok: false, reason: "位置和职责不符" };
    var existing = state.formation.indexOf(heroId);
    var displaced = state.formation[slotIndex];
    state.formation[slotIndex] = heroId;
    if (existing >= 0 && existing !== slotIndex) state.formation[existing] = displaced;
    return { ok: true, message: def.name + " 站到了" + def.roleName };
  }

  function guide(state) {
    var five = state.formation.filter(Boolean).length >= 5;
    var steps = [
      { id: "fight", text: "打一场短的手动战斗：看潮汐节拍，点击释技。", done: !!state.flags.tutorialWon },
      { id: "hero", text: "获得第一名前排：礁卫·岩潮。", done: !!state.heroes.reef_guard },
      { id: "food", text: "在据点点开盐畦，把潮粮收进仓库。", done: !!state.flags.collectedFood },
      { id: "hq", text: "把潮心台升到 2 级。设计耗时 10 分钟，演示约 10 秒。", done: state.buildings.hq.level >= 2 },
      { id: "stages", text: "通关 1-1 退潮滩和 1-2 盐雾沟。", done: !!(state.clears["1-1"] && state.clears["1-2"]) },
      { id: "five", text: "集齐五名英雄。", done: five },
      { id: "boss", text: "手动击败潮喉巨蚌，拿到第一张招募券。", done: !!state.clears["1-boss"] }
    ];
    if (!steps[3].done && state.buildQueue && state.buildQueue.buildingId === "hq") {
      steps[3].text = "潮心台正在升级。可以等它走完，或用分钟加速（演示中 1 个抵 1 秒，设计上抵 1 分钟）。";
    }
    var current = null;
    for (var i = 0; i < steps.length; i++) if (!steps[i].done) { current = steps[i]; break; }
    var doneCount = steps.filter(function (s) { return s.done; }).length;
    return { steps: steps, current: current, doneCount: doneCount, total: steps.length };
  }

  function staminaInfo(state, now) {
    syncStamina(state, now);
    var next = 0;
    if (state.stamina < STAMINA_CAP) next = Math.max(0, STAMINA_MS - (now - state.staminaTs));
    return { value: state.stamina, cap: STAMINA_CAP, nextMs: next, perMs: STAMINA_MS };
  }

  function shardOffer(state, heroId, now) {
    var h = state.heroes[heroId];
    if (!h || h.stars >= MAX_STAR) return null;
    var cost = STAR_COST[h.stars + 1];
    if (h.shards >= cost) return null;
    if (!state.offers.shardUntil) state.offers.shardUntil = now + 10 * 60 * 1000;
    return {
      heroId: heroId,
      need: cost - h.shards,
      until: state.offers.shardUntil,
      remainMs: state.offers.shardUntil - now,
      expired: now > state.offers.shardUntil
    };
  }

  function buildingView(state, now) {
    return Object.keys(BUILDINGS).map(function (id) {
      var spec = BUILDINGS[id];
      var b = state.buildings[id];
      var cost = buildCost(state, id);
      var reason = "";
      if (state.buildQueue) reason = "队列忙碌";
      else if (!cost) reason = "已满级";
      else if (id !== "hq" && b.level >= state.buildings.hq.level) reason = "受潮心台限制";
      else reason = canPay(state, cost);
      return {
        id: id,
        name: spec.name,
        icon: spec.icon,
        blurb: spec.blurb,
        level: b.level,
        stored: Math.floor(b.stored),
        perHour: Math.round(productionPerHour(state, id)),
        cap: Math.round(productionPerHour(state, id) * OFFLINE_CAP_H),
        produces: spec.produces,
        cost: cost,
        canBuild: !reason,
        reason: reason
      };
    });
  }

  function pushGm(state, text, now) {
    state.gmLog.unshift({ t: now || Date.now(), text: text });
    if (state.gmLog.length > 40) state.gmLog.length = 40;
  }

  function gm(state, cmd, now) {
    now = now || Date.now();
    cmd = cmd || {};
    var n = Math.floor(Number(cmd.amount || 0));
    function addRes(key, label) {
      if (!n) return { ok: false, reason: "数量无效" };
      state[key] += n;
      pushGm(state, "发放" + label + " " + (n > 0 ? "+" : "") + n, now);
      return { ok: true, message: "已发放" + label };
    }
    if (cmd.type === "diamonds") return addRes("diamonds", "钻石");
    if (cmd.type === "tickets") return addRes("tickets", "招募券");
    if (cmd.type === "speedups") return addRes("speedups", "分钟加速");
    if (cmd.type === "food") return addRes("food", "潮粮");
    if (cmd.type === "materials") return addRes("materials", "漂材");
    if (cmd.type === "gold") return addRes("gold", "汐金");
    if (cmd.type === "xp") {
      if (!n) return { ok: false, reason: "数量无效" };
      state.teamXp += n;
      pushGm(state, "发放队经 " + (n > 0 ? "+" : "") + n, now);
      return { ok: true };
    }
    if (cmd.type === "books") return addRes("books", "技典");
    if (cmd.type === "stamina") {
      state.stamina = STAMINA_CAP;
      state.staminaTs = now;
      pushGm(state, "潮力补满", now);
      return { ok: true };
    }
    if (cmd.type === "shards") {
      if (!HEROES[cmd.heroId]) return { ok: false, reason: "没有这位英雄" };
      if (!n) return { ok: false, reason: "数量无效" };
      addShards(state, cmd.heroId, n);
      pushGm(state, HEROES[cmd.heroId].name + " 星屑 " + (n > 0 ? "+" : "") + n, now);
      return { ok: true };
    }
    if (cmd.type === "hq") {
      var lv = Math.floor(Number(cmd.level));
      if (lv < 1 || lv > MAX_BUILD_LEVEL) return { ok: false, reason: "等级范围 1 到 " + MAX_BUILD_LEVEL };
      state.buildings.hq.level = lv;
      pushGm(state, "潮心台等级设为 " + lv, now);
      return { ok: true };
    }
    if (cmd.type === "tech") {
      if (!TECHS[cmd.techId]) return { ok: false, reason: "没有这项研潮" };
      var tl = Math.floor(Number(cmd.level));
      if (tl < 0 || tl > TECHS[cmd.techId].max) return { ok: false, reason: "等级超出本切片" };
      state.tech[cmd.techId] = tl;
      pushGm(state, TECHS[cmd.techId].name + " 等级设为 " + tl, now);
      return { ok: true };
    }
    if (cmd.type === "stars") {
      if (!HEROES[cmd.heroId]) return { ok: false, reason: "没有这位英雄" };
      var st = Math.floor(Number(cmd.level));
      if (st < 1 || st > MAX_STAR) return { ok: false, reason: "星级范围 1 到 3" };
      if (!state.heroes[cmd.heroId]) grantHero(state, cmd.heroId);
      state.heroes[cmd.heroId].stars = st;
      pushGm(state, HEROES[cmd.heroId].name + " 星级设为 " + st, now);
      return { ok: true };
    }
    return { ok: false, reason: "未知指令" };
  }

  function summaryText(state, now) {
    tick(state, now);
    var g = guide(state);
    var cur = g.current ? g.current.text : "开局流程已走完";
    return [
      "潮粮 " + state.food + "  漂材 " + state.materials + "  汐金 " + state.gold,
      "潮力 " + state.stamina + "/" + STAMINA_CAP + "  钻石 " + state.diamonds + "  招募券 " + state.tickets,
      "潮心台 " + state.buildings.hq.level + " 级  队伍 " + state.teamLevel + " 级",
      "流程 " + g.doneCount + "/" + g.total + "  " + cur
    ].join("\n");
  }

  return {
    SAVE_VERSION: SAVE_VERSION,
    STAMINA_CAP: STAMINA_CAP,
    PARTY_SIZE: PARTY_SIZE,
    STAR_COST: STAR_COST,
    HEROES: HEROES,
    BUILDINGS: BUILDINGS,
    TECHS: TECHS,
    STAGES: STAGES,
    ROLE_SLOTS: ROLE_SLOTS,
    ROLE_NAME: ROLE_NAME,
    createNewState: createNewState,
    tick: tick,
    refundPending: refundPending,
    collect: collect,
    startBuild: startBuild,
    startTech: startTech,
    useSpeedup: useSpeedup,
    buyWithDiamonds: buyWithDiamonds,
    beginBattle: beginBattle,
    stepBattle: stepBattle,
    useSkill: useSkill,
    flee: flee,
    applyBattle: applyBattle,
    teamLevelUp: teamLevelUp,
    starUp: starUp,
    skillUp: skillUp,
    pull: pull,
    resolvePull: resolvePull,
    assignSlot: assignSlot,
    guide: guide,
    staminaInfo: staminaInfo,
    shardOffer: shardOffer,
    buildingView: buildingView,
    buildCost: buildCost,
    productionPerHour: productionPerHour,
    queueRemain: queueRemain,
    formatDesign: formatDesign,
    stageLock: stageLock,
    gm: gm,
    summaryText: summaryText,
    xpNeed: xpNeed,
    foodForLevel: foodForLevel,
    currentSkillHero: currentSkillHero,
    strike: strike,
    markerPos: function (now) {
      var period = 1800;
      var p = (now % period) / period;
      return p < 0.5 ? p * 2 : 2 - p * 2;
    },
    qualityAt: function (now) {
      var pos = this.markerPos(now);
      var d = Math.abs(pos - 0.5);
      if (d <= 0.07) return "perfect";
      if (d <= 0.16) return "good";
      return "miss";
    }
  };
});
