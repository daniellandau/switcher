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

  let shortcutsWidget = new Gtk.HBox({spacing: 20, homogeneous: true});
    let switcherWidget = new Gtk.VBox();
    addShortcut(switcherWidget, settings, 'show-switcher', _("Hotkey to activate switcher"));
    shortcutsWidget.pack_start(switcherWidget, true, true, 0);
    let launcherWidget = new Gtk.VBox();
    addShortcut(launcherWidget, settings, 'show-launcher', _("Hotkey to activate launcher"));
    shortcutsWidget.pack_start(launcherWidget, true, true, 0);
  vWidget.add(shortcutsWidget);

  let changeExplanation = new Gtk.Label({margin_top: 5});
  changeExplanation.set_markup(_("Use Ctrl+Tab or Ctrl+Space to switch between switcher and launcher"));
  changeExplanation.set_alignment(0, 0.5);
  vWidget.add(changeExplanation);

  addImmediately(vWidget, settings);
  addActivateByKey(vWidget, settings);

  let behaviourWidget = new Gtk.HBox({spacing: 20, homogeneous: true});
    let matchingWidget = new Gtk.VBox();
    addMatching(matchingWidget, settings);
    behaviourWidget.pack_start(matchingWidget, true, true, 0);
    let orderingWidget = new Gtk.VBox();
    addOrdering(orderingWidget, settings);
    behaviourWidget.pack_start(orderingWidget, true, true, 0);
  vWidget.add(behaviourWidget);

  let appearanceWidget = new Gtk.HBox({spacing: 20, homogeneous: true});
    let fontSizeWidget = new Gtk.VBox();
    addFontSize(fontSizeWidget, settings);
    appearanceWidget.add(fontSizeWidget);
    let iconSizeWidget = new Gtk.VBox();
    addIconSize(iconSizeWidget, settings);
    appearanceWidget.add(iconSizeWidget);
  vWidget.add(appearanceWidget);

  addMaxWidth(vWidget, settings);

  let workspaceIndicatorWidget = new Gtk.HBox();
    addWorkspaceIndicator(workspaceIndicatorWidget, settings);
  vWidget.add(workspaceIndicatorWidget);

  let onlyOneWorkSpaceWidget = new Gtk.HBox();
  addOnlyONeWorkspace(onlyOneWorkSpaceWidget, settings);
  vWidget.add(onlyOneWorkSpaceWidget);

  let fadeEffectWidget = new Gtk.HBox();
  addFadeEffect(fadeEffectWidget, settings);
  vWidget.add(fadeEffectWidget);

  vWidget.show_all();
  return vWidget;
}

function addShortcut(widget, settings, shortcut, title) {
  widget.add(makeTitle(title));

  let model = new Gtk.ListStore();
  model.set_column_types([GObject.TYPE_INT, GObject.TYPE_INT]);

  const row = model.insert(0);
  let [key, mods] = Gtk.accelerator_parse(settings.get_strv(shortcut)[0]);
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
      settings.set_strv(shortcut, [value]);
    }
  });

  let column = new Gtk.TreeViewColumn({title: _("Key")});
  column.pack_start(accelerator, false);
  column.add_attribute(accelerator, 'accel-mods', 0);
  column.add_attribute(accelerator, 'accel-key', 1);
  treeView.append_column(column);
  widget.add(treeView);
}

function addMatching(widget, settings) {
    widget.add(makeTitle(_("Pattern matching algorithm")));
    let options = [_("Strict"), _("Fuzzy")];
    let input = new Gtk.ComboBoxText();
    options.forEach(o => input.append_text(o));
    input.set_active(settings.get_uint('matching'));
    input.connect('changed', function() {
        settings.set_uint('matching', input.get_active());
    });
    widget.add(input);
}

function addOrdering(widget, settings) {
    widget.add(makeTitle(_("Ordering criteria")));
    let options = [_("Last focused"), _("Most relevant")];
    let input = new Gtk.ComboBoxText();
    options.forEach(o => input.append_text(o));
    input.set_active(settings.get_uint('ordering'));
    input.connect('changed', function() {
        settings.set_uint('ordering', input.get_active());
    });
    widget.add(input);
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

function addWorkspaceIndicator(widget, settings) {
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

function addOnlyONeWorkspace(widget, settings) {
  widget.add(makeTitle(_("Show only apps in the current workspace")));

  let _switch = new Gtk.Switch({
    active: settings.get_boolean('only-current-workspace'),
    margin_top: 15,
    halign: Gtk.Align.END
  });
  _switch.connect('notify::active', function (o) {
    settings.set_boolean('only-current-workspace', o.active);
  });
  widget.add(_switch);
}

function addFadeEffect(widget, settings) {
  widget.add(makeTitle(_("Fade Effect")));

  let _switch = new Gtk.Switch({
    active: settings.get_boolean('fade-enable'),
    margin_top: 15,
    halign: Gtk.Align.END
  });
  _switch.connect('notify::active', function (o) {
    settings.set_boolean('fade-enable', o.active);
  });
  widget.add(_switch);
}

function makeTitle(markup) {
  let title = new Gtk.Label({margin_top: 20, margin_bottom: 5});

  title.set_markup('<b>'+markup+'</b>');
  title.set_alignment(0, 0.5);
  return title;
}
