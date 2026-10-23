import Link from "next/link";
import { ArrowUpRight, GitBranch, Orbit } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Starfield } from "@/components/starfield";

const products = [
  {
    href: "/etsgiin-kod",
    eyebrow: "81 хослол · Бүрэн тайлал",
    title: "Эцгийн код",
    description: "Аав болон таны төрсөн огнооны бэлгэдлийн холбоог тайлж, эд баялагтай харилцах хэв маягаа эргэцүүлээрэй.",
    price: "₮20,000",
    icon: GitBranch,
  },
  {
    href: "/natal",
    eyebrow: "Төрсөн өдрөө шалгах",
    title: "Натал чарт",
    description: "Гараг, орд, гэрүүдийн бодит байрлалаар таны төрсөн агшны тэнгэрийн зургийг үнэ төлбөргүй гаргана.",
    price: "Зураг үнэгүй · Бүрэн тайлал ₮20,000",
    icon: Orbit,
  },
] as const;

export default function Home() {
  return <div className="site-shell">
    <Starfield />
    <SiteHeader />
    <main id="main-content" className="landing-main">
      <section className="landing-hero" aria-labelledby="landing-title">
        <p className="eyebrow">ӨӨРИЙГӨӨ УНШИХ ХОЁР ЗАМ</p>
        <h1 id="landing-title">Таны түүх тоо ба<br />тэнгэрт зэрэг бичигдсэн.</h1>
        <p>Тоон бэлгэдэл болон төрсөн агшны одон орны байрлалыг тайван, ойлгомжтой хэлээр уншина.</p>
      </section>
      <section className="product-grid" aria-label="Үйлчилгээ сонгох">
        {products.map(({ href, eyebrow, title, description, price, icon: Icon }, index) => <Link href={href} className="product-card" key={href}>
          <div className="product-card-top"><span>0{index + 1}</span><Icon aria-hidden="true" /></div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          <p>{description}</p>
          <div className="product-card-action"><strong>{price}</strong><span>Нээх <ArrowUpRight aria-hidden="true" /></span></div>
        </Link>)}
      </section>
      <p className="privacy-line">Төрсөн мэдээлэл тань бүтээгдэхүүн сонгох үед гуравдагч тал руу илгээгдэхгүй.</p>
    </main>
    <SiteFooter />
  </div>;
}
