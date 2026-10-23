import type { NatalChart } from "@/lib/astrology";
import { formatLongitude } from "@/lib/astrology";
import { FREE_ASCENDANT, FREE_ELEMENT, FREE_MODALITY, FREE_MOON, FREE_SUN } from "@/lib/natal/free";
import { ELEMENT_NAMES, MODALITY_NAMES, signPhrase, type Element, type Modality } from "@/lib/natal/terms";

function Bars<K extends string>({ title, values, names, hints }: { title: string; values: Record<K, number>; names: Record<K, { nom: string }>; hints: Record<K, string> }) {
  const total = Object.values<number>(values).reduce((sum, value) => sum + value, 0) || 1;
  return <div className="balance-card">
    <h3>{title}</h3>
    <ul>{(Object.keys(values) as K[]).map((key) => {
      const share = Math.round((values[key] / total) * 100);
      return <li key={key} className={`bar-${key}`}>
        <span className="bar-label">{names[key].nom}<small>{hints[key]}</small></span>
        <span className="bar-track" aria-hidden="true"><span style={{ width: `${share}%` }} /></span>
        <span className="bar-value">{share}%</span>
      </li>;
    })}</ul>
  </div>;
}

export function FreeSummary({ chart }: { chart: NatalChart }) {
  const [sun, moon] = chart.planets;
  const cards = [
    { id: "sun", glyph: sun.glyph, label: "Нар · мөн чанар", sign: signPhrase(sun.signIndex), degree: formatLongitude(sun), text: FREE_SUN[sun.signIndex] },
    { id: "moon", glyph: moon.glyph, label: "Сар · сэтгэл", sign: signPhrase(moon.signIndex), degree: formatLongitude(moon), text: FREE_MOON[moon.signIndex] },
    chart.ascendant
      ? { id: "asc", glyph: "ASC", label: "Мандах орд · хаалга", sign: signPhrase(chart.ascendant.signIndex), degree: formatLongitude(chart.ascendant), text: FREE_ASCENDANT[chart.ascendant.signIndex] }
      : { id: "asc", glyph: "—", label: "Мандах орд", sign: "Тодорхойгүй", degree: "Төрсөн цаг шаардлагатай", text: "Төрсөн цагаа оруулбал Мандах орд, байшингууд гарна." },
  ];
  return <section className="free-reading" aria-labelledby="free-title">
    <p className="eyebrow" id="free-title">ҮНЭГҮЙ ТОВЧ ТАЙЛАЛ</p>
    <div className="trinity-grid">{cards.map((card) => <article key={card.id} className={card.glyph === "—" ? "muted-card" : undefined}>
      <span aria-hidden="true">{card.glyph}</span><p>{card.label}</p><h2>{card.sign}</h2><small>{card.degree}</small><p className="trinity-text">{card.text}</p>
    </article>)}</div>
    <div className="balance-grid">
      <Bars<Element> title="Махбодын тэнцвэр" values={chart.balance.elements} names={ELEMENT_NAMES} hints={FREE_ELEMENT} />
      <Bars<Modality> title="Хэв шинж" values={chart.balance.modalities} names={MODALITY_NAMES} hints={FREE_MODALITY} />
    </div>
  </section>;
}
