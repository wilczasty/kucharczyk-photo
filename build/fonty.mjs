// =========================================================
// Fonty strony – hostowane na stronie, a nie pobierane z Google przy każdym wejściu (RODO: Google nie widzi
// odwiedzających). Wybór w panelu: „Wygląd – fonty” (content/wyglad.json).
//
// - fonty domyślne leżą w repozytorium (build/fonty-domyslne/) – build działa nawet bez internetu,
// - inny font: build pobiera go z Google Fonts przy publikacji (tylko alfabet łaciński z polskimi znakami),
// - font, którego nie ma albo który nie ma polskich znaków → ostrzeżenie i font domyślny.
//
//   node build/fonty.mjs --zapisz-domyslne    (odświeża pliki w build/fonty-domyslne/)
// =========================================================
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const DIR_DOMYSLNE = path.join(path.dirname(fileURLToPath(import.meta.url)), "fonty-domyslne");
// przeglądarka „udawana” – Google Fonts podaje wtedy nowoczesne pliki woff2 podzielone na alfabety
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

export const ROLE = {
  // zmienna CSS (css/style.css), potrzebne grubości, zapas, gdy font się nie wczyta
  naglowki: { zmienna: "--serif", wagi: [400, 500], zapas: "Georgia, serif", domyslny: "Cormorant Garamond" },
  tekst: { zmienna: "--sans", wagi: [300, 400, 500], zapas: "system-ui, sans-serif", domyslny: "Jost" },
  // odręczny: jedna grubość (pierwsza dostępna) – przeglądarka używa jej dla każdego tekstu odręcznego
  odreczny: { zmienna: "--script", wagi: [500, 400], jedna: true, zapas: "cursive", domyslny: "Caveat" },
};
const ALFABETY = ["latin-ext", "latin"];   // latin-ext = ą ć ę ł ń ś ź ż
// listy w panelu (.pages.yml – „Wygląd – fonty”) i na stronie podglądu fonty.html – wszystkie mają polskie znaki
export const POLECANE = {
  naglowki: ["Cormorant Garamond", "Playfair Display", "Lora", "EB Garamond", "Libre Baskerville", "Marcellus", "Cinzel", "DM Serif Display", "Fraunces", "Bodoni Moda"],
  tekst: ["Jost", "Lato", "Montserrat", "Raleway", "Nunito Sans", "Work Sans", "Source Sans 3", "Karla", "Mulish", "Josefin Sans"],
  odreczny: ["Caveat", "Dancing Script", "Great Vibes", "Parisienne", "Sacramento", "Allura", "Alex Brush", "Pinyon Script", "Italianno", "Amatic SC"],
};

const nazwaFontu = s => String(s ?? "").replace(/[^\p{L}\p{N} ]/gu, "").replace(/\s+/g, " ").trim().slice(0, 60);
const plikowa = s => s.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const hash = s => crypto.createHash("sha1").update(s).digest("hex").slice(0, 10);

async function pobierzCss(rodzina, os) {
  const q = rodzina.replace(/ /g, "+") + (os ? ":" + os : "");
  const res = await fetch(`https://fonts.googleapis.com/css2?family=${q}&display=swap`, { headers: { "User-Agent": UA } });
  if (res.status === 400) return null;                 // nie ma takiego fontu (albo takiej grubości)
  if (!res.ok) throw new Error(`Google Fonts odpowiada ${res.status}`);
  return res.text();
}

// CSS z Google → bloki @font-face tylko dla alfabetu łacińskiego
function bloki(css) {
  const wynik = [];
  for (const m of css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*@font-face\s*\{([^}]*)\}/g)) {
    if (!ALFABETY.includes(m[1])) continue;
    const url = m[2].match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/)?.[1];
    const waga = m[2].match(/font-weight:\s*([\d ]+);/)?.[1];
    const styl = m[2].match(/font-style:\s*(\w+);/)?.[1];
    const zakres = m[2].match(/unicode-range:\s*([^;]+);/)?.[1];
    if (url && waga && zakres) wynik.push({ alfabet: m[1], url, waga, styl: styl || "normal", zakres });
  }
  return wynik;
}

