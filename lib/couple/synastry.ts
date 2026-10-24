// Couple (synastry) engine. Client-safe: geometry, scores and calibration only.
// Paid interpretation text lives in lib/couple/content and lib/couple/reading.ts
// and must never be imported from client components.
//
// Every number shown to the customer comes from here:
// - cross aspects between the two natal charts (synastry),
// - midpoint composite positions,
// - house overlays (one person's planets in the other's houses),
// - life path numbers,
// - five relationship dimensions plus a tension index, each reported as a
//   percentile against simulated random couples (see calibration.ts), so
//   «78» means «stronger than 78% of random couples», not an invented grade.
import { angularDistance, calculateNatalChart, houseFor, normalize, validateNatalInput, type NatalChart, type NatalInput, type PlanetPosition } from "../astrology.ts";
import { lifePath } from "../codes.ts";
import { ASPECT_NAMES, SIGN_ELEMENT, type AspectType, type Element, type PlanetId } from "../natal/terms.ts";
import { CALIBRATION } from "./calibration.ts";

export type Person = "a" | "b";
export type CrossPoint = PlanetId | "ascendant";
export type AspectFamily = "conjunction" | "harmonious" | "challenging";
export type Dimension = "emotion" | "attraction" | "communication" | "stability" | "values";
export type Metric = Dimension | "tension" | "overall";
export type Level = "high" | "mid" | "low";
export type CalibrationSet = "known2" | "known1" | "known0";

export const DIMENSIONS: Dimension[] = ["emotion", "attraction", "communication", "stability", "values"];
export const METRICS: Metric[] = [...DIMENSIONS, "tension", "overall"];
export const CROSS_ORDER: CrossPoint[] = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "ascendant"];
const PERSONAL: CrossPoint[] = ["sun", "moon", "mercury", "venus", "mars", "ascendant"];
const SOCIAL: CrossPoint[] = ["jupiter", "saturn"];
const OUTER: CrossPoint[] = ["uranus", "neptune", "pluto"];
const OUTER_TARGETS: CrossPoint[] = ["sun", "moon", "venus", "mars", "ascendant"];

export const pairKey = (x: CrossPoint, y: CrossPoint) => CROSS_ORDER.indexOf(x) <= CROSS_ORDER.indexOf(y) ? `${x}-${y}` : `${y}-${x}`;
export const familyOf = (type: AspectType): AspectFamily => type === "conjunction" ? "conjunction" : type === "trine" || type === "sextile" ? "harmonious" : "challenging";

/**
 * Pairs read in synastry: personal points with each other (21), personal points with
 * Jupiter and Saturn (12), and the outer planets with the luminaries, Venus, Mars and
 * the Ascendant (15). Outer–outer and social–social pairs are shared by everyone born
 * within a few years of each other, so they say nothing about this particular couple.
 */
export const CROSS_PAIRS: string[] = (() => {
  const keys = new Set<string>();
  for (const x of PERSONAL) for (const y of PERSONAL) keys.add(pairKey(x, y));
  for (const x of PERSONAL) for (const y of SOCIAL) keys.add(pairKey(x, y));
  for (const x of OUTER_TARGETS) for (const y of OUTER) keys.add(pairKey(x, y));
  return [...keys].sort((p, q) => CROSS_ORDER.indexOf(p.split("-")[0] as CrossPoint) - CROSS_ORDER.indexOf(q.split("-")[0] as CrossPoint) || CROSS_ORDER.indexOf(p.split("-")[1] as CrossPoint) - CROSS_ORDER.indexOf(q.split("-")[1] as CrossPoint));
})();
const CROSS_SET = new Set(CROSS_PAIRS);

// ---------------------------------------------------------------- weights

/** What each point contributes to each dimension. */
const AFFINITY: Record<CrossPoint, Partial<Record<Dimension, number>>> = {
  sun: { values: 1, emotion: 0.4, attraction: 0.3 },
  moon: { emotion: 1, stability: 0.3 },
  mercury: { communication: 1 },
  venus: { attraction: 0.8, emotion: 0.5 },
  mars: { attraction: 0.8 },
  jupiter: { values: 0.8, emotion: 0.3 },
  saturn: { stability: 1 },
  uranus: { attraction: 0.3 },
  neptune: { emotion: 0.3, attraction: 0.3 },
  pluto: { attraction: 0.6, stability: 0.2 },
  ascendant: { attraction: 0.5, emotion: 0.3 },
};

