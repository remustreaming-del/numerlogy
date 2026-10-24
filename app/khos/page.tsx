import type { Metadata } from "next";
import { CoupleFlow } from "@/components/couple/couple-flow";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Starfield } from "@/components/starfield";

export const metadata: Metadata = { title: "Хосын зурхай · Toono", description: "Хоёр хүний натал зургийг давхарлаж, сэтгэл, татал, ойлголцол, маргааны хэв маяг, амьдралын замын тоог монгол хэлээр тайлна." };

export default function CouplePage() {
  return <div className="site-shell"><Starfield /><SiteHeader /><main id="main-content" className="natal-page couple-page"><aside className="natal-intro"><p className="eyebrow">Synastry · Хосын зурхай</p><h2>Хоёр тэнгэр хэрхэн уулздаг вэ?</h2><p>Хоёр хүний төрсөн агшны зургийг давхарлаж, гарагууд хоорондоо ямар холбоо үүсгэж байгааг тооцно.</p><ul><li>Хосын зураг ба таван хэмжээсийн оноо үнэгүй</li><li>Оноо бүрийг санамсаргүй 20,000 хостой харьцуулна</li><li>Маргааныг шийдэх, гомдлоо эдгээх зөвлөмж</li><li>Амьдралын замын тоо (life path) хосын хувьд</li></ul></aside><div className="natal-workspace"><CoupleFlow /></div></main><SiteFooter /></div>;
}
