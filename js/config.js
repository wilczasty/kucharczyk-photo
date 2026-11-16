/* =========================================================
   USTAWIENIA TECHNICZNE (dla Adriana) – rezerwacje i formularz kontaktowy.
   Treści strony (teksty, ceny, kontakt, zdjęcia) edytuje się w panelu Pages CMS.
   ========================================================= */
window.SITE_CONFIG = {
  // ⭐ WŁASNE REZERWACJE (Google Apps Script + Kalendarz Google) – patrz rezerwacje/INSTRUKCJA.md.
  // Wklej adres wdrożenia skryptu (kończy się na /exec). Ten sam skrypt obsługuje formularz kontaktowy.
  // Gdy puste – zamiast kalendarza jest prośba o kontakt mailowy, a formularz kontaktowy nie działa.
  // Podgląd bez skryptu (przykładowe terminy): dopisz do adresu strony ?rezerwacje=demo
  rezerwacjeUrl: "https://script.google.com/macros/s/AKfycbwAds39BD7ioJB6pcuLnEknvH4CIU9qmNqoCc6Nuio45PBGglH4N8YAg7yjN9b_X1ah/exec",
  // Pakiety rezerwacji (S/M/L: czas i cena), kontakt i social media pochodzą z panelu (content/*.json)
  // i są dopisywane do tych ustawień w js/dane.js przy budowaniu strony.
  // Skrypt Google bierze nazwy i czas pakietów z tego samego cennika (opublikowany rezerwacje.json).

};
