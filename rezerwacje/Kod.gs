/* =========================================================
   REZERWACJE SESJI – zaplecze w Google Apps Script
   ---------------------------------------------------------
   Działa na koncie Google właściciela kalendarza:
   - podaje stronie wolne terminy (bez szczegółów wydarzeń),
   - przyjmuje prośbę o rezerwację: wstępnie blokuje termin
     w Kalendarzu Google i wysyła maile,
   - właściciel potwierdza / odrzuca prośbę przyciskiem z maila,
     a potwierdzoną sesję może później odwołać (z mailem do klienta),
   - klient może sam odwołać rezerwację linkiem z maila
     (strona odwolanie.html na stronie www),
   - co godzinę: wygasza nierozpatrzone prośby, przypomina właścicielowi
     o czekających prośbach i klientom o zbliżającej się sesji,
   - obsługuje formularz kontaktowy ze strony (mail do właściciela
     + automatyczna odpowiedź do klienta).
   Instrukcja wdrożenia: rezerwacje/INSTRUKCJA.md
   Funkcje bez „_” na końcu są dostępne z zewnątrz (strona decyzji, wyzwalacz) – każda sprawdza uprawnienia.
   ========================================================= */

// Godziny, dni, przerwy, limity, pakiety i teksty edytuje się w panelu Pages CMS
// („Rezerwacje – godziny i zasady” → content/rezerwacje.json, pakiety z „Oferta i cennik”).
// Skrypt czyta je z opublikowanej strony (stronaWww + "rezerwacje.json", pamięć 5 min).
// Wartości niżej to zapas, gdy strona nie odpowiada.
const USTAWIENIA = {
  strefa: "Europe/Warsaw",
  przyjmuje: true,               // false = rezerwacje online wstrzymane
  dniPracy: [1, 2, 3, 4, 5],     // 1 = poniedziałek … 7 = niedziela
  od: "09:00",                   // pierwsza możliwa godzina rozpoczęcia
  do: "18:00",                   // sesja musi skończyć się najpóźniej o tej godzinie
  krokMinut: 30,                 // co ile minut proponować godzinę rozpoczęcia
  przerwaMinut: 60,              // wolny czas przed i po każdym wydarzeniu w kalendarzu
  najwczesniejGodzin: 48,        // najkrótszy czas od teraz do sesji
  najdalejDni: 120,              // jak daleko do przodu można rezerwować
  odwolanieNajpozniejGodzin: 48, // do ilu godzin przed sesją klient może sam odwołać (0 = do samego początku)
  swietaWolne: true,             // dni ustawowo wolne w Polsce bez rezerwacji
  calodniowe: "wszystkie",       // które wydarzenia całodniowe blokują dzień: "wszystkie" | "urlop" (tylko ze słowem urlop/wolne/zajęte)
  wygasanieDni: 3,               // po ilu dniach nierozpatrzona prośba wygasa (0 = nigdy)
  przypomnienieDni: 2,           // ile dni przed sesją klient dostaje przypomnienie (0 = bez przypomnień)
  pakiety: {                     // nadpisywane przez content/oferta.json (build dopisuje je do rezerwacje.json)
    S: { nazwa: "Sesja S", minut: 30 },
    M: { nazwa: "Sesja M", minut: 50 },
    L: { nazwa: "Sesja L", minut: 90 },
  },
  // Kalendarze, których wydarzenia blokują terminy. "primary" = główny kalendarz konta.
  kalendarzeZajete: ["primary"],
  // Kalendarz, do którego trafiają rezerwacje.
  kalendarzRezerwacji: "primary",
  kontaktDziennie: 40,           // maks. wiadomości z formularza na dobę (ochrona limitu Gmaila ~100/dobę)
  kontaktNaEmail: 5,             // maks. wiadomości z jednego adresu na dobę
  rezerwacjeNaEmail: 3,          // maks. próśb o rezerwację z jednego adresu na dobę
  autoodpowiedz: "Otrzymałam Twoją wiadomość i odpowiem najszybciej, jak to możliwe – zwykle w ciągu 1–2 dni.\n\nJeśli chcesz coś dopisać, po prostu odpowiedz na tego maila.",
  podpis: "Ewelina Kucharczyk · Fotografia",
  // Adres strony. Po zmianie domeny NIE trzeba zmieniać kodu: Ustawienia projektu → Właściwości skryptu →
  // dodaj „stronaWww” = nowy adres z ukośnikiem na końcu (patrz INSTRUKCJA.md, „Przeprowadzka”).
  stronaWww: "https://wilczasty.github.io/kucharczyk-photo/",
};

