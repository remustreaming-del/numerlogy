import type { NatalChart, PlanetPosition } from "@/lib/astrology";
import { formatLongitude, normalize } from "@/lib/astrology";
import { ASPECT_NAMES, SIGN_GLYPHS, house } from "@/lib/natal/terms";

const CENTER = 180;
const point = (longitude: number, radius: number, rotation: number) => {
  const angle = (180 - normalize(longitude - rotation)) * Math.PI / 180;
  // ASC on the left, zodiac counter-clockwise: house 4 (IC) at the bottom, house 10 (MC) at the top.
  return { x: CENTER + Math.cos(angle) * radius, y: CENTER + Math.sin(angle) * radius };
};

/** Pushes glyphs apart along the ring so no two discs overlap (min 9° apart), keeping order. */
function spreadGlyphs(points: PlanetPosition[], minGap = 9) {
  const sorted = [...points].sort((a, b) => a.longitude - b.longitude);
  const placed = sorted.map((item) => ({ id: item.id, at: item.longitude }));
  for (let pass = 0; pass < 6; pass++) {
    for (let i = 0; i < placed.length; i++) {
      const current = placed[i], next = placed[(i + 1) % placed.length];
      const gap = normalize(next.at - current.at);
      if (placed.length > 1 && gap < minGap) { const push = (minGap - gap) / 2; current.at = normalize(current.at - push); next.at = normalize(next.at + push); }
    }
  }
  return new Map(placed.map((item) => [item.id, item.at]));
}

export function ChartWheel({ chart, id = "natal-wheel" }: { chart: NatalChart; id?: string }) {
  const rotation = chart.ascendant?.longitude ?? 0;
  const bodies = [...chart.planets, chart.node];
  const display = spreadGlyphs(bodies);
  return <figure className="chart-figure">
    <svg id={id} className="chart-wheel" viewBox="-14 -14 388 388" role="img" aria-labelledby={`${id}-title ${id}-desc`}>
      <title id={`${id}-title`}>Натал зураг · {chart.input.name}</title>
      <desc id={`${id}-desc`}>{bodies.map((planet) => `${planet.name} ${planet.sign} ${planet.degree} хэм`).join(", ")}</desc>
      <circle cx={CENTER} cy={CENTER} r="172" className="wheel-bg" />
      <circle cx={CENTER} cy={CENTER} r="148" className="wheel-line" />
      <circle cx={CENTER} cy={CENTER} r="90" className="wheel-line faint" />
      {Array.from({ length: 12 }, (_, index) => {
        const start = point(index * 30, 148, rotation), end = point(index * 30, 172, rotation), label = point(index * 30 + 15, 160, rotation);
        return <g key={index}>
          <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} className="zodiac-tick" />
          <text x={label.x} y={label.y} className={`zodiac-glyph element-${index % 4}`} textAnchor="middle" dominantBaseline="central" aria-hidden="true">{`${SIGN_GLYPHS[index]}︎`}</text>
        </g>;
      })}
      {Array.from({ length: 72 }, (_, index) => { const a = point(index * 5, 148, rotation), b = point(index * 5, index % 2 ? 145 : 142, rotation); return <line key={`tick-${index}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="degree-tick" />; })}
      {chart.houses?.map((cusp) => {
        const outside = point(cusp.longitude, 148, rotation), inside = point(cusp.longitude, 90, rotation);
        const next = chart.houses![cusp.house % 12].longitude, middle = cusp.longitude + normalize(next - cusp.longitude) / 2, label = point(middle, 97, rotation);
        return <g key={cusp.house}>
          <line x1={inside.x} y1={inside.y} x2={outside.x} y2={outside.y} className={cusp.house % 3 === 1 ? "house-line angular" : "house-line"} />
          <text x={label.x} y={label.y} className="house-number" textAnchor="middle" dominantBaseline="central">{cusp.house}</text>
        </g>;
      })}
      {chart.aspects.filter((aspect) => aspect.type !== "conjunction").map((aspect) => {
        const a = chart.planets.find((planet) => planet.id === aspect.a)!, b = chart.planets.find((planet) => planet.id === aspect.b)!;
        const start = point(a.longitude, 88, rotation), end = point(b.longitude, 88, rotation);
        const tone = aspect.type === "trine" || aspect.type === "sextile" ? "harmonious" : "challenging";
        return <line key={`${aspect.a}-${aspect.b}`} x1={start.x} y1={start.y} x2={end.x} y2={end.y} className={`aspect-line ${tone}`} strokeOpacity={Math.max(0.25, 1 - aspect.orb / aspect.maxOrb)}><title>{`${a.name} ${ASPECT_NAMES[aspect.type].nom} ${b.name}, орб ${aspect.orb.toFixed(1)}°`}</title></line>;
      })}
      {!chart.houses && <text x={CENTER} y={CENTER} textAnchor="middle" dominantBaseline="central" className="unknown-time-mark">ЦАГГҮЙ</text>}
      {chart.ascendant && chart.midheaven && <g className="axis">
        {[[chart.ascendant.longitude, "ASC"], [chart.ascendant.longitude + 180, "DSC"], [chart.midheaven.longitude, "MC"], [chart.midheaven.longitude + 180, "IC"]].map(([longitude, label]) => {
          const inner = point(longitude as number, 90, rotation), outer = point(longitude as number, 148, rotation), text = point(longitude as number, 180, rotation);
          return <g key={label as string}><line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} className="axis-line" /><text x={text.x} y={text.y} textAnchor="middle" dominantBaseline="central" className="angle-label">{label}</text></g>;
        })}
      </g>}
      {bodies.map((planet) => {
        const shown = display.get(planet.id) ?? planet.longitude;
        const anchor = point(shown, 122, rotation), tickOuter = point(planet.longitude, 148, rotation), tickInner = point(planet.longitude, 140, rotation);
        const label = `${planet.name}: ${formatLongitude(planet)}${planet.house ? `, ${house(planet.house).short}` : ""}`;
        return <g key={planet.id} className="planet-mark">
          <title>{label}</title>
          <line x1={tickOuter.x} y1={tickOuter.y} x2={tickInner.x} y2={tickInner.y} className="planet-tick" />
          <line x1={tickInner.x} y1={tickInner.y} x2={anchor.x} y2={anchor.y} className="planet-stem" />
          <circle cx={anchor.x} cy={anchor.y} r="11" className={planet.id === "node" ? "planet-disc node" : "planet-disc"} />
          <text x={anchor.x} y={anchor.y + 0.5} textAnchor="middle" dominantBaseline="central" className="planet-glyph" aria-hidden="true">{`${planet.glyph}︎`}</text>
          {planet.retrograde && planet.id !== "node" && <text x={anchor.x + 10} y={anchor.y + 9} className="retro-mark" aria-hidden="true">R</text>}
        </g>;
      })}
    </svg>
    <figcaption>{chart.houseSystem === "placidus" ? "Плацидусын байшингууд" : chart.houseSystem === "whole-sign" ? "Бүхэл ордын байшингууд" : "Төрсөн цаггүй зураг"} · Тропик зодиак · <span className="legend harmonious">эвтэй</span> <span className="legend challenging">хурцадмал</span> аспект</figcaption>
  </figure>;
}
