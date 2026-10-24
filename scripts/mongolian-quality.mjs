import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import ts from "typescript";
import { loadModule } from "hunspell-asm";
import mn from "dictionary-mn";

const root = fileURLToPath(new URL("../", import.meta.url));
export const glossary = JSON.parse(await readFile(new URL("../knowledge/terminology/astrology-glossary.json", import.meta.url), "utf8"));
export const spellingExceptions = JSON.parse(await readFile(new URL("../knowledge/terminology/mongolian-spelling-exceptions.json", import.meta.url), "utf8"));
const acceptedWords = new Set(spellingExceptions.flatMap(({ words }) => words));
for (const term of glossary) {
  for (const text of [term.mongolian, ...term.aliases, ...Object.values(term.forms ?? {})]) {
    for (const word of text.match(/\p{Script=Cyrillic}+/gu) ?? []) acceptedWords.add(word.toLowerCase());
  }
}

// Unicode boundaries are essential: JavaScript's \b only recognizes ASCII word letters.
export function terminologyIssues(text) {
  return glossary.flatMap((term) => (term.banned_stems ?? []).flatMap((stem) => {
    const escaped = stem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return [...text.matchAll(new RegExp(`(?<![\\p{L}\\p{M}])${escaped}[\\p{Script=Cyrillic}]*`, "giu"))]
      .map((match) => ({ word: match[0], replacement: term.mongolian }));
  }));
}

export function mixedScriptWords(text) {
  return (text.match(/[\p{L}\p{M}]+/gu) ?? []).filter((word) => /\p{Script=Latin}/u.test(word) && /\p{Script=Cyrillic}/u.test(word));
}

export function extractText(source, file) {
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const records = [];
  function visit(node) {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node) || ts.isJsxText(node)) {
      if (/\p{Script=Cyrillic}/u.test(node.text)) {
        const { line } = tree.getLineAndCharacterOfPosition(node.getStart(tree));
        records.push({ file, line: line + 1, text: node.text });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
  return records;
}

export async function sourceRecords() {
  const records = [];
  async function walk(dir) {
    for (const entry of await readdir(path.join(root, dir), { withFileTypes: true })) {
      const file = `${dir}/${entry.name}`;
      if (entry.isDirectory()) await walk(file);
      else if (/\.tsx?$/.test(file)) records.push(...extractText(await readFile(path.join(root, file), "utf8"), file));
    }
  }
  for (const dir of ["lib", "components", "app"]) await walk(dir);
  return records;
}

export const isContentFile = (file) => /^lib\/(natal|couple)\/(content\/|free\.ts$)/.test(file) || file === "lib/content.ts";
let dictionary;
async function loadDictionary() {
  const factory = await loadModule();
  const aff = factory.mountBuffer(mn.aff, "mn.aff");
  const dic = factory.mountBuffer(mn.dic, "mn.dic");
  const spell = factory.create(aff, dic);
  process.once("exit", () => { spell.dispose(); factory.unmount(aff); factory.unmount(dic); });
  return spell;
}
export async function unknownWords(text) {
  dictionary ??= loadDictionary();
  const spell = await dictionary;
  // A suffix attached to a measurement is not a standalone misspelled word.
  // Limit this exemption to known unit syntax and exact ablative endings.
  const prose = text.replace(/\d+(?:\.\d+)?[°%]-[аэоө]{2}с(?!\p{L})/gu, "");
  return (prose.match(/\p{Script=Cyrillic}+/gu) ?? []).map((word) => word.toLowerCase()).filter((word) => !acceptedWords.has(word) && !spell.spell(word));
}

export async function spellingIssues() {
  const issues = [];
  for (const record of (await sourceRecords()).filter(({ file }) => isContentFile(file))) {
    for (const word of await unknownWords(record.text)) issues.push({ ...record, kind: "spelling", word });
  }
  return issues;
}

export async function qualityIssues() {
  const records = await sourceRecords();
  const issues = [];
  for (const record of records) {
    for (const issue of terminologyIssues(record.text)) issues.push({ ...record, kind: "terminology", ...issue });
    for (const word of mixedScriptWords(record.text)) issues.push({ ...record, kind: "mixed-script", word });
  }
  return issues;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes("--spelling")) {
    const words = new Map();
    for (const record of (await sourceRecords()).filter(({ file }) => isContentFile(file))) {
      for (const word of await unknownWords(record.text)) {
        const found = words.get(word) ?? { count: 0, at: `${record.file}:${record.line}` };
        found.count++;
        words.set(word, found);
      }
    }
    console.log(JSON.stringify(Object.fromEntries([...words].sort()), null, 2));
    process.exitCode = words.size ? 1 : 0;
  } else {
    const issues = await qualityIssues();
    for (const issue of issues) console.error(`${issue.file}:${issue.line} ${issue.kind}: ${issue.word}${issue.replacement ? ` → ${issue.replacement}` : ""}`);
    console.log(`${issues.length} Mongolian terminology / mixed-script issues.`);
    process.exitCode = issues.length ? 1 : 0;
  }
}