/* ---------------- ustawienia z panelu ---------------- */
// Nadpisuje USTAWIENIA wartościami z content/rezerwacje.json (tylko poprawnymi).
function wczytajUstawienia_() {
  const props = PropertiesService.getScriptProperties();
  const www = props.getProperty("stronaWww");
  if (www && /^https:\/\/\S+\/$/.test(www)) USTAWIENIA.stronaWww = www;

  const cache = CacheService.getScriptCache();
  let txt = cache.get("ustawienia");
  if (!txt) {
    try {
      const res = UrlFetchApp.fetch(USTAWIENIA.stronaWww + "rezerwacje.json", { muteHttpExceptions: true });
      if (res.getResponseCode() === 200) {
        txt = res.getContentText();
        JSON.parse(txt);
        cache.put("ustawienia", txt, 300);
        props.setProperty("ustawienia", txt);   // ostatnie dobre – na awarię strony
      }
    } catch (err) { txt = null; }
    if (!txt) txt = props.getProperty("ustawienia");
  }
  if (!txt) return;
  let u; try { u = JSON.parse(txt); } catch (err) { return; }
  const godz = v => typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
  const liczba = (v, min, max) => { const n = Number(v); return v !== "" && v !== null && v !== undefined && isFinite(n) && n >= min && n <= max ? n : null; };
  const ust = (klucz, pole, min, max) => { const n = liczba(u[pole], min, max); if (n !== null) USTAWIENIA[klucz] = n; };

  if (typeof u.przyjmuje_rezerwacje === "boolean") USTAWIENIA.przyjmuje = u.przyjmuje_rezerwacje;
  // Pusta lista dni = brak terminów (a nie powrót do pon–pt) – świadoma decyzja w panelu.
  if (Array.isArray(u.dni_pracy)) USTAWIENIA.dniPracy = u.dni_pracy.map(Number).filter(n => n >= 1 && n <= 7);
  if (godz(u.od) && godz(u.do) && u.od < u.do) { USTAWIENIA.od = u.od; USTAWIENIA.do = u.do; }
  ust("krokMinut", "krok_minut", 15, 120);
  ust("przerwaMinut", "przerwa_minut", 0, 240);
  ust("najwczesniejGodzin", "najwczesniej_godzin", 0, 720);
  ust("najdalejDni", "najdalej_dni", 7, 365);
  ust("odwolanieNajpozniejGodzin", "odwolanie_najpozniej_godzin", 0, 720);
  ust("wygasanieDni", "wygasanie_dni", 0, 30);
  ust("przypomnienieDni", "przypomnienie_dni", 0, 14);
  if (typeof u.swieta_wolne === "boolean") USTAWIENIA.swietaWolne = u.swieta_wolne;
  if (u.calodniowe === "wszystkie" || u.calodniowe === "urlop") USTAWIENIA.calodniowe = u.calodniowe;
  if (typeof u.autoodpowiedz === "string" && u.autoodpowiedz.trim()) USTAWIENIA.autoodpowiedz = u.autoodpowiedz.trim();

  // pakiety z cennika: [{id, nazwa, minut}]
  if (Array.isArray(u.pakiety)) {
    const pak = {};
    u.pakiety.forEach(p => {
      const id = String((p && p.id) || ""), minut = liczba(p && p.minut, 15, 600);
      if (/^[A-Za-z0-9]{1,8}$/.test(id) && minut !== null) pak[id] = { nazwa: tekst_(p.nazwa, 60) || "Sesja " + id, minut: minut };
    });
    if (Object.keys(pak).length) USTAWIENIA.pakiety = pak;
  }
}

/* ---------------- wejście: GET ---------------- */
function doGet(e) {
  const p = (e && e.parameter) || {};
  try {
    wczytajUstawienia_();
    if (p.akcja === "terminy") return json_(wolneTerminy_(p.od, p.do, p.pakiet));
    if (p.akcja === "info") return json_(infoRezerwacji_(p.id, p.t));
    if (p.akcja === "decyzja") return stronaDecyzji_(p.id, p.t);
    if (p.akcja === "odwolaj") return stronaOdwolaniaStara_(p.id, p.t);
    return json_({ ok: true, info: "Rezerwacje działają." });
  } catch (err) {
    console.error(err);
    if (p.akcja === "decyzja" || p.akcja === "odwolaj")
      return strona_("Błąd", "<h1>Coś poszło nie tak</h1><p>Spróbuj ponownie za kilka minut.</p>");
    return json_({ ok: false, blad: "serwer" });
  }
}

/* ---------------- wejście: POST (rezerwacja, odwołanie albo formularz kontaktowy) ---------------- */
function doPost(e) {
  try {
    wczytajUstawienia_();
    let d;
    try { d = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, blad: "dane" }); }
    if (d.strona) return json_({ ok: true });           // pułapka na boty (ukryte pole)
    if (d.akcja === "kontakt") return json_(kontakt_(d));
    if (d.akcja === "odwolaj") return json_(odwolaj_(d.id, d.t, d.powod));
    return json_(zarezerwuj_(d));
  } catch (err) {
    console.error(err);
    return json_({ ok: false, blad: "serwer" });
  }
}

/* ---------------- formularz kontaktowy ---------------- */
function kontakt_(d) {
  const imie = tekst_(d.imie, 80), email = tekst_(d.email, 120), rodzaj = tekst_(d.rodzaj, 80), wiadomosc = tekst_(d.wiadomosc, 5000);
  if (!imie || !wiadomosc || !poprawnyEmail_(email) || !d.zgoda) return { ok: false, blad: "dane" };
  if (MailApp.getRemainingDailyQuota() < 2) return { ok: false, blad: "poczta" };

  // limity: z jednego adresu i łącznie na dobę (pod blokadą, żeby równoległe wysyłki ich nie ominęły)
  const kluczEmail = "kontakt_" + email.toLowerCase();
  const kluczDzien = "kontakt_" + fmt_(new Date(), "yyyy-MM-dd");
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return { ok: false, blad: "serwer" };
  try {
    if (licznik_(kluczEmail) >= USTAWIENIA.kontaktNaEmail || licznik_(kluczDzien) >= USTAWIENIA.kontaktDziennie) return { ok: false, blad: "limit" };
    zwieksz_(kluczEmail); zwieksz_(kluczDzien);
  } finally { lock.releaseLock(); }

  try {
    MailApp.sendEmail({
      to: wlasciciel_(),
      replyTo: email,
      name: "Strona – formularz kontaktowy",
      subject: "Wiadomość ze strony: " + imie + (rodzaj ? " – " + rodzaj : ""),
      htmlBody: mail_("Nowa wiadomość ze strony",
        "<p><b>" + esc_(imie) + "</b> &lt;<a href='mailto:" + esc_(email) + "'>" + esc_(email) + "</a>&gt;</p>" +
        (rodzaj ? "<p>Temat: <b>" + esc_(rodzaj) + "</b></p>" : "") +
        "<p style='white-space:pre-wrap;background:#f1e9dc;padding:14px 16px;border-radius:4px'>" + esc_(wiadomosc) + "</p>" +
        "<p style='color:#7a6a5b;font-size:13px'>Odpowiedz na tego maila – odpowiedź trafi prosto do " + esc_(imie) + ".</p>"),
    });
  } catch (err) {
    console.error(err);
    return { ok: false, blad: "poczta" };
  }
  // Automatyczna odpowiedź – bez treści wiadomości (żeby formularz nie służył do rozsyłania spamu).
  // Jej błąd nie psuje wysyłki: właściciel wiadomość już ma.
  wyslijBezpiecznie_({
    to: email,
    replyTo: wlasciciel_(),
    name: USTAWIENIA.podpis,
    subject: "Dziękuję za wiadomość",
    htmlBody: mail_("Dziękuję, " + esc_(imie.slice(0, 40)) + "!",
      akapity_(USTAWIENIA.autoodpowiedz)),
  });
  return { ok: true };
}

