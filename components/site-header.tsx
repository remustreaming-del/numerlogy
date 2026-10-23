import { MoonStar } from "lucide-react";

export function SiteHeader() {
  return <header className="site-header">
    <a className="brand" href="/" aria-label="Тооногийн нүүр хуудас">
      <MoonStar aria-hidden="true" />
      <span>toono</span>
    </a>
    <nav aria-label="Үндсэн цэс">
      <a href="/etsgiin-kod">Эцгийн код</a>
      <a href="/natal">Натал зураг</a>
    </nav>
  </header>;
}
