/*global imports, print */
const Gtk = imports.gi.Gtk;
const GObject = imports.gi.GObject;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

const Gettext = imports.gettext.domain('switcher');
const _ = Gettext.gettext;
const getOnboardingMessages = Me.imports.onboardingmessages.messages;

const { GLib } = imports.gi;


let entry, settings;

function init() {
  Convenience.initTranslations('switcher');
}


function buildPrefsWidget() {
  let scrollableArea = new Gtk.ScrolledWindow();
  GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
    let window = scrollableArea.get_root();
    window.default_width = 700;
    window.default_height = 900;
  });
  let vWidget = new Gtk.Box();
  vWidget.set_orientation(Gtk.Orientation.VERTICAL);

  // TODO margin

  buildWidgets().forEach(w => vWidget.append(w));
  scrollableArea.set_child(vWidget);
  scrollableArea.set_size_request(800, -1);
  scrollableArea.show();
  return scrollableArea;
}

function buildWidgets() {
  Convenience.initSettings()
  let settings = Convenience.getSettings();

  let shortcutsWidget = new Gtk.Box({ spacing: 20, homogeneous: true });
  let switcherWidget = new Gtk.Box();
  addShortcut(switcherWidget, settings, 'show-switcher', _("Hotkey to activate switcher"));
  shortcutsWidget.prepend(switcherWidget);
  let launcherWidget = new Gtk.Box();
  addShortcut(launcherWidget, settings, 'show-launcher', _("Hotkey to activate launcher (deprecated)"));
  shortcutsWidget.prepend(launcherWidget);

  let changeExplanation = new Gtk.Label({ margin_top: 5 });
  changeExplanation.set_markup(_("Use Ctrl+Tab or Ctrl+Space to switch between switcher and launcher"));
  // changeExplanation.set_alignment(0, 0.5);

  const immediatelyWidgets = buildImmediately(settings);
  const activateByWidgets = buildActivateByKey(settings);

  let behaviourWidget = new Gtk.Box({ spacing: 20, homogeneous: true });
  let matchingWidget = new Gtk.Box();
  addMatching(matchingWidget, settings);
  behaviourWidget.prepend(matchingWidget);
  let orderingWidget = new Gtk.Box();
  addOrdering(orderingWidget, settings);
  behaviourWidget.prepend(orderingWidget);

  let appearanceWidget = new Gtk.Box({ spacing: 20, homogeneous: true });
  let fontSizeWidget = new Gtk.Box();
  addFontSize(fontSizeWidget, settings);
  appearanceWidget.append(fontSizeWidget);
  let iconSizeWidget = new Gtk.Box();
  addIconSize(iconSizeWidget, settings);
  appearanceWidget.append(iconSizeWidget);

  const widthWidgets = buildMaxWidth(settings);

  let workspaceIndicatorWidget = new Gtk.Box();
  addWorkspaceIndicator(workspaceIndicatorWidget, settings);

  let onlyOneWorkSpaceWidget = new Gtk.Box();
  addOnlyOneWorkspace(onlyOneWorkSpaceWidget, settings);

  let fadeEffectWidget = new Gtk.Box();
  addFadeEffect(fadeEffectWidget, settings);

  let activeDisplayWidget = new Gtk.Box();
  addActiveDisplay(activeDisplayWidget, settings);

  let showOriginalsWidget = new Gtk.Box();
  addBoolean(showOriginalsWidget, settings, _("Show original language names"), 'show-original-names');
  let showExecutablesWidget = new Gtk.Box();
  addBoolean(showExecutablesWidget, settings, _("Show executable names"), 'show-executables');

  const onboardingWidgets = buildOnboarding(settings);

  return []
    .concat(shortcutsWidget,
      changeExplanation,
      immediatelyWidgets,
      activateByWidgets,
      behaviourWidget,
      appearanceWidget,
      widthWidgets,
      workspaceIndicatorWidget,
      onlyOneWorkSpaceWidget,
      fadeEffectWidget,
      activeDisplayWidget,
      showOriginalsWidget,
      showExecutablesWidget,
      onboardingWidgets
    )
}

