// =========================================================
// Budowanie strony: źródła (index.html + content/ + media/) → _site/
//
//   node build/build.mjs        (lokalnie; podgląd: otwórz _site/index.html)
//
// Uruchamia się też samo w GitHub Actions po każdej zmianie (.github/workflows/strona.yml).
// - teksty z content/*.json wstawia do index.html (prosty szablon {{…}}),
// - kategorie portfolio = podfoldery media/portfolio/ (liczba na początku nazwy = kolejność, nie wyświetla się),
// - zdjęcia zmniejsza (maks. 2000 px), usuwa z nich dane EXIF/GPS i robi miniatury do galerii
//   (jeśli moduł "sharp" nie jest zainstalowany – kopiuje bez zmian),
// - PNG bez przezroczystości zamienia na JPEG (wielokrotnie mniejsze pliki),
// - uszkodzone albo nieobsługiwane pliki pomija z ostrzeżeniem – nie zatrzymują publikacji.
// =========================================================
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "_site");
const STATIC = ["css", "js", "polityka-prywatnosci.html", "favicon.svg"];
const IMG = /\.(jpe?g|png|webp)$/i;
const COPY_ONLY = /\.(svg|gif|avif)$/i;
const UNSUPPORTED = /\.(heic|heif|tiff?|bmp|dng|raw|cr2|cr3|nef|arw|orf|rw2|psd)$/i;
const MAX = 2000, THUMB = 900, HERO_SMALL = 1000;

/* ---------- ostrzeżenia: konsola + adnotacje i podsumowanie w GitHub Actions ---------- */
const warnings = [];
const warn = msg => {
  warnings.push(msg);
  console.warn(`⚠ ${msg}`);
  if (process.env.GITHUB_ACTIONS) console.log(`::warning::${msg.replace(/\r?\n/g, " ")}`);
};

let sharp = null;
try { sharp = (await import("sharp")).default; } catch { warn("brak modułu sharp – zdjęcia kopiowane bez zmniejszania"); }

