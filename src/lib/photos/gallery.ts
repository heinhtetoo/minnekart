export function distinctCountries(items: { country: string }[]): string[] {
  const seen = new Set<string>();
  for (const item of items) {
    const country = item.country.trim();
    if (country) {
      seen.add(country);
    }
  }
  return Array.from(seen).sort((a, b) => a.localeCompare(b));
}