function addShortcut(widget, settings, shortcut, title) {
  widget.append(makeTitle(title));

  let model = new Gtk.ListStore();
  model.set_column_types([GObject.TYPE_INT, GObject.TYPE_INT]);

  const row = model.insert(0);
  let [ok, key, mods] = Gtk.accelerator_parse(settings.get_strv(shortcut)[0]);
  log('mods' + mods + "key" + key);
  model.set(row, [0, 1], [mods, key]);
  const treeViewUi = `
  <?xml version="1.0" encoding="UTF-8"?>
<interface domain="switcher@landau.fi">
  <requires lib="gtk" version="4.0"/>

  <object class="GtkTreeView" id="treeview">
    <child>
      <object class="GtkTreeViewColumn" id="accelcolumn">
        <child>
          <object class="GtkCellRendererAccel" id="accelrenderer"/>
          <attributes>
            <attribute name="editable">1</attribute>
          </attributes>
        </child>
      </object>
    </child>
  </object>
 </interface>
  `;
  
  const builder = new Gtk.Builder();
  builder.add_from_string(treeViewUi, treeViewUi.length);

  let treeView = builder.get_object('treeview');
  treeView.set_model(model);
  log('aoeuaoeu')

  let accelerator = builder.get_object('accelrenderer');
  accelerator.accel_mode = Gtk.CellRendererAccelMode.GTK;
  //  new Gtk.CellRendererAccel({
  //   'editable': true,
  //   'accel-mode': Gtk.CellRendererAccelMode.GTK
  // });

  accelerator.connect('accel-edited', function (r, iter, key, mods) {
    let value = Gtk.accelerator_name(key, mods);
    let [succ, iterator] = model.get_iter_from_string(iter);
    model.set(iterator, [0, 1], [mods, key]);
    if (key != 0) {
      settings.set_strv(shortcut, [value]);
    }
  });

  let column = builder.get_object('accelcolumn');
  column.set_title(_("Key"));
  //new Gtk.TreeViewColumn({ title: _("Key") });
  // column.set_widget(accelerator, false);
  column.add_attribute(accelerator, 'accel-mods', 0);
  column.add_attribute(accelerator, 'accel-key', 1);
  treeView.append_column(column);
  widget.append(treeView);
}

function addMatching(widget, settings) {
  widget.append(makeTitle(_("Pattern matching algorithm")));
  let options = [_("Strict"), _("Fuzzy")];
  let input = new Gtk.ComboBoxText();
  options.forEach(o => input.append_text(o));
  input.set_active(settings.get_uint('matching'));
  input.connect('changed', function () {
    settings.set_uint('matching', input.get_active());
  });
  widget.append(input);
}

function addOrdering(widget, settings) {
  widget.append(makeTitle(_("Ordering criteria")));
  let options = [_("Last focused"), _("Most relevant")];
  let input = new Gtk.ComboBoxText();
  options.forEach(o => input.append_text(o));
  input.set_active(settings.get_uint('ordering'));
  input.connect('changed', function () {
    settings.set_uint('ordering', input.get_active());
  });
  widget.append(input);
}

function buildImmediately(settings) {
  const title = makeTitle(_("Immediate activation"));

  let input;
  let box = new Gtk.Box();
  let label = new Gtk.Label();
  label.set_markup(_("When there is just one result, activate immediately"));
  box.append(label);
  let _switch = new Gtk.Switch({
    active: settings.get_boolean('activate-immediately'),
    halign: Gtk.Align.END
  });
  _switch.connect('notify::active', function (o) {
    settings.set_boolean('activate-immediately', o.active);
    input.set_sensitive(o.active);
  });
  box.append(_switch);

  label = new Gtk.Label();
  label.set_markup(_("Activate immediately this many milliseconds after last keystroke"));
  // label.set_padding(0, 9);

  input = new Gtk.SpinButton({
    adjustment: new Gtk.Adjustment({
      lower: 0,
      upper: 5000,
      step_increment: 100
    })
  });
  input.set_value(settings.get_uint('activate-after-ms'));
  input.connect('value-changed', function (button) {
    settings.set_uint('activate-after-ms', button.get_value_as_int());
  });
  return [title, box, label, input];
}

