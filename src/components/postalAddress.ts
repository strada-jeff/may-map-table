/** "Street, City, ST ZIP" -> street on one line, the rest on the next,
 * as an envelope would have it. Already-broken addresses pass through.
 * Render with `white-space: pre` / `pre-line` so the break shows. */
export function postalAddress(address: string) {
  if (address.includes("\n")) return address;
  const comma = address.indexOf(",");
  if (comma === -1) return address;
  return `${address.slice(0, comma)}\n${address.slice(comma + 1).trim()}`;
}
