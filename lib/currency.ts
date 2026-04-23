export function peso(n: number | undefined): string {
  if (!n) return "—";
  return `₱${n.toLocaleString()}`;
}
