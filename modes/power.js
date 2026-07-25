// Power/session actions mode for the Switcher extension
// Provides: Shutdown, Reboot, Sleep, Hibernate, Log Out, Lock Screen

import St from 'gi://St';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Clutter from 'gi://Clutter';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as ModalDialog from 'resource:///org/gnome/shell/ui/modalDialog.js';

import { ModeUtils as modeUtils } from './modeUtils.js';

/* -------------------------------------------------------------------------- */
/* D-Bus helpers                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Call a D-Bus method synchronously, swallowing errors gracefully.
 *
 * @param {'session'|'system'} bus      Which bus to use
 * @param {string}             name     Well-known bus name
 * @param {string}             path     Object path
 * @param {string}             iface    Interface name
 * @param {string}             method   Method name
 * @param {GLib.Variant|null}  params   Encoded parameters, or null
 */
function callDBus(bus, name, path, iface, method, params) {
  try {
    Gio.DBus[bus].call_sync(
      name, path, iface, method,
      params,          // GLib.Variant or null
      null,            // expected reply type (null = don't check)
      Gio.DBusCallFlags.NONE,
      -1,              // default timeout
      null,            // cancellable
    );
  } catch (e) {
    log(`Switcher – power action "${method}" failed: ${e}`);
  }
}

/* -------------------------------------------------------------------------- */
/* Action definitions                                                          */
/* -------------------------------------------------------------------------- */

const POWER_ACTIONS = [
  {
    id: 'power-shutdown',
    label: 'Shutdown',
    icon: 'system-shutdown-symbolic',
    keywords: 'power off',
    confirm: true,
    run() {
      callDBus(
        'system',
        'org.freedesktop.login1',
        '/org/freedesktop/login1',
        'org.freedesktop.login1.Manager',
        'PowerOff',
        new GLib.Variant('(b)', [true]),
      );
    },
  },
  {
    id: 'power-reboot',
    label: 'Reboot',
    icon: 'system-reboot-symbolic',
    keywords: 'restart',
    confirm: true,
    run() {
      callDBus(
        'system',
        'org.freedesktop.login1',
        '/org/freedesktop/login1',
        'org.freedesktop.login1.Manager',
        'Reboot',
        new GLib.Variant('(b)', [true]),
      );
    },
  },
  {
    id: 'power-sleep',
    label: 'Sleep',
    icon: 'weather-clear-night-symbolic',
    keywords: 'suspend',
    run() {
      callDBus(
        'system',
        'org.freedesktop.login1',
        '/org/freedesktop/login1',
        'org.freedesktop.login1.Manager',
        'Suspend',
        new GLib.Variant('(b)', [true]),
      );
    },
  },
  {
    id: 'power-hibernate',
    label: 'Hibernate',
    icon: 'drive-harddisk-symbolic',
    run() {
      callDBus(
        'system',
        'org.freedesktop.login1',
        '/org/freedesktop/login1',
        'org.freedesktop.login1.Manager',
        'Hibernate',
        new GLib.Variant('(b)', [true]),
      );
    },
  },
  {
    id: 'power-logout',
    label: 'Log Out',
    icon: 'system-log-out-symbolic',
    keywords: 'logout signout session end',
    confirm: true,
    run() {
      callDBus(
        'session',
        'org.gnome.SessionManager',
        '/org/gnome/SessionManager',
        'org.gnome.SessionManager',
        'Logout',
        new GLib.Variant('(u)', [1]),
      );
    },
  },
  {                                                                             
    id: 'power-lock',                                                           
    label: 'Lock Screen',                                                       
    icon: 'changes-prevent-symbolic',                                           
    keywords: 'lock screen',                                                    
    run() {                                                                     
      // Use GNOME Shell's built-in screen shield directly — simplest approach  
      Main.screenShield.lock(true);                                             
    },                                                                          
  },
];

/* -------------------------------------------------------------------------- */
/* Confirmation dialog                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Shows a GNOME ModalDialog asking the user to confirm a destructive power
 * action.  Calls onConfirm() if the user clicks the action button.
 *
 * @param {object}   action     A POWER_ACTIONS entry (must have .label)
 * @param {Function} onConfirm  Called when the user confirms
 */
function showConfirmDialog(action, onConfirm) {
  // Defer to next event-loop tick so the switcher UI's modal grabs are
  // released (via cleanUIWithFade) before we try to push our own modal.
  GLib.timeout_add(GLib.PRIORITY_DEFAULT, 0, () => {
    const dialog = new ModalDialog.ModalDialog({ destroyOnClose: true });

    // Message label
    const label = new St.Label({
      text: `Are you sure you want to ${action.label.toLowerCase()}?`,
      style: 'font-size: 1em; padding: 8px 0;',
    });
    dialog.contentLayout.add_child(label);

    // Buttons: Cancel + confirm action
    dialog.setButtons([
      {
        label: 'Cancel',
        action: () => dialog.close(),
        key: Clutter.KEY_Escape,
      },
      {
        label: action.label,
        action: () => {
          dialog.close();
          onConfirm();
        },
        default: true,
      },
    ]);

    dialog.open();
    return GLib.SOURCE_REMOVE;
  });
}

/* -------------------------------------------------------------------------- */
/* Shim: make a power action look like a GNOME app to modeUtils               */
/* -------------------------------------------------------------------------- */

/**
 * modeUtils.makeBox() expects an object with get_id() and
 * create_icon_texture(). Power actions are not real Shell apps, so we build
 * a minimal compatible shim.
 */
function makeAppShim(action) {
  return {
    get_id: () => action.id,
    get_name: () => action.label,
    get_app_info: () => null,  // returning null is fine; modeUtils handles it
    create_icon_texture: (size) =>
      new St.Icon({
        icon_name: action.icon,
        icon_size: size,
        style_class: 'popup-menu-icon',
      }),
  };
}

/* -------------------------------------------------------------------------- */
/* Power mode object                                                           */
/* -------------------------------------------------------------------------- */

export var Power = (function () {

  let name = () => 'Power';

  /**
   * Returns the list of power action entries in the shape the UI expects:
   *   { app, mode, activate }
   */
  let apps = () =>
    POWER_ACTIONS.map(action => ({
      app: action,
      mode: Power,
      activate: () => activate(action),
    }));

  /** All power actions are always eligible to be shown. */
  let filter = () => true;

  /**
   * The fuzzy filter in util.js matches against this string, so we embed
   * both the display label and the keywords.
   */
  let description = action => action.keywords ? `${action.label} (${action.keywords})` : action.label;

  /** Called by extension.js when an entry is activated. */
  let activate = action => {
    if (action.confirm)
      showConfirmDialog(action, () => action.run());
    else
      action.run();
  };

  /** Builds the visual row for a power action. */
  let makeBox = (appObj, index, onActivate, oldBox) => {
    const action = appObj.app;
    const shim = makeAppShim(action);
    return modeUtils.makeBox(
      appObj,
      shim,                  // "app"    arg — used internally for identity
      shim,                  // "appRef" arg — used for icon + get_id()
      description,           // display Label(keyword)
      index,
      onActivate,
      oldBox,
    );
  };

  return {
    MAX_NUM_ITEMS: POWER_ACTIONS.length,
    name,
    apps,
    filter,
    activate,
    description,
    makeBox,
    cleanIDs: modeUtils.cleanIDs,
  };
})();
