import { Body, Ecliptic, GeoVector, SiderealTime, SunPosition } from "astronomy-engine";
import { DateTime } from "luxon";
import { cityById } from "./cities.ts";
import { ASPECT_TEXT, NATAL_COPY, PLANET_GLYPHS, PLANET_NAMES, SIGN_GLYPHS, SIGN_NAMES, placementText } from "./natal-texts.ts";

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;
const POLAR_LIMIT = 66.5;

export type NatalInput = {
  name: string;
  email?: string;
  birthDate: string;
  birthTime: string;
  cityId: string;
  unknownTime: boolean;
};

export type PlanetPosition = {
  id: string;
  name: string;
  glyph: string;
  longitude: number;
  signIndex: number;
  sign: string;
  signGlyph: string;
  degree: number;
  minute: number;
  retrograde: boolean;
  house?: number;
};

export type HouseCusp = { house: number; longitude: number; signIndex: number; sign: string; degree: number };
export type NatalAspect = { a: string; b: string; type: keyof typeof ASPECT_TEXT; angle: number; orb: number };
export type NatalChart = {
  input: NatalInput;
  utc: string;
  city: { id: string; name: string; province: string; latitude: number; longitude: number; timezone: string };
  planets: PlanetPosition[];
  houses: HouseCusp[] | null;
  houseSystem: "placidus" | "whole-sign" | "none";
  ascendant: PlanetPosition | null;
  midheaven: number | null;
  aspects: NatalAspect[];
  note: string;
};

export type NatalReading = NatalChart & {
  preview?: boolean;
  sections: { id: string; title: string; body: string }[];
};

const BODIES: { id: string; body?: Body }[] = [
  { id: "sun" }, { id: "moon", body: Body.Moon }, { id: "mercury", body: Body.Mercury },
  { id: "venus", body: Body.Venus }, { id: "mars", body: Body.Mars }, { id: "jupiter", body: Body.Jupiter },
  { id: "saturn", body: Body.Saturn }, { id: "uranus", body: Body.Uranus },
  { id: "neptune", body: Body.Neptune }, { id: "pluto", body: Body.Pluto },
];

export const normalize = (value: number) => ((value % 360) + 360) % 360;
export const angularDistance = (a: number, b: number) => Math.abs(normalize(a - b + 180) - 180);

