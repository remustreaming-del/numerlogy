import type { NatalReading } from "./astrology";

const escape = (value: string) => value.replace(/[&<>"']/g, (character) => `&#${character.charCodeAt(0)};`);

export function natalMessage(report: NatalReading) {
  const subject = `Натал зураг · ${report.input.name}`;
  const sections = report.sections.map((section) => `<section style="border-top:1px solid #332f50;padding-top:18px;margin-top:22px"><h2 style="font-family:Georgia,serif;color:#f0e9d1;font-weight:normal;font-size:22px;margin:0 0 8px">${escape(section.title)}</h2><p style="color:#bbb7cb;line-height:1.75;margin:0">${escape(section.body)}</p></section>`).join("");
  const html = `<div style="font-family:Arial,sans-serif;background:#0b0a1d;color:#f0e9d1;max-width:680px;margin:auto;padding:32px"><p style="color:#d3ae63;letter-spacing:2px;font-size:11px">TOONO · НАТАЛ ЗУРАГ</p><h1 style="font-family:Georgia,serif;font-size:30px;font-weight:normal;margin:8px 0">${escape(report.input.name)}-ийн төрсөн агшны тэнгэр</h1><p style="color:#8f8ba4">${escape(`${report.input.birthDate} · ${report.input.unknownTime ? "төрсөн цаггүй" : report.input.birthTime} · ${report.city.name}`)}</p><p style="color:#bbb7cb;line-height:1.75">Төлбөр баталгаажлаа. Зурагтай PDF тайланг хавсаргав.</p>${sections}<p style="color:#8f8ba4;font-size:11px;line-height:1.6;margin-top:28px">${escape(report.note)}</p></div>`;
  const text = [subject, `${report.input.birthDate} · ${report.input.unknownTime ? "төрсөн цаггүй" : report.input.birthTime} · ${report.city.name}`, "", ...report.sections.flatMap((section) => [section.title, section.body, ""]), report.note].join("\n");
  return { subject, html, text };
}
