import type { Report } from "@/lib/numerology";
import { pad } from "@/lib/codes";

export function EtsgiinReportContent({ report }: { report: Report }) {
  return <div className="long-reading">
    <div className="number-summary">
      {[[pad(report.father.number), `Эцгийн тоо · ${report.father.title}`], [pad(report.child.number), `Таны тоо · ${report.child.title}`], [report.pairCode, "Хоёр тооны уулзвар"]].map(([number, label]) => <div key={label}><strong>{number}</strong><span>{label}</span></div>)}
    </div>
    <blockquote>“{report.quote}”</blockquote>
    {report.parts.map((part) => <article key={part.kicker}>
      <p className="eyebrow">{part.kicker}</p><h2>{part.heading}</h2>
      {part.lead && <p className="reading-lead">{part.lead}</p>}
      {part.sections.map((section) => <section key={section.title}><h3>{section.title}</h3>{section.text && <p>{section.text}</p>}{section.items && <ol>{section.items.map((item, index) => <li key={item.title}><span>{pad(index + 1)}</span><div><strong>{item.title}</strong><p>{item.text}</p></div></li>)}</ol>}</section>)}
      {part.note && <p className="reading-note">{part.note}</p>}
    </article>)}
    <p className="method-note">{report.method}</p>
  </div>;
}
