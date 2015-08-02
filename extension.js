/*global imports, print */
const St = imports.gi.St;
const Clutter = imports.gi.Clutter;
const Main = imports.ui.main;
const Tweener = imports.ui.tweener;
const Shell = imports.gi.Shell;
const Meta = imports.gi.Meta;
const Lang = imports.lang;
const ExtensionUtils = imports.misc.extensionUtils;
const Config = imports.misc.config;
const Gio = imports.gi.Gio;

let boxes, container, filteredApps, width, background;

const ESC = 65307, ENTER = 65293;

function _hideUI() {
  Main.uiGroup.remove_actor(container);
  Main.uiGroup.remove_actor(background);
  boxes = null;
  background = null;
}
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

function makeBox(app) {
  const box = new St.BoxLayout({style_class: 'switcher-box'});
  const label = new St.Label({
    style_class: 'switcher-label',
    text: description(app)
  });
  const iconBox = new St.Bin({style_class: 'switcher-icon'});
  const appRef = Shell.WindowTracker.get_default().get_window_app(app.meta_window);
  iconBox.child = appRef.create_icon_texture(36);
  box.insert_child_at_index(label, 0);
  label.set_x_expand(true);
  box.insert_child_at_index(iconBox, 0);
  return box;
}

function description(app) {
  return app.meta_window.get_wm_class() + ' → ' + app.meta_window.get_title().substring(0, 90);
}

function _showUI() {
  'use strict';
  if (boxes) return;
  container = new St.BoxLayout();
  container.set_vertical(true);
  const apps = global.get_window_actors()
        .filter(w => w.meta_window.get_window_type() == 0);
  filteredApps = apps;
  boxes = apps.map(makeBox);
  const entry = new St.Entry({hint_text: 'type filter'});
  global.stage.set_key_focus(entry);
  entry.connect('key-release-event', (o, e) => {
    const symbol = e.get_key_symbol();
    if (symbol === ESC) _hideUI();
    else if (symbol === ENTER) {
      _hideUI();
      filteredApps[0].meta_window.activate(false);
    } else {
      boxes.forEach(box => container.remove_child(box));
      filteredApps = apps.filter(app => description(app).toLowerCase().indexOf(o.text.toLowerCase()) !== -1);
      boxes = filteredApps.map(makeBox);
      boxes.forEach((box) => {
        box.set_width(width);
        container.insert_child_at_index(box, -1);
      });
    }
  });
  container.insert_child_at_index(entry, 0);
  boxes.forEach((box) => container.insert_child_at_index(box, -1));

  // TODO: make truly modal
  background = new St.Button();
  Main.uiGroup.add_actor(container);
  Main.uiGroup.add_actor(background);


  let monitor = Main.layoutManager.primaryMonitor;
  background.set_width(monitor.width);
  background.set_height(monitor.height);

  width = (boxes.map(text => text.width).reduce((a, b) => Math.max(a, b), 0));
  container.set_position(monitor.x + Math.floor(monitor.width / 2 - width / 2),
                         monitor.y + Math.floor(monitor.height / 2 - (boxes.map(text => text.height).reduce((a, b) => a + b, 0)) / 2));
  boxes.forEach(box => box.set_width(width));
  container.show();
  background.show();

}

function init() {}

function enable() {
  let extension = ExtensionUtils.getCurrentExtension();
  let schema = extension.metadata['settings-schema'];
  const GioSSS = Gio.SettingsSchemaSource;
  let schemaDir = extension.dir.get_child('schemas');
  let schemaSource = GioSSS.get_default();
  schemaSource = GioSSS.new_from_directory(schemaDir.get_path(),
                                           GioSSS.get_default(),
                                           false);

  let schemaObj = schemaSource.lookup(schema, true);
  let settings = new Gio.Settings({ settings_schema: schemaObj });


  Main.wm.addKeybinding(
    'show-switcher',
    settings,
    Meta.KeyBindingFlags.NONE,
    Shell.ActionMode.NORMAL,
    _showUI);
}

function disable() {
  Main.wm.removeKeybinding("show-switcher");
}
