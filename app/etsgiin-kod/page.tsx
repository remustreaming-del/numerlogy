import type { Metadata } from "next";
import { EtsgiinKodFlow } from "@/components/etsgiin-kod/flow";
import { SiteHeader } from "@/components/site-header";
import { Starfield } from "@/components/starfield";

export const metadata: Metadata = { title: "Эцгийн код · Toono", description: "Аав болон таны төрсөн огнооны 81 бэлгэдлийн хослол." };

export default function EtsgiinKodPage() {
  return <div className="site-shell"><Starfield /><SiteHeader /><main id="main-content" className="product-page"><aside className="product-intro"><p className="eyebrow">ТООН БЭЛГЭДЭЛ</p><h2>Хоёр үеийн зам хаана огтлолцдог вэ?</h2><p>Эцгийн үлдээсэн хандлага, таны өөрийн сонголт хоёрын гэрэл ба сүүдрийг нэг тайлалд харуулна.</p><dl><div><dt>81</dt><dd>боломжит хослол</dd></div><div><dt>PDF</dt><dd>татаж авах тайлан</dd></div><div><dt>₮20,000</dt><dd>нэг удаагийн төлбөр</dd></div></dl></aside><EtsgiinKodFlow /></main></div>;
}
