const St = imports.gi.St;
const Clutter = imports.gi.Clutter;
const Main = imports.ui.main;
const Shell = imports.gi.Shell;
const Meta = imports.gi.Meta;
const Gio = imports.gi.Gio;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;
const util = Me.imports.util;

const keyActivation = Me.imports.keyActivation.KeyActivation;

var ModeUtils = (function() {
  // From _loadApps() in GNOME Shell's appDisplay.js
  let appInfos = () =>
    Gio.AppInfo.get_all()
      .filter(function(appInfo) {
        try {
          let id = appInfo.get_id(); // catch invalid file encodings
        } catch (e) {
          return false;
        }
        return appInfo.should_show();
      })
      .map(function(app) {
        return app.get_id();
      });

  let shellAppCache = { lastIndexed: null, apps: [] };
  let shellApps = force => {
    const get = () =>
      appInfos().map(function(appID) {
        return Shell.AppSystem.get_default().lookup_app(appID);
      });
    const update = () => {
      shellAppCache.lastIndexed = new Date();
      shellAppCache.apps = get();
    };
    if (!shellAppCache.lastIndexed || !!force) {
      update();
    } else {
      util.setTimeout(update, 500);
    }
    return shellAppCache.apps;
  };

  let appIcons = {};
  let iconSize = null;

  let getAppIcon = app => {
    const configuredIconSize = Convenience.getSettings().get_uint('icon-size');

    // if icon size changes, redo the whole cache
    if (configuredIconSize !== iconSize) {
      appIcons = {};
      iconSize = configuredIconSize;
      shellApps().forEach(function(app) {
        appIcons[app.get_id()] = app.create_icon_texture(iconSize);
      });
    }

    // if icon doesn't exist (e.g. new app installed) add it to the cache
    if (!appIcons.hasOwnProperty(app.get_id())) {
      appIcons[app.get_id()] = app.create_icon_texture(iconSize);
    }

    return appIcons[app.get_id()];
  };

  let seenIDs = {};
  let cleanIDs = () => (seenIDs = {});
  let makeBox = function(app, appRef, description, index, onActivate, oldBox) {
    if (oldBox.whole) oldBox.whole.disconnect(oldBox.activationCallbackId);
    const whole =
      oldBox.whole || new St.Button({ style_class: 'switcher-box' });
    const box = oldBox.whole ? undefined : new St.BoxLayout();

    const label =
      oldBox.label ||
      new St.Label({
        style_class: 'switcher-label',
        y_align: Clutter.ActorAlign.CENTER
      });
    label.clutter_text.set_text(description);
    label.set_x_expand(true);
    if (!oldBox.label) box.insert_child_at_index(label, 0);

    let shortcutBox;
    if (
      !oldBox.label &&
      Convenience.getSettings().get_uint('activate-by-key')
    ) {
      const shortcut = new St.Label({
        style_class: 'switcher-shortcut',
        text: keyActivation.getKeyDesc(index + 1)
      });
      shortcutBox = new St.Bin({ style_class: 'switcher-label' });
      shortcutBox.child = shortcut;
      box.insert_child_at_index(shortcutBox, 0);
    }

    // In case of multiple windows sharing the same id, we need to keep track
    // of ids which were already seen, in order to create a new icon for each
    // window beyond the first.
    // In another case, some windows may use a custom app id, forcing us to
    // create an icon.
    const iconBox =
      oldBox.iconBox || new St.Bin({ style_class: 'switcher-icon' });
    const id = appRef.get_id();
    let appIcon = getAppIcon(appRef);
    if (seenIDs.hasOwnProperty(id) || appIcon === undefined) {
      iconBox.child = appRef.create_icon_texture(iconSize);
    } else {
      // To reuse the same icon, it's actor must not belong to any parent
      util.detachParent(appIcon);
      iconBox.child = appIcon;

      seenIDs[id] = true; // Dummy value
    }
    if (!oldBox.iconBox) box.insert_child_at_index(iconBox, 0);
    const activationCallback = () => {
      const e = Clutter.get_current_event();
      const control = (e.get_state() & Clutter.ModifierType.CONTROL_MASK) !== 0;
      const shift = (e.get_state() & Clutter.ModifierType.SHIFT_MASK) !== 0;
      const alt = (e.get_state() & Clutter.ModifierType.META_MASK) !== 0;
      const super_ = (e.get_state() & Clutter.ModifierType.SUPER_MASK) !== 0;
      onActivate(app, { control, shift, alt, super_ });
    };
    const activationCallbackId = whole.connect('clicked', activationCallback);
    if (!oldBox.whole) whole.set_child(box);
    whole.set_fill(true, true);
    whole.set_track_hover(true);

    return {
      whole: whole,
      iconBox: iconBox,
      shortcutBox: shortcutBox,
      label: label,
      activationCallback: activationCallback,
      activationCallbackId: activationCallbackId
    };
  };

  return {
    cleanIDs: cleanIDs,
    makeBox: makeBox,
    shellApps: shellApps
  };
})();
