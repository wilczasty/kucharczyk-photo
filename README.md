# Strona – Ewelina Kucharczyk Fotografia

Statyczna strona (HTML + CSS + JS), bez żadnych płatnych usług.

| Co | Czym | Koszt |
|---|---|---|
| Hosting | GitHub Pages (lub Cloudflare Pages / Netlify) | 0 zł |
| Zdjęcia portfolio | w repozytorium, folder `media/portfolio/` (podfolder = kategoria) | 0 zł |
| Panel do edycji treści | Pages CMS (app.pagescms.org) | 0 zł |
| Rezerwacje | własny kalendarz (Google Apps Script + Kalendarz Google) | 0 zł |
| Formularz kontaktowy | ten sam skrypt Google Apps Script (maile z Gmaila) | 0 zł (do ~100 maili/dobę) |
| Własna domena (opcjonalnie) | np. ewelinakucharczyk.pl | ~10–60 zł/rok |

## Struktura

```
index.html                  – SZABLON strony (pola w {{…}} wypełniane treściami z content/)
content/                    – ⭐ treści edytowane w panelu: strona.json, o-mnie.json, oferta.json,
                              galeria.json (podpisy zdjęć), wydarzenia/*.json, teksty.json (nagłówki sekcji),
                              wyglad.json (czcionki), firma.json (dane do polityki prywatności), rezerwacje.json
media/portfolio/<Kategoria>/ – ⭐ zdjęcia galerii; każdy podfolder = przycisk kategorii
media/strona/, media/wydarzenia/ – zdjęcia do „O mnie” i wydarzeń
.pages.yml                  – konfiguracja panelu Pages CMS (pola, etykiety)
build/build.mjs             – budowanie strony do _site/ (teksty, lista zdjęć, zmniejszanie zdjęć, sitemap)
build/fonty.mjs             – czcionki z panelu: pobiera z Google Fonts przy publikacji i hostuje na stronie;
                              build/fonty-domyslne/ – domyślne czcionki w repozytorium (build działa bez internetu)
czcionki.html               – podgląd czcionek do wyboru (dla Eweliny, nie ma do niej linku)
.github/workflows/strona.yml – automatyczne budowanie i publikacja po każdej zmianie
js/config.js                – ustawienia techniczne: adres skryptu (rezerwacje + formularz)
js/main.js, js/rezerwacje.js – logika (nie trzeba ruszać); js/wspolne.js – wspólne drobiazgi obu plików
404.html                    – strona „nie ma takiej strony” (szablon, link na stronę główną z panelu)
favicon.svg                 – ikona karty; build robi z niej ikonę na telefon (apple-touch-icon.png)
css/style.css               – wygląd (kolory na górze pliku, sekcja :root)
polityka-prywatnosci.html   – SZABLON polityki prywatności (dane administratora z panelu „Dane firmy”)
```

## Edycja treści i zdjęć – panel Pages CMS
Wejdź na https://app.pagescms.org, zaloguj się i wybierz repozytorium `kucharczyk-photo`.
Każdy zapis w panelu to commit w repozytorium (historia zostaje, każdą zmianę można cofnąć),
a po ok. 1–2 minutach strona aktualizuje się sama (postęp: zakładka **Actions** w repozytorium).

- **Wydarzenia i warsztaty** – „Dodaj”, wypełnij formularz. Minione wydarzenia znikają ze strony same.
- **Oferta i cennik**, **O mnie**, **Strona główna i kontakt**, **Teksty sekcji** – zwykłe formularze.
- **Strona główna i kontakt → „Strona gotowa – pokazuj ją w Google”** – dopóki odznaczone, strona ma `noindex`
  (Google jej nie pokazuje). Zaznaczyć po uzupełnieniu treści i przeniesieniu na docelową domenę.
- **Wygląd – czcionki** – czcionka nagłówków, tekstu i napisów odręcznych (lista albo dowolna nazwa z fonts.google.com).
  Podgląd: adres strony + `czcionki.html`. Font bez polskich znaków albo z literówką → ostrzeżenie w Actions, zostaje domyślny.
- **Dane firmy (polityka prywatności)** – imię i nazwisko, adres, NIP, e-mail; puste pola są w polityce zaznaczone.
- **Media → Portfolio** – każdy folder to kategoria w galerii:
  - nowy folder = nowy przycisk kategorii (pusty folder się nie wyświetla),
  - liczba na początku nazwy ustala kolejność i nie jest wyświetlana (`1 Rodzinne i dziecięce`),
  - zdjęcia można wgrywać prosto z aparatu – przy publikacji są zmniejszane (2000 px) i tracą dane EXIF/GPS,
  - format: JPG (PNG bez przezroczystości build sam zamienia na JPG). Zdjęcia HEIC z iPhone'a są pomijane –
    na iPhonie: Ustawienia → Aparat → Formaty → „Najbardziej zgodne”,
  - nowe zdjęcia pojawiają się na początku galerii; przeniesione do innego folderu zostają na swoim miejscu
    (ale podpis trzeba wtedy wybrać ponownie w „Portfolio – podpisy i kolejność”).
- **Portfolio – podpisy i kolejność** – opcjonalny podpis zdjęcia i przypinanie na początek.

> ⚠ Repozytorium jest publiczne, a oryginał wgranego pliku zostaje w historii. Zdjęcia z telefonu
> mają w sobie lokalizację GPS – najlepiej eksportować je bez lokalizacji (np. Lightroom: Metadane → bez lokalizacji).

