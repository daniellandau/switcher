/*global imports, print */
//const ExtensionUtils = imports.misc.extensionUtils;
//const Gio = imports.gi.Gio;
import Gio from 'gi://Gio';
// const Gettext = imports.gettext;
// import * as Gettext from 'resource:///org/gnome/shell/extensions/extension.js';
// const Config = imports.misc.config;
// import * as Config from 'resource:///org/gnome/shell/misc/config.js';
// import * as Config from 'resource:///org/gnome/Shell/Extensions/js/misc/config.js';

// import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
// import {Extension} from 'resource:///org/gnome/Shell/Extensions/js/extensions/extension.js';

async function importExtension() {
  if (typeof global === 'undefined') {
    // return (await import('resource:///org/gnome/Shell/Extensions/js/extensions/extension.js')).Extension;
    return (await import('resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js')).ExtensionPreferences;
  }
  return (await import('resource:///org/gnome/shell/extensions/extension.js')).Extension;
}

const Extension = await importExtension();

let settings = null;

export function getSettings() {
  if (!settings) initSettings();
  return settings;
}

// copied from https://github.com/projecthamster/shell-extension/blob/f1f1d803395bc122db1b877985e1d2462c5215a9/convenience.js#L65
export function initSettings() {
  const extension = Extension.lookupByUUID('switcher@landau.fi');
  console.log('extension: ' + extension);
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
    print(e);
    return null;
  }
}

export function setJson(key, value) {
  getSettings().set_string(key, JSON.stringify(value));
}

// /**
//  * initTranslations:
//  * @domain: (optional): the gettext domain to use
//  *
//  * Initialize Gettext to load translations from extensionsdir/locale.
//  * If @domain is not provided, it will be taken from metadata['gettext-domain']
//  */
// export function initTranslations(domain) {
//     let extension = ExtensionUtils.getCurrentExtension();

//     domain = domain || extension.metadata['gettext-domain'];

//     // check if this extension was built with "make zip-file", and thus
//     // has the locale files in a subfolder
//     // otherwise assume that extension has been installed in the
//     // same prefix as gnome-shell
//     let localeDir = extension.dir.get_child('locale');
//     if (localeDir.query_exists(null))
//         Gettext.bindtextdomain(domain, localeDir.get_path());
//     else
//         Gettext.bindtextdomain(domain, Config.LOCALEDIR);
// }
