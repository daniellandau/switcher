const GLib = imports.gi.GLib;

// from https://github.com/satya164/gjs-helpers
const setTimeout = (f, ms) => {
  return GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, () => {
    f();

    return false; // Don't repeat
  }, null);
};

const clearTimeout = id => GLib.Source.remove(id);

function debounce(f, ms) {
  let timeoutId = null;
  const debounced = function() {
    if (timeoutId)
      clearTimeout(timeoutId);
    timeoutId = setTimeout(f, ms);
  };
  debounced.cancel = function () {
    clearTimeout(timeoutId);
  };
  return debounced;
}
