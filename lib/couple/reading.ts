// Server-only: assembles the paid couple reading from verified chart data and the
// Mongolian content library in ./content. Never import from client code.
//
// Names are only ever shown in the nominative (titles and meta lines such as «Болд: Нар …»);
// the texts themselves speak of «та хоёр», «нэгнийх нь … нөгөөгийнх нь» or «Нарны тал».
import { calculateNatalChart, isMongolianZone, type NatalChart, type PlanetPosition } from "../astrology.ts";
import { numberTitles } from "../codes.ts";
import { ANGLE_FORMS, ASPECT_NAMES, ELEMENT_NAMES, HOUSE_SYSTEM_NAMES, POINT_FORMS, SIGN_ELEMENT, house, inSign, signPhrase } from "../natal/terms.ts";
import { COMPOSITE_MOON, COMPOSITE_SUN, COMPOSITE_VENUS } from "./content/composite.ts";
import { CROSS_ASPECTS } from "./content/cross-aspects.ts";
import { COUPLE_COPY, CONFLICT_BY_MARS, DIMENSION_ADVICE, DIMENSION_LEVEL, OVERALL_BAND, REPAIR_BY_MOON, TENSION_LEVEL, elementPairKey } from "./content/guidance.ts";
import { LIFE_PATH_LOVE, LIFE_PATH_PAIRS } from "./content/life-path.ts";
import { OVERLAY_TEXT } from "./content/overlays.ts";
import { MARS_CONFLICT, MERCURY_TALK, MOON_NEEDS, VENUS_LOVE } from "./content/profiles.ts";
import { DISTANCE_NAMES, SIGN_RELATIONS } from "./content/sign-relations.ts";
import { LEVEL_LABELS, METRIC_NAMES, TENSION_LABELS } from "./free.ts";
import { COUPLE_GROUPS, type CoupleReading, type CoupleSection } from "./reading-types.ts";
import { selectCrossAspects } from "./select.ts";
import { DIMENSIONS, aspectEffect, buildCoupleChart, dimensionContribution, isVolatile, pairWeights, validateCoupleInput, type CoupleChart, type CrossAspect, type CrossPoint, type Dimension, type Person, type SignLink } from "./synastry.ts";

export const COUPLE_CONTENT_VERSION = "2026-10-25.v1";
export { COUPLE_GROUPS, type CoupleReading, type CoupleSection };

const pad = (value: number) => String(value).padStart(2, "0");
const degrees = (position: Pick<PlanetPosition, "degree" | "minute">) => `${position.degree}°${pad(position.minute)}′`;
const placement = (position: Pick<PlanetPosition, "signIndex" | "degree" | "minute">) => `${signPhrase(position.signIndex)} ${degrees(position)}`;
const forms = (id: CrossPoint) => id === "ascendant" ? ANGLE_FORMS.ascendant : POINT_FORMS[id];
const chartOf = (couple: CoupleChart, person: Person) => person === "a" ? couple.a : couple.b;
const nameOf = (couple: CoupleChart, person: Person) => chartOf(couple, person).input.name;
const planet = (chart: NatalChart, id: CrossPoint) => (id === "ascendant" ? chart.ascendant : chart.planets.find((item) => item.id === id))!;
const moonUncertain = (chart: NatalChart) => !!chart.moonRange && chart.moonRange.start !== chart.moonRange.end;
const aspectLabel = (aspect: CrossAspect) => `${forms(aspect.a).nom} ${ASPECT_NAMES[aspect.type].glyph} ${forms(aspect.b).nom}`;
const isHarmony = (aspect: CrossAspect) => aspect.family === "harmonious" || (aspect.family === "conjunction" && !isVolatile(aspect));
/** Hands out the variants of a repeated note in turn, so one reading never repeats the same sentence. */
const rotation = (list: readonly string[]) => { let use = 0; return () => list[use++ % list.length]; };
type Notes = { uncertain: () => string };

// ---------------------------------------------------------------- intro and overview

function introSections(couple: CoupleChart): CoupleSection[] {
  const paragraphs: string[] = [...COUPLE_COPY.intro];
  if (couple.a.input.unknownTime || couple.b.input.unknownTime) paragraphs.push(COUPLE_COPY.unknownTime);
  for (const person of ["a", "b"] as Person[]) {
    for (const notice of chartOf(couple, person).notices.filter((item) => item.kind !== "placidus" && item.kind !== "unknown-time" && item.kind !== "asc-sensitive")) paragraphs.push(`${nameOf(couple, person)}: ${notice.text}`);
  }
  return [{ id: "intro", group: "intro", title: "Хосын зурхай гэж юу вэ", meta: `${nameOf(couple, "a")} ба ${nameOf(couple, "b")}`, paragraphs }];
}

