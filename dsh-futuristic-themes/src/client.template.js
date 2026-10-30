/**
 * dsh-futuristic-themes — browser half.
 *
 * Registers three dark cinematic themes with the host theme registry
 * (`ctx.theme`), restores the last selection across restarts from
 * localStorage, keeps the decorative effect layer in sync, and contributes an
 * Appearance row to Settings → General so the themes are switchable without a
 * page of their own.
 *
 * The selection is intentionally NOT written to `ui-theme.preference`: the host
 * settings schema only accepts light/dark/system, and a third-party theme id
 * there would make `ThemeRuntime.buildSnapshot()` throw at boot. The durable
 * preference therefore stays a built-in value (`dark` while one of these
 * themes is active) and the selected skin lives in localStorage.
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
		};

		/** Monospace stack shared by the three themes; the first installed wins. */
		var MONO =
			'"IBM Plex Mono", "JetBrains Mono", "Roboto Mono", "SF Mono", Menlo, Consolas, monospace';

		var THEME_IDS = THEMES.map(function (theme) {
			return theme.id;
		});

		/* ----------------------------------------------------------------- state */

		var state = { active: null, effects: true, lastBuiltin: "dark" };
		var listeners = new Set();
		var ctxRef = null;
		/** Theme the user wants active (localStorage restored or clicked); survives the async settings adoption. */
		var desired = null;
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
				if (desired === null || Date.now() > graceUntil) return;
				try {
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
			if (isBuiltinPreference(preference)) {
				state.lastBuiltin = preference;
				writeStorage(STORAGE.lastBuiltin, preference);
			}
			if (isThemeId(preference)) {
				desired = preference;
				state.active = preference;
				writeStorage(STORAGE.active, preference);
				refresh();
				return;
			}
			// The host restored its durable built-in preference after we re-applied the
			// saved theme (settings arrive asynchronously): re-assert once, briefly.
			if (desired !== null && Date.now() < graceUntil) {
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
			onThemeChange(ctx.theme.getTheme());
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
