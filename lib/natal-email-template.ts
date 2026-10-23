import type { NatalReading } from "./natal/reading-types.ts";
import { READING_GROUPS } from "./natal/reading-types.ts";

const escape = (value: string) => value.replace(/[&<>"']/g, (character) => `&#${character.charCodeAt(0)};`);
const paragraphsOf = (section: { paragraphs?: string[]; body?: string }) => section.paragraphs ?? (section.body ? [section.body] : []);

export function natalMessage(report: NatalReading) {
  const subject = `Натал зураг · ${report.input.name}`;
  const facts = `${report.input.birthDate} · ${report.input.unknownTime ? "төрсөн цаггүй" : report.input.birthTime} · ${report.city.name}`;
  const groups = READING_GROUPS.map((group) => ({ group, sections: report.sections.filter((section) => (section.group ?? "intro") === group.id) })).filter((item) => item.sections.length);
  const html = `<div style="font-family:Arial,sans-serif;background:#0b0a1d;color:#f0e9d1;max-width:680px;margin:auto;padding:32px">`
    + `<p style="color:#d3ae63;letter-spacing:2px;font-size:11px">TOONO · НАТАЛ ЗУРАГ</p>`
    + `<h1 style="font-family:Georgia,serif;font-size:30px;font-weight:normal;margin:8px 0">Тэнгэрийн хөрөг · ${escape(report.input.name)}</h1>`
    + `<p style="color:#8f8ba4">${escape(facts)}</p>`
    + `<p style="color:#bbb7cb;line-height:1.75">Төлбөр баталгаажлаа. Зурагтай PDF тайланг хавсаргав.</p>`
    + groups.map(({ group, sections }) => `<h2 style="color:#d3ae63;font-size:12px;letter-spacing:2px;margin:36px 0 0;border-top:1px solid #332f50;padding-top:18px">${escape(group.title.toUpperCase())}</h2>`
      + sections.map((section) => `<section style="margin-top:20px"><h3 style="font-family:Georgia,serif;color:#f0e9d1;font-weight:normal;font-size:21px;margin:0 0 4px">${escape(section.title)}</h3>`
        + (section.meta ? `<p style="color:#d3ae63;font-size:12px;margin:0 0 8px">${escape(section.meta)}</p>` : "")
        + paragraphsOf(section).map((paragraph) => `<p style="color:#bbb7cb;line-height:1.75;margin:0 0 10px">${escape(paragraph)}</p>`).join("")
        + `</section>`).join("")).join("")
    + `</div>`;
  const text = [subject, facts, "", ...groups.flatMap(({ group, sections }) => [group.title.toUpperCase(), "", ...sections.flatMap((section) => [section.title, ...(section.meta ? [section.meta] : []), ...paragraphsOf(section), ""])])].join("\n");
  return { subject, html, text };
}
