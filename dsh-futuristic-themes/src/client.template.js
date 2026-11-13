/**
 * dsh-futuristic-themes — browser half.
 *
 * Registers four cinematic themes (three dark, one light) with the host theme
 * registry (`ctx.theme`), restores the last selection across restarts from
 * localStorage, keeps the decorative effect layer in sync, and contributes an
 * Appearance row to Settings → General so the themes are switchable without a
 * page of their own. The row also offers a Composite mode: the host's
 * Light / Dark / System preference selects which registered theme to apply for
 * each scheme (or the built-in appearance when a slot is empty).
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
	id: "@PLUGIN_ID@",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		var React = require("react");

		/* ------------------------------------------------------------------ data */

		/** Theme definitions: id, colour scheme, labels, swatches, flat tokens. */
		var THEMES = __THEMES__;
		/** Styles for the Appearance row. */
		var ROW_CSS = __ROW_CSS__;
		/** Decorative layer styles (scanlines, grids, glows), theme-scoped. */
		var EFFECTS_CSS = __EFFECTS_CSS__;

		var PLUGIN_ID = "@PLUGIN_ID@";
		var NS = "settings.futuristic-themes";
		var DICTS = {
			en: __LOCALE_EN__,
			zh: __LOCALE_ZH__,
		};

		var STORAGE = {
			active: PLUGIN_ID + ":active",
			effects: PLUGIN_ID + ":effects",
			lastBuiltin: PLUGIN_ID + ":last-builtin",
			composite: PLUGIN_ID + ":composite",
		};

		/** Swatch strip for the Composite card (light + dark city palettes). */
		var COMPOSITE_SWATCHES = ["#EFF1F4", "#E10600", "#E5E9ED", "#0B0804", "#FFB000", "#5FB4E6"];

		var THEME_IDS = THEMES.map(function (theme) {
			return theme.id;
		});

		/* ----------------------------------------------------------------- state */

		var state = {
			active: null,
			effects: true,
			lastBuiltin: "dark",
			composite: { enabled: false, light: null, dark: null },
		};
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
		/** Host scheme (light/dark) last resolved for the Composite mode. */
		var lastScheme = null;
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

		/* ------------------------------------------------------- composite mode */

		function readComposite() {
			var raw = readStorage(STORAGE.composite);
			if (raw === null) return null;
			try {
				var parsed = JSON.parse(raw);
				if (parsed === null || typeof parsed !== "object") return null;
				return {
					enabled: parsed.enabled === true,
					light: isThemeId(parsed.light) ? parsed.light : null,
					dark: isThemeId(parsed.dark) ? parsed.dark : null,
				};
			} catch (error) {
				return null;
			}
		}

		function writeComposite() {
			writeStorage(STORAGE.composite, JSON.stringify(state.composite));
		}

		function bothCompositeSlotsEmpty() {
			return state.composite.light === null && state.composite.dark === null;
		}

		/** The host scheme currently in force (light/dark), independent of the applied theme. */
		function currentHostScheme() {
			if (state.lastBuiltin === "light") return "light";
			if (state.lastBuiltin === "dark") return "dark";
			try {
				if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
					return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
				}
			} catch (error) {
				/* fall through */
			}
			return "light";
		}

		/** Resolve the host scheme from a theme snapshot (used at boot and on changes). */
		function snapshotScheme(snapshot) {
			var preference = snapshot && snapshot.preference;
			if (preference === "light" || preference === "dark") return preference;
			if (preference === "system" && snapshot.active && (snapshot.active.colorScheme === "light" || snapshot.active.colorScheme === "dark")) {
				return snapshot.active.colorScheme;
			}
			return currentHostScheme();
		}

		function getState() {
			return {
				active: state.active,
				effects: state.effects,
				lastBuiltin: state.lastBuiltin,
				composite: {
					enabled: state.composite.enabled,
					light: state.composite.light,
					dark: state.composite.dark,
				},
			};
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

		/**
		* Apply the Composite mapping for a resolved host scheme. A mapped theme
		* goes through the deferred re-assert; an empty slot returns to the host's
		* built-in appearance for that scheme.
		*/
		function applyCompositeForScheme(scheme) {
			if (ctxRef === null) return;
			var mapped = state.composite.enabled ? state.composite[scheme] : null;
			if (isThemeId(mapped)) {
				desired = mapped;
				state.active = mapped;
				writeStorage(STORAGE.active, mapped);
				refresh();
				scheduleReassert();
				return;
			}
			desired = null;
			state.active = null;
			writeStorage(STORAGE.active, null);
			refresh();
			try {
				ctxRef.theme.setTheme(state.lastBuiltin || scheme);
			} catch (error) {
				console.warn("[" + PLUGIN_ID + "] cannot return to the built-in appearance", error);
			}
		}

		function onThemeChange(snapshot) {
			if (snapshot === undefined || snapshot === null) return;
			var preference = snapshot.preference;
			recentEvents.push({ preference: preference, at: Date.now() });
			if (recentEvents.length > 12) recentEvents.shift();
			var builtin = isBuiltinPreference(preference);
			var durableChanged = builtin && lastDurable !== null && lastDurable !== preference;
			if (builtin) {
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
			// Composite mode owns the built-in preference: it is the scheme selector,
			// not an exit from the theme. Map it to the configured theme (or built-in)
			// and re-assert after the host presenter's outer snapshot lands.
			if (state.composite.enabled && builtin) {
				var scheme = snapshotScheme(snapshot);
				lastScheme = scheme;
				var mapped = state.composite[scheme];
				if (isThemeId(mapped)) {
					desired = mapped;
					state.active = mapped;
					writeStorage(STORAGE.active, mapped);
					refresh();
					scheduleReassert();
					return;
				}
				if (state.active !== null || desired !== null) {
					state.active = null;
					desired = null;
					writeStorage(STORAGE.active, null);
				}
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
			// A manual theme choice is an explicit override: leave Composite mode.
			state.composite.enabled = false;
			writeComposite();
			desired = id;
			state.active = id;
			writeStorage(STORAGE.active, id);
			refresh();
			try {
				ctxRef.theme.setTheme(id);
			} catch (error) {
				console.warn("[" + PLUGIN_ID + "] cannot activate theme " + id, error);
				desired = null;
				state.active = null;
				refresh();
			}
		}

		function selectDefault() {
			if (ctxRef === null) return;
			state.composite.enabled = false;
			writeComposite();
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

		/**
		* Enable Composite mode. On the first enable, seed the slots from the
		* currently active manual theme (its own scheme) and the friendly defaults;
		* otherwise keep the saved mapping.
		*/
		function selectComposite() {
			if (ctxRef === null || state.composite.enabled) return;
			if (bothCompositeSlotsEmpty()) {
				var light = "pure-reflection";
				var dark = "nostromo-amber";
				if (isThemeId(state.active)) {
					for (var index = 0; index < THEMES.length; index++) {
						if (THEMES[index].id !== state.active) continue;
						if (THEMES[index].colorScheme === "light") light = state.active;
						else if (THEMES[index].colorScheme === "dark") dark = state.active;
						break;
					}
				}
				state.composite.light = light;
				state.composite.dark = dark;
			}
			if (bothCompositeSlotsEmpty()) return;
			state.composite.enabled = true;
			writeComposite();
			lastScheme = currentHostScheme();
			applyCompositeForScheme(lastScheme);
		}

		/**
		* Change one scheme slot. A null value means "use the built-in appearance
		* for this scheme". If both slots become empty, Composite turns itself off
		* and the host built-in appearance is restored (the agreed behaviour).
		*/
		function setCompositeMapping(scheme, value) {
			if (scheme !== "light" && scheme !== "dark") return;
			state.composite[scheme] = isThemeId(value) ? value : null;
			if (bothCompositeSlotsEmpty()) {
				state.composite.enabled = false;
				writeComposite();
				desired = null;
				state.active = null;
				writeStorage(STORAGE.active, null);
				refresh();
				try {
					if (ctxRef !== null) ctxRef.theme.setTheme(state.lastBuiltin || "system");
				} catch (error) {
					console.warn("[" + PLUGIN_ID + "] cannot return to the built-in appearance", error);
				}
				return;
			}
			writeComposite();
			if (state.composite.enabled) {
				var schemeNow = currentHostScheme();
				if (scheme === schemeNow) applyCompositeForScheme(schemeNow);
				else refresh();
			} else {
				refresh();
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
			var composite = snapshot.composite || { enabled: false, light: null, dark: null };
			var compositeSelected = composite.enabled === true;

			var cards = THEMES.map(function (theme) {
				var selected = !compositeSelected && active === theme.id;
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

			var compositeButton = React.createElement(
				"button",
				{
					type: "button",
					className: "dshft-card dshft-card--composite",
					"data-active": compositeSelected ? "true" : "false",
					"aria-pressed": compositeSelected ? "true" : "false",
					title: t("composite.description"),
					style: { "--ft-accent": "#E10600" },
					onClick: function () {
						if (props.selectCompositeAppearance) props.selectCompositeAppearance();
					},
				},
				React.createElement(
					"span",
					{ className: "dshft-cardSwatches", "aria-hidden": "true" },
					COMPOSITE_SWATCHES.map(function (colour, index) {
						return React.createElement("span", {
							key: index,
							className: "dshft-swatch",
							style: { backgroundColor: colour },
						});
					}),
				),
				React.createElement("span", { className: "dshft-cardName" }, t("composite.label")),
				React.createElement("span", { className: "dshft-cardTag" }, t("composite.tagline")),
				React.createElement(
					"span",
					{ className: "dshft-cardState", "aria-hidden": "true" },
					compositeSelected ? t("state.active") : "",
				),
			);

			var defaultButton = React.createElement(
				"button",
				{
					type: "button",
					className: "dshft-card dshft-card--default",
					"data-active": !compositeSelected && active === null ? "true" : "false",
					"aria-pressed": !compositeSelected && active === null ? "true" : "false",
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
					!compositeSelected && active === null ? t("state.active") : "",
				),
			);

			var compositeControls = null;
			if (compositeSelected) {
				var makeOptions = function () {
					return [React.createElement("option", { key: "builtin", value: "" }, t("composite.builtin"))].concat(
						THEMES.map(function (theme) {
							return React.createElement(
								"option",
								{ key: theme.id, value: theme.id },
								t("theme." + theme.id + ".label") + " · " + (theme.colorScheme === "light" ? t("composite.schemeLight") : t("composite.schemeDark")),
							);
						}),
					);
				};
				var makeField = function (scheme, label) {
					return React.createElement(
						"label",
						{ className: "dshft-field" },
						React.createElement("span", { className: "dshft-fieldLabel" }, label),
						React.createElement(
							"select",
							{
								className: "dshft-select",
								"aria-label": label,
								value: composite[scheme] || "",
								onChange: function (event) {
									if (props.setCompositeMapping) props.setCompositeMapping(scheme, event.target.value || null);
								},
							},
							makeOptions(),
						),
					);
				};
				compositeControls = React.createElement(
					"div",
					{ className: "dshft-composite" },
					makeField("light", t("composite.light")),
					makeField("dark", t("composite.dark")),
					React.createElement("span", { className: "dshft-compositeHint" }, t("composite.hint")),
				);
			}

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
				React.createElement("div", { className: "dshft-cards", role: "group", "aria-label": t("title") }, cards, compositeButton, defaultButton),
				compositeControls,
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
				if (typeof window === "undefined" || typeof window.matchMedia !== "function") return function () {};
				var query = window.matchMedia("(prefers-color-scheme: dark)");
				var listener = function () {
					if (!state.composite.enabled || state.lastBuiltin !== "system") return;
					var scheme = query.matches ? "dark" : "light";
					if (scheme === lastScheme) return;
					lastScheme = scheme;
					applyCompositeForScheme(scheme);
				};
				if (typeof query.addEventListener === "function") query.addEventListener("change", listener);
				else if (typeof query.addListener === "function") query.addListener(listener);
				return function () {
					if (typeof query.removeEventListener === "function") query.removeEventListener("change", listener);
					else if (typeof query.removeListener === "function") query.removeListener(listener);
				};
			}, PLUGIN_ID + ": system scheme changes");

			ctx.effect(function () {
				if (typeof document === "undefined") return function () {};
				document.addEventListener("click", onDocumentClick, true);
				return function () {
					document.removeEventListener("click", onDocumentClick, true);
				};
			}, PLUGIN_ID + ": settings-interaction grace cancel");

			// Restore the last selection and re-apply it if the durable built-in
			// preference lands late (the settings read is asynchronous). With
			// Composite enabled the host scheme picks the theme; a saved manual
			// selection is intentionally ignored.
			state.composite = readComposite() || state.composite;
			if (state.composite.enabled && bothCompositeSlotsEmpty()) {
				state.composite.enabled = false;
				writeComposite();
			}
			desired = state.composite.enabled ? null : savedActive();
			graceUntil = Date.now() + 5000;
			lastDurable = state.lastBuiltin;
			var bootSnapshot = ctx.theme.getTheme();
			if (bootSnapshot && isBuiltinPreference(bootSnapshot.preference)) {
				lastDurable = bootSnapshot.preference;
			}
			onThemeChange(bootSnapshot);
			if (state.composite.enabled) {
				var bootScheme = snapshotScheme(bootSnapshot);
				lastScheme = bootScheme;
				applyCompositeForScheme(bootScheme);
			} else if (desired !== null) {
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
									selectCompositeAppearance: selectComposite,
									setCompositeMapping: setCompositeMapping,
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
				lastScheme: lastScheme,
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
