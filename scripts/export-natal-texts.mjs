import { ASPECT_TEXT, HOUSE_THEMES, NATAL_COPY, PLANET_NAMES, PLANET_THEMES, SIGN_CORE, SIGN_NAMES, placementText } from "../lib/natal-texts.ts";

const lines = [
  "# Натал тайлал · Хэл найруулгын хяналт",
  "",
  "> Энэ файлд хэрэглэгчид харагдах натал тайлалын бүх эх өгүүлбэр болон 120 гараг–орд хослолыг оруулав. Зөвхөн Монгол хэл, нэр томьёо, өнгө аясыг хянана уу. Одон орны тооцооны утгыг кодын тест хамгаална.",
  "",
  "## Тогтмол тайлбар",
  "",
  ...Object.entries(NATAL_COPY).flatMap(([key, value]) => [`- **${key}:** ${value}`]),
  "",
  "## Ордны нэр ба үндсэн чанар",
  "",
  ...SIGN_NAMES.map((name, index) => `- **${name}:** ${SIGN_CORE[index]}`),
  "",
  "## Гарагийн нэр ба сэдэв",
  "",
  ...Object.keys(PLANET_NAMES).map((id) => `- **${PLANET_NAMES[id]}:** ${PLANET_THEMES[id]}`),
  "",
  "## 12 гэрийн сэдэв",
  "",
  ...HOUSE_THEMES.map((text, index) => `${index + 1}. **${index + 1}-р гэр:** ${text}`),
  "",
  "## Аспектын тайлбар",
  "",
  ...Object.entries(ASPECT_TEXT).map(([key, text]) => `- **${key}:** ${text}`),
  "",
  "## 120 гараг–орд хослол",
  "",
];

for (const id of Object.keys(PLANET_NAMES)) {
  lines.push(`### ${PLANET_NAMES[id]}`, "");
  SIGN_NAMES.forEach((sign, index) => lines.push(`- **${sign}:** ${placementText(id, index)}`));
  lines.push("");
}

lines.push("## Асцендентын 12 хувилбар", "");
SIGN_NAMES.forEach((sign, index) => lines.push(`- **${sign}:** Асцендент ${sign} ордод байрласнаар бусдад анх харагдах төрх, орчинтой харилцах эхний хөдөлгөөнд ${SIGN_NAMES[index]} ордын ${sign.toLowerCase()} өнгө орно. Энэ бол дүр эсгэлт бус, амьдралд хаалга нээх таны төрөлхийн арга юм.`));
console.log(lines.join("\n"));
