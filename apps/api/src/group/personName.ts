// Capitalize only the first character so names read correctly sentence-initially
// (chips, "Alice paid Bob", activity log). Uppercasing the rest would wreck
// "de Souza", "van Dijk", "McKay".
export function normalizePersonName(raw: string): string {
  const trimmed = raw.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}
