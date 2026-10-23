import type { Metadata } from "next";
import { NatalFlow } from "@/components/natal/natal-flow";
import { SiteHeader } from "@/components/site-header";
import { Starfield } from "@/components/starfield";

export const metadata: Metadata = { title: "Натал зураг · Toono", description: "Төрсөн агшны гараг, орд, гэрүүдийн зураг ба Монгол тайлал." };

export default function NatalPage() {
  return <div className="site-shell"><Starfield /><SiteHeader /><main id="main-content" className="natal-page"><aside className="natal-intro"><p className="eyebrow">ТЭНГЭРИЙН ГАЗРЫН ЗУРАГ</p><h2>Таны төрөхөд тэнгэр ямар байсан бэ?</h2><p>Одон орны бодит байрлалыг тропик зодиак, Плацидусын гэрийн системээр зурна.</p><ul><li>Нар, Сар, Асцендент үнэгүй</li><li>Өнгөрсөн цагийн бүс ба зуны цагийг тооцно</li><li>Төрсөн мэдээлэл хайлтын сервер рүү явахгүй</li></ul></aside><div className="natal-workspace"><NatalFlow /></div></main></div>;
}
