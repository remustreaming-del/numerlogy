import { numberTitles } from "@/lib/codes";
import { FREE_SUN_LINK, LEVEL_LABELS, METRIC_HINTS, METRIC_NAMES, TENSION_LABELS } from "@/lib/couple/free";
import { DIMENSIONS, type CoupleChart } from "@/lib/couple/synastry";
import { signPhrase } from "@/lib/natal/terms";

function Meter({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 52;
  return <svg className="score-ring" viewBox="0 0 120 120" aria-hidden="true">
    <circle cx="60" cy="60" r="52" className="ring-track" />
    <circle cx="60" cy="60" r="52" className="ring-value" strokeDasharray={`${(score / 100) * circumference} ${circumference}`} transform="rotate(-90 60 60)" />
  </svg>;
}

export function CoupleSummary({ couple }: { couple: CoupleChart }) {
  const { scores, lifePath } = couple;
  const sunLink = couple.links.find((link) => link.kind === "sun-sun")!;
  const people = [couple.a, couple.b];
  return <section className="free-reading couple-free" aria-labelledby="couple-free-title">
    <p className="eyebrow" id="couple-free-title">ҮНЭГҮЙ ТОВЧ ДҮН</p>
    <div className="couple-score">
      <div className="score-main">
        <Meter score={scores.overall.score} />
        <p><strong>{scores.overall.score}</strong><span>/100</span></p>
      </div>
      <div>
        <h2>{METRIC_NAMES.overall}</h2>
        <p>Та хоёрын нийцэл санамсаргүй 20,000 хосын {scores.overall.score} хувиас өндөр байна.</p>
        <p className="field-hint">Оноо нь хоёр зургийн аспект, ордын уялдааг санамсаргүй хосуудтай харьцуулсан хувь. Шалгалтын дүн биш, чиглүүлэгч.</p>
      </div>
    </div>
    <div className="balance-card couple-bars">
      <h3>Таван хэмжээс</h3>
      <ul>{DIMENSIONS.map((dimension) => <li key={dimension} className={`level-${scores[dimension].level}`}>
        <span className="bar-label">{METRIC_NAMES[dimension]}<small>{METRIC_HINTS[dimension]}</small></span>
        <span className="bar-track" aria-hidden="true"><span style={{ width: `${scores[dimension].score}%` }} /></span>
        <span className="bar-value">{scores[dimension].score}<small>{LEVEL_LABELS[scores[dimension].level]}</small></span>
      </li>)}
      <li className="tension-row">
        <span className="bar-label">{METRIC_NAMES.tension}<small>{METRIC_HINTS.tension}</small></span>
        <span className="bar-track" aria-hidden="true"><span style={{ width: `${scores.tension.score}%` }} /></span>
        <span className="bar-value">{scores.tension.score}<small>{TENSION_LABELS[scores.tension.level]}</small></span>
      </li></ul>
    </div>
    <div className="trinity-grid couple-cards">
      {people.map((chart) => {
        const [sun, moon] = chart.planets;
        return <article key={chart.input.name + chart.input.birthDate}>
          <span aria-hidden="true">☉︎</span>
          <p>{chart.input.name}</p>
          <h2>{signPhrase(sun.signIndex)}</h2>
          <small>Сар: {signPhrase(moon.signIndex)}{chart.ascendant ? ` · Мандах: ${signPhrase(chart.ascendant.signIndex)}` : ""}</small>
        </article>;
      })}
      <article>
        <span aria-hidden="true">{lifePath.a}·{lifePath.b}</span>
        <p>Амьдралын замын тоо</p>
        <h2>{numberTitles[lifePath.a]} ба {numberTitles[lifePath.b]}</h2>
        <small>Хосын тайлал бүрэн хувилбарт</small>
      </article>
    </div>
    <p className="couple-sun-line">{FREE_SUN_LINK[sunLink.distance]}</p>
  </section>;
}
