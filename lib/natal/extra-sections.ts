// Server-only: Mongolian year-animal and 12-month forecast sections of the paid reading.
// Geometry comes from forecast.ts / mongol-year.ts (client-safe); every text comes from the content modules.
import { DateTime } from "luxon";
import type { NatalChart } from "../astrology.ts";
import { ECLIPSE_TEXT, FORECAST_COPY, HOUSE_TRANSIT, RETROGRADE_PASSES, TARGET_ADVICE, TARGET_FOCUS, TRANSIT_MODE, type TransitFamily } from "./content/forecast.ts";
import { ANIMAL_KEYWORD, ANIMAL_TEXT, MONGOL_YEAR_COPY, RELATION_TEXT, YEAR_ELEMENT_TEXT } from "./content/mongol-year.ts";
import { HOUSE_THEME, SIGN_KEYWORDS } from "./content/overview.ts";
import { calculateForecast, isSoft, selectTransits, type EclipseEvent, type Forecast, type TransitEvent, type TransitTarget } from "./forecast.ts";
import { animalRelation, garamAges, mongolYearFor, mongolYearOf, nearYearBoundary, type MongolYear } from "./mongol-year.ts";
import type { ReadingSection } from "./reading-types.ts";
import { ANGLE_FORMS, ASPECT_NAMES, POINT_FORMS, house, inSign, signPhrase } from "./terms.ts";

const fmt = (iso: string) => iso.replace(/-/g, ".");
const range = (from: string, to: string) => `${fmt(from)} – ${fmt(to)}`;
const targetForms = (target: TransitTarget) => target === "ascendant" || target === "midheaven" ? ANGLE_FORMS[target] : POINT_FORMS[target];
/** Words, not glyphs: the PDF font has no aspect symbols. */
const eventLabel = (event: TransitEvent) => `${POINT_FORMS[event.transit].nom} ба таны ${targetForms(event.target).gen} ${ASPECT_NAMES[event.aspect].nom.toLowerCase()}`;
const familyOf = (event: TransitEvent): TransitFamily => event.aspect === "conjunction" ? "conjunction" : isSoft(event.aspect) ? "soft" : "hard";

// ---------------------------------------------------------------- Mongolian year

export function mongolYearOfReading(chart: NatalChart): MongolYear {
  return mongolYearOf(chart.input.birthDate);
}

export function mongolYearSections(chart: NatalChart, from: Date): ReadingSection[] {
  const mine = mongolYearOfReading(chart), birth = chart.input.birthDate;
  const today = DateTime.fromJSDate(from, { zone: chart.city.timezone }).toISODate()!;
  const next = mongolYearFor(mongolYearOf(today).year + 1);
  const sun = chart.planets[0];
  const introParagraphs = [
    MONGOL_YEAR_COPY.intro,
    `Таны төрсөн ${fmt(birth)} Монгол зурхайн «${mine.title}» жилд хамаарна. Энэ жил ${fmt(mine.begins)} орчим Цагаан сараар эхэлсэн.`,
  ];
  if (nearYearBoundary(birth)) introParagraphs.push(MONGOL_YEAR_COPY.boundary);

  const age = next.year - mine.year + 1;
  const relation = animalRelation(mine.animalIndex, next.animalIndex);
  const nextGaram = garamAges().find((value) => value > age) ?? null;
  const nextParagraphs = [
    `Ирэх жил буюу ${fmt(next.begins)} орчим Цагаан сараар «${next.titleGen}» жил эхэлнэ. Тэр жил таны нас ${age} болно.`,
    RELATION_TEXT[relation],
  ];
  if (relation !== "same" && nextGaram) nextParagraphs.push(`Таны дараагийн гарам нас ${nextGaram} буюу ${mine.year + nextGaram - 1} он.`);
  nextParagraphs.push(MONGOL_YEAR_COPY.draft);

  return [
    { id: "my-year", group: "mongolian", title: "Таны Монгол зурхайн жил", meta: `${mine.title} · ${mine.year} он`, paragraphs: introParagraphs },
    { id: "my-animal", group: "mongolian", title: `Жилийн амьтан: ${mine.animal}`, meta: `${mine.color} (${mine.elementName}) ${mine.animal.toLowerCase()}`, paragraphs: [ANIMAL_TEXT[mine.animalIndex], YEAR_ELEMENT_TEXT[mine.element]] },
    { id: "my-combined", group: "mongolian", title: "Монгол жил ба барууны зурхай", paragraphs: [`Таны Нар ${inSign(sun.signIndex)} байгаа тул «${SIGN_KEYWORDS[sun.signIndex]}» гэсэн чанар тод байна. Монгол зурхайн ${mine.titleGen} жил харин «${ANIMAL_KEYWORD[mine.animalIndex]}» гэсэн хэв маягаар үүнийг баяжуулна. Хоёр хуанлийг хамт харахад таны мөн чанар нэг талдаа бус, хоёр өнцгөөс бүрэн харагдана.`] },
    { id: "next-year", group: "mongolian", title: "Ирэх Монгол жил", meta: `${next.title} · ${fmt(next.begins)}`, paragraphs: nextParagraphs },
  ];
}

