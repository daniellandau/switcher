const St = imports.gi.St;
const Clutter = imports.gi.Clutter;
const Main = imports.ui.main;
const Shell = imports.gi.Shell;
const Meta = imports.gi.Meta;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

const modeUtils = Me.imports.modes.modeUtils.ModeUtils;

let stats = Convenience.getJson('launcher-stats');

var Launcher = (function () {
  // Limit the number of displayed items
  const MAX_NUM_ITEMS = 10;

  let name = function () {
    return 'Launcher';
  };

  let activate = function (app) {
    app.open_new_window(-1);
    const key = app.get_id();
    if (key in stats) stats[key] += 1;
    else stats[key] = 1;
    Convenience.setJson('launcher-stats', stats);
  };

  let apps = function () {
    return modeUtils
      .shellApps()
      .sort((a, b) => {
        if (a.get_id() in stats && !(b.get_id() in stats)) return -1;
        if (b.get_id() in stats && !(a.get_id() in stats)) return 1;
        if (!(a.get_id() in stats) && !(b.get_id() in stats)) return 0;
        return stats[a.get_id()] < stats[b.get_id()] ? 1 : -1;
      })
      .map((app) => ({ app, mode: Launcher, activate }));
  };

  let description = function (app) {
    try {
      return app.get_name();
    } catch (e) {
      print(e);
      return 'Could not get name';
    }
  };

  let makeBox = function (appObj, index, onActivate, oldBox) {
    const app = appObj.app;
    return modeUtils.makeBox(
      appObj,
      app,
      app,
      description(app),
      index,
      onActivate,
      oldBox
    );
  };

  return {
    MAX_NUM_ITEMS,
    name,
    apps,
    filter: (x) => true,
    activate,
    description,
    makeBox,
    cleanIDs: modeUtils.cleanIDs
  };
})();