function validDate(date: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return false;
  const dt = DateTime.fromISO(date, { zone: "utc" });
  return dt.isValid && dt.toISODate() === date && Number(match[1]) >= 1900;
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
  if (!cityById(cityId)) throw new Error("Төрсөн хотоо жагсаалтаас сонгоно уу.");
  const email = typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
  if (requireEmail && (email.length > 254 || !/^[^\s@<>()"',;:]+@[^\s@<>()"',;:]+\.[a-z]{2,}$/i.test(email))) throw new Error("Имэйл хаягаа зөв оруулна уу.");
  return { name, email, birthDate, birthTime, cityId, unknownTime };
}

export function birthToUtc(input: NatalInput) {
  const city = cityById(input.cityId);
  if (!city) throw new Error("Төрсөн хот олдсонгүй.");
  const [year, month, day] = input.birthDate.split("-").map(Number);
  const [hour, minute] = input.birthTime.split(":").map(Number);
  const local = DateTime.fromObject({ year, month, day, hour, minute }, { zone: city.timezone });
  if (!local.isValid) throw new Error("Төрсөн цаг тухайн бүсийн цагийн түүхтэй тохирохгүй байна.");
  return { date: local.toUTC().toJSDate(), local, city };
}

function meanObliquity(date: Date) {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const t = (jd - 2451545) / 36525;
  return 23 + 26 / 60 + (21.448 - 46.815 * t - 0.00059 * t * t + 0.001813 * t * t * t) / 3600;
}

function eclipticLonFromRa(raDeg: number, obliquity: number) {
  const ra = raDeg * D2R, eps = obliquity * D2R;
  return normalize(Math.atan2(Math.sin(ra), Math.cos(ra) * Math.cos(eps)) * R2D);
}

function declination(lonDeg: number, obliquity: number) {
  return Math.asin(Math.sin(obliquity * D2R) * Math.sin(lonDeg * D2R)) * R2D;
}

export function calculateAngles(date: Date, latitude: number, longitude: number) {
  const eps = meanObliquity(date);
  const ramc = normalize(SiderealTime(date) * 15 + longitude);
  const r = ramc * D2R, e = eps * D2R, p = latitude * D2R;
  const mc = normalize(Math.atan2(Math.sin(r), Math.cos(r) * Math.cos(e)) * R2D);
  let ascendant = normalize(Math.atan2(Math.cos(r), -(Math.sin(r) * Math.cos(e) + Math.tan(p) * Math.sin(e))) * R2D);
  if (normalize(ascendant - mc) > 180) ascendant = normalize(ascendant + 180);
  return { ascendant, mc, ramc, obliquity: eps };
}

function placidusIntermediate(ramc: number, obliquity: number, latitude: number, which: "11" | "12" | "2" | "3") {
  const initial = { "11": 30, "12": 60, "2": 120, "3": 150 }[which];
  let ra = ramc + initial;
  for (let i = 0; i < 80; i++) {
    const lon = eclipticLonFromRa(ra, obliquity);
    const cosSemiArc = -Math.tan(latitude * D2R) * Math.tan(declination(lon, obliquity) * D2R);
    if (cosSemiArc <= -1 || cosSemiArc >= 1) return null;
    const semiArc = Math.acos(cosSemiArc) * R2D;
    const nightArc = 180 - semiArc;
    const next = which === "11" ? ramc + semiArc / 3 : which === "12" ? ramc + semiArc * 2 / 3 : which === "2" ? ramc + semiArc + nightArc / 3 : ramc + semiArc + nightArc * 2 / 3;
    if (angularDistance(next, ra) < 1e-9) { ra = next; break; }
    ra = next;
  }
  return eclipticLonFromRa(ra, obliquity);
}

export function calculateHouses(date: Date, latitude: number, longitude: number) {
  const angles = calculateAngles(date, latitude, longitude);
  let system: "placidus" | "whole-sign" = "placidus";
  let values: number[];
  if (Math.abs(latitude) >= POLAR_LIMIT) {
    system = "whole-sign";
    const base = Math.floor(angles.ascendant / 30) * 30;
    values = Array.from({ length: 12 }, (_, i) => normalize(base + i * 30));
  } else {
    const c11 = placidusIntermediate(angles.ramc, angles.obliquity, latitude, "11");
    const c12 = placidusIntermediate(angles.ramc, angles.obliquity, latitude, "12");
    const c2 = placidusIntermediate(angles.ramc, angles.obliquity, latitude, "2");
    const c3 = placidusIntermediate(angles.ramc, angles.obliquity, latitude, "3");
    if ([c11, c12, c2, c3].some((value) => value == null)) {
      system = "whole-sign";
      const base = Math.floor(angles.ascendant / 30) * 30;
      values = Array.from({ length: 12 }, (_, i) => normalize(base + i * 30));
    } else {
      values = [angles.ascendant, c2!, c3!, normalize(angles.mc + 180), normalize(c11! + 180), normalize(c12! + 180), normalize(angles.ascendant + 180), normalize(c2! + 180), normalize(c3! + 180), angles.mc, c11!, c12!];
    }
  }
  return { ...angles, system, cusps: values };
}

function signParts(longitude: number) {
  const value = normalize(longitude), signIndex = Math.floor(value / 30), decimal = value - signIndex * 30;
  const degree = Math.floor(decimal), minute = Math.round((decimal - degree) * 60) % 60;
  return { signIndex, sign: SIGN_NAMES[signIndex], signGlyph: SIGN_GLYPHS[signIndex], degree, minute };
}

function houseFor(longitude: number, cusps: number[]) {
  const base = cusps[0];
  const value = normalize(longitude - base);
  const ordered = cusps.map((cusp, index) => ({ index, value: normalize(cusp - base) })).sort((a, b) => a.value - b.value);
  let house = ordered[0].index + 1;
  for (const cusp of ordered) if (cusp.value <= value) house = cusp.index + 1;
  return house;
}

function planetLongitude(id: string, body: Body | undefined, date: Date) {
  return id === "sun" ? SunPosition(date).elon : Ecliptic(GeoVector(body!, date, true)).elon;
}

function planetAt(id: string, body: Body | undefined, date: Date, cusps?: number[]): PlanetPosition {
  const longitude = normalize(planetLongitude(id, body, date));
  const future = normalize(planetLongitude(id, body, new Date(date.getTime() + 6 * 3600000)));
  const delta = normalize(future - longitude + 180) - 180;
  return { id, name: PLANET_NAMES[id], glyph: PLANET_GLYPHS[id], longitude, ...signParts(longitude), retrograde: delta < 0, house: cusps ? houseFor(longitude, cusps) : undefined };
}

export function planetaryPositionsAt(date: Date, cusps?: number[]) {
  return BODIES.map(({ id, body }) => planetAt(id, body, date, cusps));
}

function calculateAspects(planets: PlanetPosition[]) {
  const types: { type: NatalAspect["type"]; angle: number; orb: number }[] = [
    { type: "conjunction", angle: 0, orb: 7 }, { type: "sextile", angle: 60, orb: 4 },
    { type: "square", angle: 90, orb: 6 }, { type: "trine", angle: 120, orb: 6 }, { type: "opposition", angle: 180, orb: 7 },
  ];
  const aspects: NatalAspect[] = [];
  for (let a = 0; a < planets.length; a++) for (let b = a + 1; b < planets.length; b++) {
    const angle = angularDistance(planets[a].longitude, planets[b].longitude);
    const match = types.map((item) => ({ ...item, distance: Math.abs(angle - item.angle) })).filter((item) => item.distance <= item.orb).sort((x, y) => x.distance - y.distance)[0];
    if (match) aspects.push({ a: planets[a].id, b: planets[b].id, type: match.type, angle, orb: match.distance });
  }
  return aspects.sort((a, b) => a.orb - b.orb);
}

export function calculateNatalChart(raw: NatalInput): NatalChart {
  const input = validateNatalInput(raw);
  const { date, city } = birthToUtc(input);
  const houseData = input.unknownTime ? null : calculateHouses(date, city.latitude, city.longitude);
  const planets = planetaryPositionsAt(date, houseData?.cusps);
  const ascendant = houseData ? { id: "ascendant", name: "Асцендент", glyph: "Asc", longitude: houseData.ascendant, ...signParts(houseData.ascendant), retrograde: false, house: 1 } : null;
  const houses = houseData ? houseData.cusps.map((longitude, index) => ({ house: index + 1, longitude, ...signParts(longitude) })) : null;
  const houseSystem = input.unknownTime ? "none" : houseData!.system;
  return { input, utc: date.toISOString(), city, planets, houses, houseSystem, ascendant, midheaven: houseData?.mc ?? null, aspects: calculateAspects(planets), note: input.unknownTime ? NATAL_COPY.unknownTime : houseSystem === "whole-sign" ? NATAL_COPY.wholeSign : NATAL_COPY.placidus };
}

export function createNatalReading(input: NatalInput): NatalReading {
  const chart = calculateNatalChart(input);
  const sections = chart.planets.map((planet) => ({ id: planet.id, title: `${planet.name} · ${planet.sign} ${planet.degree}°${String(planet.minute).padStart(2, "0")}′`, body: placementText(planet.id, planet.signIndex, planet.house) }));
  if (chart.ascendant) sections.unshift({ id: "ascendant", title: `Асцендент · ${chart.ascendant.sign} ${chart.ascendant.degree}°${String(chart.ascendant.minute).padStart(2, "0")}′`, body: `Асцендент ${chart.ascendant.sign} ордод байрласнаар бусдад анх харагдах төрх, орчинтой харилцах эхний хөдөлгөөнд ${SIGN_NAMES[chart.ascendant.signIndex]} ордын ${chart.ascendant.sign.toLowerCase()} өнгө орно. Энэ бол дүр эсгэлт бус, амьдралд хаалга нээх таны төрөлхийн арга юм.` });
  chart.aspects.slice(0, 8).forEach((aspect, index) => sections.push({ id: `aspect-${index}`, title: `${PLANET_NAMES[aspect.a]} — ${PLANET_NAMES[aspect.b]}`, body: `${PLANET_NAMES[aspect.a]} ба ${PLANET_NAMES[aspect.b]}-ийн холбоо ${ASPECT_TEXT[aspect.type]}. Орб ${aspect.orb.toFixed(1)}° тул энэ сэдэв зурагт ${aspect.orb < 2 ? "тод" : "зөөлөн"} давтагдана.` }));
  return { ...chart, sections: [{ id: "intro", title: "Таны тэнгэрийн зураг", body: `${NATAL_COPY.fullIntro} ${NATAL_COPY.disclaimer}` }, ...sections] };
}

export function formatLongitude(position: Pick<PlanetPosition, "sign" | "degree" | "minute" | "retrograde">) {
  return `${position.sign} ${position.degree}° ${String(position.minute).padStart(2, "0")}′${position.retrograde ? " ℞" : ""}`;
}
