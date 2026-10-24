// DRAFT — owner proofread. Client-safe: labels and the short free texts shown before payment.
import type { Level, Metric } from "./synastry.ts";

export const METRIC_NAMES: Record<Metric, string> = {
  emotion: "Сэтгэлийн холбоо",
  attraction: "Татал ба хайр дурлал",
  communication: "Ойлголцол ба яриа",
  stability: "Тогтвортой байдал",
  values: "Үнэт зүйл ба зорилго",
  tension: "Зөрчлийн эрч",
  overall: "Нийт нийцэл",
};

export const METRIC_HINTS: Record<Metric, string> = {
  emotion: "бие биеийнхээ мэдрэмжийг ойлгох",
  attraction: "татал, романтик эрч",
  communication: "санаагаа ойлгуулах, сонсох",
  stability: "үнэнч байдал, урт хугацааны холбоо",
  values: "амьдралын чиглэл, үнэт зүйл",
  tension: "маргаан, хурцадмал байдлын хэмжээ",
  overall: "бүх үзүүлэлтийн жигнэсэн дүн",
};

export const LEVEL_LABELS: Record<Level, string> = { high: "Хүчтэй", mid: "Дунд", low: "Анхаарах" };
export const TENSION_LABELS: Record<Level, string> = { high: "Өндөр", mid: "Дунд", low: "Бага" };

/** One line about the two Sun signs, by sign distance (0 same … 6 opposite). */
export const FREE_SUN_LINK: readonly string[] = [
  "Нар нэг ордод: амьдралыг ижил хэмнэлээр хардаг, бие биедээ толь болдог хос.",
  "Нар хөрш ордуудад: ойрхон ч ялгаатай хандлагатай, бие биеэсээ суралцдаг хос.",
  "Нар бие биеэ дэмждэг махбодод: зорилго тань амархан нийцдэг.",
  "Нар квадратын байрлалд: хэмнэл тань зөрдөг ч бие биеэ хөгжүүлдэг.",
  "Нар нэг махбодод: үндсэн хандлага тань ижил, нэгнийхээ дэргэд амар.",
  "Нар квинконсын байрлалд: бие биеийнхээ хэлийг сурах хэрэгтэй хос.",
  "Нар эсрэг ордуудад: бие биеийнхээ дутууг нөхдөг, эсрэг туйлын татал.",
];

/** Table of contents of the paid reading, shown in the upsell card. */
export const PAID_CONTENTS: readonly string[] = [
  "Ерөнхий дүгнэлт ба таван хэмжээсийн тайлбар, юу нөлөөлснийг нь хамт",
  "Хоёр хүний хөрөг: хайрын хэл, маргаан дахь зан, сэтгэлийн хэрэгцээ, ярианы хэв маяг",
  "Хоёр зургийн хамгийн чухал 12 аспект, зөвлөмжийн хамт",
  "Нар, Сар, Сугар, Ангараг, Будын ордын уялдаа",
  "Байшингийн давхцал (house overlay) ба хамтын зураг (composite chart)",
  "Амьдралын замын тоо (life path) хосын хувьд",
  "Маргааныг шийдэх, гомдлоо эдгээх тусгай зөвлөмж",
  "PDF ба имэйл хувилбар",
];
