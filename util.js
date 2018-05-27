const GLib = imports.gi.GLib;
const St = imports.gi.St;
const Clutter = imports.gi.Clutter;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

const matchFuzzy = 1;
const orderByRelevancy = 1;

// from https://github.com/satya164/gjs-helpers
const setTimeout = (f, ms) => {
  return GLib.timeout_add(
    GLib.PRIORITY_DEFAULT,
    ms,
    () => {
      f();

      return false; // Don't repeat
    },
    null
  );
};

const clearTimeout = id => GLib.Source.remove(id);

function debounce(f, ms) {
  let timeoutId = null;
  const debounced = function() {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(f, ms);
  };
  debounced.cancel = function() {
    if (timeoutId) clearTimeout(timeoutId);
  };
  return debounced;
}

function escapeChars(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#]/g, '\\$&');
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
  if (fragment == '') return true;

  fragment = escapeChars(fragment);

  const matching = Convenience.getSettings().get_uint('matching');
  const splitChar = matching == matchFuzzy ? '' : ' ';
  const specialexp = new RegExp(/[-[\]{}()*+?.,\\^$|#]/);
  const regexp = new RegExp(
    fragment.split(splitChar).reduce(function(a, b) {
      // In order to treat special charactes as a whole,
      // we manually identify and concatenate them
      if (b == '\\') return a + b;
      else if (specialexp.test(b) && a.charAt(a.length - 1) == '\\')
        return a.slice(0, a.length - 1) + '[^' + '\\' + b + ']*' + '\\' + b;
      else return a + '[^' + b + ']*' + b;
    }),
    'gi'
  );

  let match;
  let gotMatch = false;
  let score = 0;
  const descriptionLowerCase = mode.description(app).toLowerCase();
  const filteredDescription = escapeChars(
    descriptionLowerCase.slice(
      mode.descriptionNameIndex(app),
      descriptionLowerCase.length
    )
  );
  // go through each match inside description
  while ((match = regexp.exec(filteredDescription))) {
    // A full match at the beginning is the best match
    if (match.index == 0 && match[0].length == fragment.length) {
      score += 100;
    }

    // matches at beginning word boundaries are better than in the middle of words
    const wordPrefixFactor =
      match.index == 0 ||
      (match.index != 0 && filteredDescription.charAt(match.index - 1) == ' ')
        ? 1.2
        : 0.0;

    // matches nearer to the beginning are better than near the end
    const precedenceFactor = 1.0 / (1 + match.index);

    // fuzzyness can cause lots of stuff to match, penalize by match length
    const fuzzynessFactor =
      2.3 * (fragment.length - match[0].length) / match[0].length;

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

let latestHighLightedText = null;

function reinit() {
  latestHighLightedText = null;
}

function updateHighlight(boxes, query, cursor) {
  boxes.forEach(box => {
    box.whole.remove_style_class_name('switcher-highlight');
    box.label.remove_style_pseudo_class('selected');

    const highlightedText = highlightText(box.label.get_text(), query);
    box.label.clutter_text.set_markup(highlightedText);
  });

  if (boxes.length > cursor) {
    boxes[cursor].whole.add_style_class_name('switcher-highlight');
    if (latestHighLightedText !== boxes[cursor].label.text) {
      boxes[cursor].label.add_style_pseudo_class('selected');
    }
    latestHighLightedText = boxes[cursor].label.text;
  }
}

function highlightText(text, query) {
  // Don't apply highlighting if there's no input
  if (query == '') return text.replace(/&/g, '&amp;');

  // Identify substring parts to be highlighted
  const matching = Convenience.getSettings().get_uint('matching');
  let queryExpression = '(';
  let queries = matching == matchFuzzy ? query.split(/ |/) : query.split(' ');
  let queriesLength = queries.length;
  for (let i = 0; i < queriesLength - 1; i++) {
    if (queries[i] != '') {
      queryExpression += escapeChars(queries[i]) + '|';
    }
  }
  queryExpression += escapeChars(queries[queriesLength - 1]) + ')';

  let queryRegExp = new RegExp(queryExpression, 'i');
  let tokenRegExp = new RegExp('^' + queryExpression + '$', 'i');

  // Build resulting string from highlighted and non-highlighted strings
  let result = '';
  let tokens = text.split(queryRegExp);
  let tokensLength = tokens.length;
  for (let i = 0; i < tokensLength; i++) {
    if (tokens[i].match(tokenRegExp)) {
      result +=
        '<u><span underline_color="#4a90d9" foreground="#ffffff">' +
        tokens[i] +
        '</span></u>';
    } else {
      result += tokens[i];
    }
  }

  return result.replace(/&/g, '&amp;');
}

function destroyParent(child) {
  if (child) {
    let parent = child.get_parent();
    if (parent) {
      parent.remove_actor(child);
      parent.destroy();
    }
  }
}

const launcherFilterCache = {};
function filterByText(mode, apps, text) {
  const cacheKey = text + apps.length;
  const get = () => {
    let filteredApps = apps.filter(makeFilter(mode, text));

    // Always preserve focus order before typing
    const ordering = Convenience.getSettings().get_uint('ordering');
    if (ordering == orderByRelevancy && text != '') {
      filteredApps = filteredApps.sort(function(a, b) {
        if (a.score > b.score) return -1;
        if (a.score < b.score) return 1;
        return 0;
      });
    }

    return filteredApps;
  };

  if (mode.name() === 'Switcher') return get();

  const update = () => {
    launcherFilterCache[cacheKey] = get();
  };
  const cachedFiltered = launcherFilterCache[cacheKey];
  if (!!cachedFiltered) {
    setTimeout(update, 500);
    return cachedFiltered;
  }
  update();
  return launcherFilterCache[cacheKey];
}
