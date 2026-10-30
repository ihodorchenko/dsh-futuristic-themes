(function () {
  var card = document.querySelector('.dshft-card');
  var declaration = 'var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-brand-primary))';
  function resolved(el) {
    var cs = getComputedStyle(el);
    return { outline: cs.outline, width: cs.outlineWidth, style: cs.outlineStyle, color: cs.outlineColor, offset: cs.outlineOffset };
  }
  var rootTokens = {
    width: getComputedStyle(document.documentElement).getPropertyValue('--dsw-focus-ring-width'),
    color: getComputedStyle(document.documentElement).getPropertyValue('--dsw-focus-ring-color'),
    brand: getComputedStyle(document.documentElement).getPropertyValue('--dsw-alias-brand-primary'),
    bodyWidth: getComputedStyle(document.body).getPropertyValue('--dsw-focus-ring-width'),
    bodyColor: getComputedStyle(document.body).getPropertyValue('--dsw-focus-ring-color')
  };
  var probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px;outline:' + declaration + ';outline-offset:2px;';
  document.body.appendChild(probe);
  var probeResolved = resolved(probe);
  probe.remove();
  var forced = null;
  if (card) {
    var tag = document.createElement('style');
    tag.textContent = '.dshft-card.dshft-force-focus-probe{outline:' + declaration + ';outline-offset:2px;}';
    document.head.appendChild(tag);
    card.classList.add('dshft-force-focus-probe');
    forced = resolved(card);
    card.classList.remove('dshft-force-focus-probe');
    tag.remove();
  }
  var ruleFound = false;
  var tags = document.querySelectorAll('style[data-plugin="dsh-futuristic-themes"]');
  for (var i = 0; i < tags.length; i++) if ((tags[i].textContent || '').indexOf('.dshft-card:focus-visible') !== -1) ruleFound = true;
  return JSON.stringify({
    bodyTheme: document.body.getAttribute('data-dsh-futuristic-theme'),
    declaration: declaration,
    resolvedOnProbeDiv: probeResolved,
    resolvedOnActualCardViaSameDeclaration: forced,
    ruleFoundInPluginStyleTag: ruleFound,
    hostTokens: rootTokens,
    cssSupports: (function () { try { return CSS.supports('outline', declaration); } catch (e) { return String(e); } })(),
    cardInheritedTokens: (function () {
      var cs = getComputedStyle(card);
      return { width: cs.getPropertyValue('--dsw-focus-ring-width'), color: cs.getPropertyValue('--dsw-focus-ring-color'), brand: cs.getPropertyValue('--dsw-alias-brand-primary') };
    })()
  });
})()
