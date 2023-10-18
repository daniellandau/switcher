// const St = imports.gi.St;
import St from 'gi://St';
// const Clutter = imports.gi.Clutter;
import Clutter from 'gi://Clutter';
// const Main = imports.ui.main;
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
// const Shell = imports.gi.Shell;
import Shell from 'gi://Shell';
// const Meta = imports.gi.Meta;
import Meta from 'gi://Meta';

// const ExtensionUtils = imports.misc.extensionUtils;
// const Me = ExtensionUtils.getCurrentExtension();
// const Convenience = Me.imports.convenience;
import * as Convenience from '../convenience.js';

// const modeUtils = Me.imports.modes.modeUtils.ModeUtils;
import * as modeUtils from './modeUtils.js';

let stats = Convenience.getJson('launcher-stats');

export var Launcher = (function () {
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
    try {
      return modeUtils
        .shellApps()
        .sort((a, b) => {
          if (a.get_id() in stats && !(b.get_id() in stats)) return -1;
          if (b.get_id() in stats && !(a.get_id() in stats)) return 1;
          if (!(a.get_id() in stats) && !(b.get_id() in stats)) return 0;
          return stats[a.get_id()] < stats[b.get_id()] ? 1 : -1;
        })
        .map((app) => ({ app, mode: Launcher, activate }));
    } catch (e) {
      print(e)
      return [];
    }

  };

  let description = function (app) {
    try {
      return `${app.get_name()} ${modeUtils.getExtras(app)}`;
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
