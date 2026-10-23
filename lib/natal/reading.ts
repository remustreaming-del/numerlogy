// Server-only: assembles the paid natal reading from verified chart data and
// the reviewed Mongolian content library. Never import from client code.
import { calculateNatalChart, isMongolianZone, type NatalAspect, type NatalChart, type NatalInput, type PlanetPosition } from "../astrology.ts";
import { ANGULAR_PLANET, ASCENDANT_IN_SIGN, MIDHEAVEN_IN_SIGN } from "./content/angles.ts";
import { ASPECT_TYPE_TAILS, PAIR_ASPECTS, SLOW_PAIR_ASPECTS, type AspectFamily } from "./content/aspects.ts";
import {
  BALANCED_ELEMENTS, CHART_RULER, CHART_RULER_INTRO, DIGNITY_LABEL, DIGNITY_TEXT, ELEMENT_DOMINANT, ELEMENT_LACKING, HEMISPHERE, HOUSE_THEME,
  MODALITY_DOMINANT, MODALITY_LACKING, MOON_PHASES, READING_COPY, RETROGRADE, SIGN_KEYWORDS, SIGN_STYLE,
} from "./content/overview.ts";
import { PLANET_IN_HOUSE } from "./content/planets-in-houses.ts";
import { PLANET_IN_SIGN } from "./content/planets-in-signs.ts";
import { FREE_ELEMENT } from "./free.ts";
import { READING_GROUPS, type NatalReading, type ReadingGroup, type ReadingSection } from "./reading-types.ts";
import {
  ASPECT_NAMES, ELEMENT_NAMES, GENERATIONAL, HOUSE_SYSTEM_NAMES, PERSONAL, PLANET_ORDER, POINT_FORMS, SIGN_ELEMENT, SIGN_MODERN_RULER, SIGN_RULER, SOCIAL,
  house, inSign, signPhrase, type Element, type PlanetId, type PointId,
} from "./terms.ts";

export const CONTENT_VERSION = "2026-10-23.v2";

export { READING_GROUPS, type NatalReading, type ReadingGroup, type ReadingSection };

