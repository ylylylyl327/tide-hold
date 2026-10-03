const Tide = require("../../utils/rules.js");
Page({
  data: { buildings: [] },
  onShow() {
    var app = getApp();
    var now = Date.now();
    Tide.tick(app.state, now);
    this.setData({ buildings: Tide.buildingView(app.state, now) });
  }
});
