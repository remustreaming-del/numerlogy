// Writes every natal interpretation text, grouped for a Mongolian editor.
// node --experimental-strip-types scripts/export-natal-texts.mjs > outputs/natal-texts-for-review.md
import { ANGULAR_PLANET, ASCENDANT_IN_SIGN, MIDHEAVEN_IN_SIGN } from "../lib/natal/content/angles.ts";
import { ASPECT_TYPE_TAILS, PAIR_ASPECTS, SLOW_PAIR_ASPECTS } from "../lib/natal/content/aspects.ts";
import * as overview from "../lib/natal/content/overview.ts";
import { PLANET_IN_HOUSE } from "../lib/natal/content/planets-in-houses.ts";
import { PLANET_IN_SIGN } from "../lib/natal/content/planets-in-signs.ts";
import { FREE_ASCENDANT, FREE_MOON, FREE_SUN, PAID_CONTENTS } from "../lib/natal/free.ts";
import { CONTENT_VERSION } from "../lib/natal/reading.ts";
import { POINT_FORMS, POINT_ORDER, SIGN_GEN, house } from "../lib/natal/terms.ts";

const out = [];
const line = (text = "") => out.push(text);
const signLabel = (index) => `${SIGN_GEN[index]} орд`;

line("# Натал тайлал · Хэл найруулгын хяналт");
line();
line(`> Агуулгын хувилбар: ${CONTENT_VERSION}. Энэ файлд хэрэглэгчид харагдах натал тайлалын бүх эх бичвэрийг бүлэглэн оруулав.`);
line("> Зөвхөн монгол хэл, нэр томьёо, өнгө аясыг хянана уу. Одон орны тооцоог тест хамгаална.");
line("> Нэр томьёоны сан: `.claude/skills/mongolian-natal-translation/terminology.md`. Чанарын шалгуур: `quality-checklist.md`.");
line("> Засвар оруулахдаа бичлэгийн замыг (жишээ нь `PLANET_IN_SIGN.venus[7]`) дурдаарай.");
line();

line("## 1. Үнэгүй товч тайлал");
line();
for (const [title, list] of [["Нар", FREE_SUN], ["Сар", FREE_MOON], ["Мандах орд", FREE_ASCENDANT]]) {
  line(`### ${title}`); line();
  list.forEach((text, index) => line(`- **${signLabel(index)}:** ${text}`));
  line();
}
line("### Бүрэн тайлалын агуулга (худалдан авахын өмнө)"); line();
PAID_CONTENTS.forEach((text) => line(`- ${text}`));
line();

line("## 2. Гараг ба Сарны хойд зангилаа ордоороо");
line();
for (const id of POINT_ORDER) {
  line(`### ${POINT_FORMS[id].nom} · \`PLANET_IN_SIGN.${id}\``); line();
  PLANET_IN_SIGN[id].forEach((text, index) => line(`${index + 1}. **${signLabel(index)}** — ${text}`));
  line();
}

line("## 3. Гараг ба Сарны хойд зангилаа байшингаараа");
line();
for (const id of POINT_ORDER) {
  line(`### ${POINT_FORMS[id].nom} · \`PLANET_IN_HOUSE.${id}\``); line();
  PLANET_IN_HOUSE[id].forEach((text, index) => line(`${index + 1}. **${house(index + 1).short}** — ${text}`));
  line();
}

line("## 4. Мандах орд ба Тэнгэрийн оргил");
line();
line("### Мандах орд · `ASCENDANT_IN_SIGN`"); line();
ASCENDANT_IN_SIGN.forEach((text, index) => line(`${index + 1}. **${signLabel(index)}** — ${text}`));
line();
line("### Тэнгэрийн оргил · `MIDHEAVEN_IN_SIGN`"); line();
MIDHEAVEN_IN_SIGN.forEach((text, index) => line(`${index + 1}. **${signLabel(index)}** — ${text}`));
line();
line("### Тэнхлэгт ойр гараг · `ANGULAR_PLANET`"); line();
for (const [id, texts] of Object.entries(ANGULAR_PLANET)) { line(`- **${POINT_FORMS[id].nom} · Мандах орд:** ${texts.ascendant}`); line(`- **${POINT_FORMS[id].nom} · Тэнгэрийн оргил:** ${texts.midheaven}`); }
line();

