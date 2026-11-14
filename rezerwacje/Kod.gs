/* =========================================================
   REZERWACJE SESJI – zaplecze w Google Apps Script
   ---------------------------------------------------------
   Działa na koncie Google właściciela kalendarza:
   - podaje stronie wolne terminy (bez szczegółów wydarzeń),
   - przyjmuje prośbę o rezerwację: wstępnie blokuje termin
     w Kalendarzu Google i wysyła maile,
   - właściciel potwierdza / odrzuca prośbę przyciskiem z maila.
   Instrukcja wdrożenia: rezerwacje/INSTRUKCJA.md
   ========================================================= */

const USTAWIENIA = {
  strefa: "Europe/Warsaw",
  dniPracy: [1, 2, 3, 4, 5],     // 1 = poniedziałek … 7 = niedziela
  od: "09:00",                   // pierwsza możliwa godzina rozpoczęcia
  do: "18:00",                   // sesja musi skończyć się najpóźniej o tej godzinie
  krokMinut: 30,                 // co ile minut proponować godzinę rozpoczęcia
  przerwaMinut: 60,              // wolny czas przed i po każdym wydarzeniu w kalendarzu
  najwczesniejGodzin: 48,        // najkrótszy czas od teraz do sesji
  najdalejDni: 120,              // jak daleko do przodu można rezerwować
  pakiety: {                     // muszą zgadzać się z js/config.js
    S: { nazwa: "Sesja S", minut: 30 },
    M: { nazwa: "Sesja M", minut: 50 },
    L: { nazwa: "Sesja L", minut: 90 },
  },
  // Kalendarze, których wydarzenia blokują terminy. "primary" = główny kalendarz konta.
  kalendarzeZajete: ["primary"],
  // Kalendarz, do którego trafiają rezerwacje.
  kalendarzRezerwacji: "primary",
  podpis: "Ewelina Kucharczyk · Fotografia",
  stronaWww: "https://wilczasty.github.io/kucharczyk-photo/",
};

/* ---------------- wejście: GET ---------------- */
function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.akcja === "terminy") return json_(wolneTerminy_(p.od, p.do, p.pakiet));
  if (p.akcja === "decyzja") return stronaDecyzji_(p.id, p.t);
  return json_({ ok: true, info: "Rezerwacje działają." });
}

/* ---------------- wejście: POST (prośba o rezerwację) ---------------- */
function doPost(e) {
  let d;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, blad: "dane" }); }
  if (d.strona) return json_({ ok: true });           // pułapka na boty (ukryte pole)
  return json_(zarezerwuj_(d));
}

/* ---------------- wolne terminy ---------------- */
function wolneTerminy_(odStr, doStr, pakietId) {
  const pak = USTAWIENIA.pakiety[pakietId];
  if (!pak || !/^\d{4}-\d{2}-\d{2}$/.test(odStr || "") || !/^\d{4}-\d{2}-\d{2}$/.test(doStr || "")) {
    return { ok: false, blad: "parametry" };
  }
  const teraz = new Date();
  const min = new Date(teraz.getTime() + USTAWIENIA.najwczesniejGodzin * 3600e3);
  const max = new Date(teraz.getTime() + USTAWIENIA.najdalejDni * 86400e3);
  let start = data_(odStr, "00:00");
  let koniec = new Date(data_(doStr, "00:00").getTime() + 86400e3);
  if (koniec - start > 45 * 86400e3) koniec = new Date(start.getTime() + 45 * 86400e3);

  const zajete = zajeteOkresy_(start, koniec);
  const dni = {};
  for (let dzien = new Date(start); dzien < koniec; dzien = dodajDzien_(dzien)) {
    const klucz = fmt_(dzien, "yyyy-MM-dd");
    const godziny = wolneGodzinyDnia_(klucz, pak.minut, zajete, min, max);
    if (godziny.length) dni[klucz] = godziny;
  }
  return { ok: true, dni: dni };
}