const band = (score: number) => score >= 80 ? 4 : score >= 60 ? 3 : score >= 40 ? 2 : score >= 20 ? 1 : 0;

/**
 * The aspects behind a dimension's score: supporting contacts ranked by what they add to the raw score,
 * and the tense contacts that touch the same dimension.
 */
function evidence(couple: CoupleChart, dimension: Dimension) {
  const touching = couple.aspects.filter((aspect) => CROSS_ASPECTS[aspect.key] && pairWeights(aspect.key)[dimension]);
  const support = touching.filter(isHarmony)
    .map((aspect) => ({ aspect, value: dimensionContribution(aspect, dimension) }))
    .filter((item) => item.value > 0.15)
    .sort((x, y) => y.value - x.value).slice(0, 3).map((item) => item.aspect);
  const tense = touching.filter((aspect) => !isHarmony(aspect))
    .map((aspect) => ({ aspect, value: aspectEffect(aspect).tension * (pairWeights(aspect.key)[dimension] ?? 0) }))
    .filter((item) => item.value > 0.15)
    .sort((x, y) => y.value - x.value).slice(0, 2).map((item) => item.aspect);
  return { support, tense };
}

function overviewSections(couple: CoupleChart): CoupleSection[] {
  const { scores } = couple;
  const ranked = [...DIMENSIONS].sort((x, y) => scores[y].score - scores[x].score);
  const verdict: CoupleSection = {
    id: "verdict", group: "overview", title: "Та хоёр хэр нийцдэг вэ",
    meta: `${METRIC_NAMES.overall} ${scores.overall.score}/100 · ${METRIC_NAMES.tension} ${scores.tension.score}/100 (${TENSION_LABELS[scores.tension.level].toLowerCase()})`,
    paragraphs: [
      OVERALL_BAND[band(scores.overall.score)],
      TENSION_LEVEL[scores.tension.level],
      `Хамгийн өндөр үзүүлэлт тань — ${METRIC_NAMES[ranked[0]].toLowerCase()} (${scores[ranked[0]].score}/100), хамгийн их анхаарал шаардах нь — ${METRIC_NAMES[ranked[ranked.length - 1]].toLowerCase()} (${scores[ranked[ranked.length - 1]].score}/100).`,
      COUPLE_COPY.scores,
    ],
  };
  const dimensions = DIMENSIONS.map((dimension): CoupleSection => {
    const score = scores[dimension], { support, tense } = evidence(couple, dimension);
    const list = (items: CrossAspect[]) => items.map((aspect) => `${aspectLabel(aspect)} («${CROSS_ASPECTS[aspect.key].theme}»)`).join(", ");
    const paragraphs = [DIMENSION_LEVEL[dimension][score.level]];
    if (support.length) paragraphs.push(`Энэ үзүүлэлтийг хамгийн их дэмжсэн холбоо: ${list(support)}.`);
    if (tense.length) paragraphs.push(`Энэ талбарт хурцадмал байдал үүсгэдэг холбоо: ${list(tense)}.`);
    if (!support.length && !tense.length) paragraphs.push(COUPLE_COPY.noEvidence);
    return { id: `dimension-${dimension}`, group: "overview", title: METRIC_NAMES[dimension], meta: `${score.score}/100 · ${LEVEL_LABELS[score.level]}`, paragraphs };
  });
  return [verdict, ...dimensions];
}

// ---------------------------------------------------------------- people

function peopleSections(couple: CoupleChart): CoupleSection[] {
  const sections: CoupleSection[] = [];
  for (const person of ["a", "b"] as Person[]) {
    const chart = chartOf(couple, person), name = nameOf(couple, person);
    const venus = planet(chart, "venus"), mars = planet(chart, "mars"), moon = planet(chart, "moon"), mercury = planet(chart, "mercury");
    const moonParagraphs = [MOON_NEEDS[moon.signIndex]];
    if (moonUncertain(chart)) {
      const other = chart.moonRange!.start === moon.signIndex ? chart.moonRange!.end : chart.moonRange!.start;
      moonParagraphs.push(`Төрсөн цаг тодорхойгүй тул Сар ${inSign(other)} байсан байх магадлал ч бий.`);
    }
    sections.push(
      { id: `${person}-venus`, group: "people", title: `${name}: хайраа илэрхийлэх нь`, meta: `Сугар · ${placement(venus)}`, paragraphs: [VENUS_LOVE[venus.signIndex]] },
      { id: `${person}-mars`, group: "people", title: `${name}: маргаан ба уур`, meta: `Ангараг · ${placement(mars)}`, paragraphs: [MARS_CONFLICT[mars.signIndex]] },
      { id: `${person}-moon`, group: "people", title: `${name}: сэтгэлийн хэрэгцээ`, meta: `Сар · ${placement(moon)}`, paragraphs: moonParagraphs },
      { id: `${person}-mercury`, group: "people", title: `${name}: ярих, сонсох хэв маяг`, meta: `Буд · ${placement(mercury)}`, paragraphs: [MERCURY_TALK[mercury.signIndex]] },
    );
  }
  return sections;
}

