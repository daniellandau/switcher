const St = imports.gi.St;
const Clutter = imports.gi.Clutter;
const Main = imports.ui.main;
const Shell = imports.gi.Shell;
const Meta = imports.gi.Meta;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

const modeUtils = Me.imports.modes.modeUtils.ModeUtils;

const Launcher = (function () {
  // Limit the number of displayed items
  const MAX_NUM_ITEMS = 10;
  
  var name = function() {
    return "Launcher";
  };

  var apps = function() {
    return modeUtils.shellApps;
  };

  var activate = function(app) {
    app.open_new_window(-1);
  };

  var description = function(app) {
    try {
      return app.get_name().replace(/&/g, "&amp;");
    } catch (e) {
      print(e);
      return 'Could not get name';
    }
  };

  var descriptionNameIndex = function(app) {
    return 0; // Workspace indicators are not used
  };

  var makeBox = function(app, index) {
    return modeUtils.makeBox(app, app, description(app), index);
  };

  return {
    MAX_NUM_ITEMS: MAX_NUM_ITEMS,
    name: name,
    apps: apps, 
    activate: activate, 
    description: description,
    descriptionNameIndex: descriptionNameIndex,
    makeBox: makeBox,
    cleanIDs: modeUtils.cleanIDs,
    destroyParent: modeUtils.destroyParent
  };
}());
