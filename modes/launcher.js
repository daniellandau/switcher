const St = imports.gi.St;
const Clutter = imports.gi.Clutter;
const Main = imports.ui.main;
const Shell = imports.gi.Shell;
const Meta = imports.gi.Meta;
const Gio = imports.gi.Gio;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

const Launcher = (function () {
  var name = function() {
    return "Launcher";
  };

  var appInfos = Gio.AppInfo.get_all().filter(function(appInfo) {
      try {
          let id = appInfo.get_id(); // catch invalid file encodings
      } catch(e) {
          return false;
      }
      return appInfo.should_show();
  }).map(function(app) {
      return app.get_id();
  });

  var shellApps = appInfos.map(function(appID) {
    return Shell.AppSystem.get_default().lookup_app(appID);
  });

  var apps = function() {
    return shellApps;
  };

  var activate = function(app) {
    app.open_new_window(-1);
  };

  var description = function(app) {
    let appName;
    try {
      appName = app.get_name();
    } catch (e) {
      print(e);
      appName = 'Could not get name';
    }

    return appName;
  };

  // Workspace indicators are not used
  var descriptionNameIndex = function(app) {
      return 0;
  };

  var makeBox = function(app, index) {
    const box = new St.BoxLayout({style_class: 'switcher-box'});

    let shortcutBox;
    if (Convenience.getSettings().get_uint('activate-by-key')) {
      const shortcut = new St.Label({
        style_class: 'switcher-shortcut',
        text: getKeyDesc(index + 1)
      });
      shortcutBox = new St.Bin({style_class: 'switcher-label'});
      shortcutBox.child = shortcut;
      box.insert_child_at_index(shortcutBox, 0);
    }

    const label = new St.Label({
      style_class: 'switcher-label',
      y_align: Clutter.ActorAlign.CENTER
    });
    label.clutter_text.set_text(description(app));
    label.set_x_expand(true);
    box.insert_child_at_index(label, 0);

    const iconBox = new St.Bin({style_class: 'switcher-icon'});
    const iconSize = Convenience.getSettings().get_uint('icon-size');
    iconBox.child = app.create_icon_texture(iconSize);
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
