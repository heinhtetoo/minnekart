// Trip ids are UUIDs, and Postgres rejects anything else with an error. Pages
// check the format first, so a cut-off or malformed address is simply not
// found rather than a server error. Any UUID Postgres accepts passes (no
// version check), so a valid id is never refused.
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isTripId(value: string): boolean {
  return UUID_PATTERN.test(value);
}
