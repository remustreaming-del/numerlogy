// Canonical Mongolian astrology vocabulary. Client-safe: names, glyphs and
// grammatical forms only, no paid interpretation text.
//
// Mongolian is agglutinative and vowel-harmonic, so a text template such as
// "{planet} {sign} ордод" produces broken grammar ("Нар Хонь ордод"). Every
// noun that is substituted into a sentence therefore carries its own,
// explicit case forms. Sentence builders must use these forms and never
// glue suffixes onto names at runtime.

export type PointId =
  | "sun" | "moon" | "mercury" | "venus" | "mars" | "jupiter" | "saturn"
  | "uranus" | "neptune" | "pluto" | "node";
export type PlanetId = Exclude<PointId, "node">;
export type AngleId = "ascendant" | "midheaven";
export type AspectType = "conjunction" | "sextile" | "square" | "trine" | "opposition";
export type Element = "fire" | "earth" | "air" | "water";
export type Modality = "cardinal" | "fixed" | "mutable";

/** The eight cases: nominative, genitive, dative, accusative, ablative, instrumental, comitative, directive. */
export type Forms = { nom: string; gen: string; dat: string; acc: string; abl: string; ins: string; com: string; dir: string };

export const PLANET_ORDER: PlanetId[] = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];
export const POINT_ORDER: PointId[] = [...PLANET_ORDER, "node"];
export const PERSONAL: PointId[] = ["sun", "moon", "mercury", "venus", "mars"];
export const SOCIAL: PointId[] = ["jupiter", "saturn"];
export const GENERATIONAL: PointId[] = ["uranus", "neptune", "pluto"];

export const POINT_FORMS: Record<PointId, Forms> = {
  sun: { nom: "Нар", gen: "Нарны", dat: "Нарт", com: "Нартай", abl: "Нараас", acc: "Нарыг", ins: "Нараар", dir: "Нар руу" },
  moon: { nom: "Сар", gen: "Сарны", dat: "Сард", com: "Сартай", abl: "Сараас", acc: "Сарыг", ins: "Сараар", dir: "Сар руу" },
  mercury: { nom: "Буд", gen: "Будын", dat: "Буд гарагт", com: "Будтай", abl: "Буд гарагаас", acc: "Будыг", ins: "Будаар", dir: "Буд руу" },
  venus: { nom: "Сугар", gen: "Сугарын", dat: "Сугарт", com: "Сугартай", abl: "Сугараас", acc: "Сугарыг", ins: "Сугараар", dir: "Сугар руу" },
  mars: { nom: "Ангараг", gen: "Ангарагийн", dat: "Ангарагт", com: "Ангарагтай", abl: "Ангарагаас", acc: "Ангарагийг", ins: "Ангарагаар", dir: "Ангараг руу" },
  jupiter: { nom: "Бархасбадь", gen: "Бархасбадийн", dat: "Бархасбадьд", com: "Бархасбадьтай", abl: "Бархасбадиас", acc: "Бархасбадийг", ins: "Бархасбадиар", dir: "Бархасбадь руу" },
  saturn: { nom: "Санчир", gen: "Санчирын", dat: "Санчирт", com: "Санчиртай", abl: "Санчираас", acc: "Санчирыг", ins: "Санчираар", dir: "Санчир руу" },
  uranus: { nom: "Тэнгэрийн ван", gen: "Тэнгэрийн вангийн", dat: "Тэнгэрийн ванд", com: "Тэнгэрийн вантай", abl: "Тэнгэрийн вангаас", acc: "Тэнгэрийн ванг", ins: "Тэнгэрийн вангаар", dir: "Тэнгэрийн ван руу" },
  neptune: { nom: "Далайн ван", gen: "Далайн вангийн", dat: "Далайн ванд", com: "Далайн вантай", abl: "Далайн вангаас", acc: "Далайн ванг", ins: "Далайн вангаар", dir: "Далайн ван руу" },
  pluto: { nom: "Плутон", gen: "Плутоны", dat: "Плутонд", com: "Плутонтой", abl: "Плутоноос", acc: "Плутоныг", ins: "Плутоноор", dir: "Плутон руу" },
  node: { nom: "Сарны хойд зангилаа", gen: "Сарны хойд зангилааны", dat: "Сарны хойд зангилаанд", com: "Сарны хойд зангилаатай", abl: "Сарны хойд зангилаанаас", acc: "Сарны хойд зангилааг", ins: "Сарны хойд зангилаагаар", dir: "Сарны хойд зангилаа руу" },
};