/** Classic couple contacts that weigh more than the average of their two points. */
const PAIR_OVERRIDES: Record<string, Partial<Record<Dimension, number>>> = {
  "sun-moon": { emotion: 1.2, stability: 0.5, values: 0.5 },
  "moon-moon": { emotion: 1.1 },
  "venus-mars": { attraction: 1.3 },
  "sun-venus": { attraction: 0.8, emotion: 0.5 },
  "moon-venus": { emotion: 0.9, attraction: 0.4 },
  "mercury-mercury": { communication: 1.2 },
  "moon-mercury": { communication: 0.8, emotion: 0.4 },
  "sun-mercury": { communication: 0.8, values: 0.3 },
  "sun-sun": { values: 1.1 },
  "sun-saturn": { stability: 1.1, values: 0.3 },
  "moon-saturn": { stability: 1.1, emotion: 0.3 },
  "venus-saturn": { stability: 1.1, attraction: 0.2 },
  "sun-jupiter": { values: 1, emotion: 0.3 },
  "moon-jupiter": { emotion: 0.8, values: 0.4 },
  "venus-jupiter": { attraction: 0.5, emotion: 0.5, values: 0.4 },
  "mars-pluto": { attraction: 0.9 },
  "venus-pluto": { attraction: 1, stability: 0.3 },
  "venus-ascendant": { attraction: 0.9, emotion: 0.3 },
  "mars-ascendant": { attraction: 0.8 },
  "sun-ascendant": { attraction: 0.6, values: 0.4 },
  "moon-ascendant": { emotion: 0.8, attraction: 0.3 },
};

/** Pairs whose square or opposition still pulls two people together (attraction stays positive). */
const MAGNETIC = new Set(["venus-mars", "mars-pluto", "venus-pluto", "sun-moon", "venus-ascendant", "mars-ascendant"]);
/** Pairs whose conjunction carries pressure as well as closeness. */
const VOLATILE_POINTS: CrossPoint[] = ["saturn", "uranus", "neptune", "pluto"];

function importance(x: CrossPoint, y: CrossPoint) {
  const rank = (point: CrossPoint) => point === "sun" || point === "moon" ? 1.2 : point === "venus" || point === "mars" || point === "ascendant" ? 1 : point === "mercury" ? 0.85 : SOCIAL.includes(point) ? 0.8 : 0.6;
  return (rank(x) + rank(y)) / 2;
}

export function pairWeights(key: string): Partial<Record<Dimension, number>> {
  const override = PAIR_OVERRIDES[key];
  if (override) return override;
  const [x, y] = key.split("-") as [CrossPoint, CrossPoint];
  const weights: Partial<Record<Dimension, number>> = {};
  for (const dimension of DIMENSIONS) {
    const value = ((AFFINITY[x][dimension] ?? 0) + (AFFINITY[y][dimension] ?? 0)) / 2;
    if (value > 0) weights[dimension] = value;
  }
  // Mars with Mars, Mercury or Saturn mostly measures how disagreements play out.
  if (key === "mars-mars") weights.attraction = 0.6;
  return weights;
}

// ---------------------------------------------------------------- aspects

/** Synastry orbs are tighter than natal orbs: a contact must be close to be felt between two people. */
export const SYNASTRY_ORBS: Record<AspectType, number> = { conjunction: 7, opposition: 7, square: 6, trine: 6, sextile: 4 };

export function synastryOrb(type: AspectType, x: CrossPoint, y: CrossPoint) {
  let orb = SYNASTRY_ORBS[type];
  if (x === "sun" || x === "moon" || y === "sun" || y === "moon") orb += 1;
  if (OUTER.includes(x) || OUTER.includes(y)) orb -= 1;
  if (x === "ascendant" || y === "ascendant") orb -= 1;
  return orb;
}

export type CrossAspect = {
  /** Point in person A's chart. */
  a: CrossPoint;
  /** Point in person B's chart. */
  b: CrossPoint;
  key: string;
  type: AspectType;
  family: AspectFamily;
  angle: number;
  orb: number;
  maxOrb: number;
  /** 1 at the exact angle, 0 at the edge of the orb. */
  strength: number;
  /** True when a Moon of unknown birth time takes part: its degree can be off by up to ~7°. */
  approximate: boolean;
  /** Ranking weight: how central this contact is to the relationship. */
  rank: number;
};

type Points = Partial<Record<CrossPoint, PlanetPosition>>;
const pointsOf = (chart: NatalChart): Points => {
  const points: Points = {};
  for (const planet of chart.planets) points[planet.id as PlanetId] = planet;
  if (chart.ascendant) points.ascendant = chart.ascendant;
  return points;
};

