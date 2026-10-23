// Canonical Mongolian astrology vocabulary. Client-safe: names, glyphs and
// grammatical forms only, no paid interpretation text.
//
// Mongolian is agglutinative and vowel-harmonic, so a text template such as
// "{planet} {sign} ордод" produces broken grammar ("Нар Хонь ордод"). Every
// noun that is substituted into a sentence therefore carries its own,
// hand-checked case forms. Sentence builders must use these forms and never
// glue suffixes onto names at runtime.

export type PointId =
  | "sun" | "moon" | "mercury" | "venus" | "mars" | "jupiter" | "saturn"
  | "uranus" | "neptune" | "pluto" | "node";
export type PlanetId = Exclude<PointId, "node">;
export type AngleId = "ascendant" | "midheaven";
export type AspectType = "conjunction" | "sextile" | "square" | "trine" | "opposition";
export type Element = "fire" | "earth" | "air" | "water";
export type Modality = "cardinal" | "fixed" | "mutable";

/** nom = нэрлэхийн, gen = харьяалахын, dat = өгөх-оршихын, com = хамтрахын, abl = гарахын. */
export type Forms = { nom: string; gen: string; dat: string; com: string; abl: string };

export const PLANET_ORDER: PlanetId[] = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];
export const POINT_ORDER: PointId[] = [...PLANET_ORDER, "node"];
export const PERSONAL: PointId[] = ["sun", "moon", "mercury", "venus", "mars"];
export const SOCIAL: PointId[] = ["jupiter", "saturn"];
export const GENERATIONAL: PointId[] = ["uranus", "neptune", "pluto"];

export const POINT_FORMS: Record<PointId, Forms> = {
  sun: { nom: "Нар", gen: "Нарны", dat: "Нарт", com: "Нартай", abl: "Нараас" },
  moon: { nom: "Сар", gen: "Сарны", dat: "Сард", com: "Сартай", abl: "Сараас" },
  mercury: { nom: "Буд", gen: "Будын", dat: "Буд гарагт", com: "Будтай", abl: "Буд гарагаас" },
  venus: { nom: "Сугар", gen: "Сугарын", dat: "Сугарт", com: "Сугартай", abl: "Сугараас" },
  mars: { nom: "Ангараг", gen: "Ангарагийн", dat: "Ангарагт", com: "Ангарагтай", abl: "Ангарагаас" },
  jupiter: { nom: "Бархасбадь", gen: "Бархасбадийн", dat: "Бархасбадьд", com: "Бархасбадьтай", abl: "Бархасбадиас" },
  saturn: { nom: "Санчир", gen: "Санчирын", dat: "Санчирт", com: "Санчиртай", abl: "Санчираас" },
  uranus: { nom: "Тэнгэрийн ван", gen: "Тэнгэрийн вангийн", dat: "Тэнгэрийн ванд", com: "Тэнгэрийн вантай", abl: "Тэнгэрийн вангаас" },
  neptune: { nom: "Далайн ван", gen: "Далайн вангийн", dat: "Далайн ванд", com: "Далайн вантай", abl: "Далайн вангаас" },
  pluto: { nom: "Плутон", gen: "Плутоны", dat: "Плутонд", com: "Плутонтой", abl: "Плутоноос" },
  node: { nom: "Сарны хойд зангилаа", gen: "Сарны хойд зангилааны", dat: "Сарны хойд зангилаанд", com: "Сарны хойд зангилаатай", abl: "Сарны хойд зангилаанаас" },
};

export const ANGLE_FORMS: Record<AngleId, Forms & { short: string }> = {
  ascendant: { nom: "Мандах орд", gen: "Мандах ордын", dat: "Мандах ордод", com: "Мандах ордтой", abl: "Мандах ордоос", short: "ASC" },
  midheaven: { nom: "Тэнгэрийн оргил", gen: "Тэнгэрийн оргилын", dat: "Тэнгэрийн оргилд", com: "Тэнгэрийн оргилтой", abl: "Тэнгэрийн оргилоос", short: "MC" },
};

export const POINT_GLYPHS: Record<PointId, string> = {
  sun: "☉", moon: "☽", mercury: "☿", venus: "♀", mars: "♂", jupiter: "♃",
  saturn: "♄", uranus: "♅", neptune: "♆", pluto: "♇", node: "☊",
};

/** Two-letter Cyrillic marks for media without astrological glyphs (PDF font). */
export const POINT_ABBR: Record<PointId, string> = {
  sun: "Нр", moon: "Ср", mercury: "Бд", venus: "Сг", mars: "Ан", jupiter: "Бх",
  saturn: "Сч", uranus: "Тв", neptune: "Дв", pluto: "Пл", node: "Зн",
};

