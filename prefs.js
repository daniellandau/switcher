/*global imports, print */
import Gtk from 'gi://Gtk';
import GObject from 'gi://GObject';
import * as Convenience from './convenience.js';
import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import * as OnboardingMessages from './onboardingmessages.js';
const getOnboardingMessages = OnboardingMessages.messages;

import Gdk from 'gi://Gdk';
import Adw from 'gi://Adw';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Soup from 'gi://Soup?version=3.0';

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

/* -------------------------------------------------------------------------- */
/* Web Search Preferences                                                      */
/* -------------------------------------------------------------------------- */

const DEFAULT_PROVIDERS_JSON = '[{"keyword":"g","title":"Google","url":"https://www.google.com/search?q={q}","icon":"g.png","enabled":true},{"keyword":"gi","title":"Google Images","url":"https://www.google.com/search?tbm=isch&q={q}","icon":"gi.png","enabled":true},{"keyword":"yt","title":"YouTube","url":"https://www.youtube.com/results?search_query={q}","icon":"yt.png","enabled":true},{"keyword":"so","title":"Stack Overflow","url":"https://stackoverflow.com/search?q={q}","icon":"so.png","enabled":true},{"keyword":"wiki","title":"Wikipedia","url":"https://en.wikipedia.org/w/index.php?search={q}","icon":"wiki.png","enabled":true},{"keyword":"ddg","title":"DuckDuckGo","url":"https://duckduckgo.com/?q={q}","icon":"ddg.png","enabled":true},{"keyword":"gh","title":"GitHub","url":"https://github.com/search?q={q}","icon":"gh.png","enabled":true},{"keyword":"maps","title":"Google Maps","url":"https://www.google.com/maps/search/{q}","icon":"maps.png","enabled":true},{"keyword":"r","title":"Reddit","url":"https://www.reddit.com/search/?q={q}","icon":"r.png","enabled":true},{"keyword":"amz","title":"Amazon","url":"https://www.amazon.com/s?k={q}","icon":"amz.png","enabled":true}]';

function getProvidersFromSettings(settings) {
  try {
    return JSON.parse(settings.get_string('web-search-providers'));
  } catch (e) {
    return JSON.parse(DEFAULT_PROVIDERS_JSON);
  }
}

function saveProviders(settings, providers) {
  settings.set_string('web-search-providers', JSON.stringify(providers));
}

function getIconsDir() {
  return GLib.build_filenamev([GLib.get_user_cache_dir(), 'switcher', 'icons']);
}

function getIconPath(keyword) {
  return GLib.build_filenamev([getIconsDir(), `${keyword}.png`]);
}

function extractDomain(url) {
  const match = url.match(/^https?:\/\/([^\/]+)/);
  if (!match) return null;
  return match[1].replace(/^www\./, '');
}

function fetchFavicon(url, outputPath, callback) {
  try {
    const session = new Soup.Session();
    const message = Soup.Message.new('GET', url);
    session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null, (source, result) => {
      try {
        const bytes = session.send_and_read_finish(result);
        if (message.get_status() === 200 && bytes) {
          const data = bytes.get_data();
          if (data && data.length > 0) {
            const outFile = Gio.File.new_for_path(outputPath);
            const parentDir = outFile.get_parent();
            if (parentDir && !parentDir.query_exists(null)) {
              GLib.mkdir_with_parents(parentDir.get_path(), 0o755);
            }
            outFile.replace_contents(data, null, false,
              Gio.FileCreateFlags.REPLACE_DESTINATION, null);
            if (callback) callback(true);
            return;
          }
        }
        if (callback) callback(false);
      } catch (e) {
        log(`Switcher – favicon fetch failed: ${e}`);
        if (callback) callback(false);
      }
    });
  } catch (e) {
    log(`Switcher – favicon session failed: ${e}`);
    if (callback) callback(false);
  }
}

function fetchFaviconForProvider(provider, callback) {
  const domain = extractDomain(provider.url);
  if (!domain) {
    if (callback) callback(false);
    return;
  }
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  const outputPath = getIconPath(provider.keyword);
  fetchFavicon(faviconUrl, outputPath, callback);
}

