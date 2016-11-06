const St = imports.gi.St;
const Clutter = imports.gi.Clutter;
const Main = imports.ui.main;
const Shell = imports.gi.Shell;
const Meta = imports.gi.Meta;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

const modeUtils = Me.imports.modes.modeUtils.ModeUtils;

const Switcher = (function () {
  // Limit the number of displayed items
  const MAX_NUM_ITEMS = 15;

  let name = function() {
    return "Switcher";
  };

  let apps = function() {
    // Get all windows in activation order
    let onlyCurrentWorkspace = Convenience.getSettings().get_boolean('only-current-workspace');
    let currentWorkspace = global.screen.get_active_workspace_index();
    let tabList = global.display.get_tab_list(Meta.TabList.NORMAL, null)
      .filter(app => !onlyCurrentWorkspace || app.get_workspace().index() === currentWorkspace);

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
    let workspace = "";
    if (Convenience.getSettings().get_boolean('workspace-indicator')) {
      workspace = (app.get_workspace().index() + 1) + ": ";
    }

    const appRef = Shell.WindowTracker.get_default().get_window_app(app);
    let appName;
    try {
      appName = appRef.get_name().replace(/&/g, "&amp;");
    } catch (e) {
      print(e);
      appName = 'Could not get name';
    }

    return workspace + appName + ' → ' + app.get_title();
  };

  let descriptionNameIndex = function(app) {
    if (Convenience.getSettings().get_boolean('workspace-indicator')) {
      const workspace = (app.get_workspace().index() + 1);
      return workspace.toString().length + 2;
    } else {
      return 0;
    }
  };

  let makeBox = function(app, index, onActivate) {
    const appRef = Shell.WindowTracker.get_default().get_window_app(app);
    return modeUtils.makeBox(app, appRef, description(app), index, onActivate);
  };

  return {
    MAX_NUM_ITEMS: MAX_NUM_ITEMS,
    name: name,
    apps: apps,
    activate: activate,
    description: description,
    descriptionNameIndex: descriptionNameIndex,
    makeBox: makeBox,
    cleanIDs: modeUtils.cleanIDs,
    destroyParent: modeUtils.destroyParent
  };
}());
