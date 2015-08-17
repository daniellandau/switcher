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
  const box = new St.BoxLayout({style_class: 'switcher-box'});
  const label = new St.Label({
    style_class: 'switcher-label',
    text: description(app)
  });
  const iconBox = new St.Bin({style_class: 'switcher-icon'});
  const appRef = Shell.WindowTracker.get_default().get_window_app(app);
  iconBox.child = appRef.create_icon_texture(36);
  box.insert_child_at_index(label, 0);
  label.set_x_expand(true);
  box.insert_child_at_index(iconBox, 0);
  return box;
}

function description(app) {
  const appRef = Shell.WindowTracker.get_default().get_window_app(app);
  const appName = appRef.get_name();
  return appName + ' → ' + app.get_title();
}

function updateHighlight(boxes) {
  boxes.forEach(box => box.remove_style_class_name('switcher-highlight'));
  boxes.length > cursor && boxes[cursor].add_style_class_name('switcher-highlight');
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

  // swap the first two, so we can switch quickly back and forth
  if (apps.length >= 2) {
    const tmp = apps[0];
    apps[0] = apps[1];
    apps[1] = tmp;
  }

  let filteredApps = apps;

  let boxes = filteredApps.map(makeBox);
  updateHighlight(boxes);
  const entry = new St.Entry({hint_text: 'type filter'});
  boxLayout.insert_child_at_index(entry, 0);
  boxes.forEach((box) => boxLayout.insert_child_at_index(box, -1));

  container.add_actor(boxLayout);
  Main.uiGroup.add_actor(container);

  let monitor = Main.layoutManager.primaryMonitor;
  container.set_width(monitor.width);
  container.set_height(monitor.height);
  container.set_position(monitor.x, monitor.y);

  let width = boxes.map(text => text.width).reduce((a, b) => Math.max(a, b), 0);
  if (width > monitor.width) width = monitor.width - 20;
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
    } else {
      boxes.forEach(box => boxLayout.remove_child(box));
      filteredApps = apps.filter(makeFilter(o.text));
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