## Podgląd lokalnie
```bash
npm install        # raz (moduł sharp do zmniejszania zdjęć)
npm run build      # wynik w _site/ – otwórz _site/index.html
```

## Krok 4 – własny kalendarz rezerwacji
Kalendarz w stylu strony, po polsku: klient wybiera pakiet, dzień i wolną godzinę i wysyła **prośbę
o rezerwację**. Termin od razu blokuje się w Kalendarzu Google, a Ty potwierdzasz go lub odrzucasz
jednym przyciskiem w mailu. Zaplecze to darmowy skrypt Google Apps Script na Twoim koncie Google.
- Wdrożenie krok po kroku: `rezerwacje/INSTRUKCJA.md`.
- Adres skryptu wklejasz w `js/config.js` → `rezerwacjeUrl`. Gdy puste – zamiast kalendarza strona prosi o kontakt mailowy.
- Podgląd wyglądu bez skryptu: dopisz do adresu strony `?rezerwacje=demo`.
- Klient może sam odwołać rezerwację linkiem z maila – prowadzi on na stronę `odwolanie.html` w stylu strony
  (podgląd: `odwolanie.html?demo=ok`, `?demo=zaPozno`, `?demo=brak`). Wydarzenie znika z kalendarza, a Ty dostajesz maila.
- Przycisk „Potwierdź lub odrzuć” w mailu otwiera stronę `decyzja.html` (podgląd: `decyzja.html?demo=prosba`,
  `?demo=potwierdzona`). Potwierdzoną sesję odwołujesz tym samym linkiem (przycisk „Odwołaj sesję”, klient dostaje maila).
- Co godzinę skrypt: wygasza nierozpatrzone prośby (domyślnie po 3 dniach, mail do klienta), raz dziennie przypomina
  o prośbach czekających ponad dobę i wysyła klientom przypomnienie przed sesją (domyślnie 2 dni wcześniej).
- **Godziny, dni, przerwy, limity, wstrzymanie rezerwacji, święta, wygasanie, przypomnienia i tekst autoodpowiedzi** – w panelu:
  „Rezerwacje – godziny i zasady” (`content/rezerwacje.json`). **Nazwy i czas pakietów** – w „Oferta i cennik”.
  Build dopisuje pakiety do opublikowanego `…/rezerwacje.json`, a skrypt czyta go z ok. 5-minutowym opóźnieniem;
  gdy strona nie odpowiada – ostatnie wczytane albo zapasowe z `USTAWIENIA` w `Kod.gs`.
  Po zmianie domeny: właściwość skryptu `stronaWww` (bez zmiany kodu) – patrz `rezerwacje/INSTRUKCJA.md`, „Przeprowadzka”.

## Wydarzenia (warsztaty, plenery, mini-sesje)
Dodaje się je w panelu (patrz wyżej). Zapisy: pole „Link do zapisów” (np. Formularz Google);
puste = przycisk „Zapisz się” przewija do formularza kontaktowego z gotową wiadomością.
Zaproszenie do subskrybentów: kampania w newsletterze z linkiem `…/#wydarzenia`.

## Krok 5 – formularz kontaktowy
Obsługuje go ten sam skrypt co rezerwacje (`rezerwacje/Kod.gs`, funkcja `kontakt_`) – nic osobnego nie trzeba zakładać.
- Wiadomość przychodzi na skrzynkę konta Google, na którym wdrożony jest skrypt. „Odpowiedz” trafia do klienta.
- Klient dostaje automatyczne potwierdzenie (bez treści swojej wiadomości – żeby formularza nie dało się użyć do spamu).
- Limity w `USTAWIENIA`: `kontaktNaEmail` (z jednego adresu na dobę) i `kontaktDziennie` (łącznie na dobę).
- Po każdej zmianie w `Kod.gs`: Wdróż → Zarządzaj wdrożeniami → ✏️ → Wersja: **Nowa wersja** → Wdróż (adres `/exec` się nie zmienia).

## Krok 6 – publikacja (GitHub Pages + GitHub Actions)
Repo: https://github.com/wilczasty/kucharczyk-photo, **Settings → Pages → Source: GitHub Actions**.
Każdy push / zapis w panelu uruchamia `.github/workflows/strona.yml`: `npm ci` → `npm run build` → publikacja `_site/`.

**Gdy zmiana z panelu nie pojawia się na stronie po ok. 5 minutach** (odśwież przez Ctrl+F5):
- uszkodzone zdjęcie albo nieobsługiwany plik nie zatrzymuje już publikacji – jest pomijany, a ostrzeżenie widać
  w zakładce **Actions** → ostatni przebieg → podsumowanie („Ostrzeżenia”),
- jeśli przebieg ma czerwony krzyżyk – publikacja się nie udała i strona została w poprzedniej wersji.
  Maila o tym dostaje tylko właściciel repozytorium (konto `wilczasty`), więc **Ewelina: napisz wtedy do Adriana**.

## Krok 7 – własna domena (opcjonalnie)
Kup domenę `.pl` (np. OVH, home.pl, nazwa.pl – pierwszy rok często za kilka zł, potem sprawdź cenę odnowienia!).
W GitHub: **Settings → Pages → Custom domain**, a u rejestratora dodaj rekordy DNS wg instrukcji GitHuba.

## Krok 8 – żeby ludzie ją znaleźli
- Załóż **Profil Firmy w Google** (Google Maps) – za darmo, najwięcej daje w lokalnym wyszukiwaniu.
- Dodaj link do strony na Facebooku i Instagramie.
- Zgłoś stronę w https://search.google.com/search-console.
