/**
 * dsh-futuristic-themes — browser half.
 *
 * Registers four cinematic themes (three dark, one light) with the host theme
 * registry (`ctx.theme`), restores the last selection across restarts from
 * localStorage, keeps the decorative effect layer in sync, and contributes an
 * Appearance row to Settings → General so the themes are switchable without a
 * page of their own.
 *
 * The selection is intentionally NOT written to `ui-theme.preference`: the host
 * settings schema only accepts light/dark/system, and a third-party theme id
 * there would make `ThemeRuntime.buildSnapshot()` throw at boot. The durable
 * preference therefore stays a built-in value (whatever light/dark/system the
 * user last chose) and the selected skin lives in localStorage.
 *
 * The bundle is a hand-written lazy-CJS factory because the DSH client module
 * system materialises exactly this shape; there is no build step for the
 * module format itself — `scripts/build.mjs` only inlines data into it.
 */
window.__ModuleLoader__.load({
	id: "dsh-futuristic-themes",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		var React = require("react");

		/* ------------------------------------------------------------------ data */

		/** Theme definitions: id, colour scheme, labels, swatches, flat tokens. */
		var THEMES = [{"id":"nostromo-amber","colorScheme":"dark","label":{"en":"Nostromo Amber","zh":"诺斯特罗莫 · 琥珀"},"description":{"en":"Amber phosphor CRT terminal on almost-black warm metal: 1 px frames, monospace type, restrained glow.","zh":"近乎全黑的暖金属底色上的琥珀磷光 CRT 终端：1 像素细框、等宽字体与克制的辉光。"},"tagline":{"en":"ALIEN / ROMULUS INSPIRED","zh":"灵感源自《异形：夺命舰》"},"accent":"#FFB000","swatches":["#0B0804","#FFB000","#FFD98A","#FF4A1C","#7FBF3F"],"preview":{"notification":{"kind":"warning","text":"High load detected"},"metrics":"bars"},"tokens":{"--dsw-alias-bg-base":"#0B0804","--dsw-alias-bg-l1":"#161008","--dsw-alias-bg-layer-1":"#161008","--dsw-alias-bg-layer-2":"#20170A","--dsw-alias-bg-layer-3":"#2C2111","--dsw-alias-bg-layer-4":"#342713","--dsw-alias-bg-overlay":"#342713","--dsw-alias-bg-module-platform":"#20170A","--dsw-alias-bg-multi-select":"#20170A","--dsw-alias-bg-document-preview":"#0B0804","--dsw-alias-bg-document-selection":"rgba(255, 176, 0, 0.28)","--dsw-alias-bg-skeleton":"rgba(255, 217, 138, 0.06)","--dsw-alias-bg-mask-1":"rgba(0, 0, 0, 0.55)","--dsw-alias-bg-mask-2":"rgba(0, 0, 0, 0.18)","--dsw-alias-bg-mask-3":"rgba(0, 0, 0, 0.62)","--dsw-alias-bg-mask-photo":"rgba(0, 0, 0, 0.88)","--dsw-alias-bg-mask-drop":"rgba(44, 33, 17, 0.72)","--dsw-alias-border-inverted":"rgba(255, 217, 138, 0.08)","--dsw-alias-border-inverted2":"rgba(255, 217, 138, 0.14)","--dsw-alias-border-l1":"rgba(58, 42, 16, 0.45)","--dsw-alias-border-l2":"rgba(255, 176, 0, 0.18)","--dsw-alias-border-l2-darkmode-thin":"rgba(58, 42, 16, 0.45)","--dsw-alias-border-l3":"rgba(255, 176, 0, 0.58)","--dsw-alias-border-l4":"rgba(255, 176, 0, 0.7)","--dsw-alias-separator-primary":"rgba(255, 176, 0, 0.18)","--dsw-alias-label-primary":"#FFD98A","--dsw-alias-label-secondary":"#E0AC45","--dsw-alias-label-tertiary":"#b58323","--dsw-alias-label-caption":"#9F7A2C","--dsw-alias-label-quaternary":"#825e1a","--dsw-alias-label-dimmed":"#966300","--dsw-alias-label-primary-dimmed":"#FFD98A","--dsw-alias-label-primary-bluish":"#FFD98A","--dsw-alias-label-primary-foreground":"#070502","--dsw-alias-label-primary-inverted":"#1c150b","--dsw-alias-label-document-preview":"#E0AC45","--dsw-alias-label-shimmer":"rgba(255, 217, 138, 0.4)","--dsw-alias-label-deep-diving":"#ECC469","--dsw-alias-label-deep-diving-shimmer":"rgba(236, 196, 105, 0.55)","--dsw-alias-menu-icon":"#E0AC45","--dsw-alias-link":"#FFB000","--dsw-alias-brand-primary":"#FFB000","--dsw-alias-brand-primary-invert":"#FFD98A","--dsw-alias-brand-primary-new-colorprimary-new-color":"#FFB000","--dsw-alias-brand-text":"#FFD98A","--dsw-alias-button-contrast-fill":"#FFD98A","--dsw-alias-button-elevated-fill":"#2C2111","--dsw-alias-button-floating-fill":"#20170A","--dsw-alias-button-floating-hover":"#2C2111","--dsw-alias-button-ghost-active-border":"#FFB000","--dsw-alias-button-ghost-active-fill":"rgba(255, 176, 0, 0.16)","--dsw-alias-button-ghost-active-hover":"rgba(255, 176, 0, 0.26)","--dsw-alias-button-info-fill":"#FFB000","--dsw-alias-button-info-hover":"#FFCC33","--dsw-alias-button-primary-dimmed":"rgba(255, 176, 0, 0.4)","--dsw-alias-button-primary-fill":"#FFB000","--dsw-alias-button-primary-hover":"#FFCC33","--dsw-alias-button-tool-bar-fill-invisible":"rgba(44, 33, 17, 0.55)","--dsw-alias-button-tool-bar-fill":"rgba(44, 33, 17, 0.75)","--dsw-alias-button-tool-bar-hover":"rgba(44, 33, 17, 0.9)","--dsw-alias-interactive-bg-hover":"rgba(255, 217, 138, 0.07)","--dsw-alias-interactive-bg-hover-solid":"#2C2111","--dsw-alias-interactive-bg-active":"rgba(255, 217, 138, 0.13)","--dsw-alias-interactive-bg-hover-accent":"rgba(255, 176, 0, 0.18)","--dsw-alias-interactive-bg-hover-danger":"rgba(255, 74, 28, 0.16)","--dsw-alias-fill-l1":"rgba(255, 217, 138, 0.05)","--dsw-alias-fill-l2":"rgba(255, 217, 138, 0.09)","--dsw-alias-fill-tertiary":"rgba(255, 217, 138, 0.04)","--dsw-alias-fill-tsp-secondary":"rgba(255, 217, 138, 0.12)","--dsw-alias-state-business-primary":"#FFB000","--dsw-alias-state-business-tertiary":"rgba(255, 176, 0, 0.18)","--dsw-alias-state-error-primary":"#FF4A1C","--dsw-alias-state-error-secondary":"#ff7755","--dsw-alias-state-idle-primary":"#8A5A00","--dsw-alias-state-success-primary":"#7FBF3F","--dsw-alias-state-success-secondary":"#9bcd69","--dsw-alias-state-success-tertiary":"rgba(127, 191, 63, 0.16)","--dsw-alias-state-warn-label":"#FF4A1C","--dsw-alias-state-warn-primary":"#FF4A1C","--dsw-alias-state-warn-secondary":"#ff6e49","--dsw-alias-state-warn-tertiary":"rgba(255, 74, 28, 0.16)","--dsw-alias-code-diff-added":"rgba(127, 191, 63, 0.1)","--dsw-alias-code-diff-deleted":"rgba(255, 74, 28, 0.1)","--dsw-alias-file-diff-added-bg":"#1b220c","--dsw-alias-file-diff-added-gutter":"#131508","--dsw-alias-file-diff-added-marker":"#7FBF3F","--dsw-alias-file-diff-deleted-bg":"#2d1107","--dsw-alias-file-diff-deleted-gutter":"#1c0d06","--dsw-alias-file-diff-deleted-marker":"#FF4A1C","--dsw-alias-markdown-citation":"#2C2111","--dsw-alias-markdown-code-block":"#161008","--dsw-alias-markdown-code-block-banner":"#20170A","--dsw-alias-markdown-code-segment-selected":"#20170A","--dsw-alias-markdown-code-segment-unselected":"#161008","--dsw-alias-markdown-inline-code":"#20170A","--dsw-alias-markdown-placeholder":"#20170A","--dsw-alias-markdown-tag":"#20170A","--dsw-alias-scrollbar-bg-l1":"#3A2A10","--dsw-alias-scrollbar-bg-l2":"#564321","--dsw-alias-scrollbar-hover-l1":"#715b32","--dsw-alias-scrollbar-hover-l2":"#8d7443","--dsw-alias-switch-thumb":"#E0AC45","--dsw-alias-toast-bg":"#2C2111","--dsw-alias-toast-label":"#FFD98A","--dsw-alias-tooltip-bg":"#2C2111","--dsw-alias-tooltip-key-bg":"#524227","--dsw-alias-turn-trigger-bg":"#20170A","--dsw-alias-turn-trigger-bg-hover":"#2C2111","--dsw-specific-bubble":"#161008","--dsw-specific-bubble-highlight":"#20170A","--dsw-specific-input-major":"#20170A","--dsw-specific-login-input":"#161008","--dsw-specific-selector":"#2C2111","--dsw-specific-sidebar-fill":"linear-gradient(180deg, #171006 0%, #0B0804 100%)","--dsw-specific-sidebar-nav-item-active":"rgba(255, 176, 0, 0.16)","--dsw-specific-sidebar-nav-item-active-accent":"rgba(255, 176, 0, 0.62)","--dsw-specific-sidebar-nav-item-hover":"rgba(255, 217, 138, 0.06)","--dsw-specific-tip":"#20170A","--dsw-menu-surface-fill":"rgba(40, 31, 16, 0.96)","--dsw-alias-menu-group-header-fill":"rgba(40, 31, 16, 0.96)","--dsw-specific-menu":"rgba(40, 31, 16, 0.96)","--dsw-alias-settings-card-fill":"#20170A","--dsw-alias-settings-card-stroke":"#614d28","--dsw-alias-onboarding-accent":"#FFB000","--dsw-alias-onboarding-card-fill":"rgba(32, 23, 10, 0.8)","--dsw-alias-onboarding-secondary-fill":"#2C2111","--dsw-alias-onboarding-checkbox-border":"rgba(255, 217, 138, 0.2)"}},{"id":"omni-tool","colorScheme":"dark","label":{"en":"Omni-tool","zh":"万用工具"},"description":{"en":"Holographic HUD: orange action accent on dark blue glass, cold cyan secondary signals and a faint projection grid.","zh":"全息 HUD：深蓝玻璃上的橙色操作强调、冷青色次级信号与微弱投影网格。"},"tagline":{"en":"MASS EFFECT INSPIRED","zh":"《质量效应》灵感"},"accent":"#FF9A1F","swatches":["#0A0D12","#FF9A1F","#FFC266","#3FD0FF","#F2E3C9"],"preview":{"notification":{"kind":"info","text":"Processing batch..."},"metrics":"gauge"},"tokens":{"--dsw-alias-bg-base":"#0A0D12","--dsw-alias-bg-l1":"#121821","--dsw-alias-bg-layer-1":"#121821","--dsw-alias-bg-layer-2":"#182130","--dsw-alias-bg-layer-3":"#1F2B3C","--dsw-alias-bg-layer-4":"#2A3A4E","--dsw-alias-bg-overlay":"#2A3A4E","--dsw-alias-bg-module-platform":"#182130","--dsw-alias-bg-multi-select":"#182130","--dsw-alias-bg-document-preview":"#0A0D12","--dsw-alias-bg-document-selection":"rgba(255, 154, 31, 0.28)","--dsw-alias-bg-skeleton":"rgba(242, 227, 201, 0.06)","--dsw-alias-bg-mask-1":"rgba(0, 0, 0, 0.55)","--dsw-alias-bg-mask-2":"rgba(0, 0, 0, 0.18)","--dsw-alias-bg-mask-3":"rgba(0, 0, 0, 0.62)","--dsw-alias-bg-mask-photo":"rgba(0, 0, 0, 0.88)","--dsw-alias-bg-mask-drop":"rgba(31, 43, 60, 0.72)","--dsw-alias-border-inverted":"rgba(242, 227, 201, 0.08)","--dsw-alias-border-inverted2":"rgba(242, 227, 201, 0.14)","--dsw-alias-border-l1":"rgba(255, 154, 31, 0.13)","--dsw-alias-border-l2":"rgba(255, 154, 31, 0.24)","--dsw-alias-border-l2-darkmode-thin":"rgba(255, 154, 31, 0.15)","--dsw-alias-border-l3":"rgba(255, 154, 31, 0.52)","--dsw-alias-border-l4":"rgba(255, 194, 102, 0.38)","--dsw-alias-separator-primary":"rgba(255, 154, 31, 0.18)","--dsw-alias-label-primary":"#F2E3C9","--dsw-alias-label-secondary":"#A9BCD4","--dsw-alias-label-tertiary":"#93a4bc","--dsw-alias-label-caption":"#717f90","--dsw-alias-label-quaternary":"#6a7789","--dsw-alias-label-dimmed":"#546071","--dsw-alias-label-primary-dimmed":"#F2E3C9","--dsw-alias-label-primary-bluish":"#F2E3C9","--dsw-alias-label-primary-foreground":"#06080D","--dsw-alias-label-primary-inverted":"#151c27","--dsw-alias-label-document-preview":"#A9BCD4","--dsw-alias-label-shimmer":"rgba(242, 227, 201, 0.4)","--dsw-alias-label-deep-diving":"#3FD0FF","--dsw-alias-label-deep-diving-shimmer":"rgba(63, 208, 255, 0.55)","--dsw-alias-menu-icon":"#A9BCD4","--dsw-alias-link":"#FF9A1F","--dsw-alias-brand-primary":"#FF9A1F","--dsw-alias-brand-primary-invert":"#F2E3C9","--dsw-alias-brand-primary-new-colorprimary-new-color":"#FF9A1F","--dsw-alias-brand-text":"#F2E3C9","--dsw-alias-button-contrast-fill":"#F2E3C9","--dsw-alias-button-elevated-fill":"#1F2B3C","--dsw-alias-button-floating-fill":"#182130","--dsw-alias-button-floating-hover":"#1F2B3C","--dsw-alias-button-ghost-active-border":"#FF9A1F","--dsw-alias-button-ghost-active-fill":"rgba(255, 154, 31, 0.16)","--dsw-alias-button-ghost-active-hover":"rgba(255, 154, 31, 0.26)","--dsw-alias-button-info-fill":"#FF9A1F","--dsw-alias-button-info-hover":"#FFC266","--dsw-alias-button-primary-dimmed":"rgba(255, 154, 31, 0.4)","--dsw-alias-button-primary-fill":"#FF9A1F","--dsw-alias-button-primary-hover":"#FFC266","--dsw-alias-button-tool-bar-fill-invisible":"rgba(31, 43, 60, 0.55)","--dsw-alias-button-tool-bar-fill":"rgba(31, 43, 60, 0.75)","--dsw-alias-button-tool-bar-hover":"rgba(31, 43, 60, 0.9)","--dsw-alias-interactive-bg-hover":"rgba(242, 227, 201, 0.07)","--dsw-alias-interactive-bg-hover-solid":"#1F2B3C","--dsw-alias-interactive-bg-active":"rgba(242, 227, 201, 0.13)","--dsw-alias-interactive-bg-hover-accent":"rgba(255, 154, 31, 0.18)","--dsw-alias-interactive-bg-hover-danger":"rgba(255, 74, 61, 0.16)","--dsw-alias-fill-l1":"rgba(242, 227, 201, 0.05)","--dsw-alias-fill-l2":"rgba(242, 227, 201, 0.09)","--dsw-alias-fill-tertiary":"rgba(242, 227, 201, 0.04)","--dsw-alias-fill-tsp-secondary":"rgba(242, 227, 201, 0.12)","--dsw-alias-state-business-primary":"#FF9A1F","--dsw-alias-state-business-tertiary":"rgba(255, 154, 31, 0.18)","--dsw-alias-state-error-primary":"#FF4A3D","--dsw-alias-state-error-secondary":"#ff776e","--dsw-alias-state-idle-primary":"#63738C","--dsw-alias-state-success-primary":"#31DBC5","--dsw-alias-state-success-secondary":"#5ee3d2","--dsw-alias-state-success-tertiary":"rgba(49, 219, 197, 0.16)","--dsw-alias-state-warn-label":"#FF4A3D","--dsw-alias-state-warn-primary":"#FF4A3D","--dsw-alias-state-warn-secondary":"#ff6e64","--dsw-alias-state-warn-tertiary":"rgba(255, 74, 61, 0.16)","--dsw-alias-code-diff-added":"rgba(49, 219, 197, 0.1)","--dsw-alias-code-diff-deleted":"rgba(255, 74, 61, 0.1)","--dsw-alias-file-diff-added-bg":"#0f2a2b","--dsw-alias-file-diff-added-gutter":"#0d1b1f","--dsw-alias-file-diff-added-marker":"#31DBC5","--dsw-alias-file-diff-deleted-bg":"#2c1618","--dsw-alias-file-diff-deleted-gutter":"#1b1115","--dsw-alias-file-diff-deleted-marker":"#FF4A3D","--dsw-alias-markdown-citation":"#1F2B3C","--dsw-alias-markdown-code-block":"#121821","--dsw-alias-markdown-code-block-banner":"#182130","--dsw-alias-markdown-code-segment-selected":"#182130","--dsw-alias-markdown-code-segment-unselected":"#121821","--dsw-alias-markdown-inline-code":"#182130","--dsw-alias-markdown-placeholder":"#182130","--dsw-alias-markdown-tag":"#182130","--dsw-alias-scrollbar-bg-l1":"#7A4E18","--dsw-alias-scrollbar-bg-l2":"#8b6331","--dsw-alias-scrollbar-hover-l1":"#9c784a","--dsw-alias-scrollbar-hover-l2":"#ac8d62","--dsw-alias-switch-thumb":"#A9BCD4","--dsw-alias-toast-bg":"#1F2B3C","--dsw-alias-toast-label":"#F2E3C9","--dsw-alias-tooltip-bg":"#1F2B3C","--dsw-alias-tooltip-key-bg":"#454c55","--dsw-alias-turn-trigger-bg":"#182130","--dsw-alias-turn-trigger-bg-hover":"#1F2B3C","--dsw-specific-bubble":"#121821","--dsw-specific-bubble-highlight":"#182130","--dsw-specific-input-major":"#182130","--dsw-specific-login-input":"#121821","--dsw-specific-selector":"#1F2B3C","--dsw-specific-sidebar-fill":"linear-gradient(180deg, #172433 0%, #0A0D12 100%)","--dsw-specific-sidebar-nav-item-active":"rgba(255, 154, 31, 0.16)","--dsw-specific-sidebar-nav-item-active-accent":"rgba(255, 154, 31, 0.3)","--dsw-specific-sidebar-nav-item-hover":"rgba(242, 227, 201, 0.06)","--dsw-specific-tip":"#182130","--dsw-menu-surface-fill":"rgba(26, 37, 52, 0.94)","--dsw-alias-menu-group-header-fill":"rgba(26, 37, 52, 0.94)","--dsw-specific-menu":"rgba(26, 37, 52, 0.94)","--dsw-alias-settings-card-fill":"#182130","--dsw-alias-settings-card-stroke":"rgba(255, 194, 102, 0.34)","--dsw-alias-onboarding-accent":"#FF9A1F","--dsw-alias-onboarding-card-fill":"rgba(24, 33, 48, 0.8)","--dsw-alias-onboarding-secondary-fill":"#1F2B3C","--dsw-alias-onboarding-checkbox-border":"rgba(242, 227, 201, 0.2)"}},{"id":"pure-reflection","colorScheme":"light","label":{"en":"Pure Reflection","zh":"纯净反射"},"description":{"en":"Runner's-vision red on a sterile white city: light-grey architecture, sharp geometry and functional blue, orange and yellow district accents.","zh":"「奔跑者视觉」红色点缀的纯白城市：浅灰建筑、锐利几何，以及蓝、橙、黄构成的功能区配色。"},"tagline":{"en":"MIRROR'S EDGE INSPIRED","zh":"《镜之边缘》启发"},"accent":"#E10600","swatches":["#EFF1F4","#E10600","#1E6FD9","#F76707","#F2C200","#14181C"],"preview":{"notification":{"kind":"success","text":"All systems nominal"},"metrics":"bars"},"tokens":{"--dsw-alias-bg-base":"#EFF1F4","--dsw-alias-bg-l1":"#FFFFFF","--dsw-alias-bg-layer-1":"#FFFFFF","--dsw-alias-bg-layer-2":"#FBFCFD","--dsw-alias-bg-layer-3":"#E5E9ED","--dsw-alias-bg-layer-4":"#E5E9ED","--dsw-alias-bg-overlay":"#E5E9ED","--dsw-alias-bg-module-platform":"#FBFCFD","--dsw-alias-bg-multi-select":"#FBFCFD","--dsw-alias-bg-document-preview":"#EFF1F4","--dsw-alias-bg-document-selection":"rgba(225, 6, 0, 0.28)","--dsw-alias-bg-skeleton":"rgba(20, 24, 28, 0.06)","--dsw-alias-bg-mask-1":"rgba(20, 24, 28, 0.24)","--dsw-alias-bg-mask-2":"rgba(0, 0, 0, 0.18)","--dsw-alias-bg-mask-3":"rgba(0, 0, 0, 0.62)","--dsw-alias-bg-mask-photo":"rgba(0, 0, 0, 0.88)","--dsw-alias-bg-mask-drop":"rgba(229, 233, 237, 0.72)","--dsw-alias-border-inverted":"rgba(20, 24, 28, 0.08)","--dsw-alias-border-inverted2":"rgba(20, 24, 28, 0.14)","--dsw-alias-border-l1":"rgba(201, 208, 214, 0.45)","--dsw-alias-border-l2":"rgba(201, 208, 214, 0.7)","--dsw-alias-border-l2-darkmode-thin":"rgba(201, 208, 214, 0.45)","--dsw-alias-border-l3":"#C9D0D6","--dsw-alias-border-l4":"#a5abb1","--dsw-alias-separator-primary":"rgba(201, 208, 214, 0.7)","--dsw-alias-label-primary":"#14181C","--dsw-alias-label-secondary":"#59646D","--dsw-alias-label-tertiary":"#727c84","--dsw-alias-label-caption":"#6E7981","--dsw-alias-label-quaternary":"#989fa6","--dsw-alias-label-dimmed":"#adb4ba","--dsw-alias-label-primary-dimmed":"#14181C","--dsw-alias-label-primary-bluish":"#0F3D7A","--dsw-alias-label-primary-foreground":"#FFFFFF","--dsw-alias-label-primary-inverted":"#eaedf1","--dsw-alias-label-document-preview":"#59646D","--dsw-alias-label-shimmer":"rgba(20, 24, 28, 0.4)","--dsw-alias-label-deep-diving":"#1E6FD9","--dsw-alias-label-deep-diving-shimmer":"rgba(30, 111, 217, 0.55)","--dsw-alias-menu-icon":"#59646D","--dsw-alias-link":"#1E6FD9","--dsw-alias-brand-primary":"#E10600","--dsw-alias-brand-primary-invert":"#14181C","--dsw-alias-brand-primary-new-colorprimary-new-color":"#E10600","--dsw-alias-brand-text":"#14181C","--dsw-alias-button-contrast-fill":"#14181C","--dsw-alias-button-elevated-fill":"#E5E9ED","--dsw-alias-button-floating-fill":"#FBFCFD","--dsw-alias-button-floating-hover":"#E5E9ED","--dsw-alias-button-ghost-active-border":"#E10600","--dsw-alias-button-ghost-active-fill":"rgba(225, 6, 0, 0.16)","--dsw-alias-button-ghost-active-hover":"rgba(225, 6, 0, 0.26)","--dsw-alias-button-info-fill":"#E10600","--dsw-alias-button-info-hover":"#1559B0","--dsw-alias-button-primary-dimmed":"rgba(225, 6, 0, 0.4)","--dsw-alias-button-primary-fill":"#E10600","--dsw-alias-button-primary-hover":"#B00000","--dsw-alias-button-tool-bar-fill-invisible":"rgba(229, 233, 237, 0.55)","--dsw-alias-button-tool-bar-fill":"rgba(229, 233, 237, 0.75)","--dsw-alias-button-tool-bar-hover":"rgba(229, 233, 237, 0.9)","--dsw-alias-interactive-bg-hover":"rgba(20, 24, 28, 0.07)","--dsw-alias-interactive-bg-hover-solid":"#E5E9ED","--dsw-alias-interactive-bg-active":"rgba(20, 24, 28, 0.13)","--dsw-alias-interactive-bg-hover-accent":"rgba(225, 6, 0, 0.18)","--dsw-alias-interactive-bg-hover-danger":"rgba(217, 72, 15, 0.16)","--dsw-alias-fill-l1":"rgba(20, 24, 28, 0.05)","--dsw-alias-fill-l2":"rgba(20, 24, 28, 0.09)","--dsw-alias-fill-tertiary":"rgba(20, 24, 28, 0.04)","--dsw-alias-fill-tsp-secondary":"rgba(20, 24, 28, 0.12)","--dsw-alias-state-business-primary":"#E10600","--dsw-alias-state-business-tertiary":"rgba(30, 111, 217, 0.14)","--dsw-alias-state-error-primary":"#B00020","--dsw-alias-state-error-secondary":"#E10600","--dsw-alias-state-idle-primary":"#C9D0D6","--dsw-alias-state-success-primary":"#1B8A4B","--dsw-alias-state-success-secondary":"#4da473","--dsw-alias-state-success-tertiary":"rgba(27, 138, 75, 0.16)","--dsw-alias-state-warn-label":"#D9480F","--dsw-alias-state-warn-primary":"#D9480F","--dsw-alias-state-warn-secondary":"#e16d3f","--dsw-alias-state-warn-tertiary":"rgba(217, 72, 15, 0.16)","--dsw-alias-code-diff-added":"rgba(27, 138, 75, 0.1)","--dsw-alias-code-diff-deleted":"rgba(217, 72, 15, 0.1)","--dsw-alias-file-diff-added-bg":"#d1e3dc","--dsw-alias-file-diff-added-gutter":"#e0eae8","--dsw-alias-file-diff-added-marker":"#1B8A4B","--dsw-alias-file-diff-deleted-bg":"#ecd9d4","--dsw-alias-file-diff-deleted-gutter":"#ede5e4","--dsw-alias-file-diff-deleted-marker":"#D9480F","--dsw-alias-markdown-citation":"#E5E9ED","--dsw-alias-markdown-code-block":"#FFFFFF","--dsw-alias-markdown-code-block-banner":"#FBFCFD","--dsw-alias-markdown-code-segment-selected":"#FBFCFD","--dsw-alias-markdown-code-segment-unselected":"#FFFFFF","--dsw-alias-markdown-inline-code":"#FBFCFD","--dsw-alias-markdown-placeholder":"#FBFCFD","--dsw-alias-markdown-tag":"#FBFCFD","--dsw-alias-scrollbar-bg-l1":"#C9D0D6","--dsw-alias-scrollbar-bg-l2":"#b0b6bc","--dsw-alias-scrollbar-hover-l1":"#969ca2","--dsw-alias-scrollbar-hover-l2":"#7d8388","--dsw-alias-switch-thumb":"#FFFFFF","--dsw-alias-toast-bg":"#14181C","--dsw-alias-toast-label":"#FFFFFF","--dsw-alias-tooltip-bg":"#14181C","--dsw-alias-tooltip-key-bg":"#2A3036","--dsw-alias-turn-trigger-bg":"#FBFCFD","--dsw-alias-turn-trigger-bg-hover":"#E5E9ED","--dsw-specific-bubble":"#FFFFFF","--dsw-specific-bubble-highlight":"#FBFCFD","--dsw-specific-input-major":"#FBFCFD","--dsw-specific-login-input":"#FFFFFF","--dsw-specific-selector":"#E5E9ED","--dsw-specific-sidebar-fill":"#F7F9FB","--dsw-specific-sidebar-nav-item-active":"rgba(225, 6, 0, 0.16)","--dsw-specific-sidebar-nav-item-active-accent":"rgba(225, 6, 0, 0.3)","--dsw-specific-sidebar-nav-item-hover":"rgba(20, 24, 28, 0.06)","--dsw-specific-tip":"#FBFCFD","--dsw-menu-surface-fill":"rgba(255, 255, 255, 0.98)","--dsw-alias-menu-group-header-fill":"rgba(255, 255, 255, 0.98)","--dsw-specific-menu":"rgba(255, 255, 255, 0.98)","--dsw-alias-settings-card-fill":"#FBFCFD","--dsw-alias-settings-card-stroke":"#a5abb1","--dsw-alias-onboarding-accent":"#E10600","--dsw-alias-onboarding-card-fill":"rgba(251, 252, 253, 0.8)","--dsw-alias-onboarding-secondary-fill":"#E5E9ED","--dsw-alias-onboarding-checkbox-border":"rgba(20, 24, 28, 0.2)","--dsw-alias-tooltip-label":"#FFFFFF","--dsw-alias-toast-action":"#FF2D2D","--dsw-alias-border-selected":"#E10600","--dsw-alias-chart-messages":"#1E6FD9","--dsw-alias-chart-system":"#8A939B","--dsw-alias-chart-tools":"#E0A800","--dsw-alias-trajectory-accent":"#E10600","--dsw-alias-state-done-primary":"#B45309","--dsw-alias-label-on-color":"#FFFFFF"}},{"id":"renaissance-steel","colorScheme":"dark","label":{"en":"Renaissance Steel","zh":"复兴钢灰"},"description":{"en":"Cold industrial console: flat steel surfaces, 1 px blue-grey frames, clear statuses and almost no glow.","zh":"冷峻工业控制台：平坦钢灰表面、1px 蓝灰边框、清晰状态与几乎无辉光。"},"tagline":{"en":"ALIEN: ROMULUS — RENAISSANCE STATION","zh":"异形：罗慕路斯 — 复兴空间站"},"accent":"#5FB4E6","swatches":["#07090C","#5FB4E6","#BCD0E0","#8A99A6","#5FD3B0"],"preview":{"notification":{"kind":"success","text":"All systems nominal"},"metrics":"bars"},"tokens":{"--dsw-alias-bg-base":"#07090C","--dsw-alias-bg-l1":"#0E1318","--dsw-alias-bg-layer-1":"#0E1318","--dsw-alias-bg-layer-2":"#121920","--dsw-alias-bg-layer-3":"#18222C","--dsw-alias-bg-layer-4":"#1C2733","--dsw-alias-bg-overlay":"#1C2733","--dsw-alias-bg-module-platform":"#121920","--dsw-alias-bg-multi-select":"#121920","--dsw-alias-bg-document-preview":"#07090C","--dsw-alias-bg-document-selection":"rgba(95, 180, 230, 0.28)","--dsw-alias-bg-skeleton":"rgba(188, 208, 224, 0.06)","--dsw-alias-bg-mask-1":"rgba(0, 0, 0, 0.55)","--dsw-alias-bg-mask-2":"rgba(0, 0, 0, 0.18)","--dsw-alias-bg-mask-3":"rgba(0, 0, 0, 0.62)","--dsw-alias-bg-mask-photo":"rgba(0, 0, 0, 0.88)","--dsw-alias-bg-mask-drop":"rgba(24, 34, 44, 0.72)","--dsw-alias-border-inverted":"rgba(188, 208, 224, 0.08)","--dsw-alias-border-inverted2":"rgba(188, 208, 224, 0.14)","--dsw-alias-border-l1":"rgba(38, 50, 61, 0.45)","--dsw-alias-border-l2":"rgba(38, 50, 61, 0.7)","--dsw-alias-border-l2-darkmode-thin":"rgba(38, 50, 61, 0.45)","--dsw-alias-border-l3":"#26323D","--dsw-alias-border-l4":"#44525e","--dsw-alias-separator-primary":"rgba(38, 50, 61, 0.7)","--dsw-alias-label-primary":"#BCD0E0","--dsw-alias-label-secondary":"#8A99A6","--dsw-alias-label-tertiary":"#6d8293","--dsw-alias-label-caption":"#6F7C87","--dsw-alias-label-quaternary":"#586C7A","--dsw-alias-label-dimmed":"#465F73","--dsw-alias-label-primary-dimmed":"#BCD0E0","--dsw-alias-label-primary-bluish":"#BCD0E0","--dsw-alias-label-primary-foreground":"#05070A","--dsw-alias-label-primary-inverted":"#10161c","--dsw-alias-label-document-preview":"#8A99A6","--dsw-alias-label-shimmer":"rgba(188, 208, 224, 0.4)","--dsw-alias-label-deep-diving":"#6FA8C8","--dsw-alias-label-deep-diving-shimmer":"rgba(111, 168, 200, 0.55)","--dsw-alias-menu-icon":"#8A99A6","--dsw-alias-link":"#5FB4E6","--dsw-alias-brand-primary":"#5FB4E6","--dsw-alias-brand-primary-invert":"#BCD0E0","--dsw-alias-brand-primary-new-colorprimary-new-color":"#5FB4E6","--dsw-alias-brand-text":"#BCD0E0","--dsw-alias-button-contrast-fill":"#BCD0E0","--dsw-alias-button-elevated-fill":"#18222C","--dsw-alias-button-floating-fill":"#121920","--dsw-alias-button-floating-hover":"#18222C","--dsw-alias-button-ghost-active-border":"#5FB4E6","--dsw-alias-button-ghost-active-fill":"rgba(95, 180, 230, 0.16)","--dsw-alias-button-ghost-active-hover":"rgba(95, 180, 230, 0.26)","--dsw-alias-button-info-fill":"#5FB4E6","--dsw-alias-button-info-hover":"#9AD7FF","--dsw-alias-button-primary-dimmed":"rgba(95, 180, 230, 0.4)","--dsw-alias-button-primary-fill":"#5FB4E6","--dsw-alias-button-primary-hover":"#9AD7FF","--dsw-alias-button-tool-bar-fill-invisible":"rgba(24, 34, 44, 0.55)","--dsw-alias-button-tool-bar-fill":"rgba(24, 34, 44, 0.75)","--dsw-alias-button-tool-bar-hover":"rgba(24, 34, 44, 0.9)","--dsw-alias-interactive-bg-hover":"rgba(188, 208, 224, 0.07)","--dsw-alias-interactive-bg-hover-solid":"#18222C","--dsw-alias-interactive-bg-active":"rgba(188, 208, 224, 0.13)","--dsw-alias-interactive-bg-hover-accent":"rgba(95, 180, 230, 0.18)","--dsw-alias-interactive-bg-hover-danger":"rgba(226, 85, 63, 0.16)","--dsw-alias-fill-l1":"rgba(188, 208, 224, 0.05)","--dsw-alias-fill-l2":"rgba(188, 208, 224, 0.09)","--dsw-alias-fill-tertiary":"rgba(188, 208, 224, 0.04)","--dsw-alias-fill-tsp-secondary":"rgba(188, 208, 224, 0.12)","--dsw-alias-state-business-primary":"#5FB4E6","--dsw-alias-state-business-tertiary":"rgba(95, 180, 230, 0.18)","--dsw-alias-state-error-primary":"#E2553F","--dsw-alias-state-error-secondary":"#e9806f","--dsw-alias-state-idle-primary":"#627C91","--dsw-alias-state-success-primary":"#5FD3B0","--dsw-alias-state-success-secondary":"#82ddc1","--dsw-alias-state-success-tertiary":"rgba(95, 211, 176, 0.16)","--dsw-alias-state-warn-label":"#E2553F","--dsw-alias-state-warn-primary":"#E2553F","--dsw-alias-state-warn-secondary":"#e87765","--dsw-alias-state-warn-tertiary":"rgba(226, 85, 63, 0.16)","--dsw-alias-code-diff-added":"rgba(95, 211, 176, 0.1)","--dsw-alias-code-diff-deleted":"rgba(226, 85, 63, 0.1)","--dsw-alias-file-diff-added-bg":"#132523","--dsw-alias-file-diff-added-gutter":"#0d1717","--dsw-alias-file-diff-added-marker":"#5FD3B0","--dsw-alias-file-diff-deleted-bg":"#261413","--dsw-alias-file-diff-deleted-gutter":"#160e10","--dsw-alias-file-diff-deleted-marker":"#E2553F","--dsw-alias-markdown-citation":"#18222C","--dsw-alias-markdown-code-block":"#0E1318","--dsw-alias-markdown-code-block-banner":"#121920","--dsw-alias-markdown-code-segment-selected":"#121920","--dsw-alias-markdown-code-segment-unselected":"#0E1318","--dsw-alias-markdown-inline-code":"#121920","--dsw-alias-markdown-placeholder":"#121920","--dsw-alias-markdown-tag":"#121920","--dsw-alias-scrollbar-bg-l1":"#26323D","--dsw-alias-scrollbar-bg-l2":"#3b4854","--dsw-alias-scrollbar-hover-l1":"#505e6b","--dsw-alias-scrollbar-hover-l2":"#657481","--dsw-alias-switch-thumb":"#8A99A6","--dsw-alias-toast-bg":"#18222C","--dsw-alias-toast-label":"#BCD0E0","--dsw-alias-tooltip-bg":"#18222C","--dsw-alias-tooltip-key-bg":"#36414c","--dsw-alias-turn-trigger-bg":"#121920","--dsw-alias-turn-trigger-bg-hover":"#18222C","--dsw-specific-bubble":"#0E1318","--dsw-specific-bubble-highlight":"#121920","--dsw-specific-input-major":"#121920","--dsw-specific-login-input":"#0E1318","--dsw-specific-selector":"#18222C","--dsw-specific-sidebar-fill":"#0B1015","--dsw-specific-sidebar-nav-item-active":"rgba(95, 180, 230, 0.16)","--dsw-specific-sidebar-nav-item-active-accent":"rgba(95, 180, 230, 0.3)","--dsw-specific-sidebar-nav-item-hover":"rgba(188, 208, 224, 0.06)","--dsw-specific-tip":"#121920","--dsw-menu-surface-fill":"rgba(20, 28, 36, 0.94)","--dsw-alias-menu-group-header-fill":"rgba(20, 28, 36, 0.94)","--dsw-specific-menu":"rgba(20, 28, 36, 0.94)","--dsw-alias-settings-card-fill":"#121920","--dsw-alias-settings-card-stroke":"#44525e","--dsw-alias-onboarding-accent":"#5FB4E6","--dsw-alias-onboarding-card-fill":"rgba(18, 25, 32, 0.8)","--dsw-alias-onboarding-secondary-fill":"#18222C","--dsw-alias-onboarding-checkbox-border":"rgba(188, 208, 224, 0.2)"}}];
		/** Styles for the Appearance row. */
		var ROW_CSS = "/* Applied for every active dsh-futuristic theme, independently of the\n   decorative-effects switch. These are plain CSS overrides on top of the\n   host's own sheets: the mono stack only wins while the user has not chosen\n   a custom font in Settings (the host presenter writes an inline style in\n   that case, which outranks this rule). */\n\nbody[data-dsh-futuristic-theme] {\n  --dsh-font-family-text: \"IBM Plex Mono\", \"JetBrains Mono\", \"Roboto Mono\", \"SF Mono\", Menlo, Consolas, monospace;\n  --dsh-font-family-code: \"IBM Plex Mono\", \"JetBrains Mono\", \"Roboto Mono\", \"SF Mono\", Menlo, Consolas, monospace;\n  --dsh-font-family-terminal: \"IBM Plex Mono\", \"JetBrains Mono\", \"Roboto Mono\", \"SF Mono\", Menlo, Consolas, monospace;\n}\n\n/* Pure Reflection is the one light theme: interface copy is Inter, while\n   technical data — logs, code, identifiers, timecodes — stays IBM Plex Mono.\n   The radius scale is sharpened for this theme only: Mirror's Edge architecture\n   is planar and angular, so the host's 4–28 px radii become 0–4 px here. */\nbody[data-dsh-futuristic-theme=\"pure-reflection\"] {\n  --dsh-font-family-text: \"Inter\", \"Inter Variable\", -apple-system, BlinkMacSystemFont, \"Segoe UI\",\n    \"PingFang SC\", \"Hiragino Sans GB\", \"Microsoft YaHei\", \"Helvetica Neue\", Arial, sans-serif;\n  --dsh-font-family-code: \"IBM Plex Mono\", \"JetBrains Mono\", \"Roboto Mono\", \"SF Mono\", Menlo, Consolas, monospace;\n  --dsh-font-family-terminal: \"IBM Plex Mono\", \"JetBrains Mono\", \"Roboto Mono\", \"SF Mono\", Menlo, Consolas, monospace;\n  --dsw-radius-xs: 0px;\n  --dsw-radius-sm: 1px;\n  --dsw-radius-md: 2px;\n  --dsw-radius-lg: 3px;\n  --dsw-radius-xl: 4px;\n  --dsw-radius-panel: 4px;\n}\n\n/* One fixed decorative layer per page; theme sheets paint its pseudo\n   elements. It never takes pointer events, so it cannot block the app. */\n#dsh-ft-overlay {\n  position: fixed;\n  inset: 0;\n  display: none;\n  pointer-events: none;\n  z-index: 2147483000;\n}\n\n/* The Desktop shell marks every direct body child as\n   `-webkit-app-region: no-drag` (html[data-platform=darwin] body > :not(#root))\n   and `app-region` ignores `pointer-events`, so without this opt-out this\n   viewport-sized layer cancels every `[data-window-drag]` strip on macOS:\n   window dragging stops working and the native double-click-title zoom is\n   gone. `initial` is the neutral value (it computes to `none`, not\n   `no-drag`); the literal keyword `none` does not work here. */\n#dsh-ft-overlay {\n  -webkit-app-region: initial !important;\n}\n\nbody[data-dsh-futuristic-theme] #dsh-ft-overlay {\n  display: block;\n}\n\n#dsh-ft-overlay::before,\n#dsh-ft-overlay::after {\n  content: \"\";\n  position: absolute;\n  inset: 0;\n  pointer-events: none;\n}\n\n@media (prefers-reduced-motion: reduce) {\n  #dsh-ft-overlay::before,\n  #dsh-ft-overlay::after {\n    animation: none !important;\n  }\n}\n\n/* Settings → General → Futuristic Themes appearance row. Colours come from\n   the active theme tokens, so the row itself follows the selected skin. */\n\n.dshft {\n  display: flex;\n  flex-direction: column;\n  gap: 12px;\n  padding: 16px 0;\n  border-bottom: 0.5px solid var(--dsw-alias-border-l2);\n}\n\n.dshft-head {\n  display: flex;\n  flex-direction: column;\n  gap: 2px;\n}\n\n.dshft-title {\n  color: var(--dsw-alias-label-primary);\n  font-size: 14px;\n  font-weight: 400;\n  line-height: 22px;\n}\n\n.dshft-desc {\n  color: var(--dsw-alias-label-tertiary);\n  font-size: 12px;\n  font-weight: 400;\n  line-height: 18px;\n  max-width: 620px;\n}\n\n.dshft-cards {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: stretch;\n  gap: 8px;\n}\n\n.dshft-card {\n  box-sizing: border-box;\n  flex: 1 1 148px;\n  min-width: 148px;\n  max-width: 230px;\n  display: flex;\n  flex-direction: column;\n  gap: 6px;\n  padding: 10px;\n  border: 0.5px solid var(--dsw-alias-border-l4);\n  border-radius: var(--dsw-radius-md);\n  background: var(--dsw-alias-bg-layer-2);\n  color: var(--dsw-alias-label-primary);\n  font: inherit;\n  text-align: left;\n  cursor: pointer;\n  transition: border-color var(--ds-transition-duration-fast) var(--ds-ease-in-out),\n    background-color var(--ds-transition-duration-fast) var(--ds-ease-in-out);\n}\n\n.dshft-card:hover {\n  background: var(--dsw-alias-bg-layer-3);\n  border-color: var(--ft-accent, var(--dsw-alias-border-l4));\n}\n\n.dshft-card[data-active=\"true\"] {\n  border-color: var(--ft-accent, var(--dsw-alias-brand-primary));\n  box-shadow: inset 0 0 0 1px var(--ft-accent, var(--dsw-alias-brand-primary));\n  background: var(--dsw-alias-bg-layer-3);\n}\n\n.dshft-card:focus-visible,\n.dshft-toggle input:focus-visible {\n  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-brand-primary));\n  outline-offset: 2px;\n}\n\n.dshft-cardSwatches {\n  display: flex;\n  height: 16px;\n  border-radius: 4px;\n  overflow: hidden;\n}\n\n.dshft-swatch {\n  flex: 1 1 0;\n}\n\n.dshft-cardName {\n  font-size: 11px;\n  font-weight: 500;\n  line-height: 16px;\n  letter-spacing: 0.08em;\n  text-transform: uppercase;\n}\n\n.dshft-cardTag {\n  font-size: 11px;\n  line-height: 15px;\n  color: var(--dsw-alias-label-tertiary);\n}\n\n.dshft-cardState {\n  min-height: 12px;\n  font-size: 10px;\n  font-weight: 500;\n  line-height: 12px;\n  letter-spacing: 0.14em;\n  text-transform: uppercase;\n  color: var(--ft-accent, var(--dsw-alias-brand-primary));\n}\n\n.dshft-card--default {\n  flex: 1 1 148px;\n}\n\n.dshft-card--default[data-active=\"true\"] {\n  --ft-accent: var(--dsw-alias-brand-primary);\n}\n\n.dshft-cardSwatches--default {\n  opacity: 0.9;\n}\n\n.dshft-foot {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  flex-wrap: wrap;\n  gap: 8px 16px;\n}\n\n.dshft-toggle {\n  display: inline-flex;\n  align-items: center;\n  gap: 8px;\n  color: var(--dsw-alias-label-secondary);\n  font-size: 12px;\n  line-height: 18px;\n  cursor: pointer;\n}\n\n.dshft-toggle input {\n  accent-color: var(--dsw-alias-brand-primary);\n  cursor: pointer;\n}\n\n.dshft-hint {\n  color: var(--dsw-alias-label-caption);\n  font-size: 11px;\n  line-height: 16px;\n}\n";
		/** Decorative layer styles (scanlines, grids, glows), theme-scoped. */
		var EFFECTS_CSS = "/* Decorative effect layer. Every rule is gated on the per-theme body\n   attribute AND on the effects switch, so turning decorations off is one\n   localStorage flag away and reduced motion never animates. Theme sheets\n   below paint #dsh-ft-overlay::before / ::after. */\n\n/* Nostromo Amber — amber CRT phosphor: warm phosphor film, fine scanlines,\n   edge halation and a soft vignette. Decorative only: paints the plugin's\n   #dsh-ft-overlay pseudo-elements, never app content, never pointer events.\n   Frozen in place — no animation, so reduced-motion is safe by construction. */\nbody[data-dsh-futuristic-theme=\"nostromo-amber\"][data-dsh-futuristic-effects=\"on\"] #dsh-ft-overlay::before {\n  background-color: rgba(255, 176, 0, 0.08); /* ≈0.027 effective amber film, warms the black */\n  background-image: repeating-linear-gradient(\n    to bottom,\n    rgba(0, 0, 0, 0.4) 0px,\n    rgba(0, 0, 0, 0.4) 1px,\n    rgba(0, 0, 0, 0) 1px,\n    rgba(0, 0, 0, 0) 3px\n  );\n  opacity: 0.23; /* effective scanline alpha ≈ 0.09 — CRT texture, not a readability tax */\n}\n\nbody[data-dsh-futuristic-theme=\"nostromo-amber\"][data-dsh-futuristic-effects=\"on\"] #dsh-ft-overlay::after {\n  background:\n    radial-gradient(ellipse 118% 74% at 50% -13%, rgba(255, 176, 0, 0.095), rgba(255, 176, 0, 0.028) 42%, transparent 68%),\n    radial-gradient(ellipse 92% 82% at 50% 42%, rgba(255, 176, 0, 0.032), transparent 72%),\n    radial-gradient(ellipse 70% 45% at 50% 114%, rgba(255, 128, 0, 0.045), transparent 62%),\n    radial-gradient(ellipse 115% 100% at 50% 44%, transparent 55%, rgba(0, 0, 0, 0.4) 100%);\n  box-shadow: inset 0 0 130px rgba(255, 150, 0, 0.05); /* edge halation, warms the bezel */\n}\n\n/* Omni-tool — holographic projection. A faint cyan projection grid with\n   warm major rules fades in from the top, while orange and cyan corner\n   glows breathe a little light into the page edges. Decorative only:\n   paints the plugin overlay pseudo-elements, never app content, and uses\n   no animation (nothing to slow down or distract during long sessions). */\n\nbody[data-dsh-futuristic-theme=\"omni-tool\"][data-dsh-futuristic-effects=\"on\"] #dsh-ft-overlay::before {\n  background-image:\n    linear-gradient(rgba(63, 208, 255, 0.05) 1px, transparent 1px),\n    linear-gradient(90deg, rgba(63, 208, 255, 0.05) 1px, transparent 1px),\n    linear-gradient(rgba(255, 154, 31, 0.045) 1px, transparent 1px),\n    linear-gradient(90deg, rgba(255, 154, 31, 0.045) 1px, transparent 1px);\n  background-size:\n    42px 42px,\n    42px 42px,\n    168px 168px,\n    168px 168px;\n  -webkit-mask-image: radial-gradient(ellipse 92% 64% at 50% 0%, #000 0%, rgba(0, 0, 0, 0.55) 44%, transparent 82%);\n  mask-image: radial-gradient(ellipse 92% 64% at 50% 0%, #000 0%, rgba(0, 0, 0, 0.55) 44%, transparent 82%);\n}\n\nbody[data-dsh-futuristic-theme=\"omni-tool\"][data-dsh-futuristic-effects=\"on\"] #dsh-ft-overlay::after {\n  background:\n    radial-gradient(ellipse 52% 34% at 2% -5%, rgba(255, 154, 31, 0.09), transparent 62%),\n    radial-gradient(ellipse 50% 34% at 100% -7%, rgba(63, 208, 255, 0.08), transparent 66%),\n    radial-gradient(ellipse 60% 42% at 103% 106%, rgba(63, 208, 255, 0.06), transparent 64%),\n    linear-gradient(to top, rgba(255, 154, 31, 0.045), transparent 15%),\n    radial-gradient(ellipse 120% 106% at 50% 42%, transparent 58%, rgba(0, 0, 0, 0.3) 100%);\n}\n\n/* Pure Reflection — City of Glass: sterile white architecture, a cool daylight\n   wash, Runner's-Vision red corner marks and a small blue/orange/yellow\n   district signature. No scanlines, no noise, no flicker, no glow and no\n   animation: the effect is signage on the city, not a texture on the text.\n   Decorative only — paints the plugin's #dsh-ft-overlay pseudo-elements,\n   never app content, never pointer events. */\n\nbody[data-dsh-futuristic-theme=\"pure-reflection\"][data-dsh-futuristic-effects=\"on\"] #dsh-ft-overlay::before {\n  background:\n    /* Runner's Vision: a red L-bracket in the top-right corner, marking the route. */\n    linear-gradient(to right, rgba(225, 6, 0, 0.55), rgba(225, 6, 0, 0.55)) 100% 0 / 26px 1px no-repeat,\n    linear-gradient(to bottom, rgba(225, 6, 0, 0.55), rgba(225, 6, 0, 0.55)) 100% 0 / 1px 26px no-repeat,\n    /* Overhead daylight: white at the top edge, dying out above the first row of cards. */\n    radial-gradient(ellipse 118% 52% at 50% -14%, rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0) 64%),\n    /* Cool floor bounce along the bottom edge — grey shadow under white walls. */\n    radial-gradient(ellipse 92% 38% at 50% 112%, rgba(201, 208, 214, 0.38), rgba(201, 208, 214, 0) 68%),\n    /* A restrained vignette seats the white canvas in its frame. */\n    radial-gradient(ellipse 128% 104% at 50% 48%, transparent 66%, rgba(20, 24, 28, 0.05) 100%);\n}\n\nbody[data-dsh-futuristic-theme=\"pure-reflection\"][data-dsh-futuristic-effects=\"on\"] #dsh-ft-overlay::after {\n  background:\n    /* The matching red route bracket in the bottom-right corner. */\n    linear-gradient(to right, rgba(225, 6, 0, 0.55), rgba(225, 6, 0, 0.55)) 100% 100% / 26px 1px no-repeat,\n    linear-gradient(to bottom, rgba(225, 6, 0, 0.55), rgba(225, 6, 0, 0.55)) 100% 100% / 1px 26px no-repeat,\n    /* One chamfered corner: a red hairline cut 58 px in from the bottom-right. */\n    linear-gradient(135deg, rgba(225, 6, 0, 0.38) 0px, rgba(225, 6, 0, 0.38) 1px, transparent 1px) 100% 100% / 58px 58px no-repeat,\n    /* District signature: business blue, residential orange, technical yellow. */\n    linear-gradient(to right, rgba(30, 111, 217, 0.7), rgba(30, 111, 217, 0.7)) 0 calc(100% - 9px) / 22px 1px no-repeat,\n    linear-gradient(to right, rgba(247, 103, 7, 0.7), rgba(247, 103, 7, 0.7)) 0 calc(100% - 5px) / 22px 1px no-repeat,\n    linear-gradient(to right, rgba(242, 194, 0, 0.8), rgba(242, 194, 0, 0.8)) 0 100% / 22px 1px no-repeat;\n}\n\n/* Renaissance Steel — cold station console, decorative layer kept deliberately\n   quiet: a cool overhead light, a hairline steel bezel at the viewport edge\n   (the concept's double frame) and a soft edge vignette. No scanlines, no\n   animation. The base theme is complete without this layer. */\n\nbody[data-dsh-futuristic-theme=\"renaissance-steel\"][data-dsh-futuristic-effects=\"on\"] #dsh-ft-overlay::before {\n  /* Overhead light: pools on the top edge and dies out before the reading area. */\n  background:\n    radial-gradient(130% 55% at 50% -12%, rgba(154, 215, 255, 0.06) 0%, rgba(154, 215, 255, 0.02) 46%, transparent 72%),\n    linear-gradient(180deg, rgba(188, 208, 224, 0.035) 0%, transparent 15%);\n}\n\nbody[data-dsh-futuristic-theme=\"renaissance-steel\"][data-dsh-futuristic-effects=\"on\"] #dsh-ft-overlay::after {\n  /* Hairline bezel — 1 px cold steel line plus a quieter line 4 px inside,\n     then a restrained vignette that seats the console in its frame. */\n  background:\n    linear-gradient(to right, rgba(120, 172, 204, 0.11), rgba(120, 172, 204, 0.11)) 0 0 / 100% 1px no-repeat,\n    linear-gradient(to right, rgba(120, 172, 204, 0.11), rgba(120, 172, 204, 0.11)) 0 100% / 100% 1px no-repeat,\n    linear-gradient(to bottom, rgba(120, 172, 204, 0.11), rgba(120, 172, 204, 0.11)) 0 0 / 1px 100% no-repeat,\n    linear-gradient(to bottom, rgba(120, 172, 204, 0.11), rgba(120, 172, 204, 0.11)) 100% 0 / 1px 100% no-repeat,\n    linear-gradient(to right, rgba(120, 172, 204, 0.04), rgba(120, 172, 204, 0.04)) 0 4px / 100% 1px no-repeat,\n    linear-gradient(to right, rgba(120, 172, 204, 0.04), rgba(120, 172, 204, 0.04)) 0 calc(100% - 5px) / 100% 1px no-repeat,\n    linear-gradient(to bottom, rgba(120, 172, 204, 0.04), rgba(120, 172, 204, 0.04)) 4px 0 / 1px 100% no-repeat,\n    linear-gradient(to bottom, rgba(120, 172, 204, 0.04), rgba(120, 172, 204, 0.04)) calc(100% - 5px) 0 / 1px 100% no-repeat,\n    /* Corner emphasis — short brighter segments, like the concept's chamfered frame corners. */\n    linear-gradient(to right, rgba(120, 172, 204, 0.06), rgba(120, 172, 204, 0.06)) 0 0 / 40px 1px no-repeat,\n    linear-gradient(to right, rgba(120, 172, 204, 0.06), rgba(120, 172, 204, 0.06)) 100% 0 / 40px 1px no-repeat,\n    linear-gradient(to right, rgba(120, 172, 204, 0.06), rgba(120, 172, 204, 0.06)) 0 100% / 40px 1px no-repeat,\n    linear-gradient(to right, rgba(120, 172, 204, 0.06), rgba(120, 172, 204, 0.06)) 100% 100% / 40px 1px no-repeat,\n    linear-gradient(to bottom, rgba(120, 172, 204, 0.06), rgba(120, 172, 204, 0.06)) 0 0 / 1px 40px no-repeat,\n    linear-gradient(to bottom, rgba(120, 172, 204, 0.06), rgba(120, 172, 204, 0.06)) 100% 0 / 1px 40px no-repeat,\n    linear-gradient(to bottom, rgba(120, 172, 204, 0.06), rgba(120, 172, 204, 0.06)) 0 100% / 1px 40px no-repeat,\n    linear-gradient(to bottom, rgba(120, 172, 204, 0.06), rgba(120, 172, 204, 0.06)) 100% 100% / 1px 40px no-repeat,\n    radial-gradient(115% 110% at 50% 50%, transparent 60%, rgba(2, 4, 7, 0.28) 100%);\n}\n";

		var PLUGIN_ID = "dsh-futuristic-themes";
		var NS = "settings.futuristic-themes";
		var DICTS = {
			en: {"title":"Futuristic themes","description":"Four cinematic themes for DeepSeek Harness: three dark terminal-grade skins and one light architectural one. Every theme replaces the whole palette and adds an optional decorative layer.","state.active":"Active","default.label":"Standard appearance","default.tagline":"Built-in light / dark","default.description":"Return to the built-in light or dark appearance selected before.","effects.label":"Decorative effects","hint":"Inter / IBM Plex Mono · light & dark · reduced-motion safe","theme.nostromo-amber.label":"Nostromo Amber","theme.nostromo-amber.tagline":"ALIEN / ROMULUS INSPIRED","theme.nostromo-amber.description":"Amber phosphor CRT terminal on almost-black warm metal: 1 px frames, monospace type, restrained glow.","theme.omni-tool.label":"Omni-tool","theme.omni-tool.tagline":"MASS EFFECT INSPIRED","theme.omni-tool.description":"Holographic HUD: orange action accent on dark blue glass, cold cyan secondary signals and a faint projection grid.","theme.pure-reflection.label":"Pure Reflection","theme.pure-reflection.tagline":"MIRROR'S EDGE INSPIRED","theme.pure-reflection.description":"Runner's-vision red on a sterile white city: light-grey architecture, sharp geometry and functional blue, orange and yellow district accents.","theme.renaissance-steel.label":"Renaissance Steel","theme.renaissance-steel.tagline":"ALIEN: ROMULUS — RENAISSANCE STATION","theme.renaissance-steel.description":"Cold industrial console: flat steel surfaces, 1 px blue-grey frames, clear statuses and almost no glow."},
			zh: {"title":"未来主义主题","description":"为 DeepSeek Harness 提供的四套电影感主题：三套深色终端风格与一套明亮建筑风格。每套主题替换整套配色，并提供可关闭的装饰层。","state.active":"使用中","default.label":"标准外观","default.tagline":"内置浅色 / 深色","default.description":"返回之前选择的内置浅色或深色外观。","effects.label":"装饰效果","hint":"Inter / IBM Plex Mono · 浅色与深色 · 尊重减少动态效果设置","theme.nostromo-amber.label":"诺斯特罗莫 · 琥珀","theme.nostromo-amber.tagline":"灵感源自《异形：夺命舰》","theme.nostromo-amber.description":"近乎全黑的暖金属底色上的琥珀磷光 CRT 终端：1 像素细框、等宽字体与克制的辉光。","theme.omni-tool.label":"万用工具","theme.omni-tool.tagline":"《质量效应》灵感","theme.omni-tool.description":"全息 HUD：深蓝玻璃上的橙色操作强调、冷青色次级信号与微弱投影网格。","theme.pure-reflection.label":"纯净反射","theme.pure-reflection.tagline":"《镜之边缘》启发","theme.pure-reflection.description":"「奔跑者视觉」红色点缀的纯白城市：浅灰建筑、锐利几何，以及蓝、橙、黄构成的功能区配色。","theme.renaissance-steel.label":"复兴钢灰","theme.renaissance-steel.tagline":"异形：罗慕路斯 — 复兴空间站","theme.renaissance-steel.description":"冷峻工业控制台：平坦钢灰表面、1px 蓝灰边框、清晰状态与几乎无辉光。"},
		};

		var STORAGE = {
			active: PLUGIN_ID + ":active",
			effects: PLUGIN_ID + ":effects",
			lastBuiltin: PLUGIN_ID + ":last-builtin",
		};

		var THEME_IDS = THEMES.map(function (theme) {
			return theme.id;
		});

		/* ----------------------------------------------------------------- state */

		var state = { active: null, effects: true, lastBuiltin: "dark" };
		var listeners = new Set();
		var ctxRef = null;
		/** Theme the user wants active (localStorage restored or clicked); survives the async settings adoption. */
		var desired = null;
		/** Last durable built-in preference seen; used to tell an adopt echo from a real choice. */
		var lastDurable = null;
		/** While the host settings read is still landing, a built-in preference must not undo the restored theme. */
		var graceUntil = 0;
		var mounted = false;
		/** Pending deferred re-assert of the saved theme (see scheduleReassert). */
		var reassertTimer = null;
		/** Last theme/change events, for the read-only debug surface. */
		var recentEvents = [];

		function readStorage(key) {
			try {
				return window.localStorage.getItem(key);
			} catch (error) {
				return null;
			}
		}

		function writeStorage(key, value) {
			try {
				if (value === null) window.localStorage.removeItem(key);
				else window.localStorage.setItem(key, value);
			} catch (error) {
				/* storage may be unavailable (private mode); the theme still applies for this page */
			}
		}

		function isThemeId(id) {
			return typeof id === "string" && THEME_IDS.indexOf(id) !== -1;
		}

		function isBuiltinPreference(id) {
			return id === "light" || id === "dark" || id === "system";
		}

		function savedActive() {
			var value = readStorage(STORAGE.active);
			return isThemeId(value) ? value : null;
		}

		function getState() {
			return { active: state.active, effects: state.effects, lastBuiltin: state.lastBuiltin };
		}

		function notify() {
			listeners.forEach(function (listener) {
				try {
					listener();
				} catch (error) {
					console.warn("[" + PLUGIN_ID + "] listener failed", error);
				}
			});
		}

		function subscribe(listener) {
			if (typeof listener !== "function") return function () {};
			listeners.add(listener);
			return function () {
				listeners.delete(listener);
			};
		}

		function setBodyAttributes() {
			if (typeof document === "undefined" || !document.body) return;
			var body = document.body;
			if (state.active !== null) {
				body.setAttribute("data-dsh-futuristic-theme", state.active);
				body.setAttribute("data-dsh-futuristic-effects", state.effects ? "on" : "off");
			} else {
				body.removeAttribute("data-dsh-futuristic-theme");
				body.removeAttribute("data-dsh-futuristic-effects");
			}
		}

		function refresh() {
			setBodyAttributes();
			notify();
		}

		/* ---------------------------------------------------------- selection */

		/**
		* Re-assert the saved theme on a later task.
		*
		* The host presenter (ui-layout) listens to `theme/change` too. Calling
		* `setTheme()` from inside the event handler emits a nested change and the
		* presenter's *outer* snapshot still lands afterwards, which would paint the
		* built-in palette over the restored theme. Deferring the re-assert keeps the
		* final snapshot on our theme regardless of listener order.
		*/
		function scheduleReassert() {
			if (reassertTimer !== null) return;
			reassertTimer = setTimeout(function () {
				reassertTimer = null;
				if (desired === null) return;
				try {
					var current = ctxRef.theme.getTheme();
					if (current !== null && current !== undefined && current.preference === desired) return;
					ctxRef.theme.setTheme(desired);
				} catch (error) {
					desired = null;
				}
			}, 30);
		}

		function onThemeChange(snapshot) {
			if (snapshot === undefined || snapshot === null) return;
			var preference = snapshot.preference;
			recentEvents.push({ preference: preference, at: Date.now() });
			if (recentEvents.length > 12) recentEvents.shift();
			var durableChanged = isBuiltinPreference(preference) && lastDurable !== null && lastDurable !== preference;
			if (isBuiltinPreference(preference)) {
				state.lastBuiltin = preference;
				writeStorage(STORAGE.lastBuiltin, preference);
				lastDurable = preference;
			}
			if (isThemeId(preference)) {
				desired = preference;
				state.active = preference;
				writeStorage(STORAGE.active, preference);
				refresh();
				return;
			}
			// Every settings-document update makes the host runtime adopt its durable
			// built-in preference and republish it, even for unrelated settings. That echo
			// must not end the theme: re-assert. Only a real durable change is a choice.
			if (desired !== null && (Date.now() < graceUntil || !durableChanged)) {
				scheduleReassert();
				return;
			}
			if (state.active !== null) {
				// A built-in appearance was chosen deliberately: step out of the theme.
				state.active = null;
				desired = null;
				writeStorage(STORAGE.active, null);
			}
			refresh();
		}

		/**
		* End the boot-restore grace window as soon as the user interacts with the
		* Settings dialog. The window exists only for the asynchronous settings
		* adoption at boot; a deliberate built-in appearance choice made from the
		* dialog must never be mistaken for that late adoption.
		*/
		function cancelBootGrace() {
			graceUntil = 0;
			if (reassertTimer !== null) {
				clearTimeout(reassertTimer);
				reassertTimer = null;
			}
		}

		/**
		* Capture-phase click hook: any click inside a settings dialog outside our
		* own row belongs to the host UI (e.g. the official Light/Dark/System
		* cubes), so it ends the boot grace window before the built-in preference
		* event reaches onThemeChange.
		*/
		function onDocumentClick(event) {
			var target = event && event.target;
			if (target === null || target === undefined || typeof target.closest !== "function") return;
			if (target.closest('[role="dialog"]') === null) return;
			if (target.closest(".dshft") !== null) return;
			cancelBootGrace();
		}

		function selectTheme(id) {
			if (!isThemeId(id) || ctxRef === null) return;
			desired = id;
			try {
				ctxRef.theme.setTheme(id);
			} catch (error) {
				console.warn("[" + PLUGIN_ID + "] cannot activate theme " + id, error);
				desired = null;
			}
		}

		function selectDefault() {
			if (ctxRef === null) return;
			desired = null;
			state.active = null;
			writeStorage(STORAGE.active, null);
			refresh();
			try {
				ctxRef.theme.setTheme(state.lastBuiltin || "dark");
			} catch (error) {
				console.warn("[" + PLUGIN_ID + "] cannot restore the built-in appearance", error);
			}
		}

		function setEffects(on) {
			state.effects = on === true;
			writeStorage(STORAGE.effects, state.effects ? "on" : "off");
			refresh();
		}

		/* -------------------------------------------------------------- styles */

		function mountStyle() {
			var style = document.createElement("style");
			style.dataset.plugin = PLUGIN_ID;
			style.textContent = ROW_CSS + "\n" + EFFECTS_CSS;
			document.head.appendChild(style);
			var overlay = document.createElement("div");
			overlay.id = "dsh-ft-overlay";
			overlay.setAttribute("aria-hidden", "true");
			document.body.appendChild(overlay);
			return function () {
				if (style.parentNode) style.parentNode.removeChild(style);
				if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
			};
		}

		/* ---------------------------------------------------------- appearance row */

		function FuturisticThemesRow(props) {
			var t = typeof props.t === "function" ? props.t : function (key) { return key; };
			var initial = typeof props.getFuturisticThemeState === "function" ? props.getFuturisticThemeState() : getState();
			var pair = React.useState(initial);
			var snapshot = pair[0];
			var setSnapshot = pair[1];
			React.useEffect(function () {
				if (typeof props.subscribeFuturisticTheme !== "function") return undefined;
				return props.subscribeFuturisticTheme(function () {
					setSnapshot(props.getFuturisticThemeState());
				});
			}, []);
			var active = snapshot.active;

			var cards = THEMES.map(function (theme) {
				var selected = active === theme.id;
				return React.createElement(
					"button",
					{
						key: theme.id,
						type: "button",
						className: "dshft-card",
						"data-active": selected ? "true" : "false",
						"aria-pressed": selected ? "true" : "false",
						title: t("theme." + theme.id + ".description"),
						style: { "--ft-accent": theme.accent },
						onClick: function () {
							if (props.selectFuturisticTheme) props.selectFuturisticTheme(theme.id);
						},
					},
					React.createElement(
						"span",
						{ className: "dshft-cardSwatches", "aria-hidden": "true" },
						theme.swatches.map(function (colour, index) {
							return React.createElement("span", {
								key: index,
								className: "dshft-swatch",
								style: { backgroundColor: colour },
							});
						}),
					),
					React.createElement("span", { className: "dshft-cardName" }, t("theme." + theme.id + ".label")),
					React.createElement("span", { className: "dshft-cardTag" }, t("theme." + theme.id + ".tagline")),
					React.createElement(
						"span",
						{ className: "dshft-cardState", "aria-hidden": "true" },
						selected ? t("state.active") : "",
					),
				);
			});

			var defaultButton = React.createElement(
				"button",
				{
					type: "button",
					className: "dshft-card dshft-card--default",
					"data-active": active === null ? "true" : "false",
					"aria-pressed": active === null ? "true" : "false",
					title: t("default.description"),
					onClick: function () {
						if (props.selectDefaultAppearance) props.selectDefaultAppearance();
					},
				},
				React.createElement(
					"span",
					{ className: "dshft-cardSwatches dshft-cardSwatches--default", "aria-hidden": "true" },
					React.createElement("span", { className: "dshft-swatch", style: { backgroundColor: "#151517" } }),
					React.createElement("span", { className: "dshft-swatch", style: { backgroundColor: "#303136" } }),
					React.createElement("span", { className: "dshft-swatch", style: { backgroundColor: "#f9fafb" } }),
					React.createElement("span", { className: "dshft-swatch", style: { backgroundColor: "#4176e6" } }),
				),
				React.createElement("span", { className: "dshft-cardName" }, t("default.label")),
				React.createElement("span", { className: "dshft-cardTag" }, t("default.tagline")),
				React.createElement(
					"span",
					{ className: "dshft-cardState", "aria-hidden": "true" },
					active === null ? t("state.active") : "",
				),
			);

			var effects = React.createElement(
				"label",
				{ className: "dshft-toggle" },
				React.createElement("input", {
					type: "checkbox",
					checked: snapshot.effects === true,
					onChange: function (event) {
						if (props.setFuturisticEffects) props.setFuturisticEffects(event.target.checked === true);
					},
				}),
				React.createElement("span", null, t("effects.label")),
			);

			return React.createElement(
				"div",
				{ className: "dshft" },
				React.createElement(
					"div",
					{ className: "dshft-head" },
					React.createElement("div", { className: "dshft-title" }, t("title")),
					React.createElement("div", { className: "dshft-desc" }, t("description")),
				),
				React.createElement("div", { className: "dshft-cards", role: "group", "aria-label": t("title") }, cards, defaultButton),
				React.createElement(
					"div",
					{ className: "dshft-foot" },
					effects,
					React.createElement("span", { className: "dshft-hint" }, t("hint")),
				),
			);
		}

		/* ---------------------------------------------------------------- plugin */

		function apply(ctx) {
			ctxRef = ctx;
			mounted = true;
			if (typeof window !== "undefined") window.__dshFuturisticThemes = { debug: debugState };

			try {
				state.effects = readStorage(STORAGE.effects) !== "off";
				var savedBuiltin = readStorage(STORAGE.lastBuiltin);
				if (isBuiltinPreference(savedBuiltin)) state.lastBuiltin = savedBuiltin;
			} catch (error) {
				/* defaults are fine */
			}

			ctx.effect(function () {
				return ctx.locale.register(NS, DICTS);
			}, PLUGIN_ID + ": appearance row dictionaries");

			var disposers = [];
			ctx.effect(
				function () {
					for (var index = 0; index < THEMES.length; index++) {
						var theme = THEMES[index];
						try {
							disposers.push(
								ctx.theme.register({
									id: theme.id,
									colorScheme: theme.colorScheme,
									tokens: theme.tokens,
								}),
							);
						} catch (error) {
							console.warn("[" + PLUGIN_ID + "] cannot register theme " + theme.id, error);
						}
					}
					return function () {
						while (disposers.length > 0) {
							try {
								disposers.pop()();
							} catch (error) {
								/* already gone */
							}
						}
					};
				},
				PLUGIN_ID + ": theme definitions",
			);

			ctx.effect(function () {
				return mountStyle();
			}, PLUGIN_ID + ": styles");

			ctx.effect(function () {
				var off = ctx.on("theme/change", onThemeChange);
				return function () {
					if (typeof off === "function") off();
				};
			}, PLUGIN_ID + ": theme change listener");

			ctx.effect(function () {
				if (typeof document === "undefined") return function () {};
				document.addEventListener("click", onDocumentClick, true);
				return function () {
					document.removeEventListener("click", onDocumentClick, true);
				};
			}, PLUGIN_ID + ": settings-interaction grace cancel");

			// Restore the last selection and re-apply it if the durable built-in
			// preference lands late (the settings read is asynchronous).
			desired = savedActive();
			graceUntil = Date.now() + 5000;
			lastDurable = state.lastBuiltin;
			var bootSnapshot = ctx.theme.getTheme();
			if (bootSnapshot && isBuiltinPreference(bootSnapshot.preference)) {
				lastDurable = bootSnapshot.preference;
			}
			onThemeChange(bootSnapshot);
			if (desired !== null) {
				try {
					ctx.theme.setTheme(desired);
				} catch (error) {
					desired = null;
					writeStorage(STORAGE.active, null);
					console.warn("[" + PLUGIN_ID + "] cannot restore theme", error);
				}
			}
			setBodyAttributes();

			ctx.effect(
				function () {
					return function () {
						mounted = false;
						if (reassertTimer !== null) {
							clearTimeout(reassertTimer);
							reassertTimer = null;
						}
						listeners.clear();
						if (typeof document !== "undefined" && document.body) {
							document.body.removeAttribute("data-dsh-futuristic-theme");
							document.body.removeAttribute("data-dsh-futuristic-effects");
						}
					};
				},
				PLUGIN_ID + ": body attributes",
			);

			try {
				ctx.slots.inject("settings.general.item", function () {
					return ctx.slots.register(
						{
							name: "settings.general.item",
							id: "futuristic-themes",
							order: 12,
							locale: NS,
							inject: function () {
								return {
									getFuturisticThemeState: getState,
									subscribeFuturisticTheme: subscribe,
									selectFuturisticTheme: selectTheme,
									selectDefaultAppearance: selectDefault,
									setFuturisticEffects: setEffects,
								};
							},
						},
						FuturisticThemesRow,
					);
				});
			} catch (error) {
				console.warn("[" + PLUGIN_ID + "] appearance row unavailable", error);
			}
		}

		// Debug surface (read-only): lets verification harnesses compare what the
		// plugin believes with what the host theme runtime resolved.
		function debugState() {
			var snapshot = null;
			try {
				snapshot = ctxRef && ctxRef.theme ? ctxRef.theme.getTheme() : null;
			} catch (error) {
				snapshot = null;
			}
			return {
				state: getState(),
				desired: desired,
				lastDurable: lastDurable,
				mounted: mounted,
				graceUntil: graceUntil,
				now: Date.now(),
				reassertPending: reassertTimer !== null,
				recentEvents: recentEvents.slice(),
				themeIds: THEME_IDS,
				host: snapshot === null ? null : {
					preference: snapshot.preference,
					activeId: snapshot.active ? snapshot.active.id : null,
					tokenCount: snapshot.active ? Object.keys(snapshot.active.tokens).length : 0,
					themeCount: snapshot.themes ? snapshot.themes.length : 0,
				},
			};
		}

		exports.apply = apply;
		exports.inject = ["slots", "locale", "theme"];
		exports.debugState = debugState;
		return module.exports;
	},
});
