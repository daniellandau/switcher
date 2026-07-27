// Web search mode for the Switcher extension
// Provides: Google search via "g <query>" prefix

import St from 'gi://St';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import { ModeUtils as modeUtils } from './modeUtils.js';

const SEARCH_PREFIX = 'g ';

/* -------------------------------------------------------------------------- */
/* Prefix detection & URL helpers                                              */
/* -------------------------------------------------------------------------- */

function isGoogleSearch(text) {
  return text.toLowerCase().startsWith(SEARCH_PREFIX) &&
         text.trim().length > SEARCH_PREFIX.length;
}

function getQuery(text) {
  return text.substring(SEARCH_PREFIX.length).trim();
}

function buildSearchURL(query) {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

/* -------------------------------------------------------------------------- */
/* Browser focus helpers                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Try to find the default browser's window and bring it to the foreground,
 * switching workspaces if necessary.
 * @returns {boolean} true if a browser window was found and activated
 */
function raiseBrowserWindow() {
  try {
    const appInfo = Gio.AppInfo.get_default_for_uri_scheme('https');
    if (!appInfo) return false;

    const shellApp = Shell.AppSystem.get_default().lookup_app(appInfo.get_id());
    if (!shellApp) return false;

    const windows = shellApp.get_windows();
    if (windows.length === 0) return false;

    const win = windows[0];
    const workspace = win.get_workspace();
    if (workspace) workspace.activate(global.get_current_time());
    Main.activateWindow(win);
    return true;
  } catch (e) {
    log(`Switcher – raiseBrowserWindow failed: ${e}`);
    return false;
  }
}

/**
 * Open the given URL in the default browser and ensure the browser window
 * is brought to the foreground.
 */
function openSearch(query) {
  const url = buildSearchURL(query);
  try {
    const ctx = global.create_app_launch_context(0, -1);
    Gio.AppInfo.launch_default_for_uri(url, ctx);

    // Poll until the browser window appears and focus it
    let attempts = 0;
    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 300, () => {
      attempts++;
      if (raiseBrowserWindow() || attempts > 10) {
        return GLib.SOURCE_REMOVE;
      }
      return GLib.SOURCE_CONTINUE;
    });
  } catch (e) {
    log(`Switcher – Google search failed: ${e}`);
  }
}

/* -------------------------------------------------------------------------- */
/* App shim (makes a search entry look like a Shell app for modeUtils)        */
/* -------------------------------------------------------------------------- */

function makeAppShim() {
  return {
    get_id:               () => 'google-search',
    get_name:             () => 'Google Search',
    get_app_info:         () => null,
    create_icon_texture:  (size) =>
      new St.Icon({
        icon_name:   'web-browser-symbolic',
        icon_size:   size,
        style_class: 'popup-menu-icon',
      }),
  };
}

/* -------------------------------------------------------------------------- */
/* Google search mode object                                                   */
/* -------------------------------------------------------------------------- */

export var Google = (function () {

  let name = () => 'Google';

  /**
   * Returns a single-element array with a search hint entry when the text
   * matches the "g <query>" pattern.  Called from extension.js.
   */
  let apps = (text) => {
    if (!isGoogleSearch(text)) return [];
    const query = getQuery(text);
    if (!query) return [];
    return [{
      app:      { id: 'google-search', query, score: 0, cachedDescription: '' },
      mode:     Google,
      activate: () => openSearch(query),
    }];
  };

  let filter = () => true;

  let description = (app) => `Search Google for: "${app.query}"`;

  let activate = (app) => openSearch(app.query);

  let makeBox = (appObj, index, onActivate, oldBox) => {
    const shim = makeAppShim();
    return modeUtils.makeBox(
      appObj, shim, shim,
      description(appObj.app),
      index, onActivate, oldBox,
    );
  };

  return {
    MAX_NUM_ITEMS: 1,
    name,
    apps,
    filter,
    activate,
    description,
    makeBox,
    cleanIDs:       modeUtils.cleanIDs,
    isGoogleSearch,
    getQuery,
    openSearch,
  };
})();

