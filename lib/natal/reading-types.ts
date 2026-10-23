// Client-safe shapes of the paid reading (no interpretation text here).
import type { NatalChart } from "../astrology.ts";

export type ReadingGroup = "intro" | "overview" | "core" | "personal" | "social" | "generational" | "direction" | "aspects" | "houses" | "synthesis" | "method";

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
  { id: "method", title: "Тооцооны арга ба анхааруулга" },
];

export type ReadingSection = { id: string; group: ReadingGroup; title: string; meta?: string; paragraphs: string[] };
export type NatalReading = NatalChart & { preview?: boolean; contentVersion: string; sections: ReadingSection[] };
