/* Tryb świąteczny: śnieg + przelot Mikołaja na zdjęciu powitalnym (hero).
   Ustawienia z panelu „Święta – śnieg i Mikołaj” (content/swieta.json → js/dane.js):
   window.SWIETA = { tryb: "auto" | "zawsze" | "wylaczone", od: "12-01", do: "01-06", snieg: true, mikolaj: true }
   Datę sprawdza przeglądarka, więc nic nie trzeba publikować 1 grudnia.
   Sprawdzenie poza okresem: adres strony + ?swieta=1 (wyłączenie: ?swieta=0, Mikołaj co 14 s: &mikolaj=powtarzaj). */
(function () {
  const ust = Object.assign({ tryb: "auto", od: "12-01", do: "01-06", snieg: true, mikolaj: true }, window.SWIETA || {});
  const param = new URLSearchParams(location.search).get("swieta");

  function wOkresie() {
    const d = new Date();
    const dzis = String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    return ust.od <= ust.do ? dzis >= ust.od && dzis <= ust.do : dzis >= ust.od || dzis <= ust.do; // przez Nowy Rok
  }
  let wlaczone = param === "1" || (param !== "0" && (ust.tryb === "zawsze" || (ust.tryb === "auto" && wOkresie())));
  if (!wlaczone) return;
  document.documentElement.classList.add("swieta");

  const hero = document.querySelector(".hero");
  if (!hero || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const KLUCZ = "swieta-wylaczone";
  const czytaj = () => { try { return localStorage.getItem(KLUCZ) === "1"; } catch (e) { return false; } };
  const zapisz = v => { try { v ? localStorage.setItem(KLUCZ, "1") : localStorage.removeItem(KLUCZ); } catch (e) {} };

  // --- przycisk wyłącz/włącz ---
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "swieta__toggle";
  hero.appendChild(btn);

  // --- płótno ---
  const cv = document.createElement("canvas");
  cv.className = "swieta__canvas";
  cv.setAttribute("aria-hidden", "true");
  hero.insertBefore(cv, hero.querySelector(".hero__content"));
  const ctx = cv.getContext("2d");
  let W = 0, H = 0, dpr = 1, platki = [], iskry = [];

  function rozmiar() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = hero.clientWidth; H = hero.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const ile = Math.round(Math.min(45, Math.max(15, W / 32)));
    while (platki.length < ile) platki.push(nowyPlatek(true));
    platki.length = ile;
  }
  function nowyPlatek(gdziekolwiek) {
    const r = Math.random() ** 2 * 3.2 + 0.8;          // większość małych, kilka bliżej obiektywu
    return {
      x: Math.random() * W, y: gdziekolwiek ? Math.random() * H : -10,
      r, v: 0.25 + r * 0.18, faza: Math.random() * 6.28, kolys: 0.3 + Math.random() * 0.6,
      a: 0.35 + Math.random() * 0.45, krysztal: r > 2.4 && Math.random() < 0.5, kat: Math.random() * 6.28
    };
  }
  function rysujKrysztal(p) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.kat);
    ctx.strokeStyle = `rgba(250,246,239,${p.a})`; ctx.lineWidth = 0.9; ctx.lineCap = "round";
    const R = p.r * 2.2;
    for (let i = 0; i < 6; i++) {
      ctx.rotate(Math.PI / 3);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -R);
      ctx.moveTo(0, -R * 0.55); ctx.lineTo(-R * 0.25, -R * 0.75);
      ctx.moveTo(0, -R * 0.55); ctx.lineTo(R * 0.25, -R * 0.75);
      ctx.stroke();
    }
    ctx.restore();
  }

  // --- Mikołaj: sylwetka SVG rysowana na płótnie ---
  const SANIE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 80" fill="#faf6ef" stroke="#faf6ef" stroke-linecap="round" stroke-linejoin="round">
    <defs><g id="r">
      <ellipse cx="0" cy="0" rx="15" ry="6.5" stroke="none"/>
      <path d="M9 -3 Q15 -10 17 -16 L23 -15 Q20 -6 13 2 Z" stroke="none"/>
      <path d="M16 -18 L27 -15.5 Q30.5 -14 28 -12 L20 -11 Z" stroke="none"/>
      <path d="M17 -18 L14 -21 L19 -19" stroke="none"/>
      <path d="M18.5 -18 Q15 -27 10 -30 M15.8 -24 L11.5 -23.5 M20 -18 Q22 -27 27 -30 M22 -25 L26.5 -25.5" fill="none" stroke-width="1.4"/>
      <path d="M10 2 L19 8 L25 6.5 M7 3.5 L15 10.5 L21 11.5 M-10 2.5 L-19 7 L-26 5.5 M-8 4 L-16 9.5 L-22 11.5 M-14 -3 L-19 -6" fill="none" stroke-width="2.2"/>
    </g></defs>
    <path d="M62 32 L170 38 M62 34 L232 34" fill="none" stroke-width=".8" opacity=".8"/>
    <use href="#r" transform="translate(178 40)"/>
    <use href="#r" transform="translate(242 34)"/>
    <circle cx="28" cy="31" r="9" stroke="none"/>
    <path d="M24 23 Q28 18 32 23" fill="none" stroke-width="1.5"/>
    <circle cx="50" cy="33" r="10" stroke="none"/>
    <circle cx="57" cy="20" r="6" stroke="none"/>
    <path d="M51 17 L63 16.5 Q58 6 47 6 Z" stroke="none"/>
    <circle cx="46" cy="6.5" r="2.4" stroke="none"/>
    <path d="M14 38 Q9 24 19 22 L25 24 L24 38 L70 38 Q80 38 82 47 L84 56 L24 56 Q13 56 14 38 Z" stroke="none"/>
    <path d="M30 56 L28 66 M74 56 L76 66" fill="none" stroke-width="2"/>
    <path d="M6 66 L88 66 Q101 66 101 56 Q101 49 94 50" fill="none" stroke-width="2.4"/>
  </svg>`;
  const img = new Image();
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(SANIE);
  let lot = null;                                   // { start } gdy Mikołaj leci
  const CZAS_LOTU = 9000;

  function pozycjaSan(t) {                          // t 0..1 → łuk przez górną część hero
    const sz = Math.min(300, W * 0.42);
    const x = -sz + t * (W + sz * 1.6);
    const y = H * (0.30 - 0.14 * Math.sin(t * Math.PI)) + Math.sin(t * 18) * 4;
    return { x, y, sz, kat: -0.10 * Math.cos(t * Math.PI) };
  }

  // --- pętla ---
  let raf = 0, widoczny = true, ost = 0;
  function klatka(now) {
    raf = requestAnimationFrame(klatka);
    const dt = Math.min(50, now - (ost || now)) / 16.7; ost = now;
    ctx.clearRect(0, 0, W, H);
    const wiatr = Math.sin(now / 7000) * 0.25;

    if (ust.snieg) for (const p of platki) {
      p.faza += 0.012 * dt;
      p.y += p.v * dt;
      p.x += (Math.sin(p.faza) * p.kolys + wiatr) * 0.6 * dt;
      p.kat += 0.004 * dt;
      if (p.y > H + 10) Object.assign(p, nowyPlatek(false));
      if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10;
      if (p.krysztal) rysujKrysztal(p);
      else {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283);
        ctx.fillStyle = `rgba(250,246,239,${p.a})`; ctx.fill();
      }
    }

    if (lot && img.complete) {
      const t = (now - lot.start) / CZAS_LOTU;
      if (t >= 1 && !iskry.length) lot = null;
      else {
        if (t < 1) {
          const s = pozycjaSan(t), h = s.sz * 80 / 300;
          ctx.save(); ctx.globalAlpha = Math.min(1, t * 8, (1 - t) * 8) * 0.9;
          ctx.translate(s.x + s.sz / 2, s.y); ctx.rotate(s.kat);
          ctx.drawImage(img, -s.sz / 2, -h / 2, s.sz, h);
          ctx.restore();
          if (Math.random() < 0.7 * dt) iskry.push({ x: s.x + s.sz * 0.05, y: s.y + h * 0.3, vx: -0.3 - Math.random() * 0.5, vy: 0.2 + Math.random() * 0.4, zycie: 1 });
        }
        for (const k of iskry) {
          k.x += k.vx * dt; k.y += k.vy * dt; k.zycie -= 0.012 * dt;
          ctx.beginPath(); ctx.arc(k.x, k.y, 1.4 * k.zycie + 0.4, 0, 6.283);
          ctx.fillStyle = `rgba(232,196,130,${Math.max(0, k.zycie) * 0.9})`; ctx.fill();
        }
        iskry = iskry.filter(k => k.zycie > 0);
      }
    }
  }
  function start() { if (!raf && widoczny && !document.hidden && !czytaj()) { ost = 0; raf = requestAnimationFrame(klatka); } }
  function stop() { cancelAnimationFrame(raf); raf = 0; }
  function odswiezPrzycisk() {
    const wyl = czytaj();
    btn.textContent = wyl ? "włącz śnieg" : "wyłącz śnieg";
    btn.setAttribute("aria-pressed", String(!wyl));
    cv.hidden = wyl;
  }

  btn.addEventListener("click", () => { zapisz(!czytaj()); odswiezPrzycisk(); czytaj() ? stop() : start(); });
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
  if ("IntersectionObserver" in window) new IntersectionObserver(e => { widoczny = e[0].isIntersecting; widoczny ? start() : stop(); }).observe(hero);
  addEventListener("resize", rozmiar);

  rozmiar(); odswiezPrzycisk(); start();
  // Mikołaj przelatuje raz na wizytę (nie przy każdym odświeżeniu), ok. 2,5 s po wejściu
  const powtarzaj = new URLSearchParams(location.search).get("mikolaj") === "powtarzaj";
  let byl = false;
  try { byl = sessionStorage.getItem("mikolaj-byl") === "1"; } catch (e) {}
  if (ust.mikolaj && (!byl || powtarzaj)) {
    const lec = () => { if (!czytaj()) lot = { start: performance.now() }; };
    setTimeout(() => { lec(); try { sessionStorage.setItem("mikolaj-byl", "1"); } catch (e) {} }, 2500);
    if (powtarzaj) setInterval(lec, 14000);
  }
})();
