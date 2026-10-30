(function () {
  var body = document.body;
  var dbg = window.__dshFuturisticThemes && window.__dshFuturisticThemes.debug ? window.__dshFuturisticThemes.debug() : null;
  var dialogs = document.querySelectorAll('[role=dialog]').length;
  var btnTexts = [];
  Array.prototype.forEach.call(document.querySelectorAll('[role=dialog] button'), function (b) { var t = (b.textContent || '').trim(); if (t) btnTexts.push(t); });
  return JSON.stringify({
    body: { theme: body.getAttribute('data-dsh-futuristic-theme'), bg: getComputedStyle(body).backgroundColor },
    plugin: dbg ? { state: dbg.state, desired: dbg.desired, graceUntil: dbg.graceUntil, now: dbg.now, reassertPending: dbg.reassertPending, host: dbg.host, recentEvents: dbg.recentEvents.map(function (e) { return e.preference; }) } : null,
    debug: { darkFind: window.__darkFind, clickResult: window.__clickResult, darkClickAt: window.__darkClickAt, eventsAt: dbg ? dbg.now : null },
    dialogs: dialogs,
    dialogButtons: btnTexts.slice(0, 25),
    localStorage: { active: localStorage.getItem('dsh-futuristic-themes:active'), lastBuiltin: localStorage.getItem('dsh-futuristic-themes:last-builtin') },
    errors: window.__dshErrList || []
  });
})()
