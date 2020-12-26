// Switcher is a Gnome Shell extension allowing quickly switching windows by typing
// Copyright (C) 2015-2019  Daniel Landau
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
const Tweener = imports.tweener.tweener;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

const keyActivation = Me.imports.keyActivation.KeyActivation;
const switcherModule = Me.imports.modes.switcher;
const switcher = switcherModule.Switcher;
const launcher = Me.imports.modes.launcher.Launcher;
const modeUtils = Me.imports.modes.modeUtils.ModeUtils;
const util = Me.imports.util;
const onboarding = Me.imports.onboarding;
window.setTimeout = util.setTimeout;
const promiseModule = Me.imports.promise;

let container,
  containers,
  cursor,
  boxLayout,
  entry,
  keyPress,
  boxes,
  keyRelease,
  previousEntryContent,
  keybindings = [],
  initialHotkeyConsumed,
  currentlyShowingCount;

let onboardingShownThisSession = false;

const enableDebugLog = false;
const enablePerfTracing = false;
let previous = null,
  previousMessage = null;

function leftpad(str, n) {
  return ('                          ' + str).slice(-n);
}
function timeit(msg) {
  if (!enablePerfTracing) return;
  const now = new Date();
  if (previous)
    log(
      `TIMING${leftpad(now - previous, 6)}   ${leftpad(
        previousMessage,
        25
      )} → ${msg}`
    );
  previousMessage = msg;
  previous = now;
}

