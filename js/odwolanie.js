/* =========================================================
   Strona odwołania rezerwacji (odwolanie.html?id=…&t=…).
   Link jest w mailach do klienta; dane pobiera ze skryptu Google (rezerwacje/Kod.gs).
   Podgląd bez skryptu: odwolanie.html?demo=ok | zaPozno | brak
   ========================================================= */
(function () {
  const cfg = window.SITE_CONFIG || {};
  const { esc } = window.EK;
  const box = document.getElementById("odwolanie");
  const q = new URLSearchParams(location.search);
  const id = q.get("id"), t = q.get("t"), demo = q.get("demo");
  const mail = (cfg.contact || {}).email;
  const doMnie = mail ? `napisz na <a href="mailto:${esc(mail)}">${esc(mail)}</a> albo odpowiedz` : "odpowiedz";
  const pokaz = html => { box.innerHTML = html; const h = box.querySelector("h1"); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); } };
  const termin = r => `<p class="odw__termin"><b>${esc(r.pakiet)}</b> · ${esc(r.kiedy)}</p>`;
  const rezerwuj = `<a href="./#rezerwacja">wybrać nowy termin</a>`;

  async function info() {
    if (demo) return { ok: true, stan: demo, pakiet: "Sesja standard", kiedy: "piątek, 12 grudnia 2026, 10:00–10:50", najpozniej: 48, potwierdzona: true };
    const res = await fetch(`${cfg.rezerwacjeUrl}?akcja=info&id=${encodeURIComponent(id)}&t=${encodeURIComponent(t)}`);
    return res.json();
  }
  async function odwolaj(powod) {
    if (demo) { await new Promise(r => setTimeout(r, 700)); return { ok: true }; }
    const res = await fetch(cfg.rezerwacjeUrl, { method: "POST", body: JSON.stringify({ akcja: "odwolaj", id, t, powod }) }); // text/plain – bez preflight CORS
    return res.json();
  }

  const BLEDY = {
    brak: "Ta rezerwacja została już odwołana albo odrzucona.",
    zaPozno: "Do sesji zostało za mało czasu, żeby odwołać ją online.",
    poczta: "Nie udało się wysłać powiadomienia – spróbuj proszę za kilka godzin albo napisz maila.",
    zajete: "Serwer jest chwilowo zajęty – spróbuj ponownie za chwilę.",
  };

  async function start() {
    if (!demo && (!id || !t || !cfg.rezerwacjeUrl)) {
      return pokaz(`<h1>Nieprawidłowy link</h1><p>Link do odwołania jest niepełny. Otwórz go jeszcze raz z maila – a jeśli to nie pomoże, ${doMnie} na maila z potwierdzeniem rezerwacji.</p>`);
    }
    let r;
    try { r = await info(); } catch (e) { r = { ok: false }; }
    if (!r.ok) {
      return pokaz(`<h1>Coś poszło nie tak</h1><p>Nie udało się wczytać rezerwacji. Odśwież stronę za chwilę albo ${doMnie} na maila z potwierdzeniem.</p>`);
    }
    if (r.stan === "brak") {
      return pokaz(`<h1>Rezerwacja nieaktualna</h1><p>${BLEDY.brak}</p><p>Możesz ${rezerwuj} na stronie.</p>`);
    }
    if (r.stan === "zaPozno") {
      return pokaz(`<h1>Nie da się już odwołać online</h1>${termin(r)}
        <p>Rezerwację można odwołać online najpóźniej ${Number(r.najpozniej)} godz. przed sesją. ${doMnie[0].toUpperCase() + doMnie.slice(1)} na maila z potwierdzeniem – na pewno coś ustalimy.</p>`);
    }
    pokaz(`<h1>Odwołanie rezerwacji</h1>${termin(r)}
      <p>Chcesz przełożyć sesję? Odwołaj ten termin i ${rezerwuj} na stronie albo po prostu odpowiedz na maila – ustalimy coś razem.</p>
      <form class="form" novalidate>
        <label>Powód (opcjonalnie)<textarea name="powod" rows="3" maxlength="1000"></textarea></label>
        <button type="submit" class="btn btn--warn">Tak, odwołuję rezerwację</button>
        <p class="form__status" role="status"></p>
      </form>`);
    const f = box.querySelector("form"), btn = f.querySelector("button"), status = f.querySelector(".form__status");
    f.addEventListener("submit", async e => {
      e.preventDefault();
      btn.disabled = true;
      status.className = "form__status";
      status.textContent = "Odwołuję…";
      let w;
      try { w = await odwolaj(f.powod.value); } catch (err) { w = { ok: false }; }
      if (w.ok) {
        return pokaz(`<h1>Rezerwacja odwołana</h1>${termin(r)}<p>Wysłałam potwierdzenie na Twojego maila. Jeśli zechcesz, możesz ${rezerwuj}.</p>`);
      }
      if (w.blad === "brak" || w.blad === "zaPozno") return start();
      btn.disabled = false;
      status.textContent = BLEDY[w.blad] || "Ups, coś poszło nie tak. Spróbuj ponownie albo napisz maila.";
      status.classList.add("err");
    });
  }
  start();
})();
