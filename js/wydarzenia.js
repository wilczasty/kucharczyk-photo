/* =========================================================
   WYDARZENIA – warsztaty, plenery, mini-sesje itp.
   Dopisz nowy wpis na górze listy. Minione wydarzenia znikają same,
   a gdy nie ma żadnego nadchodzącego – sekcja i link w menu się chowają.

   Pola:
     data      "RRRR-MM-DD"            (wymagane)
     od, do    "GG:MM"                 (godziny, opcjonalnie)
     tytul, opis, miejsce, cena, miejsca (tekst; "miejsca" np. "10 osób")
     zdjecie   ścieżka do grafiki (np. images/wydarzenia/wianki.svg lub .jpg)
     zapisy    link do zapisów (np. typ wydarzenia w cal.com z miejscami);
               puste = przycisk przewija do formularza kontaktowego z gotową wiadomością
   ========================================================= */
window.WYDARZENIA = [
  {
    // TODO: przykładowe szczegóły – uzupełnij godziny, miejsce i cenę
    data: "2026-12-12",
    od: "10:00",
    do: "14:00",
    tytul: "Świąteczne warsztaty wianków",
    opis: "Robimy wianki z naturalnych materiałów – gałązki świerku, eukaliptus, suszone pomarańcze, szyszki i jarzębina. Wszystkie materiały na miejscu, do tego ciepła herbata, pierniki i pamiątkowe zdjęcia z Twoim wiankiem.",
    miejsce: "Gmina Kolbudy (adres prześlę po zapisie)",
    cena: "150 zł / os.",
    miejsca: "10 osób",
    zdjecie: "images/wydarzenia/wianki.svg",
    zapisy: "",
  },
];
