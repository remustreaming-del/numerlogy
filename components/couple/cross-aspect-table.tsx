import { formatLongitude } from "@/lib/astrology";
import type { CoupleChart, CrossAspect, CrossPoint } from "@/lib/couple/synastry";
import { ASPECT_NAMES } from "@/lib/natal/terms";

/** The precise, screen-reader-friendly source for the bi-wheel: every cross aspect with both positions. */
export function CrossAspectTable({ couple, aspects }: { couple: CoupleChart; aspects: CrossAspect[] }) {
  const position = (chart: CoupleChart["a"], id: CrossPoint) => id === "ascendant" ? chart.ascendant! : chart.planets.find((planet) => planet.id === id)!;
  return <div className="positions-stack">
    <div className="positions-wrap" tabIndex={0} aria-label="Хоёр зургийн аспектуудын хүснэгт">
      <table className="positions-table cross-table">
        <caption>Хоёр зургийн хамгийн чухал аспектууд</caption>
        <thead><tr><th scope="col">{couple.a.input.name}</th><th scope="col">Аспект</th><th scope="col">{couple.b.input.name}</th></tr></thead>
        <tbody>{aspects.map((aspect) => {
          const a = position(couple.a, aspect.a), b = position(couple.b, aspect.b);
          return <tr key={`${aspect.a}-${aspect.b}`}>
            <td><strong>{a.name}</strong><small>{formatLongitude(a)}</small></td>
            <th scope="row"><span aria-hidden="true" className={`table-glyph ${aspect.family}`}>{ASPECT_NAMES[aspect.type].glyph}</span>{ASPECT_NAMES[aspect.type].nom}<small>орб {aspect.orb.toFixed(1)}°{aspect.approximate ? " · ойролцоо" : ""}</small></th>
            <td><strong>{b.name}</strong><small>{formatLongitude(b)}</small></td>
          </tr>;
        })}</tbody>
      </table>
    </div>
    <p className="field-hint">Нийт {couple.aspects.length} аспектаас хамгийн чухал {aspects.length} нь. Тайлбар нь бүрэн тайлалд.</p>
  </div>;
}
