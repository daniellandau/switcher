const Gio = imports.gi.Gio;
const GObject = imports.gi.GObject;
const Lang = imports.lang;
const St = imports.gi.St;
const MessageTray = imports.ui.messageTray;
const Main = imports.ui.main;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;
const getMessages = Me.imports.onboardingmessages.messages;

const NEVER_SHOWN          = 0;
const DO_NOT_SHOW_AGAIN    = 1;
const SHOWN_BUT_SHOW_AGAIN = 2;


var MyNotificationPolicy = GObject.registerClass({
}, class MyNotificationPolicy extends MessageTray.NotificationPolicy {
  get enable() {
    return true;
  }

  get enableSound() {
    return true;
  }

  get showBanners() {
    return true;
  }

  get forceExpanded() {
    return true;
  }

  get showInLockScreen() {
    return false;
  }

  get detailsInLockScreen() {
    return false;
  }
});

function showOne() {
  const settings = Convenience.getSettings();
  const messages = getMessages(_);

  if (settings.get_boolean('never-show-onboarding')) {
    return;
  }

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
  source.policy = new MyNotificationPolicy();
  Main.messageTray.add(source);

  let notification = new MessageTray.Notification(source, _("Switcher usage tip"), message);
  notification.setUrgency(MessageTray.Urgency.HIGH);
  notification.setTransient(false);
  notification.setResident(false);

  notification.addAction(_("Never show usage tips"), function () {
    settings.set_uint(settingsKey, DO_NOT_SHOW_AGAIN);
    settings.set_boolean('never-show-onboarding', true);
  });

  notification.addAction(_("Ok"), function () {
    settings.set_uint(settingsKey, DO_NOT_SHOW_AGAIN);
  });

  notification.connect('destroy', function() {
    settings.set_uint(settingsKey, DO_NOT_SHOW_AGAIN);
  });

  source.notify(notification);
}
