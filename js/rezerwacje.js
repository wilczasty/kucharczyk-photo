/* =========================================================
   Własny kalendarz rezerwacji (zamiast cal.com).
   Wolne terminy i zapis – skrypt Google Apps Script (rezerwacje/Kod.gs),
   adres w js/config.js → rezerwacjeUrl.
   Podgląd bez skryptu: adres strony + ?rezerwacje=demo
   ========================================================= */
window.initRezerwacje = function (root, cfg) {
  const demo = new URLSearchParams(location.search).get("rezerwacje") === "demo";
  const api = cfg.rezerwacjeUrl;
  const pakiety = cfg.pakiety || [];
  if (!pakiety.length) return false;

  const MIES = ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"];
  const MIES_D = ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca", "sierpnia", "września", "października", "listopada", "grudnia"];
  const DNI = ["niedziela", "poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota"];
  const pad = n => String(n).padStart(2, "0");
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const koniecGodz = (g, min) => { const [h, m] = g.split(":").map(Number); const t = h * 60 + m + min; return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`; };
  const opisDnia = k => { const d = new Date(k + "T12:00"); return `${DNI[d.getDay()]}, ${d.getDate()} ${MIES_D[d.getMonth()]}`; };

  const dzis = new Date();
  const pierwszyMies = new Date(dzis.getFullYear(), dzis.getMonth(), 1);
  const ostatniMies = new Date(dzis.getFullYear(), dzis.getMonth() + 4, 1);
  const st = {
    pak: pakiety[Math.min(1, pakiety.length - 1)],   // domyślnie środkowy (M)
    mies: new Date(pierwszyMies),
    dzien: null, godz: null, widok: "godziny",
  };
  const cache = {};

  /* ---------- dane ---------- */
  async function pobierz(pak, mies) {
    const klucz = `${pak.id}|${iso(mies)}`;
    if (cache[klucz]) return cache[klucz];
    const od = iso(mies), doD = iso(new Date(mies.getFullYear(), mies.getMonth() + 1, 0));
    let wynik;
    if (demo) wynik = await demoTerminy(pak, mies);
    else {
      const res = await fetch(`${api}?akcja=terminy&pakiet=${encodeURIComponent(pak.id)}&od=${od}&do=${doD}`);
      wynik = await res.json();
      if (!wynik.ok) throw new Error(wynik.blad);
    }
    return (cache[klucz] = wynik.dni || {});
  }
  async function wyslij(dane) {
    if (demo) { await new Promise(r => setTimeout(r, 700)); return { ok: true }; }
    const res = await fetch(api, { method: "POST", body: JSON.stringify(dane) }); // text/plain – bez preflight CORS
    return res.json();
  }
  function demoTerminy(pak, mies) {
    // przykładowe dane: pon–pt 9–18, część godzin „zajęta”
    const dni = {};
    const min = new Date(Date.now() + 48 * 3600e3);
    for (let d = new Date(mies); d.getMonth() === mies.getMonth(); d.setDate(d.getDate() + 1)) {
      if (d.getDay() === 0 || d.getDay() === 6) continue;
      const godz = [];
      const seed = d.getDate() * 7 + d.getMonth();
      for (let t = 9 * 60; t + pak.minut <= 18 * 60; t += 30) {
        const s = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, t);
        if (s < min) continue;
        if ((seed + Math.floor(t / 120)) % 3 === 0) continue;
        godz.push(`${pad(Math.floor(t / 60))}:${pad(t % 60)}`);
      }
      if (seed % 5 === 0) continue;
      if (godz.length) dni[iso(d)] = godz;
    }
    return new Promise(r => setTimeout(() => r({ ok: true, dni }), 400));
  }

  /* ---------- szkielet ---------- */
  root.classList.add("rez");
  root.innerHTML = `
    ${demo ? '<p class="rez__demo">Podgląd z przykładowymi terminami – nic nie zostanie zapisane.</p>' : ""}
    <div class="rez__pak" role="radiogroup" aria-label="Pakiet">
      ${pakiety.map(p => `<button type="button" role="radio" data-pak="${esc(p.id)}">
        <b>${esc(p.nazwa)}</b><span>${p.minut} min${p.cena ? " · " + esc(p.cena) : ""}</span></button>`).join("")}
    </div>
    <div class="rez__grid">
      <div class="rez__cal">
        <div class="rez__head">
          <button type="button" class="rez__nav" data-dir="-1" aria-label="Poprzedni miesiąc">‹</button>
          <h3 class="rez__month" aria-live="polite"></h3>
          <button type="button" class="rez__nav" data-dir="1" aria-label="Następny miesiąc">›</button>
        </div>
        <div class="rez__week">${["pn", "wt", "śr", "cz", "pt", "sb", "nd"].map(d => `<span>${d}</span>`).join("")}</div>
        <div class="rez__days"></div>
        <div class="rez__loader" role="status"><span aria-hidden="true"></span>wczytuję wolne terminy…</div>
        <p class="rez__legend"><i></i> wolne terminy</p>
      </div>
      <div class="rez__side" aria-live="polite"></div>
    </div>`;
  const $ = s => root.querySelector(s);

  root.querySelectorAll("[data-pak]").forEach(b => b.addEventListener("click", () => {
    st.pak = pakiety.find(p => p.id === b.dataset.pak);
    st.godz = null; st.widok = "godziny";
    rysuj();
  }));
  root.querySelectorAll(".rez__nav").forEach(b => b.addEventListener("click", () => {
    st.mies = new Date(st.mies.getFullYear(), st.mies.getMonth() + Number(b.dataset.dir), 1);
    st.dzien = null; st.godz = null; st.widok = "godziny";
    rysuj();
  }));

  /* ---------- rysowanie ---------- */
  let wersja = 0;
  async function rysuj() {
    root.querySelectorAll("[data-pak]").forEach(b => {
      const on = b.dataset.pak === st.pak.id;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-checked", on);
    });
    $(".rez__month").textContent = `${MIES[st.mies.getMonth()]} ${st.mies.getFullYear()}`;
    $('[data-dir="-1"]').disabled = st.mies <= pierwszyMies;
    $('[data-dir="1"]').disabled = st.mies >= ostatniMies;

    const moja = ++wersja;
    const days = $(".rez__days");
    const cal = $(".rez__cal");
    cal.classList.add("is-loading");
    if (!cache[`${st.pak.id}|${iso(st.mies)}`] && st.widok !== "formularz") {
      boczny(`<p class="rez__hint">Sprawdzam wolne terminy dla pakietu ${esc(st.pak.nazwa)}…</p>`);
    }
    let dni;
    try {
      dni = await pobierz(st.pak, st.mies);
    } catch (e) {
      if (moja !== wersja) return;
      cal.classList.remove("is-loading");
      days.innerHTML = "";
      boczny(`<p class="rez__hint rez__err">Nie udało się wczytać wolnych terminów. Odśwież stronę za chwilę albo <a href="#kontakt">napisz do mnie</a>.</p>`);
      return;
    }
    if (moja !== wersja) return;
    cal.classList.remove("is-loading");

    // siatka miesiąca, tydzień od poniedziałku
    const pierwszy = (st.mies.getDay() + 6) % 7;
    const ileDni = new Date(st.mies.getFullYear(), st.mies.getMonth() + 1, 0).getDate();
    let html = "<span></span>".repeat(pierwszy);
    for (let d = 1; d <= ileDni; d++) {
      const k = iso(new Date(st.mies.getFullYear(), st.mies.getMonth(), d));
      const wolne = dni[k];
      if (st.dzien === k && !wolne) st.dzien = null;
      html += wolne
        ? `<button type="button" data-dzien="${k}" class="${st.dzien === k ? "is-active" : ""}" aria-pressed="${st.dzien === k}"
             aria-label="${opisDnia(k)}, wolnych godzin: ${wolne.length}">${d}</button>`
        : `<span class="is-off">${d}</span>`;
    }
    days.innerHTML = html;
    days.querySelectorAll("[data-dzien]").forEach(b => b.addEventListener("click", () => {
      st.dzien = b.dataset.dzien; st.godz = null; st.widok = "godziny";
      rysuj();
      if (matchMedia("(max-width: 760px)").matches) $(".rez__side").scrollIntoView({ behavior: "smooth", block: "start" });
    }));

    if (st.widok === "formularz" && st.dzien && st.godz) return formularz();
    if (!Object.keys(dni).length) {
      return boczny(`<p class="rez__hint">W tym miesiącu nie ma już wolnych terminów dla pakietu ${esc(st.pak.nazwa)}.
        <br>Sprawdź następny miesiąc ›</p>`);
    }
    if (!st.dzien) return boczny(`<p class="script">wybierz dzień</p><p class="rez__hint">Podświetlone dni mają wolne godziny.</p>`);
    boczny(`
      <p class="rez__day">${opisDnia(st.dzien)}</p>
      <p class="rez__hint">${esc(st.pak.nazwa)} · ${st.pak.minut} min. Wybierz godzinę rozpoczęcia:</p>
      <div class="rez__times">${dni[st.dzien].map(g => `<button type="button" data-godz="${g}">${g}</button>`).join("")}</div>`);
    root.querySelectorAll("[data-godz]").forEach(b => b.addEventListener("click", () => {
      st.godz = b.dataset.godz; st.widok = "formularz";
      formularz();
    }));
  }

  function boczny(html) { $(".rez__side").innerHTML = html; }

  function formularz() {
    boczny(`
      <button type="button" class="rez__back">‹ zmień godzinę</button>
      <p class="rez__day">${opisDnia(st.dzien)}, ${st.godz}–${koniecGodz(st.godz, st.pak.minut)}</p>
      <p class="rez__hint">${esc(st.pak.nazwa)} · ${st.pak.minut} min${st.pak.cena ? " · " + esc(st.pak.cena) : ""}</p>
      <form class="form rez__form" novalidate>
        <label>Imię<input type="text" name="imie" required autocomplete="name" maxlength="80"></label>
        <label>E-mail<input type="email" name="email" required autocomplete="email" maxlength="120"></label>
        <label>Telefon (opcjonalnie)<input type="tel" name="telefon" autocomplete="tel" maxlength="40"></label>
        <label>Rodzaj sesji, pomysły, miejsce<textarea name="uwagi" rows="3" maxlength="1500"></textarea></label>
        <label class="rez__trap" aria-hidden="true">Strona www<input type="text" name="strona" tabindex="-1" autocomplete="off"></label>
        <label class="form__check"><input type="checkbox" name="zgoda" required>
          <span>Wyrażam zgodę na przetwarzanie moich danych w celu rezerwacji sesji. Szczegóły w <a href="polityka-prywatnosci.html" target="_blank">polityce prywatności</a>.</span></label>
        <button type="submit" class="btn">Wyślij prośbę o rezerwację</button>
        <p class="form__status" role="status"></p>
      </form>`);
    $(".rez__back").addEventListener("click", () => { st.widok = "godziny"; st.godz = null; rysuj(); });
    const f = $(".rez__form"), status = f.querySelector(".form__status"), btn = f.querySelector(".btn");
    f.addEventListener("submit", async e => {
      e.preventDefault();
      status.className = "form__status";
      if (!f.checkValidity()) {
        status.textContent = "Uzupełnij imię, poprawny e-mail i zaznacz zgodę.";
        status.classList.add("err");
        return;
      }
      const d = Object.fromEntries(new FormData(f));
      Object.assign(d, { zgoda: true, pakiet: st.pak.id, data: st.dzien, godzina: st.godz });
      btn.disabled = true;
      status.textContent = "Wysyłanie…";
      let wynik;
      try { wynik = await wyslij(d); } catch (err) { wynik = { ok: false, blad: "siec" }; }
      btn.disabled = false;
      if (wynik.ok) {
        Object.keys(cache).forEach(k => delete cache[k]);
        st.widok = "godziny";
        boczny(`
          <p class="script">dziękuję!</p>
          <p class="rez__day">${opisDnia(d.data)}, ${d.godzina}–${koniecGodz(d.godzina, st.pak.minut)}</p>
          <p>Prośba o rezerwację została wysłana, a termin jest wstępnie zablokowany dla Ciebie.
          Na <b>${esc(d.email)}</b> przyszło potwierdzenie otrzymania prośby – a ja potwierdzę termin osobnym mailem, zwykle w ciągu 24 godzin.</p>`);
        st.dzien = null; st.godz = null;
        return;
      }
      const KOMUNIKATY = {
        termin: "Ktoś właśnie zarezerwował ten termin. Wybierz proszę inną godzinę.",
        limit: "Z tego adresu wysłano już kilka próśb. Napisz do mnie bezpośrednio, chętnie pomogę.",
        dane: "Sprawdź proszę wpisane dane.",
      };
      status.textContent = KOMUNIKATY[wynik.blad] || "Ups, coś poszło nie tak. Spróbuj ponownie albo napisz do mnie maila.";
      status.classList.add("err");
      if (wynik.blad === "termin") {
        delete cache[`${st.pak.id}|${iso(st.mies)}`];
        setTimeout(() => { st.widok = "godziny"; st.godz = null; rysuj(); }, 2500);
      }
    });
    f.querySelector('[name="imie"]').focus({ preventScroll: true });
  }

  rysuj();
  return true;
};