// ---------------------------------------------------------------- signs

const LINK_TITLES: Record<SignLink["kind"], string> = {
  "sun-sun": "Нар ба Нар: амьдралын чиглэл",
  "moon-moon": "Сар ба Сар: сэтгэлийн хэмнэл",
  "sun-moon": "Нар ба Сар: хүсэл ба мэдрэмж",
  "venus-mars": "Сугар ба Ангараг: татал",
  "mercury-mercury": "Буд ба Буд: яриа",
};
const LINK_POINTS: Record<SignLink["kind"], [CrossPoint, CrossPoint]> = {
  "sun-sun": ["sun", "sun"], "moon-moon": ["moon", "moon"], "sun-moon": ["sun", "moon"], "venus-mars": ["venus", "mars"], "mercury-mercury": ["mercury", "mercury"],
};

function signSections(couple: CoupleChart, notes: Notes): CoupleSection[] {
  const sections: CoupleSection[] = [{ id: "signs-intro", group: "signs", title: "Ордын уялдааг хэрхэн унших вэ", paragraphs: [COUPLE_COPY.signsIntro] }];
  const kinds = [...new Set(couple.links.map((link) => link.kind))];
  for (const kind of kinds) {
    const links = couple.links.filter((link) => link.kind === kind);
    const [first, second] = LINK_POINTS[kind];
    const describe = (link: SignLink) => {
      const other: Person = link.from === "a" ? "b" : "a";
      return first === second
        ? `${nameOf(couple, "a")}: ${signPhrase(link.first)} · ${nameOf(couple, "b")}: ${signPhrase(link.second)}`
        : `${forms(first).nom}: ${nameOf(couple, link.from)}, ${signPhrase(link.first)} · ${forms(second).nom}: ${nameOf(couple, other)}, ${signPhrase(link.second)}`;
    };
    const elements = (link: SignLink) => `${ELEMENT_NAMES[SIGN_ELEMENT[link.first]].nom} ба ${ELEMENT_NAMES[SIGN_ELEMENT[link.second]].nom}`;
    const groups = links.length === 2 && links[0].distance === links[1].distance ? [links] : links.map((link) => [link]);
    groups.forEach((group, index) => {
      const paragraphs = [SIGN_RELATIONS[kind][group[0].distance]];
      if (group.length === 2) paragraphs.push(COUPLE_COPY.linkDoubled);
      if (group.some((link) => link.uncertain)) paragraphs.push(notes.uncertain());
      sections.push({
        id: `link-${kind}-${index + 1}`, group: "signs", title: LINK_TITLES[kind],
        meta: `${group.map(describe).join(" | ")} · ${DISTANCE_NAMES[group[0].distance]} · ${group.map(elements).join(", ")}`,
        paragraphs,
      });
    });
  }
  return sections;
}

// ---------------------------------------------------------------- aspects

function aspectSections(couple: CoupleChart): CoupleSection[] {
  const selected = selectCrossAspects(couple);
  const sections: CoupleSection[] = [{
    id: "aspects-intro", group: "aspects", title: "Хоёр зургийн аспект гэж юу вэ",
    paragraphs: [COUPLE_COPY.aspectsIntro, COUPLE_COPY.roles, selected.length
      ? `Хоёр зургийн хооронд нийт ${couple.aspects.length} аспект олдов. Тэдгээрээс хамгийн нягт, хамгийн хувийн шинжтэй ${selected.length} аспектыг ач холбогдлоор нь эрэмбэлэн доор тайлбарлав.`
      : "Хоёр зургийн хооронд хувийн гарагуудын нягт аспект олдсонгүй. Ийм тохиолдолд харилцааг голчлон ордын уялдаа, хамтын зураг тодорхойлно."],
  }];
  let doubledUse = 0, approximateUse = 0;
  selected.forEach(({ aspect, doubled }, index) => {
    const text = CROSS_ASPECTS[aspect.key];
    const a = planet(couple.a, aspect.a), b = planet(couple.b, aspect.b);
    const paragraphs = [text[aspect.family]];
    if (doubled) paragraphs.push(COUPLE_COPY.doubled[doubledUse++ % COUPLE_COPY.doubled.length]);
    if (aspect.approximate) paragraphs.push(COUPLE_COPY.moonApprox[approximateUse++ % COUPLE_COPY.moonApprox.length]);
    sections.push({
      id: `cross-${index + 1}`, group: "aspects", title: aspectLabel(aspect),
      meta: `${nameOf(couple, "a")}: ${forms(aspect.a).nom}, ${placement(a)} · ${nameOf(couple, "b")}: ${forms(aspect.b).nom}, ${placement(b)} · ${ASPECT_NAMES[aspect.type].nom} · орб ${aspect.orb.toFixed(1)}°`,
      paragraphs,
    });
  });
  return sections;
}