// ---------------------------------------------------------------- forecast

function transitSection(event: TransitEvent, index: number, retrogradeUsed: { count: number }): ReadingSection {
  const family = familyOf(event);
  const demanding = event.aspect === "conjunction" ? event.transit !== "jupiter" : !isSoft(event.aspect);
  const paragraphs = [
    TRANSIT_MODE[event.transit][family],
    `Энэ нөлөө «${TARGET_FOCUS[event.target]}» гэсэн сэдвээр хамгийн тод мэдрэгдэнэ. ${TARGET_ADVICE[event.target][demanding ? 0 : 1]}`,
  ];
  if (event.exact.length > 1 && retrogradeUsed.count++ < 2) paragraphs.push(RETROGRADE_PASSES[Math.min(event.exact.length, 3) - 1]);
  return {
    id: `forecast-${index + 1}`, group: "forecast",
    title: eventLabel(event),
    meta: `${range(event.start, event.end)} · яг нарийн: ${event.exact.map(fmt).join(", ")}`,
    paragraphs,
  };
}

function eclipseSection(forecast: Forecast, hasHouses: boolean): ReadingSection {
  const paragraphs: string[] = [];
  if (!forecast.eclipses.length) paragraphs.push(ECLIPSE_TEXT.none);
  else {
    paragraphs.push(ECLIPSE_TEXT.intro);
    for (const eclipse of forecast.eclipses) paragraphs.push(eclipseParagraph(eclipse, hasHouses));
  }
  return { id: "forecast-eclipses", group: "forecast", title: "Хиртэлтүүд", paragraphs };
}

function eclipseParagraph(eclipse: EclipseEvent, hasHouses: boolean) {
  const label = eclipse.kind === "solar" ? "Нарны хиртэлт" : "Сарны хиртэлт";
  const parts = [`${fmt(eclipse.date)} · ${label} · ${signPhrase(eclipse.signIndex)} ${eclipse.degree}°.`, ECLIPSE_TEXT[eclipse.kind]];
  if (hasHouses && eclipse.house) parts.push(`Хиртэлт таны ${house(eclipse.house).gen} «${HOUSE_THEME[eclipse.house - 1]}» сэдвийг идэвхжүүлнэ.`);
  if (eclipse.hit) parts.push(`Хиртэлтийн цэг таны ${targetForms(eclipse.hit.target).com} ${eclipse.hit.orb.toFixed(1)}° зайтай тул «${TARGET_FOCUS[eclipse.hit.target]}» сэдэв жилийн турш онцгой тод болно.`);
  return parts.join(" ");
}

function houseSection(forecast: Forecast): ReadingSection | null {
  if (!forecast.houses.length) return null;
  const paragraphs: string[] = [];
  for (const { planet, spans } of forecast.houses) spans.forEach((span, index) => {
    const text = HOUSE_TRANSIT[planet];
    paragraphs.push(`${range(span.from, span.to)} · ${text.lead} ${house(span.house).dat} байна. «${HOUSE_THEME[span.house - 1]}» ${text.tail}${index === 0 ? ` ${text.extra}` : ""}`);
  });
  return { id: "forecast-houses", group: "forecast", title: "Бархасбадь ба Санчир таны байшингуудаар", paragraphs };
}

export function forecastSections(chart: NatalChart, from: Date): ReadingSection[] {
  const forecast = calculateForecast(chart, from);
  const events = selectTransits(forecast);
  const sections: ReadingSection[] = [{
    id: "forecast-intro", group: "forecast", title: "Ойрын 12 сарын тойм", meta: range(forecast.start, forecast.end),
    paragraphs: [...FORECAST_COPY.intro, FORECAST_COPY.method, ...(forecast.limited ? [FORECAST_COPY.limited] : [])],
  }];
  if (events.length) {
    sections.push({
      id: "forecast-timeline", group: "forecast", title: "Жилийн цаглабар",
      paragraphs: [FORECAST_COPY.timelineIntro, ...events.map((event) => `${fmt(event.exact[0])} · ${eventLabel(event)} — «${TARGET_FOCUS[event.target]}»`)],
    });
    const retrogradeUsed = { count: 0 };
    sections.push(...events.map((event, index) => transitSection(event, index, retrogradeUsed)));
  }
  const houses = houseSection(forecast);
  if (houses) sections.push(houses);
  sections.push(eclipseSection(forecast, !!chart.houses));
  sections.push({ id: "forecast-closing", group: "forecast", title: "Жилийн зөвлөмж", paragraphs: FORECAST_COPY.closing });
  return sections;
}