function _showUI() {
  'use strict';
  if (container) return;
  setTimeout(() => modeUtils.shellApps(true), 100); // force update shell app cache

  const modes = [switcher, launcher];

  previousEntryContent = '';
  initialHotkeyConsumed = false;
  cursor = 0;
  util.reinit();
  boxes = [];
  currentlyShowingCount = 0;
  const updateBoxes = function (filteredApps) {
    modeUtils.cleanIDs();
    const newBoxes = filteredApps
      .slice(0, launcher.MAX_NUM_ITEMS)
      .map((a, i) =>
        a.mode.makeBox(
          a,
          i,
          (app, modifiers) => {
            if (!(app.mode.name() === 'Launcher' && modifiers.control))
              cleanUIWithFade();
            app.mode.activate(app.app);
          },
          boxes.length > i ? boxes[i] : {}
        )
      )
      .filter((x) => x);
    if (newBoxes.length > boxes.length) {
      boxes = newBoxes;
    }
    if (newBoxes.length > currentlyShowingCount) {
      for (let i = currentlyShowingCount; i < newBoxes.length; ++i) {
        newBoxes[i].whole.show();
      }
    }
    if (newBoxes.length < boxes.length) {
      for (let i = newBoxes.length; i < boxes.length; ++i) {
        boxes[i].whole.hide();
      }
    }
    for (let i = 0; i < newBoxes.length; ++i) {
      boxes[i] = newBoxes[i];
    }
    currentlyShowingCount = newBoxes.length;
  };

  const fontSize = Convenience.getSettings().get_uint('font-size');
  boxLayout = new St.BoxLayout({ style_class: 'switcher-box-layout' });
  boxLayout.set_style('font-size: ' + fontSize + 'px');
  boxLayout.set_vertical(true);

  /* use "search-entry" style from overview, combining it with our own */
  entry = new St.Entry({ style_class: 'search-entry switcher-entry' });
  boxLayout.insert_child_at_index(entry, 0);

  let useActiveMonitor = Convenience.getSettings().get_boolean(
    'on-active-display'
  );
  let selectedMonitor = useActiveMonitor
    ? Main.layoutManager.currentMonitor
    : Main.layoutManager.primaryMonitor;
  let allMonitors = Main.layoutManager.monitors;
  const width =
    selectedMonitor.width *
    0.01 *
    Convenience.getSettings().get_uint('max-width-percentage');
  entry.set_width(width);

  containers = allMonitors.map((monitor) => {
    let tmpContainer = new St.Bin({
      reactive: true,
      x_align: St.Align.MIDDLE,
      y_align: St.Align.START
    });
    tmpContainer.set_width(monitor.width);
    tmpContainer.set_height(monitor.height);
    tmpContainer.set_position(monitor.x, monitor.y);

    Main.uiGroup.add_actor(tmpContainer);
    if (monitor === selectedMonitor) container = tmpContainer;
    return tmpContainer;
  });
  Main.layoutManager.addTopChrome(boxLayout);
  boxLayout.x = selectedMonitor.x + (container.width - width) / 2;
  boxLayout.y = selectedMonitor.y;
  timeit('added actor');

  const windows = switcher.apps();
  const windowApps = new Set();
  windows.forEach((window) => {
    const app = Shell.WindowTracker.get_default().get_window_app(window.app);
    windowApps.add(app.get_id());
  });
  const launcherApps = launcher
    .apps()
    .filter((app) => !windowApps.has(app.app.get_id()));
  const apps = [].concat.apply([], [windows, launcherApps]);
  let filteredApps = util.filterByText(apps, '');
  updateBoxes(filteredApps);

  const debouncedActivateUnique = util.debounce(() => {
    if (filteredApps.length === 1) {
      cleanUIWithFade();
      filteredApps[cursor].activate(filteredApps[cursor].app);
    }
  }, Convenience.getSettings().get_uint('activate-after-ms'));

  const rerunFiltersAndUpdate = (o) => {
    filteredApps = util.filterByText(apps, o.text);
    if (
      Convenience.getSettings().get_boolean('activate-immediately') &&
      filteredApps.length === 1
    ) {
      debouncedActivateUnique();
    }

    updateBoxes(filteredApps);
    // If there's less boxes then in previous cursor position,
    // set cursor to the last box
    if (cursor + 1 > currentlyShowingCount)
      cursor = Math.max(currentlyShowingCount - 1, 0);
    util.updateHighlight(boxes, o.text, cursor);
  };

  // handle what we can on key press and the rest on key release
  keyPress = entry.connect('key-press-event', (o, e) => {
    const control = (e.get_state() & Clutter.ModifierType.CONTROL_MASK) !== 0;
    const shift = (e.get_state() & Clutter.ModifierType.SHIFT_MASK) !== 0;
    const symbol = e.get_key_symbol();

    // Exit
    if (symbol === Clutter.KEY_Escape) {
      cleanUIWithFade();
    }
    // Next entry
    else if (
      symbol === Clutter.KEY_Down ||
      symbol === Clutter.KEY_Tab ||
      (symbol === Clutter.KEY_n && control)
    ) {
      cursor = cursor + 1 < currentlyShowingCount ? cursor + 1 : 0;
      util.updateHighlight(boxes, o.text, cursor);
    }
    // Previous entry
    else if (
      symbol === Clutter.KEY_Up ||
      (symbol === Clutter.KEY_ISO_Left_Tab && shift) ||
      (symbol === Clutter.KEY_Tab && shift) ||
      (symbol === Clutter.KEY_p && control)
    ) {
      cursor = cursor > 0 ? cursor - 1 : currentlyShowingCount - 1;
      util.updateHighlight(boxes, o.text, cursor);
    } else if (symbol === Clutter.KEY_w && control) {
      switcherModule.onlyCurrentWorkspaceToggled = !switcherModule.onlyCurrentWorkspaceToggled;
      rerunFiltersAndUpdate(o);
    } else if (symbol === Clutter.KEY_h && control) {
      // Delete last character
      const entryText = entry.get_clutter_text();
      let textCursor = entryText.get_cursor_position();
      if (textCursor == -1) textCursor = o.text.length;
      entryText.delete_text(textCursor - 1, textCursor);
      rerunFiltersAndUpdate(o);
    }
  });

  keyRelease = entry.connect('key-release-event', (o, e) => {
    const entryContent = o.text;
    const control = (e.get_state() & Clutter.ModifierType.CONTROL_MASK) !== 0;
    const shift = (e.get_state() & Clutter.ModifierType.SHIFT_MASK) !== 0;
    const symbol = e.get_key_symbol();
    let fkeyIndex = keyActivation.getActionKeyTable().indexOf(symbol);

    if (
      symbol === Clutter.KEY_Escape ||
      (symbol === Clutter.KEY_m && control) ||
      (symbol === Clutter.KEY_Tab && control) ||
      (symbol === Clutter.KEY_space && control) ||
      symbol === Clutter.KEY_Down ||
      symbol === Clutter.KEY_Tab ||
      (symbol === Clutter.KEY_n && control) ||
      symbol === Clutter.KEY_Up ||
      (symbol === Clutter.KEY_ISO_Left_Tab && shift) ||
      (symbol === Clutter.KEY_Tab && shift) ||
      (symbol === Clutter.KEY_p && control)
    ) {
      // pass, these where handled already in keypress
    }
    // Exit on repeat press
    else if (
      keybindings.includes(
        global.display.get_keybinding_action(e.get_key_code(), e.get_state())
      ) &&
      initialHotkeyConsumed
    ) {
      cleanUIWithFade();
    }
    // Activate selected entry
    else if (
      (symbol === Clutter.KEY_Return ||
        symbol === Clutter.KEY_KP_Enter ||
        (symbol === Clutter.KEY_j && control)) &&
      o.text === previousEntryContent
    ) {
      let needCleanUI = true;
      if (filteredApps.length > 0) {
        const selected = filteredApps[cursor];
        // If shift pressed and we are in switcher mode, bring the window in our current workspace.
        if (selected.mode.name() === 'Switcher' && shift)
          selected.app.change_workspace_by_index(
            util.getCurrentWorkspace(),
            true
          );
        selected.activate(selected.app);
        if (
          selected.mode.name() === 'Launcher' &&
          control &&
          symbol !== Clutter.j
        )
          needCleanUI = false;
      }
      if (needCleanUI) cleanUIWithFade();
    }
    // Activate entry by shortcut
    else if (fkeyIndex >= 0 && fkeyIndex < filteredApps.length) {
      cleanUIWithFade();
      const selected = filteredApps[fkeyIndex];
      selected.activate(selected.app);
    } else if (entryContent === previousEntryContent) {
      // nothing
    }
    // Filter text
    else {
      rerunFiltersAndUpdate(o);
    }

    previousEntryContent = entryContent;
    initialHotkeyConsumed = true;
  });

  containers.forEach((c) => {
    Main.pushModal(c, { actionMode: Shell.ActionMode.SYSTEM_MODAL });
    c.connect('button-press-event', cleanUIWithFade);
    c.show();
  });
  global.stage.set_key_focus(entry);

  // In the bottom as a function statement so the variables closed
  // over are defined and so it's hoisted up
  function cleanBoxes() {
    boxes.forEach(destroyBox);
  }
  function destroyBox(box) {
    box.iconBox.get_children().forEach((child) => util.detachParent(child));
    box.iconBox.destroy();
    boxLayout.remove_child(box.whole);
  }

  // this and the following function contain some of the same copy pasted code
  function cleanUI() {
    switcherModule.onlyCurrentWorkspaceToggled = false;
    cleanBoxes();
    containers.reverse().forEach((c) => {
      Main.uiGroup.remove_actor(c);
      Main.popModal(c);
    });
    boxLayout.destroy();
    container = null;
    containers = null;
  }

  function cleanUIWithFade() {
    switcherModule.onlyCurrentWorkspaceToggled = false;
    containers.reverse().forEach((c) => {
      try {
        Main.popModal(c);
      } catch (e) {
        print('Switcher got an error', e);
      }
    });

    const cleanRest = function () {
      cleanBoxes();
      containers.reverse().forEach((c) => {
        Main.uiGroup.remove_actor(c);
      });
      boxLayout.destroy();
      container = null;
      containers = null;
    };

    if (Convenience.getSettings().get_boolean('fade-enable')) {
      Tweener.addTween(boxLayout, {
        opacity: 0,
        time: 0.35,
        transition: 'easeOutQuad',
        onComplete: cleanRest
      });
    } else {
      cleanRest();
    }
  }
  let i = 0;
  let shortcutWidth = keyActivation.shortcutBoxWidth();

  function showSingleBox() {
    if (i < currentlyShowingCount) {
      const box = boxes[i];
      boxLayout.insert_child_at_index(box.whole, -1);
      util.fixWidths(box, width, shortcutWidth);
      i += 1;
      setTimeout(showSingleBox, 0);
    } else {
      util.updateHighlight(boxes, '', cursor);
    }
  }
  setTimeout(showSingleBox, 0);
}

function init() {
  Gettext.domain('switcher');
  Gettext.bindtextdomain('switcher', Me.path + '/locale');
}

function enable() {
  keybindings.push(
    Main.wm.addKeybinding(
      'show-switcher',
      Convenience.getSettings(),
      Meta.KeyBindingFlags.NONE,
      Shell.ActionMode.NORMAL,
      () => _showUI()
    )
  );
  keybindings.push(
    Main.wm.addKeybinding(
      'show-launcher',
      Convenience.getSettings(),
      Meta.KeyBindingFlags.NONE,
      Shell.ActionMode.NORMAL,
      () => _showUI()
    )
  );

  if (!onboardingShownThisSession) {
    onboardingShownThisSession = true;
    onboarding.showOne();
  }
}

function disable() {
  Main.wm.removeKeybinding('show-switcher');
  Main.wm.removeKeybinding('show-launcher');
}
