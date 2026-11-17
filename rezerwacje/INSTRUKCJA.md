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

## 2. Nadaj uprawnienia, załóż wyzwalacz i sprawdź działanie
1. Na górze wybierz funkcję **konfiguruj** → **Uruchom**.
2. Google zapyta o uprawnienia (kalendarz, wysyłanie maili, wyzwalacze) → wybierz konto →
   „Zaawansowane” → „Przejdź do projektu (niebezpieczne)” → **Zezwól**.
   (Ostrzeżenie jest standardowe dla własnych skryptów – to Twój skrypt, na Twoim koncie.)
3. W dzienniku wykonania powinno być: „Wyzwalacz … założony”, ustawienia i lista wolnych godzin na 2 tygodnie.
   W **Wyzwalacze** (ikona budzika po lewej) widać `zadaniaCykliczne` – co godzinę.

## 3. Wdróż jako aplikację internetową
1. **Wdróż → Nowe wdrożenie** → typ (zębatka): **Aplikacja internetowa**.
2. Wykonaj jako: **Ja**. Kto ma dostęp: **Każdy**.
3. **Wdróż** → skopiuj **adres URL aplikacji internetowej** (kończy się na `/exec`).
4. Wklej go w `js/config.js` → `rezerwacjeUrl: "…/exec"` (albo wyślij Adrianowi).

## Aktualizacja skryptu (po każdej zmianie `Kod.gs` w repozytorium)
1. Najpierw opublikuj stronę (push) – nowy skrypt może korzystać z nowych plików strony (np. `odwolanie.html`).
2. W edytorze skryptu zamień całą zawartość `Kod.gs` na nową, zapisz.
3. Uruchom **konfiguruj** (jeśli Google zapyta o nowe uprawnienia – zezwól). Można uruchamiać wielokrotnie.
4. **Wdróż → Zarządzaj wdrożeniami → ✏️ edytuj → Wersja: Nowa wersja → Wdróż**. Adres `/exec` się nie zmienia.

## Zmiany w ustawieniach
Na co dzień – w panelu Pages CMS, bez ponownego wdrażania (skrypt widzi zmiany po ok. 5 minutach od publikacji):
- **„Rezerwacje – godziny i zasady”**: wstrzymanie rezerwacji (urlop), dni i godziny, przerwy, wyprzedzenie,
  odwoływanie, święta, wydarzenia całodniowe, wygasanie próśb, przypomnienia, autoodpowiedź formularza.
- **„Oferta i cennik”**: nazwy i czas sesji pakietów S/M/L (trafiają do kalendarza i maili).

Wartości w `USTAWIENIA` na górze `Kod.gs` to tylko zapas, gdyby strona była niedostępna.

## Jak to działa na co dzień
- Klient wybiera termin → w kalendarzu pojawia się **żółte** wydarzenie „❓ PROŚBA: …”,
  termin jest zablokowany. Klient dostaje maila „otrzymałam prośbę”.
- Ewelina dostaje maila z przyciskiem **„Potwierdź lub odrzuć”** (otwiera stronę `decyzja.html` na stronie www –
  działa też w przeglądarce zalogowanej na kilka kont Google):
  - Potwierdź → wydarzenie robi się **zielone**, klient dostaje potwierdzenie.
  - Odrzuć → wydarzenie znika, termin się zwalnia, klient dostaje grzeczną odmowę.
  - W obu przypadkach można dopisać wiadomość do klienta.
  - **Ten sam link** później pozwala odwołać potwierdzoną sesję (choroba, pogoda) – klient dostaje maila.
    Samo usunięcie wydarzenia w kalendarzu NIE powiadamia klienta.
- Prośba nierozpatrzona przez 3 dni (ustawienie w panelu) wygasa: znika z kalendarza, klient dostaje przeprosiny
  i informację, że termin jest wolny. Ewelina codziennie rano dostaje listę próśb czekających ponad dobę.
- 2 dni przed potwierdzoną sesją (ok. 9:00) klient dostaje przypomnienie.
- Klient może sam odwołać rezerwację linkiem z maila (strona `odwolanie.html` na stronie www),
  najpóźniej tyle godzin przed sesją, ile ustawiono w panelu.
- Każde wydarzenie w kalendarzu (też prywatne) blokuje termin + przerwę przed i po.
  Dzień wolny / urlop = wydarzenie całodniowe w kalendarzu (w panelu można ustawić, że całodniowe blokują dzień
  tylko ze słowem „urlop”, „wolne”, „zajęte” albo „niedostępna” – żeby „Imieniny mamy” nie blokowały).
  Święta ustawowe są domyślnie bez rezerwacji.
- Strona nie widzi treści wydarzeń z kalendarza – tylko wolne godziny.
- Limit Google: ok. 100 maili dziennie (każda rezerwacja to 2–3 maile). Gdy limit się wyczerpie, strona prosi klienta
  o kontakt mailowy zamiast zakładać rezerwację, o której nikt by się nie dowiedział.

## Przeprowadzka (konto Eweliny, własna domena)
Zrobić najlepiej zanim pojawią się prawdziwe rezerwacje – linki w wysłanych mailach prowadzą pod stary adres.
1. **Domena** (jeśli jest): podłączyć do strony, w panelu „Strona główna i kontakt” → „Adres strony” = nowy adres.
2. **Skrypt na koncie Eweliny**: kroki 1–3 powyżej, zalogowanym na jej konto (nowy adres `/exec`).
3. Jeśli zmienił się adres strony: w nowym projekcie skryptu **Ustawienia projektu → Właściwości skryptu →
   Dodaj właściwość** `stronaWww` = pełny adres strony z ukośnikiem na końcu (np. `https://twojadomena.pl/`).
   Kod zostaje bez zmian. Potem jeszcze raz **konfiguruj**.
4. Nowy adres `/exec` wkleić w `js/config.js` → `rezerwacjeUrl` i opublikować stronę.
5. Stary projekt skryptu (konto Adriana): sesje zarezerwowane wcześniej są w kalendarzu Adriana, a strona www po zmianie
   `rezerwacjeUrl` pyta już nowy skrypt – ich linki odwołania i decyzji przestaną działać. Przeprowadzkę robić, gdy nie ma
   aktywnych rezerwacji (albo obsłużyć je ręcznie), potem usunąć stary wyzwalacz i wdrożenie.
