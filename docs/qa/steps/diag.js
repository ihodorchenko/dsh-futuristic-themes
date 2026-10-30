(function () {
  function rgb(v) { var m = String(v).match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s\/]+([\d.]+))?/); return m ? [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]] : null; }
  function lin(x) { x = x / 255; return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }
  function lum(c) { return 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]); }
  function ratio(fg, bg) {
    var a = rgb(fg), b = rgb(bg);
    if (!a || !b) return null;
    if (a[3] < 1) { a = [a[0] * a[3] + b[0] * (1 - a[3]), a[1] * a[3] + b[1] * (1 - a[3]), a[2] * a[3] + b[2] * (1 - a[3])]; }
    var la = lum(a), lb = lum(b), hi = Math.max(la, lb), lo = Math.min(la, lb);
    return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
  }
  function bgOf(el) {
    var node = el;
    while (node && node !== document.documentElement) {
      var cs = getComputedStyle(node);
      var c = rgb(cs.backgroundColor);
      if (c && c[3] > 0.5) return cs.backgroundColor;
      node = node.parentElement;
    }
    return getComputedStyle(document.body).backgroundColor;
  }
  function probe(sel) {
    var el = document.querySelector(sel);
    if (!el) return null;
    var cs = getComputedStyle(el);
    return { sel: sel, text: (el.textContent || '').trim().slice(0, 42), color: cs.color, bg: bgOf(el), fontFamily: cs.fontFamily, fontSize: cs.fontSize, ratio: ratio(cs.color, bgOf(el)) };
  }
  function contrastFailures(limit) {
    var out = [], nodes = document.querySelectorAll('body *'), count = 0;
    for (var i = 0; i < nodes.length && count < limit; i++) {
      var el = nodes[i];
      var tag = el.tagName.toLowerCase();
      if (/^(script|style|svg|path|defs|symbol|use|br|img|input|textarea|select)$/.test(tag)) continue;
      var own = '';
      for (var k = 0; k < el.childNodes.length; k++) { var n = el.childNodes[k]; if (n.nodeType === 3) own += n.nodeValue; }
      own = own.replace(/\s+/g, ' ').trim();
      if (own.length < 2) continue;
      var cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
      if (el.getBoundingClientRect().width < 2 || el.getBoundingClientRect().height < 2) continue;
      count++;
      var r = ratio(cs.color, bgOf(el));
      if (r !== null && r < 2.2) {
        var label = tag + (el.className && typeof el.className === 'string' ? '.' + el.className.split(/\s+/).slice(0, 2).join('.') : '');
        out.push({ where: label.slice(0, 60), text: own.slice(0, 40), ratio: r, color: cs.color, bg: bgOf(el) });
        if (out.length >= 8) break;
      }
    }
    return { scanned: count, low: out };
  }
  var body = document.body;
  var dbg = window.__dshFuturisticThemes && window.__dshFuturisticThemes.debug ? window.__dshFuturisticThemes.debug() : null;
  var tokenNames = ['--dsw-alias-bg-base', '--dsw-alias-bg-layer-1', '--dsw-alias-bg-layer-2', '--dsw-alias-bg-layer-3', '--dsw-alias-brand-primary', '--dsw-alias-label-primary', '--dsw-alias-label-secondary', '--dsw-alias-label-caption', '--dsw-specific-sidebar-fill', '--dsw-menu-surface-fill'];
  var tokens = {};
  for (var t = 0; t < tokenNames.length; t++) tokens[tokenNames[t]] = body.style.getPropertyValue(tokenNames[t]);
  var overlay = document.getElementById('dsh-ft-overlay');
  var overlayInfo = null;
  if (overlay) {
    var ocs = getComputedStyle(overlay), ob = getComputedStyle(overlay, '::before'), oa = getComputedStyle(overlay, '::after');
    overlayInfo = { display: ocs.display, pointerEvents: ocs.pointerEvents, zIndex: ocs.zIndex, beforeBgImage: String(ob.backgroundImage).slice(0, 160), beforeBgColor: ob.backgroundColor, beforeOpacity: ob.opacity, afterBgImage: String(oa.backgroundImage).slice(0, 160), afterBoxShadow: String(oa.boxShadow).slice(0, 120) };
  }
  var cards = [], cardEls = document.querySelectorAll('.dshft-card');
  for (var c = 0; c < cardEls.length; c++) { var ce = cardEls[c]; cards.push({ text: (ce.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 46), active: ce.getAttribute('data-active'), pressed: ce.getAttribute('aria-pressed') }); }
  var dialog = document.querySelector('[role=dialog]');
  var textarea = document.querySelector('textarea');
  var activeCard = document.querySelector('.dshft-card[data-active="true"]');
  var errors = window.__dshErrList || [];
  var pluginStyleTags = document.querySelectorAll('style[data-plugin]').length;
  var tokenBad = [];
  for (var p = 0; p < body.style.length; p++) { var name = body.style[p]; if (name.indexOf('--dsw-') !== 0) continue; var val = body.style.getPropertyValue(name); if (/\[object Object\]|undefined|^null$/i.test(val)) tokenBad.push(name + '=' + val); }

  var focusInfo = (function () {
    var a = document.activeElement;
    if (!a || a === document.body) return { tag: a ? a.tagName : null, note: 'body' };
    var cs = getComputedStyle(a);
    return { tag: a.tagName, cls: String(a.className || '').slice(0, 60), outline: cs.outline, outlineWidth: cs.outlineWidth, outlineStyle: cs.outlineStyle, outlineColor: cs.outlineColor, boxShadow: String(cs.boxShadow).slice(0, 120), focusVisible: a.matches(':focus-visible') };
  })();
  return JSON.stringify({
    focus: focusInfo,
    url: location.href.replace(/token=[^&]+/, 'token=…'),
    title: document.title,
    body: { theme: body.getAttribute('data-dsh-futuristic-theme'), effects: body.getAttribute('data-dsh-futuristic-effects'), bgColor: getComputedStyle(body).backgroundColor, color: getComputedStyle(body).color, fontFamily: getComputedStyle(body).fontFamily, colorScheme: document.documentElement.style.colorScheme, themeSourceAttr: document.documentElement.getAttribute('data-dsh-theme-source') },
    plugin: dbg ? { mounted: dbg.mounted, state: dbg.state, desired: dbg.desired, graceUntil: dbg.graceUntil, now: dbg.now, reassertPending: dbg.reassertPending, themeIds: dbg.themeIds, host: dbg.host, recentEvents: dbg.recentEvents } : null,
    bootGlobals: { dshBoot: !!window.__DSH_BOOT__, moduleLoader: !!window.__ModuleLoader__, plugin: !!window.__dshFuturisticThemes, pluginStyleTags: pluginStyleTags },
    tokens: tokens,
    tokenBad: tokenBad,
    overlay: overlayInfo,
    cards: cards,
    activeCard: activeCard ? (activeCard.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 46) : null,
    dialog: dialog ? { bg: getComputedStyle(dialog).backgroundColor, color: getComputedStyle(dialog).color, fontFamily: getComputedStyle(dialog).fontFamily } : null,
    probes: { h1: probe('h1'), composer: probe('[contenteditable="true"]') || probe('textarea') || probe('[role=textbox]'), body: { color: getComputedStyle(body).color, bg: getComputedStyle(body).backgroundColor, ratio: ratio(getComputedStyle(body).color, getComputedStyle(body).backgroundColor) }, textarea: textarea ? { color: getComputedStyle(textarea).color, bg: bgOf(textarea), fontFamily: getComputedStyle(textarea).fontFamily, placeholder: (function () { try { return getComputedStyle(textarea, '::placeholder').color; } catch (e) { return null; } })(), ratio: ratio(getComputedStyle(textarea).color, bgOf(textarea)) } : null, cardName: probe('.dshft-cardName'), sidebar: probe('aside') || probe('nav') },
    tooltip: (function () {
      var t = document.querySelector('[role=tooltip]');
      if (!t) return null;
      var cs = getComputedStyle(t);
      return { text: (t.textContent || '').trim().slice(0, 60), color: cs.color, bg: bgOf(t), ratio: ratio(cs.color, bgOf(t)) };
    })(),
    poppers: (function () {
      var out = [];
      document.querySelectorAll('[data-radix-popper-content-wrapper],[data-radix-menu-content],[role=tooltip]').forEach(function (el) {
        var txt = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 70);
        if (txt) out.push({ tag: el.tagName, role: el.getAttribute('role'), text: txt });
      });
      return out.slice(0, 8);
    })(),
    hitTest: (function () {
      try {
        var el = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
        var over = document.getElementById('dsh-ft-overlay');
        return { tag: el ? el.tagName : null, id: el ? el.id : null, cls: el ? String(el.className || '').slice(0, 50) : null, overlayHit: el === over };
      } catch (e) { return null; }
    })(),
    lowContrastText: contrastFailures(2000),
    localStorage: { active: localStorage.getItem('dsh-futuristic-themes:active'), effects: localStorage.getItem('dsh-futuristic-themes:effects'), lastBuiltin: localStorage.getItem('dsh-futuristic-themes:last-builtin') },
    errors: errors
  });
})()
