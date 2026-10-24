// 12-month transit forecast engine. Client-safe: dates and geometry only, no interpretation text.
// Slow planets (Jupiter–Pluto) are sampled every few days; exact passes are refined by bisection.
import { Body, EclipseKind, EclipticGeoMoon, Ecliptic, HelioVector, SearchGlobalSolarEclipse, SearchLunarEclipse, SearchMoonPhase, SunPosition, Vector } from "astronomy-engine";
import { DateTime } from "luxon";
import { angularDistance, normalize, type NatalChart } from "../astrology.ts";
import { ASPECT_NAMES, type AspectType, type PlanetId } from "./terms.ts";

export type TransitPlanet = "jupiter" | "saturn" | "uranus" | "neptune" | "pluto";
export type TransitTarget = "sun" | "moon" | "mercury" | "venus" | "mars" | "ascendant" | "midheaven";

export const TRANSIT_PLANETS: TransitPlanet[] = ["jupiter", "saturn", "uranus", "neptune", "pluto"];
/** Sampling step per planet in days: about one degree of its fastest motion, which keeps CPU use low on Workers. */
const STEP_DAYS: Record<TransitPlanet, number> = { jupiter: 6, saturn: 8, uranus: 15, neptune: 15, pluto: 15 };
const BODY: Record<TransitPlanet, Body> = { jupiter: Body.Jupiter, saturn: Body.Saturn, uranus: Body.Uranus, neptune: Body.Neptune, pluto: Body.Pluto };
const WINDOW_ORB = 2;
const DAY = 86400000;
const ASPECT_TYPES: AspectType[] = ["conjunction", "sextile", "square", "trine", "opposition"];

/**
 * Geocentric ecliptic longitude from geometric heliocentric vectors, skipping light-time and aberration.
 * The error is below 0.01° for Jupiter–Pluto, far under what a date in a forecast can show, and it is
 * about three times cheaper than GeoVector, which matters on the Workers CPU budget.
 */
const earthCache = new Map<number, Vector>();
function earthAt(time: number) {
  let vector = earthCache.get(time);
  if (!vector) { vector = HelioVector(Body.Earth, new Date(time)); if (earthCache.size > 600) earthCache.clear(); earthCache.set(time, vector); }
  return vector;
}
function planetLongitude(id: TransitPlanet, date: Date) {
  const planet = HelioVector(BODY[id], date), earth = earthAt(date.getTime());
  return Ecliptic(new Vector(planet.x - earth.x, planet.y - earth.y, planet.z - earth.z, planet.t)).elon;
}

export type TransitEvent = {
  transit: TransitPlanet;
  target: TransitTarget;
  aspect: AspectType;
  /** Local dates (YYYY-MM-DD) of every exact pass inside the period; retrograde loops give up to three. */
  exact: string[];
  /** The aspect is within 2° from `start` to `end` (clipped to the period). */
  start: string;
  end: string;
  score: number;
};
export type EclipseEvent = {
  kind: "solar" | "lunar";
  date: string;
  longitude: number;
  signIndex: number;
  degree: number;
  house?: number;
  /** Natal point within 3° of the eclipse degree or its opposite. */
  hit?: { target: TransitTarget; orb: number };
};
export type HouseSpan = { house: number; from: string; to: string };
export type Forecast = {
  start: string;
  end: string;
  transits: TransitEvent[];
  eclipses: EclipseEvent[];
  /** Houses crossed by transiting Jupiter and Saturn (birth time known only). */
  houses: { planet: "jupiter" | "saturn"; spans: HouseSpan[] }[];
  /** True when the Moon and the angles were left out because the birth time is unknown. */
  limited: boolean;
};

const PLANET_WEIGHT: Record<TransitPlanet, number> = { pluto: 4, saturn: 4, uranus: 4, neptune: 3, jupiter: 3 };
const TARGET_WEIGHT: Record<TransitTarget, number> = { sun: 5, moon: 4, ascendant: 5, midheaven: 4, venus: 3, mars: 3, mercury: 2 };
const ASPECT_WEIGHT: Record<AspectType, number> = { conjunction: 3, opposition: 3, square: 3, trine: 2, sextile: 1.5 };
export const isSoft = (aspect: AspectType) => aspect === "trine" || aspect === "sextile";

const signed = (value: number) => normalize(value + 180) - 180;

function localDate(time: number, zone: string) {
  return DateTime.fromMillis(time, { zone }).toISODate()!;
}

function natalTargets(chart: NatalChart) {
  const targets: { id: TransitTarget; longitude: number }[] = [];
  for (const planet of chart.planets) {
    if (!["sun", "mercury", "venus", "mars"].includes(planet.id) && !(planet.id === "moon" && !chart.input.unknownTime)) continue;
    targets.push({ id: planet.id as TransitTarget, longitude: planet.longitude });
  }
  if (chart.ascendant) targets.push({ id: "ascendant", longitude: chart.ascendant.longitude });
  if (chart.midheaven) targets.push({ id: "midheaven", longitude: chart.midheaven.longitude });
  return targets;
}

