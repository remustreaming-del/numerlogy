// Mongolian twelve-animal / five-element year. Client-safe: names and calculation only,
// no interpretation text (see content/mongol-year.ts).
//
// The Mongolian year turns over at Tsagaan Sar, not on 1 January. Tsagaan Sar is fixed by
// the traditional lunisolar calendar; here it is approximated by the astronomical rule of the
// Chinese lunar calendar (Beijing dates). The two calendars agree
// on most years but can differ by a day, so births within a few days of the boundary carry a notice.
import { SearchMoonPhase, SearchSunLongitude, Seasons } from "astronomy-engine";

export const ANIMALS = [
  { id: "rat", nom: "Хулгана", gen: "Хулганы", com: "Хулгантай", element: "water" },
  { id: "ox", nom: "Үхэр", gen: "Үхрийн", com: "Үхэртэй", element: "earth" },
  { id: "tiger", nom: "Бар", gen: "Барын", com: "Бартай", element: "wood" },
  { id: "rabbit", nom: "Туулай", gen: "Туулайн", com: "Туулайтай", element: "wood" },
  { id: "dragon", nom: "Луу", gen: "Луугийн", com: "Луутай", element: "earth" },
  { id: "snake", nom: "Могой", gen: "Могойн", com: "Могойтой", element: "fire" },
  { id: "horse", nom: "Морь", gen: "Морины", com: "Морьтой", element: "fire" },
  { id: "sheep", nom: "Хонь", gen: "Хонины", com: "Хонитой", element: "earth" },
  { id: "monkey", nom: "Мичин", gen: "Мичингийн", com: "Мичинтэй", element: "metal" },
  { id: "rooster", nom: "Тахиа", gen: "Тахианы", com: "Тахиатай", element: "metal" },
  { id: "dog", nom: "Нохой", gen: "Нохойн", com: "Нохойтой", element: "earth" },
  { id: "pig", nom: "Гахай", gen: "Гахайн", com: "Гахайтай", element: "water" },
] as const;

export type YearElement = "wood" | "fire" | "earth" | "metal" | "water";

/** Year element in Mongolian: colour name is what people say, element is the technical name. */
export const YEAR_ELEMENTS: Record<YearElement, { color: string; element: string; elementGen: string }> = {
  wood: { color: "Хөх", element: "мод", elementGen: "модны" },
  fire: { color: "Улаан", element: "гал", elementGen: "галын" },
  earth: { color: "Шар", element: "шороо", elementGen: "шорооны" },
  metal: { color: "Цагаан", element: "төмөр", elementGen: "төмрийн" },
  water: { color: "Хар", element: "ус", elementGen: "усны" },
};
const STEM_ORDER: YearElement[] = ["wood", "wood", "fire", "fire", "earth", "earth", "metal", "metal", "water", "water"];

export type MongolYear = {
  /** Mongolian lunar year number (the Gregorian year in which the lunar year begins). */
  year: number;
  animalIndex: number;
  animal: string;
  animalGen: string;
  animalCom: string;
  element: YearElement;
  color: string;
  elementName: string;
  /** "Хөх луу" */
  title: string;
  /** "Хөх лууны" */
  titleGen: string;
  /** Approximated new-year date (YYYY-MM-DD) that opens this lunar year. */
  begins: string;
};

const BEIJING_OFFSET = 8 * 3600000;
const isoDate = (date: Date) => new Date(date.getTime() + BEIJING_OFFSET).toISOString().slice(0, 10);

const cache = new Map<number, string>();
const beijingDay = (date: Date) => isoDate(date);

/** New moons (Beijing dates) from `from` on, `count` of them. */
function newMoons(from: Date, count: number) {
  const moons: Date[] = [];
  let cursor = from;
  while (moons.length < count) {
    const moon = SearchMoonPhase(0, cursor, 40)!.date;
    moons.push(moon);
    cursor = new Date(moon.getTime() + 20 * 86400000);
  }
  return moons;
}

