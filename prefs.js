/*global imports, print */
const Gtk = imports.gi.Gtk;
const GObject = imports.gi.GObject;

const ExtensionUtils = imports.misc.extensionUtils;
var Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

const Gettext = imports.gettext.domain('switcher');
const _ = Gettext.gettext;
const getOnboardingMessages = Me.imports.onboardingmessages.messages;

let entry, settings;

function init() {
  Convenience.initTranslations('switcher');
}

function buildPrefsWidget() {
  let vWidget = new Gtk.VBox({margin: 10});

  buildWidgets().forEach(w => vWidget.add(w));
  vWidget.show_all();
  return vWidget;
}

function buildWidgets() {
  let settings = Convenience.getSettings();

  let shortcutsWidget = new Gtk.HBox({spacing: 20, homogeneous: true});
  let switcherWidget = new Gtk.VBox();
  addShortcut(switcherWidget, settings, 'show-switcher', _("Hotkey to activate switcher"));
  shortcutsWidget.pack_start(switcherWidget, true, true, 0);
  let launcherWidget = new Gtk.VBox();
  addShortcut(launcherWidget, settings, 'show-launcher', _("Hotkey to activate launcher"));
  shortcutsWidget.pack_start(launcherWidget, true, true, 0);

  let changeExplanation = new Gtk.Label({margin_top: 5});
  changeExplanation.set_markup(_("Use Ctrl+Tab or Ctrl+Space to switch between switcher and launcher"));
  changeExplanation.set_alignment(0, 0.5);

  const immediatelyWidgets = buildImmediately(settings);
  const activateByWidgets = buildActivateByKey( settings);

  let behaviourWidget = new Gtk.HBox({spacing: 20, homogeneous: true});
  let matchingWidget = new Gtk.VBox();
  addMatching(matchingWidget, settings);
  behaviourWidget.pack_start(matchingWidget, true, true, 0);
  let orderingWidget = new Gtk.VBox();
  addOrdering(orderingWidget, settings);
  behaviourWidget.pack_start(orderingWidget, true, true, 0);

  let appearanceWidget = new Gtk.HBox({spacing: 20, homogeneous: true});
  let fontSizeWidget = new Gtk.VBox();
  addFontSize(fontSizeWidget, settings);
  appearanceWidget.add(fontSizeWidget);
  let iconSizeWidget = new Gtk.VBox();
  addIconSize(iconSizeWidget, settings);
  appearanceWidget.add(iconSizeWidget);

  const maxWidthWidgets = buildMaxWidth(settings);

  let workspaceIndicatorWidget = new Gtk.HBox();
  addWorkspaceIndicator(workspaceIndicatorWidget, settings);

  let onlyOneWorkSpaceWidget = new Gtk.HBox();
  addOnlyOneWorkspace(onlyOneWorkSpaceWidget, settings);

  let fadeEffectWidget = new Gtk.HBox();
  addFadeEffect(fadeEffectWidget, settings);

  const onboardingWidgets = []; // TODO finish this buildOnboarding(settings);

  return []
    .concat(shortcutsWidget,
            changeExplanation,
            immediatelyWidgets,
            activateByWidgets,
            behaviourWidget,
            appearanceWidget,
            maxWidthWidgets,
            workspaceIndicatorWidget,
            onlyOneWorkSpaceWidget,
            fadeEffectWidget,
            onboardingWidgets
           )
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

function buildImmediately(settings) {
  const title = makeTitle(_("Immediate activation"));

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

  label = new Gtk.Label();
  label.set_markup(_("Activate immediately this many milliseconds after last keystroke"));
  label.set_alignment(0, 0.5);
  label.set_padding(0, 9);

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
  return [title, box, label, input];
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

function buildMaxWidth(settings) {
  const title = makeTitle(_("Max width (%)"));
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
  return [title, input];
}

function buildActivateByKey(settings) {
  const title = makeTitle(_("Activate by pressing a key matching the index in the list"));
  let options = [_("Disable"), _("Function keys"), _("Number keys")];
  let input = new Gtk.ComboBoxText();
  options.forEach(o => input.append_text(o));
  input.set_active(settings.get_uint('activate-by-key'));
  input.connect('changed', function() {
    settings.set_uint('activate-by-key', input.get_active());
  });
  return [title, input];
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

function addOnlyOneWorkspace(widget, settings) {
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

function buildOnboarding(settings) {
  const title = makeTitle(_("Onboarding"));

  let box = new Gtk.HBox();
  let label = new Gtk.Label();
  label.set_markup(_("Never show onboarding messages"));
  label.set_alignment(0, 0.5);
  box.add(label);
  let _switch = new Gtk.Switch({
    active: settings.get_boolean('never-show-onboarding'),
    halign: Gtk.Align.END
  });
  _switch.connect('notify::active', function (o) {
    settings.set_boolean('never-show-onboarding', o.active);
  });
  box.add(_switch);

  // TODO find a better widget to show these
  const messages = getOnboardingMessages(_).map(msg => {
    const label = new Gtk.Label();
    label.set_markup(msg);
    label.set_alignment(0, 0.5);
    return label;
  });
  return [title, box].concat(messages);
}

function makeTitle(markup) {
  let title = new Gtk.Label({margin_top: 20, margin_bottom: 5});

  title.set_markup('<b>'+markup+'</b>');
  title.set_alignment(0, 0.5);
  return title;
}