function wolneGodzinyDnia_(klucz, minut, zajete, min, max) {
  const dzienTyg = Number(fmt_(data_(klucz, "12:00"), "u"));
  if (USTAWIENIA.dniPracy.indexOf(dzienTyg) < 0) return [];
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
      wynik.push({ s: ev.getStartTime().getTime() - przerwa, k: ev.getEndTime().getTime() + przerwa });
    });
  });
  return wynik;
}

/* ---------------- rezerwacja ---------------- */
function zarezerwuj_(d) {
  const pak = USTAWIENIA.pakiety[d.pakiet];
  const imie = tekst_(d.imie, 80), email = tekst_(d.email, 120), telefon = tekst_(d.telefon, 40), uwagi = tekst_(d.uwagi, 1500);
  if (!pak || !/^\d{4}-\d{2}-\d{2}$/.test(d.data || "") || !/^\d{2}:\d{2}$/.test(d.godzina || "")) return { ok: false, blad: "dane" };
  if (!imie || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !d.zgoda) return { ok: false, blad: "dane" };

  // prosty limit: najwyżej 3 prośby z jednego adresu na dobę
  const cache = CacheService.getScriptCache();
  const kluczLimitu = "limit_" + email.toLowerCase();
  const ile = Number(cache.get(kluczLimitu) || 0);
  if (ile >= 3) return { ok: false, blad: "limit" };

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return { ok: false, blad: "zajete" };
  try {
    const start = data_(d.data, d.godzina);
    const koniec = new Date(start.getTime() + pak.minut * 60e3);
    const teraz = new Date();
    const wolne = wolneGodzinyDnia_(d.data, pak.minut,
      zajeteOkresy_(data_(d.data, "00:00"), dodajDzien_(data_(d.data, "00:00"))),
      new Date(teraz.getTime() + USTAWIENIA.najwczesniejGodzin * 3600e3),
      new Date(teraz.getTime() + USTAWIENIA.najdalejDni * 86400e3));
    if (wolne.indexOf(d.godzina) < 0) return { ok: false, blad: "termin" };

    const token = Utilities.getUuid();
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
    ev.setColor(CalendarApp.EventColor.YELLOW);
    ev.setTag("rezerwacja", "prosba");
    ev.setTag("token", token);
    ev.setTag("email", email);
    ev.setTag("imie", imie);
    ev.setTag("pakiet", d.pakiet);

    const kiedy = opisTerminu_(start, koniec);
    const link = ScriptApp.getService().getUrl() + "?akcja=decyzja&id=" + encodeURIComponent(ev.getId()) + "&t=" + token;

    MailApp.sendEmail({
      to: wlasciciel_(),
      replyTo: email,
      subject: "Nowa prośba o rezerwację: " + pak.nazwa + ", " + kiedy,
      htmlBody: mail_("Nowa prośba o rezerwację",
        "<p><b>" + esc_(imie) + "</b> prosi o termin:</p>" +
        "<p style='font-size:18px'><b>" + esc_(pak.nazwa) + "</b> · " + esc_(kiedy) + "</p>" +
        "<p>E-mail: <a href='mailto:" + esc_(email) + "'>" + esc_(email) + "</a><br>Telefon: " + esc_(telefon || "–") + "</p>" +
        "<p>Uwagi:<br>" + esc_(uwagi || "–").replace(/\n/g, "<br>") + "</p>" +
        "<p>Termin jest już wstępnie zablokowany w kalendarzu (żółte wydarzenie).</p>" +
        "<p><a href='" + link + "' style='display:inline-block;background:#7d5536;color:#fff;padding:12px 22px;text-decoration:none;border-radius:4px'>Potwierdź lub odrzuć</a></p>" +
        "<p style='color:#7a6a5b;font-size:13px'>Możesz też po prostu odpowiedzieć na tego maila – trafi do klienta.</p>"),
    });
    MailApp.sendEmail({
      to: email,
      replyTo: wlasciciel_(),
      name: USTAWIENIA.podpis,
      subject: "Otrzymałam Twoją prośbę o rezerwację – " + kiedy,
      htmlBody: mail_("Dziękuję, " + esc_(imie) + "!",
        "<p>Otrzymałam prośbę o rezerwację:</p>" +
        "<p style='font-size:18px'><b>" + esc_(pak.nazwa) + "</b> · " + esc_(kiedy) + "</p>" +
        "<p>Termin jest wstępnie zarezerwowany dla Ciebie. Potwierdzę go osobnym mailem – zwykle w ciągu 24 godzin.</p>" +
        "<p>Jeśli masz pytania, po prostu odpowiedz na tę wiadomość.</p>"),
    });

    cache.put(kluczLimitu, String(ile + 1), 86400);
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

/* ---------------- potwierdzenie / odrzucenie ---------------- */
// Link z maila otwiera stronę z przyciskami (sam link niczego nie zmienia –
// dzięki temu skanery linków w poczcie nie potwierdzą rezerwacji przypadkiem).
function stronaDecyzji_(id, token) {
  const ev = wydarzenie_(id, token);
  let tresc;
  if (!ev) {
    tresc = "<h1>Nie znaleziono prośby</h1><p>Mogła zostać już odrzucona albo usunięta z kalendarza.</p>";
  } else if (ev.getTag("rezerwacja") !== "prosba") {
    tresc = "<h1>Już rozpatrzone</h1><p>Ta rezerwacja została już potwierdzona.</p>";
  } else {
    tresc =
      "<h1>Prośba o rezerwację</h1>" +
      "<p><b>" + esc_(ev.getTag("imie")) + "</b> &lt;" + esc_(ev.getTag("email")) + "&gt;</p>" +
      "<p class='duze'>" + esc_(USTAWIENIA.pakiety[ev.getTag("pakiet")].nazwa) + " · " + esc_(opisTerminu_(ev.getStartTime(), ev.getEndTime())) + "</p>" +
      "<label>Wiadomość do klienta (opcjonalnie)<textarea id='msg' rows='4'></textarea></label>" +
      "<div class='btns'><button onclick=\"dec('tak')\">Potwierdź</button>" +
      "<button class='no' onclick=\"dec('nie')\">Odrzuć i zwolnij termin</button></div><p id='st'></p>" +
      "<script>function dec(a){if(a==='nie'&&!confirm('Na pewno odrzucić?'))return;" +
      "document.querySelectorAll('button').forEach(b=>b.disabled=true);document.getElementById('st').textContent='Zapisywanie…';" +
      "google.script.run.withSuccessHandler(t=>document.body.innerHTML='<h1>'+t+'</h1><p>Klient dostał maila. Możesz zamknąć tę kartę.</p>')" +
      ".withFailureHandler(e=>{document.getElementById('st').textContent='Błąd: '+e.message})" +
      ".decyzja(" + JSON.stringify(id) + "," + JSON.stringify(token) + ",a,document.getElementById('msg').value)}</script>";
  }
  return HtmlService.createHtmlOutput(
    "<style>body{font:16px/1.6 system-ui,sans-serif;color:#3f3228;background:#faf6ef;max-width:560px;margin:40px auto;padding:0 16px}" +
    "h1{font-family:Georgia,serif;font-weight:500}.duze{font-size:20px}label{display:grid;gap:6px;margin:20px 0;color:#7a6a5b}" +
    "textarea{font:inherit;padding:8px;border:1px solid #d9c4a6;border-radius:4px}.btns{display:flex;gap:12px;flex-wrap:wrap}" +
    "button{font:inherit;padding:12px 22px;border:0;border-radius:4px;background:#5f6b4e;color:#fff;cursor:pointer}" +
    "button.no{background:#a2412c}button:disabled{opacity:.5}</style>" + tresc)
    .setTitle("Rezerwacja – decyzja")
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

// Wywoływane z przycisków na stronie decyzji. Wymaga ważnego tokenu z maila.
function decyzja(id, token, akcja, wiadomosc) {
  const ev = wydarzenie_(id, token);
  if (!ev) throw new Error("Nie znaleziono prośby.");
  if (ev.getTag("rezerwacja") !== "prosba") return "Ta rezerwacja była już rozpatrzona";
  const pak = USTAWIENIA.pakiety[ev.getTag("pakiet")];
  const email = ev.getTag("email"), imie = ev.getTag("imie");
  const kiedy = opisTerminu_(ev.getStartTime(), ev.getEndTime());
  const dopisek = wiadomosc ? "<p>" + esc_(tekst_(wiadomosc, 2000)).replace(/\n/g, "<br>") + "</p>" : "";

  if (akcja === "tak") {
    ev.setTitle("📷 " + pak.nazwa + " – " + imie);
    ev.setColor(CalendarApp.EventColor.GREEN);
    ev.setDescription(ev.getDescription().replace(/^PROŚBA O REZERWACJĘ[^\n]*/, "POTWIERDZONA REZERWACJA"));
    ev.setTag("rezerwacja", "potwierdzona");
    MailApp.sendEmail({
      to: email, replyTo: wlasciciel_(), name: USTAWIENIA.podpis,
      subject: "Potwierdzam termin sesji – " + kiedy,
      htmlBody: mail_("Do zobaczenia, " + esc_(imie) + "!",
        "<p>Potwierdzam Twoją rezerwację:</p><p style='font-size:18px'><b>" + esc_(pak.nazwa) + "</b> · " + esc_(kiedy) + "</p>" +
        dopisek + "<p>Szczegóły i miejsce sesji ustalimy mailowo lub telefonicznie.</p>"),
    });
    return "Rezerwacja potwierdzona ✔";
  }
  ev.deleteEvent();
  MailApp.sendEmail({
    to: email, replyTo: wlasciciel_(), name: USTAWIENIA.podpis,
    subject: "Rezerwacja terminu " + kiedy,
    htmlBody: mail_("Dzień dobry, " + esc_(imie),
      "<p>Niestety nie mogę przyjąć rezerwacji w terminie <b>" + esc_(kiedy) + "</b>.</p>" + dopisek +
      "<p>Zapraszam do wyboru innego terminu na <a href='" + USTAWIENIA.stronaWww + "#rezerwacja'>stronie</a> albo do kontaktu mailowego.</p>"),
  });
  return "Prośba odrzucona, termin zwolniony";
}

/* ---------------- pomocnicze ---------------- */
function wydarzenie_(id, token) {
  if (!id || !token) return null;
  const ev = kalendarz_(USTAWIENIA.kalendarzRezerwacji).getEventById(id);
  if (!ev || ev.getTag("token") !== token) return null;
  return ev;
}
function kalendarz_(id) {
  return id === "primary" ? CalendarApp.getDefaultCalendar() : CalendarApp.getCalendarById(id);
}
function wlasciciel_() { return Session.getEffectiveUser().getEmail(); }
// Data w strefie z USTAWIEŃ (niezależnie od strefy projektu).
function data_(rrrrmmdd, gg) {
  return Utilities.parseDate(rrrrmmdd + " " + gg, USTAWIENIA.strefa, "yyyy-MM-dd HH:mm");
}
function dodajDzien_(d) { return data_(fmt_(new Date(d.getTime() + 36 * 3600e3), "yyyy-MM-dd"), "00:00"); }
function fmt_(d, wzor) { return Utilities.formatDate(d, USTAWIENIA.strefa, wzor); }
const DNI_ = ["", "poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota", "niedziela"];
const MIES_ = ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca", "sierpnia", "września", "października", "listopada", "grudnia"];
function opisTerminu_(s, k) {
  return DNI_[Number(fmt_(s, "u"))] + ", " + Number(fmt_(s, "d")) + " " + MIES_[Number(fmt_(s, "M")) - 1] + " " + fmt_(s, "yyyy") +
    ", " + fmt_(s, "HH:mm") + "–" + fmt_(k, "HH:mm");
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

// Uruchom raz ręcznie w edytorze (▶ test), żeby nadać uprawnienia i sprawdzić działanie.
function test() {
  const dzis = fmt_(new Date(), "yyyy-MM-dd");
  const zaTydzien = fmt_(new Date(Date.now() + 14 * 86400e3), "yyyy-MM-dd");
  Logger.log(JSON.stringify(wolneTerminy_(dzis, zaTydzien, "M"), null, 1));
  Logger.log("Maile pójdą z konta: " + wlasciciel_());
}
