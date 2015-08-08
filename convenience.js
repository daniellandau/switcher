/*global imports, print */
const ExtensionUtils = imports.misc.extensionUtils;
const Gio = imports.gi.Gio;

// copied from https://github.com/projecthamster/shell-extension/blob/f1f1d803395bc122db1b877985e1d2462c5215a9/convenience.js#L65
function getSettings() {
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
  let settings = new Gio.Settings({ settings_schema: schemaObj });
  return settings;
}
