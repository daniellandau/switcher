const St = imports.gi.St;
const Clutter = imports.gi.Clutter;
const Main = imports.ui.main;
const Shell = imports.gi.Shell;
const Meta = imports.gi.Meta;
const Gio = imports.gi.Gio;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

const keyActivation = Me.imports.keyActivation.KeyActivation;

const ModeUtils = (function () {
  // From _loadApps() in GNOME Shell's appDisplay.js
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

  var appIcons = {};
  const iconSize = Convenience.getSettings().get_uint('icon-size');
  shellApps.forEach(function(app) {
      appIcons[app.get_id()] = app.create_icon_texture(iconSize);
  });

  var seenIDs = {};
  var cleanIDs = () => seenIDs = {};
  var makeBox = function(app, appRef, description, index) {
    const box = new St.BoxLayout({style_class: 'switcher-box'});

    const label = new St.Label({
      style_class: 'switcher-label',
      y_align: Clutter.ActorAlign.CENTER
    });
    label.clutter_text.set_text(description);
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

    // In case of multiple windows sharing the same id, we need to keep track
    // of ids which were already seen, in order to create a new icon for each
    // window beyond the first.
    // In another case, some windows may use a custom app id, forcing us to
    // create an icon.
    const iconBox = new St.Bin({style_class: 'switcher-icon'});
    const id = appRef.get_id();
    let appIcon = appIcons[id];
    if ((seenIDs.hasOwnProperty(id)) || (appIcon === undefined)) {
        iconBox.child = appRef.create_icon_texture(iconSize);
    } else {
        // To reuse the same icon, it's actor must not belong to any parent 
        destroyParent(appIcon);
        iconBox.child = appIcon;

        seenIDs[id] = true; // Dummy value
    }
    box.insert_child_at_index(iconBox, 0);

    return { whole: box, iconBox: iconBox, shortcutBox: shortcutBox, label: label };
  };

  var destroyParent = function(child) {
    if (child) {
      let parent = child.get_parent();
      if (parent) {
        parent.remove_actor(child);
        parent.destroy();
      }
    }
  };

  return {
    appIcons: appIcons, 
    cleanIDs: cleanIDs,
    destroyParent: destroyParent,
    makeBox: makeBox,
    shellApps: shellApps
  };
}());
