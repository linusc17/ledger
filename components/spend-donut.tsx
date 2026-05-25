import { cn } from "@/lib/cn";

export type DonutSlice = {
  key: string;
  label: string;
  value: number;
  color: string;
};

export function SpendDonut({
  slices,
  centerLabel,
  centerSubtitle,
  className,
}: {
  slices: DonutSlice[];
  centerLabel: string;
  centerSubtitle?: string;
  className?: string;
}) {
  const size = 160;
  const stroke = 18;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const cx = size / 2;
  const cy = size / 2;

  const total = slices.reduce((acc, s) => acc + s.value, 0);
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
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4 text-center">
        {isEmpty ? (
          <span className="text-sm text-muted">No activity yet</span>
        ) : (
          <>
            <span className="text-2xl font-semibold tabular-nums">{centerLabel}</span>
            {centerSubtitle && (
              <span className="text-xs text-muted">{centerSubtitle}</span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
