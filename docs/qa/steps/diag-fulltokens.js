(function () {
  var body = document.body;
  var tokens = {}, bad = [];
  for (var i = 0; i < body.style.length; i++) {
    var name = body.style[i];
    if (name.indexOf('--dsw-') !== 0) continue;
    var value = body.style.getPropertyValue(name);
    tokens[name] = value;
    if (/\[object Object\]|undefined|^null$/i.test(value)) bad.push(name);
  }
  var dbg = window.__dshFuturisticThemes && window.__dshFuturisticThemes.debug ? window.__dshFuturisticThemes.debug() : null;
  return JSON.stringify({
    theme: body.getAttribute('data-dsh-futuristic-theme'),
    effects: body.getAttribute('data-dsh-futuristic-effects'),
    tokenCount: Object.keys(tokens).length,
    tokens: tokens,
    bad: bad,
    host: dbg && dbg.host,
    mono: getComputedStyle(body).fontFamily
  });
})()
