/*global imports, print */
const ExtensionUtils = imports.misc.extensionUtils;
const Gio = imports.gi.Gio;

function getSettings() {
  const extension = ExtensionUtils.getCurrentExtension();
  const schema = extension.metadata['settings-schema'];
  const GioSSS = Gio.SettingsSchemaSource;
  const schemaDir = extension.dir.get_child('schemas');
  let schemaSource = GioSSS.get_default();
  schemaSource = GioSSS.new_from_directory(schemaDir.get_path(), GioSSS.get_default(), false);

  const schemaObj = schemaSource.lookup(schema, true);
  if (!schemaObj)
    throw new Error('Schema ' + schema + ' could not be found for extension '
                    + extension.metadata.uuid + '. Please check your installation.');
  let settings = new Gio.Settings({ settings_schema: schemaObj });
  return settings;
}
