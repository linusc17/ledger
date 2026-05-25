import { cn } from "@/lib/cn";

type Slice = { value: number; color: string; key: string };

export function SpendDonut({
  byCategory,
  total,
  className,
}: {
  byCategory: { needed: number; unnecessary: number; other: number };
  total: number;
  className?: string;
}) {
  const slices: Slice[] = [
    { key: "needed", value: byCategory.needed, color: "var(--success)" },
    { key: "unnecessary", value: byCategory.unnecessary, color: "var(--accent)" },
    { key: "other", value: byCategory.other, color: "var(--muted)" },
  ];

  const size = 160;
  const stroke = 18;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const cx = size / 2;
  const cy = size / 2;

  const isEmpty = total <= 0;
  let offset = 0;

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth={stroke}
        />
        {!isEmpty &&
          slices.map((s) => {
            if (s.value <= 0) return null;
            const frac = s.value / total;
            const dash = frac * c;
            const seg = (
              <circle
                key={s.key}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${c - dash}`}
                strokeDashoffset={-offset}
                transform={`rotate(-90 ${cx} ${cy})`}
                strokeLinecap="butt"
              />
            );
            offset += dash;
            return seg;
          })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        {isEmpty ? (
          <span className="text-sm text-muted">No spending yet</span>
        ) : (
          <>
            <span className="text-2xl font-semibold tabular-nums">
              ₱{total.toLocaleString()}
            </span>
            <span className="text-xs text-muted">this month</span>
          </>
        )}
      </div>
    </div>
  );
}
