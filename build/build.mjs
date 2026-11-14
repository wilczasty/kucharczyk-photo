// =========================================================
// Budowanie strony: źródła (index.html + content/ + media/) → _site/
//
//   node build/build.mjs        (lokalnie; podgląd: otwórz _site/index.html)
//
// Uruchamia się też samo w GitHub Actions po każdej zmianie (.github/workflows/strona.yml).
// - teksty z content/*.json wstawia do index.html (prosty szablon {{…}}),
// - kategorie portfolio = podfoldery media/portfolio/ (liczba na początku nazwy = kolejność, nie wyświetla się),
// - zdjęcia zmniejsza (maks. 2000 px), usuwa z nich dane EXIF/GPS i robi miniatury do galerii
//   (jeśli moduł "sharp" nie jest zainstalowany – kopiuje bez zmian).
// =========================================================
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "_site");
const STATIC = ["css", "js", "images", "polityka-prywatnosci.html"];
const IMG = /\.(jpe?g|png|webp)$/i;
const COPY_ONLY = /\.(svg|gif|avif)$/i;
const MAX = 2000, THUMB = 900;

let sharp = null;
try { sharp = (await import("sharp")).default; } catch { console.warn("⚠ brak modułu sharp – zdjęcia kopiowane bez zmniejszania"); }

const readJson = rel => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const esc = t => String(t ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const urlPath = p => p.split("/").map(encodeURIComponent).join("/");
// ścieżka z panelu (np. "/media/x.jpg" albo "media/x%20y.jpg") → "media/x y.jpg"
const normPath = p => { if (!p) return ""; p = String(p).trim().replace(/^\.?\//, ""); try { p = decodeURIComponent(p); } catch {} return p.normalize("NFC"); };
const mediaUrl = p => (p ? urlPath(normPath(p)) : "");
// tekst wielolinijkowy: pusta linia = nowy akapit, **pogrubienie**
const inline = t => esc(t).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br>");
const paragraphs = t => String(t ?? "").trim().split(/\n\s*\n/).filter(Boolean).map(p => `<p>${inline(p.trim())}</p>`).join("\n      ");
const slug = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ł/g, "l").replace(/Ł/g, "L")
  .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "kat";
const plCompare = (a, b) => a.localeCompare(b, "pl", { numeric: true, sensitivity: "base" });
const walk = dir => fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true })
  .filter(d => !d.name.startsWith(".") && !d.name.startsWith("_"))
  .flatMap(d => d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]) : [];
const rel = abs => path.relative(ROOT, abs).split(path.sep).join("/").normalize("NFC");

