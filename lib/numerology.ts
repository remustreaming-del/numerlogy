import { numbers, sectionTitles, slots } from "./content.ts";
import { lifePath, pad, pairHeading, reduce } from "./codes.ts";
export { lifePath, reduce };

export type Details = { fatherName: string; fatherBirthday: string; name: string; birthday: string; email: string };
export type ReportInput = Omit<Details, "email">;
export type Person = { name: string; birthday: string; number: number; title: string };
export type Section = { title: string; text?: string; items?: { title: string; text: string }[] };
export type Part = { kicker: string; heading: string; lead?: string; sections: Section[]; note?: string };
export type Report = { father: Person; child: Person; pairCode: string; pairTitle: string; pairSubtitle: string; quote: string; parts: Part[]; method: string; preview?: boolean };

// Names are optional (the form only asks for birthdays and email); when given they must look like a name.
function validName(value: unknown, message: string) {
  if (value === undefined || value === null || (typeof value === "string" && !value.trim())) return "";
  if (typeof value !== "string" || !/^[\p{L}\p{M} .’'\-]{2,80}$/u.test(value.trim())) throw new Error(message);
  return value.trim().replace(/\s+/g, " ");
}

function validDate(value: unknown, message: string) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(message);
  const date = new Date(`${value}T00:00:00Z`);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ulaanbaatar" });
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value || value < "1900-01-01" || value > today) throw new Error(message);
  return value;
}

