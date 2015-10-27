/*global imports, print */
const Gtk = imports.gi.Gtk;
const GObject = imports.gi.GObject;

const ExtensionUtils = imports.misc.extensionUtils;
const Convenience = ExtensionUtils.getCurrentExtension().imports.convenience;

function init() {}

function buildPrefsWidget() {
  let settings = Convenience.getSettings();

  let widget = new Gtk.VBox();
  widget.margin = 10;

  addShortcut(widget, settings);
  addImmediately(widget, settings);
  addFontSize(widget, settings);
  addMaxWidth(widget, settings);

  widget.show_all();
  return widget;
}

function addShortcut(widget, settings) {
  widget.add(makeTitle("<b>Hotkey to activate switcher</b>"));

  let model = new Gtk.ListStore();
  model.set_column_types([GObject.TYPE_INT, GObject.TYPE_INT]);

  const row = model.insert(0);
  let [key, mods] = Gtk.accelerator_parse(settings.get_strv("show-switcher")[0]);
  model.set(row, [0, 1], [mods, key]);

  let treeView = new Gtk.TreeView({model: model});
  let accelerator = new Gtk.CellRendererAccel({
    'editable': true,
    'accel-mode': Gtk.CellRendererAccelMode.GTK
  });

  accelerator.connect('accel-edited', function(r, iter, key, mods) {
    let value = Gtk.accelerator_name(key, mods);
    let [succ, iterator] = model.get_iter_from_string(iter);
    model.set(iterator, [0, 1], [mods, key]);
    if (key != 0) {
      settings.set_strv("show-switcher", [value]);
    }
  });

  let column = new Gtk.TreeViewColumn({title: 'Key'});
  column.pack_start(accelerator, false);
  column.add_attribute(accelerator, 'accel-mods', 0);
  column.add_attribute(accelerator, 'accel-key', 1);
  treeView.append_column(column);
  widget.add(treeView);
}

function addImmediately(widget, settings) {
  widget.add(makeTitle("<b>Immediate activation</b>"));

  let box = new Gtk.HBox();
  let label = new Gtk.Label();
  label.set_markup("When there is just one result, activate immediately");
  label.set_alignment(0, 0.5);
  box.add(label);
  let _switch = new Gtk.Switch({
    active: settings.get_boolean('activate-immediately')
  });
  _switch.connect('notify::active', function (o) {
    settings.set_boolean('activate-immediately', o.active);
  });
  box.add(_switch);
  widget.add(box);
}

function addFontSize(widget, settings) {
  widget.add(makeTitle("<b>Font size (px)</b>"));

  let input = new Gtk.SpinButton({
    adjustment: new Gtk.Adjustment({
      lower: 10,
      upper: 64,
      step_increment: 1
    })
  });
  input.set_value(settings.get_uint('font-size'));
  input.connect('value-changed', function(button) {
    settings.set_uint('font-size', button.get_value_as_int());
  });
  widget.add(input);
}

function addMaxWidth(widget, settings) {
  widget.add(makeTitle("<b>Max width (%)</b>"));
  let input = new Gtk.SpinButton({
    adjustment: new Gtk.Adjustment({
      lower: 10,
      upper: 100,
      step_increment: 1
    })
  });
  input.set_value(settings.get_uint('max-width-percentage'));
  input.connect('value-changed', function(button) {
    settings.set_uint('max-width-percentage', button.get_value_as_int());
  });
  widget.add(input);
}


function makeTitle(markup) {
  let title = new Gtk.Label({margin_top: 20, margin_bottom: 5});

  title.set_markup(markup);
  title.set_alignment(0, 0.5);
  return title;
}