const readJson = rel => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const esc = t => String(t ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const urlPath = p => p.split("/").map(encodeURIComponent).join("/");
// ścieżka z panelu (np. "/media/x.jpg" albo "media/x%20y.jpg") → "media/x y.jpg"
const normPath = p => { if (!p) return ""; p = String(p).trim().replace(/^\.?\//, ""); try { p = decodeURIComponent(p); } catch {} return p.normalize("NFC"); };
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
const httpsOnly = u => (/^https:\/\/[^\s"'<>]+$/i.test(String(u ?? "").trim()) ? String(u).trim() : "");

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

/* ---------- daty dodania plików (nowsze zdjęcia na początku galerii) ----------
   Przeniesienie zdjęcia do innego folderu (zmiana nazwy w gicie) zachowuje datę pierwotnego dodania,
   więc przeniesione zdjęcie nie wskakuje na początek galerii. */
function addedDates(dir) {
  const added = new Map(), movedFrom = new Map();
  try {
    const out = execFileSync("git", ["-c", "core.quotepath=off", "log", "-M", "--diff-filter=AR", "--name-status", "--format=@%ct", "--", dir],
      { cwd: ROOT, encoding: "utf8", maxBuffer: 64 << 20 });
    let t = 0;
    for (const line of out.split("\n")) {
      if (line.startsWith("@")) { t = +line.slice(1); continue; }
      const [status, a, b] = line.split("\t");
      if (!status || !a) continue;
      if (status[0] === "A") { const p = a.normalize("NFC"); if (!added.has(p)) added.set(p, t); }
      else if (status[0] === "R" && b) { const to = b.normalize("NFC"); if (!movedFrom.has(to)) movedFrom.set(to, a.normalize("NFC")); }
    }
  } catch { warn("brak historii gita – kolejność zdjęć wg podpisów i nazw"); }
  const date = (p, depth = 0) => added.get(p) ?? (depth < 50 && movedFrom.has(p) ? date(movedFrom.get(p), depth + 1) : undefined);
  return date;
}

/* ---------- zdjęcia ---------- */
// PNG bez przezroczystości → JPEG (zdjęcia eksportowane jako PNG ważą wielokrotnie więcej)
const renamed = new Map();
const outRel = r => renamed.get(r) || r;
const mediaUrl = p => (p ? urlPath(outRel(normPath(p))) : "");
const mediaExists = p => !!p && fs.existsSync(path.join(ROOT, normPath(p)));

async function processImage(srcAbs, destAbs, width, toJpeg = false) {
  fs.mkdirSync(path.dirname(destAbs), { recursive: true });
  if (!sharp || COPY_ONLY.test(srcAbs) || !IMG.test(srcAbs)) { fs.copyFileSync(srcAbs, destAbs); return null; }
  let img = sharp(srcAbs, { failOn: "none" }).rotate()   // obrót wg EXIF, potem metadane są usuwane
    .resize({ width, height: width, fit: "inside", withoutEnlargement: true });
  if (toJpeg) img = img.flatten({ background: "#ffffff" }).jpeg({ quality: 82, mozjpeg: true });
  else if (/\.png$/i.test(srcAbs)) img = img.png({ compressionLevel: 9 });
  else if (/\.webp$/i.test(srcAbs)) img = img.webp({ quality: 82 });
  else img = img.jpeg({ quality: 82, mozjpeg: true });
  return img.toFile(destAbs);    // { width, height, … }
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
  .map(f => { try { return { ...JSON.parse(fs.readFileSync(f, "utf8")), plik: rel(f) }; } catch (e) { warn(`pomijam ${rel(f)}: ${e.message}`); return null; } })
  .filter(e => e && e.data && e.tytul);

/* =========================================================
   3. portfolio z folderów
   ========================================================= */
const PORT = path.join(ROOT, "media/portfolio");
const dateOf = addedDates("media/portfolio");
const opisy = new Map((galeria.zdjecia || []).map((z, i) => [normPath(z.zdjecie), { ...z, i }]));
for (const p of opisy.keys()) if (p && !fs.existsSync(path.join(ROOT, p)))
  warn(`podpis w „Portfolio – podpisy i kolejność” wskazuje zdjęcie, którego nie ma (przeniesione albo usunięte?): ${p}`);
const now = Math.floor(Date.now() / 1000);
const catDirs = fs.existsSync(PORT) ? fs.readdirSync(PORT, { withFileTypes: true })
  .filter(d => d.isDirectory() && !d.name.startsWith(".") && !d.name.startsWith("_")).map(d => d.name).sort(plCompare) : [];
const categories = {};
let photos = [];
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
for (const p of photos) { const o = opisy.get(p.rel); p.caption = o?.podpis || ""; p.top = !!o?.na_gore; p.order = o ? o.i : Infinity; p.date = dateOf(p.rel) ?? now; }
photos.sort((a, b) => (b.top - a.top) || (a.top && b.top ? a.order - b.order : 0) || (b.date - a.date) || (a.order - b.order) || plCompare(a.rel, b.rel));

/* =========================================================
   4. obrazy: media/ → _site/media/ (zmniejszone), miniatury portfolio → _site/media/_miniatury/
   ========================================================= */
const allMedia = walk(path.join(ROOT, "media"));
for (const f of allMedia) if (UNSUPPORTED.test(f))
  warn(`pomijam ${rel(f)} – tego formatu przeglądarki nie wyświetlą. Zapisz zdjęcie jako JPG (np. z iPhone'a: Ustawienia → Aparat → Formaty → „Najbardziej zgodne”).`);
const mediaFiles = allMedia.filter(f => IMG.test(f) || COPY_ONLY.test(f));
if (sharp) for (const f of mediaFiles.filter(f => /\.png$/i.test(f))) {
  try { if (!(await sharp(f).metadata()).hasAlpha) renamed.set(rel(f), rel(f).replace(/\.png$/i, ".jpg")); } catch {}
}
const failed = new Set();
const thumbInfo = new Map();
const thumbRel = r => "media/_miniatury/" + outRel(r).slice("media/".length);
const safely = (r, fn) => async () => {
  try { return await fn(); } catch (e) {
    if (!failed.has(r)) warn(`pomijam uszkodzone albo nieczytelne zdjęcie ${r}: ${e.message}`);
    failed.add(r);
  }
};
const tasks = mediaFiles.map(f => safely(rel(f), () => processImage(f, path.join(OUT, outRel(rel(f))), MAX, renamed.has(rel(f)))));
for (const p of photos) if (IMG.test(p.file)) tasks.push(safely(p.rel, async () => {
  const info = await processImage(p.file, path.join(OUT, thumbRel(p.rel)), THUMB, renamed.has(p.rel));
  if (info) thumbInfo.set(p.rel, info);
}));
await pool(tasks);
photos = photos.filter(p => !failed.has(p.rel));

/* ---------- zdjęcia z panelu: brak albo pusty wybór → zapasowe + ostrzeżenie ---------- */
const firstPhoto = photos.find(p => IMG.test(p.file))?.rel || "";
let heroSrc = normPath(strona.hero?.zdjecie);
if (!mediaExists(heroSrc) || failed.has(heroSrc)) {
  warn(`baner: ${heroSrc ? `brak zdjęcia ${heroSrc}` : "nie wybrano zdjęcia"} – używam pierwszego zdjęcia z portfolio`);
  heroSrc = firstPhoto;
}
let aboutSrc = normPath(oMnie.zdjecie);
if (!mediaExists(aboutSrc) || failed.has(aboutSrc)) {
  warn(`„O mnie”: ${aboutSrc ? `brak zdjęcia ${aboutSrc}` : "nie wybrano zdjęcia"} – używam zdjęcia z banera`);
  aboutSrc = heroSrc;
}
// baner na telefon: mniejsza wersja (ten sam kadr, ~1000 px zamiast 2000 px)
let heroSrcset = "";
if (sharp && heroSrc && IMG.test(heroSrc)) {
  try {
    const big = await sharp(path.join(OUT, outRel(heroSrc))).metadata();
    if (big.width > HERO_SMALL * 1.3) {
      const smallRel = "media/_male/" + outRel(heroSrc).slice("media/".length);
      const info = await processImage(path.join(ROOT, heroSrc), path.join(OUT, smallRel), HERO_SMALL, renamed.has(heroSrc));
      heroSrcset = `${urlPath(smallRel)} ${info.width}w, ${mediaUrl(heroSrc)} ${big.width}w`;
    }
  } catch (e) { warn(`baner: nie udało się zrobić wersji na telefon (${e.message})`); }
}

/* =========================================================
   5. dane dla JS (portfolio, wydarzenia, kontakt, pakiety rezerwacji)
   ========================================================= */
const zl = n => `${n} zł`;
const dane = {
  CATEGORIES: Object.fromEntries(Object.entries(categories).filter(([k]) => photos.some(p => p.category === k))),
  PORTFOLIO: photos.map(p => {
    const t = thumbInfo.get(p.rel);
    return {
      src: urlPath(outRel(p.rel)), thumb: t ? urlPath(thumbRel(p.rel)) : undefined,
      w: t?.width, h: t?.height, category: p.category, caption: p.caption,
    };
  }),
  WYDARZENIA: wydarzenia.map(e => {
    const zapisy = httpsOnly(e.zapisy);
    if (e.zapisy && !zapisy) warn(`wydarzenie „${e.tytul}”: link do zapisów musi zaczynać się od https:// – przycisk otworzy formularz kontaktowy`);
    return {
      tytul: e.tytul, data: String(e.data).slice(0, 10), od: e.od || "", do: e.do || "",
      opis: e.opis || "", opis_html: paragraphs(e.opis), miejsce: e.miejsce || "", cena: e.cena || "", miejsca: e.miejsca || "",
      brak_miejsc: !!e.brak_miejsc, zdjecie: mediaUrl(e.zdjecie), kadrowanie: e.kadrowanie || "", zapisy,
    };
  }),
};
const social = Object.fromEntries(Object.entries(strona.social || {}).map(([k, v]) => {
  const ok = httpsOnly(v);
  if (v && !ok) warn(`link ${k} musi zaczynać się od https:// – pomijam`);
  return [k, ok];
}).filter(([, v]) => v));
const rez = readJson("content/rezerwacje.json");
const przyjmuje = rez.przyjmuje_rezerwacje !== false;
const pakietyRez = (oferta.pakiety || []).map(p => {
  const minut = Number(p.minut);
  if (!(minut >= 15 && minut <= 600)) warn(`pakiet ${p.id}: czas sesji musi być między 15 a 600 minut – kalendarz użyje poprzedniego`);
  return { id: p.id, nazwa: String(p.nazwa || "").trim() || `Sesja ${p.id}`, minut };
});
if (przyjmuje && Array.isArray(rez.dni_pracy) && !rez.dni_pracy.length)
  warn("rezerwacje: nie zaznaczono żadnego dnia pracy – kalendarz nie pokaże wolnych terminów (do wstrzymania służy „Przyjmuję rezerwacje online”)");
if (rez.od && rez.do && rez.od >= rez.do)
  warn(`rezerwacje: godzina „od” (${rez.od}) musi być wcześniejsza niż „do” (${rez.do}) – skrypt zostawi poprzednie godziny`);
const cfgPatch = {
  contact: { email: strona.kontakt?.email || "", phone: strona.kontakt?.telefon || "", area: strona.kontakt?.obszar || "" },
  social,
  pakiety: pakietyRez.map(p => ({ ...p, cena: zl((oferta.pakiety || []).find(o => o.id === p.id)?.cena) })),
  najdalejDni: Number(rez.najdalej_dni) || 120,
  rezerwacjeWstrzymane: !przyjmuje,
  komunikatWstrzymania: String(rez.komunikat_wstrzymania || "").trim(),
};
fs.writeFileSync(path.join(OUT, "js/dane.js"),
  "/* Plik generowany przez build/build.mjs – nie edytuj, zmiany rób w panelu (content/, media/). */\n" +
  Object.entries(dane).map(([k, v]) => `window.${k} = ${JSON.stringify(v)};`).join("\n") +
  `\nObject.assign(window.SITE_CONFIG = window.SITE_CONFIG || {}, ${JSON.stringify(cfgPatch)});\n`);

// ustawienia rezerwacji z panelu + pakiety z cennika – czyta je skrypt Google (rezerwacje/Kod.gs) z opublikowanej strony
fs.writeFileSync(path.join(OUT, "rezerwacje.json"), JSON.stringify({ ...rez, pakiety: pakietyRez }, null, 1));

/* =========================================================
   6. podgląd linku (og:image): 1200×630 ze zdjęcia z panelu albo z banera; ikona na telefon
   ========================================================= */
const hash = buf => crypto.createHash("sha1").update(buf).digest("hex").slice(0, 8);
let podgladV = "";
{
  const src = mediaExists(strona.podglad_zdjecie) ? normPath(strona.podglad_zdjecie) : heroSrc;
  const srcAbs = src && path.join(ROOT, src);
  const dest = path.join(OUT, "media/_podglad.jpg");
  try {
    if (srcAbs && fs.existsSync(srcAbs) && sharp && IMG.test(srcAbs)) {
      await sharp(srcAbs, { failOn: "none" }).rotate().resize(1200, 630, { fit: "cover", position: "centre" })
        .jpeg({ quality: 82, mozjpeg: true }).toFile(dest);
      podgladV = hash(fs.readFileSync(dest));
    } else warn("brak zdjęcia do podglądu linku (albo modułu sharp)");
  } catch (e) { warn(`podgląd linku: ${e.message}`); }
}
if (sharp) {
  try { await sharp(path.join(ROOT, "favicon.svg"), { density: 300 }).resize(180, 180).flatten({ background: "#faf6ef" }).png().toFile(path.join(OUT, "apple-touch-icon.png")); }
  catch (e) { warn(`ikona na telefon: ${e.message}`); }
}
const adres = String(strona.adres_strony || "").trim().replace(/\/?$/, "/");
const maAdres = /^https?:\/\//.test(adres);

/* ---------- dane firmy dla Google (JSON-LD) ---------- */
const ceny = (oferta.pakiety || []).map(p => Number(p.cena)).filter(n => n > 0);
const firma = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: "Ewelina Kucharczyk Fotografia",
  description: strona.opis_google || undefined,
  url: maAdres ? adres : undefined,
  image: maAdres && podgladV ? `${adres}media/_podglad.jpg` : undefined,
  email: strona.kontakt?.email || undefined,
  telephone: strona.kontakt?.telefon || undefined,
  areaServed: strona.kontakt?.obszar || undefined,
  priceRange: ceny.length ? `${Math.min(...ceny)}–${Math.max(...ceny)} zł` : undefined,
  sameAs: Object.values(social).length ? Object.values(social) : undefined,
};
const jsonld = JSON.stringify(firma).replace(/</g, "\\u003c");

/* =========================================================
   7. index.html, 404.html, odwolanie.html i decyzja.html z szablonów
   ========================================================= */
const view = {
  strona: {
    ...strona,
    tytul_strony: String(strona.tytul_strony || "").trim() || "Ewelina Kucharczyk · Fotografia",
    adres: podgladV && maAdres ? adres : "",
    adres_glowny: maAdres ? adres : "./",
    hero: { ...strona.hero, zdjecie: mediaUrl(heroSrc), srcset: heroSrcset, opis_html: inline(strona.hero?.opis) },
  },
  o_mnie: { ...oMnie, zdjecie: mediaUrl(aboutSrc), tekst_html: paragraphs(oMnie.tekst) },
  oferta: {
    ...oferta,
    pakiety: (oferta.pakiety || []).map(p => ({ ...p, cena_txt: zl(p.cena), dodatkowe_txt: p.dodatkowe_zdjecie ? zl(p.dodatkowe_zdjecie) : "" })),
    wycena_html: inline(oferta.wycena_indywidualna?.tekst),
    faq: (oferta.faq || []).map(f => ({ ...f, odpowiedz_html: inline(f.odpowiedz) })),
  },
  galeria,
  podglad_v: podgladV,
  jsonld,
};
for (const page of ["index.html", "404.html", "odwolanie.html", "decyzja.html"])
  fs.writeFileSync(path.join(OUT, page), template(fs.readFileSync(path.join(ROOT, page), "utf8"), view));

/* =========================================================
   8. wersje plików: css/x.css → css/x.css?v=<odcisk treści>
      GitHub Pages każe przeglądarce trzymać pliki 10 min – po zmianie pliku zmienia się adres,
      więc przeglądarka nie połączy nowego HTML ze starym JS/CSS.
   ========================================================= */
for (const page of ["index.html", "polityka-prywatnosci.html", "odwolanie.html", "decyzja.html"]) {
  const f = path.join(OUT, page);
  fs.writeFileSync(f, fs.readFileSync(f, "utf8").replace(/((?:href|src)=")((?:css|js)\/[^"?#]+)"/g, (m, pre, ref) => {
    const abs = path.join(OUT, ref);
    return fs.existsSync(abs) ? `${pre}${ref}?v=${hash(fs.readFileSync(abs))}"` : m;
  }));
}

const podsumowanie = `${photos.length} zdjęć w ${Object.keys(dane.CATEGORIES).length} kategoriach, ${wydarzenia.length} wydarzeń${sharp ? "" : " (bez zmniejszania zdjęć)"}`;
console.log(`✓ _site gotowe: ${podsumowanie}${warnings.length ? `, ostrzeżenia: ${warnings.length}` : ""}`);
if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Strona zbudowana\n${podsumowanie}\n\n` +
    (warnings.length ? `#### ⚠ Ostrzeżenia (${warnings.length})\n${warnings.map(w => `- ${w}`).join("\n")}\n` : "Bez ostrzeżeń.\n"));
}
