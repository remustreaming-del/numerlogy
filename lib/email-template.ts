import type { Report } from "./numerology.ts";

const SITE = "https://www.numpath.site";
const escape = (value: string) => value.replace(/[&<>"']/g, ch => `&#${ch.charCodeAt(0)};`);
const pad = (n: number) => String(n).padStart(2, "0");

// The full reading goes in the email body: building a PDF on the server exceeds the Workers free-plan CPU limit.
export function message(report: Report) {
  const { father, child } = report;
  const subject = `Эцгийн код · ${report.pairCode} ${report.pairTitle}`;
  const ink = "#292641", muted = "#5f5b70", accent = "#72608f", line = "#e7e3ee";
  const p = (text: string, style = "") => `<p style="margin:0 0 14px;line-height:1.75;color:${muted};${style}">${escape(text)}</p>`;
  const numbers = [[pad(father.number), `Эцгийн тоо · ${father.title}`], [pad(child.number), `Таны тоо · ${child.title}`], [report.pairCode, "Хоёр тооны уулзвар"]]
    .map(([n, label]) => `<td style="text-align:center;padding:14px 6px"><div style="font-family:Georgia,serif;font-size:28px;color:${accent}">${escape(n)}</div><div style="font-size:11px;color:${muted}">${escape(label)}</div></td>`).join("");
  const parts = report.parts.map(part => [
    `<div style="border-top:1px solid ${line};margin-top:28px;padding-top:22px">`,
    `<div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${accent}">${escape(part.kicker)}</div>`,
    `<h2 style="font-family:Georgia,serif;font-weight:normal;font-size:22px;color:${ink};margin:6px 0 12px">${escape(part.heading)}</h2>`,
    part.lead ? p(part.lead) : "",
    ...part.sections.map(s => [
      `<h3 style="font-size:14px;color:${ink};margin:18px 0 6px">${escape(s.title)}</h3>`,
      s.text ? p(s.text) : "",
      ...(s.items ?? []).map((item, i) => `<p style="margin:0 0 4px;font-size:12px;font-weight:bold;color:${ink}">${pad(i + 1)} · ${escape(item.title)}</p>${p(item.text, "padding-left:22px")}`),
    ].join("")),
    part.note ? p(part.note, `font-style:italic;color:${accent};background:#f5f1fa;padding:12px 16px;border-radius:6px`) : "",
    "</div>",
  ].join("")).join("");
  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:${ink};max-width:640px;margin:auto;padding:8px">`
    + `<p style="margin:0 0 6px;color:${accent};font-size:12px;letter-spacing:1px">TOONO · ЭЦГИЙН КОД</p>`
    + `<h1 style="font-family:Georgia,serif;font-weight:normal;font-size:26px;margin:0 0 6px">${escape(`${report.pairCode} ${report.pairTitle}`)}</h1>`
    + p(`Сайн байна уу${child.name ? `, ${child.name}` : ""}. Таны төлбөр баталгаажлаа. Аав${father.name ? ` ${father.name}` : ""} (${father.birthday}) болон таны (${child.birthday}) тайлал доор байна.`)
    + `<table role="presentation" width="100%" style="background:#f5f1fa;border-radius:8px;border-collapse:collapse"><tr>${numbers}</tr></table>`
    + p(`“${report.quote}”`, `font-family:Georgia,serif;font-style:italic;font-size:17px;color:${accent};text-align:center;margin-top:18px`)
    + parts
    + `<div style="border-top:1px solid ${line};margin-top:28px;padding-top:16px">${p(report.method, "font-size:11px")}${p(`PDF хувилбарыг ${SITE} сайтаас “Өмнөх тайлал нээх” товчоор татаж авна уу.`, "font-size:12px")}</div></div>`;
  const text = [
    subject, "",
    `Сайн байна уу${child.name ? `, ${child.name}` : ""}. Таны төлбөр баталгаажлаа.`,
    `Эцгийн тоо: ${pad(father.number)} ${father.title} · Таны тоо: ${pad(child.number)} ${child.title}`,
    `“${report.quote}”`,
    ...report.parts.flatMap(part => ["", `== ${part.kicker} ==`, part.heading, part.lead ?? "",
      ...part.sections.flatMap(s => ["", s.title, s.text ?? "", ...(s.items ?? []).map((item, i) => `${pad(i + 1)}. ${item.title} — ${item.text}`)]),
      part.note ?? ""]),
    "", report.method, "", SITE,
  ].filter((value, i, all) => value !== "" || all[i - 1] !== "").join("\n");
  return { subject, html, text };
}
