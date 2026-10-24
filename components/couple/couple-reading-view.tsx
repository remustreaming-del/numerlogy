import type { CoupleReading } from "@/lib/couple/reading-types";
import { COUPLE_GROUPS } from "@/lib/couple/reading-types";

export function CoupleReadingView({ reading }: { reading: CoupleReading }) {
  const groups = COUPLE_GROUPS.filter((group) => reading.sections.some((section) => section.group === group.id));
  return <div className="full-reading">
    <div className="reading-heading">
      <p className="eyebrow">БҮРЭН ТАЙЛАЛ</p>
      <h2>Хоёр тэнгэрийн уулзвар</h2>
      <p className="reading-name">{reading.a.input.name} ба {reading.b.input.name}</p>
      {reading.preview && <span>Туршилтын хувилбар · Төлбөр төлөөгүй</span>}
    </div>
    <nav className="reading-toc" aria-label="Тайлалын агуулга">
      <ol>{groups.map((group) => <li key={group.id}><a href={`#couple-${group.id}`}>{group.title}</a></li>)}</ol>
    </nav>
    {groups.map((group) => <section key={group.id} id={`couple-${group.id}`} className="reading-group" aria-labelledby={`couple-${group.id}-title`}>
      <h3 className="group-title" id={`couple-${group.id}-title`}>{group.title}</h3>
      {reading.sections.filter((section) => section.group === group.id).map((section) => <article key={section.id} id={`couple-section-${section.id}`}>
        <h4>{section.title.split(/([☌⚹□△☍])/u).map((part, index) => index % 2 ? <span key={index} className="aspect-glyph" aria-hidden="true">{part}</span> : part)}</h4>
        {section.meta && <p className="section-meta">{section.meta}</p>}
        {section.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
      </article>)}
    </section>)}
  </div>;
}
