/* =========================================================
   USTAWIENIA TECHNICZNE (dla Adriana) – rezerwacje i klucze formularzy.
   Treści strony (teksty, ceny, kontakt, zdjęcia) edytuje się w panelu Pages CMS.
   ========================================================= */
window.SITE_CONFIG = {
  // ⭐ WŁASNE REZERWACJE (Google Apps Script + Kalendarz Google) – patrz rezerwacje/INSTRUKCJA.md.
  // Wklej adres wdrożenia skryptu (kończy się na /exec). Gdy puste – używany jest cal.com niżej.
  // Podgląd bez skryptu (przykładowe terminy): dopisz do adresu strony ?rezerwacje=demo
  rezerwacjeUrl: "https://script.google.com/macros/s/AKfycbwAds39BD7ioJB6pcuLnEknvH4CIU9qmNqoCc6Nuio45PBGglH4N8YAg7yjN9b_X1ah/exec",
  // Pakiety rezerwacji (S/M/L: czas i cena), kontakt i social media pochodzą z panelu (content/*.json)
  // i są dopisywane do tych ustawień w js/dane.js przy budowaniu strony.
  // Czas pakietu musi zgadzać się z USTAWIENIA.pakiety w rezerwacje/Kod.gs.

  // (Zapas) Rezerwacje przez cal.com (połączone z Kalendarzem Google) – klient sam wybiera 30 / 50 / 90 min.
  // Wpisz końcówkę linku po "https://cal.com/". Gdy puste – używany jest Kalendarz Google z pola "booking" niżej.
  calLink: "rutko23-o2.pl-2igpgd/sesja",

  // (Alternatywa) Rezerwacje z Kalendarza Google ("Harmonogram spotkań") – osobny harmonogram na każdy pakiet,
  // bo jeden harmonogram Google ma jedną długość spotkania.
  // Jak zdobyć link – patrz README.md, krok 4. Wystarczy też link skrócony (https://calendar.app.google/...).
  // Puste "url" = ten pakiet się nie wyświetla. Jeśli tylko jeden ma link – zakładki się chowają.
  booking: [
    { label: "S · 30 min", url: "https://calendar.google.com/calendar/appointments/schedules/AcZssZ3GuXpWz-A-GPi4XKt6yCzVvqockch9FMJQqsl2HRJqhfkYQxH7bCxcB9yeOtbyp-1YNRwgaPHt?gv=true" },
    { label: "M · 50 min", url: "" },
    { label: "L · 90 min", url: "" },
  ],

  // Klucz z https://web3forms.com (darmowy) – formularz wysyła maile na Twoją skrzynkę.
  // Jak go zdobyć – patrz README.md, krok 5.
  web3formsKey: "",

};
