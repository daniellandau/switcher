// Web search mode for the Switcher extension
// Provides: Dynamic web search via "<keyword> <query>" prefix

import St from 'gi://St';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import { ModeUtils as modeUtils } from './modeUtils.js';
import * as Convenience from '../convenience.js';

/* -------------------------------------------------------------------------- */
/* Extension directory                                                         */
/* -------------------------------------------------------------------------- */

let _extensionDir = null;

function getExtensionDir() {
  if (_extensionDir) return _extensionDir;
  // import.meta.url → file:///…/modes/webSearch.js  →  go up one level
  const moduleDir = GLib.path_get_dirname(
    GLib.filename_from_uri(import.meta.url)[0],
  );
  _extensionDir = GLib.path_get_dirname(moduleDir);
  return _extensionDir;
}

function getIconsDir() {
  return GLib.build_filenamev([getExtensionDir(), 'icons']);
}

/* -------------------------------------------------------------------------- */
/* Provider management                                                         */
/* -------------------------------------------------------------------------- */

function getProviders() {
  try {
    const json = Convenience.getSettings().get_string('web-search-providers');
    return JSON.parse(json);
  } catch (e) {
    log(`Switcher – failed to parse web-search-providers: ${e}`);
    return [];
  }
}

function getEnabledProviders() {
  return getProviders().filter(p => p.enabled);
}

function isFeatureEnabled() {
  return Convenience.getSettings().get_boolean('web-search-enabled');
}

/* -------------------------------------------------------------------------- */
/* Prefix detection & URL helpers                                              */
/* -------------------------------------------------------------------------- */

/**
 * Find the matching provider for the given text input.
 * Returns { provider, query } or null.
 */
function matchProvider(text) {
  if (!isFeatureEnabled()) return null;
  const providers = getEnabledProviders();
  const lowerText = text.toLowerCase();

  // Sort by keyword length descending so "gi" matches before "g"
  const sorted = [...providers].sort(
    (a, b) => b.keyword.length - a.keyword.length,
  );

  for (const provider of sorted) {
    const prefix = provider.keyword.toLowerCase() + ' ';
    if (lowerText.startsWith(prefix) && text.trim().length > prefix.length) {
      const query = text.substring(prefix.length).trim();
      if (query) return { provider, query };
    }
  }
  return null;
}

function isWebSearch(text) {
  return matchProvider(text) !== null;
}

function buildSearchURL(provider, query) {
  return provider.url.replace('{q}', encodeURIComponent(query));
}

/* -------------------------------------------------------------------------- */
/* Browser focus helpers                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Try to find the default browser's window and bring it to the foreground,
 * switching workspaces if necessary.
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
function openSearch(provider, query) {
  const url = buildSearchURL(provider, query);
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
    log(`Switcher – web search failed: ${e}`);
  }
}

/* -------------------------------------------------------------------------- */
/* Favicon loading                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Load a cached favicon for a provider.
 * Returns an St.Icon with the favicon, or a fallback icon.
 */
function loadFavicon(provider, size) {
  try {
    const iconPath = GLib.build_filenamev([
      getIconsDir(),
      `${provider.keyword}.png`,
    ]);
    const file = Gio.File.new_for_path(iconPath);
    if (file.query_exists(null)) {
      return new St.Icon({
        gicon: Gio.FileIcon.new(file),
        icon_size: size,
        style_class: 'popup-menu-icon',
      });
    }
  } catch (e) {
    // fall through to fallback
  }
  // No favicon cached – return an empty placeholder (no icon)
  return new St.Icon({
    icon_size: size,
    style_class: 'popup-menu-icon',
  });
}

/* -------------------------------------------------------------------------- */
/* App shim (makes a search entry look like a Shell app for modeUtils)        */
/* -------------------------------------------------------------------------- */

function makeAppShim(provider) {
  return {
    get_id: () => `web-search-${provider.keyword}`,
    get_name: () => provider.title,
    get_app_info: () => null,
    create_icon_texture: (size) => loadFavicon(provider, size),
  };
}

/* -------------------------------------------------------------------------- */
/* WebSearch mode object                                                       */
/* -------------------------------------------------------------------------- */

export var WebSearch = (function () {

  let name = () => 'WebSearch';

  /**
   * Returns a single-element array with a search hint entry when the text
   * matches any "<keyword> <query>" pattern. Called from extension.js.
   */
  let apps = (text) => {
    const match = matchProvider(text);
    if (!match) return [];
    const { provider, query } = match;
    return [{
      app: {
        id: `web-search-${provider.keyword}`,
        query,
        provider,
        score: 0,
        cachedDescription: '',
      },
      mode: WebSearch,
      activate: () => openSearch(provider, query),
    }];
  };

  let filter = () => true;

  let description = (app) =>
    `Search ${app.provider.title} for: "${app.query}"`;

  let activate = (app) => openSearch(app.provider, app.query);

  let makeBox = (appObj, index, onActivate, oldBox) => {
    const shim = makeAppShim(appObj.app.provider);
    const result = modeUtils.makeBox(
      appObj, shim, shim,
      description(appObj.app),
      index, onActivate, oldBox,
    );
    result.isWebSearch = true;
    return result;
  };

  return {
    MAX_NUM_ITEMS: 1,
    name,
    apps,
    filter,
    activate,
    description,
    makeBox,
    cleanIDs: modeUtils.cleanIDs,
    isWebSearch,
    matchProvider,
  };
})();

