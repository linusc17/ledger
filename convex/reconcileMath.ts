export type GapInput = {
  prevNetWorth: number;
  trackedIncome: number;
  trackedBills: number;
  trackedSpend: number;
  actualNetWorth: number;
};

/**
 * Net-worth reconciliation. Expected net worth = previous checkpoint plus what
 * we tracked (income in, bills + spend out). The gap against the actual balance
 * is the spending (or income) that was never logged.
 *   gap > 0 -> forgotten spending; gap < 0 -> money beyond what was tracked.
 */
export function computeGap(input: GapInput): number {
  const expected =
    input.prevNetWorth + input.trackedIncome - input.trackedBills - input.trackedSpend;
  return expected - input.actualNetWorth;
}