function houseOf(longitude: number, cusps: number[]) {
  const value = normalize(longitude - cusps[0]);
  let house = 1;
  for (let index = 0; index < 12; index++) if (normalize(cusps[index] - cusps[0]) <= value) house = index + 1;
  return house;
}

export function calculateForecast(chart: NatalChart, from: Date): Forecast {
  const zone = chart.city.timezone;
  const t0 = from.getTime(), t1 = t0 + 365 * DAY;
  const times = {} as Record<TransitPlanet, number[]>, longitudes = {} as Record<TransitPlanet, number[]>;
  for (const id of TRANSIT_PLANETS) {
    times[id] = [];
    for (let time = t0; time <= t1 + STEP_DAYS[id] * DAY; time += STEP_DAYS[id] * DAY) times[id].push(time);
    longitudes[id] = times[id].map((time) => planetLongitude(id, new Date(time)));
  }
  const targets = natalTargets(chart);

  type Pass = { exact: number[]; startMs: number; endMs: number };
  const grouped = new Map<string, { transit: TransitPlanet; target: TransitTarget; aspect: AspectType; passes: Pass }>();

  for (const planet of TRANSIT_PLANETS) for (const target of targets) for (const aspect of ASPECT_TYPES) {
    const angle = ASPECT_NAMES[aspect].angle;
    for (const offset of angle === 0 || angle === 180 ? [angle] : [angle, -angle]) {
      const diff = (index: number) => signed(longitudes[planet][index] - target.longitude - offset);
      for (let index = 0; index < times[planet].length - 1; index++) {
        const a = diff(index), b = diff(index + 1);
        if (Math.abs(a) > 20 || Math.abs(b) > 20 || (a > 0) === (b > 0)) continue;
        let lo = times[planet][index], hi = times[planet][index + 1], flo = a;
        for (let round = 0; round < 8; round++) {
          const mid = (lo + hi) / 2, f = signed(planetLongitude(planet, new Date(mid)) - target.longitude - offset);
          if ((f > 0) === (flo > 0)) { lo = mid; flo = f; } else hi = mid;
        }
        const exact = (lo + hi) / 2;
        if (exact < t0 || exact > t1) continue;
        // Window: where the aspect is within WINDOW_ORB degrees, found from the neighbouring samples.
        const speed = Math.abs(diff(index + 1) - diff(index)) / STEP_DAYS[planet] || 0.01;
        const half = (WINDOW_ORB / speed) * DAY;
        const key = `${planet}|${target.id}|${aspect}`;
        const entry = grouped.get(key) ?? { transit: planet, target: target.id, aspect, passes: { exact: [], startMs: Infinity, endMs: -Infinity } };
        entry.passes.exact.push(exact);
        entry.passes.startMs = Math.min(entry.passes.startMs, exact - half);
        entry.passes.endMs = Math.max(entry.passes.endMs, exact + half);
        grouped.set(key, entry);
      }
    }
  }

  const events: TransitEvent[] = [...grouped.values()].map(({ transit, target, aspect, passes }) => ({
    transit, target, aspect,
    exact: passes.exact.sort((x, y) => x - y).map((time) => localDate(time, zone)),
    start: localDate(Math.max(passes.startMs, t0), zone),
    end: localDate(Math.min(passes.endMs, t1), zone),
    score: PLANET_WEIGHT[transit] * TARGET_WEIGHT[target] * ASPECT_WEIGHT[aspect] * (1 + 0.15 * (passes.exact.length - 1)),
  }));

  return {
    start: localDate(t0, zone), end: localDate(t1, zone),
    transits: events.sort((x, y) => y.score - x.score),
    eclipses: findEclipses(chart, t0, t1, zone, targets),
    houses: chart.houses ? (["jupiter", "saturn"] as const).map((planet) => ({ planet, spans: houseSpans(planet, chart.houses!.map((cusp) => cusp.longitude), t0, t1, zone) })) : [],
    limited: chart.input.unknownTime,
  };
}

function houseSpans(planet: "jupiter" | "saturn", cusps: number[], t0: number, t1: number, zone: string): HouseSpan[] {
  const step = STEP_DAYS[planet] * DAY, spans: HouseSpan[] = [];
  let currentHouse = houseOf(planetLongitude(planet, new Date(t0)), cusps), from = t0;
  for (let time = t0 + step; time <= t1 + step; time += step) {
    const capped = Math.min(time, t1);
    const house = houseOf(planetLongitude(planet, new Date(capped)), cusps);
    if (house === currentHouse) { if (capped === t1) break; continue; }
    let lo = time - step, hi = capped;
    for (let round = 0; round < 8; round++) { const mid = (lo + hi) / 2; if (houseOf(planetLongitude(planet, new Date(mid)), cusps) === currentHouse) lo = mid; else hi = mid; }
    spans.push({ house: currentHouse, from: localDate(from, zone), to: localDate(hi, zone) });
    currentHouse = house; from = hi;
  }
  spans.push({ house: currentHouse, from: localDate(from, zone), to: localDate(t1, zone) });
  return spans;
}

