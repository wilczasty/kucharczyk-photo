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
  if (slots.length) {
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
