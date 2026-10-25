import fixtures from "./data/properties.json";

export const propertyIds: string[] = fixtures.map((property) => property.id);

// Matches an id from a URL the way the lookup box does (trimmed, case-insensitive)
// and returns the canonical id, or null when there is no such property.
export function canonicalId(raw: string): string | null {
  let decoded = raw;
  try { decoded = decodeURIComponent(raw); } catch { /* keep the raw segment */ }
  const wanted = decoded.trim().toLowerCase();
  return propertyIds.find((id) => id.toLowerCase() === wanted) ?? null;
}