/**
 * Eclipses: a cheap latitude test at new and full moon inside the node seasons picks candidates,
 * the engine's exact search confirms them.
 */
function findEclipses(chart: NatalChart, t0: number, t1: number, zone: string, targets: { id: TransitTarget; longitude: number }[]): EclipseEvent[] {
  const found: { kind: "solar" | "lunar"; time: number; longitude: number }[] = [];
  // Eclipses only happen while the Sun is near a lunar node, so the costly phase search runs inside those seasons only.
  // The mean node is within 2° of the true one: plenty for a 21° season margin (eclipse limit is 18.5°).
  const SEASON_DEGREES = 21, SCAN = 5 * DAY;
  const meanNode = (time: number) => normalize(125.04452 - 1934.136261 * ((time - Date.UTC(2000, 0, 1, 12)) / (36525 * DAY)));
  const inSeason = (time: number) => { const gap = angularDistance(SunPosition(new Date(time)).elon, meanNode(time)); return gap < SEASON_DEGREES || gap > 180 - SEASON_DEGREES; };
  // Candidates are confirmed by the exact search, which also drops penumbral lunar eclipses.
  const confirmed = (kind: "solar" | "lunar", time: number) => {
    const from = new Date(time - 3 * DAY);
    if (kind === "solar") return Math.abs(SearchGlobalSolarEclipse(from).peak.date.getTime() - time) < 2 * DAY;
    const eclipse = SearchLunarEclipse(from);
    return eclipse.kind !== EclipseKind.Penumbral && Math.abs(eclipse.peak.date.getTime() - time) < 2 * DAY;
  };
  const windows: [number, number][] = [];
  for (let time = t0 - SCAN; time <= t1 + SCAN; time += SCAN) if (inSeason(time)) { const last = windows[windows.length - 1]; if (last && time - last[1] <= SCAN) last[1] = time; else windows.push([time, time]); }
  for (const [from, to] of windows) for (const [phase, kind, limit] of [[0, "solar", 1.7], [180, "lunar", 1.2]] as const) {
    let cursor = new Date(from - 2 * DAY);
    for (;;) {
      const moon = SearchMoonPhase(phase, cursor, 40);
      if (!moon || moon.date.getTime() > to + 2 * DAY) break;
      const time = moon.date.getTime();
      if (time >= t0 && time <= t1 && Math.abs(EclipticGeoMoon(moon.date).lat) < limit && confirmed(kind, time)) found.push({ kind, time, longitude: normalize(SunPosition(moon.date).elon + (kind === "lunar" ? 180 : 0)) });
      cursor = new Date(time + 20 * DAY);
    }
  }
  const cusps = chart.houses?.map((cusp) => cusp.longitude);
  return found.sort((x, y) => x.time - y.time).map((item) => {
    let hit: EclipseEvent["hit"];
    for (const target of targets) {
      const orb = Math.min(angularDistance(item.longitude, target.longitude), angularDistance(item.longitude + 180, target.longitude));
      if (orb <= 3 && (!hit || orb < hit.orb)) hit = { target: target.id, orb };
    }
    return { kind: item.kind, date: localDate(item.time, zone), longitude: item.longitude, signIndex: Math.floor(item.longitude / 30), degree: Math.floor(item.longitude % 30), house: cusps ? houseOf(item.longitude, cusps) : undefined, hit };
  });
}

const familyKey = (event: TransitEvent) => `${event.transit}|${event.aspect === "conjunction" ? "c" : isSoft(event.aspect) ? "s" : "h"}`;

/**
 * Chooses the events the reading will describe: highest scoring first, always keeping one supportive aspect,
 * then sorted by date. A planet appears once per kind of aspect and a natal point at most twice, so no
 * sentence of the composed texts repeats more than twice in one reading.
 */
export function selectTransits(forecast: Forecast, limit = 8): TransitEvent[] {
  const families = new Set<string>(), targets = new Map<TransitTarget, number>(), chosen: TransitEvent[] = [];
  const take = (event: TransitEvent) => {
    if (families.has(familyKey(event)) || (targets.get(event.target) ?? 0) >= 2) return false;
    families.add(familyKey(event)); targets.set(event.target, (targets.get(event.target) ?? 0) + 1); chosen.push(event);
    return true;
  };
  for (const event of forecast.transits) if (chosen.length < limit) take(event);
  if (chosen.length && !chosen.some((event) => isSoft(event.aspect))) {
    const soft = forecast.transits.find((event) => isSoft(event.aspect) && !families.has(familyKey(event)) && (targets.get(event.target) ?? 0) < 2);
    if (soft) { if (chosen.length >= limit) chosen.pop(); take(soft); }
  }
  return chosen.sort((x, y) => x.exact[0].localeCompare(y.exact[0]));
}

export type { PlanetId };
