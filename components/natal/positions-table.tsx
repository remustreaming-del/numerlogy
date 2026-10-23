import type { NatalChart } from "@/lib/astrology";
import { formatLongitude } from "@/lib/astrology";
import { ASPECT_NAMES } from "@/lib/natal/terms";

export function PositionsTable({ chart }: { chart: NatalChart }) {
  const rows = [...(chart.ascendant ? [chart.ascendant] : []), ...(chart.midheaven ? [chart.midheaven] : []), ...chart.planets, chart.node];
  const names = Object.fromEntries(chart.planets.map((planet) => [planet.id, planet.name]));
  return <div className="positions-stack">
    <div className="positions-wrap" tabIndex={0} aria-label="Гарагуудын байрлалын хүснэгт">
      <table className="positions-table">
        <caption>Гараг ба цэгүүдийн нарийвчилсан байрлал</caption>
        <thead><tr><th scope="col">Цэг</th><th scope="col">Орд, хэм</th><th scope="col">Байшин</th></tr></thead>
        <tbody>{rows.map((planet) => <tr key={planet.id}>
          <th scope="row"><span aria-hidden="true" className="table-glyph">{planet.id === "ascendant" || planet.id === "midheaven" ? planet.glyph : `${planet.glyph}︎`}</span>{planet.name}</th>
          <td>{formatLongitude(planet)}{planet.retrograde && planet.id !== "node" && <span className="sr-only"> (ретроград)</span>}</td>
          <td>{planet.house ?? "—"}</td>
        </tr>)}</tbody>
      </table>
    </div>
    {chart.aspects.length > 0 && <details className="aspect-list">
      <summary>Аспектууд ({chart.aspects.length})</summary>
      <ul>{chart.aspects.map((aspect) => <li key={`${aspect.a}-${aspect.b}`}><span aria-hidden="true">{ASPECT_NAMES[aspect.type].glyph}</span> {names[aspect.a]} — {names[aspect.b]}: {ASPECT_NAMES[aspect.type].nom}, орб {aspect.orb.toFixed(1)}°</li>)}</ul>
    </details>}
  </div>;
}
