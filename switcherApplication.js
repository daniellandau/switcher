// -*- mode: js; js-indent-level: 4; indent-tabs-mode: nil -*-

/* ------------------------------------------------------------------------- */
"use strict";


/* ------------------------------------------------------------------------- */
class SwitcherApplication {

  /* ....................................................................... */
  constructor(appId, shellApp=null) {
    this._appId = appId;
    this._shellApp = shellApp;
  }

  /* ....................................................................... */
  get appId() {
    return this._appId;
  }

  /* ....................................................................... */
  setShellApp(shellApp) {
    this._shellApp = shellApp
  }

  /* ....................................................................... */
  create_icon_texture(...args) {
    return this._shellApp.create_icon_texture(...args);
  }

  /* ....................................................................... */
  get_id() {
    return this._shellApp.get_id();
  }

  /* ....................................................................... */
  get_name() {
    throw Error("'get_name' is not implemented");
  }

  /* ....................................................................... */
  get_title() {
    throw Error("'get_title' is not implemented");
  }

  /* ....................................................................... */
  open_new_window(...args) {
    return this._shellApp.open_new_window(...args);
  }

  /* ....................................................................... */
  get_workspace() {
    return this._shellApp.get_workspace()
  }

}


/* ------------------------------------------------------------------------- */
var RegularApplication = class RegularApplication extends SwitcherApplication {

  /* ....................................................................... */
  get_name() {
    return this._shellApp.get_name();
  }

  /* ....................................................................... */
  get_title() {
    return this._shellApp.get_title();
  }

}


/* ------------------------------------------------------------------------- */
var GnomeControlApplication = class GnomeControlApplication
  extends SwitcherApplication {

  /* ....................................................................... */
  constructor(appId, mainApplicationName="", shellApp=null) {
    super(appId, shellApp)
    this._mainApplicationName = mainApplicationName;

    if (this._mainApplicationName !== "") {
      this._nameSuffix = " (%s)".format(this._mainApplicationName);
    }
    else {
      this._nameSuffix = "";
    }
  }

  /* ....................................................................... */
  get_name() {
    return this._shellApp.get_name() + this._nameSuffix;
  }

  /* ....................................................................... */
  get_title() {
    // TODO; for X11 try to fish out WM_WINDOW_ROLE xprop to look up
    //       the title
    return this._shellApp.get_title();
  }

}
