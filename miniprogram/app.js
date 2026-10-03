const Tide = require("./utils/rules.js");
App({
  onLaunch() {
    this.tide = Tide;
    var state = null;
    try {
      var raw = wx.getStorageSync("tide-hold-save-v1");
      if (raw) state = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch (e) { state = null; }
    if (!state || state.version !== Tide.SAVE_VERSION) state = Tide.createNewState(Date.now());
    Tide.refundPending(state);
    Tide.tick(state, Date.now());
    this.state = state;
    this.save();
  },
  save() {
    try { wx.setStorageSync("tide-hold-save-v1", JSON.stringify(this.state)); } catch (e) {}
  }
});
