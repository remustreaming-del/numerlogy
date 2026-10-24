// Client-safe shapes of the paid couple reading (no interpretation text here).
import type { CoupleChart } from "./synastry.ts";

export type CoupleGroup = "intro" | "overview" | "people" | "signs" | "aspects" | "overlays" | "composite" | "numerology" | "guidance" | "method";

export const COUPLE_GROUPS: { id: CoupleGroup; title: string }[] = [
  { id: "intro", title: "Танилцуулга" },
  { id: "overview", title: "Ерөнхий дүгнэлт" },
  { id: "people", title: "Хоёр хүний хөрөг" },
  { id: "signs", title: "Ордын уялдаа" },
  { id: "aspects", title: "Хоёр зургийн гол аспектууд" },
  { id: "overlays", title: "Байшингийн давхцал" },
  { id: "composite", title: "Хамтын зураг" },
  { id: "numerology", title: "Амьдралын замын тоо" },
  { id: "guidance", title: "Зөвлөмж" },
  { id: "method", title: "Тооцооны арга ба анхааруулга" },
];

export type CoupleSection = { id: string; group: CoupleGroup; title: string; meta?: string; paragraphs: string[] };
export type CoupleReading = CoupleChart & { preview?: boolean; contentVersion: string; sections: CoupleSection[] };
