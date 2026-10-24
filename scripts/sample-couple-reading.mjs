// Prints a full couple reading as Markdown for proofreading.
// node --experimental-strip-types scripts/sample-couple-reading.mjs 1990-07-01 08:30 ulaanbaatar 1992-03-14 21:10 darkhan
import { createCoupleReading } from "../lib/couple/reading.ts";
import { COUPLE_GROUPS } from "../lib/couple/reading-types.ts";

const [dateA = "1990-07-01", timeA = "08:30", cityA = "ulaanbaatar", dateB = "1992-03-14", timeB = "21:10", cityB = "darkhan"] = process.argv.slice(2);
const person = (name, birthDate, birthTime, cityId) => ({ name, birthDate, birthTime: birthTime === "-" ? "" : birthTime, cityId, unknownTime: birthTime === "-" });
const reading = createCoupleReading({ a: person("Болд", dateA, timeA, cityA), b: person("Сараа", dateB, timeB, cityB) });

const lines = [`# Хосын зурхай · ${reading.a.input.name} ба ${reading.b.input.name}`, ""];
lines.push(Object.entries(reading.scores).map(([metric, score]) => `${metric} ${score.score}`).join(" · "), "");
for (const group of COUPLE_GROUPS) {
  const sections = reading.sections.filter((section) => section.group === group.id);
  if (!sections.length) continue;
  lines.push(`## ${group.title}`, "");
  for (const section of sections) {
    lines.push(`### ${section.title}`);
    if (section.meta) lines.push(`*${section.meta}*`);
    lines.push("", ...section.paragraphs.flatMap((paragraph) => [paragraph, ""]));
  }
}
console.log(lines.join("\n"));
