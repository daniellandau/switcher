import Clutter from 'gi://Clutter';
// import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import * as Convenience from './convenience.js';

const keyActivationNone         = 0;
const keyActivationFunctionKeys = 1;
const keyActivationNumbers      = 2;
const functionKeySymbols = [
  Clutter.KEY_F1,
  Clutter.KEY_F2,
  Clutter.KEY_F3,
  Clutter.KEY_F4,
  Clutter.KEY_F5,
  Clutter.KEY_F6,
  Clutter.KEY_F7,
  Clutter.KEY_F8,
  Clutter.KEY_F9,
  Clutter.KEY_F10,
  Clutter.KEY_F11,
  Clutter.KEY_F12
];
const numberKeySymbols = {
  indexOf: function(symbol) {
    let normal = [
      Clutter.KEY_1,
      Clutter.KEY_2,
      Clutter.KEY_3,
      Clutter.KEY_4,
      Clutter.KEY_5,
      Clutter.KEY_6,
      Clutter.KEY_7,
      Clutter.KEY_8,
      Clutter.KEY_9,
      Clutter.KEY_0,
    ];

    let numpad = [
      Clutter.KEY_KP_1,
      Clutter.KEY_KP_2,
      Clutter.KEY_KP_3,
      Clutter.KEY_KP_4,
      Clutter.KEY_KP_5,
      Clutter.KEY_KP_6,
      Clutter.KEY_KP_7,
      Clutter.KEY_KP_8,
      Clutter.KEY_KP_9,
      Clutter.KEY_KP_0,
    ];

    return normal.indexOf(symbol) !== -1 ?
      normal.indexOf(symbol) : numpad.indexOf(symbol);
  }
};

export var KeyActivation = (function () {
  var getActivateByKey = function() {
    return Convenience.getSettings().get_uint('activate-by-key');
  };

  var getKeyDesc = function(index) {
    switch (getActivateByKey()) {
    case keyActivationFunctionKeys:
      return index > 12 ? '' : 'F' + index;
    case keyActivationNumbers:
      return index > 10 ? '' : (index % 10).toString();
    default:
      print("getKeyDesc error: " + index);
      return '';
    }
  };

  var getActionKeyTable = function() {
    switch (getActivateByKey()) {
    case keyActivationFunctionKeys:
      return functionKeySymbols;
    case keyActivationNumbers:
      return numberKeySymbols;
    default:
      return [];
    }
  };

  var shortcutBoxWidth = function() {
    const fontSize = Convenience.getSettings().get_uint('font-size');
    switch (getActivateByKey()) {
      case keyActivationFunctionKeys:
        return fontSize * 4;
      case keyActivationNumbers:
        return fontSize * 3;
      default:
        return 0;
    }
  }

  return {
    getKeyDesc: getKeyDesc,
    getActionKeyTable: getActionKeyTable,
    shortcutBoxWidth: shortcutBoxWidth
  };
}());
