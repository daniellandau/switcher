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
const Gettext = imports.gettext;
const Tweener = imports.ui.tweener;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

const keyActivation = Me.imports.keyActivation.KeyActivation;
const switcher = Me.imports.modes.switcher.Switcher;
const launcher = Me.imports.modes.launcher.Launcher;
const util = Me.imports.util;
const onboarding = Me.imports.onboarding;

let container, containers, cursor;

function _showUI(mode, entryText, previousWidth) {
  'use strict';
  if (container)
    return;

  cursor = 0;

  const makeBoxes = function(apps, mode) {
    mode.cleanIDs();
    return apps
      .slice(0, mode.MAX_NUM_ITEMS)
      .map((a, i) => mode.makeBox(a, i, (app) => { cleanUIWithFade(); mode.activate(app); }));
  };

  const fontSize = Convenience.getSettings().get_uint('font-size');
  let boxLayout = new St.BoxLayout({style_class: 'switcher-box-layout'});
  boxLayout.set_style('font-size: ' + fontSize + 'px');
  boxLayout.set_vertical(true);

  const apps = mode.apps();
  let filteredApps = util.filterByText(mode, apps, entryText);

  const debouncedActivateUnique = util.debounce(() => {
    if (filteredApps.length === 1) {
      cleanUIWithFade();
      mode.activate(filteredApps[cursor]);
    }
  }, Convenience.getSettings().get_uint('activate-after-ms'));


  let boxes = makeBoxes(filteredApps, mode);
  util.updateHighlight(boxes, entryText, cursor);

  let entry =
    new St.Entry({style_class: 'switcher-entry'});
  entry.set_text(entryText);
  boxLayout.insert_child_at_index(entry, 0);
  boxes.forEach((box) => boxLayout.insert_child_at_index(box.whole, -1));

  let primaryMonitor = Main.layoutManager.primaryMonitor;
  let allMonitors = Main.layoutManager.monitors;

  containers = allMonitors.map(monitor => {
    let tmpContainer = new St.Bin({reactive: true});
    tmpContainer.set_alignment(St.Align.MIDDLE, St.Align.START);
    tmpContainer.set_width(monitor.width);
    tmpContainer.set_height(monitor.height);
    tmpContainer.set_position(monitor.x, monitor.y);

    Main.uiGroup.add_actor(tmpContainer);
    if (monitor === primaryMonitor) container = tmpContainer;
    return tmpContainer;
  })
  // sort primary last so it gets to the top of the modal stack
    .sort((a, b) => a === primaryMonitor ? 1 : -1);
  if (previousWidth === undefined && Convenience.getSettings().get_boolean('fade-enable')) {
    boxLayout.opacity = 0;
    Tweener.addTween(boxLayout, { opacity: 255, time: .35, transition: 'easeOutQuad'});
  }
  container.add_actor(boxLayout);

  let width =
      boxes.map(box => box.whole.width)
           .reduce((a, b) => Math.max(a, b), 0);
  let shortcutWidth =
      boxes.map(box => box.shortcutBox ? box.shortcutBox.width : 0)
           .reduce((a, b) => Math.max(a, b), 0);
  const maxWidth = Main.layoutManager.primaryMonitor.width * 0.01 *
                   Convenience.getSettings().get_uint('max-width-percentage');
  if (width > maxWidth)
    width = maxWidth;
  if (width < maxWidth/2)
    width = maxWidth/2;

  if (previousWidth && Number(previousWidth) === previousWidth) width = previousWidth;

  boxes.forEach(box => util.fixWidths(box, width, shortcutWidth));
  entry.set_width(width);

  // handle what we can on key press and the rest on key release
  entry.connect('key-press-event', (o, e) => {
    const control = (e.get_state() & Clutter.ModifierType.CONTROL_MASK) !== 0;
    const shift = (e.get_state() & Clutter.ModifierType.SHIFT_MASK) !== 0;
    const symbol = e.get_key_symbol();

    // Exit
    if (symbol === Clutter.KEY_Escape) {
      cleanUIWithFade();
    }
    // Switch mode
    else if (((symbol === Clutter.m) && control) ||
               ((symbol === Clutter.KEY_Tab) && control) ||
               ((symbol === Clutter.KEY_space) && control)) {
      switchMode();

    }
    // Next entry
    else if ((symbol === Clutter.KEY_Down) ||
              (symbol === Clutter.KEY_Tab) ||
              ((symbol === Clutter.n) && control)) {
      cursor = cursor + 1 < boxes.length ? cursor + 1 : 0;
      util.updateHighlight(boxes, o.text, cursor);
    }
    // Previous entry
    else if ((symbol === Clutter.KEY_Up) ||
               ((symbol === Clutter.ISO_Left_Tab) && shift) ||
               ((symbol === Clutter.KEY_Tab) && shift) ||
               ((symbol === Clutter.p) && control)) {
      cursor = cursor > 0 ? cursor - 1 : boxes.length - 1;
      util.updateHighlight(boxes, o.text, cursor);
    }
  });

  entry.connect('key-release-event', (o, e) => {
    const control = (e.get_state() & Clutter.ModifierType.CONTROL_MASK) !== 0;
    const shift = (e.get_state() & Clutter.ModifierType.SHIFT_MASK) !== 0;
    const symbol = e.get_key_symbol();
    let fkeyIndex = keyActivation.getActionKeyTable().indexOf(symbol);

    if (symbol === Clutter.KEY_Escape ||
        ((symbol === Clutter.m) && control) ||
        ((symbol === Clutter.KEY_Tab) && control) ||
        ((symbol === Clutter.KEY_space) && control) ||
        (symbol === Clutter.KEY_Down) ||
        (symbol === Clutter.KEY_Tab) ||
        ((symbol === Clutter.n) && control) ||
        (symbol === Clutter.KEY_Up) ||
        ((symbol === Clutter.ISO_Left_Tab) && shift) ||
        ((symbol === Clutter.KEY_Tab) && shift) ||
        ((symbol === Clutter.p) && control)) {
      // pass, these where handled already in keypress
    }
    // Activate selected entry
    else if ((symbol === Clutter.KEY_Return) ||
             (symbol === Clutter.KEY_KP_Enter) ||
        ((symbol === Clutter.j) && control)) {
      cleanUIWithFade();
      if (filteredApps.length > 0) {
        // If shift pressed and we are in switcher mode, bring the window in our current workspace.
        if(mode.name() === "Switcher" && shift)
          filteredApps[cursor].change_workspace_by_index(global.screen.get_active_workspace_index(), true);
        mode.activate(filteredApps[cursor]);
      }

    }
    // Activate entry by shortcut
    else if (fkeyIndex >= 0 && fkeyIndex < filteredApps.length) {
      cleanUIWithFade();
      mode.activate(filteredApps[fkeyIndex]);
    }
    // Filter text
    else {
      // Delete last character
      if ((symbol === Clutter.h) && control) {
        const entryText = entry.get_clutter_text();
        let textCursor = entryText.get_cursor_position();
        if (textCursor == -1)
          textCursor = o.text.length;
        entryText.delete_text(textCursor - 1, textCursor);
      }

      filteredApps = util.filterByText(mode, apps, o.text);
      if (Convenience.getSettings().get_boolean('activate-immediately') &&
          filteredApps.length === 1 &&
          symbol !== Clutter.Control_L &&
          symbol !== Clutter.Control_R) {
        debouncedActivateUnique();
      }


      const otherMode = mode.name() === "Switcher" ? launcher : switcher;
      const filteredAppsInOtherMode = util.filterByText(otherMode, otherMode.apps(), entry.get_text());

      // switch automatically when we have zero apps, the other mode has some apps, and we are not
      // just releasing control, meaning e.g. that we just tried to switch the mode and this switches
      // it back
      if (filteredApps.length === 0 && filteredAppsInOtherMode.length > 0 && !control) {
        switchMode();
      }

      cleanBoxes();
      boxes = makeBoxes(filteredApps, mode);

      // If there's less boxes then in previous cursor position,
      // set cursor to the last box
      if (cursor + 1 > boxes.length)
        cursor = Math.max(boxes.length - 1, 0);

      util.updateHighlight(boxes, o.text, cursor);
      boxes.forEach((box) => {
        util.fixWidths(box, width, shortcutWidth);
        boxLayout.insert_child_at_index(box.whole, -1);
      });
    }
  });

  containers.forEach (c => {
    Main.pushModal(c, { actionMode: Shell.ActionMode.SYSTEM_MODAL });
    c.connect('button-press-event', cleanUIWithFade);
    c.show();
  });
  global.stage.set_key_focus(entry);

  // In the bottom as a function statement so the variables closed
  // over are defined and so it's hoisted up
  function cleanBoxes() {
    boxes.forEach(box => {
      box.iconBox.get_children().forEach(child => util.destroyParent(child));
      box.iconBox.destroy();
      boxLayout.remove_child(box.whole);
    });
  };

  function switchMode () {
    let previousText = entry.get_text();
    cleanUI();
    debouncedActivateUnique.cancel();
    (mode.name() === "Switcher")
      ? _showUI(launcher, previousText, width)
      : _showUI(switcher, previousText, width);
  };

  // this and the following function contain some of the same copy pasted code
  function cleanUI () {
    cleanBoxes();
    containers.reverse().forEach(c => {
      Main.uiGroup.remove_actor(c);
      Main.popModal(c);
    });
    boxLayout.destroy();
    container = null;
    containers = null;
  };

  function cleanUIWithFade () {
    containers.reverse().forEach(c => {
      try {
        Main.popModal(c);
      } catch (e) {
        print('Switcher got an error', e);
      }
    });


    const cleanRest = function () {
      cleanBoxes();
      containers.reverse().forEach(c => {
        Main.uiGroup.remove_actor(c);
      });
      boxLayout.destroy();
      container = null;
      containers = null;
    };

    if (Convenience.getSettings().get_boolean('fade-enable')) {
      Tweener.addTween(boxLayout, { opacity: 0, time: .35, transition: 'easeOutQuad', onComplete: cleanRest });
    } else {
      cleanRest();
    }
  }
}

function init() {
  Gettext.textdomain("switcher");
  Gettext.bindtextdomain("switcher", Me.path + "/locale");
}

function enable() {
  Main.wm.addKeybinding(
      'show-switcher', Convenience.getSettings(), Meta.KeyBindingFlags.NONE, Shell.ActionMode.NORMAL,
      () => _showUI(switcher, ""));
  Main.wm.addKeybinding(
      'show-launcher', Convenience.getSettings(), Meta.KeyBindingFlags.NONE, Shell.ActionMode.NORMAL,
      () => _showUI(launcher, ""));

  onboarding.showOne();
}

function disable() {
  Main.wm.removeKeybinding('show-switcher');
  Main.wm.removeKeybinding('show-launcher');
}
