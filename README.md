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
                              galeria.json (podpisy zdjęć), wydarzenia/*.json
media/portfolio/<Kategoria>/ – ⭐ zdjęcia galerii; każdy podfolder = przycisk kategorii
media/strona/, media/wydarzenia/ – zdjęcia do „O mnie” i wydarzeń
.pages.yml                  – konfiguracja panelu Pages CMS (pola, etykiety)
build/build.mjs             – budowanie strony do _site/ (teksty, lista zdjęć, zmniejszanie zdjęć)
.github/workflows/strona.yml – automatyczne budowanie i publikacja po każdej zmianie
js/config.js                – ustawienia techniczne: adres skryptu (rezerwacje + formularz)
js/main.js, js/rezerwacje.js – logika (nie trzeba ruszać)
css/style.css               – wygląd (kolory na górze pliku, sekcja :root)
polityka-prywatnosci.html   – RODO (uzupełnij dane!)
```

## Edycja treści i zdjęć – panel Pages CMS
Wejdź na https://app.pagescms.org, zaloguj się i wybierz repozytorium `kucharczyk-photo`.
Każdy zapis w panelu to commit w repozytorium (historia zostaje, każdą zmianę można cofnąć),
a po ok. 1–2 minutach strona aktualizuje się sama (postęp: zakładka **Actions** w repozytorium).

- **Wydarzenia i warsztaty** – „Dodaj”, wypełnij formularz. Minione wydarzenia znikają ze strony same.
- **Oferta i cennik**, **O mnie**, **Strona główna i kontakt** – zwykłe formularze.
- **Media → Portfolio** – każdy folder to kategoria w galerii:
  - nowy folder = nowy przycisk kategorii (pusty folder się nie wyświetla),
  - liczba na początku nazwy ustala kolejność i nie jest wyświetlana (`1 Rodzinne i dziecięce`),
  - zdjęcia można wgrywać prosto z aparatu – przy publikacji są zmniejszane (2000 px) i tracą dane EXIF/GPS,
  - nowe zdjęcia pojawiają się na początku galerii.
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
- Klient może sam odwołać rezerwację linkiem z maila (strona z przyciskiem „Tak, odwołuję”) – wydarzenie znika z kalendarza,
  a Ty dostajesz maila.
- **Godziny, dni, przerwy, limity i tekst autoodpowiedzi** – w panelu: „Rezerwacje – godziny i zasady”
  (`content/rezerwacje.json`). Skrypt czyta je z opublikowanej strony (`…/rezerwacje.json`) z ok. 5-minutowym opóźnieniem;
  gdy strona nie odpowiada – ostatnie wczytane albo zapasowe z `USTAWIENIA` w `Kod.gs`.
  Po zmianie domeny trzeba poprawić `stronaWww` w `Kod.gs` (i wdrożyć nową wersję).

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

## Krok 7 – własna domena (opcjonalnie)
Kup domenę `.pl` (np. OVH, home.pl, nazwa.pl – pierwszy rok często za kilka zł, potem sprawdź cenę odnowienia!).
W GitHub: **Settings → Pages → Custom domain**, a u rejestratora dodaj rekordy DNS wg instrukcji GitHuba.

## Krok 8 – żeby ludzie ją znaleźli
- Załóż **Profil Firmy w Google** (Google Maps) – za darmo, najwięcej daje w lokalnym wyszukiwaniu.
- Dodaj link do strony na Facebooku i Instagramie.
- Zgłoś stronę w https://search.google.com/search-console.