export function validateDetails(input: unknown): Details {
  if (!input || typeof input !== "object") throw new Error("Эцэг болон өөрийн мэдээллээ оруулна уу.");
  const data = input as Record<string, unknown>;
  const fatherName = validName(data.fatherName, "Эцгийн нэрийг 2–80 үсгээр оруулна уу.");
  const fatherBirthday = validDate(data.fatherBirthday, "Эцгийн төрсөн огноог зөв оруулна уу.");
  const name = validName(data.name, "Өөрийн нэрийг 2–80 үсгээр оруулна уу.");
  const birthday = validDate(data.birthday, "Өөрийн төрсөн огноог зөв оруулна уу.");
  if (fatherBirthday >= birthday) throw new Error("Аавын төрсөн огноо таны төрсөн огнооноос өмнө байх ёстой.");
  const email = typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
  if (email.length > 254 || !/^[^\s@<>()"',;:]+@[^\s@<>()"',;:]+\.[a-z]{2,}$/i.test(email)) throw new Error("Имэйл хаягаа зөв оруулна уу.");
  return { fatherName, fatherBirthday, name, birthday, email };
}

const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

function personPart(kicker: string, n: number): Part {
  const t = numbers[n];
  return {
    kicker,
    heading: `${pad(n)} ${t.title} · ${t.keywords}`,
    lead: `Үндсэн сургаал: ${t.motto}`,
    sections: t.sections.map((text, i) => ({ title: sectionTitles[i], text })),
    note: `Эрхэм үг: ${t.saying}`,
  };
}

export function createReport(details: ReportInput): Report {
  const f = lifePath(details.fatherBirthday), c = lifePath(details.birthday);
  const F = slots[f], C = slots[c], same = f === c;
  const { code: pairCode, title: pairTitle, custom } = pairHeading(f, c);
  const pairSubtitle = custom?.subtitle ?? "Эцгийн зам, таны зам — гэрэлт чанар ба санхүүгийн сүүдэр";
  const quote = custom?.quote ?? "Эцгийн зам таны замтай уулзахад хишгийг хаах зүйл нь тоо биш, анзаараагүй алдаа байдаг.";
  const light = same ? F.light : `${F.light}, ${C.light}`;
  const advice = same ? F.advice : `${F.advice} ${C.advice}`;

  const pair: Part = {
    kicker: "III хэсэг · Хоёр тооны уулзвар",
    heading: `${pairCode} ${pairTitle}`,
    lead: `${pairSubtitle}. “${quote}”`,
    sections: [
      { title: "Эцгийн мөр таны замд", text: `Эцгийн тооны бэлгэдэлд ${F.essence} гэсэн чанар тодорно. Эцгийн амьдралын жишигт «${F.standard}» гэсэн ойлголт ойр байж мэднэ. Харин таны тоонд ${C.essence} гэсэн ${same ? "ижил" : "өөр"} чиг тодорно. Эдгээр хоёр хүчний уулзварт эцгийн сайныг өвлөн, сул талыг нь давтахгүй байх сонголт гарч ирнэ.` },
      { title: "Энэ холбооны гэрэлт тал", text: `Эцгийн дүрд тодрох ${F.strength} болон таны ${C.strength} хоёр зэрэгцэн орших үед ${light} гэсэн гэрэлт зам нээгдэнэ. Энэ холбооны хишиг нь нэгнийхээ дүрийг хуулбарлах бус, хоёр өөр ухааныг нэг дор хэрэглэхэд оршино.` },
      { title: "Анзаарах ёстой нуугдмал алдаа", text: `Эцгийн «${F.standard}» гэсэн жин таны «${C.value}» гэсэн хүсэлтэй нийлэхэд мөнгөний шийдвэрт далд зөрчил үүснэ. ${cap(F.shadow)} хэмээх сүүдэр, ${C.challenge} гэсэн сорилт зэрэг хөдлөхөд алдагдлаа анзаарах мөч хойшилж мэднэ.` },
      { title: "Эд баялгийн гурван зангилаа", items: [
        { title: F.knotFather, text: `Эцгийн «${F.standard}» гэх хандлагыг өөрийн нөхцөлийг шалгалгүй дагавал ${C.challenge} эрсдэлтэй давхцаж мэднэ. Өнгөрсний зөв зам өнөөдөр заавал зөв биш.` },
        { title: C.knotChild, text: `${cap(C.value)} чанар хэтрэхдээ ${C.riskTrait} сүүдэрт ойртдог. Эцгийн ${F.riskTrait} хандлага нэмэгдвэл алдаа бүрхэг болно.` },
        { title: "ХОЁР ҮЕИЙН САНХҮҮГИЙН ЗАНГИЛАА", text: `${same ? `Хоёр талдаа ${F.dominant} давамгайлбал ${F.sameRisk}.` : `Эцгийн ${F.dominant}, таны ${C.dominant} нэг шийдвэрт мөргөлдвөл эцсийн үгийг хэн хэлэх нь бүрхэг болж, мөнгөний зөрчил далд хуримтлагдаж мэднэ.`} Ийм зөрчилд мөнгөний хэмжээ, хугацаа, хариуцагч тодорхой байх нь чухал.` },
      ] },
      { title: "Тэнцвэрийн түлхүүр", text: `Эцгийн ${F.strength} чанарыг хадгалж, өөрийн ${C.strength} талд зай гарга. ${advice} Энэ хоёрын тэнцвэр нь ${light} гэсэн сайн талд оршино. Хишгийг тогтоох арга нь сүртэй амлалт бус, хэмжээгээ мэдсэн шийдвэрт оршино.` },
      { title: "Таны баримтлах гурван жаяг", items: [
        { title: C.rule[0], text: C.rule[1] },
        { title: F.inheritRule[0], text: F.inheritRule[1] },
        { title: "ХОЁР ТАЛЫН ЖИНГ ТЭНЦҮҮЛ", text: "Хоёр талын сайн чанарыг нийцүүлэх нэг санхүүгийн шийдвэр сонго. Тэр шийдвэрт мөнгөний хэмжээ, эрсдэл, хугацаа, хариуцагчийг бичээд үйлд." },
      ] },
      { title: "Эцсийн тайлал", text: `Эцгийн «${F.standard}» гэх жишгийг таны «${C.essence}» гэх замд сохроор бүү хэрэглэ. ${custom ? `${custom.name} хэмээх энэ холбоо` : "Энэ холбоо"} таны давуу хоёр хүчийг ч, тэдний сүүдрийг ч харуулна. Эцгийн сайныг хүндэлж, өөрийн жинг хадгал. Эд баялгийг хамгаалах нь ганц удаагийн аз биш, өдөр тутмын үнэн тооцоо юм.` },
    ],
  };

  return {
    father: { name: details.fatherName, birthday: details.fatherBirthday, number: f, title: numbers[f].title },
    child: { name: details.name, birthday: details.birthday, number: c, title: numbers[c].title },
    pairCode, pairTitle, pairSubtitle, quote,
    parts: [personPart("I хэсэг · Эцгийн тоо", f), personPart("II хэсэг · Таны тоо", c), pair],
    method: "Аргачлал: төрсөн огнооны бүх цифрийг нэмж, нэг оронтой (1–9) болтол бууруулна. Жишээ: 1995-06-13 → 1+9+9+5+0+6+1+3 = 34 → 3+4 = 7. Есөн тоо хүний зан төлөв, эд баялагт хандах хэв маяг, санхүүгийн эмзэг талыг бэлгэдэн өгүүлнэ. Энэхүү тайлал мөнгөний бодит үр дүнг урьдчилан тогтоохгүй.",
  };
}
