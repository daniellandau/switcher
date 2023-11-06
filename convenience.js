/*global imports, print */
import Gio from 'gi://Gio';

// This method can be used to import Extension or ExtensionPreferences.
// This is done differently in the GNOME Shell process and in the preferences process.
// Both have the lookupByUUID method, used below.
async function importExtension() {
  if (typeof global === 'undefined') {
    return (await import('resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js')).ExtensionPreferences;
  }
  return (await import('resource:///org/gnome/shell/extensions/extension.js')).Extension;
}

const Extension = await importExtension();

let settings = null;

export function getSettings() {
  if (!settings)  {
    return null;
  }
  return settings;
}

// copied from https://github.com/projecthamster/shell-extension/blob/f1f1d803395bc122db1b877985e1d2462c5215a9/convenience.js#L65
export function initSettings(_settings) {
  settings = _settings;
  if (settings) // for extension
    return;
  // for prefs
  const extension = Extension.lookupByUUID('switcher@landau.fi');
  const schema = extension.metadata['settings-schema'];
  const GioSSS = Gio.SettingsSchemaSource;
  const schemaDir = extension.dir.get_child('schemas');
  let schemaSource = schemaDir.query_exists(null) ?
      GioSSS.new_from_directory(schemaDir.get_path(), GioSSS.get_default(), false) :
      GioSSS.get_default();

  const schemaObj = schemaSource.lookup(schema, true);
  if (!schemaObj)
    throw new Error('Schema ' + schema + ' could not be found for extension '
                    + extension.metadata.uuid + '. Please check your installation.');
  settings = new Gio.Settings({ settings_schema: schemaObj });
  }

export function getJson(key) {
  try {
    return JSON.parse(getSettings().get_string(key));
  } catch (e) {
    log('getJson', e);
    return null;
  }
}

export function setJson(key, value) {
  getSettings().set_string(key, JSON.stringify(value));
}