// ---------------------------------------------------------------- overlays, composite, numerology

function overlaySections(couple: CoupleChart): CoupleSection[] {
  if (!couple.overlays.length) return [];
  const sections: CoupleSection[] = [{ id: "overlays-intro", group: "overlays", title: "Байшингийн давхцал гэж юу вэ", paragraphs: [COUPLE_COPY.overlaysIntro] }];
  for (const overlay of couple.overlays) {
    const other: Person = overlay.owner === "a" ? "b" : "a";
    const paragraphs = [OVERLAY_TEXT[overlay.planet][overlay.house - 1]];
    if (overlay.approximate) paragraphs.push(COUPLE_COPY.overlayApprox);
    sections.push({
      id: `overlay-${overlay.owner}-${overlay.planet}`, group: "overlays", title: `${POINT_FORMS[overlay.planet].nom} → ${house(overlay.house).short}`,
      meta: `${POINT_FORMS[overlay.planet].gen} тал — ${nameOf(couple, overlay.owner)} · Байшингийн тал — ${nameOf(couple, other)}`,
      paragraphs,
    });
  }
  return sections;
}

function compositeSections(couple: CoupleChart, notes: Notes): CoupleSection[] {
  const point = (id: "sun" | "moon" | "venus") => couple.composite.find((item) => item.id === id)!;
  const sun = point("sun"), moon = point("moon"), venus = point("venus");
  const moonParagraphs = [COMPOSITE_MOON[moon.signIndex]];
  if (moonUncertain(couple.a) || moonUncertain(couple.b)) moonParagraphs.push(notes.uncertain());
  return [
    { id: "composite-intro", group: "composite", title: "Хамтын зураг гэж юу вэ", paragraphs: [COUPLE_COPY.compositeIntro] },
    { id: "composite-sun", group: "composite", title: "Хамтын Нар: харилцааны зорилго", meta: placement(sun), paragraphs: [COMPOSITE_SUN[sun.signIndex]] },
    { id: "composite-moon", group: "composite", title: "Хамтын Сар: сэтгэлийн уур амьсгал", meta: placement(moon), paragraphs: moonParagraphs },
    { id: "composite-venus", group: "composite", title: "Хамтын Сугар: хамтдаа хайрлах нь", meta: placement(venus), paragraphs: [COMPOSITE_VENUS[venus.signIndex]] },
  ];
}

function numerologySections(couple: CoupleChart): CoupleSection[] {
  const { a, b } = couple.lifePath;
  const key = a <= b ? `${a}-${b}` : `${b}-${a}`;
  const paragraphs = [COUPLE_COPY.numerologyIntro, LIFE_PATH_LOVE[a - 1]];
  if (b !== a) paragraphs.push(LIFE_PATH_LOVE[b - 1]);
  paragraphs.push(LIFE_PATH_PAIRS[key]);
  return [{
    id: "life-path", group: "numerology", title: `Амьдралын замын тоо: ${a} ба ${b}`,
    meta: `${nameOf(couple, "a")} — ${a} · ${numberTitles[a]} | ${nameOf(couple, "b")} — ${b} · ${numberTitles[b]}`,
    paragraphs,
  }];
}

// ---------------------------------------------------------------- guidance

