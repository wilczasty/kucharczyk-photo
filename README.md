# Strona – Ewelina Kucharczyk Fotografia

Statyczna strona (HTML + CSS + JS), bez żadnych płatnych usług.

| Co | Czym | Koszt |
|---|---|---|
| Hosting | GitHub Pages (lub Cloudflare Pages / Netlify) | 0 zł |
| Zdjęcia portfolio | w repozytorium, folder `media/portfolio/` (podfolder = kategoria) | 0 zł |
| Panel do edycji treści | Pages CMS (app.pagescms.org) | 0 zł |
| Rezerwacje | własny kalendarz (Google Apps Script + Kalendarz Google) | 0 zł |
| Formularz kontaktowy | Web3Forms | 0 zł (250 wiadomości/mies.) |
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
js/config.js                – ustawienia techniczne: rezerwacje, klucz formularza
js/main.js, js/rezerwacje.js – logika (nie trzeba ruszać)
css/style.css               – wygląd (kolory na górze pliku, sekcja :root)
polityka-prywatnosci.html   – RODO (uzupełnij dane!)
images/                     – grafiki wyglądu (tła), images/dodatkowe – nieużyte zdjęcia
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

## Krok 4a – własny kalendarz rezerwacji (zalecane)
Kalendarz w stylu strony, po polsku: klient wybiera pakiet, dzień i wolną godzinę i wysyła **prośbę
o rezerwację**. Termin od razu blokuje się w Kalendarzu Google, a Ty potwierdzasz go lub odrzucasz
jednym przyciskiem w mailu. Zaplecze to darmowy skrypt Google Apps Script na Twoim koncie Google.
- Wdrożenie krok po kroku: `rezerwacje/INSTRUKCJA.md`.
- Adres skryptu wklejasz w `js/config.js` → `rezerwacjeUrl`. Gdy puste – działa cal.com (niżej).
- Podgląd wyglądu bez skryptu: dopisz do adresu strony `?rezerwacje=demo`.

## Krok 4 – rezerwacje przez Kalendarz Google
> **Test na własnym koncie:** zrób wszystko poniżej na swoim koncie Google i wklej swój link.
> Rezerwacje testowe trafią do Twojego kalendarza. Gdy wszystko działa, Ewelina tworzy taki sam
> harmonogram u siebie, a Ty podmieniasz tylko linki w `booking` w `js/config.js`. Nic więcej się nie zmienia.

1. Wejdź na https://calendar.google.com (na komputerze).
2. **Utwórz → Harmonogram spotkań** (Appointment schedule).
3. Ustaw: nazwę („Sesja zdjęciowa”), czas trwania, dostępne dni/godziny, bufor między sesjami,
   maksymalną liczbę rezerwacji dziennie, pola formularza (np. telefon, rodzaj sesji).
   Kalendarz automatycznie ukrywa godziny, w których Ewelina ma już coś w kalendarzu.
4. Zapisz → kliknij harmonogram → **Udostępnij** → **Umieszczenie na stronie (Website embed)** → **Wbudowany harmonogram (Inline)**.
5. Z kodu `<iframe src="...">` skopiuj sam adres (zaczyna się od `https://calendar.google.com/calendar/appointments/schedules/...`)
   i wklej do `js/config.js` w tablicę `booking` (pole `url` przy odpowiednim pakiecie).
   Link skrócony z „Udostępnij” (`https://calendar.app.google/...`) też zadziała.

**Różne długości sesji (S 30 / M 50 / L 90 min):** jeden harmonogram Google = jedna długość spotkania,
więc tworzysz 3 harmonogramy (np. „Sesja S – 30 min”, „Sesja M – 50 min”, „Sesja L – 90 min”) z tymi samymi godzinami
dostępności. Każdy sprawdza ten sam kalendarz, więc rezerwacja w jednym blokuje termin w pozostałych.
Na stronie klient przełącza pakiet zakładkami nad kalendarzem.

Każda rezerwacja pojawia się od razu w Kalendarzu Google Eweliny, a klient dostaje maila z potwierdzeniem.
(W darmowym koncie Google jest jeden podstawowy harmonogram – w zupełności wystarczy. Wersja płatna
dodaje m.in. przypomnienia mailowe i płatności online.)

**Używane teraz: cal.com** (plan darmowy) – łączy się z Kalendarzem Google, a klient w jednym kalendarzu
sam wybiera długość sesji (30 / 50 / 90 min). Ustawienie: Event Types → typ sesji → Duration → „Allow multiple durations”.
Na stronie: `js/config.js` → `calLink` (końcówka linku po `https://cal.com/`). Gdy `calLink` jest puste,
strona pokazuje harmonogram(y) Google z pola `booking`.

## Wydarzenia (warsztaty, plenery, mini-sesje)
Dodaje się je w panelu (patrz wyżej). Zapisy: pole „Link do zapisów” (np. typ wydarzenia w cal.com z „Seats”);
puste = przycisk „Zapisz się” przewija do formularza kontaktowego z gotową wiadomością.
Zaproszenie do subskrybentów: kampania w newsletterze z linkiem `…/#wydarzenia`.

## Krok 5 – formularz kontaktowy (Web3Forms)
1. Wejdź na https://web3forms.com → wpisz e-mail Eweliny → „Create Access Key”.
2. Klucz przyjdzie mailem – wklej go do `js/config.js` w pole `web3formsKey`.
3. Wiadomości z formularza trafiają prosto na tę skrzynkę.

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
