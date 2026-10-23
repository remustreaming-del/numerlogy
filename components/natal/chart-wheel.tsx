import type { NatalChart } from "@/lib/astrology";
import { normalize } from "@/lib/astrology";
import { SIGN_GLYPHS } from "@/lib/natal-texts";

const point = (longitude: number, radius: number, rotation: number) => {
  const angle = (180 - normalize(longitude - rotation)) * Math.PI / 180;
  return { x: 180 + Math.cos(angle) * radius, y: 180 - Math.sin(angle) * radius };
};

export function ChartWheel({ chart, id = "natal-wheel" }: { chart: NatalChart; id?: string }) {
  const rotation = chart.ascendant?.longitude ?? 0;
  const lanes = new Map<string, number>();
  [...chart.planets].sort((a, b) => a.longitude - b.longitude).forEach((planet, index, sorted) => {
    const previous = sorted[index - 1];
    const close = previous && normalize(planet.longitude - previous.longitude) < 11;
    lanes.set(planet.id, close ? ((lanes.get(previous.id) ?? 0) + 1) % 3 : 0);
  });
  return <figure className="chart-figure">
    <svg id={id} className="chart-wheel" viewBox="0 0 360 360" role="img" aria-labelledby={`${id}-title ${id}-desc`}>
      <title id={`${id}-title`}>{chart.input.name}-ийн натал зураг</title>
      <desc id={`${id}-desc`}>{chart.planets.map((planet) => `${planet.name} ${planet.sign} ${planet.degree} хэм`).join(", ")}</desc>
      <circle cx="180" cy="180" r="166" className="wheel-bg" />
      <circle cx="180" cy="180" r="145" className="wheel-line" />
      <circle cx="180" cy="180" r="93" className="wheel-line faint" />
      {Array.from({ length: 12 }, (_, index) => {
        const start = point(index * 30, 145, rotation), end = point(index * 30, 166, rotation), label = point(index * 30 + 15, 156, rotation);
        return <g key={index}><line x1={start.x} y1={start.y} x2={end.x} y2={end.y} className="zodiac-tick" /><text x={label.x} y={label.y} className="zodiac-glyph" textAnchor="middle" dominantBaseline="central" aria-hidden="true">{SIGN_GLYPHS[index]}</text></g>;
      })}
      {chart.houses?.map((cusp) => { const outside = point(cusp.longitude, 145, rotation), inside = point(cusp.longitude, 93, rotation), label = point(cusp.longitude + 3, 102, rotation); return <g key={cusp.house}><line x1={inside.x} y1={inside.y} x2={outside.x} y2={outside.y} className={cusp.house % 3 === 1 ? "house-line angular" : "house-line"} /><text x={label.x} y={label.y} className="house-number" textAnchor="middle">{cusp.house}</text></g>; })}
      {!chart.houses && <text x="180" y="180" textAnchor="middle" className="unknown-time-mark">ЦАГГҮЙ</text>}
      {chart.planets.map((planet) => { const anchor = point(planet.longitude, 121 - (lanes.get(planet.id) ?? 0) * 17, rotation), edge = point(planet.longitude, 92, rotation); return <g key={planet.id}><line x1={edge.x} y1={edge.y} x2={anchor.x} y2={anchor.y} className="planet-stem" /><circle cx={anchor.x} cy={anchor.y} r="12" className="planet-disc" /><text x={anchor.x} y={anchor.y + 1} textAnchor="middle" dominantBaseline="central" className="planet-glyph" aria-hidden="true">{planet.glyph}</text></g>; })}
      {chart.ascendant && <><text x="25" y="184" className="angle-label">ASC</text><text x="307" y="184" className="angle-label">DSC</text></>}
    </svg>
    <figcaption>{chart.houseSystem === "placidus" ? "Плацидусын гэрүүд" : chart.houseSystem === "whole-sign" ? "Бүхэл ордын гэрүүд" : "Төрсөн цаггүй зураг"} · Тропик зодиак</figcaption>
  </figure>;
}
