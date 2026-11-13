(() => {
  const cfg = window.SITE_CONFIG || {};
  const $ = (s, el = document) => el.querySelector(s);

  /* ---------- nawigacja ---------- */
  const nav = $("#nav");
  const toggle = $(".nav__toggle");
  const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 60);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", open);
    document.body.style.overflow = open ? "hidden" : "";
  });
  $("#menu").addEventListener("click", e => {
    if (e.target.tagName === "A") {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", false);
      document.body.style.overflow = "";
    }
  });

  /* ---------- animacje przy przewijaniu ---------- */
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach(el => io.observe(el));

  /* ---------- portfolio + filtry ---------- */
  const photos = window.PORTFOLIO || [];
  const cats = window.CATEGORIES || {};
  const gallery = $("#gallery");
  const filters = $("#filters");
  let visible = photos;

  const addFilter = (key, label) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.dataset.cat = key;
    b.setAttribute("role", "tab");
    if (key === "all") b.classList.add("is-active");
    filters.appendChild(b);
  };
  addFilter("all", "Wszystkie");
  Object.entries(cats).forEach(([k, v]) => {
    if (photos.some(p => p.category === k)) addFilter(k, v);
  });

  const render = cat => {
    visible = cat === "all" ? photos : photos.filter(p => p.category === cat);
    gallery.innerHTML = "";
    visible.forEach((p, i) => {
      const fig = document.createElement("figure");
      fig.className = "gallery__item";
      fig.style.animationDelay = `${Math.min(i, 8) * 60}ms`;
      if (p.caption) fig.dataset.caption = p.caption;
      const img = document.createElement("img");
      img.src = p.thumb || p.src;
      img.alt = p.alt || p.caption || "Zdjęcie z portfolio";
      img.loading = "lazy";
      img.decoding = "async";
      fig.appendChild(img);
      fig.addEventListener("click", () => openLightbox(i));
      gallery.appendChild(fig);
    });
  };
  filters.addEventListener("click", e => {
    const b = e.target.closest("button");
    if (!b) return;
    filters.querySelectorAll("button").forEach(x => x.classList.toggle("is-active", x === b));
    render(b.dataset.cat);
  });
  render("all");

  /* ---------- lightbox ---------- */
  const lb = $("#lightbox");
  const lbImg = $("img", lb);
  let idx = 0;
  const show = i => {
    idx = (i + visible.length) % visible.length;
    lbImg.src = visible[idx].src;
    lbImg.alt = visible[idx].alt || visible[idx].caption || "";
  };
  function openLightbox(i) {
    show(i);
    lb.classList.add("is-open");
    lb.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
  const closeLightbox = () => {
    lb.classList.remove("is-open");
    lb.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  };
  $(".lightbox__close", lb).addEventListener("click", closeLightbox);
  $(".lightbox__prev", lb).addEventListener("click", e => { e.stopPropagation(); show(idx - 1); });
  $(".lightbox__next", lb).addEventListener("click", e => { e.stopPropagation(); show(idx + 1); });
  lb.addEventListener("click", e => { if (e.target === lb) closeLightbox(); });
  document.addEventListener("keydown", e => {
    if (!lb.classList.contains("is-open")) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") show(idx - 1);
    if (e.key === "ArrowRight") show(idx + 1);
  });
  let touchX = null;
  lb.addEventListener("touchstart", e => { touchX = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", e => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1));
    touchX = null;
  });

  /* ---------- wydarzenia ---------- */
  const evSection = $("#wydarzenia");
  const evList = $("#events-list");
  const MIES = ["stycznia","lutego","marca","kwietnia","maja","czerwca","lipca","sierpnia","września","października","listopada","grudnia"];
  const MIES_KR = ["sty","lut","mar","kwi","maj","cze","lip","sie","wrz","paź","lis","gru"];
  const DNI = ["niedziela","poniedziałek","wtorek","środa","czwartek","piątek","sobota"];
  const esc = t => String(t ?? "").replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const upcoming = (window.WYDARZENIA || [])
    .map(e => ({ ...e, d: new Date(e.data + "T00:00:00") }))
    .filter(e => !isNaN(e.d) && e.d >= today)
    .sort((a, b) => a.d - b.d);
  const gcalLink = e => {
    const ymd = e.data.replace(/-/g, "");
    const t = h => h ? h.replace(":", "") + "00" : "";
    const dates = e.od ? `${ymd}T${t(e.od)}/${ymd}T${t(e.do || e.od)}` : `${ymd}/${ymd}`;
    const q = new URLSearchParams({ action: "TEMPLATE", text: e.tytul, dates, details: e.opis || "", location: e.miejsce || "", ctz: "Europe/Warsaw" });
    return `https://calendar.google.com/calendar/render?${q}`;
  };
  if (upcoming.length) {
    evSection.hidden = false;
    document.querySelectorAll("[data-events-link]").forEach(a => (a.hidden = false));
    upcoming.forEach((e, i) => {
      const dzien = `${DNI[e.d.getDay()]}, ${e.d.getDate()} ${MIES[e.d.getMonth()]} ${e.d.getFullYear()}`;
      const godz = e.od ? ` · ${e.od}${e.do ? "–" + e.do : ""}` : "";
      const meta = [
        ["Kiedy", dzien + godz], ["Gdzie", e.miejsce], ["Cena", e.cena], ["Miejsca", e.miejsca],
      ].filter(([, v]) => v).map(([k, v]) => `<li><span>${k}</span>${esc(v)}</li>`).join("");
      evList.insertAdjacentHTML("beforeend", `
        <article class="event reveal">
          ${e.zdjecie ? `<div class="event__img"><img src="${esc(e.zdjecie)}" alt="${esc(e.tytul)}" loading="lazy"></div>` : ""}
          <div class="event__body">
            <p class="event__date"><b>${e.d.getDate()}</b>${MIES_KR[e.d.getMonth()]}</p>
            <h3>${esc(e.tytul)}</h3>
            ${e.opis ? `<p class="event__desc">${esc(e.opis)}</p>` : ""}
            <ul class="event__meta">${meta}</ul>
            <div class="event__cta">
              <a class="btn" href="${e.zapisy ? esc(e.zapisy) : "#kontakt"}" ${e.zapisy ? 'target="_blank" rel="noopener"' : `data-signup="${i}"`}>Zapisz się</a>
              <a class="event__cal" href="${gcalLink(e)}" target="_blank" rel="noopener">+ dodaj do kalendarza</a>
            </div>
          </div>
        </article>`);
    });
    evList.querySelectorAll(".reveal").forEach(el => io.observe(el));
    evList.addEventListener("click", ev => {
      const a = ev.target.closest("[data-signup]");
      if (!a) return;
      const e = upcoming[+a.dataset.signup];
      const f = $("#contact-form");
      const sel = f.querySelector('[name="session_type"]');
      const opt = [...sel.options].find(o => /warsztaty/i.test(o.text));
      if (opt) sel.value = opt.value;
      f.querySelector('[name="message"]').value =
        `Dzień dobry, chcę zapisać się na: ${e.tytul} (${e.d.getDate()} ${MIES[e.d.getMonth()]}).\nLiczba osób: 1\n`;
    });
  }

  /* ---------- rezerwacja: Kalendarz Google ---------- */
  const booking = $("#booking");
  const tabs = $("#booking-tabs");
  const toEmbed = url => {
    // link z "Udostępnij" (calendar.app.google/...) też działa; pełny link dostaje ?gv=true (wersja do osadzenia)
    if (/\/appointments\/schedules\//.test(url) && !/[?&]gv=true/.test(url)) url += (url.includes("?") ? "&" : "?") + "gv=true";
    return url;
  };
  const slots = (cfg.booking || (cfg.bookingUrl ? [{ label: "", url: cfg.bookingUrl }] : [])).filter(b => b.url);
  const showBooking = i => {
    booking.innerHTML = "";
    const iframe = document.createElement("iframe");
    iframe.src = toEmbed(slots[i].url);
    iframe.title = `Rezerwacja terminu sesji ${slots[i].label}`.trim();
    iframe.loading = "lazy";
    booking.appendChild(iframe);
    tabs.querySelectorAll("button").forEach((b, j) => {
      b.classList.toggle("is-active", j === i);
      b.setAttribute("aria-selected", j === i);
    });
  };
  if (cfg.calLink) {
    // oficjalny widżet cal.com (sam dopasowuje wysokość)
    tabs.hidden = true;
    booking.classList.add("booking__frame--cal");
    (function (C, A, L) { const p = (a, ar) => a.q.push(ar); const d = C.document; C.Cal = C.Cal || function () { const cal = C.Cal; const ar = arguments; if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; d.head.appendChild(d.createElement("script")).src = A; cal.loaded = true; } if (ar[0] === L) { const api = function () { p(api, arguments); }; const ns = ar[1]; api.q = api.q || []; if (typeof ns === "string") { cal.ns[ns] = cal.ns[ns] || api; p(cal.ns[ns], ar); p(cal, ["initNamespace", ns]); } else p(cal, ar); return; } p(cal, ar); }; })(window, "https://app.cal.com/embed/embed.js", "init");
    Cal("init", "sesja", { origin: "https://cal.com" });
    Cal.ns.sesja("inline", { elementOrSelector: "#booking", calLink: cfg.calLink, config: { layout: "month_view", theme: "light" } });
    Cal.ns.sesja("ui", { theme: "light", layout: "month_view", hideEventTypeDetails: false, cssVarsPerTheme: { light: { "cal-brand": "#7d5536" } } });
  } else if (slots.length) {
    if (slots.length > 1) {
      slots.forEach((sl, i) => {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = sl.label;
        b.setAttribute("role", "tab");
        b.addEventListener("click", () => showBooking(i));
        tabs.appendChild(b);
      });
    } else tabs.hidden = true;
    showBooking(0);
  } else {
    tabs.hidden = true;
    booking.innerHTML = `
      <div class="booking__placeholder">
        <p class="script">tu pojawi się kalendarz</p>
        <p>Wklej link do strony rezerwacji z Kalendarza Google w pliku <code>js/config.js</code> (pole <code>booking</code>).</p>
      </div>`;
  }

  /* ---------- kontakt ---------- */
  const c = cfg.contact || {};
  const list = $("#contact-list");
  const row = (label, html) => { if (html) list.insertAdjacentHTML("beforeend", `<li><span>${label}</span><div>${html}</div></li>`); };
  if (c.email) row("E-mail", `<a href="mailto:${c.email}">${c.email}</a>`);
  if (c.phone) row("Telefon", `<a href="tel:${c.phone.replace(/\s/g, "")}">${c.phone}</a>`);
  if (c.area) row("Działam", c.area);

  const s = cfg.social || {};
  const ICONS = {
    facebook: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2.3H7.9v3h2.6V21h3z"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="4.5" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor"/></svg>',
  };
  const NAMES = { facebook: "Facebook", instagram: "Instagram" };
  document.querySelectorAll("[data-social]").forEach(box => {
    Object.keys(ICONS).forEach(k => {
      if (!s[k]) return;
      box.insertAdjacentHTML("beforeend",
        `<a href="${s[k]}" target="_blank" rel="noopener" aria-label="${NAMES[k]}">${ICONS[k]}<span>${NAMES[k]}</span></a>`);
    });
  });
  $("#year").textContent = new Date().getFullYear();

  /* ---------- formularz (Web3Forms) ---------- */
  const form = $("#contact-form");
  const status = $("#form-status");
  form.addEventListener("submit", async e => {
    e.preventDefault();
    status.className = "form__status";
    if (!form.checkValidity()) {
      status.textContent = "Uzupełnij wszystkie pola i zaznacz zgodę.";
      status.classList.add("err");
      return;
    }
    if (!cfg.web3formsKey) {
      status.textContent = "Formularz nie jest jeszcze skonfigurowany (brak klucza web3formsKey w js/config.js).";
      status.classList.add("err");
      return;
    }
    const data = Object.fromEntries(new FormData(form));
    data.access_key = cfg.web3formsKey;
    data.subject = `Nowa wiadomość ze strony – ${data.session_type}`;
    data.from_name = "Strona – Ewelina Kucharczyk Fotografia";
    status.textContent = "Wysyłanie…";
    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      form.reset();
      status.textContent = "Dziękuję! Wiadomość wysłana – odezwę się wkrótce.";
      status.classList.add("ok");
    } catch (err) {
      status.textContent = "Ups, coś poszło nie tak. Napisz proszę bezpośrednio na maila.";
      status.classList.add("err");
    }
  });
})();
