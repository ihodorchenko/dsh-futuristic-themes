/**
 * Host half of dsh-futuristic-themes.
 *
 * The bundle only needs the browser half: the theme registry, the appearance
 * row and the decorative effect layer all live in the client module. This
 * plugin intentionally registers no Host service, route, tool or setting
 * namespace, so mounting it can never affect a session.
 */
export function apply() {}
