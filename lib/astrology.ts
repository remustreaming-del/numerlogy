// Natal chart engine. Client-safe: positions, houses and aspects only.
// Paid interpretation text lives in lib/natal/content and lib/natal/reading.ts
// and must never be imported from client components.
import { Body, e_tilt, Ecliptic, GeoMoonState, GeoVector, MakeTime, RotateState, Rotation_EQJ_ECT, SiderealTime, SunPosition } from "astronomy-engine";
import { DateTime, IANAZone } from "luxon";
import { cityById, CUSTOM_PLACE_ID } from "./cities.ts";
import {
  ANGLE_FORMS, ASPECT_NAMES, GENERATIONAL, PERSONAL, PLANET_ORDER, POINT_FORMS, POINT_GLYPHS, SIGN_ELEMENT, SIGN_FORMS, SIGN_GLYPHS, SIGN_MODALITY, SIGN_NAMES,
  dignityOf, ofSign, signPhrase, type AspectType, type Dignity, type Element, type Modality, type PlanetId, type PointId,
} from "./natal/terms.ts";

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;
/** Placidus is undefined where some ecliptic degrees never rise or set. */
const POLAR_LIMIT = 66.5;
const MONGOLIAN_ZONES = ["Asia/Ulaanbaatar", "Asia/Hovd", "Asia/Choibalsan"];

export type CustomPlace = { label: string; latitude: number; longitude: number; timezone: string };
export type NatalInput = {
  name: string;
  email?: string;
  birthDate: string;
  birthTime: string;
  cityId: string;
  unknownTime: boolean;
  place?: CustomPlace;
};

export type BirthPlace = { id: string; name: string; province: string; latitude: number; longitude: number; timezone: string };

export type PlanetPosition = {
  id: PointId | "ascendant" | "midheaven";
  name: string;
  glyph: string;
  longitude: number;
  signIndex: number;
  sign: string;
  signGlyph: string;
  degree: number;
  minute: number;
  retrograde: boolean;
  /** Degrees per day; 0 for angles. */
  speed: number;
  house?: number;
  dignity?: Dignity | null;
};

export type HouseCusp = { house: number; longitude: number; signIndex: number; sign: string; degree: number; minute: number };
export type NatalAspect = { a: PlanetId; b: PlanetId; type: AspectType; angle: number; orb: number; maxOrb: number };
export type AngularContact = { planet: PlanetId; angle: "ascendant" | "midheaven"; orb: number };
export type Balance = {
  elements: Record<Element, number>;
  modalities: Record<Modality, number>;
  dominantElement: Element | null;
  lackingElements: Element[];
  dominantModality: Modality | null;
  lackingModalities: Modality[];
};
export type ChartNotice = { kind: "unknown-time" | "moon-sign-change" | "whole-sign" | "placidus" | "dst-gap" | "dst-overlap" | "asc-sensitive" | "sun-cusp"; text: string };

export type NatalChart = {
  version: 2;
  input: NatalInput;
  utc: string;
  /** Local civil time with the historical offset, e.g. 1990-07-01T12:00:00+09:00. */
  local: string;
  city: BirthPlace;
  planets: PlanetPosition[];
  node: PlanetPosition;
  houses: HouseCusp[] | null;
  houseSystem: "placidus" | "whole-sign" | "none";
  ascendant: PlanetPosition | null;
  midheaven: PlanetPosition | null;
  aspects: NatalAspect[];
  angular: AngularContact[];
  balance: Balance;
  moonPhase: { index: number; angle: number };
  /** Unknown birth time only: Moon sign at 00:00 and 23:59 local time. */
  moonRange: { start: number; end: number } | null;
  /** Minutes the birth time would have to shift for the Ascendant to change sign. */
  ascendantSensitivity: { earlier: number; later: number } | null;
  hemispheres: { east: number; west: number; north: number; south: number } | null;
  stelliums: { kind: "sign" | "house"; index: number; planets: PlanetId[] }[];
  notices: ChartNotice[];
  /** Short methodological line shown under the wheel. */
  note: string;
};

