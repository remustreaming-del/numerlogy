import type { NatalChart } from "@/lib/astrology";
import { formatLongitude } from "@/lib/astrology";

export function PositionsTable({ chart }: { chart: NatalChart }) {
  const rows = chart.ascendant ? [chart.ascendant, ...chart.planets] : chart.planets;
  return <div className="positions-wrap" tabIndex={0} aria-label="Гарагуудын байрлалын хүснэгт">
    <table className="positions-table">
      <caption>Гараг ба цэгүүдийн нарийвчилсан байрлал</caption>
      <thead><tr><th scope="col">Цэг</th><th scope="col">Орд, хэм</th><th scope="col">Гэр</th></tr></thead>
      <tbody>{rows.map((planet) => <tr key={planet.id}><th scope="row"><span aria-hidden="true" className="table-glyph">{planet.glyph}</span>{planet.name}</th><td>{formatLongitude(planet)}</td><td>{planet.house ?? "—"}</td></tr>)}</tbody>
    </table>
  </div>;
}
