/*global imports, print */
const ExtensionUtils = imports.misc.extensionUtils;
const Gio = imports.gi.Gio;
const Gettext = imports.gettext;
const Config = imports.misc.config;

let settings = null;

function getSettings() {
  if (!settings) initSettings();
  return settings;
}

// copied from https://github.com/projecthamster/shell-extension/blob/f1f1d803395bc122db1b877985e1d2462c5215a9/convenience.js#L65
function initSettings() {
  const extension = ExtensionUtils.getCurrentExtension();
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

function getJson(key) {
  try {
    return JSON.parse(getSettings().get_string(key));
  } catch (e) {
    print(e);
    return null;
  }
}

function setJson(key, value) {
  getSettings().set_string(key, JSON.stringify(value));
}

/**
 * initTranslations:
 * @domain: (optional): the gettext domain to use
 *
 * Initialize Gettext to load translations from extensionsdir/locale.
 * If @domain is not provided, it will be taken from metadata['gettext-domain']
 */
function initTranslations(domain) {
    let extension = ExtensionUtils.getCurrentExtension();

    domain = domain || extension.metadata['gettext-domain'];

    // check if this extension was built with "make zip-file", and thus
    // has the locale files in a subfolder
    // otherwise assume that extension has been installed in the
    // same prefix as gnome-shell
    let localeDir = extension.dir.get_child('locale');
    if (localeDir.query_exists(null))
        Gettext.bindtextdomain(domain, localeDir.get_path());
    else
        Gettext.bindtextdomain(domain, Config.LOCALEDIR);
}