export function crossAspects(a: NatalChart, b: NatalChart): CrossAspect[] {
  const pa = pointsOf(a), pb = pointsOf(b);
  const result: CrossAspect[] = [];
  for (const x of CROSS_ORDER) for (const y of CROSS_ORDER) {
    const key = pairKey(x, y), left = pa[x], right = pb[y];
    if (!left || !right || !CROSS_SET.has(key)) continue;
    const angle = angularDistance(left.longitude, right.longitude);
    let best: CrossAspect | null = null;
    for (const type of Object.keys(SYNASTRY_ORBS) as AspectType[]) {
      const maxOrb = synastryOrb(type, x, y), orb = Math.abs(angle - ASPECT_NAMES[type].angle);
      if (orb > maxOrb || (best && orb >= best.orb)) continue;
      const strength = 1 - orb / maxOrb;
      const approximate = (x === "moon" && a.input.unknownTime) || (y === "moon" && b.input.unknownTime);
      best = { a: x, b: y, key, type, family: familyOf(type), angle, orb, maxOrb, strength, approximate, rank: importance(x, y) * (0.4 + 0.6 * strength) * (approximate ? 0.6 : 1) };
    }
    if (best) result.push(best);
  }
  return result.sort((p, q) => q.rank - p.rank);
}

// ---------------------------------------------------------------- sign links

/** Steps between two signs along the shorter side of the zodiac: 0 same sign … 6 opposite. */
export const signDistance = (x: number, y: number) => { const d = ((y - x) % 12 + 12) % 12; return d > 6 ? 12 - d : d; };
export type SignLinkKind = "sun-sun" | "moon-moon" | "sun-moon" | "venus-mars" | "mercury-mercury";
export type SignLink = { kind: SignLinkKind; /** Whose first point (Sun of «sun-moon», Venus of «venus-mars»). */ from: Person; first: number; second: number; distance: number; uncertain: boolean };

/** Harmony and tension of a sign distance, used as a baseline when exact aspects are few. */
const DISTANCE_SCORE = [
  { harmony: 0.7, tension: 0 }, { harmony: 0.15, tension: 0.05 }, { harmony: 0.6, tension: 0 }, { harmony: 0.2, tension: 0.35 },
  { harmony: 0.9, tension: 0 }, { harmony: 0.15, tension: 0.15 }, { harmony: 0.5, tension: 0.25 },
];

const moonUncertain = (chart: NatalChart) => !!chart.moonRange && chart.moonRange.start !== chart.moonRange.end;

export function signLinks(a: NatalChart, b: NatalChart): SignLink[] {
  const sign = (chart: NatalChart, id: PlanetId) => chart.planets.find((planet) => planet.id === id)!.signIndex;
  const link = (kind: SignLinkKind, from: Person, x: NatalChart, xId: PlanetId, y: NatalChart, yId: PlanetId): SignLink => ({
    kind, from, first: sign(x, xId), second: sign(y, yId), distance: signDistance(sign(x, xId), sign(y, yId)),
    uncertain: (xId === "moon" && moonUncertain(x)) || (yId === "moon" && moonUncertain(y)),
  });
  return [
    link("sun-sun", "a", a, "sun", b, "sun"),
    link("moon-moon", "a", a, "moon", b, "moon"),
    link("sun-moon", "a", a, "sun", b, "moon"),
    link("sun-moon", "b", b, "sun", a, "moon"),
    link("venus-mars", "a", a, "venus", b, "mars"),
    link("venus-mars", "b", b, "venus", a, "mars"),
    link("mercury-mercury", "a", a, "mercury", b, "mercury"),
  ];
}

const LINK_WEIGHTS: Record<SignLinkKind, Partial<Record<Dimension, number>>> = {
  "sun-sun": { values: 0.6, stability: 0.2 },
  "moon-moon": { emotion: 0.6, stability: 0.2 },
  "sun-moon": { emotion: 0.4, values: 0.2 },
  "venus-mars": { attraction: 0.5 },
  "mercury-mercury": { communication: 0.6 },
};

// ---------------------------------------------------------------- composite and overlays

export type CompositePoint = { id: "sun" | "moon" | "mercury" | "venus" | "mars"; longitude: number; signIndex: number; degree: number; minute: number };
export const COMPOSITE_POINTS: CompositePoint["id"][] = ["sun", "moon", "mercury", "venus", "mars"];

