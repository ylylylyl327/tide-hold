/* 潮汐据点 browser UI. Portraits and icons resolve only by id through assets/manifest.json. */
(function () {
  "use strict";
  var T = window.TideRules;
  var SAVE_KEY = "tide-hold-save-v1";
  var SLOT_LABEL = ["前排·左", "前排·右", "中排", "后排·左", "后排·右"];
  var manifest = null;
  var state = null;
  var screen = "title";
  var battle = null;
  var battleBack = "stages";
  var rafId = 0;
  var heroFocus = null;
  var focusBuild = null;
  var modal = null;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function portrait(id) {
    var map = (manifest && manifest.portraits) || {};
    return map[id] || map.unknown || "";
  }
  function icon(id) {
    var map = (manifest && manifest.icons) || {};
    return map[id] || "";
  }
  function imgP(id, alt) {
    return '<img src="' + esc(portrait(id)) + '" alt="' + esc(alt || id) + '">';
  }
  function imgI(id, alt) {
    return '<img src="' + esc(icon(id)) + '" alt="' + esc(alt || id) + '">';
  }
  function save() {
    if (!state) return;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* quota */ }
  }
  function loadSave() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || data.version !== T.SAVE_VERSION) return null;
      return data;
    } catch (e) { return null; }
  }
  function toast(msg) {
    if (!msg) return;
    var el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 2800);
  }
  function fmtMs(ms) {
    var sec = Math.ceil(Math.max(0, ms) / 1000);
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  }
  function clock(ts) {
    try {
      return new Date(ts).toLocaleString("zh-CN", { hour12: false, timeZone: "Asia/Shanghai" });
    } catch (e) {
      return new Date(ts).toLocaleString("zh-CN", { hour12: false });
    }
  }
  function go(next) {
    if (battle && !battle.ended && next !== "battle") {
      toast("先结束这场战斗");
      return;
    }
    if (battle && battle.ended) battle = null;
    screen = next;
    modal = null;
    render();
  }

  function boot() {
    fetch("assets/manifest.json").then(function (r) {
      if (!r.ok) throw new Error("manifest");
      return r.json();
    }).then(function (data) {
      manifest = data;
      Object.keys(T.HEROES).forEach(function (id) {
        if (!manifest.portraits[id]) console.warn("缺少立绘", id);
      });
      var saved = loadSave();
      if (saved) enterCity(saved);
      else { screen = "title"; render(); }
    }).catch(function () {
      document.getElementById("app").textContent = "无法加载资源清单。请在 tide-hold 目录运行 python3 -m http.server 后打开本页。";
    });
  }
  function sceneSrc(id) {
    var map = (manifest && manifest.scenes) || {};
    return map[id] || icon(id);
  }

  function enterCity(data) {
    stopBattle();
    battle = null;
    state = data;
    if (!state.offers) state.offers = { shardUntil: 0 };
    T.refundPending(state);
    T.tick(state, Date.now());
    heroFocus = null;
    focusBuild = null;
    modal = null;
    screen = "city";
    save();
    render();
  }
  function startNew() {
    enterCity(T.createNewState(Date.now()));
  }
  function continueGame() {
    var data = loadSave();
    if (!data) { startNew(); return; }
    enterCity(data);
  }

  function render() {
    var app = document.getElementById("app");
    if (screen === "title" || !state) {
      app.innerHTML = titleHtml();
      return;
    }
    app.innerHTML = shellHtml();
    if (screen === "battle" && battle) paintBattle();
    if (modal) app.insertAdjacentHTML("beforeend", modalHtml());
    paintLive();
  }

  function titleHtml() {
    return '<div class="boot"><div><h1>潮汐据点</h1><button class="primary" data-act="new-game">开始</button></div></div>';
  }

  function powerNum() {
    var n = 0;
    state.formation.forEach(function (id) {
      if (!id || !T.HEROES[id]) return;
      var owned = state.heroes[id];
      var base = T.HEROES[id].base;
      var stars = owned ? owned.stars : 1;
      var mul = (1 + (state.teamLevel - 1) * 0.15) * (1 + (stars - 1) * 0.25);
      n += Math.round((base.hp * 0.2 + base.atk * 12) * mul);
    });
    if (!n) n = state.buildings.hq.level * 120;
    return n;
  }
  function shellHtml() {
    var battleMode = screen === "battle";
    var pills = [["food", "潮粮", "food"], ["materials", "漂材", "materials"], ["gold", "汐金", "gold"], ["diamond", "钻石", "diamonds"]];
    var pillHtml = pills.map(function (c) {
      return '<span class="pill" title="' + c[1] + '">' + imgI(c[0], c[1]) + '<b data-live="' + c[2] + '">0</b></span>';
    }).join("");
    var who = state.formation.filter(Boolean)[0] || "avatar";
    var face = who === "avatar" ? icon("avatar") : portrait(who);
    var tabs = [["city", "据点", "tab_city"], ["heroes", "英雄", "tab_hero"], ["march", "出征", "tab_march"], ["recruit", "招募", "tab_recruit"], ["tech", "科技", "tab_tech"]];
    var tabHtml = tabs.map(function (n) {
      var on = screen === n[0] || (n[0] === "march" && (screen === "stages" || screen === "sea"));
      var raise = n[0] === "march" ? " raise" : "";
      return '<button data-act="go" data-screen="' + n[0] + '" class="' + (on ? "active" : "") + raise + '">' +
        imgI(n[2], n[1]) + "<span>" + n[1] + "</span></button>";
    }).join("");
    return '<div class="shell' + (battleMode ? " battle-mode" : "") + '"><div class="stage">' + mainHtml() + "</div>" +
      '<header class="hud"><div class="who"><img class="avatar" src="' + esc(face) + '" alt="">' +
      '<div class="power"><small>战力</small><b>' + powerNum() + "</b></div></div>" +
      '<div class="pills">' + pillHtml + "</div>" +
      '<div class="orb" title="潮力"><b data-live="stamina">0</b></div>' +
      '<button class="gm-mini" data-act="gm-open">GM</button></header>' +
      (battleMode ? "" : '<nav class="tabbar">' + tabHtml + "</nav>") + "</div>";
  }

  function mainHtml() {
    if (screen === "city") return cityHtml();
    if (screen === "march" || screen === "stages" || screen === "sea") return marchHtml();
    if (screen === "heroes") return heroesHtml();
    if (screen === "recruit") return recruitHtml();
    if (screen === "tech") return techHtml();
    if (screen === "battle") return battleHtml();
    return "";
  }

  function costLine(cost) {
    if (!cost) return "已到本切片上限";
    var food = cost.food ? ("开工口粮 潮粮 " + cost.food) : "不消耗潮粮";
    return food + " · 漂材 " + cost.materials + " · 汐金 " + cost.gold + " · 设计 " + T.formatDesign(cost.designSec) + "（演示约 " + Math.round(cost.demoMs / 1000) + " 秒）";
  }

  function cityHtml() {
    var now = Date.now();
    var views = T.buildingView(state, now);
    var byId = {};
    views.forEach(function (b) { byId[b.id] = b; });
    var spots = [
      ["hall", 38, 36, ""],
      ["hq", 56, 46, " lg"],
      ["lumber", 78, 38, ""],
      ["farm", 22, 70, ""],
      ["wall", 50, 74, " wide"],
      ["goldmine", 76, 68, ""]
    ];
    var buttons = spots.map(function (sp) {
      var b = byId[sp[0]];
      var bubble = "";
      if (b.stored > 0 && b.produces) {
        bubble = '<i class="pop">' + imgI(b.produces === "materials" ? "materials" : b.produces === "gold" ? "gold" : "food", "收") + "收</i>";
      }
      return '<button class="bldg' + sp[3] + '" style="left:' + sp[1] + '%;top:' + sp[2] + '%" data-act="pick" data-id="' + b.id + '">' +
        bubble + '<img class="art" src="' + esc(sceneSrc(b.id)) + '" alt="' + esc(b.name) + '">' +
        '<span class="plate"><em>' + esc(b.name) + '</em><i class="badge">' + b.level + "</i></span></button>";
    }).join("");
    var g = T.guide(state);
    var quest = g.current ? '<div class="qbanner"><i>!</i><span>' + esc(g.current.text) + "</span></div>" : "";
    var br = T.queueRemain(state.buildQueue, now);
    var qText = br ? (T.BUILDINGS[state.buildQueue.buildingId].name + " " + br.label) : "空闲";
    var speed = state.buildQueue
      ? '<div class="row"><button data-act="speedup" data-which="build" data-count="1">加速</button><button data-act="speedup" data-which="build" data-count="all">完成</button></div>'
      : "";
    var sheet = "";
    if (focusBuild && byId[focusBuild]) {
      var b = byId[focusBuild];
      var prod = b.produces
        ? '<p class="small">库存 <b data-live="stored-' + b.id + '">' + b.stored + "</b> · " + b.perHour + "/小时 · 离线最多 8 小时</p>" +
          '<button class="primary" data-act="collect" data-id="' + b.id + '">收取</button>'
        : "";
      sheet = '<aside class="sheet"><div class="row" style="justify-content:space-between"><h3>' + esc(b.name) + " · " + b.level + ' 级</h3><button class="ghost" data-act="unpick">关闭</button></div>' +
        '<p class="small">' + esc(b.blurb) + "</p>" + prod +
        '<p class="small">' + esc(costLine(b.cost)) + "</p>" +
        (b.reason && !b.canBuild ? '<p class="small">' + esc(b.reason) + "</p>" : "") +
        '<button data-act="build" data-id="' + b.id + '"' + (b.canBuild ? "" : " disabled") + ">升级</button></aside>";
    }
    var ground = (manifest.scenes && manifest.scenes.ground) || "";
    return '<div class="scene"><img class="ground" src="' + esc(ground) + '" alt="">' + buttons +
      quest +
      '<div class="qstack"><article class="qcard"><b>队列 1</b><span data-live="buildchip">' + esc(qText) + "</span>" + speed + "</article>" +
      '<button class="qcard lock" data-act="modal" data-modal="monthly"><b>队列 2</b><span>月卡</span></button></div>' +
      sheet + "</div>";
  }

  function stageNode(id) {
    var stage = T.STAGES[id];
    var lock = T.stageLock(state, id);
    var cleared = state.clears[id] ? " · 已通关" : "";
    var cost = stage.stamina ? ("潮力 " + stage.stamina) : "不耗潮力";
    if (stage.food) cost += " · 潮粮 " + stage.food;
    var label = (stage.chapter === 1 && id !== "1-boss" ? id + " " : "") + stage.name;
    return '<div class="node"><div class="row" style="justify-content:space-between"><div><strong>' + esc(label) + cleared +
      '</strong><div class="small">' + esc(cost) + (lock ? " · " + esc(lock) : "") + "</div></div>" +
      '<button class="primary" data-act="stage" data-id="' + id + '"' + (lock ? " disabled" : "") + ">出征</button></div></div>";
  }

  function marchHtml() {
    var tutorial = "";
    if (!state.flags.tutorialWon) {
      tutorial = '<div class="node"><div class="row" style="justify-content:space-between"><div><strong>拾潮</strong><div class="small">开局战斗 · 不耗潮力</div></div>' +
        '<button class="primary" data-act="stage" data-id="tutorial">出征</button></div></div>';
    }
    var rivals = state.rivals.map(function (r) {
      var team = r.team.map(function (m) { return esc(m.name); }).join("、");
      return '<div class="node"><div class="row">' + imgP("rival", r.name) + '<div><strong>' + esc(r.name) + '</strong><div class="small">' +
        esc(r.city) + " · 强度 " + r.power + " · " + team + "</div></div></div>" +
        '<button class="primary" data-act="rival" data-id="' + esc(r.id) + '">挑战</button></div>';
    }).join("");
    return '<div class="page"><h2>出征</h2>' + tutorial +
      '<p class="kicker">第一章</p><div class="path">' + stageNode("1-1") + stageNode("1-2") + stageNode("1-boss") + "</div>" +
      '<p class="kicker">第二章</p><div class="path">' + stageNode("2-1") + stageNode("2-2") + stageNode("2-boss") + "</div>" +
      '<p class="small">前三章只能手动。自动与加速标记本切片不做。</p>' +
      '<p class="kicker">海域</p><p class="small">本地模拟对手，会慢慢变强。失败只扣潮力。只有一支行军。</p>' + rivals + "</div>";
  }


  function heroesHtml() {
    var slots = state.formation.map(function (id, i) {
      if (!id) return '<div class="slot"><p class="small">' + SLOT_LABEL[i] + '</p><p class="muted">空</p></div>';
      var h = T.HEROES[id];
      var owned = state.heroes[id];
      return '<button class="slot" data-act="focus" data-id="' + id + '">' + imgP(id, h.name) +
        "<strong>" + esc(h.name) + '</strong><p class="small">' + SLOT_LABEL[i] + " · " + owned.stars + " 星</p></button>";
    }).join("");
    var bench = Object.keys(state.heroes).filter(function (id) { return state.formation.indexOf(id) < 0; }).map(function (id) {
      var h = T.HEROES[id];
      var buttons = T.ROLE_SLOTS[h.role].map(function (idx) {
        return '<button data-act="assign" data-id="' + id + '" data-slot="' + idx + '">换到' + SLOT_LABEL[idx] + "</button>";
      }).join("");
      return '<div class="card"><div class="row">' + imgP(id, h.name) + "<div><strong>" + esc(h.name) + '</strong><p class="small muted">未上阵 · ' + h.roleName + "</p>" + buttons + "</div></div></div>";
    }).join("") || '<p class="small muted">廊外没有人。招募只替换同排，不会变成第六人。</p>';
    var need = T.xpNeed(state.teamLevel);
    var food = T.foodForLevel(state.teamLevel);
    return '<div class="page"><section class="card"><div class="row" style="justify-content:space-between"><div><h2>英雄</h2>' +
      '<p class="small">前排两名，中排一名，后排两名。星级只吃星屑。</p></div>' +
      "<div><p>队伍 " + state.teamLevel + ' 级</p><p class="small">队经 ' + state.teamXp + "/" + need + " · 潮粮 " + food + '</p>' +
      '<button class="primary" data-act="levelup">升级</button></div></div><div class="slots" style="margin-top:12px">' + slots + "</div></section>" +
      '<div class="split"><section class="card">' + (heroFocus && state.heroes[heroFocus] ? heroDetailHtml(heroFocus) : '<p class="small">点一名上阵英雄。</p>') +
      '</section><section class="card"><h3>未上阵</h3>' + bench + "</section></div></div>";
  }

  function heroDetailHtml(id) {
    var def = T.HEROES[id];
    var h = state.heroes[id];
    var next = h.stars >= 3 ? null : T.STAR_COST[h.stars + 1];
    var before = state.offers.shardUntil || 0;
    var offer = T.shardOffer(state, id, Date.now());
    if ((state.offers.shardUntil || 0) !== before) save();
    var offerHtml = "";
    if (offer) {
      var timer = offer.expired ? "限时展示已结束。不会重新计时。" : ('<span data-offer-remain="1">展示倒计时 ' + fmtMs(offer.remainMs) + "</span>");
      offerHtml = '<div class="card" style="margin-top:8px;background:#241c14"><p class="kicker">星屑补给 · 仅展示</p><p>' + esc(def.name) + " 还差 " + offer.need + " 。" + timer + "</p>" +
        '<button disabled>支付未接入</button></div>';
    }
    var key = h.stars >= 3 ? '<span class="tag on">已解锁 ' + esc(def.keySkill.name) + "</span>" : '<span class="tag">3 星解锁 ' + esc(def.keySkill.name) + "</span>";
    return imgP(id, def.name) + "<h3>" + esc(def.name) + '</h3><p class="small">' + esc(def.blurb) + "</p><p>" + def.roleName + " · " + h.stars + " 星 · 星屑 " + h.shards + (next ? " / " + next : "") + "</p>" +
      '<p class="small">普技「' + esc(def.skill.name) + "」· 技能等级 " + h.skillLevel + "/5</p><p>" + key + "</p>" +
      '<div class="row"><button class="primary" data-act="star" data-id="' + id + '"' + (h.stars >= 3 ? " disabled" : "") + ">升星</button>" +
      '<button data-act="skillbook" data-id="' + id + '">使用技典</button></div>' + offerHtml;
  }

  function recruitHtml() {
    var pending = "";
    if (state.pendingPull) {
      var id = state.pendingPull.heroId;
      var def = T.HEROES[id];
      var slots = T.ROLE_SLOTS[def.role].map(function (idx) {
        var cur = state.formation[idx];
        var name = cur && T.HEROES[cur] ? T.HEROES[cur].name : "空位";
        return '<button class="primary" data-act="replace" data-slot="' + idx + '">替换' + SLOT_LABEL[idx] + "（" + esc(name) + "）</button>";
      }).join("");
      pending = '<section class="card">' + imgP(id, def.name) + "<h3>" + esc(def.name) + " · " + def.roleName + "</h3>" +
        '<div class="row">' + slots + '<button data-act="salvage">分解为星屑 +' + state.pendingPull.salvage + "</button></div></section>";
    }
    return '<div class="page">' + pending + '<section class="card"><h2>招募</h2><p>招募券 <b data-live="tickets">' + state.tickets + "</b></p>" +
      '<p class="small">钻石不能直接购买招募券。</p><button class="primary" data-act="pull"' + (state.pendingPull ? " disabled" : "") + ">招募一次</button></section>" +
      '<section class="card"><h3>钻石兑换</h3><div class="row">' +
      '<button data-act="buy" data-id="speedup">10 钻 · 分钟加速 ×1</button><button data-act="buy" data-id="food">15 钻 · 潮粮 ×100</button>' +
      '<button data-act="buy" data-id="materials">15 钻 · 漂材 ×80</button><button data-act="buy" data-id="gold">15 钻 · 汐金 ×40</button></div>' +
      '<p class="small">钻石 <b data-live="diamonds">' + state.diamonds + "</b></p></section></div>";
  }

  function techHtml() {
    var now = Date.now();
    var tr = T.queueRemain(state.techQueue, now);
    var qText = tr ? (T.TECHS[state.techQueue.techId].name + " " + tr.label) : "空闲";
    var cards = Object.keys(T.TECHS).map(function (id) {
      var spec = T.TECHS[id];
      var lv = state.tech[id] || 0;
      var done = lv >= spec.max;
      return '<article class="card">' + imgI(spec.icon, spec.name) + "<h3>" + esc(spec.name) + " · " + lv + "/" + spec.max + "</h3><p class=\"small\">" + esc(spec.blurb) + "</p>" +
        '<p class="small">漂材 ' + spec.cost.materials + " · 汐金 " + spec.cost.gold + " · 不消耗潮粮 · 设计 " + T.formatDesign(spec.designSec) + "（演示约 " + Math.round(spec.designSec / 60) + " 秒）</p>" +
        '<button class="primary" data-act="tech" data-id="' + id + '"' + (done || state.techQueue ? " disabled" : "") + ">" + (done ? "已完成" : "开始研究") + "</button></article>";
    }).join("");
    return '<div class="page"><section class="card"><h2>科技</h2><p>队列：<span data-live="techchip">' + esc(qText) + "</span></p>" +
      '<div class="row"><button data-act="speedup" data-which="tech" data-count="1"' + (state.techQueue ? "" : " disabled") + ">加速</button>" +
      '<button data-act="speedup" data-which="tech" data-count="all"' + (state.techQueue ? "" : " disabled") + ">完成</button></div></section>" + cards + "</div>";
  }

  function unitHtml(u) {
    var role = u.role ? '<p class="small muted">' + esc(u.role) + "</p>" : "";
    return '<div class="unit" data-uid="' + u.uid + '">' + imgP(u.portrait || u.heroId || "unknown", u.name) +
      "<div><strong>" + esc(u.name) + "</strong>" + role +
      '<div class="bar hp ' + (u.heroId ? "ally" : "") + '"><span data-hp="' + u.uid + '"></span></div>' +
      '<p class="small"><span data-hptext="' + u.uid + '"></span> <span data-shield="' + u.uid + '"></span></p></div><div class="floats"></div></div>';
  }

  function battleHtml() {
    if (!battle) return '<section class="card"><p>没有战斗。</p></section>';
    return '<div class="battle-full"><p class="kicker">手动</p><h2>' + esc(battle.title) + "</h2>" +
      (battle.intro ? "<p>" + esc(battle.intro) + "</p>" : "") +
      (battle.hungry ? '<p class="small">潮粮不够，这仗处于饥饿，攻击降低。</p>' : "") +
      '<div class="battle-grid"><div><h3>我方</h3>' + battle.allies.map(unitHtml).join("") + "</div><div><h3>对方</h3>" + battle.enemies.map(unitHtml).join("") + "</div></div>" +
      '<p class="logline" id="battle-log"></p><div class="rhythm" id="rhythm"><div class="good"></div><div class="perfect"></div><div class="marker" id="marker"></div></div>' +
      '<button class="cast" id="cast" data-act="cast">释技</button>' +
      '<p class="small muted">亮带中央是完美。空格键也能释技。首领张开潮喉时，良好或完美可以打断。</p>' +
      '<div class="row"><button class="ghost" data-act="flee"' + (battle.battleId === "tutorial" ? " disabled" : "") + ">离开（潮力不退）</button></div>" +
      '<div id="battle-result"></div></div>';
  }

  function paintBattle() {
    if (!battle) return;
    var now = Date.now();
    battle.allies.concat(battle.enemies).forEach(function (u) {
      var bar = document.querySelector('[data-hp="' + u.uid + '"]');
      var text = document.querySelector('[data-hptext="' + u.uid + '"]');
      var sh = document.querySelector('[data-shield="' + u.uid + '"]');
      var card = document.querySelector('[data-uid="' + u.uid + '"]');
      if (bar) bar.style.width = Math.max(0, (u.hp / u.maxHp) * 100) + "%";
      if (text) text.textContent = Math.ceil(u.hp) + "/" + u.maxHp;
      if (sh) sh.textContent = u.shield ? "墙 " + u.shield : "";
      if (card) card.classList.toggle("dead", !u.alive);
    });
    var marker = document.getElementById("marker");
    if (marker) marker.style.left = (T.markerPos(now) * 100) + "%";
    var rhythm = document.getElementById("rhythm");
    if (rhythm) rhythm.classList.toggle("warn", !!battle.warning);
    var btn = document.getElementById("cast");
    var hero = T.currentSkillHero(battle);
    if (btn && hero && !battle.ended) {
      var skill = hero.keyUnlocked ? hero.keySkill : hero.skill;
      var cd = battle.skillReadyAt - now;
      if (cd > 0) {
        btn.disabled = true;
        btn.className = "cast";
        btn.textContent = hero.name + " 酝酿中 " + (cd / 1000).toFixed(1) + " 秒";
      } else {
        var q = T.qualityAt(now);
        var qn = q === "perfect" ? "完美" : q === "good" ? "良好" : "偏离";
        btn.disabled = false;
        btn.className = "cast " + q;
        btn.textContent = "释技 · " + skill.name + " · " + qn + (hero.keyUnlocked ? " · 关键" : "");
      }
    }
  }

  function floats(events) {
    (events || []).forEach(function (ev) {
      if (ev.text && (ev.type === "note" || ev.type === "warn")) {
        var log = document.getElementById("battle-log");
        if (log) log.textContent = ev.text;
      }
      if (!ev.uid || !ev.text) return;
      var host = document.querySelector('[data-uid="' + ev.uid + '"] .floats');
      if (!host) return;
      var s = document.createElement("span");
      s.className = "float " + (ev.type === "heal" ? "heal" : "dmg");
      s.textContent = ev.text;
      host.appendChild(s);
      setTimeout(function () { s.remove(); }, 700);
    });
  }

  function loop() {
    if (screen !== "battle" || !battle) return;
    if (!battle.ended) {
      floats(T.stepBattle(battle, Date.now()));
      if (battle.ended) finishBattle();
    }
    if (!battle || battle.ended) return;
    paintBattle();
    rafId = requestAnimationFrame(loop);
  }
  function stopBattle() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
  }
  function begin(id, back) {
    var res = T.beginBattle(state, id, Date.now());
    if (!res.ok) { toast(res.reason); return; }
    battleBack = back || "march";
    battle = res.battle;
    if (res.hungry) toast("潮粮不足，饥饿出战");
    save();
    screen = "battle";
    modal = null;
    stopBattle();
    render();
    rafId = requestAnimationFrame(loop);
  }
  function cast() {
    if (!battle || battle.ended) return;
    var now = Date.now();
    var res = T.useSkill(battle, T.qualityAt(now), now);
    if (!res.ok) { toast(res.reason); return; }
    floats(res.events);
    var log = document.getElementById("battle-log");
    if (log) log.textContent = res.heroName + " · " + res.skillName + " · " + res.qualityName;
    if (battle.ended) finishBattle();
    else paintBattle();
  }
  function finishBattle() {
    if (!battle || battle._applied) return;
    battle._applied = true;
    var result = T.applyBattle(state, battle);
    save();
    stopBattle();
    var box = document.getElementById("battle-result");
    if (!box) return;
    var lines = (result.lines || []).map(function (l) { return "<li>" + esc(l) + "</li>"; }).join("");
    var next = battle.battleId === "tutorial" && result.win ? "city" : battleBack;
    var label = battle.battleId === "tutorial" && result.win ? "进入据点" : "返回";
    var retry = !result.win && battle.battleId === "tutorial" ? '<button class="primary" data-act="retry">再战一次</button>' : "";
    box.innerHTML = '<hr class="sep"><h3>' + (result.win ? "打下来了" : "没打下来") + "</h3><ul>" + lines + '</ul><div class="row">' + retry +
      '<button class="primary" data-act="leave" data-screen="' + next + '">' + label + "</button></div>";
    var castBtn = document.getElementById("cast");
    if (castBtn) castBtn.disabled = true;
    paintBattle();
  }

  function gmBtn(type, label) {
    return '<button data-act="gm" data-type="' + type + '">' + label + "</button>";
  }
  function modalHtml() {
    if (!modal) return "";
    var inner = "";
    if (modal.type === "monthly") {
      inner = '<p class="kicker">潮汐月卡 · 仅展示</p><h3>30 日</h3><ul><li>第二条建造队列</li><li>每日钻石 ×50</li></ul><p>标价 30 元 / 30 日。不会扣款。</p><button disabled>支付未接入</button><p class="small muted">据点里的第二队列按钮保持关闭。</p>';
    } else if (modal.type === "speedup") {
      inner = '<p class="kicker">加速补给 · 仅展示</p><h3>这次升级的设计耗时超过 15 分钟</h3><p>展示内容：分钟加速 ×30，钻石 ×80。标价 18 元。</p><p class="small muted">升级已经开始，关掉也不会停。没有支付。</p><button disabled>支付未接入</button>';
    } else if (modal.type === "gm") {
      var heroes = Object.keys(T.HEROES).map(function (id) { return '<option value="' + id + '">' + esc(T.HEROES[id].name) + "</option>"; }).join("");
      var techs = Object.keys(T.TECHS).map(function (id) { return '<option value="' + id + '">' + esc(T.TECHS[id].name) + "</option>"; }).join("");
      var log = (state.gmLog || []).map(function (row) { return "<li>" + esc(clock(row.t)) + " · " + esc(row.text) + "</li>"; }).join("") || "<li>还没有发放记录</li>";
      inner = '<p class="kicker">GM · 本地员工工具</p><h3>发放与设置</h3><div class="row">' +
        '<label>数量 <input id="gm-amount" type="number" value="100" min="1" style="width:100px;background:#0e1716;border:1px solid var(--line);border-radius:8px;padding:6px"></label>' +
        '<label>英雄 <select id="gm-hero">' + heroes + "</select></label>" +
        '<label>研潮 <select id="gm-tech">' + techs + "</select></label>" +
        '<label>等级 <input id="gm-level" type="number" value="2" min="0" max="5" style="width:70px;background:#0e1716;border:1px solid var(--line);border-radius:8px;padding:6px"></label></div>' +
        '<div class="gm-grid" style="margin-top:8px">' +
        gmBtn("diamonds", "发放钻石") + gmBtn("tickets", "发放招募券") + gmBtn("speedups", "发放分钟加速") +
        gmBtn("food", "发放潮粮") + gmBtn("materials", "发放漂材") + gmBtn("gold", "发放汐金") +
        gmBtn("xp", "发放队经") + gmBtn("books", "发放技典") + gmBtn("stamina", "潮力补满") +
        gmBtn("shards", "发放星屑") + gmBtn("hq", "设置潮心台等级") + gmBtn("tech", "设置研潮等级") + gmBtn("stars", "设置英雄星级") +
        '</div><h3 style="margin-top:12px">发放记录</h3><ul class="gm-log" id="gm-log">' + log + "</ul>" +
        '<p class="small muted">记录留在这个面板上，并写进本地存档。</p><button class="warn" data-act="reset-save">清除本地存档</button>';
    }
    return '<div class="modal-back"><section class="modal" data-stop="1">' + inner + '<div class="row" style="margin-top:12px"><button class="ghost" data-act="close-modal">关闭</button></div></section></div>';
  }

  function paintLive() {
    if (!state || screen === "title") return;
    var now = Date.now();
    var st = T.staminaInfo(state, now);
    var map = {
      food: String(state.food), materials: String(state.materials), gold: String(state.gold),
      diamonds: String(state.diamonds), tickets: String(state.tickets), speedups: String(state.speedups),
      books: String(state.books), stamina: st.value + "/" + st.cap,
      stamnext: st.nextMs ? ("+" + fmtMs(st.nextMs)) : "已满", team: String(state.teamLevel),
      teamxp: state.teamXp + "/" + T.xpNeed(state.teamLevel)
    };
    ["farm", "lumber", "goldmine"].forEach(function (id) {
      map["stored-" + id] = String(Math.floor(state.buildings[id].stored));
    });
    var br = T.queueRemain(state.buildQueue, now);
    map.buildchip = br ? (T.BUILDINGS[state.buildQueue.buildingId].name + " " + br.label) : "空闲";
    var tr = T.queueRemain(state.techQueue, now);
    map.techchip = tr ? (T.TECHS[state.techQueue.techId].name + " " + tr.label) : "空闲";
    document.querySelectorAll("[data-live]").forEach(function (el) {
      var key = el.getAttribute("data-live");
      if (map[key] == null || el.textContent === map[key]) return;
      el.textContent = map[key];
    });
    var offer = document.querySelector("[data-offer-remain]");
    if (offer && heroFocus && state.heroes[heroFocus]) {
      var info = T.shardOffer(state, heroFocus, now);
      if (info && !info.expired) offer.textContent = "展示倒计时 " + fmtMs(info.remainMs);
    }
  }

  function onClick(e) {
    var btn = e.target.closest("[data-act]");
    if (!btn || btn.disabled) return;
    var act = btn.getAttribute("data-act");
    if (act === "new-game") {
      if (loadSave() && !window.confirm("清除当前浏览器里的潮汐据点存档，并重新开始？")) return;
      startNew();
      return;
    }
    if (act === "continue") { continueGame(); return; }
    if (act === "go") { go(btn.getAttribute("data-screen")); return; }
    if (act === "leave") { battle = null; go(btn.getAttribute("data-screen") || "city"); return; }
    if (act === "retry") { begin("tutorial", "city"); return; }
    if (act === "cast") { cast(); return; }
    if (act === "flee") {
      if (!battle || battle.ended) return;
      T.flee(battle);
      finishBattle();
      return;
    }
    if (act === "close-modal") { modal = null; render(); return; }
    if (act === "pick") { focusBuild = btn.getAttribute("data-id"); render(); return; }
    if (act === "unpick") { focusBuild = null; render(); return; }
    if (!state && act !== "gm-open") return;
    if (act === "collect") {
      var c = T.collect(state, btn.getAttribute("data-id"), Date.now());
      toast(c.ok ? c.message : c.reason); save(); render(); return;
    }
    if (act === "build") {
      var built = T.startBuild(state, btn.getAttribute("data-id"), Date.now());
      toast(built.ok ? built.message : built.reason);
      if (built.ok) save();
      modal = built.ok && built.offerSpeedup ? { type: "speedup" } : null;
      render();
      return;
    }
    if (act === "tech") {
      var tech = T.startTech(state, btn.getAttribute("data-id"), Date.now());
      toast(tech.ok ? tech.message : tech.reason);
      if (tech.ok) save();
      render(); return;
    }
    if (act === "speedup") {
      var count = btn.getAttribute("data-count") === "all" ? "all" : 1;
      var sp = T.useSpeedup(state, btn.getAttribute("data-which"), Date.now(), count);
      toast(sp.ok ? sp.message : sp.reason);
      if (sp.messages) sp.messages.forEach(toast);
      save(); render(); return;
    }
    if (act === "stage") { begin(btn.getAttribute("data-id"), "march"); return; }
    if (act === "rival") { begin("rival:" + btn.getAttribute("data-id"), "march"); return; }
    if (act === "focus") { heroFocus = btn.getAttribute("data-id"); render(); return; }
    if (act === "star") {
      var st = T.starUp(state, btn.getAttribute("data-id"));
      toast(st.ok ? st.message : st.reason); save(); render(); return;
    }
    if (act === "skillbook") {
      var sk = T.skillUp(state, btn.getAttribute("data-id"));
      toast(sk.ok ? sk.message : sk.reason); save(); render(); return;
    }
    if (act === "levelup") {
      var lv = T.teamLevelUp(state);
      toast(lv.ok ? lv.message : lv.reason); save(); render(); return;
    }
    if (act === "assign") {
      var asg = T.assignSlot(state, btn.getAttribute("data-id"), Number(btn.getAttribute("data-slot")));
      toast(asg.ok ? asg.message : asg.reason); save(); render(); return;
    }
    if (act === "pull") {
      var pull = T.pull(state);
      toast(pull.ok ? "请选择替换同排，或分解" : pull.reason); save(); render(); return;
    }
    if (act === "replace") {
      var rp = T.resolvePull(state, "replace", Number(btn.getAttribute("data-slot")));
      toast(rp.ok ? rp.message : rp.reason); save(); render(); return;
    }
    if (act === "salvage") {
      var sv = T.resolvePull(state, "salvage");
      toast(sv.ok ? sv.message : sv.reason); save(); render(); return;
    }
    if (act === "buy") {
      var buy = T.buyWithDiamonds(state, btn.getAttribute("data-id"));
      toast(buy.ok ? buy.message : buy.reason); save(); render(); return;
    }
    if (act === "modal") { modal = { type: btn.getAttribute("data-modal") }; render(); return; }
    if (act === "gm-open") {
      if (battle && !battle.ended) { toast("先结束这场战斗"); return; }
      if (!state) { state = T.createNewState(Date.now()); screen = "city"; }
      modal = { type: "gm" }; render(); return;
    }
    if (act === "gm") {
      var amountEl = document.getElementById("gm-amount");
      var res = T.gm(state, {
        type: btn.getAttribute("data-type"),
        amount: Number(amountEl ? amountEl.value : 0),
        heroId: (document.getElementById("gm-hero") || {}).value,
        techId: (document.getElementById("gm-tech") || {}).value,
        level: Number((document.getElementById("gm-level") || {}).value || 0)
      }, Date.now());
      toast(res.ok ? "已写入发放记录" : res.reason);
      save();
      modal = { type: "gm" };
      render();
      return;
    }
    if (act === "reset-save") {
      localStorage.removeItem(SAVE_KEY);
      stopBattle();
      state = null;
      battle = null;
      modal = null;
      screen = "title";
      render();
      toast("本地存档已清除");
    }
  }

  document.getElementById("app").addEventListener("click", function (e) {
    if (e.target.closest(".modal-back") && !e.target.closest("[data-stop]")) {
      modal = null;
      render();
      return;
    }
    onClick(e);
  });
  window.addEventListener("keydown", function (e) {
    if (e.repeat) return;
    if (e.code === "Escape" && modal) { modal = null; render(); return; }
    if ((e.code === "Space" || e.code === "Enter") && screen === "battle" && battle && !battle.ended) {
      var tag = e.target && e.target.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      e.preventDefault();
      cast();
    }
  });
  setInterval(function () {
    if (!state || screen === "title") return;
    var ev = T.tick(state, Date.now());
    if (ev.messages && ev.messages.length) {
      ev.messages.forEach(toast);
      save();
      if (screen !== "battle") render();
      return;
    }
    paintLive();
  }, 300);
  boot();
})();
