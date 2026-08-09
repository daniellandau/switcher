// Shared web search utilities
// This file must NOT import Gtk/Adw (prefs-only) or St/Shell (extension-only)
// so it can be used from both contexts.

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Soup from 'gi://Soup?version=3.0';

export function getIconsDir() {
  return GLib.build_filenamev([GLib.get_user_cache_dir(), 'switcher', 'icons']);
}

export function getIconPath(keyword) {
  return GLib.build_filenamev([getIconsDir(), `${keyword}.png`]);
}

export function extractDomain(url) {
  const match = url.match(/^https?:\/\/([^\/]+)/);
  if (!match) return null;
  return match[1].replace(/^www\./, '');
}

export function fetchFavicon(url, outputPath, callback) {
  try {
    const session = new Soup.Session();
    const message = Soup.Message.new('GET', url);
    session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null, (source, result) => {
      try {
        const bytes = session.send_and_read_finish(result);
        if (message.get_status() === 200 && bytes) {
          const data = bytes.get_data();
          if (data && data.length > 0) {
            const outFile = Gio.File.new_for_path(outputPath);
            const parentDir = outFile.get_parent();
            if (parentDir && !parentDir.query_exists(null)) {
              GLib.mkdir_with_parents(parentDir.get_path(), 0o755);
            }
            outFile.replace_contents(data, null, false,
              Gio.FileCreateFlags.REPLACE_DESTINATION, null);
            if (callback) callback(true);
            return;
          }
        }
        if (callback) callback(false);
      } catch (e) {
        log(`Switcher – favicon fetch failed: ${e}`);
        if (callback) callback(false);
      }
    });
  } catch (e) {
    log(`Switcher – favicon session failed: ${e}`);
    if (callback) callback(false);
  }
}

export function fetchFaviconForProvider(provider, callback) {
  const domain = extractDomain(provider.url);
  if (!domain) {
    if (callback) callback(false);
    return;
  }
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  const outputPath = getIconPath(provider.keyword);
  fetchFavicon(faviconUrl, outputPath, callback);
}
