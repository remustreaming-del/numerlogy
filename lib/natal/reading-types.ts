// Client-safe shapes of the paid reading (no interpretation text here).
import type { NatalChart } from "../astrology.ts";
import type { MongolYear } from "./mongol-year.ts";

export type ReadingGroup = "intro" | "overview" | "core" | "personal" | "social" | "generational" | "direction" | "aspects" | "houses" | "synthesis" | "mongolian" | "forecast" | "method";

export const READING_GROUPS: { id: ReadingGroup; title: string }[] = [
  { id: "intro", title: "Танилцуулга" },
  { id: "overview", title: "Зургийн ерөнхий хэв шинж" },
  { id: "core", title: "Гол гурвал: Нар, Сар, Мандах орд" },
  { id: "personal", title: "Хувийн гарагууд" },
  { id: "social", title: "Нийгмийн гарагууд" },
  { id: "generational", title: "Үеийн гарагууд" },
  { id: "direction", title: "Амьдралын чиглэл" },
  { id: "aspects", title: "Гол аспектууд" },
  { id: "houses", title: "Арван хоёр байшин" },
  { id: "synthesis", title: "Нэгтгэл" },
  { id: "mongolian", title: "Монгол зурхайн жил" },
  { id: "forecast", title: "Ойрын 12 сарын чиг хандлага" },
  { id: "method", title: "Тооцооны арга ба анхааруулга" },
];

export type ReadingSection = { id: string; group: ReadingGroup; title: string; meta?: string; paragraphs: string[] };
/** `mongolYear` and `forecastFrom` are absent in readings stored before v4. */
export type NatalReading = NatalChart & { preview?: boolean; contentVersion: string; sections: ReadingSection[]; mongolYear?: MongolYear; forecastFrom?: string };
