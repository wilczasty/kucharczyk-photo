/* =========================================================
   Strona decyzji dla Eweliny (decyzja.html?id=…&t=…) – link „Potwierdź lub odrzuć” z maila o nowej prośbie.
   Ten sam link później pozwala odwołać potwierdzoną sesję. Dane: skrypt Google (rezerwacje/Kod.gs).
   Podgląd bez skryptu: decyzja.html?demo=prosba | potwierdzona | odbyla | brak
   ========================================================= */
(function () {
  const cfg = window.SITE_CONFIG || {};
  const { esc } = window.EK;
  const box = document.getElementById("decyzja");
  const q = new URLSearchParams(location.search);
  const id = q.get("id"), t = q.get("t"), demo = q.get("demo");
  const pokaz = html => { box.innerHTML = html; const h = box.querySelector("h1"); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); } };

  async function info() {
    if (demo) return { ok: true, stan: demo, imie: "Anna Przykładowa", email: "anna@example.com", pakiet: "Sesja standard", kiedy: "piątek, 12 grudnia 2026, 10:00–10:50" };
    const res = await fetch(`${cfg.rezerwacjeUrl}?akcja=infoDecyzji&id=${encodeURIComponent(id)}&t=${encodeURIComponent(t)}`);
    return res.json();
  }
  async function wyslij(decyzja, wiadomosc) {
    if (demo) { await new Promise(r => setTimeout(r, 700)); return { ok: true, komunikat: { tak: "Rezerwacja potwierdzona ✔", nie: "Prośba odrzucona, termin zwolniony", odwolaj: "Sesja odwołana, termin zwolniony" }[decyzja] }; }
    const res = await fetch(cfg.rezerwacjeUrl, { method: "POST", body: JSON.stringify({ akcja: "decyzja", id, t, decyzja, wiadomosc }) }); // text/plain – bez preflight CORS
    return res.json();
  }

  const klient = r => `<p><b>${esc(r.imie)}</b> · <a href="mailto:${esc(r.email)}">${esc(r.email)}</a></p>
    <p class="odw__termin"><b>${esc(r.pakiet)}</b> · ${esc(r.kiedy)}</p>`;

  async function start() {
    if (!demo && (!id || !t || !cfg.rezerwacjeUrl)) {
      return pokaz(`<h1>Nieprawidłowy link</h1><p>Link jest niepełny – otwórz go jeszcze raz z maila.</p>`);
    }
    let r;
    try { r = await info(); } catch (e) { r = { ok: false }; }
    if (!r.ok) return pokaz(`<h1>Coś poszło nie tak</h1><p>Nie udało się wczytać rezerwacji. Odśwież stronę za chwilę.</p>`);
    if (r.stan === "brak") return pokaz(`<h1>Nie znaleziono rezerwacji</h1><p>Mogła zostać już odrzucona, odwołana albo usunięta z kalendarza.</p>`);
    if (r.stan === "odbyla") return pokaz(`<h1>Sesja już się odbyła</h1>${klient(r)}`);

    const prosba = r.stan === "prosba";
    pokaz(prosba
      ? `<h1>Prośba o rezerwację</h1>${klient(r)}
        <form class="form" novalidate>
          <label>Wiadomość do klienta (opcjonalnie)<textarea name="wiadomosc" rows="4" maxlength="2000"></textarea></label>
          <div class="odw__btns">
            <button type="submit" class="btn btn--ok" value="tak">Potwierdź</button>
            <button type="submit" class="btn btn--warn" value="nie">Odrzuć i zwolnij termin</button>
          </div>
          <p class="form__status" role="status"></p>
        </form>`
      : `<h1>Potwierdzona sesja</h1>${klient(r)}
        <p>Musisz odwołać tę sesję (choroba, pogoda, inny powód)? Klient dostanie maila z Twoją wiadomością, a termin zwolni się na stronie.</p>
        <form class="form" novalidate>
          <label>Wiadomość do klienta (np. propozycja innego terminu)<textarea name="wiadomosc" rows="4" maxlength="2000"></textarea></label>
          <div class="odw__btns"><button type="submit" class="btn btn--warn" value="odwolaj">Odwołaj sesję</button></div>
          <p class="form__status" role="status"></p>
        </form>`);

    const f = box.querySelector("form"), status = f.querySelector(".form__status"), btns = f.querySelectorAll("button");
    f.addEventListener("submit", async e => {
      e.preventDefault();
      const decyzja = e.submitter?.value || (prosba ? "tak" : "odwolaj");
      if (decyzja === "nie" && !confirm("Na pewno odrzucić prośbę?")) return;
      if (decyzja === "odwolaj" && !confirm("Na pewno odwołać sesję? Klient dostanie maila.")) return;
      btns.forEach(b => b.disabled = true);
      status.className = "form__status";
      status.textContent = "Zapisywanie…";
      let w;
      try { w = await wyslij(decyzja, f.wiadomosc.value); } catch (err) { w = { ok: false, komunikat: "Brak połączenia – spróbuj ponownie." }; }
      if (w.ok) {
        return pokaz(`<h1>${esc(w.komunikat)}</h1>${klient(r)}
          <p>${decyzja === "tak" ? "Klient dostał maila z potwierdzeniem. Ten sam link z maila pozwoli później odwołać sesję, gdyby była taka potrzeba." : "Klient dostał maila."}
          Możesz zamknąć tę kartę.</p>`);
      }
      btns.forEach(b => b.disabled = false);
      status.textContent = "Błąd: " + (w.komunikat || "coś poszło nie tak – spróbuj ponownie.");
      status.classList.add("err");
    });
  }
  start();
})();
