/* 潮汐据点 — shared rules. No art paths. Portraits/icons resolve by id via assets/manifest.json. */
(function (factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (typeof globalThis !== "undefined") globalThis.TideRules = api;
})(function () {
  "use strict";

  var SAVE_VERSION = 1;
