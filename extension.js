// Switcher is a Gnome Shell extension allowing quickly switching windows by typing
// Copyright (C) 2015  Daniel Landau
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

/*global imports, print */
const St = imports.gi.St;
const Clutter = imports.gi.Clutter;
const Main = imports.ui.main;
const Shell = imports.gi.Shell;
const Meta = imports.gi.Meta;
const ExtensionUtils = imports.misc.extensionUtils;
const Convenience = ExtensionUtils.getCurrentExtension().imports.convenience;

let container, cursor;
let indexToApp = {};

function makeFilter(text) {
  return function(app) {
    return text.split(" ").every(fragment => description(app).toLowerCase().indexOf(fragment.toLowerCase()) !== -1);
  };
}

function _hideUI() {
  Main.uiGroup.remove_actor(container);
  Main.popModal(container);
  container = null;
}

function makeBox(app) {
  const fontSize = Convenience.getSettings().get_uint('font-size');
  const box = new St.BoxLayout({style_class: 'switcher-box'});
  const shortcut = new St.Label({
    style_class: 'switcher-label',
      text: indexForApp(app) > 0 ? "F" + indexForApp(app) : ""
  });
  shortcut.set_style("font-size: "+fontSize+"px");
  box.insert_child_at_index(shortcut, 0);
  const label = new St.Label({
    style_class: 'switcher-label',
    text: description(app)
  });
  label.set_style("font-size: "+fontSize+"px");
  const iconBox = new St.Bin({style_class: 'switcher-icon'});
  const appRef = Shell.WindowTracker.get_default().get_window_app(app);
  iconBox.child = appRef.create_icon_texture(fontSize);
  box.insert_child_at_index(label, 0);
  label.set_x_expand(true);
  box.insert_child_at_index(iconBox, 0);
  return box;
}

function description(app) {
  const appRef = Shell.WindowTracker.get_default().get_window_app(app);
  try {
    const appName = appRef.get_name();
    return appName + ' → ' + app.get_title();
  } catch (e) {
    print(e);
    return 'Could not get description';
  }
}

function updateHighlight(boxes) {
  boxes.forEach(box => box.remove_style_class_name('switcher-highlight'));
  boxes.length > cursor && boxes[cursor].add_style_class_name('switcher-highlight');
}

function indexForApp(app) {
  for (var index in indexToApp) {
    if (indexToApp[index] === app) {
      return index;
    }
  }
  return null;
}

function _showUI() {
  'use strict';
  if (container) return;
  container = new St.Bin({reactive: true});
  cursor = 0;

  let boxLayout = new St.BoxLayout({style_class: 'switcher-box-layout'});
  container.set_alignment(St.Align.MIDDLE, St.Align.START);
  boxLayout.set_vertical(true);

  // Get all windows in activation order
  const apps = global.display.get_tab_list(Meta.TabList.NORMAL, null);
  // add an index for each app, up to 12.
  for (var i=0;i<12;i++) {
    if (!indexToApp[i+1]) {
      indexToApp[i+1] = apps[i];
    }
  }

  // swap the first two, so we can switch quickly back and forth
  if (apps.length >= 2) {
    const tmp = apps[0];
    apps[0] = apps[1];
    apps[1] = tmp;
  }

  let filteredApps = apps;

  let boxes = filteredApps.map(makeBox);
  updateHighlight(boxes);
  const entry = new St.Entry({style_class: 'switcher-entry', hint_text: 'type filter'});
  boxLayout.insert_child_at_index(entry, 0);
  boxes.forEach((box) => boxLayout.insert_child_at_index(box, -1));

  container.add_actor(boxLayout);
  Main.uiGroup.add_actor(container);

  let monitor = Main.layoutManager.primaryMonitor;
  container.set_width(monitor.width);
  container.set_height(monitor.height);
  container.set_position(monitor.x, monitor.y);

  let width = boxes.map(box => box.width).reduce((a, b) => Math.max(a, b), 0);
  const maxWidth = monitor.width * 0.01 * Convenience.getSettings().get_uint('max-width-percentage');
  if (width > maxWidth) width = maxWidth;
  boxes.forEach(box => box.set_width(width));

  entry.set_width(width);

  entry.connect('key-release-event', (o, e) => {
    const symbol = e.get_key_symbol();
    if (symbol === Clutter.KEY_Escape) _hideUI();
    else if (symbol === Clutter.KEY_Return) {
      _hideUI();
      filteredApps.length > 0 &&
        Main.activateWindow(filteredApps[cursor]);
    } else if (symbol === Clutter.KEY_Down) {
      cursor = cursor + 1 < boxes.length ? cursor + 1 : cursor;
      updateHighlight(boxes);
    } else if (symbol === Clutter.KEY_Up) {
      cursor = cursor > 0 ? cursor - 1 : cursor;
      updateHighlight(boxes);
    } else if (symbol == Clutter.KEY_F1) {
      _hideUI();
      Main.activateWindow(indexToApp[1]);
    } else if (symbol == Clutter.KEY_F2) {
      _hideUI();
      Main.activateWindow(indexToApp[2]);
    } else if (symbol == Clutter.KEY_F3) {
      _hideUI();
      Main.activateWindow(indexToApp[3]);
    } else if (symbol == Clutter.KEY_F4) {
      _hideUI();
      Main.activateWindow(indexToApp[4]);
    } else if (symbol == Clutter.KEY_F5) {
      _hideUI();
      Main.activateWindow(indexToApp[5]);
    } else if (symbol == Clutter.KEY_F6) {
      _hideUI();
      Main.activateWindow(indexToApp[6]);
    } else if (symbol == Clutter.KEY_F7) {
      _hideUI();
      Main.activateWindow(indexToApp[7]);
    } else if (symbol == Clutter.KEY_F8) {
      _hideUI();
      Main.activateWindow(indexToApp[8]);
    } else if (symbol == Clutter.KEY_F9) {
      _hideUI();
      Main.activateWindow(indexToApp[9]);
    } else if (symbol == Clutter.KEY_F10) {
      _hideUI();
      Main.activateWindow(indexToApp[10]);
    } else if (symbol == Clutter.KEY_F11) {
      _hideUI();
      Main.activateWindow(indexToApp[11]);
    } else if (symbol == Clutter.KEY_F12) {
      _hideUI();
      Main.activateWindow(indexToApp[12]);
    } else {
      boxes.forEach(box => boxLayout.remove_child(box));
      filteredApps = apps.filter(makeFilter(o.text));
      if (Convenience.getSettings().get_boolean('activate-immediately') &&
          filteredApps.length === 1) {
        _hideUI();
        Main.activateWindow(filteredApps[cursor]);
      }

      boxes = filteredApps.map(makeBox);
      updateHighlight(boxes);
      boxes.forEach((box) => {
        box.set_width(width);
        boxLayout.insert_child_at_index(box, -1);
      });
    }
  });

  Main.pushModal(container);
  container.connect('button-press-event', _hideUI);
  global.stage.set_key_focus(entry);
  container.show();
}

function init() {}

function enable() {
  Main.wm.addKeybinding(
    'show-switcher',
    Convenience.getSettings(),
    Meta.KeyBindingFlags.NONE,
    // Since Gnome 3.16, Shell.KeyBindingMode is replaced by Shell.ActionMode
    Shell.KeyBindingMode ? Shell.KeyBindingMode.NORMAL : Shell.ActionMode.NORMAL,
    _showUI);
}

function disable() {
  Main.wm.removeKeybinding("show-switcher");
}