/** Midpoint on the shorter arc: the midpoint of 350° and 10° is 0°, not 180°. */
export function midpoint(x: number, y: number) {
  const d = normalize(y - x);
  return normalize(d <= 180 ? x + d / 2 : x + d / 2 + 180);
}

function compositeOf(a: NatalChart, b: NatalChart): CompositePoint[] {
  return COMPOSITE_POINTS.map((id) => {
    const longitude = midpoint(a.planets.find((planet) => planet.id === id)!.longitude, b.planets.find((planet) => planet.id === id)!.longitude);
    const signIndex = Math.floor(longitude / 30), decimal = longitude - signIndex * 30, degree = Math.floor(decimal);
    return { id, longitude, signIndex, degree, minute: Math.min(59, Math.floor((decimal - degree) * 60 + 1e-9)) };
  });
}

export const OVERLAY_POINTS = ["sun", "moon", "venus", "mars"] as const;
export type OverlayPoint = (typeof OVERLAY_POINTS)[number];
/** `owner`'s planet falls in the other person's house. */
export type Overlay = { owner: Person; planet: OverlayPoint; house: number; approximate: boolean };

function overlaysOf(a: NatalChart, b: NatalChart): Overlay[] {
  const result: Overlay[] = [];
  const add = (owner: Person, planets: NatalChart, houses: NatalChart) => {
    if (!houses.houses) return;
    const cusps = houses.houses.map((cusp) => cusp.longitude);
    for (const id of OVERLAY_POINTS) {
      const planet = planets.planets.find((item) => item.id === id)!;
      result.push({ owner, planet: id, house: houseFor(planet.longitude, cusps), approximate: id === "moon" && planets.input.unknownTime });
    }
  };
  add("a", a, b);
  add("b", b, a);
  return result;
}

// ---------------------------------------------------------------- scores

export type RawScores = Record<Metric, number>;
export type Score = { raw: number; score: number; level: Level };

/** A conjunction with Saturn, an outer planet, or Mars to Mars brings pressure as well as closeness. */
export const isVolatile = (aspect: Pick<CrossAspect, "a" | "b" | "key">) => VOLATILE_POINTS.includes(aspect.a) || VOLATILE_POINTS.includes(aspect.b) || aspect.key === "mars-mars";

/** Harmony and tension one aspect adds before dimension weights. */
export function aspectEffect(aspect: CrossAspect) {
  const s = aspect.strength * (aspect.approximate ? 0.5 : 1);
  if (aspect.family === "harmonious") return { s, harmony: (aspect.type === "trine" ? 1 : 0.8) * s, tension: 0 };
  if (aspect.family === "conjunction") return isVolatile(aspect) ? { s, harmony: 0.55 * s, tension: 0.5 * s } : { s, harmony: 1.1 * s, tension: 0 };
  return aspect.type === "opposition" ? { s, harmony: 0.45 * s, tension: 0.7 * s } : { s, harmony: 0.2 * s, tension: s };
}

/** What one aspect adds to one dimension's raw score (the exact term used by rawScores). */
export function dimensionContribution(aspect: CrossAspect, dimension: Dimension) {
  const weight = pairWeights(aspect.key)[dimension];
  if (!weight) return 0;
  const { s, harmony } = aspectEffect(aspect);
  return (dimension === "attraction" && aspect.family === "challenging" && MAGNETIC.has(aspect.key) ? 0.8 * s : harmony) * weight;
}

export function rawScores(aspects: CrossAspect[], links: SignLink[]): RawScores {
  const raw: RawScores = { emotion: 0, attraction: 0, communication: 0, stability: 0, values: 0, tension: 0, overall: 0 };
  for (const aspect of aspects) {
    for (const dimension of DIMENSIONS) raw[dimension] += dimensionContribution(aspect, dimension);
    raw.tension += aspectEffect(aspect).tension * importance(aspect.a, aspect.b);
  }
  for (const link of links) {
    const base = DISTANCE_SCORE[link.distance], factor = link.uncertain ? 0.5 : 1;
    for (const [dimension, weight] of Object.entries(LINK_WEIGHTS[link.kind]) as [Dimension, number][]) raw[dimension] += base.harmony * weight * factor;
    raw.tension += base.tension * 0.5 * factor;
  }
  raw.overall = 0.25 * raw.emotion + 0.2 * raw.attraction + 0.2 * raw.communication + 0.2 * raw.stability + 0.15 * raw.values - 0.15 * raw.tension;
  return raw;
}

