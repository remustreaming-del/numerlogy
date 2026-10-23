// Number math and titles shared by the browser (pre-payment code preview) and the server.
// Keep the paid reading texts out of this module: everything here ships to the client.

export const numberTitles: Record<number, string> = { 1: "Эхлүүлэгч", 2: "Эвлүүлэгч", 3: "Бүтээгч", 4: "Тулгуур", 5: "Эрэлхийлэгч", 6: "Халамжлагч", 7: "Судлаач", 8: "Удирдагч", 9: "Нэгтгэгч" };

// Hand-written pair titles from source PDFs. Pairs not listed here use a generated title.
export const pairTitles: Record<string, { title: string; subtitle: string; quote: string; name: string }> = {
  "8-8": {
    title: "ХОЁР НАРНЫ ХЭТ ХАЛУУН ГЭРЭЛ",
    subtitle: "Эцгийн нар, таны нар — гэрэлт чанар ба санхүүгийн сүүдэр",
    quote: "Эцгийн нар таны нартай уулзахад хишгийг хаах зүйл нь тоо биш, анзаараагүй алдаа байдаг.",
    name: "Хоёр нарны хэт халуун гэрэл",
  },
};

export const pad = (n: number) => String(n).padStart(2, "0");

export function reduce(value: number, masters = true): number {
  while (value > 9 && !(masters && [11, 22, 33].includes(value))) {
    value = String(value).split("").reduce((sum, digit) => sum + Number(digit), 0);
  }
  return value;
}

// Source texts cover numbers 1–9 only, so master numbers are reduced too.
export function lifePath(birthday: string) {
  return reduce([...birthday.replace(/\D/g, "")].reduce((a, b) => a + Number(b), 0), false);
}

export function pairHeading(father: number, child: number) {
  const custom = pairTitles[`${father}-${child}`];
  const title = custom?.title ?? (father === child
    ? `ХОЁР ${numberTitles[father].toUpperCase()}`
    : `${numberTitles[father].toUpperCase()} БА ${numberTitles[child].toUpperCase()}`);
  return { code: `${pad(father)}–${pad(child)}`, title, custom };
}