/**
 * Approximate Tsagaan Sar / lunar new year of `year` as a Beijing calendar date, using the
 * astronomical rule of the Chinese calendar: the second new moon after the month that holds
 * the winter solstice, or the third when a leap month falls before the first month.
 */
export function lunarNewYear(year: number): string {
  const cached = cache.get(year);
  if (cached) return cached;
  const solstice = Seasons(year - 1).dec_solstice.date, nextSolstice = Seasons(year).dec_solstice.date;
  const moons = newMoons(new Date(solstice.getTime() - 32 * 86400000), 18);
  const day = moons.map(beijingDay);
  const monthOf = (date: Date) => { const when = beijingDay(date); let index = -1; for (let i = 0; i < moons.length - 1; i++) if (day[i] <= when && when < day[i + 1]) index = i; return index; };
  const eleventh = monthOf(solstice), nextEleventh = monthOf(nextSolstice);
  let result = day[eleventh + 2];
  if (nextEleventh - eleventh === 13) {
    // A month that contains no principal term (Sun entering a multiple of 30°) is the leap month.
    const withTerm = new Set<number>();
    for (let step = 0; step < 14; step++) {
      const target = ((Math.floor(270 / 30) + step) % 12) * 30;
      const term = SearchSunLongitude(target, new Date(solstice.getTime() - 5 * 86400000 + step * 30.4 * 86400000), 40);
      if (term) withTerm.add(monthOf(term.date));
    }
    let leap = -1;
    for (let k = eleventh + 1; k < nextEleventh; k++) if (!withTerm.has(k)) { leap = k; break; }
    if (leap === eleventh + 1 || leap === eleventh + 2) result = day[eleventh + 3];
  }
  cache.set(year, result);
  return result;
}

export const animalName = (year: number) => ANIMALS[(((year - 4) % 12) + 12) % 12];
export const elementOfYear = (year: number): YearElement => STEM_ORDER[(((year - 4) % 10) + 10) % 10];

/** Mongolian year with the given lunar-year number. */
export function mongolYearFor(year: number): MongolYear {
  const animalIndex = (((year - 4) % 12) + 12) % 12;
  const animal = ANIMALS[animalIndex], element = elementOfYear(year), color = YEAR_ELEMENTS[element].color;
  return {
    year, animalIndex, animal: animal.nom, animalGen: animal.gen, animalCom: animal.com, element,
    color, elementName: YEAR_ELEMENTS[element].element,
    title: `${color} ${animal.nom.toLowerCase()}`, titleGen: `${color} ${animal.gen.toLowerCase()}`, begins: lunarNewYear(year),
  };
}

/** Mongolian year of a local calendar date. */
export function mongolYearOf(date: string): MongolYear {
  const calendarYear = Number(date.slice(0, 4));
  return mongolYearFor(date < lunarNewYear(calendarYear) ? calendarYear - 1 : calendarYear);
}

/** True when the date is close enough to the new-year boundary that the two calendars may disagree. */
export function nearYearBoundary(date: string, days = 3) {
  const stamp = (value: string) => Date.parse(`${value}T00:00:00Z`);
  const year = Number(date.slice(0, 4));
  return Math.abs(stamp(date) - stamp(lunarNewYear(year))) <= days * 86400000;
}

/** Triads of mutually friendly animals (гурвалсан нөхөрлөл) and the opposite, clashing animal. */
export const TRIADS = [[0, 4, 8], [1, 5, 9], [2, 6, 10], [3, 7, 11]] as const;
export type AnimalRelation = "same" | "triad" | "clash" | "neutral";
export function animalRelation(a: number, b: number): AnimalRelation {
  if (a === b) return "same";
  if (TRIADS.some((triad) => (triad as readonly number[]).includes(a) && (triad as readonly number[]).includes(b))) return "triad";
  if ((a + 6) % 12 === b) return "clash";
  return "neutral";
}

/** Nominal ages (the year of birth counts as 1) at which the birth animal returns: гарам. */
export const garamAges = (max = 85) => Array.from({ length: Math.floor((max - 1) / 12) }, (_, index) => 13 + index * 12);