/** Percentile of `raw` among simulated couples, by linear interpolation between 5% breakpoints. */
export function percentile(raw: number, breakpoints: readonly number[]) {
  if (raw <= breakpoints[0]) return 1;
  const last = breakpoints.length - 1;
  if (raw >= breakpoints[last]) return 99;
  for (let index = 1; index <= last; index++) {
    if (raw <= breakpoints[index]) {
      const low = breakpoints[index - 1], high = breakpoints[index];
      const value = (index - 1 + (high > low ? (raw - low) / (high - low) : 0)) * (100 / last);
      return Math.min(99, Math.max(1, Math.round(value)));
    }
  }
  return 99;
}

export const levelOf = (score: number): Level => score >= 67 ? "high" : score >= 34 ? "mid" : "low";

export const calibrationSet = (a: NatalChart, b: NatalChart): CalibrationSet =>
  !a.input.unknownTime && !b.input.unknownTime ? "known2" : a.input.unknownTime && b.input.unknownTime ? "known0" : "known1";

export function scoresOf(raw: RawScores, set: CalibrationSet): Record<Metric, Score> {
  const result = {} as Record<Metric, Score>;
  for (const metric of METRICS) {
    const score = percentile(raw[metric], CALIBRATION[set][metric]);
    result[metric] = { raw: Math.round(raw[metric] * 1000) / 1000, score, level: levelOf(score) };
  }
  return result;
}

// ---------------------------------------------------------------- chart

export type CoupleInput = { a: NatalInput; b: NatalInput; email: string };

export type CoupleChart = {
  version: 1;
  a: NatalChart;
  b: NatalChart;
  aspects: CrossAspect[];
  links: SignLink[];
  composite: CompositePoint[];
  overlays: Overlay[];
  lifePath: { a: number; b: number };
  calibration: CalibrationSet;
  scores: Record<Metric, Score>;
};

const prefixed = (label: string, run: () => NatalInput) => {
  try { return run(); } catch (error) { throw new Error(`${label}: ${error instanceof Error ? error.message : "мэдээллээ шалгана уу."}`); }
};

export const PERSON_LABEL: Record<Person, string> = { a: "Таны мэдээлэл", b: "Хамтрагчийн мэдээлэл" };

export function validateCoupleInput(value: unknown, requireEmail = false): CoupleInput {
  if (!value || typeof value !== "object") throw new Error("Хоёр хүний төрсөн мэдээллийг оруулна уу.");
  const data = value as Record<string, unknown>;
  const email = typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
  if (requireEmail && (email.length > 254 || !/^[^\s@<>()"',;:]+@[^\s@<>()"',;:]+\.[a-z]{2,}$/i.test(email))) throw new Error("Имэйл хаягаа зөв оруулна уу.");
  const a = prefixed(PERSON_LABEL.a, () => validateNatalInput({ ...(data.a as object), email: "" }));
  const b = prefixed(PERSON_LABEL.b, () => validateNatalInput({ ...(data.b as object), email: "" }));
  const same = (x: NatalInput, y: NatalInput) => x.birthDate === y.birthDate && x.birthTime === y.birthTime && x.unknownTime === y.unknownTime && x.cityId === y.cityId && JSON.stringify(x.place ?? null) === JSON.stringify(y.place ?? null);
  if (same(a, b)) throw new Error("Хоёр хүний төрсөн мэдээлэл яг ижил байна. Хамтрагчийнхаа мэдээллийг оруулна уу.");
  return { a, b, email };
}

export function buildCoupleChart(a: NatalChart, b: NatalChart): CoupleChart {
  const aspects = crossAspects(a, b), links = signLinks(a, b), calibration = calibrationSet(a, b);
  return {
    version: 1, a, b, aspects, links,
    composite: compositeOf(a, b),
    overlays: overlaysOf(a, b),
    lifePath: { a: lifePath(a.input.birthDate), b: lifePath(b.input.birthDate) },
    calibration,
    scores: scoresOf(rawScores(aspects, links), calibration),
  };
}

export function calculateCoupleChart(raw: { a: NatalInput; b: NatalInput }): CoupleChart {
  const input = validateCoupleInput(raw);
  return buildCoupleChart(calculateNatalChart(input.a), calculateNatalChart(input.b));
}

export const elementOf = (signIndex: number): Element => SIGN_ELEMENT[signIndex];
export const pointOf = (chart: NatalChart, id: CrossPoint) => id === "ascendant" ? chart.ascendant : chart.planets.find((planet) => planet.id === id) ?? null;
