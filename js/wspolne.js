/* Wspólne drobiazgi dla js/main.js i js/rezerwacje.js (nazwy miesięcy i dni, escapowanie tekstu). */
window.EK = {
  // tekst wstawiany do HTML – zamienia znaki specjalne, żeby nie dało się wstrzyknąć znaczników
  esc: t => String(t ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])),
  // tylko bezpieczne linki https:// (np. z panelu); inaczej pusty tekst
  https: u => (/^https:\/\/[^\s"'<>]+$/i.test(String(u ?? "").trim()) ? String(u).trim() : ""),
  MIES: ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"],
  MIES_D: ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca", "sierpnia", "września", "października", "listopada", "grudnia"],
  MIES_KR: ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"],
  DNI: ["niedziela", "poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota"],
};
