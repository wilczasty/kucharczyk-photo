/* =========================================================
   USTAWIENIA STRONY – tu wpisujesz swoje dane.
   Nie trzeba ruszać żadnych innych plików JS.
   ========================================================= */
window.SITE_CONFIG = {
  // Rezerwacje przez cal.com (połączone z Kalendarzem Google) – klient sam wybiera 30 / 50 / 90 min.
  // Wpisz końcówkę linku po "https://cal.com/". Gdy puste – używany jest Kalendarz Google z pola "booking" niżej.
  calLink: "rutko23-o2.pl-2igpgd/30min",

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

  contact: {
    email: "kucharczyk.photo@gmail.com",
    phone: "",                                   // opcjonalnie, np. "+48 600 000 000"
    area: "Gmina Kolbudy · Trójmiasto i okolice",
  },

  social: {
    facebook: "https://www.facebook.com/fot.ewelina.kucharczyk",
    instagram: "https://www.instagram.com/kucharczyk.photo/",
  },
};