/* ---------- mini-szablon w stylu Mustache: {{x}}, {{{x}}} (bez escapowania), {{#lista}}…{{/lista}}, {{#x?}}…{{/x?}}, {{^x}}…{{/x}} ---------- */
function template(src, view) {
  const re = /\{\{(\{)?\s*([#^\/]?)\s*([\w.]+\??)\s*\}?\}\}/g;
  const root = { children: [] }; const stack = [root]; let last = 0, m;
  while ((m = re.exec(src))) {
    stack.at(-1).children.push(src.slice(last, m.index)); last = re.lastIndex;
    const [, raw, kind, name] = m;
    if (kind === "#" || kind === "^") { const node = { kind, name, children: [] }; stack.at(-1).children.push(node); stack.push(node); }
    else if (kind === "/") { const n = stack.pop(); if (n.name !== name) throw new Error(`Szablon: {{/${name}}} nie pasuje do {{${n.kind}${n.name}}}`); }
    else stack.at(-1).children.push({ kind: raw ? "raw" : "var", name });
  }
  if (stack.length > 1) throw new Error(`Szablon: niezamknięte {{#${stack.at(-1).name}}}`);
  root.children.push(src.slice(last));
  const lookup = (ctx, name) => {
    if (name === ".") return ctx[0];
    for (const c of ctx) {
      if (c && typeof c === "object" && name.split(".")[0] in c) return name.split(".").reduce((o, k) => o?.[k], c);
    }
    return undefined;
  };
  const run = (nodes, ctx) => nodes.map(n => {
    if (typeof n === "string") return n;
    const cond = n.name.endsWith("?");           // {{#lista?}} = tylko sprawdzenie, czy niepuste (bez powtarzania)
    const v = lookup(ctx, cond ? n.name.slice(0, -1) : n.name);
    const empty = !v || (Array.isArray(v) && !v.length);
    if (n.kind === "var") return esc(v);
    if (n.kind === "raw") return v ?? "";
    if (n.kind === "^") return empty ? run(n.children, ctx) : "";
    if (empty) return "";
    if (cond) return run(n.children, ctx);
    if (Array.isArray(v)) return v.map(item => run(n.children, [item, ...ctx])).join("");
    return run(n.children, typeof v === "object" ? [v, ...ctx] : ctx);
  }).join("");
  return run(root.children, [view]);
}

/* ---------- daty dodania plików (nowsze zdjęcia na początku galerii) ---------- */
function addedDates(dir) {
  const map = new Map();
  try {
    const out = execFileSync("git", ["-c", "core.quotepath=off", "log", "--diff-filter=A", "--name-only", "--format=@%ct", "--", dir],
      { cwd: ROOT, encoding: "utf8", maxBuffer: 64 << 20 });
    let t = 0;
    for (const line of out.split("\n")) {
      if (line.startsWith("@")) t = +line.slice(1);
      else if (line.trim()) { const p = line.trim().normalize("NFC"); if (!map.has(p)) map.set(p, t); }
    }
  } catch { console.warn("⚠ brak historii gita – kolejność zdjęć wg podpisów i nazw"); }
  return map;
}

/* ---------- zdjęcia ---------- */
async function processImage(srcAbs, destAbs, width) {
  fs.mkdirSync(path.dirname(destAbs), { recursive: true });
  if (!sharp || COPY_ONLY.test(srcAbs) || !IMG.test(srcAbs)) { fs.copyFileSync(srcAbs, destAbs); return; }
  let img = sharp(srcAbs, { failOn: "none" }).rotate()   // obrót wg EXIF, potem metadane są usuwane
    .resize({ width, height: width, fit: "inside", withoutEnlargement: true });
  if (/\.png$/i.test(srcAbs)) img = img.png({ compressionLevel: 9 });
  else if (/\.webp$/i.test(srcAbs)) img = img.webp({ quality: 82 });
  else img = img.jpeg({ quality: 82, mozjpeg: true });
  await img.toFile(destAbs);
}
async function pool(tasks, n = 4) {
  const it = tasks[Symbol.iterator]();
  await Promise.all(Array.from({ length: n }, async () => { for (const t of it) await t(); }));
}

/* =========================================================
   1. przygotowanie katalogu
   ========================================================= */
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
for (const s of STATIC) fs.cpSync(path.join(ROOT, s), path.join(OUT, s), { recursive: true });
fs.writeFileSync(path.join(OUT, ".nojekyll"), "");

/* =========================================================
   2. treści
   ========================================================= */
const strona = readJson("content/strona.json");
const oMnie = readJson("content/o-mnie.json");
const oferta = readJson("content/oferta.json");
const galeria = readJson("content/galeria.json");
const wydarzenia = walk(path.join(ROOT, "content/wydarzenia")).filter(f => f.endsWith(".json"))
  .map(f => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch (e) { console.warn(`⚠ pomijam ${rel(f)}: ${e.message}`); return null; } })
  .filter(e => e && e.data && e.tytul)
  .map(e => ({ ...e, data: String(e.data).slice(0, 10), zdjecie: mediaUrl(e.zdjecie) }));

/* =========================================================
   3. portfolio z folderów
   ========================================================= */
const PORT = path.join(ROOT, "media/portfolio");
const dates = addedDates("media/portfolio");
const opisy = new Map((galeria.zdjecia || []).map((z, i) => [normPath(z.zdjecie), { ...z, i }]));
const now = Math.floor(Date.now() / 1000);
const catDirs = fs.existsSync(PORT) ? fs.readdirSync(PORT, { withFileTypes: true })
  .filter(d => d.isDirectory() && !d.name.startsWith(".") && !d.name.startsWith("_")).map(d => d.name).sort(plCompare) : [];
const categories = {};
const photos = [];
const usedSlugs = new Set();
for (const dir of catDirs) {
  const name = dir.normalize("NFC").replace(/^\d+[\s._-]*/, "").replace(/[-_]+/g, " ").trim() || dir;
  let key = slug(name); while (usedSlugs.has(key)) key += "-2"; usedSlugs.add(key);
  const files = walk(path.join(PORT, dir)).filter(f => IMG.test(f) || COPY_ONLY.test(f));
  if (!files.length) continue;
  categories[key] = name.charAt(0).toLocaleUpperCase("pl") + name.slice(1);
  for (const f of files) photos.push({ file: f, rel: rel(f), category: key });
}
for (const f of walk(PORT).filter(f => path.dirname(f) === PORT && (IMG.test(f) || COPY_ONLY.test(f)))) photos.push({ file: f, rel: rel(f), category: "" });
for (const p of photos) { const o = opisy.get(p.rel); p.caption = o?.podpis || ""; p.top = !!o?.na_gore; p.order = o ? o.i : Infinity; p.date = dates.get(p.rel) ?? now; }
photos.sort((a, b) => (b.top - a.top) || (a.top && b.top ? a.order - b.order : 0) || (b.date - a.date) || (a.order - b.order) || plCompare(a.rel, b.rel));

/* =========================================================
   4. obrazy: media/ → _site/media/ (zmniejszone), miniatury portfolio → _site/media/_miniatury/
   ========================================================= */
const thumbRel = r => "media/_miniatury/" + r.slice("media/".length);
const tasks = walk(path.join(ROOT, "media")).filter(f => IMG.test(f) || COPY_ONLY.test(f)).map(f => () => processImage(f, path.join(OUT, rel(f)), MAX));
for (const p of photos) if (IMG.test(p.file)) tasks.push(() => processImage(p.file, path.join(OUT, thumbRel(p.rel)), THUMB));
await pool(tasks);

/* =========================================================
   5. dane dla JS (portfolio, wydarzenia, kontakt, pakiety rezerwacji)
   ========================================================= */
const zl = n => `${n} zł`;
const dane = {
  CATEGORIES: categories,
  PORTFOLIO: photos.map(p => ({
    src: urlPath(p.rel), thumb: IMG.test(p.file) ? urlPath(thumbRel(p.rel)) : undefined, category: p.category, caption: p.caption,
  })),
  WYDARZENIA: wydarzenia,
};
const cfgPatch = {
  contact: { email: strona.kontakt?.email || "", phone: strona.kontakt?.telefon || "", area: strona.kontakt?.obszar || "" },
  social: strona.social || {},
  pakiety: (oferta.pakiety || []).map(p => ({ id: p.id, nazwa: `Sesja ${p.id}`, minut: p.minut, cena: zl(p.cena) })),
};
fs.writeFileSync(path.join(OUT, "js/dane.js"),
  "/* Plik generowany przez build/build.mjs – nie edytuj, zmiany rób w panelu (content/, media/). */\n" +
  Object.entries(dane).map(([k, v]) => `window.${k} = ${JSON.stringify(v)};`).join("\n") +
  `\nObject.assign(window.SITE_CONFIG = window.SITE_CONFIG || {}, ${JSON.stringify(cfgPatch)});\n`);

/* =========================================================
   6. index.html z szablonu
   ========================================================= */
const view = {
  strona: { ...strona, hero: { ...strona.hero, zdjecie: mediaUrl(strona.hero?.zdjecie), opis_html: inline(strona.hero?.opis) } },
  o_mnie: { ...oMnie, zdjecie: mediaUrl(oMnie.zdjecie), tekst_html: paragraphs(oMnie.tekst) },
  oferta: {
    ...oferta,
    pakiety: (oferta.pakiety || []).map(p => ({ ...p, cena_txt: zl(p.cena), dodatkowe_txt: p.dodatkowe_zdjecie ? zl(p.dodatkowe_zdjecie) : "" })),
    wycena_html: inline(oferta.wycena_indywidualna?.tekst),
    faq: (oferta.faq || []).map(f => ({ ...f, odpowiedz_html: inline(f.odpowiedz) })),
  },
  galeria,
};
fs.writeFileSync(path.join(OUT, "index.html"), template(fs.readFileSync(path.join(ROOT, "index.html"), "utf8"), view));

console.log(`✓ _site gotowe: ${photos.length} zdjęć w ${Object.keys(categories).length} kategoriach, ${wydarzenia.length} wydarzeń${sharp ? "" : " (bez zmniejszania zdjęć)"}`);