function addIconSize(widget, settings) {
  widget.append(makeTitle(_("Icon size (px)")));

  let input = new Gtk.SpinButton({
    adjustment: new Gtk.Adjustment({
      lower: 10,
      upper: 64,
      step_increment: 1
    })
  });
  input.set_value(settings.get_uint('icon-size'));
  input.connect('value-changed', function (button) {
    settings.set_uint('icon-size', button.get_value_as_int());
  });
  widget.append(input);
}

function addFontSize(widget, settings) {
  widget.append(makeTitle(_("Font size (px)")));

  let input = new Gtk.SpinButton({
    adjustment: new Gtk.Adjustment({
      lower: 10,
      upper: 64,
      step_increment: 1
    })
  });
  input.set_value(settings.get_uint('font-size'));
  input.connect('value-changed', function (button) {
    settings.set_uint('font-size', button.get_value_as_int());
  });
  widget.append(input);
}

function buildMaxWidth(settings) {
  const title = makeTitle(_("Width (%)"));
  let input = new Gtk.SpinButton({
    adjustment: new Gtk.Adjustment({
      lower: 10,
      upper: 100,
      step_increment: 1
    })
  });
  input.set_value(settings.get_uint('max-width-percentage'));
  input.connect('value-changed', function (button) {
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
  input.connect('changed', function () {
    settings.set_uint('activate-by-key', input.get_active());
  });
  return [title, input];
}

function addBoolean(widget, settings, title, key) {
  widget.append(makeTitle(title));

  let _switch = new Gtk.Switch({
    active: settings.get_boolean(key),
    margin_top: 15,
    halign: Gtk.Align.END
  });
  _switch.connect('notify::active', function (o) {
    settings.set_boolean(key, o.active);
  });
  widget.append(_switch);
}

function addWorkspaceIndicator(widget, settings) {
  addBoolean(widget, settings, _("Show workspace indicators"), 'workspace-indicator');
}

function addOnlyOneWorkspace(widget, settings) {
  addBoolean(widget, settings, _("Show only apps in the current workspace"), 'only-current-workspace');
}

function addFadeEffect(widget, settings) {
  addBoolean(widget, settings, _("Fade Effect"), 'fade-enable');
}

function addActiveDisplay(widget, settings) {
  addBoolean(widget, settings, _("Show Switcher on active display"), 'on-active-display');
}

function buildOnboarding(settings) {
  const title = makeTitle(_("Usage tips"));

  let box = new Gtk.Box();
  let label = new Gtk.Label();
  label.set_markup(_("Never show usage tips"));
  // label.set_alignment(0, 0.5);
  box.append(label);

  let _switch = new Gtk.Switch({
    active: settings.get_boolean('never-show-onboarding'),
    halign: Gtk.Align.END
  });
  _switch.connect('notify::active', function (o) {
    settings.set_boolean('never-show-onboarding', o.active);
  });
  box.append(_switch);

  const showMessages = new Gtk.Button({ label: _("Read all tips") });
  showMessages.set_margin_top(10);
  const popover = new Gtk.Popover(showMessages);
  // popover.set_relative_to(showMessages);
  const vbox = new Gtk.Box();
  vbox.set_margin_start(5);
  vbox.set_margin_end(5);
  vbox.set_margin_bottom(5);
  popover.set_child(vbox);
  showMessages.connect('clicked', function () {
    popover.show_all();
  });

  getOnboardingMessages(_)
    .map((msg, i) => {
      const label = new Gtk.Label();
      label.set_markup((i + 1) + '. ' + msg);
      // label.set_alignment(0, 0.5);
      // label.set_line_wrap(true);
      label.set_margin_top(5);
      label.set_max_width_chars(72);
      return label;
    })
    .forEach(l => vbox.append(l));

  return [title, box, showMessages];
}

function makeTitle(markup) {
  let title = new Gtk.Label({ margin_top: 20, margin_bottom: 5 });

  title.set_markup('<b>' + markup + '</b>');
  //title.set_alignment(0, 0.5);
  return title;
}