/* ---------------- wolne terminy ---------------- */
function wolneTerminy_(odStr, doStr, pakietId) {
  if (!USTAWIENIA.przyjmuje) return { ok: false, blad: "wstrzymane" };
  const pak = USTAWIENIA.pakiety[pakietId];
  if (!pak || !/^\d{4}-\d{2}-\d{2}$/.test(odStr || "") || !/^\d{4}-\d{2}-\d{2}$/.test(doStr || "")) {
    return { ok: false, blad: "parametry" };
  }
  // Wynik pamiętany 60 s – odczyt kalendarza trwa kilka sekund. Każda zmiana rezerwacji unieważnia pamięć
  // (nowa „wersja”), a sama rezerwacja i tak sprawdza termin ponownie pod blokadą.
  const cache = CacheService.getScriptCache();
  const klucz = "terminy_" + (cache.get("terminyWersja") || "0") + "_" + pakietId + "_" + odStr + "_" + doStr;
  const zPamieci = cache.get(klucz);
  if (zPamieci) return JSON.parse(zPamieci);

  const teraz = new Date();
  const min = new Date(teraz.getTime() + USTAWIENIA.najwczesniejGodzin * 3600e3);
  const max = new Date(teraz.getTime() + USTAWIENIA.najdalejDni * 86400e3);
  let start = data_(odStr, "00:00");
  let koniec = new Date(data_(doStr, "00:00").getTime() + 86400e3);
  if (koniec - start > 45 * 86400e3) koniec = new Date(start.getTime() + 45 * 86400e3);

  const wynik = { ok: true, dni: {} };
  if (koniec > min && start < max) {
    const zajete = zajeteOkresy_(start, koniec);
    for (let dzien = new Date(start); dzien < koniec; dzien = dodajDzien_(dzien)) {
      const k = fmt_(dzien, "yyyy-MM-dd");
      const godziny = wolneGodzinyDnia_(k, pak.minut, zajete, min, max);
      if (godziny.length) wynik.dni[k] = godziny;
    }
  }
  try { cache.put(klucz, JSON.stringify(wynik), 60); } catch (err) { /* za duże – trudno */ }
  return wynik;
}
function zmianaTerminow_() { CacheService.getScriptCache().put("terminyWersja", String(Date.now()), 21600); }

function wolneGodzinyDnia_(klucz, minut, zajete, min, max) {
  const dzienTyg = Number(fmt_(data_(klucz, "12:00"), "u"));
  if (USTAWIENIA.dniPracy.indexOf(dzienTyg) < 0) return [];
  if (USTAWIENIA.swietaWolne && swieto_(klucz)) return [];
  const koniecDnia = data_(klucz, USTAWIENIA.do).getTime();
  const krok = USTAWIENIA.krokMinut * 60e3;
  const wynik = [];
  for (let t = data_(klucz, USTAWIENIA.od).getTime(); t + minut * 60e3 <= koniecDnia; t += krok) {
    if (t < min.getTime() || t > max.getTime()) continue;
    const k = t + minut * 60e3;
    const kolizja = zajete.some(z => t < z.k && k > z.s);
    if (!kolizja) wynik.push(fmt_(new Date(t), "HH:mm"));
  }
  return wynik;
}

// Wydarzenia z kalendarzy, poszerzone o przerwę z obu stron.
function zajeteOkresy_(start, koniec) {
  const przerwa = USTAWIENIA.przerwaMinut * 60e3;
  const wynik = [];
  USTAWIENIA.kalendarzeZajete.forEach(id => {
    const kal = kalendarz_(id);
    if (!kal) return;
    kal.getEvents(new Date(start.getTime() - przerwa), new Date(koniec.getTime() + przerwa)).forEach(ev => {
      if (ev.getMyStatus && ev.getMyStatus() === CalendarApp.GuestStatus.NO) return; // odrzucone zaproszenia
      if (ev.isAllDayEvent()) {
        // całodniowe: cały dzień zajęty (bez przerwy) – albo tylko „urlop / wolne / zajęte”, jeśli tak ustawiono w panelu
        if (USTAWIENIA.calodniowe === "urlop" && !/urlop|wolne|zaj[eę]t|niedost[eę]pn/i.test(ev.getTitle())) return;
        wynik.push({ s: ev.getAllDayStartDate().getTime(), k: ev.getAllDayEndDate().getTime() });
        return;
      }
      wynik.push({ s: ev.getStartTime().getTime() - przerwa, k: ev.getEndTime().getTime() + przerwa });
    });
  });
  return wynik;
}

// Dni ustawowo wolne od pracy w Polsce (z Wielkanocą, Bożym Ciałem i Wigilią od 2025 r.).
function swieto_(klucz) {
  const [r, m, d] = klucz.split("-").map(Number);
  if ([101, 106, 501, 503, 815, 1101, 1111, 1225, 1226].indexOf(m * 100 + d) >= 0) return true;
  if (m === 12 && d === 24 && r >= 2025) return true;
  // Wielkanoc – algorytm Meeusa/Jonesa/Butchera
  const a = r % 19, b = Math.floor(r / 100), c = r % 100, e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - Math.floor(b / 4) - g + 15) % 30;
  const l = (32 + 2 * e + 2 * Math.floor(c / 4) - h - c % 4) % 7, x = Math.floor((a + 11 * h + 22 * l) / 451);
  const wlk = Date.UTC(r, Math.floor((h + l - 7 * x + 114) / 31) - 1, (h + l - 7 * x + 114) % 31 + 1);
  const roznica = Math.round((Date.UTC(r, m - 1, d) - wlk) / 86400e3);
  return roznica === 0 || roznica === 1 || roznica === 49 || roznica === 60;   // Wielkanoc, poniedziałek, Zielone Świątki, Boże Ciało
}

