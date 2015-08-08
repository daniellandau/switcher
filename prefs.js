/*global imports, print */
const Gtk = imports.gi.Gtk;

const ExtensionUtils = imports.misc.extensionUtils;
const Convenience = ExtensionUtils.getCurrentExtension().imports.convenience;

let entry, settings;

function init() {}

function buildPrefsWidget() {
  let widget = new Gtk.VBox();
  settings = Convenience.getSettings();
  widget.margin = 10;
  let label = new Gtk.Label({margin_top: 20});
  label.set_markup("<b>Hotkey to activate switcher</b>");
  label.set_alignment(0, 0.5);
  widget.add(label);
  entry = new Gtk.Entry({margin_bottom: 10,
                         margin_top: 5,
                         text: settings.get_strv("show-switcher")[0]});
  entry.connect('changed', _onHotkeyChange);
  widget.add(entry);

  widget.show_all();
  return widget;
}

function _onHotkeyChange() {
  const hotkey = entry.get_text();
  const [key, mods] = Gtk.accelerator_parse(hotkey);

  if (key != 0) {
    let parsedName = Gtk.accelerator_name(key, mods);
    settings.set_strv("show-switcher", [parsedName]);
  }
}
