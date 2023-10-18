// -*- mode: js; js-indent-level: 2; indent-tabs-mode: nil -*-

/* ------------------------------------------------------------------------- */
'use strict';

/* ------------------------------------------------------------------------- */
// const Gio = imports.gi.Gio;
import Gio from 'gi://Gio';
// const GLib = imports.gi.GLib;
import GLib from 'gi://GLib';


/* ------------------------------------------------------------------------- */
// use RemoteSearch dbus setup and keyfile constants
// const RemoteSearch = imports.ui.remoteSearch;
import * as RemoteSearch from 'resource:///org/gnome/shell/ui/remoteSearch.js';

/* ------------------------------------------------------------------------- */
class GnomeControlCenterError extends Error {}

/* ------------------------------------------------------------------------- */
class SearchProviderConfiguration {
  /* ....................................................................... */
  constructor(desktopId, dbusName, dbusPath, providerApiVersion, autoStart) {
    this.desktopId = desktopId;
    this.dbusName = dbusName;
    this.dbusPath = dbusPath;
    this.providerApiVersion = providerApiVersion;
    this.autoStart = autoStart;
  }
}

let panelAppIDs = [];

/* ------------------------------------------------------------------------- */
export var GnomeControlCenter = class GnomeControlCenter {
  /* ....................................................................... */
  // class constant for dbus time in milliseconds
  /// (it's 2019 and ES does not support basic 'const', terrible)
  get DBUS_PROXY_TIMEOUT() {
    return 800;
  }

  /* ....................................................................... */
  constructor() {
    // "declare" instance variables ... so we know we what we use
    this._providerConfiguration = null;
    this._proxy = null;

    // if successfull loaded search provider configuration then create proxy
    try {
      this._providerConfiguration = this._loadSearchProvider();
      try {
        this._proxy = this._createProxy();
      } catch (error) {
        this._proxy = null;
        log(error.toString());
      }
    } catch (error) {
      log(error.toString());
    }
  }

  /* ....................................................................... */
  get mainApplicationId() {
    if (this._providerConfiguration !== null) {
      return this._providerConfiguration.desktopId;
    } else {
      return '';
    }
  }

  initPanelAppIDs() {
    this._proxy && this._proxy.GetInitialResultSetRemote([], (results, error) => {
      if (error) {
        log('Switcher got an error getting settings panels', String(error));
        return;
      }
      const panelIDs = results[0];
      // get the panel metas with information about panels
      this._proxy.GetResultMetasRemote(panelIDs, combine);
    });

    function combine(results, error) {
      if (error) {
        log(
          'Switcher got an error getting settings panels details',
          String(error)
        );
        return;
      }
      const panelMetas = results[0];
      // get app id names from panel meta information
      panelAppIDs = panelMetas.map((panelMeta) =>
        panelMeta['id'].deep_unpack()
      );
    }
  }
  /* ....................................................................... */
  getPanelAppIDs() {
    return panelAppIDs;
  }

  /* ....................................................................... */
  _getSearchProviderConigurationFilePath() {
    let filePath;
    let dataDirs;
    let errorMessage;

    // get list of data dirs (i.e. /usr/share)
    dataDirs = GLib.get_system_data_dirs();

    // prepent user director ~/.local/share
    dataDirs.unshift(GLib.get_user_data_dir());

    // go over all the data dirs, look for gnome search config file assign it's
    // path to filePath if found. preseed filePath to null so we know later
    // if no path has been found
    filePath = null;
    for (let i = 0; i < dataDirs.length; i++) {
      // build file path for gnome-control search provider
      let possibleFilePath = GLib.build_filenamev([
        dataDirs[i],
        'gnome-shell',
        'search-providers',
        'org.gnome.Settings.search-provider.ini'
      ]);
      // check if the file exists and if so stop the search
      if (GLib.file_test(possibleFilePath, GLib.FileTest.EXISTS) === true) {
        filePath = possibleFilePath;
        break;
      }
    }
    if (filePath === null) {
      errorMessage =
        '' +
        'Could not find Gnome Control center search provider configuration' +
        ' file in any system or user data directories: ' +
        dataDirs.join(' ');
      throw new GnomeControlCenterError(errorMessage);
    }

    return filePath;
  }

  /* ....................................................................... */
  _loadSearchProvider() {
    let configFilePath;
    let keyFile;
    let group;
    let errorMessage;

    let desktopId;
    let dbusName;
    let dbusPath;
    let providerApiVersion;
    let autoStart;

    try {
      // get the configuration file path
      configFilePath = this._getSearchProviderConigurationFilePath();

      try {
        // load key-value-file from passed in configFilePath
        keyFile = new GLib.KeyFile();
        keyFile.load_from_file(configFilePath, 0);

        //  if keyfile has the search providers group section
        group = 'Shell Search Provider';
        if (keyFile.has_group(group) === true) {
          try {
            // get the desktop id for the gnome search provider
            desktopId = keyFile.get_string(group, 'DesktopId');

            // get search provider dbus bus name
            dbusName = keyFile.get_string(group, 'BusName');

            // get search provider dbus object path
            dbusPath = keyFile.get_string(group, 'ObjectPath');

            // get the version for the dbus interface used for search provider
            providerApiVersion = keyFile.get_integer(group, 'Version');

            // get the autostart setting for the dbus services
            // it's possible gnome control center does not have it specified
            // though so we fallback to autoStart set to true
            try {
              autoStart = keyFile.get_boolean(group, 'AutoStart');
            } catch (error) {
              autoStart = true;
            }
          } catch (error) {
            errorMessage =
              '' +
              'Failed to retrive desktop id and DBus configuration from ' +
              "search provider configuation file '%s': %s".format(
                configFilePath,
                error.toString()
              );
            throw GnomeControlCenterError(errorMessage);
          }
        } else {
          errorMessage =
            '' +
            "Loaded search provider configuration file '%s' does not " +
            "contain '%s' configuration group".format(configFilePath, group);
          throw GnomeControlCenterError(errorMessage);
        }
      } catch (error) {
        errorMessage =
          '' +
          "Failed to load search provider configuration file '%s':" +
          ' %s'.format(configFilePath);
        throw GnomeControlCenterError(error);
      }
    } catch (error) {
      // re-throw error from _getSearchProviderConigurationFilePath
      throw error;
    }

    return new SearchProviderConfiguration(
      desktopId,
      dbusName,
      dbusPath,
      providerApiVersion,
      autoStart
    );
  }

  /* ...................................................................... */
  _createProxy() {
    // TODO: need a lot more arror handling

    let proxy;
    let proxyInfo;
    let g_flags;
    let errorMessage;

    // TODO: these were copied from remoteSearch.js, still need to comment
    //       as ti why we are doing this
    g_flags = Gio.DBusProxyFlags.DO_NOT_LOAD_PROPERTIES;
    if (this._providerConfiguration.autoStart === true) {
      g_flags |= Gio.DBusProxyFlags.DO_NOT_AUTO_START_AT_CONSTRUCTION;
    } else {
      g_flags |= Gio.DBusProxyFlags.DO_NOT_AUTO_START;
    }

    // load the dbus interface for the search provider, depending on version
    // at Gnome 3.28 is  SearchProvider2ProxyInfo is used, but technically
    // version 1 is still distributed, so many support it for now
    if (this._providerConfiguration.providerApiVersion >= 2) {
      proxyInfo = RemoteSearch.SearchProvider2ProxyInfo;
    } else {
      proxyInfo = RemoteSearch.SearchProviderProxyInfo;
    }

    // create dbus proxy
    try {
      proxy = new Gio.DBusProxy({
        g_bus_type: Gio.BusType.SESSION,
        g_name: this._providerConfiguration.dbusName,
        g_object_path: this._providerConfiguration.dbusPath,
        g_interface_info: proxyInfo,
        g_interface_name: proxyInfo.name,
        g_flags: g_flags
      });

      // initialize the proxy synchronously (basically blocking). this
      // technically could be a problem if it blocks forever, though we expect
      // the time out to handle it. Asynchronous initialization is conceptually
      // more user friendly by being non-blocking however since switch other
      // code is not currently async (desktop item scanning) this is necessary
      // initialize dbus object with null for Cancelable, which means we can
      // cancel it right now which should be fine since we do non-async calls
      // to the dbus with timeout
      proxy.init(null);
    } catch (error) {
      errorMessage =
        '' +
        'Failed to connect to Gnome Control Search Provider Dbus ' +
        'service: %s'.format(error.toString());
      throw GnomeControlCenterError(errorMessage);
    }

    return proxy;
  }
};
