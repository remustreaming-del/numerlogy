// Reproducible, synthetic proofreading pack. Does not send data or contact an editor.
import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createNatalReading, CONTENT_VERSION } from "../lib/natal/reading.ts";
import { READING_GROUPS } from "../lib/natal/reading-types.ts";
import { glossary, spellingExceptions, terminologyIssues, mixedScriptWords } from "./mongolian-quality.mjs";

const root = new URL("../", import.meta.url);
const folder = new URL("outputs/mongolian-review/", root);
await mkdir(folder, { recursive: true });
const pad = (n) => String(n).padStart(2, "0");
const inputs = Array.from({ length: 12 }, (_, i) => ({ birthDate: `1990-${pad(i + 1)}-15`, birthTime: `${pad(i * 2)}:30`, cityId: "ulaanbaatar" }));
inputs.push(
  { birthDate: "1990-07-01", birthTime: "12:00", cityId: "ulaanbaatar", unknownTime: true },
  { birthDate: "2000-02-29", birthTime: "12:00", cityId: "hovd", unknownTime: true },
  { birthDate: "1985-06-21", birthTime: "08:30", cityId: "hovd" },
  { birthDate: "2005-09-22", birthTime: "23:50", cityId: "choibalsan" },
  { birthDate: "2015-07-01", birthTime: "00:15", cityId: "ulaanbaatar" },
  { birthDate: "1960-12-22", birthTime: "18:45", cityId: "erdenet" },
  { birthDate: "1995-03-21", birthTime: "06:00", cityId: "custom", place: { label: "Өндөр өргөргийн жишээ", latitude: 70, longitude: 25, timezone: "Europe/Oslo" } },
  { birthDate: "2001-11-01", birthTime: "10:20", cityId: "custom", place: { label: "Өмнөд хагасын жишээ", latitude: -33.87, longitude: 151.21, timezone: "Australia/Sydney" } },
);

const index = [
  "# Монгол хэлний редакторт өгөх тайлалууд",
  "",
  `Агуулгын хувилбар: ${CONTENT_VERSION}. Нийт 20 зохиомол жишээ. Бодит хэрэглэгчийн мэдээлэл ороогүй.`,
  "",
  "Төлөв: редакторын хяналт хүлээж байна. Автомат шалгалт нь монгол найруулгыг баталгаажуулахгүй.",
  "",
  "| Тайлал | Огноо, цаг | Газар | Нарны орд | Мандах орд |",
  "|---|---|---|---|---|",
];
const manifest = [];
for (const [i, input] of inputs.entries()) {
  const id = pad(i + 1);
  const reading = createNatalReading({ unknownTime: false, ...input, name: "Хяналтын жишээ" });
  const lines = [`# ${reading.input.name} ${id}`, "", `${reading.local} · ${reading.city.name}`, "", `Агуулгын хувилбар: ${CONTENT_VERSION}`, ""];
  for (const group of READING_GROUPS) {
    const sections = reading.sections.filter((section) => section.group === group.id);
    if (!sections.length) continue;
    lines.push(`## ${group.title}`, "");
    for (const section of sections) lines.push(`### ${section.title} (${section.id})`, "", section.meta ?? "", "", ...section.paragraphs.flatMap((text) => [text, ""]));
  }
  const text = lines.join("\n");
  if (terminologyIssues(text).length || mixedScriptWords(text).length) throw new Error(`Language check failed: ${id}`);
  await writeFile(new URL(`report-${id}.md`, folder), text, "utf8");
  index.push(`| [${id}](report-${id}.md) | ${input.birthDate} ${input.unknownTime ? "цаг тодорхойгүй" : input.birthTime} | ${reading.city.name} | ${reading.planets[0].sign} | ${reading.ascendant?.sign ?? "—"} |`);
  manifest.push({ id, input, contentVersion: CONTENT_VERSION, sections: reading.sections.length, houseSystem: reading.houseSystem });
}
index.push("", "## Хянах зүйлс", "",
  "Өгүүлбэрийг чангаар уншихад байгалийн сонсогдож байна уу? Тийн ялгал, үгийн сонголт, нэр томьёо тогтвортой юу? Давтагдсан санаа, хэт ерөнхий магтаал, үгчилсэн орчуулгын шинж байна уу?",
  "", "Тайлал бүрийн хэл зүй, найруулга, нэр томьёо, утгын уялдааг тус бүр 1–5 оноогоор үнэлнэ үү. 1 = их засвар хэрэгтэй, 5 = шууд нийтэлж болно.",
  "", "Засвар бүрийг тайлалын дугаар, хэсгийн код, эх өгүүлбэр, санал болгосон өгүүлбэр, шалтгаан гэсэн дарааллаар тэмдэглэнэ үү. Тооцооны өгөгдлийг өөрчлөхгүй.",
  "", "[Тийн ялгалын бүх хэлбэр](case-forms.md), [зөв бичгийн нэмэлт үгс](spelling-exceptions.md), [бүх эх бичвэр](../natal-texts-for-review.md)-ийг мөн хянана уу.",
  "", "Энэ багцад жилийн 12 сарын жишээ, төрсөн цаг тодорхойгүй хоёр жишээ, өөр цагийн бүс, өндөр өргөрөг, өмнөд хагасын жишээ орсон. Бүх боломжит хослолыг хамрахгүй.", "");
await writeFile(new URL("index.md", folder), index.join("\n"), "utf8");
await writeFile(new URL("manifest.json", folder), JSON.stringify(manifest, null, 2) + "\n", "utf8");
const cases = ["nom", "gen", "dat", "acc", "abl", "ins", "com", "dir"];
await writeFile(new URL("case-forms.md", folder), ["# Тийн ялгалын хэлбэрүүд", "", "Төлөв: төрөлх хэлтэй редактороор хянуулах эх.", "", `| Нэр томьёо | ${cases.join(" | ")} |`, `|---|${cases.map(() => "---").join("|")}|`, ...glossary.map((term) => `| ${term.term_id} | ${cases.map((key) => term.forms[key]).join(" | ")} |`), ""].join("\n"), "utf8");
await writeFile(new URL("spelling-exceptions.md", folder), ["# Dictionary exceptions for editorial review", "", "These exact words supplement dictionary-mn 3.0.0. They are not proof of native-editor approval. Glossary names, aliases and case forms are also accepted.", "", ...spellingExceptions.flatMap(({ reason, words }) => [reason, "", words.join(", "), ""])].join("\n"), "utf8");
const source = execFileSync(process.execPath, ["--experimental-strip-types", "scripts/export-natal-texts.mjs"], { cwd: fileURLToPath(root), encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
await writeFile(new URL("outputs/natal-texts-for-review.md", root), source, "utf8");
console.log(`Wrote 20 synthetic reports and editorial checklists to ${fileURLToPath(folder)}`);
