/*global imports, print */
const Gtk = imports.gi.Gtk;
const GObject = imports.gi.GObject;

const ExtensionUtils = imports.misc.extensionUtils;
const Convenience = ExtensionUtils.getCurrentExtension().imports.convenience;

const Gettext = imports.gettext.domain('switcher');
const _ = Gettext.gettext;

let entry, settings;

function init() {
  Convenience.initTranslations('switcher');
}

function buildPrefsWidget() {
  let settings = Convenience.getSettings();

  let vWidget = new Gtk.VBox({margin: 10});

  addShortcut(vWidget, settings);
  addImmediately(vWidget, settings);
  addActivateByKey(vWidget, settings);

  let fuzzyWidget = new Gtk.HBox();
  addFuzzy(fuzzyWidget, settings);
  fuzzyWidget.show_all();
  vWidget.add(fuzzyWidget);

  let hWidget = new Gtk.HBox({spacing: 20});

  let fontSizeWidget = new Gtk.VBox();
  addFontSize(fontSizeWidget, settings);
  hWidget.add(fontSizeWidget);

  let iconSizeWidget = new Gtk.VBox();
  addIconSize(iconSizeWidget, settings);
  hWidget.add(iconSizeWidget);

  vWidget.add(hWidget);

  addMaxWidth(vWidget, settings);

  let workspaceWidget = new Gtk.HBox();
  addWorkspace(workspaceWidget, settings);
  vWidget.add(workspaceWidget);

  vWidget.show_all();
  return vWidget;
}

function addShortcut(widget, settings) {
  widget.add(makeTitle(_("Hotkey to activate switcher")));

  let model = new Gtk.ListStore();
  model.set_column_types([GObject.TYPE_INT, GObject.TYPE_INT]);

  const row = model.insert(0);
  let [key, mods] = Gtk.accelerator_parse(settings.get_strv('show-switcher')[0]);
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
      settings.set_strv('show-switcher', [value]);
    }
  });

  let column = new Gtk.TreeViewColumn({title: _("Key")});
  column.pack_start(accelerator, false);
  column.add_attribute(accelerator, 'accel-mods', 0);
  column.add_attribute(accelerator, 'accel-key', 1);
  treeView.append_column(column);
  widget.add(treeView);
}

function addFuzzy(widget, settings) {
  widget.add(makeTitle(_("Fuzzy matching")));

  let _switch = new Gtk.Switch({
    active: settings.get_boolean('fuzzy-matching'),
    margin_top: 15,
    halign: Gtk.Align.END
  });
  _switch.connect('notify::active', function (o) {
    settings.set_boolean('fuzzy-matching', o.active);
    input.set_sensitive(o.active);
  });
  widget.add(_switch);
}

function addImmediately(widget, settings) {
  widget.add(makeTitle(_("Immediate activation")));

  let input;
  let box = new Gtk.HBox();
  let label = new Gtk.Label();
  label.set_markup(_("When there is just one result, activate immediately"));
  label.set_alignment(0, 0.5);
  box.add(label);
  let _switch = new Gtk.Switch({
    active: settings.get_boolean('activate-immediately'),
    halign: Gtk.Align.END
  });
  _switch.connect('notify::active', function (o) {
    settings.set_boolean('activate-immediately', o.active);
    input.set_sensitive(o.active);
  });
  box.add(_switch);
  widget.add(box);
  label = new Gtk.Label();
  label.set_markup(_("Activate immediately this many milliseconds after last keystroke"));
  label.set_alignment(0, 0.5);
  label.set_padding(0, 9);
  widget.add(label);

  input = new Gtk.SpinButton({
    adjustment: new Gtk.Adjustment({
      lower: 0,
      upper: 5000,
      step_increment: 100
    })
  });
  input.set_value(settings.get_uint('activate-after-ms'));
  input.connect('value-changed', function(button) {
    settings.set_uint('activate-after-ms', button.get_value_as_int());
  });
  widget.add(input);
}

function addIconSize(widget, settings) {
  widget.add(makeTitle(_("Icon size (px)")));

  let input = new Gtk.SpinButton({
    adjustment: new Gtk.Adjustment({
      lower: 10,
      upper: 64,
      step_increment: 1
    })
  });
  input.set_value(settings.get_uint('icon-size'));
  input.connect('value-changed', function(button) {
    settings.set_uint('icon-size', button.get_value_as_int());
  });
  widget.add(input);
}

function addFontSize(widget, settings) {
  widget.add(makeTitle(_("Font size (px)")));

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
  widget.add(makeTitle(_("Max width (%)")));
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

function addActivateByKey(widget, settings) {
    widget.add(makeTitle(_("Activate by pressing a key matching the index in the list")));
    let options = [_("Disable"), _("Function keys"), _("Number keys")];
    let input = new Gtk.ComboBoxText();
    options.forEach(o => input.append_text(o));
    input.set_active(settings.get_uint('activate-by-key'));
    input.connect('changed', function() {
        settings.set_uint('activate-by-key', input.get_active());
    });
    widget.add(input);
}

function addWorkspace(widget, settings) {
  widget.add(makeTitle(_("Show workspace indicators")));

  let _switch = new Gtk.Switch({
    active: settings.get_boolean('workspace-indicator'),
    margin_top: 15,
    halign: Gtk.Align.END
  });
  _switch.connect('notify::active', function (o) {
    settings.set_boolean('workspace-indicator', o.active);
  });
  widget.add(_switch);
}

function makeTitle(markup) {
  let title = new Gtk.Label({margin_top: 20, margin_bottom: 5});

  title.set_markup('<b>'+markup+'</b>');
  title.set_alignment(0, 0.5);
  return title;
}