function buildWebSearchGroup(settings) {
  const group = new Adw.PreferencesGroup({
    title: _('Web Searches'),
    description: _('Type "<keyword> <query>" to search. Example: "yt funny cats" → YouTube search'),
  });

  /* ── Master toggle ──────────────────────────────────────── */
  const masterBox = new Gtk.Box({ spacing: 10, margin_top: 5, margin_bottom: 10 });
  const masterLabel = new Gtk.Label({
    label: _('Enable Web Searches'),
    hexpand: true,
    xalign: 0,
  });
  masterLabel.add_css_class('heading');
  const masterSwitch = new Gtk.Switch({
    active: settings.get_boolean('web-search-enabled'),
    valign: Gtk.Align.CENTER,
  });
  masterSwitch.connect('notify::active', (sw) => {
    settings.set_boolean('web-search-enabled', sw.active);
    listBox.set_sensitive(sw.active);
    buttonBox.set_sensitive(sw.active);
  });
  masterBox.append(masterLabel);
  masterBox.append(masterSwitch);
  group.add(masterBox);

  /* ── Provider list ──────────────────────────────────────── */
  const scrolled = new Gtk.ScrolledWindow({
    hscrollbar_policy: Gtk.PolicyType.NEVER,
    vscrollbar_policy: Gtk.PolicyType.AUTOMATIC,
    min_content_height: 200,
    max_content_height: 350,
  });

  const listBox = new Gtk.ListBox({
    selection_mode: Gtk.SelectionMode.SINGLE,
    css_classes: ['boxed-list'],
  });
  listBox.set_sensitive(settings.get_boolean('web-search-enabled'));
  scrolled.set_child(listBox);
  group.add(scrolled);

  function rebuildList() {
    // Remove all rows
    let child = listBox.get_first_child();
    while (child) {
      const next = child.get_next_sibling();
      listBox.remove(child);
      child = next;
    }
    const providers = getProvidersFromSettings(settings);
    providers.forEach((provider, idx) => {
      const row = new Gtk.ListBoxRow({ activatable: true });
      const box = new Gtk.Box({ spacing: 10, margin_top: 6, margin_bottom: 6, margin_start: 10, margin_end: 10 });

      // Favicon
      const iconPath = getIconPath(provider.keyword);
      const iconFile = Gio.File.new_for_path(iconPath);
      if (iconFile.query_exists(null)) {
        const icon = new Gtk.Image({
          file: iconPath,
          pixel_size: 20,
        });
        box.append(icon);
      }

      // Keyword
      const kwLabel = new Gtk.Label({
        label: provider.keyword,
        width_chars: 8,
        xalign: 0,
        css_classes: ['monospace'],
      });
      box.append(kwLabel);

      // Title
      const titleLabel = new Gtk.Label({
        label: provider.title,
        hexpand: true,
        xalign: 0,
      });
      box.append(titleLabel);

      // Enabled switch
      const sw = new Gtk.Switch({
        active: provider.enabled,
        valign: Gtk.Align.CENTER,
      });
      sw.connect('notify::active', (toggle) => {
        const provs = getProvidersFromSettings(settings);
        if (provs[idx]) {
          provs[idx].enabled = toggle.active;
          saveProviders(settings, provs);
        }
      });
      box.append(sw);

      row.set_child(box);
      row._providerIndex = idx;
      listBox.append(row);
    });
  }

  rebuildList();

  /* ── Action buttons ─────────────────────────────────────── */
  const buttonBox = new Gtk.Box({ spacing: 8, margin_top: 10, homogeneous: true });
  buttonBox.set_sensitive(settings.get_boolean('web-search-enabled'));

  const addBtn = new Gtk.Button({ label: _('Add') });
  addBtn.add_css_class('suggested-action');
  addBtn.connect('clicked', () => {
    showProviderDialog(null, -1, settings, () => rebuildList());
  });
  buttonBox.append(addBtn);

  const editBtn = new Gtk.Button({ label: _('Edit') });
  // Edit/Delete should be disabled when no row is selected to indicate
  // they are not applicable.
  editBtn.set_sensitive(false);
  editBtn.add_css_class('dim-button');
  editBtn.connect('clicked', () => {
    const row = listBox.get_selected_row();
    if (!row) return;
    const idx = row._providerIndex;
    const providers = getProvidersFromSettings(settings);
    if (providers[idx]) {
      showProviderDialog(providers[idx], idx, settings, () => rebuildList());
    }
  });
  buttonBox.append(editBtn);

  const deleteBtn = new Gtk.Button({ label: _('Delete') });
  deleteBtn.set_sensitive(false);
  deleteBtn.add_css_class('destructive-action');
  deleteBtn.add_css_class('dim-button');
  deleteBtn.connect('clicked', () => {
    const row = listBox.get_selected_row();
    if (!row) return;
    const idx = row._providerIndex;
    const providers = getProvidersFromSettings(settings);
    if (providers[idx]) {
      // Delete the cached favicon
      try {
        const iconPath = getIconPath(providers[idx].keyword);
        const iconFile = Gio.File.new_for_path(iconPath);
        if (iconFile.query_exists(null)) iconFile.delete(null);
      } catch (e) { /* ignore */ }
      providers.splice(idx, 1);
      saveProviders(settings, providers);
      rebuildList();
    }
  });
  buttonBox.append(deleteBtn);

  // Toggle sensitivity of edit/delete based on list selection
  listBox.connect('row-selected', () => {
    const row = listBox.get_selected_row();
    const has = !!row;
    editBtn.set_sensitive(has);
    deleteBtn.set_sensitive(has);
    if (has) {
      editBtn.remove_css_class('dim-button');
      deleteBtn.remove_css_class('dim-button');
    } else {
      editBtn.add_css_class('dim-button');
      deleteBtn.add_css_class('dim-button');
    }
  });

  const resetBtn = new Gtk.Button({ label: _('Reset Defaults') });
  resetBtn.connect('clicked', () => {
    settings.set_string('web-search-providers', DEFAULT_PROVIDERS_JSON);
    rebuildList();
    // Fetch all default favicons
    const providers = getProvidersFromSettings(settings);
    providers.forEach(p => fetchFaviconForProvider(p, () => rebuildList()));
  });
  buttonBox.append(resetBtn);

  group.add(buttonBox);

  // Fetch favicons for any providers that don't have one yet
  const providers = getProvidersFromSettings(settings);
  providers.forEach(p => {
    const iconPath = getIconPath(p.keyword);
    const iconFile = Gio.File.new_for_path(iconPath);
    if (!iconFile.query_exists(null)) {
      fetchFaviconForProvider(p, () => rebuildList());
    }
  });

  return group;
}

