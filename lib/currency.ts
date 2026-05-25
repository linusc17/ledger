export function peso(n: number | undefined): string {
  if (!n) return "—";
  return `₱${n.toLocaleString()}`;
}

export function pesoZero(n: number): string {
  const sign = n < 0 ? "−" : "";
  return `${sign}₱${Math.abs(n).toLocaleString()}`;
}
