/*global imports, print */
import Gtk from 'gi://Gtk';
import GObject from 'gi://GObject';
import * as Convenience from './convenience.js';
import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import * as OnboardingMessages from './onboardingmessages.js';
const getOnboardingMessages = OnboardingMessages.messages;

import Gdk from 'gi://Gdk';
import Adw from 'gi://Adw';

// let entry, settings;

// function init() {
//   Convenience.initTranslations('switcher');
// }

function buildPrefsWidget() {
  let provider = new Gtk.CssProvider();
  const extension = ExtensionPreferences.lookupByUUID('switcher@landau.fi');
  provider.load_from_path(extension.dir.get_path() + '/prefs.css');
  Gtk.StyleContext.add_provider_for_display(
    Gdk.Display.get_default(),
    provider,
    Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
  );
  let vWidget = new Gtk.Box({ 'css-classes': ['toplevel'] });
  vWidget.set_orientation(Gtk.Orientation.VERTICAL);
  buildWidgets().forEach((w) => vWidget.append(w));
  return vWidget;
}

function buildWidgets() {
  Convenience.initSettings();
  let settings = Convenience.getSettings();

  let switcherShortcutWidget = new Gtk.Box();
  addShortcut(
    switcherShortcutWidget,
    settings,
    'show-switcher',
    _('Hotkey to activate switcher')
  );

  let changeExplanation = new Gtk.Label({ margin_top: 5 });
  changeExplanation.set_markup(
    _(
      'There used to be a separate launcher mode, but now launchable apps are shown in the same view'
    )
  );

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
  const workspaceTip = new Gtk.Label();
  workspaceTip.set_markup(_('Use Ctrl+w to toggle on the fly'));
  workspaceTip.set_xalign(0);

  let fadeEffectWidget = new Gtk.Box();
  addFadeEffect(fadeEffectWidget, settings);

  let activeDisplayWidget = new Gtk.Box();
  addActiveDisplay(activeDisplayWidget, settings);

  let showOriginalsWidget = new Gtk.Box();
  addBoolean(
    showOriginalsWidget,
    settings,
    _('Show original language names'),
    'show-original-names'
  );
  let showExecutablesWidget = new Gtk.Box();
  addBoolean(
    showExecutablesWidget,
    settings,
    _('Show executable names'),
    'show-executables'
  );

  const onboardingWidgets = buildOnboarding(settings);

  return [].concat(
    switcherShortcutWidget,
    changeExplanation,
    immediatelyWidgets,
    activateByWidgets,
    behaviourWidget,
    appearanceWidget,
    widthWidgets,
    workspaceIndicatorWidget,
    onlyOneWorkSpaceWidget,
    workspaceTip,
    fadeEffectWidget,
    activeDisplayWidget,
    showOriginalsWidget,
    showExecutablesWidget,
    onboardingWidgets
  );
}

