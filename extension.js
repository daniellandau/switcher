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

let boxes, button, container, filteredApps, width, background;

const ESC = 65307, ENTER = 65293;

function _hideUI() {
  Main.uiGroup.remove_actor(container);
  Main.uiGroup.remove_actor(background);
  // global.focus_manager.remove_group(container);
  // Main.layoutManager.modalDialogGroup.remove_actor(container);
  boxes = null;
  background = null;
}
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

function makeBox(app) {
  const box = new St.BoxLayout();
  const label = new St.Label({
    style_class: 'helloworld-label',
    text: description(app)
  });
  const iconBox = new St.Bin({style_class: 'helloworld-label'});
  const appRef = Shell.WindowTracker.get_default().get_window_app(app.meta_window);
  // let icon = new St.Icon({ style_class: 'helloworld-label', icon_name: 'iconBox-missing', icon_size: 24 });

  // let otherLabel = new St.Label({style_class: 'helloworld-label', text: 'foo!'});

  // iconBox.child = icon;
  iconBox.child = appRef.create_icon_texture(36);
  // const button = new St.Bin();
  // button.insert_child_at_index(label, 0);
  // return button;
  box.insert_child_at_index(label, 0);
  label.set_x_expand(true);
  box.insert_child_at_index(iconBox, 0);
  // box.insert_child_at_index(icon, 1);
  // box.insert_child_at_index(otherLabel, 0);
  return box;
}

// function description(w) { return w.meta_window.get_description().replace(/.*\((.*)\)/, "$1"); }
function description(app) { return app.meta_window.get_title().substring(0, 100); }

function _showUI() {
  'use strict';
  if (boxes) return;
  // if (!boxes) {
  // let stage = new Clutter.Stage();
  container = new St.BoxLayout();
  container.set_vertical(true);
  // let apps = global.get_window_actors().map(w =>  w.meta_window.get_wm_class());
  // let apps = global.get_window_actors() .map(w =>  w.meta_window.get_description());
  const apps = global.get_window_actors()
        .filter(w => w.meta_window.get_window_type() == 0);
  filteredApps = apps;
  // print(JSON.stringify(apps));
  // const rand = getRandomInt(0, apps.length);

  // global.get_window_actors()[rand].meta_window.activate(false);
  
  //[0].meta_window.activate(false);
  boxes = apps.map(makeBox);
  const entry = new St.Entry({hint_text: 'type filter'});
  global.stage.set_key_focus(entry);
  // entry.set_reactive(true);
  entry.connect('key-release-event', (o, e) => {
    // print(e);
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

  // Main.layoutManager.modalDialogGroup.add_actor(container);
  // global.focus_manager.add_group(container); // TODO useful?
  // }
  background = new St.Button();
  Main.uiGroup.add_actor(container);
  Main.uiGroup.add_actor(background);


  let monitor = Main.layoutManager.primaryMonitor;
  background.set_width(monitor.width);
  background.set_height(monitor.height);
  // background.set_background_color(new Clutter.Color({
  //   red : 100,
  //   blue : 100,
  //   green : 100,
  //   alpha : 120
  // }));

  width = (boxes.map(text => text.width).reduce((a, b) => Math.max(a, b), 0));
  container.set_position(monitor.x + Math.floor(monitor.width / 2 - width / 2),
                         monitor.y + Math.floor(monitor.height / 2 - (boxes.map(text => text.height).reduce((a, b) => a + b, 0)) / 2));
   boxes.forEach(box => box.set_width(width));
  container.show();
  background.show();

  // background.connect('clicked', () => print('foo'));

  // Tweener.addTween(container,
  //                  { opacity: 0,
  //                    time: 5,
  //                    transition: 'easeOutQuad',
  //                    onComplete: _hideUI });
}

function init() {
    button = new St.Bin({ style_class: 'panel-button',
                          reactive: true,
                          can_focus: true,
                          x_fill: true,
                          y_fill: false,
                          track_hover: true });
    let iconBox = new St.Icon({ icon_name: 'system-run-symbolic',
                             style_class: 'system-status-iconBox' });

    button.set_child(iconBox);
    button.connect('button-press-event', _showUI);
}

function enable() {
  Main.panel._rightBox.insert_child_at_index(button, 0);
  let extension = ExtensionUtils.getCurrentExtension();
  let schema = extension.metadata['settings-schema'];
  const GioSSS = Gio.SettingsSchemaSource;
  let schemaDir = extension.dir.get_child('schemas');
  let schemaSource = GioSSS.get_default();
  schemaSource = GioSSS.new_from_directory(schemaDir.get_path(),
                                           GioSSS.get_default(),
                                           false);

  let schemaObj = schemaSource.lookup(schema, true);
  // print(schemaObj);
  let settings = new Gio.Settings({ settings_schema: schemaObj });
  // print(settings);


  Main.wm.addKeybinding(
    'show-switcher',
    settings,
    Meta.KeyBindingFlags.NONE,
    Shell.KeyBindingMode ? Shell.KeyBindingMode.ALL : Shell.ActionMode.ALL,
    _showUI);
}

function disable() {
    Main.panel._rightBox.remove_child(button);
}
