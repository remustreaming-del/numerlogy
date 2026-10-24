import type { CoupleReading } from "./couple/reading-types.ts";
import { COUPLE_GROUPS } from "./couple/reading-types.ts";
import { METRIC_NAMES } from "./couple/free.ts";
import { METRICS } from "./couple/synastry.ts";

const escape = (value: string) => value.replace(/[&<>"']/g, (character) => `&#${character.charCodeAt(0)};`);

export function coupleMessage(report: CoupleReading) {
  const names = `${report.a.input.name} ба ${report.b.input.name}`;
  const subject = `Хосын зурхай · ${names}`;
  const scores = METRICS.map((metric) => `${METRIC_NAMES[metric]}: ${report.scores[metric].score}/100`);
  const groups = COUPLE_GROUPS.map((group) => ({ group, sections: report.sections.filter((section) => section.group === group.id) })).filter((item) => item.sections.length);
  const html = `<div style="font-family:Arial,sans-serif;background:#0b0a1d;color:#f0e9d1;max-width:680px;margin:auto;padding:32px">`
    + `<p style="color:#d3ae63;letter-spacing:2px;font-size:11px">TOONO · ХОСЫН ЗУРХАЙ</p>`
    + `<h1 style="font-family:Georgia,serif;font-size:30px;font-weight:normal;margin:8px 0">Хоёр тэнгэрийн уулзвар · ${escape(names)}</h1>`
    + `<p style="color:#bbb7cb;line-height:1.75">Төлбөр баталгаажлаа. Бүрэн тайлалын PDF хувилбарыг хавсаргав.</p>`
    + `<ul style="color:#bbb7cb;line-height:1.75;padding-left:18px">${scores.map((item) => `<li>${escape(item)}</li>`).join("")}</ul>`
    + groups.map(({ group, sections }) => `<h2 style="color:#d3ae63;font-size:12px;letter-spacing:2px;margin:36px 0 0;border-top:1px solid #332f50;padding-top:18px">${escape(group.title.toUpperCase())}</h2>`
      + sections.map((section) => `<section style="margin-top:20px"><h3 style="font-family:Georgia,serif;color:#f0e9d1;font-weight:normal;font-size:21px;margin:0 0 4px">${escape(section.title)}</h3>`
        + (section.meta ? `<p style="color:#d3ae63;font-size:12px;margin:0 0 8px">${escape(section.meta)}</p>` : "")
        + section.paragraphs.map((paragraph) => `<p style="color:#bbb7cb;line-height:1.75;margin:0 0 10px">${escape(paragraph)}</p>`).join("")
        + `</section>`).join("")).join("")
    + `</div>`;
  const text = [subject, "", ...scores, "", ...groups.flatMap(({ group, sections }) => [group.title.toUpperCase(), "", ...sections.flatMap((section) => [section.title, ...(section.meta ? [section.meta] : []), ...section.paragraphs, ""])])].join("\n");
  return { subject, html, text };
}
