const St = imports.gi.St;
const Clutter = imports.gi.Clutter;
const Main = imports.ui.main;
const Shell = imports.gi.Shell;
const Meta = imports.gi.Meta;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

const util = Me.imports.util;
const modeUtils = Me.imports.modes.modeUtils.ModeUtils;

var onlyCurrentWorkspaceToggled = false;

var Switcher = (function() {
  // Limit the number of displayed items
  const MAX_NUM_ITEMS = 15;

  let name = function() {
    return 'Switcher';
  };

  let filter = function(apps) {
    let onlyCurrentWorkspace = Convenience.getSettings().get_boolean(
      'only-current-workspace'
    );
    let currentWorkspace = util.getCurrentWorkspace();
    return apps.filter(
      app =>
        (!onlyCurrentWorkspace && !onlyCurrentWorkspaceToggled) ||
        (onlyCurrentWorkspace && onlyCurrentWorkspaceToggled) ||
        app.get_workspace().index() === currentWorkspace
    );
  };

  let apps = function() {
    // Get all windows in activation order
    let tabList = global.display.get_tab_list(Meta.TabList.NORMAL, null);

    // swap the first two, so we can switch quickly back and forth
    if (tabList.length >= 2) {
      const tmp = tabList[0];
      tabList[0] = tabList[1];
      tabList[1] = tmp;
    }

    return tabList;
  };

  let activate = function(app) {
    Main.activateWindow(app);
  };

  let description = function(app) {
    let workspace = '';
    if (Convenience.getSettings().get_boolean('workspace-indicator')) {
      workspace = app.get_workspace().index() + 1 + ': ';
    }

    const appRef = Shell.WindowTracker.get_default().get_window_app(app);
    let appName;
    try {
      appName = appRef.get_name().replace(/&/g, '&amp;');
    } catch (e) {
      print(e);
      appName = 'Could not get name';
    }

    return workspace + appName + ' → ' + app.get_title();
  };

  let makeBox = function(app, index, onActivate, oldBox) {
    const appRef = Shell.WindowTracker.get_default().get_window_app(app);
    if (!appRef) return null;
    return modeUtils.makeBox(
      app,
      appRef,
      description(app),
      index,
      onActivate,
      oldBox
    );
  };

  return {
    MAX_NUM_ITEMS: MAX_NUM_ITEMS,
    name: name,
    apps: apps,
    filter: filter,
    activate: activate,
    description: description,
    makeBox: makeBox,
    cleanIDs: modeUtils.cleanIDs
  };
})();
