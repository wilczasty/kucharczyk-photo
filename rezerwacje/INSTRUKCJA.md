# Własne rezerwacje – wdrożenie skryptu (ok. 15 minut)

Skrypt działa na koncie Google osoby, której kalendarz ma przyjmować rezerwacje
(na test: prywatne konto Adriana, docelowo konto Eweliny – kroki są te same).
Maile do klientów wychodzą z tego konta.

## 1. Utwórz projekt
1. Wejdź na https://script.google.com (zalogowany na właściwe konto) → **Nowy projekt**.
2. Nazwij go np. „Rezerwacje – strona”.
3. Skasuj zawartość pliku `Kod.gs` i wklej całą zawartość pliku `rezerwacje/Kod.gs` z repozytorium.
4. **Ustawienia projektu** (ikona zębatki) → strefa czasowa **(GMT+01:00) Warsaw**.
5. Zapisz (Ctrl+S).

## 2. Nadaj uprawnienia i sprawdź działanie
1. Na górze wybierz funkcję **test** → **Uruchom**.
2. Google zapyta o uprawnienia (kalendarz, wysyłanie maili) → wybierz konto →
   „Zaawansowane” → „Przejdź do projektu (niebezpieczne)” → **Zezwól**.
   (Ostrzeżenie jest standardowe dla własnych skryptów – to Twój skrypt, na Twoim koncie.)
3. W dzienniku wykonania powinna pojawić się lista wolnych godzin na najbliższe 2 tygodnie.

## 3. Wdróż jako aplikację internetową
1. **Wdróż → Nowe wdrożenie** → typ (zębatka): **Aplikacja internetowa**.
2. Wykonaj jako: **Ja**. Kto ma dostęp: **Każdy**.
3. **Wdróż** → skopiuj **adres URL aplikacji internetowej** (kończy się na `/exec`).
4. Wklej go w `js/config.js` → `rezerwacjeUrl: "…/exec"` (albo wyślij Adrianowi).

## Zmiany w ustawieniach (godziny, dni, przerwy)
Na górze `Kod.gs` → `USTAWIENIA`. Po zmianie: **Wdróż → Zarządzaj wdrożeniami → ✏️ edytuj →
Wersja: Nowa wersja → Wdróż**. Adres `/exec` się nie zmienia.
Zmiana pakietów (długości) – także w `js/config.js` → `pakiety`.

## Jak to działa na co dzień
- Klient wybiera termin → w kalendarzu pojawia się **żółte** wydarzenie „❓ PROŚBA: …”,
  termin jest zablokowany. Klient dostaje maila „otrzymałam prośbę”.
- Ewelina dostaje maila z przyciskiem **„Potwierdź lub odrzuć”**:
  - Potwierdź → wydarzenie robi się **zielone**, klient dostaje potwierdzenie.
  - Odrzuć → wydarzenie znika, termin się zwalnia, klient dostaje grzeczną odmowę.
  - W obu przypadkach można dopisać wiadomość do klienta.
- Każde wydarzenie w kalendarzu (też prywatne) blokuje termin + godzinę przed i po.
  Dzień wolny / urlop = wydarzenie całodniowe w kalendarzu.
- Strona nie widzi treści wydarzeń z kalendarza – tylko wolne godziny.
- Limit Google: ok. 100 maili dziennie (każda rezerwacja to 2–3 maile).