export const ANGLE_FORMS: Record<AngleId, Forms & { short: string }> = {
  ascendant: { nom: "Мандах орд", gen: "Мандах ордын", dat: "Мандах ордод", com: "Мандах ордтой", abl: "Мандах ордоос", short: "ASC", acc: "Мандах ордыг", ins: "Мандах ордоор", dir: "Мандах орд руу" },
  midheaven: { nom: "Тэнгэрийн оргил", gen: "Тэнгэрийн оргилын", dat: "Тэнгэрийн оргилд", com: "Тэнгэрийн оргилтой", abl: "Тэнгэрийн оргилоос", short: "MC", acc: "Тэнгэрийн оргилыг", ins: "Тэнгэрийн оргилоор", dir: "Тэнгэрийн оргил руу" },
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

/** Sign names and complete phrases are stored explicitly; no suffix guessing. */
export const SIGN_FORMS = [
  { id: "aries", nom: "Хонь", gen: "Хонины", dat: "Хонинд", acc: "Хонийг", abl: "Хониноос", ins: "Хониор", com: "Хоньтой", dir: "Хонь руу", phrase: { nom: "Хонины орд", gen: "Хонины ордын", dat: "Хонины ордод", acc: "Хонины ордыг", abl: "Хонины ордоос", ins: "Хонины ордоор", com: "Хонины ордтой", dir: "Хонины орд руу" } },
  { id: "taurus", nom: "Үхэр", gen: "Үхрийн", dat: "Үхэрт", acc: "Үхрийг", abl: "Үхрээс", ins: "Үхрээр", com: "Үхэртэй", dir: "Үхэр рүү", phrase: { nom: "Үхрийн орд", gen: "Үхрийн ордын", dat: "Үхрийн ордод", acc: "Үхрийн ордыг", abl: "Үхрийн ордоос", ins: "Үхрийн ордоор", com: "Үхрийн ордтой", dir: "Үхрийн орд руу" } },
  { id: "gemini", nom: "Ихэр", gen: "Ихрийн", dat: "Ихэрт", acc: "Ихрийг", abl: "Ихрээс", ins: "Ихрээр", com: "Ихэртэй", dir: "Ихэр рүү", phrase: { nom: "Ихрийн орд", gen: "Ихрийн ордын", dat: "Ихрийн ордод", acc: "Ихрийн ордыг", abl: "Ихрийн ордоос", ins: "Ихрийн ордоор", com: "Ихрийн ордтой", dir: "Ихрийн орд руу" } },
  { id: "cancer", nom: "Мэлхий", gen: "Мэлхийн", dat: "Мэлхийд", acc: "Мэлхийг", abl: "Мэлхийнээс", ins: "Мэлхийгээр", com: "Мэлхийтэй", dir: "Мэлхий рүү", phrase: { nom: "Мэлхийн орд", gen: "Мэлхийн ордын", dat: "Мэлхийн ордод", acc: "Мэлхийн ордыг", abl: "Мэлхийн ордоос", ins: "Мэлхийн ордоор", com: "Мэлхийн ордтой", dir: "Мэлхийн орд руу" } },
  { id: "leo", nom: "Арслан", gen: "Арслангийн", dat: "Арсланд", acc: "Арсланг", abl: "Арслангаас", ins: "Арслангаар", com: "Арслантай", dir: "Арслан руу", phrase: { nom: "Арслангийн орд", gen: "Арслангийн ордын", dat: "Арслангийн ордод", acc: "Арслангийн ордыг", abl: "Арслангийн ордоос", ins: "Арслангийн ордоор", com: "Арслангийн ордтой", dir: "Арслангийн орд руу" } },
  { id: "virgo", nom: "Охин", gen: "Охины", dat: "Охинд", acc: "Охиныг", abl: "Охиноос", ins: "Охиноор", com: "Охинтой", dir: "Охин руу", phrase: { nom: "Охины орд", gen: "Охины ордын", dat: "Охины ордод", acc: "Охины ордыг", abl: "Охины ордоос", ins: "Охины ордоор", com: "Охины ордтой", dir: "Охины орд руу" } },
  { id: "libra", nom: "Жинлүүр", gen: "Жинлүүрийн", dat: "Жинлүүрт", acc: "Жинлүүрийг", abl: "Жинлүүрээс", ins: "Жинлүүрээр", com: "Жинлүүртэй", dir: "Жинлүүр рүү", phrase: { nom: "Жинлүүрийн орд", gen: "Жинлүүрийн ордын", dat: "Жинлүүрийн ордод", acc: "Жинлүүрийн ордыг", abl: "Жинлүүрийн ордоос", ins: "Жинлүүрийн ордоор", com: "Жинлүүрийн ордтой", dir: "Жинлүүрийн орд руу" } },
  { id: "scorpio", nom: "Хилэнц", gen: "Хилэнцийн", dat: "Хилэнцэд", acc: "Хилэнцийг", abl: "Хилэнцээс", ins: "Хилэнцээр", com: "Хилэнцтэй", dir: "Хилэнц рүү", phrase: { nom: "Хилэнцийн орд", gen: "Хилэнцийн ордын", dat: "Хилэнцийн ордод", acc: "Хилэнцийн ордыг", abl: "Хилэнцийн ордоос", ins: "Хилэнцийн ордоор", com: "Хилэнцийн ордтой", dir: "Хилэнцийн орд руу" } },
  { id: "sagittarius", nom: "Нум", gen: "Нумын", dat: "Нумд", acc: "Нумыг", abl: "Нумаас", ins: "Нумаар", com: "Нумтай", dir: "Нум руу", phrase: { nom: "Нумын орд", gen: "Нумын ордын", dat: "Нумын ордод", acc: "Нумын ордыг", abl: "Нумын ордоос", ins: "Нумын ордоор", com: "Нумын ордтой", dir: "Нумын орд руу" } },
  { id: "capricorn", nom: "Матар", gen: "Матрын", dat: "Матарт", acc: "Матрыг", abl: "Матраас", ins: "Матраар", com: "Матартай", dir: "Матар руу", phrase: { nom: "Матрын орд", gen: "Матрын ордын", dat: "Матрын ордод", acc: "Матрын ордыг", abl: "Матрын ордоос", ins: "Матрын ордоор", com: "Матрын ордтой", dir: "Матрын орд руу" } },
  { id: "aquarius", nom: "Хумх", gen: "Хумхын", dat: "Хумхад", acc: "Хумхыг", abl: "Хумхаас", ins: "Хумхаар", com: "Хумхтай", dir: "Хумх руу", phrase: { nom: "Хумхын орд", gen: "Хумхын ордын", dat: "Хумхын ордод", acc: "Хумхын ордыг", abl: "Хумхын ордоос", ins: "Хумхын ордоор", com: "Хумхын ордтой", dir: "Хумхын орд руу" } },
  { id: "pisces", nom: "Загас", gen: "Загасны", dat: "Загасанд", acc: "Загасыг", abl: "Загаснаас", ins: "Загасаар", com: "Загастай", dir: "Загас руу", phrase: { nom: "Загасны орд", gen: "Загасны ордын", dat: "Загасны ордод", acc: "Загасны ордыг", abl: "Загасны ордоос", ins: "Загасны ордоор", com: "Загасны ордтой", dir: "Загасны орд руу" } },
] as const satisfies readonly (Forms & { id: string; phrase: Forms })[];
export const SIGN_NAMES = SIGN_FORMS.map((sign) => sign.nom);
export const SIGN_GEN = SIGN_FORMS.map((sign) => sign.gen);
export const SIGN_GLYPHS = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"] as const;
export const SIGN_ABBR = ["Хн", "Үх", "Их", "Мл", "Ар", "Ох", "Жн", "Хл", "Нм", "Мт", "Хм", "Зг"] as const;

export const signPhrase = (index: number) => SIGN_FORMS[index].phrase.nom;
export const inSign = (index: number) => SIGN_FORMS[index].phrase.dat;
export const ofSign = (index: number) => SIGN_FORMS[index].phrase.gen;

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
  acc: `${ORDINALS[n - 1]} байшинг`,
  abl: `${ORDINALS[n - 1]} байшингаас`,
  ins: `${ORDINALS[n - 1]} байшингаар`,
  com: `${ORDINALS[n - 1]} байшинтай`,
  dir: `${ORDINALS[n - 1]} байшин руу`,
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
