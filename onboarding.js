const Gio = imports.gi.Gio;
const Lang = imports.lang;
const St = imports.gi.St;
const MessageTray = imports.ui.messageTray;
const Main = imports.ui.main;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

const NEVER_SHOWN          = 0;
const DO_NOT_SHOW_AGAIN    = 1;
const SHOWN_BUT_SHOW_AGAIN = 2;


function showOne() {

  const messages = [
    _("Use Super+w (or another shortcut you configured in settings) to start the switcher. Type space separated searches, use the arrow keys to navigate, and press Space to activate."),
    _("There is a launcher mode too. Use Ctrl+Tab, Ctrl+Space or Ctrl+m to switch modes. If you are looking for an app that is not running, the mode switches automatically."),
    _("There are a number of settings you can tweak to configure how the switcher looks and acts. Go to https://extensions.gnome.org/local/ to access settings."),
    _("You can also click an item with the mouse/touchpad to activate."),
    _("You can use Shift+Enter to bring the activated window to the current workspace."),
  ];

  const settings = Convenience.getSettings();

  let message, settingsKey;

  for (let i = 0; i < messages.length; ++i) {
    settingsKey = 'onboarding-' + (i+1);
    let status = settings.get_uint(settingsKey);
    if (status === NEVER_SHOWN) {
      message = messages[i];
      break;
    }
  }
  if (!message) {
    for (let i = 0; i < messages.length; ++i) {
      settingsKey = 'onboarding-' + (i+1);
      let status = settings.get_uint(settingsKey);
      if (status === SHOWN_BUT_SHOW_AGAIN) {
        message = messages[i];
        break;
      }
    }
  }

  if (!message) {
    return;
  }

  let source = new MessageTray.Source(_("Switcher"),
                                  'swicher-onboarding');
  source.policy = new MessageTray.NotificationPolicy({forceExpanded: true});
  Main.messageTray.add(source);

  let notification = new MessageTray.Notification(source, _("Switcher tip of the day"), message);
  notification.setUrgency(MessageTray.Urgency.LOW);
  notification.setTransient(false);
  notification.setResident(false);

  notification.addAction(_("Okay, got it. Don't show this again"), function () {
    settings.set_uint(settingsKey, DO_NOT_SHOW_AGAIN);
  });

  notification.addAction(_("I want to see this message again later"), function () {
    settings.set_uint(settingsKey, SHOWN_BUT_SHOW_AGAIN);
  });

  notification.connect('activated', function () {
    showOne();
    Main.panel.closeCalendar();
  });

  notification.connect('destroy', function() {});

  source.notify(notification);
}