const BODIES: Record<PlanetId, Body | undefined> = {
  sun: undefined, moon: Body.Moon, mercury: Body.Mercury, venus: Body.Venus, mars: Body.Mars,
  jupiter: Body.Jupiter, saturn: Body.Saturn, uranus: Body.Uranus, neptune: Body.Neptune, pluto: Body.Pluto,
};

export const normalize = (value: number) => ((value % 360) + 360) % 360;
export const angularDistance = (a: number, b: number) => Math.abs(normalize(a - b + 180) - 180);
const pad = (value: number) => String(value).padStart(2, "0");

// ---------------------------------------------------------------- validation

function validDate(date: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return false;
  const dt = DateTime.fromISO(date, { zone: "utc" });
  return dt.isValid && dt.toISODate() === date && Number(match[1]) >= 1900;
}

function validatePlace(value: unknown): CustomPlace {
  if (!value || typeof value !== "object") throw new Error("Төрсөн газрын өргөрөг, уртраг, цагийн бүсээ оруулна уу.");
  const data = value as Record<string, unknown>;
  const label = typeof data.label === "string" ? data.label.trim().replace(/\s+/g, " ") : "";
  if (label && !/^[\p{L}\p{M}\p{N} .,’'()\-]{1,60}$/u.test(label)) throw new Error("Газрын нэрийг 60 хүртэл тэмдэгтээр оруулна уу.");
  const latitude = Number(data.latitude), longitude = Number(data.longitude);
  if (!Number.isFinite(latitude) || latitude < -89.9 || latitude > 89.9) throw new Error("Өргөрөг −89.9…89.9 хэмийн хооронд байна.");
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new Error("Уртраг −180…180 хэмийн хооронд байна.");
  const timezone = typeof data.timezone === "string" ? data.timezone : "";
  if (!timezone || timezone.length > 64 || !IANAZone.isValidZone(timezone)) throw new Error("Цагийн бүсээ жагсаалтаас сонгоно уу.");
  return { label: label || "Өөр газар", latitude: Math.round(latitude * 1e4) / 1e4, longitude: Math.round(longitude * 1e4) / 1e4, timezone };
}

export function validateNatalInput(value: unknown, requireEmail = false): NatalInput {
  if (!value || typeof value !== "object") throw new Error("Төрсөн мэдээллээ оруулна уу.");
  const data = value as Record<string, unknown>;
  const name = typeof data.name === "string" ? data.name.trim().replace(/\s+/g, " ") : "";
  if (!/^[\p{L}\p{M} .’'\-]{2,80}$/u.test(name)) throw new Error("Нэрээ 2–80 үсгээр оруулна уу.");
  const birthDate = typeof data.birthDate === "string" ? data.birthDate : "";
  if (!validDate(birthDate) || birthDate > DateTime.now().setZone("Asia/Ulaanbaatar").toISODate()!) throw new Error("Төрсөн огноогоо зөв оруулна уу.");
  const unknownTime = data.unknownTime === true;
  const birthTime = unknownTime ? "12:00" : typeof data.birthTime === "string" ? data.birthTime : "";
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(birthTime)) throw new Error("Төрсөн цагаа зөв оруулна уу.");
  const cityId = typeof data.cityId === "string" ? data.cityId : "";
  const place = cityId === CUSTOM_PLACE_ID ? validatePlace(data.place) : undefined;
  if (!place && !cityById(cityId)) throw new Error("Төрсөн газраа жагсаалтаас сонгоно уу.");
  const email = typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
  if (requireEmail && (email.length > 254 || !/^[^\s@<>()"',;:]+@[^\s@<>()"',;:]+\.[a-z]{2,}$/i.test(email))) throw new Error("Имэйл хаягаа зөв оруулна уу.");
  return { name, email, birthDate, birthTime, cityId, unknownTime, ...(place ? { place } : {}) };
}

export function resolvePlace(input: Pick<NatalInput, "cityId" | "place">): BirthPlace {
  if (input.cityId === CUSTOM_PLACE_ID && input.place) {
    const { label, latitude, longitude, timezone } = input.place;
    return { id: CUSTOM_PLACE_ID, name: label, province: `${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`, latitude, longitude, timezone };
  }
  const city = cityById(input.cityId);
  if (!city) throw new Error("Төрсөн газар олдсонгүй.");
  return { id: city.id, name: city.name, province: city.province, latitude: city.latitude, longitude: city.longitude, timezone: city.timezone };
}

// ---------------------------------------------------------------- time

/**
 * Converts the civil birth time to UTC with the historical IANA offset.
 * A time inside a spring-forward gap is moved forward by Luxon (and flagged);
 * a time inside a fall-back overlap uses the earlier (summer-time) offset.
 */
export function birthToUtc(input: NatalInput) {
  const city = resolvePlace(input);
  const [year, month, day] = input.birthDate.split("-").map(Number);
  const [hour, minute] = input.birthTime.split(":").map(Number);
  const local = DateTime.fromObject({ year, month, day, hour, minute }, { zone: city.timezone });
  if (!local.isValid) throw new Error("Төрсөн цаг тухайн бүсийн цагийн түүхтэй тохирохгүй байна.");
  const gap = local.hour !== hour || local.minute !== minute;
  const offsets = typeof local.getPossibleOffsets === "function" ? local.getPossibleOffsets() : [local];
  const overlap = !gap && offsets.length > 1;
  const chosen = overlap ? offsets.reduce((a, b) => (a.offset > b.offset ? a : b)) : local;
  return { date: chosen.toUTC().toJSDate(), local: chosen, city, gap, overlap };
}

// ---------------------------------------------------------------- geometry

/** True obliquity of the ecliptic (mean + nutation), degrees. */
function obliquity(date: Date) {
  return e_tilt(MakeTime(date)).tobl;
}

function eclipticLonFromRa(raDeg: number, eps: number) {
  const ra = raDeg * D2R, e = eps * D2R;
  return normalize(Math.atan2(Math.sin(ra), Math.cos(ra) * Math.cos(e)) * R2D);
}

function declination(lonDeg: number, eps: number) {
  return Math.asin(Math.sin(eps * D2R) * Math.sin(lonDeg * D2R)) * R2D;
}

/**
 * RAMC = apparent sidereal time × 15° + east longitude.
 * MC  = atan2(sin RAMC, cos RAMC · cos ε)
 * ASC = atan2(cos RAMC, −(sin RAMC · cos ε + tan φ · sin ε)), taken on the eastern horizon.
 */
export function calculateAngles(date: Date, latitude: number, longitude: number) {
  const eps = obliquity(date);
  const ramc = normalize(SiderealTime(date) * 15 + longitude);
  const r = ramc * D2R, e = eps * D2R, p = latitude * D2R;
  const mc = normalize(Math.atan2(Math.sin(r), Math.cos(r) * Math.cos(e)) * R2D);
  let ascendant = normalize(Math.atan2(Math.cos(r), -(Math.sin(r) * Math.cos(e) + Math.tan(p) * Math.sin(e))) * R2D);
  if (normalize(ascendant - mc) > 180) ascendant = normalize(ascendant + 180);
  return { ascendant, mc, ramc, obliquity: eps };
}

/**
 * Placidus intermediate cusps by fixed-point iteration on right ascension.
 * A point's diurnal semi-arc DSA satisfies cos DSA = −tan φ · tan δ.
 *   cusp 11: RA = RAMC + DSA/3        cusp 12: RA = RAMC + 2·DSA/3
 *   cusp 2:  RA = RAMC + 180° − 2·NSA/3   cusp 3: RA = RAMC + 180° − NSA/3   (NSA = 180° − DSA)
 * Cusps 4–9 are the opposite points. Returns null when a semi-arc is undefined.
 */
function placidusIntermediate(ramc: number, eps: number, latitude: number, which: "11" | "12" | "2" | "3") {
  let ra = ramc + { "11": 30, "12": 60, "2": 120, "3": 150 }[which];
  for (let i = 0; i < 100; i++) {
    const cosSemiArc = -Math.tan(latitude * D2R) * Math.tan(declination(eclipticLonFromRa(ra, eps), eps) * D2R);
    if (cosSemiArc <= -1 || cosSemiArc >= 1) return null;
    const dsa = Math.acos(cosSemiArc) * R2D, nsa = 180 - dsa;
    const next = which === "11" ? ramc + dsa / 3 : which === "12" ? ramc + dsa * 2 / 3 : which === "2" ? ramc + 180 - nsa * 2 / 3 : ramc + 180 - nsa / 3;
    const done = angularDistance(next, ra) < 1e-9;
    ra = next;
    if (done) break;
  }
  return eclipticLonFromRa(ra, eps);
}

export function calculateHouses(date: Date, latitude: number, longitude: number) {
  const angles = calculateAngles(date, latitude, longitude);
  const wholeSign = () => { const base = Math.floor(angles.ascendant / 30) * 30; return Array.from({ length: 12 }, (_, i) => normalize(base + i * 30)); };
  if (Math.abs(latitude) >= POLAR_LIMIT) return { ...angles, system: "whole-sign" as const, cusps: wholeSign() };
  const c11 = placidusIntermediate(angles.ramc, angles.obliquity, latitude, "11");
  const c12 = placidusIntermediate(angles.ramc, angles.obliquity, latitude, "12");
  const c2 = placidusIntermediate(angles.ramc, angles.obliquity, latitude, "2");
  const c3 = placidusIntermediate(angles.ramc, angles.obliquity, latitude, "3");
  if (c11 == null || c12 == null || c2 == null || c3 == null) return { ...angles, system: "whole-sign" as const, cusps: wholeSign() };
  const cusps = [angles.ascendant, c2, c3, normalize(angles.mc + 180), normalize(c11 + 180), normalize(c12 + 180), normalize(angles.ascendant + 180), normalize(c2 + 180), normalize(c3 + 180), angles.mc, c11, c12];
  return { ...angles, system: "placidus" as const, cusps };
}

/** Degrees and arc-minutes are truncated, never rounded, so 29°59.9′ stays in its sign. */
function signParts(longitude: number) {
  const value = normalize(longitude), signIndex = Math.floor(value / 30), decimal = value - signIndex * 30;
  const degree = Math.floor(decimal), minute = Math.min(59, Math.floor((decimal - degree) * 60 + 1e-9));
  return { signIndex, sign: SIGN_NAMES[signIndex], signGlyph: SIGN_GLYPHS[signIndex], degree, minute };
}

function houseFor(longitude: number, cusps: number[]) {
  const value = normalize(longitude - cusps[0]);
  let house = 1;
  for (let index = 0; index < 12; index++) if (normalize(cusps[index] - cusps[0]) <= value) house = index + 1;
  return house;
}

/** Apparent geocentric ecliptic longitude of date (light-time and aberration corrected). */
function planetLongitude(id: PlanetId, date: Date) {
  return id === "sun" ? SunPosition(date).elon : Ecliptic(GeoVector(BODIES[id]!, date, true)).elon;
}

/** Osculating (true) ascending node of the Moon: direction of ẑ × (r × v) in the true ecliptic of date. */
export function trueNodeLongitude(date: Date) {
  const state = RotateState(Rotation_EQJ_ECT(date), GeoMoonState(date));
  const hx = state.y * state.vz - state.z * state.vy;
  const hy = state.z * state.vx - state.x * state.vz;
  return normalize(Math.atan2(hx, -hy) * R2D);
}

function velocity(longitudeAt: (date: Date) => number, date: Date) {
  const step = 6 * 3600000;
  const before = longitudeAt(new Date(date.getTime() - step)), after = longitudeAt(new Date(date.getTime() + step));
  return (normalize(after - before + 180) - 180) * 2; // degrees per day
}

function planetAt(id: PlanetId, date: Date, cusps?: number[]): PlanetPosition {
  const longitude = normalize(planetLongitude(id, date));
  const speed = velocity((time) => planetLongitude(id, time), date);
  const parts = signParts(longitude);
  return { id, name: POINT_FORMS[id].nom, glyph: POINT_GLYPHS[id], longitude, ...parts, retrograde: speed < 0, speed, house: cusps ? houseFor(longitude, cusps) : undefined, dignity: dignityOf(id, parts.signIndex) };
}

export function planetaryPositionsAt(date: Date, cusps?: number[]) {
  return PLANET_ORDER.map((id) => planetAt(id, date, cusps));
}

function nodeAt(date: Date, cusps?: number[]): PlanetPosition {
  const longitude = trueNodeLongitude(date);
  return { id: "node", name: POINT_FORMS.node.nom, glyph: POINT_GLYPHS.node, longitude, ...signParts(longitude), retrograde: velocity(trueNodeLongitude, date) < 0, speed: velocity(trueNodeLongitude, date), house: cusps ? houseFor(longitude, cusps) : undefined, dignity: null };
}

function anglePosition(id: "ascendant" | "midheaven", longitude: number, house: number): PlanetPosition {
  return { id, name: ANGLE_FORMS[id].nom, glyph: ANGLE_FORMS[id].short, longitude, ...signParts(longitude), retrograde: false, speed: 0, house, dignity: null };
}

// ---------------------------------------------------------------- aspects

/** Orbs: conjunction/opposition 8°, square/trine 7°, sextile 5°; +2° when the Sun or Moon takes part. */
export const ASPECT_ORBS: Record<AspectType, number> = { conjunction: 8, opposition: 8, square: 7, trine: 7, sextile: 5 };
const LUMINARY_BONUS = 2;
const ANGLE_ORB = 6;

function calculateAspects(planets: PlanetPosition[]) {
  const aspects: NatalAspect[] = [];
  for (let i = 0; i < planets.length; i++) for (let j = i + 1; j < planets.length; j++) {
    const a = planets[i], b = planets[j];
    const angle = angularDistance(a.longitude, b.longitude);
    const bonus = [a.id, b.id].some((id) => id === "sun" || id === "moon") ? LUMINARY_BONUS : 0;
    let best: NatalAspect | null = null;
    for (const type of Object.keys(ASPECT_ORBS) as AspectType[]) {
      const maxOrb = ASPECT_ORBS[type] + bonus, orb = Math.abs(angle - ASPECT_NAMES[type].angle);
      if (orb <= maxOrb && (!best || orb < best.orb)) best = { a: a.id as PlanetId, b: b.id as PlanetId, type, angle, orb, maxOrb };
    }
    if (best) aspects.push(best);
  }
  return aspects.sort((x, y) => x.orb - y.orb);
}

function calculateAngular(planets: PlanetPosition[], ascendant: number, mc: number): AngularContact[] {
  const contacts: AngularContact[] = [];
  for (const planet of planets) {
    const asc = angularDistance(planet.longitude, ascendant), top = angularDistance(planet.longitude, mc);
    if (asc <= ANGLE_ORB) contacts.push({ planet: planet.id as PlanetId, angle: "ascendant", orb: asc });
    if (top <= ANGLE_ORB) contacts.push({ planet: planet.id as PlanetId, angle: "midheaven", orb: top });
  }
  return contacts.sort((x, y) => x.orb - y.orb);
}

// ---------------------------------------------------------------- patterns

const BALANCE_WEIGHT: Record<string, number> = { sun: 3, moon: 3, ascendant: 3, mercury: 2, venus: 2, mars: 2, jupiter: 1, saturn: 1, uranus: 0.5, neptune: 0.5, pluto: 0.5 };

function calculateBalance(points: PlanetPosition[]): Balance {
  const elements: Record<Element, number> = { fire: 0, earth: 0, air: 0, water: 0 };
  const modalities: Record<Modality, number> = { cardinal: 0, fixed: 0, mutable: 0 };
  let total = 0;
  for (const point of points) {
    const weight = BALANCE_WEIGHT[point.id] ?? 0;
    elements[SIGN_ELEMENT[point.signIndex]] += weight;
    modalities[SIGN_MODALITY[point.signIndex]] += weight;
    total += weight;
  }
  const top = <K extends string>(record: Record<K, number>, share: number) => {
    const [key, value] = (Object.entries(record) as [K, number][]).sort((x, y) => y[1] - x[1])[0];
    return value / total >= share ? key : null;
  };
  return {
    elements, modalities,
    dominantElement: top(elements, 0.34),
    lackingElements: (Object.keys(elements) as Element[]).filter((key) => elements[key] / total < 0.1),
    dominantModality: top(modalities, 0.45),
    lackingModalities: (Object.keys(modalities) as Modality[]).filter((key) => modalities[key] / total < 0.12),
  };
}

function calculateHemispheres(planets: PlanetPosition[]) {
  const count = (houses: number[]) => planets.filter((planet) => planet.house && houses.includes(planet.house)).length;
  return { east: count([10, 11, 12, 1, 2, 3]), west: count([4, 5, 6, 7, 8, 9]), north: count([1, 2, 3, 4, 5, 6]), south: count([7, 8, 9, 10, 11, 12]) };
}

function calculateStelliums(planets: PlanetPosition[]) {
  const result: NatalChart["stelliums"] = [];
  const group = (kind: "sign" | "house", key: (planet: PlanetPosition) => number | undefined) => {
    const buckets = new Map<number, PlanetId[]>();
    for (const planet of planets) { const index = key(planet); if (index == null) continue; buckets.set(index, [...(buckets.get(index) ?? []), planet.id as PlanetId]); }
    for (const [index, members] of buckets) if (members.length >= 3 && members.some((id) => !GENERATIONAL.includes(id))) result.push({ kind, index, planets: members });
  };
  group("sign", (planet) => planet.signIndex);
  group("house", (planet) => planet.house);
  return result;
}

/** Minutes the birth time would have to move for the Ascendant to enter another sign (capped at 60). */
function ascendantSensitivity(date: Date, latitude: number, longitude: number, signIndex: number) {
  const search = (direction: 1 | -1) => {
    for (let minutes = 1; minutes <= 60; minutes++) {
      const asc = calculateAngles(new Date(date.getTime() + direction * minutes * 60000), latitude, longitude).ascendant;
      if (Math.floor(asc / 30) !== signIndex) return minutes;
    }
    return 61;
  };
  return { earlier: search(-1), later: search(1) };
}

// ---------------------------------------------------------------- chart


export function calculateNatalChart(raw: NatalInput): NatalChart {
  const input = validateNatalInput(raw);
  const { date, local, city, gap, overlap } = birthToUtc(input);
  const houseData = input.unknownTime ? null : calculateHouses(date, city.latitude, city.longitude);
  const planets = planetaryPositionsAt(date, houseData?.cusps);
  const node = nodeAt(date, houseData?.cusps);
  const ascendant = houseData ? anglePosition("ascendant", houseData.ascendant, 1) : null;
  const midheaven = houseData ? anglePosition("midheaven", houseData.mc, houseFor(houseData.mc, houseData.cusps)) : null;
  const houses = houseData ? houseData.cusps.map((longitude, index) => ({ house: index + 1, longitude, ...signParts(longitude) })) : null;
  const houseSystem = houseData ? houseData.system : "none";
  const sun = planets[0], moon = planets[1];

  let moonRange: NatalChart["moonRange"] = null;
  if (input.unknownTime) {
    const startOfDay = DateTime.fromISO(input.birthDate, { zone: city.timezone }).startOf("day");
    const lonAt = (dt: DateTime) => Math.floor(normalize(planetLongitude("moon", dt.toUTC().toJSDate())) / 30);
    moonRange = { start: lonAt(startOfDay), end: lonAt(startOfDay.plus({ hours: 23, minutes: 59 })) };
  }
  const sensitivity = ascendant ? ascendantSensitivity(date, city.latitude, city.longitude, ascendant.signIndex) : null;

  const notices: ChartNotice[] = [];
  if (input.unknownTime) notices.push({ kind: "unknown-time", text: "Төрсөн цаг тодорхойгүй тул гарагуудыг тухайн өдрийн 12:00 цагаар тооцов. Мандах орд, Тэнгэрийн оргил, байшингуудыг зориуд гаргаагүй." });
  if (moonRange && moonRange.start !== moonRange.end) notices.push({ kind: "moon-sign-change", text: `Сар энэ өдөр ${SIGN_FORMS[moonRange.start].phrase.abl} ${SIGN_FORMS[moonRange.end].phrase.dir} шилжсэн. Төрсөн цагаа мэдвэл Сарны ордыг нарийн тогтооно.` });
  if (houseSystem === "whole-sign") notices.push({ kind: "whole-sign", text: "Энэ өргөрөгт Плацидусын байшингийн тооцоо утгагүй болдог тул Бүхэл ордын системийг хэрэглэв." });
  if (houseSystem === "placidus") notices.push({ kind: "placidus", text: "Байшингуудыг Плацидусын системээр тооцов." });
  if (gap) notices.push({ kind: "dst-gap", text: `Тухайн өдөр цагийг урагшлуулсан тул ${input.birthTime} гэсэн цаг албан ёсоор байгаагүй. Тооцоонд ${local.toFormat("HH:mm")} гэж авав.` });
  if (overlap) notices.push({ kind: "dst-overlap", text: `Тухайн шөнө цагийг хойш шилжүүлсэн тул ${input.birthTime} хоёр удаа давтагдсан. Тооцоонд эхний удаагийн буюу зуны цагийн хугацааг авав.` });
  if (sensitivity && Math.min(sensitivity.earlier, sensitivity.later) <= 15) {
    const minutes = Math.min(sensitivity.earlier, sensitivity.later);
    const neighbour = sensitivity.earlier <= sensitivity.later ? (ascendant!.signIndex + 11) % 12 : (ascendant!.signIndex + 1) % 12;
    notices.push({ kind: "asc-sensitive", text: `Мандах орд ордын заагт ойрхон байна: төрсөн цаг ${minutes} минутаар ${sensitivity.earlier <= sensitivity.later ? "эрт" : "оройтож"} байсан бол Мандах орд ${signPhrase(neighbour)} болох байсан. Төрсний гэрчилгээн дээрх цагаа шалгаарай.` });
  }
  if (sun.degree === 29 || sun.degree === 0) notices.push({ kind: "sun-cusp", text: `Нар ${ofSign(sun.signIndex)} ${sun.degree}°${pad(sun.minute)}′ буюу хоёр ордын заагт ойрхон байна. Сэтгүүлийн зурхай огноогоор ерөнхийлдөг бол энэ тооцоо төрсөн минут, газраар хийгдсэн.` });

  const balancePoints = ascendant ? [...planets, ascendant] : planets;
  return {
    version: 2,
    input, utc: date.toISOString(), local: local.toISO({ suppressMilliseconds: true, suppressSeconds: true })!, city,
    planets, node, houses, houseSystem, ascendant, midheaven,
    aspects: calculateAspects(planets),
    angular: houseData ? calculateAngular(planets, houseData.ascendant, houseData.mc) : [],
    balance: calculateBalance(balancePoints),
    moonPhase: { index: Math.floor(normalize(moon.longitude - sun.longitude) / 45) % 8, angle: normalize(moon.longitude - sun.longitude) },
    moonRange, ascendantSensitivity: sensitivity,
    hemispheres: houseData ? calculateHemispheres(planets) : null,
    stelliums: calculateStelliums(planets).filter((item) => item.kind === "sign" || houseData),
    notices,
    note: notices.map((notice) => notice.text).join(" ") + " Тропик зодиак.",
  };
}

export function formatLongitude(position: Pick<PlanetPosition, "sign" | "degree" | "minute" | "retrograde">) {
  return `${position.sign} ${position.degree}°${pad(position.minute)}′${position.retrograde ? " ℞" : ""}`;
}

export const isPersonal = (id: PointId) => PERSONAL.includes(id);
export const isMongolianZone = (zone: string) => MONGOLIAN_ZONES.includes(zone);
