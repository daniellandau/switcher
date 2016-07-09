const St = imports.gi.St;
const Clutter = imports.gi.Clutter;
const Main = imports.ui.main;
const Shell = imports.gi.Shell;
const Meta = imports.gi.Meta;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

const keyActivation = Me.imports.keyActivation.KeyActivation;

const Switcher = (function () {
  // Limit the number of displayed items
  const MAX_NUM_ITEMS = 15;

  var name = function() {
    return "Switcher";
  };

  var apps = function() {
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

  var activate = function(app) {
    Main.activateWindow(app);
  };

  var description = function(app) {
    let workspace = "";
    if (Convenience.getSettings().get_boolean('workspace-indicator')) {
      workspace = (app.get_workspace().index() + 1) + ": ";
    }

    const appRef = Shell.WindowTracker.get_default().get_window_app(app);
    let appName;
    try {
      appName = appRef.get_name();
    } catch (e) {
      print(e);
      appName = 'Could not get name';
    }

    return workspace + appName + ' → ' + app.get_title();
  };

  var descriptionNameIndex = function(app) {
    if (Convenience.getSettings().get_boolean('workspace-indicator')) {
      const workspace = (app.get_workspace().index() + 1);
      return workspace.toString().length + 2;
    } else {
      return 0;
    }
  };

  var makeBox = function(app, index) {
    const box = new St.BoxLayout({style_class: 'switcher-box'});

    const label = new St.Label({
      style_class: 'switcher-label',
      y_align: Clutter.ActorAlign.CENTER
    });
    label.clutter_text.set_text(description(app));
    label.set_x_expand(true);
    box.insert_child_at_index(label, 0);

    let shortcutBox;
    if (Convenience.getSettings().get_uint('activate-by-key')) {
      const shortcut = new St.Label({
        style_class: 'switcher-shortcut',
        text: keyActivation.getKeyDesc(index + 1)
      });
      shortcutBox = new St.Bin({style_class: 'switcher-label'});
      shortcutBox.child = shortcut;
      box.insert_child_at_index(shortcutBox, 0);
    }

    const iconBox = new St.Bin({style_class: 'switcher-icon'});
    const appRef = Shell.WindowTracker.get_default().get_window_app(app);
    const iconSize = Convenience.getSettings().get_uint('icon-size');
    iconBox.child = appRef.create_icon_texture(iconSize);
    box.insert_child_at_index(iconBox, 0);

    return {whole: box, shortcutBox: shortcutBox, label: label};
  };

  return {
    name: name,
    apps: apps, 
    activate: activate, 
    description: description,
    descriptionNameIndex: descriptionNameIndex,
    makeBox: makeBox
  };
}());
