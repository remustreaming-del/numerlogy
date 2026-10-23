// Prints a full natal reading as plain text, for proofreading and QA.
// node --experimental-strip-types scripts/sample-natal-reading.mjs 1990-07-01 08:30 ulaanbaatar
import { createNatalReading } from "../lib/natal/reading.ts";
import { READING_GROUPS } from "../lib/natal/reading-types.ts";

const [birthDate = "1990-07-01", birthTime = "08:30", cityId = "ulaanbaatar"] = process.argv.slice(2);
const reading = createNatalReading({ name: "Туршилт", birthDate, birthTime: birthTime === "unknown" ? "12:00" : birthTime, unknownTime: birthTime === "unknown", cityId });
console.log(`# ${reading.input.name} · ${reading.local} · ${reading.city.name}\n`);
for (const group of READING_GROUPS) {
  const sections = reading.sections.filter((section) => section.group === group.id);
  if (!sections.length) continue;
  console.log(`## ${group.title}\n`);
  for (const section of sections) console.log(`### ${section.title}${section.meta ? `  _(${section.meta})_` : ""}\n\n${section.paragraphs.join("\n\n")}\n`);
}
console.error(`sections: ${reading.sections.length}, characters: ${reading.sections.reduce((sum, s) => sum + s.paragraphs.join(" ").length, 0)}`);
