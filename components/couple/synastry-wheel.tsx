import { spreadGlyphs } from "@/components/natal/chart-wheel";
import type { PlanetPosition } from "@/lib/astrology";
import { formatLongitude, normalize } from "@/lib/astrology";
import type { CoupleChart, CrossAspect } from "@/lib/couple/synastry";
import { ASPECT_NAMES, SIGN_GLYPHS } from "@/lib/natal/terms";

const CENTER = 180;
// Person A's houses and planets inside, person B's planets in the ring under the zodiac, cross aspects in the centre.
const R = { outer: 172, zodiac: 148, divider: 114, inner: 80 };
const point = (longitude: number, radius: number, rotation: number) => {
  const angle = (180 - normalize(longitude - rotation)) * Math.PI / 180;
  return { x: CENTER + Math.cos(angle) * radius, y: CENTER + Math.sin(angle) * radius };
};
const bodiesOf = (chart: CoupleChart["a"]): PlanetPosition[] => [...chart.planets, ...(chart.ascendant ? [chart.ascendant] : [])];
const glyphOf = (body: PlanetPosition) => body.id === "ascendant" ? "AC" : `${body.glyph}︎`;

function Ring({ bodies, radius, rotation, person, name }: { bodies: PlanetPosition[]; radius: number; rotation: number; person: "a" | "b"; name: string }) {
  const display = spreadGlyphs(bodies, 10);
  const tickOuter = person === "b" ? R.zodiac : R.divider;
  return <g className={`ring-${person}`}>{bodies.map((body) => {
    const shown = display.get(body.id) ?? body.longitude;
    const anchor = point(shown, radius, rotation), outer = point(body.longitude, tickOuter, rotation), inner = point(body.longitude, tickOuter - 6, rotation);
    return <g key={body.id} className="planet-mark">
      <title>{`${name}: ${body.name} ${formatLongitude(body)}`}</title>
      <line x1={outer.x} y1={outer.y} x2={inner.x} y2={inner.y} className="planet-tick" />
      <line x1={inner.x} y1={inner.y} x2={anchor.x} y2={anchor.y} className="planet-stem" />
      <circle cx={anchor.x} cy={anchor.y} r="10" className={`planet-disc disc-${person}`} />
      <text x={anchor.x} y={anchor.y + 0.5} textAnchor="middle" dominantBaseline="central" className={body.id === "ascendant" ? "planet-glyph asc-glyph" : "planet-glyph"} aria-hidden="true">{glyphOf(body)}</text>
    </g>;
  })}</g>;
}

export function SynastryWheel({ couple, aspects, id = "synastry-wheel" }: { couple: CoupleChart; aspects: CrossAspect[]; id?: string }) {
  const rotation = couple.a.ascendant?.longitude ?? 0;
  const position = (chart: CoupleChart["a"], key: string) => key === "ascendant" ? chart.ascendant : chart.planets.find((planet) => planet.id === key);
  const nameA = couple.a.input.name, nameB = couple.b.input.name;
  return <figure className="chart-figure synastry-figure">
    <svg id={id} className="chart-wheel" viewBox="-14 -14 388 388" role="img" aria-labelledby={`${id}-title ${id}-desc`}>
      <title id={`${id}-title`}>Хосын зураг · {nameA} ба {nameB}</title>
      <desc id={`${id}-desc`}>Дотор цагираг: {nameA}. Гадна цагираг: {nameB}. Дунд нь хоёр зургийн хамгийн чухал {aspects.length} аспект.</desc>
      <circle cx={CENTER} cy={CENTER} r={R.outer} className="wheel-bg" />
      <circle cx={CENTER} cy={CENTER} r={R.zodiac} className="wheel-line" />
      <circle cx={CENTER} cy={CENTER} r={R.divider} className="wheel-line" />
      <circle cx={CENTER} cy={CENTER} r={R.inner} className="wheel-line faint" />
      {Array.from({ length: 12 }, (_, index) => {
        const start = point(index * 30, R.zodiac, rotation), end = point(index * 30, R.outer, rotation), label = point(index * 30 + 15, 160, rotation);
        return <g key={index}>
          <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} className="zodiac-tick" />
          <text x={label.x} y={label.y} className={`zodiac-glyph element-${index % 4}`} textAnchor="middle" dominantBaseline="central" aria-hidden="true">{`${SIGN_GLYPHS[index]}︎`}</text>
        </g>;
      })}
      {couple.a.houses?.map((cusp) => {
        const outside = point(cusp.longitude, R.divider, rotation), inside = point(cusp.longitude, R.inner, rotation);
        return <line key={cusp.house} x1={inside.x} y1={inside.y} x2={outside.x} y2={outside.y} className={cusp.house % 3 === 1 ? "house-line angular" : "house-line"} />;
      })}
      {aspects.filter((aspect) => aspect.family !== "conjunction").map((aspect) => {
        const a = position(couple.a, aspect.a), b = position(couple.b, aspect.b);
        if (!a || !b) return null;
        const start = point(a.longitude, R.inner - 2, rotation), end = point(b.longitude, R.inner - 2, rotation);
        return <line key={`${aspect.a}-${aspect.b}`} x1={start.x} y1={start.y} x2={end.x} y2={end.y} className={`aspect-line ${aspect.family}`} strokeOpacity={Math.max(0.3, aspect.strength)}><title>{`${nameA}: ${a.name} ${ASPECT_NAMES[aspect.type].nom} ${nameB}: ${b.name}, орб ${aspect.orb.toFixed(1)}°`}</title></line>;
      })}
      {!couple.a.houses && <text x={CENTER} y={CENTER} textAnchor="middle" dominantBaseline="central" className="unknown-time-mark">ЦАГГҮЙ</text>}
      <Ring bodies={bodiesOf(couple.b)} radius={131} rotation={rotation} person="b" name={nameB} />
      <Ring bodies={bodiesOf(couple.a)} radius={97} rotation={rotation} person="a" name={nameA} />
    </svg>
    <figcaption><span className="legend person-a">{nameA}</span> дотор · <span className="legend person-b">{nameB}</span> гадна · <span className="legend harmonious">эвтэй</span> <span className="legend challenging">хурцадмал</span></figcaption>
  </figure>;
}
