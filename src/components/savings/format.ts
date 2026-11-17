import { colors } from "@/components/ui/theme";
import type { SavingsPlan } from "@/types/finance";

export const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export const WEEK_DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function currentMonthKey() {
  const d = new Date();
  return `${MONTH_NAMES[d.getMonth()]}-${d.getFullYear()}`;
}

export function fmt(v: number) {
  const abs = `৳${Math.abs(v).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  return v < 0 ? `-${abs}` : abs;
}

export function displayDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

/** dd/mm */
export function shortDate(iso: string) {
  return displayDate(iso).slice(0, 5);
}

export function progressColor(pct: number) {
  return pct >= 100 ? colors.green[500] : pct >= 50 ? colors.teal[500] : colors.amber[500];
}

/** "৳1,200 to go" / "Target reached" / "৳300 over target" */
export function remainingLabel(saved: number, target: number | null | undefined) {
  if (target === null || target === undefined || target <= 0) return null;
  const diff = target - saved;
  if (diff > 0) return `${fmt(diff)} to go`;
  if (diff === 0) return "Target reached";
  return `${fmt(-diff)} over target`;
}

export function targetSummary(plan: SavingsPlan) {
  const parts: string[] = [];
  if (plan.monthTargets.length > 0) {
    const names = plan.monthTargets.map((t) => MONTH_NAMES[t.month - 1]).join(", ");
    parts.push(`${plan.monthTargets.length} months (${names})`);
  } else if (plan.monthlyTarget !== null) {
    parts.push(`${fmt(plan.monthlyTarget)}/month`);
  }
  if (plan.weeklyTarget !== null) parts.push(`${fmt(plan.weeklyTarget)}/week`);
  if (plan.yearlyTarget !== null) parts.push(`${fmt(plan.yearlyTarget)}/year`);
  return parts.length ? parts.join(" · ") : "No target";
}

export function hasMonthlyTargets(plan: SavingsPlan) {
  return plan.monthTargets.length > 0 || plan.monthlyTarget !== null;
}