// pobiera font z Google: [{alfabet, url, waga, styl, zakres}] albo wyjątek z opisem dla Eweliny
async function zGoogle(rodzina, rola) {
  let css = [];
  if (rola.jedna) {
    for (const w of rola.wagi) { const t = await pobierzCss(rodzina, `wght@${w}`); if (t) { css.push(t); break; } }
  } else {
    const razem = await pobierzCss(rodzina, `wght@${rola.wagi.join(";")}`);
    if (razem) css.push(razem);
    else for (const w of rola.wagi) { const t = await pobierzCss(rodzina, `wght@${w}`); if (t) css.push(t); }
  }
  if (!css.length) { const t = await pobierzCss(rodzina, ""); if (t) css.push(t); }
  if (!css.length) throw new Error(`nie ma fontu „${rodzina}” w Google Fonts (sprawdź pisownię na fonts.google.com)`);
  const b = css.flatMap(bloki);
  if (!b.some(x => x.alfabet === "latin-ext")) throw new Error(`font „${rodzina}” nie ma polskich znaków (ą, ę, ł…)`);
  return b;
}

// bloki → pliki woff2 w katalogu `doKatalogu` + tekst @font-face (adresy względem css/)
async function zapisz(rodzina, b, rola, doKatalogu, czytaj) {
  fs.mkdirSync(doKatalogu, { recursive: true });
  const pliki = new Map();
  let css = "";
  for (const x of b) {
    if (!pliki.has(x.url)) {
      const nazwa = `${plikowa(rodzina)}-${hash(x.url)}.woff2`;
      fs.writeFileSync(path.join(doKatalogu, nazwa), await czytaj(x.url));
      pliki.set(x.url, nazwa);
    }
    css += `@font-face{font-family:"${rodzina}";font-style:${x.styl};font-weight:${x.waga};` +
      `font-display:swap;src:url(../fonty/${pliki.get(x.url)}) format("woff2");unicode-range:${x.zakres}}\n`;
  }
  return css;
}
const zSieci = async url => {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`nie udało się pobrać pliku fontu (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
};

/**
 * Przygotowuje fonty do _site: pliki w OUT/fonty/, a zwraca treść css/fonty.css.
 * wyglad = content/wyglad.json, warn = funkcja ostrzeżeń z build.mjs.
 */
export async function przygotujFonty(wyglad, OUT, warn) {
  const doKatalogu = path.join(OUT, "fonty");
  let css = "/* Plik generowany przez build/fonty.mjs – fonty wybiera się w panelu („Wygląd – fonty”). */\n";
  const zmienne = [];
  const wybrane = {};
  for (const [klucz, rola] of Object.entries(ROLE)) {
    const wybor = nazwaFontu(wyglad?.[`${klucz}_inny`]) || nazwaFontu(wyglad?.[klucz]) || rola.domyslny;
    let rodzina = wybor;
    if (wybor !== rola.domyslny) {
      try {
        css += await zapisz(wybor, await zGoogle(wybor, rola), rola, doKatalogu, zSieci);
      } catch (e) {
        warn(`font (${klucz}): ${e.message} – zostaje ${rola.domyslny}`);
        rodzina = rola.domyslny;
      }
    }
    if (rodzina === rola.domyslny) {
      const zrodlo = path.join(DIR_DOMYSLNE, `${klucz}.css`);
      const tekst = fs.readFileSync(zrodlo, "utf8");
      fs.mkdirSync(doKatalogu, { recursive: true });
      for (const [, plik] of tekst.matchAll(/url\(\.\.\/fonty\/([^)]+)\)/g)) fs.copyFileSync(path.join(DIR_DOMYSLNE, plik), path.join(doKatalogu, plik));
      css += tekst;
    }
    wybrane[klucz] = rodzina;
    zmienne.push(`${rola.zmienna}:"${rodzina}",${rola.zapas}`);
  }
  css += `:root{${zmienne.join(";")}}\n`;
  return { css, wybrane };
}

/* ---------- node build/fonty.mjs --zapisz-domyslne ---------- */
if (process.argv[1] === fileURLToPath(import.meta.url) && process.argv.includes("--zapisz-domyslne")) {
  fs.rmSync(DIR_DOMYSLNE, { recursive: true, force: true });
  for (const [klucz, rola] of Object.entries(ROLE)) {
    const css = await zapisz(rola.domyslny, await zGoogle(rola.domyslny, rola), rola, DIR_DOMYSLNE, zSieci);
    fs.writeFileSync(path.join(DIR_DOMYSLNE, `${klucz}.css`), css);
    console.log(`✓ ${klucz}: ${rola.domyslny}`);
  }
}