/* ---------------- rezerwacja ---------------- */
function zarezerwuj_(d) {
  if (!USTAWIENIA.przyjmuje) return { ok: false, blad: "wstrzymane" };
  const pak = USTAWIENIA.pakiety[d.pakiet];
  const imie = tekst_(d.imie, 80), email = tekst_(d.email, 120), telefon = tekst_(d.telefon, 40), uwagi = tekst_(d.uwagi, 1500);
  if (!pak || !/^\d{4}-\d{2}-\d{2}$/.test(d.data || "") || !/^\d{2}:\d{2}$/.test(d.godzina || "")) return { ok: false, blad: "dane" };
  if (!imie || !poprawnyEmail_(email) || !d.zgoda) return { ok: false, blad: "dane" };
  // Bez wolnych maili nie zakładamy wydarzenia – inaczej termin byłby zablokowany, a nikt by o tym nie wiedział.
  if (MailApp.getRemainingDailyQuota() < 2) return { ok: false, blad: "poczta" };

  const kluczLimitu = "limit_" + email.toLowerCase();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return { ok: false, blad: "zajete" };
  try {
    if (licznik_(kluczLimitu) >= USTAWIENIA.rezerwacjeNaEmail) return { ok: false, blad: "limit" };
    const start = data_(d.data, d.godzina);
    const koniec = new Date(start.getTime() + pak.minut * 60e3);
    const teraz = new Date();
    const wolne = wolneGodzinyDnia_(d.data, pak.minut,
      zajeteOkresy_(data_(d.data, "00:00"), dodajDzien_(data_(d.data, "00:00"))),
      new Date(teraz.getTime() + USTAWIENIA.najwczesniejGodzin * 3600e3),
      new Date(teraz.getTime() + USTAWIENIA.najdalejDni * 86400e3));
    if (wolne.indexOf(d.godzina) < 0) return { ok: false, blad: "termin" };

    const token = Utilities.getUuid();          // dla właściciela (potwierdź / odrzuć / odwołaj)
    const tokenK = Utilities.getUuid();         // dla klienta (odwołaj) – osobny, żeby klient nie mógł sam potwierdzić
    const opis = [
      "PROŚBA O REZERWACJĘ – czeka na potwierdzenie (link w mailu).",
      "",
      "Pakiet: " + pak.nazwa + " (" + pak.minut + " min)",
      "Imię: " + imie,
      "E-mail: " + email,
      "Telefon: " + (telefon || "–"),
      "",
      "Uwagi:",
      uwagi || "–",
    ].join("\n");
    const ev = kalendarz_(USTAWIENIA.kalendarzRezerwacji).createEvent(
      "❓ PROŚBA: " + pak.nazwa + " – " + imie, start, koniec, { description: opis });
    let etap = "kalendarz";
    try {
      ev.setColor(CalendarApp.EventColor.YELLOW);
      ev.setTag("rezerwacja", "prosba");
      ev.setTag("token", token);
      ev.setTag("tokenK", tokenK);
      ev.setTag("email", email);
      ev.setTag("imie", imie);
      ev.setTag("pakiet", d.pakiet);
      ev.setTag("utworzono", String(Date.now()));

      const kiedy = opisTerminu_(start, koniec);
      etap = "poczta";
      MailApp.sendEmail({
        to: wlasciciel_(),
        replyTo: email,
        subject: "Nowa prośba o rezerwację: " + pak.nazwa + ", " + kiedy,
        htmlBody: mail_("Nowa prośba o rezerwację",
          "<p><b>" + esc_(imie) + "</b> prosi o termin:</p>" +
          "<p style='font-size:18px'><b>" + esc_(pak.nazwa) + "</b> · " + esc_(kiedy) + "</p>" +
          "<p>E-mail: <a href='mailto:" + esc_(email) + "'>" + esc_(email) + "</a><br>Telefon: " + esc_(telefon || "–") + "</p>" +
          "<p>Uwagi:<br>" + esc_(uwagi || "–").replace(/\n/g, "<br>") + "</p>" +
          "<p>Termin jest już wstępnie zablokowany w kalendarzu (żółte wydarzenie)." +
          (USTAWIENIA.wygasanieDni ? " Jeśli nie rozpatrzysz prośby w ciągu " + dni_(USTAWIENIA.wygasanieDni) +
            ", wygaśnie, a klient dostanie maila, że termin został zwolniony." : "") + "</p>" +
          przyciskDecyzji_(ev.getId(), token, "Potwierdź lub odrzuć") +
          "<p style='color:#7a6a5b;font-size:13px'>Możesz też po prostu odpowiedzieć na tego maila – trafi do klienta.</p>"),
      });
      // Mail do klienta: jeśli się nie uda, prośba i tak jest u właściciela – nie cofamy jej.
      wyslijBezpiecznie_({
        to: email,
        replyTo: wlasciciel_(),
        name: USTAWIENIA.podpis,
        subject: "Otrzymałam Twoją prośbę o rezerwację – " + kiedy,
        htmlBody: mail_("Dziękuję, " + esc_(imie) + "!",
          "<p>Otrzymałam prośbę o rezerwację:</p>" +
          "<p style='font-size:18px'><b>" + esc_(pak.nazwa) + "</b> · " + esc_(kiedy) + "</p>" +
          "<p>Termin jest wstępnie zarezerwowany dla Ciebie. Potwierdzę go osobnym mailem – zwykle w ciągu 24 godzin.</p>" +
          "<p>Jeśli masz pytania, po prostu odpowiedz na tę wiadomość.</p>" + stopkaOdwolania_(ev.getId(), tokenK)),
      });
    } catch (err) {
      // nie udało się powiadomić właściciela → zwalniamy termin, klient może spróbować ponownie
      console.error(err);
      try { ev.deleteEvent(); } catch (e2) { console.error(e2); }
      return { ok: false, blad: etap === "poczta" ? "poczta" : "serwer" };
    }

    zwieksz_(kluczLimitu);
    zmianaTerminow_();
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

/* ---------------- potwierdzenie / odrzucenie / odwołanie przez właściciela ---------------- */
// Link z maila otwiera stronę z przyciskami (sam link niczego nie zmienia –
// dzięki temu skanery linków w poczcie nie potwierdzą rezerwacji przypadkiem).
function stronaDecyzji_(id, token) {
  const ev = wydarzenie_(id, token);
  const skrypt = (funkcja, gotowe) =>
    "<script>function dec(a){if(a!=='tak'&&!confirm(a==='nie'?'Na pewno odrzucić?':'Na pewno odwołać sesję? Klient dostanie maila.'))return;" +
    "document.querySelectorAll('button').forEach(b=>b.disabled=true);document.getElementById('st').textContent='Zapisywanie…';" +
    "google.script.run.withSuccessHandler(t=>document.body.innerHTML='<h1>'+t+'</h1><p>" + gotowe + "</p>')" +
    ".withFailureHandler(e=>{document.getElementById('st').textContent='Błąd: '+e.message;document.querySelectorAll('button').forEach(b=>b.disabled=false)})" +
    "." + funkcja + "(" + JSON.stringify(id) + "," + JSON.stringify(token) + ",a,document.getElementById('msg').value)}</script>";
  let tresc;
  if (!ev) {
    tresc = "<h1>Nie znaleziono rezerwacji</h1><p>Mogła zostać już odrzucona, odwołana albo usunięta z kalendarza.</p>";
  } else {
    const naglowek =
      "<p><b>" + esc_(ev.getTag("imie")) + "</b> &lt;" + esc_(ev.getTag("email")) + "&gt;</p>" +
      "<p class='duze'>" + esc_(pakiet_(ev).nazwa) + " · " + esc_(opisTerminu_(ev.getStartTime(), ev.getEndTime())) + "</p>";
    if (ev.getTag("rezerwacja") === "prosba") {
      tresc = "<h1>Prośba o rezerwację</h1>" + naglowek +
        "<label>Wiadomość do klienta (opcjonalnie)<textarea id='msg' rows='4'></textarea></label>" +
        "<div class='btns'><button onclick=\"dec('tak')\">Potwierdź</button>" +
        "<button class='no' onclick=\"dec('nie')\">Odrzuć i zwolnij termin</button></div><p id='st'></p>" +
        skrypt("decyzja", "Klient dostał maila. Ten sam link z maila pozwoli później odwołać sesję. Możesz zamknąć tę kartę.");
    } else if (ev.getEndTime().getTime() < Date.now()) {
      tresc = "<h1>Sesja już się odbyła</h1>" + naglowek;
    } else {
      tresc = "<h1>Potwierdzona sesja</h1>" + naglowek +
        "<p>Musisz odwołać tę sesję (choroba, pogoda, inny powód)? Klient dostanie maila z Twoją wiadomością, a termin zwolni się na stronie.</p>" +
        "<label>Wiadomość do klienta (np. propozycja innego terminu)<textarea id='msg' rows='4'></textarea></label>" +
        "<div class='btns'><button class='no' onclick=\"dec('odwolaj')\">Odwołaj sesję</button></div><p id='st'></p>" +
        skrypt("decyzja", "Klient dostał maila. Możesz zamknąć tę kartę.");
    }
  }
  return strona_("Rezerwacja – decyzja", tresc);
}

// Wywoływane z przycisków na stronie decyzji. Wymaga ważnego tokenu z maila właściciela.
function decyzja(id, token, akcja, wiadomosc) {
  wczytajUstawienia_();
  if (["tak", "nie", "odwolaj"].indexOf(akcja) < 0) throw new Error("Nieznana akcja.");
  const ev = wydarzenie_(id, token);
  if (!ev) throw new Error("Nie znaleziono rezerwacji.");
  const stan = ev.getTag("rezerwacja");
  if (akcja === "odwolaj" ? stan !== "potwierdzona" : stan !== "prosba") return "Ta rezerwacja była już rozpatrzona";
  if (MailApp.getRemainingDailyQuota() < 1) throw new Error("Wyczerpany dzienny limit maili Google – spróbuj jutro rano.");
  const pak = pakiet_(ev);
  const email = ev.getTag("email"), imie = ev.getTag("imie");
  const kiedy = opisTerminu_(ev.getStartTime(), ev.getEndTime());
  const dopisek = wiadomosc ? "<p>" + esc_(tekst_(wiadomosc, 2000)).replace(/\n/g, "<br>") + "</p>" : "";
  const nieDoszedl = " – ale mail do klienta nie wyszedł. Napisz do niego/niej sam(a): " + email;

  if (akcja === "tak") {
    ev.setTitle("📷 " + pak.nazwa + " – " + imie);
    ev.setColor(CalendarApp.EventColor.GREEN);
    ev.setDescription(ev.getDescription().replace(/^PROŚBA O REZERWACJĘ[^\n]*/, "POTWIERDZONA REZERWACJA"));
    ev.setTag("rezerwacja", "potwierdzona");
    const ok = wyslijBezpiecznie_({
      to: email, replyTo: wlasciciel_(), name: USTAWIENIA.podpis,
      subject: "Potwierdzam termin sesji – " + kiedy,
      htmlBody: mail_("Do zobaczenia, " + esc_(imie) + "!",
        "<p>Potwierdzam Twoją rezerwację:</p><p style='font-size:18px'><b>" + esc_(pak.nazwa) + "</b> · " + esc_(kiedy) + "</p>" +
        dopisek + "<p>Szczegóły i miejsce sesji ustalimy mailowo lub telefonicznie.</p>" +
        stopkaOdwolania_(ev.getId(), ev.getTag("tokenK"))),
    });
    return ok ? "Rezerwacja potwierdzona ✔" : "Rezerwacja potwierdzona" + nieDoszedl;
  }

  ev.deleteEvent();
  zmianaTerminow_();
  if (akcja === "odwolaj") {
    const ok = wyslijBezpiecznie_({
      to: email, replyTo: wlasciciel_(), name: USTAWIENIA.podpis,
      subject: "Muszę odwołać naszą sesję – " + kiedy,
      htmlBody: mail_("Dzień dobry, " + esc_(imie),
        "<p>Bardzo przepraszam, ale niestety muszę odwołać naszą sesję:</p>" +
        "<p style='font-size:18px'><b>" + esc_(pak.nazwa) + "</b> · " + esc_(kiedy) + "</p>" + dopisek +
        "<p>Odpowiedz proszę na tego maila – chętnie ustalę z Tobą nowy termin. Możesz też wybrać wolny termin na <a href='" +
        USTAWIENIA.stronaWww + "#rezerwacja'>stronie</a>.</p>"),
    });
    return ok ? "Sesja odwołana, termin zwolniony" : "Sesja odwołana" + nieDoszedl;
  }
  const ok = wyslijBezpiecznie_({
    to: email, replyTo: wlasciciel_(), name: USTAWIENIA.podpis,
    subject: "Niestety nie mogę przyjąć rezerwacji – " + kiedy,
    htmlBody: mail_("Dzień dobry, " + esc_(imie),
      "<p>Niestety nie mogę przyjąć rezerwacji w terminie <b>" + esc_(kiedy) + "</b>.</p>" + dopisek +
      "<p>Zapraszam do wyboru innego terminu na <a href='" + USTAWIENIA.stronaWww + "#rezerwacja'>stronie</a> albo do kontaktu mailowego.</p>"),
  });
  return ok ? "Prośba odrzucona, termin zwolniony" : "Prośba odrzucona" + nieDoszedl;
}

/* ---------------- odwołanie przez klienta (strona odwolanie.html na stronie www) ---------------- */
// GET ?akcja=info&id=…&t=… – co pokazać na stronie odwołania (bez danych osobowych).
function infoRezerwacji_(id, token) {
  const ev = wydarzenieKlienta_(id, token);
  if (!ev) return { ok: true, stan: "brak" };
  return {
    ok: true,
    stan: moznaOdwolac_(ev) ? "ok" : "zaPozno",
    potwierdzona: ev.getTag("rezerwacja") === "potwierdzona",
    pakiet: pakiet_(ev).nazwa,
    kiedy: opisTerminu_(ev.getStartTime(), ev.getEndTime()),
    najpozniej: USTAWIENIA.odwolanieNajpozniejGodzin,
  };
}

// POST {akcja:"odwolaj", id, t, powod}
function odwolaj_(id, token, powod) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return { ok: false, blad: "zajete" };
  try {
    const ev = wydarzenieKlienta_(id, token);
    if (!ev) return { ok: false, blad: "brak" };
    if (!moznaOdwolac_(ev)) return { ok: false, blad: "zaPozno" };
    if (MailApp.getRemainingDailyQuota() < 2) return { ok: false, blad: "poczta" };
    const pak = pakiet_(ev);
    const email = ev.getTag("email"), imie = ev.getTag("imie");
    const kiedy = opisTerminu_(ev.getStartTime(), ev.getEndTime());
    const byla = ev.getTag("rezerwacja") === "potwierdzona" ? "potwierdzoną" : "niepotwierdzoną jeszcze";
    powod = tekst_(powod, 1000);
    // najpierw mail do właściciela – jeśli nie wyjdzie, niczego nie usuwamy (klient spróbuje ponownie albo napisze)
    try {
      MailApp.sendEmail({
        to: wlasciciel_(), replyTo: email,
        subject: "Klient odwołał rezerwację: " + pak.nazwa + ", " + kiedy,
        htmlBody: mail_("Odwołana rezerwacja",
          "<p><b>" + esc_(imie) + "</b> &lt;" + esc_(email) + "&gt; odwołał(a) " + byla + " rezerwację:</p>" +
          "<p style='font-size:18px'><b>" + esc_(pak.nazwa) + "</b> · " + esc_(kiedy) + "</p>" +
          "<p>Powód: " + (powod ? esc_(powod).replace(/\n/g, "<br>") : "–") + "</p>" +
          "<p>Wydarzenie zostało usunięte z kalendarza, termin jest znowu wolny na stronie.</p>"),
      });
    } catch (err) {
      console.error(err);
      return { ok: false, blad: "poczta" };
    }
    ev.deleteEvent();
    zmianaTerminow_();
    wyslijBezpiecznie_({
      to: email, replyTo: wlasciciel_(), name: USTAWIENIA.podpis,
      subject: "Rezerwacja odwołana – " + kiedy,
      htmlBody: mail_("Rezerwacja odwołana",
        "<p>Potwierdzam odwołanie rezerwacji:</p><p style='font-size:18px'><b>" + esc_(pak.nazwa) + "</b> · " + esc_(kiedy) + "</p>" +
        "<p>Jeśli chcesz umówić inny termin, zapraszam na <a href='" + USTAWIENIA.stronaWww + "#rezerwacja'>stronę</a>.</p>"),
    });
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

// Stare linki (?akcja=odwolaj z maili sprzed zmiany) – przekierowanie na stronę odwołania na stronie www.
function stronaOdwolaniaStara_(id, token) {
  const link = linkOdwolania_(id, token);
  return strona_("Odwołanie rezerwacji",
    "<h1>Odwołanie rezerwacji</h1><p>Strona odwołania przeniosła się na moją stronę internetową.</p>" +
    "<div class='btns'><a class='btn' href='" + esc_(link) + "' target='_top'>Przejdź do odwołania</a></div>");
}

function wydarzenieKlienta_(id, token) {
  if (!id || !token) return null;
  const ev = kalendarz_(USTAWIENIA.kalendarzRezerwacji).getEventById(String(id));
  if (!ev || !ev.getTag("tokenK") || ev.getTag("tokenK") !== String(token)) return null;
  return ev;
}
function moznaOdwolac_(ev) {
  return ev.getStartTime().getTime() - Date.now() > USTAWIENIA.odwolanieNajpozniejGodzin * 3600e3;
}
function linkOdwolania_(id, tokenK) {
  return USTAWIENIA.stronaWww + "odwolanie.html?id=" + encodeURIComponent(id) + "&t=" + encodeURIComponent(tokenK);
}
function stopkaOdwolania_(id, tokenK) {
  if (!tokenK) return "";
  return "<p style='margin-top:24px;padding-top:14px;border-top:1px solid #d9c4a6;color:#7a6a5b;font-size:14px'>" +
    "Nie możesz przyjść? <a href='" + esc_(linkOdwolania_(id, tokenK)) + "'>Odwołaj rezerwację</a>" +
    (USTAWIENIA.odwolanieNajpozniejGodzin ? " (najpóźniej " + USTAWIENIA.odwolanieNajpozniejGodzin + " godz. przed sesją)" : "") +
    ". Chcesz przełożyć termin? Odwołaj go i wybierz nowy albo po prostu odpowiedz na tego maila.</p>";
}

/* ---------------- zadania cykliczne (wyzwalacz co godzinę – zakłada go funkcja konfiguruj) ---------------- */
// - nierozpatrzone prośby starsze niż wygasanieDni (albo z terminem, który już minął) → usunięte, mail do klienta,
// - raz dziennie (od 8:00) właściciel dostaje listę próśb czekających dłużej niż 24 h i tych, które wygasły,
// - od 9:00 klienci z potwierdzoną sesją za przypomnienieDni dni dostają przypomnienie (raz).
function zadaniaCykliczne() {
  const props = PropertiesService.getScriptProperties();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return;
  try {
    // ochrona: najwyżej raz na 50 minut, niezależnie od tego, kto wywołuje
    const ostatnio = Number(props.getProperty("zadaniaOstatnio") || 0);
    if (Date.now() - ostatnio < 50 * 60e3) return;
    props.setProperty("zadaniaOstatnio", String(Date.now()));
    wczytajUstawienia_();

    const teraz = new Date();
    const godzina = Number(fmt_(teraz, "H"));
    const dzis = fmt_(teraz, "yyyy-MM-dd");
    const kal = kalendarz_(USTAWIENIA.kalendarzRezerwacji);
    const wydarzenia = kal.getEvents(new Date(teraz.getTime() - 2 * 86400e3), new Date(teraz.getTime() + 400 * 86400e3))
      .filter(ev => ev.getTag("rezerwacja"));

    const czekajace = [], wygasle = [];
    let zmiana = false;
    wydarzenia.forEach(ev => {
      try {
        const stan = ev.getTag("rezerwacja");
        if (stan === "prosba") {
          const utworzono = Number(ev.getTag("utworzono")) || ev.getDateCreated().getTime();
          const wiek = teraz.getTime() - utworzono;
          const minela = ev.getStartTime().getTime() <= teraz.getTime();
          if (minela || (USTAWIENIA.wygasanieDni && wiek >= USTAWIENIA.wygasanieDni * 86400e3)) {
            const opis = opisRezerwacji_(ev);
            if (!minela) mailWygasniecia_(ev);
            ev.deleteEvent();
            zmiana = true;
            wygasle.push(opis);
          } else if (wiek >= 24 * 3600e3) {
            czekajace.push(opisRezerwacji_(ev) + przyciskDecyzji_(ev.getId(), ev.getTag("token"), "Potwierdź lub odrzuć"));
          }
        } else if (stan === "potwierdzona" && USTAWIENIA.przypomnienieDni && godzina >= 9 && !ev.getTag("przypomnienie")) {
          const dzienSesji = fmt_(ev.getStartTime(), "yyyy-MM-dd");
          const zaIle = Math.round((data_(dzienSesji, "12:00") - data_(dzis, "12:00")) / 86400e3);
          if (zaIle >= 0 && zaIle <= USTAWIENIA.przypomnienieDni && ev.getStartTime() > teraz) {
            if (mailPrzypomnienia_(ev, zaIle)) ev.setTag("przypomnienie", dzis);
          }
        }
      } catch (err) { console.error(err); }
    });
    if (zmiana) zmianaTerminow_();

    // podsumowanie dla właściciela: raz dziennie (wygasłe – od razu, żeby wiedział, że termin się zwolnił)
    const raportDzis = props.getProperty("raportDzien") === dzis;
    const pokazCzekajace = czekajace.length && godzina >= 8 && !raportDzis;
    if (pokazCzekajace || wygasle.length) {
      const ok = wyslijBezpiecznie_({
        to: wlasciciel_(),
        subject: (wygasle.length ? "Wygasłe prośby o rezerwację: " + wygasle.length : "Prośby o rezerwację czekają na decyzję: " + czekajace.length),
        htmlBody: mail_("Rezerwacje – do zrobienia",
          (pokazCzekajace ? "<h3>Czekają na Twoją decyzję (ponad 24 godziny)</h3>" + czekajace.join("") +
            (USTAWIENIA.wygasanieDni ? "<p style='color:#7a6a5b;font-size:13px'>Prośby nierozpatrzone przez " + dni_(USTAWIENIA.wygasanieDni) +
              " wygasają automatycznie.</p>" : "") : "") +
          (wygasle.length ? "<h3>Wygasły (nierozpatrzone na czas)</h3>" + wygasle.join("") +
            "<p>Wydarzenia usunięte z kalendarza, klienci dostali maila, że termin został zwolniony.</p>" : "")),
      });
      if (ok && pokazCzekajace) props.setProperty("raportDzien", dzis);
    }
  } finally {
    lock.releaseLock();
  }
}

function opisRezerwacji_(ev) {
  return "<p style='margin:14px 0 4px'><b>" + esc_(pakiet_(ev).nazwa) + "</b> · " + esc_(opisTerminu_(ev.getStartTime(), ev.getEndTime())) + "<br>" +
    esc_(ev.getTag("imie")) + " &lt;" + esc_(ev.getTag("email")) + "&gt;</p>";
}
function mailWygasniecia_(ev) {
  return wyslijBezpiecznie_({
    to: ev.getTag("email"), replyTo: wlasciciel_(), name: USTAWIENIA.podpis,
    subject: "Termin sesji nie został potwierdzony – " + opisTerminu_(ev.getStartTime(), ev.getEndTime()),
    htmlBody: mail_("Dzień dobry, " + esc_(ev.getTag("imie")),
      "<p>Bardzo przepraszam – nie udało mi się na czas potwierdzić Twojej prośby o rezerwację:</p>" +
      "<p style='font-size:18px'><b>" + esc_(pakiet_(ev).nazwa) + "</b> · " + esc_(opisTerminu_(ev.getStartTime(), ev.getEndTime())) + "</p>" +
      "<p>Wstępna rezerwacja wygasła i termin został zwolniony. Jeśli nadal chcesz się umówić, odpowiedz proszę na tego maila " +
      "albo wybierz termin ponownie na <a href='" + USTAWIENIA.stronaWww + "#rezerwacja'>stronie</a>.</p>"),
  });
}
function mailPrzypomnienia_(ev, zaIle) {
  const kiedy = opisTerminu_(ev.getStartTime(), ev.getEndTime());
  const kiedyKrotko = zaIle === 0 ? "dziś" : zaIle === 1 ? "jutro" : "za " + zaIle + " dni";
  return wyslijBezpiecznie_({
    to: ev.getTag("email"), replyTo: wlasciciel_(), name: USTAWIENIA.podpis,
    subject: "Przypomnienie: sesja " + kiedyKrotko + " – " + kiedy,
    htmlBody: mail_("Do zobaczenia " + kiedyKrotko + "!",
      "<p>Przypominam o naszej sesji:</p>" +
      "<p style='font-size:18px'><b>" + esc_(pakiet_(ev).nazwa) + "</b> · " + esc_(kiedy) + "</p>" +
      "<p>Jeśli masz pytania albo coś się zmieniło, po prostu odpowiedz na tego maila.</p>" +
      (moznaOdwolac_(ev) ? stopkaOdwolania_(ev.getId(), ev.getTag("tokenK")) : "")),
  });
}

/* ---------------- konfiguracja (uruchom ręcznie w edytorze) ---------------- */
// ▶ konfiguruj – nadaje uprawnienia, zakłada wyzwalacz co godzinę i pokazuje w dzienniku próbne wolne terminy.
// Uruchom po pierwszym wklejeniu kodu i po każdej aktualizacji Kod.gs (nie szkodzi uruchomić kilka razy).
function konfiguruj() {
  const aktywny = Session.getActiveUser().getEmail();
  if (!aktywny || aktywny !== wlasciciel_()) throw new Error("Uruchom tę funkcję w edytorze skryptu, na koncie właściciela.");
  wczytajUstawienia_();
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === "zadaniaCykliczne")
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("zadaniaCykliczne").timeBased().everyHours(1).create();
  Logger.log("Wyzwalacz „zadaniaCykliczne” co godzinę – założony.");
  Logger.log("Strona: " + USTAWIENIA.stronaWww);
  Logger.log("Ustawienia: " + JSON.stringify(USTAWIENIA));
  const dzis = fmt_(new Date(), "yyyy-MM-dd");
  const za2tyg = fmt_(new Date(Date.now() + 14 * 86400e3), "yyyy-MM-dd");
  const pierwszy = Object.keys(USTAWIENIA.pakiety)[0];
  Logger.log("Wolne terminy (" + pierwszy + "): " + JSON.stringify(wolneTerminy_(dzis, za2tyg, pierwszy), null, 1));
  Logger.log("Maile pójdą z konta: " + wlasciciel_() + ", zostało dziś: " + MailApp.getRemainingDailyQuota());
}

/* ---------------- pomocnicze ---------------- */
function strona_(tytul, tresc) {
  return HtmlService.createHtmlOutput(
    "<style>body{font:16px/1.6 system-ui,sans-serif;color:#3f3228;background:#faf6ef;max-width:560px;margin:40px auto;padding:0 16px}" +
    "h1{font-family:Georgia,serif;font-weight:500}.duze{font-size:20px}label{display:grid;gap:6px;margin:20px 0;color:#7a6a5b}" +
    "textarea{font:inherit;padding:8px;border:1px solid #d9c4a6;border-radius:4px}.btns{display:flex;gap:12px;flex-wrap:wrap}" +
    "button,.btn{font:inherit;padding:12px 22px;border:0;border-radius:4px;background:#5f6b4e;color:#fff;cursor:pointer;text-decoration:none}" +
    "button.no{background:#a2412c}button:disabled{opacity:.5}a{color:#7d5536}a.btn{color:#fff}</style>" + tresc)
    .setTitle(tytul)
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}
function przyciskDecyzji_(id, token, napis) {
  const link = ScriptApp.getService().getUrl() + "?akcja=decyzja&id=" + encodeURIComponent(id) + "&t=" + encodeURIComponent(token);
  return "<p><a href='" + esc_(link) + "' style='display:inline-block;background:#7d5536;color:#fff;padding:12px 22px;text-decoration:none;border-radius:4px'>" + napis + "</a></p>";
}
function wydarzenie_(id, token) {
  if (!id || !token) return null;
  const ev = kalendarz_(USTAWIENIA.kalendarzRezerwacji).getEventById(String(id));
  if (!ev || !ev.getTag("token") || ev.getTag("token") !== String(token)) return null;
  return ev;
}
// Pakiet rezerwacji – z ustawień, a gdy go już nie ma w cenniku: nazwa z identyfikatora.
function pakiet_(ev) {
  const id = ev.getTag("pakiet");
  return USTAWIENIA.pakiety[id] || { nazwa: "Sesja " + id, minut: Math.round((ev.getEndTime() - ev.getStartTime()) / 60e3) };
}
function kalendarz_(id) {
  return id === "primary" ? CalendarApp.getDefaultCalendar() : CalendarApp.getCalendarById(id);
}
function wlasciciel_() { return Session.getEffectiveUser().getEmail(); }
function poprawnyEmail_(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
// Wysyła maila; false zamiast wyjątku (gdy mail jest „miły, ale niekonieczny”).
function wyslijBezpiecznie_(opcje) {
  try { MailApp.sendEmail(opcje); return true; } catch (err) { console.error(err); return false; }
}
// liczniki limitów (pamięć podręczna, 24 h) – zmieniane tylko pod blokadą
function licznik_(klucz) { return Number(CacheService.getScriptCache().get(klucz) || 0); }
function zwieksz_(klucz) { CacheService.getScriptCache().put(klucz, String(licznik_(klucz) + 1), 86400); }
// Data w strefie z USTAWIEŃ (niezależnie od strefy projektu).
function data_(rrrrmmdd, gg) {
  return Utilities.parseDate(rrrrmmdd + " " + gg, USTAWIENIA.strefa, "yyyy-MM-dd HH:mm");
}
function dodajDzien_(d) { return data_(fmt_(new Date(d.getTime() + 36 * 3600e3), "yyyy-MM-dd"), "00:00"); }
function fmt_(d, wzor) { return Utilities.formatDate(d, USTAWIENIA.strefa, wzor); }
function dni_(n) { return n + (n === 1 ? " dnia" : " dni"); }
const DNI_ = ["", "poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota", "niedziela"];
const MIES_ = ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca", "sierpnia", "września", "października", "listopada", "grudnia"];
function opisTerminu_(s, k) {
  return DNI_[Number(fmt_(s, "u"))] + ", " + Number(fmt_(s, "d")) + " " + MIES_[Number(fmt_(s, "M")) - 1] + " " + fmt_(s, "yyyy") +
    ", " + fmt_(s, "HH:mm") + "–" + fmt_(k, "HH:mm");
}
// tekst z panelu: pusta linia = nowy akapit
function akapity_(t) {
  return String(t).split(/\n\s*\n/).map(p => "<p>" + esc_(p.trim()).replace(/\n/g, "<br>") + "</p>").join("");
}
function tekst_(s, max) { return String(s || "").trim().slice(0, max); }
function esc_(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function mail_(naglowek, html) {
  return "<div style='font-family:Georgia,serif;color:#3f3228;max-width:560px'>" +
    "<h2 style='font-weight:500'>" + naglowek + "</h2>" + html +
    "<p style='margin-top:28px;color:#7a6a5b'>— " + USTAWIENIA.podpis + "<br><a href='" + USTAWIENIA.stronaWww + "'>" + USTAWIENIA.stronaWww + "</a></p></div>";
}
function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
