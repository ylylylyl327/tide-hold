const Tide = require("../../utils/rules.js");
function sim(state, id) {
  var now = Date.now();
  var begun = Tide.beginBattle(state, id, now);
  if (!begun.ok) return begun;
  var battle = begun.battle;
  var guard = 0;
  while (!battle.ended && guard++ < 8000) {
    now += 200;
    Tide.stepBattle(battle, now);
    if (now >= battle.skillReadyAt) Tide.useSkill(battle, "perfect", now);
  }
  return Tide.applyBattle(state, battle);
}
Page({
  data: { summary: "" },
  onShow() { this.refresh(); },
  refresh() {
    var app = getApp();
    Tide.tick(app.state, Date.now());
    app.save();
    this.setData({ summary: Tide.summaryText(app.state, Date.now()) });
  },
  onNew() {
    var app = getApp();
    app.state = Tide.createNewState(Date.now());
    app.save();
    this.refresh();
  },
  onTutorial() { this._run("tutorial"); },
  onStage(e) { this._run(e.currentTarget.dataset.id); },
  _run(id) {
    var app = getApp();
    var res = sim(app.state, id);
    wx.showToast({ title: res.ok ? (res.win ? "打下来了" : "没打下来") : (res.reason || "未能开始"), icon: "none" });
    app.save();
    this.refresh();
  },
  onCollect() {
    var app = getApp();
    var res = Tide.collect(app.state, "farm", Date.now());
    wx.showToast({ title: res.ok ? res.message : res.reason, icon: "none" });
    app.save();
    this.refresh();
  },
  onHq() {
    var app = getApp();
    var now = Date.now();
    var res = Tide.startBuild(app.state, "hq", now);
    if (!res.ok) {
      wx.showToast({ title: res.reason, icon: "none" });
      return;
    }
    Tide.tick(app.state, app.state.buildQueue.endsAt + 1);
    app.save();
    this.refresh();
  }
});
