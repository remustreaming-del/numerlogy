// Client-safe: which cross aspects the reading, the wheel and the PDF show.
import type { CoupleChart, CrossAspect } from "./synastry.ts";

export const MAX_CROSS_ASPECTS = 12;

/**
 * The highest-ranked aspects, each pair-and-family only once: when the same pair repeats in the
 * other direction with the same family (A's Venus–B's Mars and A's Mars–B's Venus, both trines),
 * the text would repeat, so the first one is marked as doubled instead.
 */
export function selectCrossAspects(couple: Pick<CoupleChart, "aspects">) {
  const chosen: { aspect: CrossAspect; doubled: boolean }[] = [];
  const seen = new Map<string, number>();
  for (const aspect of couple.aspects) {
    const id = `${aspect.key}|${aspect.family}`;
    const index = seen.get(id);
    if (index != null) { chosen[index].doubled = true; continue; }
    if (chosen.length >= MAX_CROSS_ASPECTS) continue;
    seen.set(id, chosen.length);
    chosen.push({ aspect, doubled: false });
  }
  return chosen;
}