function guidanceSections(couple: CoupleChart, notes: Notes): CoupleSection[] {
  const marsA = planet(couple.a, "mars"), marsB = planet(couple.b, "mars"), moonA = planet(couple.a, "moon"), moonB = planet(couple.b, "moon");
  const element = (position: PlanetPosition) => SIGN_ELEMENT[position.signIndex];
  const elementMeta = (label: string, x: PlanetPosition, y: PlanetPosition) => `${label}: ${nameOf(couple, "a")} — ${ELEMENT_NAMES[element(x)].nom}, ${nameOf(couple, "b")} — ${ELEMENT_NAMES[element(y)].nom}`;
  const repair = [REPAIR_BY_MOON[elementPairKey(element(moonA), element(moonB))]];
  if (moonUncertain(couple.a) || moonUncertain(couple.b)) repair.push(notes.uncertain());

  const line = (aspect: CrossAspect) => `${aspectLabel(aspect)}: «${CROSS_ASPECTS[aspect.key].theme}».`;
  const selected = selectCrossAspects(couple).map((item) => item.aspect);
  const strengths = selected.filter(isHarmony).slice(0, 3).map(line);
  const watch = selected.filter((aspect) => aspect.family === "challenging" || !isHarmony(aspect)).slice(0, 3).map(line);
  const ranked = [...DIMENSIONS].sort((x, y) => couple.scores[y].score - couple.scores[x].score);
  const best = ranked[0], weakest = ranked[ranked.length - 1];
  strengths.push(`Хамгийн өндөр үзүүлэлт: ${METRIC_NAMES[best].toLowerCase()} (${couple.scores[best].score}/100). Энэ нөөцөө хэцүү үед түшиг болгоорой.`);
  watch.push(`Хамгийн их анхаарал шаардах үзүүлэлт: ${METRIC_NAMES[weakest].toLowerCase()} (${couple.scores[weakest].score}/100).`, DIMENSION_ADVICE[weakest]);

  return [
    { id: "conflict", group: "guidance", title: "Маргааныг хэрхэн шийдэх вэ", meta: elementMeta("Ангараг", marsA, marsB), paragraphs: [CONFLICT_BY_MARS[elementPairKey(element(marsA), element(marsB))], "Тус бүрийн маргаан дахь хэв маягийг «Хоёр хүний хөрөг» хэсгээс дэлгэрэнгүй уншаарай."] },
    { id: "repair", group: "guidance", title: "Гомдлоо хэрхэн эдгээх вэ", meta: elementMeta("Сар", moonA, moonB), paragraphs: repair },
    { id: "strengths", group: "guidance", title: "Хамгийн хүчтэй холбоонууд", paragraphs: strengths },
    { id: "watch", group: "guidance", title: "Анхаарах сэдвүүд", paragraphs: watch },
    { id: "practices", group: "guidance", title: "Өдөр тутмын зөвлөмж", paragraphs: [...COUPLE_COPY.practices] },
    { id: "closing", group: "guidance", title: "Эцсийн үг", paragraphs: [...COUPLE_COPY.closing] },
  ];
}

// ---------------------------------------------------------------- method

function methodSection(couple: CoupleChart): CoupleSection {
  const [general, orbs, scoring] = COUPLE_COPY.method;
  const paragraphs: string[] = [general, orbs, scoring];
  for (const person of ["a", "b"] as Person[]) {
    const chart = chartOf(couple, person);
    const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2})?([+-]\d{2}:\d{2}|Z)$/.exec(chart.local);
    const local = match ? `${match[1]} ${match[2]} (UTC${match[3] === "Z" ? "+00:00" : match[3]})` : chart.local;
    const time = chart.input.unknownTime ? `${chart.input.birthDate}, төрсөн цаг тодорхойгүй (12:00 цагаар тооцов)` : local;
    paragraphs.push(`${nameOf(couple, person)}: ${time} · ${chart.city.name}, цагийн бүс ${chart.city.timezone}${isMongolianZone(chart.city.timezone) ? " (Монголын зуны цагийн түүхийг тооцсон)" : ""} · байшингийн систем: ${HOUSE_SYSTEM_NAMES[chart.houseSystem]}.`);
  }
  paragraphs.push(COUPLE_COPY.disclaimer);
  return { id: "method", group: "method", title: "Тооцооны арга", paragraphs };
}

// ---------------------------------------------------------------- reading

export function buildCoupleReading(couple: CoupleChart): CoupleReading {
  const notes: Notes = { uncertain: rotation(COUPLE_COPY.linkUncertain) };
  const sections = [
    ...introSections(couple),
    ...overviewSections(couple),
    ...peopleSections(couple),
    ...signSections(couple, notes),
    ...aspectSections(couple),
    ...overlaySections(couple),
    ...compositeSections(couple, notes),
    ...numerologySections(couple),
    ...guidanceSections(couple, notes),
    methodSection(couple),
  ];
  return { ...couple, contentVersion: COUPLE_CONTENT_VERSION, sections };
}

export function createCoupleReading(raw: unknown): CoupleReading {
  const input = validateCoupleInput(raw);
  return buildCoupleReading(buildCoupleChart(calculateNatalChart(input.a), calculateNatalChart(input.b)));
}
