import type { NatalReading, ReadingGroup } from "@/lib/natal/reading-types";
import { READING_GROUPS } from "@/lib/natal/reading-types";

const paragraphsOf = (section: { paragraphs?: string[]; body?: string }) => section.paragraphs ?? (section.body ? [section.body] : []);

export function ReadingView({ reading }: { reading: NatalReading }) {
  const groups = READING_GROUPS.filter((group) => reading.sections.some((section) => (section.group ?? "intro") === group.id));
  return <div className="full-reading">
    <div className="reading-heading">
      <p className="eyebrow">БҮРЭН ТАЙЛАЛ</p>
      <h2>Тэнгэрийн хөрөг</h2>
      <p className="reading-name">{reading.input.name}</p>
      {reading.preview && <span>Туршилтын хувилбар · Төлбөр төлөөгүй</span>}
    </div>
    <nav className="reading-toc" aria-label="Тайлалын агуулга">
      <ol>{groups.map((group) => <li key={group.id}><a href={`#reading-${group.id}`}>{group.title}</a></li>)}</ol>
    </nav>
    {groups.map((group) => <section key={group.id} id={`reading-${group.id}`} className="reading-group" aria-labelledby={`reading-${group.id}-title`}>
      <h3 className="group-title" id={`reading-${group.id}-title`}>{group.title}</h3>
      {reading.sections.filter((section) => (section.group ?? "intro") === (group.id as ReadingGroup)).map((section) => <article key={section.id} id={`section-${section.id}`}>
        <h4>{section.title.split(/([☌⚹□△☍])/u).map((part, index) => index % 2 ? <span key={index} className="aspect-glyph" aria-hidden="true">{part}</span> : part)}</h4>
        {section.meta && <p className="section-meta">{section.meta}</p>}
        {paragraphsOf(section).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
      </article>)}
    </section>)}
  </div>;
}
