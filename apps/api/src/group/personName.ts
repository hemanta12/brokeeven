// Person names are user-entered and surface sentence-initially everywhere —
// member chips, "Alice paid Bob", the activity log. Store them with a capital
// first letter so no reader has to mentally fix "alice added an expense".
// Only the first character: uppercasing the rest would wreck "de Souza",
// "van Dijk", "McKay".
export function normalizePersonName(raw: string): string {
  const trimmed = raw.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}
