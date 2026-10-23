import Link from "next/link";
import { MoonStar } from "lucide-react";

export function SiteHeader() {
  return <header className="site-header">
    <Link className="brand" href="/" aria-label="Тооногийн нүүр хуудас">
      <MoonStar aria-hidden="true" />
      <span>toono</span>
    </Link>
    <nav aria-label="Үндсэн цэс">
      <Link href="/etsgiin-kod">Эцгийн код</Link>
      <Link href="/natal">Натал зураг</Link>
    </nav>
  </header>;
}