function addShortcut(widget, settings, shortcut, title) {
  const vBox = new Gtk.Box();
  vBox.set_orientation(Gtk.Orientation.VERTICAL);
  const titleLabel = makeTitle(title);
  titleLabel.set_margin_top(0);
  vBox.append(titleLabel);

  let model = new Gtk.ListStore();
  model.set_column_types([GObject.TYPE_INT, GObject.TYPE_INT]);

  const row = model.insert(0);
  let [ok, key, mods] = Gtk.accelerator_parse(settings.get_strv(shortcut)[0]);
  model.set(row, [0, 1], [mods, key]);
  const treeViewUi = `
  <?xml version="1.0" encoding="UTF-8"?>
<interface domain="switcher@landau.fi">
  <requires lib="gtk" version="4.0"/>

  <object class="GtkTreeView" id="treeview">
    <property name="height-request">80</property>
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
  treeView.set_hexpand(true);

  let accelerator = builder.get_object('accelrenderer');
  accelerator.accel_mode = Gtk.CellRendererAccelMode.GTK;

  accelerator.connect('accel-edited', function (r, iter, key, mods) {
    let value = Gtk.accelerator_name(key, mods);
    let [succ, iterator] = model.get_iter_from_string(iter);
    model.set(iterator, [0, 1], [mods, key]);
    if (key != 0) {
      settings.set_strv(shortcut, [value]);
    }
  });

  let column = builder.get_object('accelcolumn');
  column.set_title(_('Key'));
  column.add_attribute(accelerator, 'accel-mods', 0);
  column.add_attribute(accelerator, 'accel-key', 1);
  vBox.append(treeView);
  widget.append(vBox);
}

function addMatching(widget, settings) {
  widget.append(makeTitle(_('Pattern matching algorithm')));
  let options = [_('Strict'), _('Fuzzy')];
  let input = new Gtk.ComboBoxText();
  input.set_margin_top(10);
  options.forEach((o) => input.append_text(o));
  input.set_active(settings.get_uint('matching'));
  input.connect('changed', function () {
    settings.set_uint('matching', input.get_active());
  });
  widget.append(input);
}

function addOrdering(widget, settings) {
  widget.append(makeTitle(_('Ordering criteria')));
  let options = [_('Last focused'), _('Most relevant')];
  let input = new Gtk.ComboBoxText();
  input.set_margin_top(10);
  options.forEach((o) => input.append_text(o));
  input.set_active(settings.get_uint('ordering'));
  input.connect('changed', function () {
    settings.set_uint('ordering', input.get_active());
  });
  widget.append(input);
}

function buildImmediately(settings) {
  const title = makeTitle(_('Immediate activation'));

  let input;
  let box = new Gtk.Box();
  let label = new Gtk.Label();
  label.set_markup(_('When there is just one result, activate immediately'));
  label.set_hexpand(true);
  label.set_xalign(0);
  label.set_yalign(0.5);
  box.append(label);
  let _switch = new Gtk.Switch({
    active: settings.get_boolean('activate-immediately'),
    margin_top: 15,
    halign: Gtk.Align.END
  });
  _switch.connect('notify::active', function (o) {
    settings.set_boolean('activate-immediately', o.active);
    input.set_sensitive(o.active);
  });
  box.append(_switch);

  label = new Gtk.Label();
  label.set_markup(
    _('Activate immediately this many milliseconds after last keystroke')
  );
  label.set_xalign(0);

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
  widget.append(makeTitle(_('Icon size (px)')));

  let input = new Gtk.SpinButton({
    adjustment: new Gtk.Adjustment({
      lower: 10,
      upper: 64,
      step_increment: 1
    })
  });
  input.set_margin_top(10);
  input.set_value(settings.get_uint('icon-size'));
  input.connect('value-changed', function (button) {
    settings.set_uint('icon-size', button.get_value_as_int());
  });
  widget.append(input);
}

function addFontSize(widget, settings) {
  widget.append(makeTitle(_('Font size (px)')));

  let input = new Gtk.SpinButton({
    adjustment: new Gtk.Adjustment({
      lower: 10,
      upper: 64,
      step_increment: 1
    })
  });
  input.set_margin_top(10);
  input.set_value(settings.get_uint('font-size'));
  input.connect('value-changed', function (button) {
    settings.set_uint('font-size', button.get_value_as_int());
  });
  widget.append(input);
}

function buildMaxWidth(settings) {
  const title = makeTitle(_('Width (%)'));
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
  const title = makeTitle(
    _('Activate by pressing a key matching the index in the list')
  );
  let options = [_('Disable'), _('Function keys'), _('Number keys')];
  let input = new Gtk.ComboBoxText();
  options.forEach((o) => input.append_text(o));
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
  addBoolean(
    widget,
    settings,
    _('Show workspace indicators'),
    'workspace-indicator'
  );
}

function addOnlyOneWorkspace(widget, settings) {
  addBoolean(
    widget,
    settings,
    _('Show only apps in the current workspace'),
    'only-current-workspace'
  );
}

function addFadeEffect(widget, settings) {
  addBoolean(widget, settings, _('Fade Effect'), 'fade-enable');
}

function addActiveDisplay(widget, settings) {
  addBoolean(
    widget,
    settings,
    _('Show Switcher on active display'),
    'on-active-display'
  );
}

function buildOnboarding(settings) {
  const title = makeTitle(_('Usage tips'));

  const showMessages = new Gtk.Button({ label: _('Read all tips') });
  showMessages.set_margin_top(10);
  const popover = new Gtk.Popover(showMessages);
  popover.set_parent(showMessages);
  const vbox = new Gtk.Box();
  vbox.set_orientation(Gtk.Orientation.VERTICAL);
  vbox.set_margin_start(5);
  vbox.set_margin_end(5);
  vbox.set_margin_bottom(5);
  popover.set_child(vbox);
  showMessages.connect('clicked', function () {
    popover.show();
  });

  getOnboardingMessages(_)
    .map((msg, i) => {
      const label = new Gtk.Label();
      label.set_markup(i + 1 + '. ' + msg);
      label.set_xalign(0);
      label.set_yalign(0.5);
      label.set_wrap(true);
      label.set_margin_top(5);
      label.set_max_width_chars(72);
      return label;
    })
    .forEach((l) => vbox.append(l));

  return [title, showMessages];
}

function makeTitle(markup) {
  let title = new Gtk.Label({ margin_top: 20, margin_bottom: 5 });

  title.set_markup('<b>' + markup + '</b>');
  title.set_hexpand(true);
  title.set_xalign(0);
  title.set_yalign(0.5);
  return title;
}

export default class MyExtensionPreferences extends ExtensionPreferences {
  fillPreferencesWindow(window) {
      window._settings = this.getSettings();

      const page = new Adw.PreferencesPage();

      const group = new Adw.PreferencesGroup({
          title: _('Switcher Preferences'),
      });

      const widget = buildPrefsWidget();
      group.add(widget);
      page.add(group);
      window.add(page);
      window.set_default_size(650, 900);
  }
}
