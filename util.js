const GLib = imports.gi.GLib;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

const matchFuzzy     = 1;

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

function escapeChars(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#]/g, "\\$&");
}

function makeFilter(mode, text) {
  return function(app) {
    // start from zero, filters can change this up or down
    // and the scores are summed
    app.score = 0;
    return text.split(' ').every(fragment => runFilter(mode, app, fragment));
  };
}

function runFilter(mode, app, fragment) {
  if (fragment == '')
    return true;

  fragment = escapeChars(fragment);

  const matching = Convenience.getSettings().get_uint('matching');
  const splitChar = (matching == matchFuzzy) ? '' : ' ';
  const specialexp = new RegExp(/[-[\]{}()*+?.,\\^$|#]/);
  const regexp = new RegExp(fragment.split(splitChar).reduce(function(a,b) {
      // In order to treat special charactes as a whole,
      // we manually identify and concatenate them
      if (b == '\\')
        return a+b;
      else if (specialexp.test(b) && (a.charAt(a.length - 1) == '\\'))
        return a.slice(0, a.length - 1) + '[^' + '\\' + b + ']*' + '\\' +  b;
      else
        return a + '[^' + b + ']*' + b;
  }), "gi");

  let match;
  let gotMatch = false;
  let score = 0;
  const descriptionLowerCase = mode.description(app).toLowerCase();
  const filteredDescription = escapeChars(descriptionLowerCase
          .slice(mode.descriptionNameIndex(app), descriptionLowerCase.length));
  // go through each match inside description
  while ((match = regexp.exec(filteredDescription))) {

    // A full match at the beginning is the best match
    if ((match.index == 0) && match[0].length == fragment.length) {
      score += 100;
    }

    // matches at beginning word boundaries are better than in the middle of words
    const wordPrefixFactor =
            (match.index == 0 || (match.index != 0) && filteredDescription.charAt(match.index - 1) == " ")
            ? 1.2 : 0.0;

    // matches nearer to the beginning are better than near the end
    const precedenceFactor = 1.0 / (1 + match.index);

    // fuzzyness can cause lots of stuff to match, penalize by match length
    const fuzzynessFactor = 2.3 * (fragment.length - match[0].length) / match[0].length;

    // join factors by summing
    const newscore = precedenceFactor + wordPrefixFactor + fuzzynessFactor;

    score = Math.max(score, newscore);

    gotMatch = true;
  }
  app.score += score;

  return gotMatch;
}

function fixWidths(box, width, shortcutWidth) {
  box.whole.set_width(width);
  box.shortcutBox && box.shortcutBox.set_width(shortcutWidth);
}