const MAX_ASPECTS = 12;
const TIGHT_ORB_LINES = [
  "Орб нэг хэмээс бага тул энэ харьцаа таны зурагт хамгийн тод сонсогдох сэдвүүдийн нэг.",
  "Энэ харьцаа бараг яг тохирох өнцөгтэй тул амьдралд тань байнга мэдрэгдэх магадлалтай.",
  "Өнцөг нь бараг төгс тохирч байгаа нь энэ сэдвийг таны зургийн гол өнгө аясын нэг болгодог.",
];
const pad = (value: number) => String(value).padStart(2, "0");
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const degrees = (position: Pick<PlanetPosition, "degree" | "minute">) => `${position.degree}°${pad(position.minute)}′`;
const joinNames = (names: string[]) => names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} ба ${names[names.length - 1]}`;

function placementMeta(position: PlanetPosition) {
  const parts = [`${signPhrase(position.signIndex)} ${degrees(position)}`];
  if (position.house) parts.push(house(position.house).short);
  if (position.retrograde && position.id !== "node") parts.push("ретроград");
  return parts.join(" · ");
}

function dignityParagraph(chart: NatalChart, position: PlanetPosition) {
  if (!position.dignity) return null;
  const forms = POINT_FORMS[position.id as PointId];
  // Rotate wording by the planet's rank among planets sharing this dignity.
  const rank = chart.planets.filter((planet) => planet.dignity === position.dignity).findIndex((planet) => planet.id === position.id);
  const variants = DIGNITY_TEXT[position.dignity];
  return `${forms.nom} ${DIGNITY_LABEL[position.dignity]} буюу ${inSign(position.signIndex)} байгаа тул ${variants[Math.max(0, rank) % variants.length]}`;
}

function planetSection(chart: NatalChart, position: PlanetPosition, group: ReadingSection["group"]): ReadingSection {
  const id = position.id as PointId;
  const paragraphs = [PLANET_IN_SIGN[id][position.signIndex]];
  if (position.house) paragraphs.push(PLANET_IN_HOUSE[id][position.house - 1]);
  const dignity = dignityParagraph(chart, position);
  if (dignity) paragraphs.push(dignity);
  if (position.retrograde && RETROGRADE[id as PlanetId]) paragraphs.push(RETROGRADE[id as PlanetId]!);
  for (const contact of chart.angular.filter((item) => item.planet === id)) paragraphs.push(ANGULAR_PLANET[contact.planet][contact.angle]);
  return { id, group, title: POINT_FORMS[id].nom, meta: placementMeta(position), paragraphs };
}

// ---------------------------------------------------------------- aspects

const category = (id: PointId) => PERSONAL.includes(id) ? 3 : SOCIAL.includes(id) ? 2 : 1;
const familyOf = (type: NatalAspect["type"]): AspectFamily => type === "conjunction" ? "conjunction" : type === "trine" || type === "sextile" ? "harmonious" : "challenging";
const pairKey = (a: PlanetId, b: PlanetId) => PLANET_ORDER.indexOf(a) < PLANET_ORDER.indexOf(b) ? `${a}-${b}` : `${b}-${a}`;

function aspectScore(aspect: NatalAspect) {
  const luminary = [aspect.a, aspect.b].some((id) => id === "sun" || id === "moon") ? 0.5 : 0;
  // The Sun is never far from Mercury and Venus, so their conjunctions are too common to lead the list.
  const common = aspect.a === "sun" && (aspect.b === "mercury" || aspect.b === "venus") ? 0.6 : 1;
  return ((category(aspect.a) + category(aspect.b)) / 2 + luminary) * (1 - (aspect.orb / aspect.maxOrb) * 0.6) * common;
}

function aspectText(aspect: NatalAspect) {
  const key = pairKey(aspect.a, aspect.b);
  const pair = PAIR_ASPECTS[key];
  if (pair) { const text = pair[familyOf(aspect.type)]; return text ? { theme: pair.theme, text } : null; }
  const slow = SLOW_PAIR_ASPECTS[key];
  return slow ? { theme: slow.theme, text: slow.text } : null;
}

/** The closest, most personal aspects first; outer-planet pairs shared by a whole generation are left out. */
export function selectAspects(chart: NatalChart) {
  return chart.aspects
    .filter((aspect) => !(GENERATIONAL.includes(aspect.a) && GENERATIONAL.includes(aspect.b)) && aspectText(aspect))
    .sort((x, y) => aspectScore(y) - aspectScore(x))
    .slice(0, MAX_ASPECTS);
}

function aspectSections(chart: NatalChart): ReadingSection[] {
  const tailUse: Record<string, number> = {};
  const selected = selectAspects(chart);
  const sections: ReadingSection[] = [{ id: "aspects-intro", group: "aspects", title: "Аспект гэж юу вэ", paragraphs: [READING_COPY.aspectsIntro, `Доор таны зургийн хамгийн нягт, хувийн шинжтэй аспектуудыг ач холбогдлоор нь эрэмбэлэв (нийт ${chart.aspects.length} аспектаас ${selected.length}).`] }];
  let tight = 0;
  selected.forEach((aspect, index) => {
    const content = aspectText(aspect)!;
    const paragraphs = [content.text];
    if (aspect.type !== "conjunction") {
      const tails = ASPECT_TYPE_TAILS[aspect.type];
      const used = tailUse[aspect.type] = (tailUse[aspect.type] ?? -1) + 1;
      if (used < tails.length) paragraphs.push(tails[used]);
    }
    if (aspect.orb < 1 && tight < TIGHT_ORB_LINES.length) paragraphs.push(TIGHT_ORB_LINES[tight++]);
    const a = POINT_FORMS[aspect.a], b = POINT_FORMS[aspect.b], name = ASPECT_NAMES[aspect.type];
    sections.push({ id: `aspect-${index + 1}`, group: "aspects", title: `${a.nom} ${name.glyph} ${b.nom}`, meta: `${name.nom} · орб ${aspect.orb.toFixed(1)}°`, paragraphs });
  });
  return sections;
}

// ---------------------------------------------------------------- overview

const percent = (value: number, total: number) => `${Math.round((value / total) * 100)}%`;

function overviewSections(chart: NatalChart): ReadingSection[] {
  const { balance } = chart;
  const total = Object.values(balance.elements).reduce((sum, value) => sum + value, 0);
  const paragraphs: string[] = [balance.dominantElement ? ELEMENT_DOMINANT[balance.dominantElement] : BALANCED_ELEMENTS];
  for (const element of balance.lackingElements) paragraphs.push(ELEMENT_LACKING[element]);
  if (balance.dominantModality) paragraphs.push(MODALITY_DOMINANT[balance.dominantModality]);
  for (const modality of balance.lackingModalities) paragraphs.push(MODALITY_LACKING[modality]);
  const sections: ReadingSection[] = [{
    id: "balance", group: "overview", title: "Махбод ба хэв шинж",
    meta: (Object.keys(balance.elements) as Element[]).map((element) => `${ELEMENT_NAMES[element].nom} ${percent(balance.elements[element], total)}`).join(" · "),
    paragraphs,
  }];

  const phase = MOON_PHASES[chart.moonPhase.index];
  sections.push({ id: "moon-phase", group: "overview", title: "Сарны үе", meta: `${phase.name} · Нараас ${Math.round(chart.moonPhase.angle)}°`, paragraphs: [phase.text] });

  if (chart.ascendant) {
    const ruler = SIGN_RULER[chart.ascendant.signIndex];
    const position = chart.planets.find((planet) => planet.id === ruler)!;
    const rulerParagraphs = [CHART_RULER_INTRO, CHART_RULER[ruler as keyof typeof CHART_RULER]];
    rulerParagraphs.push(`${POINT_FORMS[ruler].nom} ${inSign(position.signIndex)}, ${house(position.house!).dat} байгаа тул «${HOUSE_THEME[position.house! - 1]}» гэсэн хүрээ таны амьдралын гол тайз болох хандлагатай.`);
    const modern = SIGN_MODERN_RULER[chart.ascendant.signIndex];
    if (modern) {
      const co = chart.planets.find((planet) => planet.id === modern)!;
      rulerParagraphs.push(`Орчин үеийн астрологид ${POINT_FORMS[modern].nom} гарагийг мөн энэ ордын хамтран эзэн гэж үздэг. ${POINT_FORMS[modern].nom} ${house(co.house!).dat} байгаа нь «${HOUSE_THEME[co.house! - 1]}» гэсэн хүрээг мөн тодотгоно.`);
    }
    sections.push({ id: "chart-ruler", group: "overview", title: "Зургийн эзэн гараг", meta: `${POINT_FORMS[ruler].nom} · ${placementMeta(position)}`, paragraphs: rulerParagraphs });
  }

  const shape: string[] = [];
  if (chart.hemispheres) {
    const h = chart.hemispheres;
    if (h.east >= 7) shape.push(HEMISPHERE.east); else if (h.west >= 7) shape.push(HEMISPHERE.west);
    if (h.north >= 7) shape.push(HEMISPHERE.north); else if (h.south >= 7) shape.push(HEMISPHERE.south);
  }
  const signGroups = chart.stelliums.filter((item) => item.kind === "sign");
  const houseGroups = chart.stelliums.filter((item) => item.kind === "house");
  const same = (a: PlanetId[], b: PlanetId[]) => a.length === b.length && a.every((id) => b.includes(id));
  for (const stellium of signGroups) {
    const names = joinNames(stellium.planets.map((id) => POINT_FORMS[id].nom));
    const twin = houseGroups.find((item) => same(item.planets, stellium.planets));
    shape.push(twin
      ? `${inSign(stellium.index)}, ${house(twin.index).dat} ${names} цугларч стеллиум буюу гарагийн бөөгнөрөл үүсгэсэн. Энэ нь «${SIGN_KEYWORDS[stellium.index]}» гэсэн чанар «${HOUSE_THEME[twin.index - 1]}» гэсэн хүрээнд таны амьдралд онцгой хүчтэй, давтагдан илэрдгийг харуулна.`
      : `${inSign(stellium.index)} ${names} цугларч стеллиум буюу гарагийн бөөгнөрөл үүсгэсэн. Энэ нь «${SIGN_KEYWORDS[stellium.index]}» гэсэн сэдэв таны амьдралд онцгой хүчтэй, давтагдан илэрдгийг харуулна.`);
  }
  for (const stellium of houseGroups) {
    if (signGroups.some((item) => same(item.planets, stellium.planets))) continue;
    const names = joinNames(stellium.planets.map((id) => POINT_FORMS[id].nom));
    shape.push(`${capitalize(house(stellium.index).dat)} ${names} цугларсан нь «${HOUSE_THEME[stellium.index - 1]}» гэсэн хүрээ таны амьдралын гол талбар болохыг харуулна.`);
  }
  if (shape.length) sections.push({ id: "chart-shape", group: "overview", title: "Зургийн хэлбэр", paragraphs: shape });
  return sections;
}

// ---------------------------------------------------------------- core, direction

function coreSections(chart: NatalChart): ReadingSection[] {
  const [sun, moon] = chart.planets;
  const sections = [planetSection(chart, sun, "core"), planetSection(chart, moon, "core")];
  if (chart.moonRange && chart.moonRange.start !== chart.moonRange.end) {
    const other = chart.moonRange.start === moon.signIndex ? chart.moonRange.end : chart.moonRange.start;
    sections[1].paragraphs.push(`Төрсөн цаг тодорхойгүй тул Сар ${inSign(other)} байсан байх магадлал ч бий. Тэр тохиолдолд: ${PLANET_IN_SIGN.moon[other]}`);
  }
  if (chart.ascendant) {
    const paragraphs = [READING_COPY.ascendantTerm, ASCENDANT_IN_SIGN[chart.ascendant.signIndex]];
    const notice = chart.notices.find((item) => item.kind === "asc-sensitive");
    if (notice) paragraphs.push(notice.text);
    sections.push({ id: "ascendant", group: "core", title: "Мандах орд", meta: `${signPhrase(chart.ascendant.signIndex)} ${degrees(chart.ascendant)}`, paragraphs });
  }
  return sections;
}

function directionSections(chart: NatalChart): ReadingSection[] {
  const sections: ReadingSection[] = [];
  if (chart.midheaven && chart.houses) {
    const paragraphs = [READING_COPY.midheavenTerm, MIDHEAVEN_IN_SIGN[chart.midheaven.signIndex]];
    const tenth = chart.houses[9];
    const ruler = SIGN_RULER[tenth.signIndex], position = chart.planets.find((planet) => planet.id === ruler)!;
    paragraphs.push(position.house === 10
      ? `Аравдугаар байшингийн эзэн гараг ${POINT_FORMS[ruler].nom} өөрийн байшиндаа байгаа тул мэргэжлийн зорилго тань бие даасан, тод илэрхийлэгддэг.`
      : `Аравдугаар байшингийн эзэн гараг ${POINT_FORMS[ruler].nom} ${house(position.house!).dat} байгаа тул мэргэжлийн замнал тань «${HOUSE_THEME[position.house! - 1]}» гэсэн хүрээтэй нягт холбогдоно.`);
    sections.push({ id: "midheaven", group: "direction", title: "Тэнгэрийн оргил", meta: `${signPhrase(chart.midheaven.signIndex)} ${degrees(chart.midheaven)}`, paragraphs });
  }
  const node = chart.node;
  const nodeParagraphs = [READING_COPY.nodeTerm, PLANET_IN_SIGN.node[node.signIndex]];
  if (node.house) nodeParagraphs.push(PLANET_IN_HOUSE.node[node.house - 1]);
  sections.push({ id: "node", group: "direction", title: POINT_FORMS.node.nom, meta: placementMeta(node), paragraphs: nodeParagraphs });
  return sections;
}

// ---------------------------------------------------------------- houses

/** One planet often rules two or three cusps; later mentions are worded differently so the overview never repeats itself. */
function rulerSentence(ruler: PlanetId, rulerHouse: number, ownHouse: number, use: number) {
  const name = POINT_FORMS[ruler].nom, theme = HOUSE_THEME[rulerHouse - 1];
  if (rulerHouse === ownHouse) return use === 1 ? `Эзэн гараг ${name} өөрийн байшиндаа байгаа тул энэ сэдэв бие даан, хүчтэй илэрнэ.` : `${name} энэ байшингаа өөрөө эзэмшиж байгаа тул сэдэв нь шууд, тод илэрдэг.`;
  if (use === 1) return `Эзэн гараг ${name} ${house(rulerHouse).dat} байгаа тул энэ сэдэв «${theme}» гэсэн хүрээтэй холбогдоно.`;
  if (use === 2) return `Энэ байшинг ч мөн ${name} захирдаг тул сэдэв нь «${theme}» гэсэн хүрээгээр дамжин илэрнэ.`;
  return `Эзэн гараг нь дахин ${name} тул дээрх холбоо энд ч мөн хамаатай.`;
}

function houseSections(chart: NatalChart): ReadingSection[] {
  if (!chart.houses) return [];
  const sections: ReadingSection[] = [{ id: "houses-intro", group: "houses", title: "Байшингуудыг хэрхэн унших вэ", paragraphs: [READING_COPY.housesIntro, READING_COPY.emptyHouse, `Байшингийн систем: ${HOUSE_SYSTEM_NAMES[chart.houseSystem]}.`] }];
  const rulerUse: Partial<Record<PlanetId, number>> = {};
  for (const cusp of chart.houses) {
    const h = house(cusp.house);
    const occupants = chart.planets.filter((planet) => planet.house === cusp.house).map((planet) => planet.name);
    const ruler = SIGN_RULER[cusp.signIndex], position = chart.planets.find((planet) => planet.id === ruler)!;
    const sentences = [
      `${capitalize(h.nom)} — ${HOUSE_THEME[cusp.house - 1]}.`,
      `Оройн цэг нь ${inSign(cusp.signIndex)} байгаа тул энэ хүрээнд та ${SIGN_STYLE[cusp.signIndex]} ханддаг.`,
      occupants.length ? `Энд ${joinNames(occupants)} байрласан нь энэ сэдвийг идэвхжүүлнэ.` : "",
      rulerSentence(ruler, position.house!, cusp.house, rulerUse[ruler] = (rulerUse[ruler] ?? 0) + 1),
    ].filter(Boolean);
    sections.push({ id: `house-${cusp.house}`, group: "houses", title: h.short, meta: `${signPhrase(cusp.signIndex)} ${degrees(cusp)}${occupants.length ? ` · ${occupants.join(", ")}` : ""}`, paragraphs: [sentences.join(" ")] });
  }
  return sections;
}

// ---------------------------------------------------------------- synthesis

const STRENGTH_TONES = ["хоорондоо эвтэй урсдаг", "бие биеэ аяндаа дэмждэг", "гэсэн хослол танд амархан ирдэг нөөц"];
const CHALLENGE_TONES = ["хоорондоо хурцадмал ч энэ нь таныг хөгжүүлдэг", "хоорондын үрэлт таныг үйлдэлд түлхдэг", "гэсэн сэдэв амьдралын туршид тань дахин дахин сорилт болж, улмаар ур чадвар болно"];

function dignityGroups(chart: NatalChart, kinds: ("domicile" | "exaltation" | "detriment" | "fall")[]) {
  return kinds.map((kind) => ({ kind, names: chart.planets.filter((planet) => planet.dignity === kind).map((planet) => planet.name) })).filter((item) => item.names.length);
}

function synthesisSections(chart: NatalChart): ReadingSection[] {
  const selected = selectAspects(chart);
  const describe = (aspect: NatalAspect, tone: string) => `${POINT_FORMS[aspect.a].nom} ба ${POINT_FORMS[aspect.b].gen} ${ASPECT_NAMES[aspect.type].nom.toLowerCase()}: «${aspectText(aspect)!.theme}» ${tone}.`;
  const strengths = selected.filter((aspect) => aspect.type === "trine" || aspect.type === "sextile").slice(0, 3).map((aspect, index) => describe(aspect, STRENGTH_TONES[index]));
  const strong = dignityGroups(chart, ["domicile", "exaltation"]);
  if (strong.length) strengths.push(`${strong.map((item) => `${joinNames(item.names)} ${DIGNITY_LABEL[item.kind]}`).join(", ")} байгаа нь ${strong.reduce((sum, item) => sum + item.names.length, 0) > 1 ? "эдгээр гарагийн" : "түүний"} чанарыг танд байгалийн нөөц болгодог.`);
  if (chart.balance.dominantElement) strengths.push(`${ELEMENT_NAMES[chart.balance.dominantElement].gen} махбодын давамгайлал танд «${FREE_ELEMENT[chart.balance.dominantElement]}» гэсэн тод хүч өгдөг.`);
  const angular = [...new Set(chart.angular.map((contact) => contact.planet))].slice(0, 2);
  if (angular.length) strengths.push(`${joinNames(angular.map((id) => POINT_FORMS[id].nom))} зургийн тэнхлэгт ойр байгаа тул ${angular.length > 1 ? "тэдгээрийн" : "түүний"} чанар таны амьдралд онцгой тод харагдана.`);

  const challenges = selected.filter((aspect) => aspect.type === "square" || aspect.type === "opposition").slice(0, 3).map((aspect, index) => describe(aspect, CHALLENGE_TONES[index]));
  const weak = dignityGroups(chart, ["detriment", "fall"]);
  if (weak.length) challenges.push(`${weak.map((item) => `${joinNames(item.names)} ${DIGNITY_LABEL[item.kind]}`).join(", ")} байгаа тул ${weak.reduce((sum, item) => sum + item.names.length, 0) > 1 ? "эдгээр гарагийн" : "түүний"} чанарыг ухамсартай хөгжүүлэх нь таны өвөрмөц ур чадвар болно.`);
  for (const element of chart.balance.lackingElements) challenges.push(`${ELEMENT_NAMES[element].nom} махбод сул тул «${FREE_ELEMENT[element]}» гэсэн чанарыг зориуд тэтгэх хэрэгтэй.`);
  const saturn = chart.planets.find((planet) => planet.id === "saturn")!;
  if (saturn.house) challenges.push(`Санчир ${house(saturn.house).dat} байгаа тул «${HOUSE_THEME[saturn.house - 1]}» гэсэн хүрээнд та цаг хугацаатай хамт боловсорч, хамгийн бат бөх ур чадвараа бүтээнэ.`);

  const [sun, moon] = chart.planets;
  const sunElement = SIGN_ELEMENT[sun.signIndex], moonElement = SIGN_ELEMENT[moon.signIndex];
  const summary = [`Нэгтгэн хэлбэл, таны амьдралын төв болох Нар «${SIGN_KEYWORDS[sun.signIndex]}», сэтгэлийн хэрэгцээ болох Сар «${SIGN_KEYWORDS[moon.signIndex]}»${chart.ascendant ? `, бусадтай уулзах хаалга болох Мандах орд «${SIGN_KEYWORDS[chart.ascendant.signIndex]}»` : ""} гэсэн чанарыг тээдэг.`];
  summary.push(sunElement === moonElement
    ? `Нар, Сар хоёулаа ${ELEMENT_NAMES[sunElement].gen} махбодын ордод байгаа тул хүсэл ба мэдрэмж тань нэг хэлээр ярьдаг. Энэ нэгдмэл байдал танд тод чиглэл өгөх ч бусад махбодын өнцгийг ч ухамсартайгаар нэмэх нь тустай.`
    : `Нар ${ELEMENT_NAMES[sunElement].gen}, Сар ${ELEMENT_NAMES[moonElement].gen} махбодын ордод байгаа тул хүсэл тань «${FREE_ELEMENT[sunElement]}», сэтгэл тань «${FREE_ELEMENT[moonElement]}» гэсэн өөр хэрэгцээтэй. Энэ хоёрыг хоёуланг нь хүндэтгэх нь таны дотоод тэнцвэрийн түлхүүр.`);
  summary.push(...READING_COPY.closing);

  return [
    { id: "strengths", group: "synthesis", title: "Давуу тал ба нөөц", paragraphs: strengths.length ? strengths : ["Таны зурагт аль нэг хүч хэт давамгайлаагүй тул нөхцөл байдалд тохируулан олон янзын нөөцөө ашиглах боломжтой."] },
    { id: "challenges", group: "synthesis", title: "Өсөлтийн сорилт", paragraphs: challenges.length ? challenges : ["Таны зурагт хурцадмал харьцаа цөөн байгаа нь амьдралын урсгал тань харьцангуй зөөлөн гэсэн үг. Өсөлтийн түлхэцийг та өөрөө зориуд сонгож, шинэ сорилт хүлээн авах тусам илүү хөгжинө."] },
    { id: "summary", group: "synthesis", title: "Эцсийн үг", paragraphs: summary },
  ];
}

// ---------------------------------------------------------------- method

function hemisphere(value: number, positive: string, negative: string) {
  return `${Math.abs(value).toFixed(2)}° ${value >= 0 ? positive : negative}`;
}

function methodSection(chart: NatalChart): ReadingSection {
  const [general, time, orbs] = READING_COPY.method;
  const paragraphs = [general, isMongolianZone(chart.city.timezone) ? `${time} ${READING_COPY.mongoliaDst}` : time, orbs];
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2})?([+-]\d{2}:\d{2}|Z)$/.exec(chart.local);
  const local = match ? `${match[1]} ${match[2]} (UTC${match[3] === "Z" ? "+00:00" : match[3]})` : chart.local;
  paragraphs.push(`Тооцоонд ашигласан агшин: орон нутгийн цагаар ${local}, дэлхийн цагаар ${chart.utc.slice(0, 16).replace("T", " ")} UTC. Газар: ${chart.city.name} — ${hemisphere(chart.city.latitude, "хойд өргөрөг", "өмнөд өргөрөг")}, ${hemisphere(chart.city.longitude, "зүүн уртраг", "баруун уртраг")}, цагийн бүс ${chart.city.timezone}. Байшингийн систем: ${HOUSE_SYSTEM_NAMES[chart.houseSystem]}.`);
  paragraphs.push(READING_COPY.disclaimer);
  return { id: "method", group: "method", title: "Тооцооны арга", paragraphs };
}

// ---------------------------------------------------------------- reading

export function buildNatalReading(chart: NatalChart): NatalReading {
  const notices = chart.notices.filter((notice) => notice.kind !== "placidus" && notice.kind !== "asc-sensitive").map((notice) => notice.text);
  const intro: ReadingSection = { id: "intro", group: "intro", title: "Таны тэнгэрийн зураг", paragraphs: [...READING_COPY.intro, ...notices] };
  const byGroup = (ids: PlanetId[], group: ReadingSection["group"]) => chart.planets.filter((planet) => ids.includes(planet.id as PlanetId)).map((planet) => planetSection(chart, planet, group));
  const generational = byGroup(GENERATIONAL as PlanetId[], "generational");
  generational.unshift({ id: "generational-intro", group: "generational", title: "Үеийн гарагуудыг хэрхэн унших вэ", paragraphs: [READING_COPY.generationalIntro] });
  const sections = [
    intro,
    ...overviewSections(chart),
    ...coreSections(chart),
    ...byGroup(["mercury", "venus", "mars"], "personal"),
    ...byGroup(SOCIAL as PlanetId[], "social"),
    ...generational,
    ...directionSections(chart),
    ...aspectSections(chart),
    ...houseSections(chart),
    ...synthesisSections(chart),
    methodSection(chart),
  ];
  return { ...chart, contentVersion: CONTENT_VERSION, sections };
}

export function createNatalReading(input: NatalInput): NatalReading {
  return buildNatalReading(calculateNatalChart(input));
}

/** Paragraph list for readings stored before v2 (single `body`). */
export function sectionParagraphs(section: { paragraphs?: string[]; body?: string }) {
  return section.paragraphs ?? (section.body ? section.body.split(/\n{2,}/) : []);
}

