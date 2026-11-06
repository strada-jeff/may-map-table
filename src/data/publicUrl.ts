/**
 * A file in public/, addressed from the app's base path. The build serves the
 * app from /table/ on the WordPress host (vite.config.ts), so a root path like
 * "/overview.jpg" would point at WordPress instead. Absolute URLs pass through.
 */
export function publicUrl(path: string): string {
  if (/^[a-z][a-z\d+.-]*:/i.test(path)) return path;
  return import.meta.env.BASE_URL + path.replace(/^\/+/, "");
}