line("## 5. Аспектууд");
line();
const family = { conjunction: "Нэгдэл", harmonious: "Трин / Секстиль", challenging: "Квадрат / Эсрэгцэл" };
for (const [key, pair] of Object.entries(PAIR_ASPECTS)) {
  const [a, b] = key.split("-");
  line(`### ${POINT_FORMS[a].nom} — ${POINT_FORMS[b].nom} · «${pair.theme}»`); line();
  for (const name of ["conjunction", "harmonious", "challenging"]) if (pair[name]) line(`- **${family[name]}:** ${pair[name]}`);
  line();
}
line("### Удаан хөдөлдөг хосууд · `SLOW_PAIR_ASPECTS`"); line();
for (const [key, pair] of Object.entries(SLOW_PAIR_ASPECTS)) { const [a, b] = key.split("-"); line(`- **${POINT_FORMS[a].nom} — ${POINT_FORMS[b].nom} («${pair.theme}»):** ${pair.text}`); }
line();
line("### Аспектын төрлийн төгсгөлийн өгүүлбэр · `ASPECT_TYPE_TAILS`"); line();
for (const [type, tails] of Object.entries(ASPECT_TYPE_TAILS)) tails.forEach((text) => line(`- **${type}:** ${text}`));
line();

line("## 6. Ерөнхий хэв шинж, нэгтгэл, тогтмол бичвэр");
line();
const dump = (name, value, depth = 0) => {
  if (typeof value === "string") { line(`${"  ".repeat(depth)}- **${name}:** ${value}`); return; }
  if (Array.isArray(value)) { line(`${"  ".repeat(depth)}- **${name}:**`); value.forEach((item, index) => typeof item === "string" ? line(`${"  ".repeat(depth + 1)}${index + 1}. ${item}`) : dump(String(index + 1), item, depth + 1)); return; }
  line(`${"  ".repeat(depth)}- **${name}:**`);
  for (const [key, item] of Object.entries(value)) dump(key, item, depth + 1);
};
for (const [name, value] of Object.entries(overview)) dump(`\`${name}\``, value);
line();
line("## 7. Кодоор угсардаг өгүүлбэрийн загвар");
line();
line("Дараах өгүүлбэрүүд тооцооны үр дүнгээс угсрагддаг (`lib/natal/reading.ts`). Нэр, тийн ялгалыг `lib/natal/terms.ts`-ээс авдаг тул дүрмийн алдаа гарахгүй байх ёстой; өгүүлбэрийн хэв загвар нь өөрөө зөв эсэхийг шалгана уу. Бодит жишээг `node --experimental-strip-types scripts/sample-natal-reading.mjs 1990-07-01 08:30 ulaanbaatar`-аар гаргаж уншина.");
line();
for (const text of [
  "«Ангараг өөрийн ордод буюу Хонины ордод байгаа тул …»",
  "«Нар Мэлхийн ордод, арван хоёрдугаар байшинд байгаа тул «дотоод ертөнц, ганцаардал, сүнслэг эрэл» гэсэн хүрээ таны амьдралын гол тайз болох хандлагатай.»",
  "«Нэгдүгээр байшин — өөрийн төрх, бие даасан замнал. Оройн цэг нь Арслангийн ордод байгаа тул энэ хүрээнд та бахархалтай, өгөөмөр ханддаг.»",
  "«Нар ба Плутоны трин: «хүсэл зориг ба гүн өөрчлөлт» хоорондоо эвтэй урсдаг.»",
  "«Мандах орд ордын заагт ойрхон байна: төрсөн цаг 6 минутаар эрт байсан бол Мандах орд Мэлхийн орд болох байсан.»",
]) line(`- ${text}`);
console.log(out.join("\n"));
