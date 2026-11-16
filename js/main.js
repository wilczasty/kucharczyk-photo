(() => {
  const cfg = window.SITE_CONFIG || {};
  const $ = (s, el = document) => el.querySelector(s);
  const { esc, https, MIES_D, MIES_KR, DNI } = window.EK;   // js/wspolne.js
  // każda część strony osobno – błąd w jednej (np. w wydarzeniach) nie wyłącza pozostałych
  const czesc = (nazwa, fn) => { try { fn(); } catch (e) { console.error(`[${nazwa}]`, e); } };

  /* ---------- formularz kontaktowy – podpięty jako pierwszy, żeby nigdy nie wysłał się „po staremu” ---------- */
  czesc("formularz", () => {
    const form = $("#contact-form");
    const status = $("#form-status");
    const btn = form.querySelector('button[type="submit"]');
    form.addEventListener("submit", async e => {
      e.preventDefault();
      status.className = "form__status";
      if (!form.checkValidity()) {
        status.textContent = "Uzupełnij wszystkie pola i zaznacz zgodę.";
        status.classList.add("err");
        form.querySelector(":invalid")?.focus();
        return;
      }
      if (!cfg.rezerwacjeUrl) {
        status.textContent = "Formularz nie jest jeszcze skonfigurowany (brak adresu skryptu rezerwacjeUrl w js/config.js).";
        status.classList.add("err");
        return;
      }
      const f = Object.fromEntries(new FormData(form));
      const dane = {
        akcja: "kontakt",
        imie: f.name, email: f.email, rodzaj: f.session_type, wiadomosc: f.message,
        zgoda: !!f.rodo, strona: f.strona || "",
      };
      status.textContent = "Wysyłanie…";
      btn.disabled = true;
      try {
        // text/plain – bez preflight CORS (Apps Script go nie obsługuje)
        const res = await fetch(cfg.rezerwacjeUrl, { method: "POST", body: JSON.stringify(dane) });
        const json = await res.json();
        if (!json.ok) throw new Error(json.blad || "błąd");
        form.reset();
        status.textContent = "Dziękuję! Wiadomość wysłana – potwierdzenie przyjdzie na Twojego maila.";
        status.classList.add("ok");
      } catch (err) {
        status.textContent = {
          limit: "Wysłano już kilka wiadomości z tego adresu – napisz proszę bezpośrednio na maila.",
          poczta: "Formularz chwilowo nie może wysłać wiadomości – napisz proszę bezpośrednio na maila albo spróbuj jutro.",
        }[err.message] || "Ups, coś poszło nie tak. Napisz proszę bezpośrednio na maila.";
        status.classList.add("err");
      } finally {
        btn.disabled = false;
      }
    });
  });

  /* ---------- nawigacja ---------- */
  czesc("nawigacja", () => {
    const nav = $("#nav");
    const toggle = $(".nav__toggle");
    const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    const setOpen = open => {
      nav.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", open);
      document.body.style.overflow = open ? "hidden" : "";
    };
    toggle.addEventListener("click", () => setOpen(!nav.classList.contains("is-open")));
    $("#menu").addEventListener("click", e => { if (e.target.closest("a")) setOpen(false); });
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && nav.classList.contains("is-open")) { setOpen(false); toggle.focus(); }
    });
  });

  /* ---------- animacje przy przewijaniu ---------- */
  let io = null;
  czesc("animacje", () => {
    if (!("IntersectionObserver" in window)) { document.documentElement.classList.remove("js"); return; }
    io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll(".reveal").forEach(el => io.observe(el));
  });
  const reveal = root => root.querySelectorAll(".reveal").forEach(el => (io ? io.observe(el) : el.classList.add("is-visible")));

  /* ---------- portfolio + filtry + lightbox ---------- */
  czesc("portfolio", () => {
    const photos = window.PORTFOLIO || [];
    const cats = window.CATEGORIES || {};
    const gallery = $("#gallery");
    const filters = $("#filters");
    const more = $("#gallery-more");
    const NA_START = 12;          // w „Wszystkie” najpierw tyle zdjęć, reszta po „Pokaż więcej”
    let visible = photos;
    let shown = 0;

    const addFilter = (key, label) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      b.dataset.cat = key;
      b.setAttribute("aria-pressed", key === "all");
      filters.appendChild(b);
    };
    addFilter("all", "Wszystkie");
    Object.entries(cats).forEach(([k, v]) => {
      if (photos.some(p => p.category === k)) addFilter(k, v);
    });

    const addItems = upTo => {
      visible.slice(shown, upTo).forEach((p, j) => {
        const i = shown + j;
        // link do pełnego zdjęcia: działa z klawiatury (Tab + Enter), a bez JavaScriptu po prostu otwiera zdjęcie
        const a = document.createElement("a");
        a.className = "gallery__item";
        a.href = p.src;
        a.dataset.i = i;
        a.style.animationDelay = `${Math.min(j, 8) * 60}ms`;
        const img = document.createElement("img");
        img.src = p.thumb || p.src;
        img.alt = p.alt || p.caption || "Zdjęcie z portfolio – powiększ";
        if (p.w && p.h) { img.width = p.w; img.height = p.h; }   // miejsce zarezerwowane – kolumny nie skaczą przy ładowaniu
        img.loading = "lazy";
        img.decoding = "async";
        a.appendChild(img);
        if (p.caption) {
          const cap = document.createElement("span");
          cap.className = "gallery__caption";
          cap.textContent = p.caption;
          a.appendChild(cap);
        }
        gallery.appendChild(a);
      });
      shown = Math.min(upTo, visible.length);
      more.hidden = shown >= visible.length;
    };
    const render = cat => {
      visible = cat === "all" ? photos : photos.filter(p => p.category === cat);
      gallery.innerHTML = "";
      shown = 0;
      // kilka zdjęć ponad limit pokazujemy od razu – przycisk dla 2–3 zdjęć nie ma sensu
      addItems(visible.length > NA_START + 3 ? NA_START : visible.length);
    };
    filters.addEventListener("click", e => {
      const b = e.target.closest("button");
      if (!b) return;
      filters.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b));
      render(b.dataset.cat);
    });
    $("button", more).addEventListener("click", () => {
      const first = shown;
      addItems(visible.length);
      gallery.querySelector(`[data-i="${first}"]`)?.focus();
    });
    render("all");

    /* lightbox */
    const lb = $("#lightbox");
    const lbImg = $("img", lb);
    const lbCap = $(".lightbox__caption", lb);
    let idx = 0;
    let opener = null;
    const show = i => {
      idx = (i + visible.length) % visible.length;
      const p = visible[idx];
      lbImg.src = p.src;
      lbImg.alt = p.alt || p.caption || `Zdjęcie ${idx + 1} z ${visible.length}`;
      lbCap.textContent = p.caption || "";
    };
    const open = (i, from) => {
      opener = from || null;
      show(i);
      lb.hidden = false;
      document.body.style.overflow = "hidden";
      $(".lightbox__close", lb).focus();
    };
    const close = () => {
      lb.hidden = true;
      document.body.style.overflow = "";
      // fokus wraca na zdjęcie, które było ostatnio oglądane (albo to, z którego otwarto podgląd)
      const back = gallery.querySelector(`[data-i="${idx}"]`) || opener;
      back?.focus();
    };
    gallery.addEventListener("click", e => {
      const a = e.target.closest(".gallery__item");
      if (!a || e.ctrlKey || e.metaKey || e.shiftKey || e.button > 0) return;   // ctrl+klik = nowa karta
      e.preventDefault();
      open(+a.dataset.i, a);
    });
    $(".lightbox__close", lb).addEventListener("click", close);
    $(".lightbox__prev", lb).addEventListener("click", e => { e.stopPropagation(); show(idx - 1); });
    $(".lightbox__next", lb).addEventListener("click", e => { e.stopPropagation(); show(idx + 1); });
    lb.addEventListener("click", e => { if (e.target === lb || e.target.classList.contains("lightbox__fig")) close(); });
    document.addEventListener("keydown", e => {
      if (lb.hidden) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") show(idx - 1);
      else if (e.key === "ArrowRight") show(idx + 1);
      else if (e.key === "Tab") {         // fokus zostaje w podglądzie
        const btns = [...lb.querySelectorAll("button")];
        const at = btns.indexOf(document.activeElement);
        e.preventDefault();
        btns[(at + (e.shiftKey ? -1 : 1) + btns.length) % btns.length].focus();
      }
    });
    let touchX = null;
    lb.addEventListener("touchstart", e => { touchX = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener("touchend", e => {
      if (touchX === null) return;
      const dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1));
      touchX = null;
    });
  });

  /* ---------- wydarzenia ---------- */
  czesc("wydarzenia", () => {
    const evSection = $("#wydarzenia");
    const evList = $("#events-list");
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const upcoming = (window.WYDARZENIA || [])
      .map(e => ({ ...e, d: new Date(e.data + "T00:00:00") }))
      .filter(e => !isNaN(e.d) && e.d >= today)
      .sort((a, b) => a.d - b.d);
    const KADR = { srodek: 1, gora: 1, dol: 1, cale: 1 };   // pole „Kadrowanie zdjęcia” z panelu
    const pad = n => String(n).padStart(2, "0");
    const gcalLink = e => {
      const ymd = e.data.replace(/-/g, "");
      const t = h => h.replace(":", "") + "00";
      // bez godziny zakończenia przyjmujemy 2 godziny (inaczej Kalendarz Google robi wydarzenie „zero minut”)
      const koniec = h => { const [g, m] = h.split(":").map(Number); return `${pad(Math.min(g + 2, 23))}:${pad(g + 2 > 23 ? 59 : m)}`; };
      const dates = e.od ? `${ymd}T${t(e.od)}/${ymd}T${t(e.do || koniec(e.od))}` : `${ymd}/${ymd}`;
      const q = new URLSearchParams({ action: "TEMPLATE", text: e.tytul, dates, details: e.opis || "", location: e.miejsce || "", ctz: "Europe/Warsaw" });
      return `https://calendar.google.com/calendar/render?${q}`;
    };
    if (!upcoming.length) return;
    evSection.hidden = false;
    document.querySelectorAll("[data-events-link]").forEach(a => (a.hidden = false));
    upcoming.forEach((e, i) => {
      const dzien = `${DNI[e.d.getDay()]}, ${e.d.getDate()} ${MIES_D[e.d.getMonth()]} ${e.d.getFullYear()}`;
      const godz = e.od ? ` · ${e.od}${e.do ? "–" + e.do : ""}` : "";
      const meta = [
        ["Kiedy", dzien + godz], ["Gdzie", e.miejsce], ["Cena", e.cena],
        ["Miejsca", e.brak_miejsc ? "brak wolnych miejsc" : e.miejsca],
      ].filter(([, v]) => v).map(([k, v]) => `<li><span>${k}</span>${esc(v)}</li>`).join("");
      const zapisy = https(e.zapisy);
      const cta = e.brak_miejsc
        ? `<a class="btn btn--outline" href="#kontakt" data-signup="${i}" data-rezerwowa>Lista rezerwowa</a>`
        : zapisy
          ? `<a class="btn" href="${esc(zapisy)}" target="_blank" rel="noopener">Zapisz się</a>`
          : `<a class="btn" href="#kontakt" data-signup="${i}">Zapisz się</a>`;
      evList.insertAdjacentHTML("beforeend", `
        <article class="event reveal${e.brak_miejsc ? " event--pelne" : ""}">
          ${e.zdjecie ? `<div class="event__img event__img--${KADR[e.kadrowanie] ? e.kadrowanie : "srodek"}"><img src="${esc(e.zdjecie)}" alt="" loading="lazy"></div>` : ""}
          <div class="event__body">
            <p class="event__date"><b>${e.d.getDate()}</b>${MIES_KR[e.d.getMonth()]}</p>
            ${e.brak_miejsc ? `<p class="event__full script">brak miejsc</p>` : ""}
            <h3>${esc(e.tytul)}</h3>
            ${e.opis_html ? `<div class="event__desc">${e.opis_html}</div>` : ""}
            <ul class="event__meta">${meta}</ul>
            <div class="event__cta">
              ${cta}
              <a class="event__cal" href="${gcalLink(e)}" target="_blank" rel="noopener">+ dodaj do kalendarza</a>
            </div>
          </div>
        </article>`);
    });
    reveal(evList);
    evList.addEventListener("click", ev => {
      const a = ev.target.closest("[data-signup]");
      if (!a) return;
      const e = upcoming[+a.dataset.signup];
      const f = $("#contact-form");
      const sel = f.querySelector('[name="session_type"]');
      const opt = [...sel.options].find(o => /warsztaty/i.test(o.text));
      if (opt) sel.value = opt.value;
      const kiedy = `${e.d.getDate()} ${MIES_D[e.d.getMonth()]}`;
      f.querySelector('[name="message"]').value = a.hasAttribute("data-rezerwowa")
        ? `Dzień dobry, proszę o wpisanie na listę rezerwową: ${e.tytul} (${kiedy}).\nLiczba osób: 1\n`
        : `Dzień dobry, chcę zapisać się na: ${e.tytul} (${kiedy}).\nLiczba osób: 1\n`;
    });
  });

  /* ---------- rezerwacja: własny kalendarz (js/rezerwacje.js + rezerwacje/Kod.gs) ---------- */
  czesc("rezerwacje", () => {
    const booking = $("#booking");
    const demoRez = new URLSearchParams(location.search).get("rezerwacje") === "demo";
    // „Przyjmuję rezerwacje online” odznaczone w panelu → komunikat z panelu zamiast kalendarza
    const wstrzymane = cfg.rezerwacjeWstrzymane && !demoRez;
    if (wstrzymane || !((cfg.rezerwacjeUrl || demoRez) && window.initRezerwacje && window.initRezerwacje(booking, cfg))) {
      if (window.pokazBrakRezerwacji) window.pokazBrakRezerwacji(booking, cfg, wstrzymane);
      else booking.innerHTML = `<div class="booking__placeholder"><p>Rezerwacje chwilowo niedostępne – <a href="#kontakt">napisz do mnie</a>.</p></div>`;
    }
  });

  /* ---------- kontakt i ikony social ---------- */
  czesc("kontakt", () => {
    const c = cfg.contact || {};
    const list = $("#contact-list");
    const row = (label, html) => { if (html) list.insertAdjacentHTML("beforeend", `<li><span>${label}</span><div>${html}</div></li>`); };
    if (c.email) row("E-mail", `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>`);
    if (c.phone) row("Telefon", `<a href="tel:${esc(c.phone.replace(/[^\d+]/g, ""))}">${esc(c.phone)}</a>`);
    if (c.area) row("Działam", esc(c.area));

    const s = cfg.social || {};
    const ICONS = {
      facebook: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2.3H7.9v3h2.6V21h3z"/></svg>',
      instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="4.5" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor"/></svg>',
    };
    const NAMES = { facebook: "Facebook", instagram: "Instagram" };
    document.querySelectorAll("[data-social]").forEach(box => {
      Object.keys(ICONS).forEach(k => {
        const url = https(s[k]);
        if (!url) return;
        box.insertAdjacentHTML("beforeend",
          `<a href="${esc(url)}" target="_blank" rel="noopener" aria-label="${NAMES[k]}">${ICONS[k]}<span>${NAMES[k]}</span></a>`);
      });
    });
    $("#year").textContent = new Date().getFullYear();
  });
})();
