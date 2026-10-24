import { ArrowUpRight, GitBranch, HeartHandshake, Orbit } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Starfield } from "@/components/starfield";

const products = [
  {
    href: "/natal",
    eyebrow: "Төрсөн өдрөө шалгах",
    title: "Натал зураг",
    description: "Гараг, орд, байшингуудын бодит байрлалаар таны төрсөн агшны тэнгэрийн зургийг гаргана.",
    price: "Зураг үнэгүй · Бүрэн тайлал ₮20,000",
    icon: Orbit,
  },
  {
    href: "/khos",
    eyebrow: "Хоёр хүний зураг",
    title: "Хосын зурхай",
    description: "Хоёр хүний төрсөн агшны тэнгэрийг давхарлаж, сэтгэл, татал, ойлголцол, маргааны хэв маягаа тайлуулаарай.",
    price: "Оноо үнэгүй · Бүрэн тайлал ₮30,000",
    icon: HeartHandshake,
  },
  {
    href: "/etsgiin-kod",
    eyebrow: "81 хослол · Бүрэн тайлал",
    title: "Эцгийн код",
    description: "Аав болон таны төрсөн огнооны бэлгэдлийн холбоог тайлж, эд баялагтай харилцах хэв маягаа эргэцүүлээрэй.",
    price: "₮10,000",
    icon: GitBranch,
  },
] as const;

export default function Home() {
  return <div className="site-shell">
    <Starfield />
    <SiteHeader />
    <main id="main-content" className="landing-main">
      <section className="landing-hero" aria-labelledby="landing-title">
        <p className="eyebrow">ӨӨРИЙГӨӨ ТАНИН МЭДЭХ</p>
        <h1 id="landing-title">Natal Chart-аа <br /> мэдэж аваарай</h1>
      </section>
      <section className="product-grid" aria-label="Үйлчилгээ сонгох">
        {products.map(({ href, eyebrow, title, description, price, icon: Icon }, index) => <a href={href} className="product-card" key={href}>
          <div className="product-card-top"><span>0{index + 1}</span><Icon aria-hidden="true" /></div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          <p>{description}</p>
          <div className="product-card-action"><strong>{price}</strong><span>Нээх <ArrowUpRight aria-hidden="true" /></span></div>
        </a>)}
      </section>
      <p className="privacy-line">Төрсөн мэдээлэл тань бүтээгдэхүүн сонгох үед гуравдагч тал руу илгээгдэхгүй.</p>
    </main>
    <SiteFooter />
  </div>;
}