function showProviderDialog(provider, index, settings, onSave) {
  const isEdit = provider !== null;
  const win = new Gtk.Window({
    title: isEdit ? _('Edit Search Provider') : _('Add Search Provider'),
    modal: true,
    default_width: 450,
    default_height: 350,
    resizable: false,
  });

  const mainBox = new Gtk.Box({
    orientation: Gtk.Orientation.VERTICAL,
    spacing: 12,
    margin_top: 20,
    margin_bottom: 20,
    margin_start: 20,
    margin_end: 20,
  });

  // Helper text
  const helpLabel = new Gtk.Label({
    label: _('Use {q} in the URL as the placeholder for the search query.\nExample: https://www.google.com/search?q={q}'),
    xalign: 0,
    wrap: true,
    css_classes: ['dim-label'],
  });
  mainBox.append(helpLabel);

  // Title
  const titleBox = new Gtk.Box({ spacing: 10 });
  titleBox.append(new Gtk.Label({ label: _('Title'), width_chars: 12, xalign: 0 }));
  const titleEntry = new Gtk.Entry({ hexpand: true, text: isEdit ? provider.title : '' });
  titleEntry.set_placeholder_text('e.g. YouTube');
  titleBox.append(titleEntry);
  mainBox.append(titleBox);

  // URL
  const urlBox = new Gtk.Box({ spacing: 10 });
  urlBox.append(new Gtk.Label({ label: _('URL'), width_chars: 12, xalign: 0 }));
  const urlEntry = new Gtk.Entry({ hexpand: true, text: isEdit ? provider.url : '' });
  urlEntry.set_placeholder_text('https://example.com/search?q={q}');
  urlBox.append(urlEntry);
  mainBox.append(urlBox);

  // Keyword
  const kwBox = new Gtk.Box({ spacing: 10 });
  kwBox.append(new Gtk.Label({ label: _('Keyword'), width_chars: 12, xalign: 0 }));
  const kwEntry = new Gtk.Entry({ hexpand: true, text: isEdit ? provider.keyword : '' });
  kwEntry.set_placeholder_text('e.g. yt');
  kwBox.append(kwEntry);
  mainBox.append(kwBox);

  // Enabled
  const enabledBox = new Gtk.Box({ spacing: 10 });
  enabledBox.append(new Gtk.Label({ label: _('Enabled'), width_chars: 12, xalign: 0 }));
  const enabledSwitch = new Gtk.Switch({
    active: isEdit ? provider.enabled : true,
    valign: Gtk.Align.CENTER,
  });
  enabledBox.append(enabledSwitch);
  mainBox.append(enabledBox);

  // Status label for favicon fetch
  const statusLabel = new Gtk.Label({ label: '', xalign: 0 });
  mainBox.append(statusLabel);

  // Buttons
  const btnBox = new Gtk.Box({ spacing: 10, halign: Gtk.Align.END, margin_top: 10 });
  const cancelBtn = new Gtk.Button({ label: _('Cancel') });
  cancelBtn.connect('clicked', () => win.close());
  btnBox.append(cancelBtn);

  const saveBtn = new Gtk.Button({ label: _('Save') });
  saveBtn.add_css_class('suggested-action');
  saveBtn.connect('clicked', () => {
    const title = titleEntry.get_text().trim();
    const url = urlEntry.get_text().trim();
    const keyword = kwEntry.get_text().trim().toLowerCase();
    const enabled = enabledSwitch.active;

    if (!title || !url || !keyword) {
      statusLabel.set_markup('<span foreground="red">All fields are required.</span>');
      return;
    }
    if (!url.includes('{q}')) {
      statusLabel.set_markup('<span foreground="red">URL must contain {q} placeholder.</span>');
      return;
    }

    const providers = getProvidersFromSettings(settings);
    // Check for duplicate keyword (skip self when editing)
    const duplicate = providers.find((p, i) => p.keyword === keyword && i !== index);
    if (duplicate) {
      statusLabel.set_markup(`<span foreground="red">Keyword "${keyword}" already exists.</span>`);
      return;
    }

    const newProvider = { keyword, title, url, icon: `${keyword}.png`, enabled };

    if (isEdit) {
      // If keyword changed, delete old favicon
      if (provider.keyword !== keyword) {
        try {
          const oldPath = getIconPath(provider.keyword);
          const oldFile = Gio.File.new_for_path(oldPath);
          if (oldFile.query_exists(null)) oldFile.delete(null);
        } catch (e) { /* ignore */ }
      }
      providers[index] = newProvider;
    } else {
      providers.push(newProvider);
    }
    saveProviders(settings, providers);

    // Fetch favicon
    statusLabel.set_text(_('Fetching favicon…'));
    saveBtn.set_sensitive(false);
    fetchFaviconForProvider(newProvider, (success) => {
      if (onSave) onSave();
      win.close();
    });
  });
  btnBox.append(saveBtn);
  mainBox.append(btnBox);

  win.set_child(mainBox);
  win.present();
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

    // Web Search settings group
    Convenience.initSettings(window._settings);
    const webSearchGroup = buildWebSearchGroup(window._settings);
    page.add(webSearchGroup);

    window.add(page);
    window.set_default_size(850, 1100);
  }
}