export const SIGN_NAMES = ["Хонь", "Үхэр", "Ихэр", "Мэлхий", "Арслан", "Охин", "Жинлүүр", "Хилэнц", "Нум", "Матар", "Хумх", "Загас"] as const;
/** Genitive, used as "Хонины орд", "Хонины ордод". */
export const SIGN_GEN = ["Хонины", "Үхрийн", "Ихрийн", "Мэлхийн", "Арслангийн", "Охины", "Жинлүүрийн", "Хилэнцийн", "Нумын", "Матарын", "Хумхын", "Загасны"] as const;
export const SIGN_GLYPHS = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"] as const;
export const SIGN_ABBR = ["Хн", "Үх", "Их", "Мл", "Ар", "Ох", "Жн", "Хл", "Нм", "Мт", "Хм", "Зг"] as const;

export const signPhrase = (index: number) => `${SIGN_GEN[index]} орд`;
export const inSign = (index: number) => `${SIGN_GEN[index]} ордод`;
export const ofSign = (index: number) => `${SIGN_GEN[index]} ордын`;

export const SIGN_ELEMENT: Element[] = ["fire", "earth", "air", "water", "fire", "earth", "air", "water", "fire", "earth", "air", "water"];
export const SIGN_MODALITY: Modality[] = ["cardinal", "fixed", "mutable", "cardinal", "fixed", "mutable", "cardinal", "fixed", "mutable", "cardinal", "fixed", "mutable"];

export const ELEMENT_NAMES: Record<Element, { nom: string; gen: string }> = {
  fire: { nom: "Гал", gen: "Галын" },
  earth: { nom: "Шороо", gen: "Шорооны" },
  air: { nom: "Агаар", gen: "Агаарын" },
  water: { nom: "Ус", gen: "Усны" },
};
export const MODALITY_NAMES: Record<Modality, { nom: string; gen: string }> = {
  cardinal: { nom: "Эхлүүлэгч", gen: "Эхлүүлэгч" },
  fixed: { nom: "Тогтвортой", gen: "Тогтвортой" },
  mutable: { nom: "Уян хатан", gen: "Уян хатан" },
};

const ORDINALS = ["нэгдүгээр", "хоёрдугаар", "гуравдугаар", "дөрөвдүгээр", "тавдугаар", "зургаадугаар", "долоодугаар", "наймдугаар", "есдүгээр", "аравдугаар", "арван нэгдүгээр", "арван хоёрдугаар"] as const;
/** "нэгдүгээр байшин" / "нэгдүгээр байшингийн" / "нэгдүгээр байшинд". */
export const house = (n: number) => ({
  nom: `${ORDINALS[n - 1]} байшин`,
  gen: `${ORDINALS[n - 1]} байшингийн`,
  dat: `${ORDINALS[n - 1]} байшинд`,
  short: `${n}-р байшин`,
});

export const ASPECT_NAMES: Record<AspectType, { nom: string; gen: string; angle: number; glyph: string }> = {
  conjunction: { nom: "Нэгдэл", gen: "нэгдлийн", angle: 0, glyph: "☌" },
  sextile: { nom: "Секстиль", gen: "секстилийн", angle: 60, glyph: "⚹" },
  square: { nom: "Квадрат", gen: "квадратын", angle: 90, glyph: "□" },
  trine: { nom: "Трин", gen: "трины", angle: 120, glyph: "△" },
  opposition: { nom: "Эсрэгцэл", gen: "эсрэгцлийн", angle: 180, glyph: "☍" },
};

/** Traditional rulers; modern co-rulers listed separately and used as secondary. */
export const SIGN_RULER: PlanetId[] = ["mars", "venus", "mercury", "moon", "sun", "mercury", "venus", "mars", "jupiter", "saturn", "saturn", "jupiter"];
export const SIGN_MODERN_RULER: Partial<Record<number, PlanetId>> = { 7: "pluto", 10: "uranus", 11: "neptune" };

export type Dignity = "domicile" | "exaltation" | "detriment" | "fall";
const EXALTATION: Partial<Record<PlanetId, number>> = { sun: 0, moon: 1, mercury: 5, venus: 11, mars: 9, jupiter: 3, saturn: 6 };
export function dignityOf(planet: PointId, sign: number): Dignity | null {
  if (planet === "node" || GENERATIONAL.includes(planet)) return null;
  const rules = SIGN_RULER.map((ruler, index) => ruler === planet ? index : -1).filter((index) => index >= 0);
  if (rules.includes(sign)) return "domicile";
  if (rules.some((index) => (index + 6) % 12 === sign)) return "detriment";
  const exalted = EXALTATION[planet as PlanetId];
  if (exalted === sign) return "exaltation";
  if (exalted != null && (exalted + 6) % 12 === sign) return "fall";
  return null;
}

export const HOUSE_SYSTEM_NAMES = { placidus: "Плацидус", "whole-sign": "Бүхэл ордын систем", none: "Байшингүй (төрсөн цаг тодорхойгүй)" } as const;

/** Short labels for tables and wheel tooltips. */
export const UI_LABELS = {
  point: "Цэг",
  signDegree: "Орд, хэм",
  house: "Байшин",
  retrograde: "Ретроград",
  ascendant: "Мандах орд",
  midheaven: "Тэнгэрийн оргил",
  descendant: "Шингэх цэг",
  imumCoeli: "Тэнгэрийн ёроол",
} as const;
