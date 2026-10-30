(function () {
  var cards = document.querySelectorAll('.dshft-card');
  var card = cards[0];
  var pluginStyleRules = [];
  var tags = document.querySelectorAll('style');
  for (var t = 0; t < tags.length; t++) {
    var text = tags[t].textContent || '';
    var at = text.indexOf('.dshft-card:focus-visible');
    if (at !== -1) {
      pluginStyleRules.push({
        plugin: tags[t].dataset.plugin || null,
        pluginCss: tags[t].dataset.pluginCss || null,
        snippet: text.slice(at, at + 260)
      });
    }
  }
  var cssomRules = [];
  for (var s = 0; s < document.styleSheets.length; s++) {
    var rules;
    try { rules = document.styleSheets[s].cssRules; } catch (e) { continue; }
    for (var r = 0; r < rules.length; r++) {
      var rule = rules[r];
      if (!rule.selectorText || rule.selectorText.indexOf('.dshft-card:focus-visible') === -1) continue;
      cssomRules.push({
        selector: rule.selectorText,
        outline: rule.style.outline,
        outlineWidth: rule.style.outlineWidth,
        outlineColor: rule.style.outlineColor,
        outlineStyle: rule.style.outlineStyle,
        outlineOffset: rule.style.outlineOffset,
        important: rule.style.getPropertyPriority('outline')
      });
    }
  }
  var tokens = {};
  if (card) {
    ['--dsw-focus-ring-width', '--dsw-focus-ring-color', '--dsw-alias-brand-primary'].forEach(function (name) {
      tokens[name] = getComputedStyle(card).getPropertyValue(name);
    });
  }
  var focusResult = null;
  if (card) {
    card.focus();
    var cs = getComputedStyle(card);
    focusResult = {
      tag: card.tagName,
      activeElementIsCard: document.activeElement === card,
      matchesFocus: card.matches(':focus'),
      matchesFocusVisible: card.matches(':focus-visible'),
      outline: cs.outline,
      outlineWidth: cs.outlineWidth,
      outlineStyle: cs.outlineStyle,
      outlineColor: cs.outlineColor,
      outlineOffset: cs.outlineOffset,
      boxShadow: String(cs.boxShadow).slice(0, 90)
    };
    card.blur();
  }
  var toggle = document.querySelector('.dshft-toggle input');
  return JSON.stringify({
    cardCount: cards.length,
    pluginStyleRules: pluginStyleRules,
    cssomRules: cssomRules,
    tokens: tokens,
    tokensInherited: {
      width: tokens['--dsw-focus-ring-width'] !== '',
      color: tokens['--dsw-focus-ring-color'] !== ''
    },
    focusResult: focusResult,
    togglePresent: !!toggle,
    bodyTheme: document.body.getAttribute('data-dsh-futuristic-theme')
  });
})()
