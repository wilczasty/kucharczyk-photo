# Strona – Ewelina Kucharczyk Fotografia

Statyczna strona (HTML + CSS + JS), bez żadnych płatnych usług.

| Co | Czym | Koszt |
|---|---|---|
| Hosting | GitHub Pages (lub Cloudflare Pages / Netlify) | 0 zł |
| Zdjęcia portfolio | w repozytorium, folder `images/portfolio/` | 0 zł |
| Rezerwacje | Kalendarz Google → „Harmonogram spotkań” | 0 zł |
| Formularz kontaktowy | Web3Forms | 0 zł (250 wiadomości/mies.) |
| Własna domena (opcjonalnie) | np. ewelinakucharczyk.pl | ~10–60 zł/rok |

## Struktura

```
index.html                  – cała strona
polityka-prywatnosci.html   – RODO (uzupełnij dane!)
css/style.css               – wygląd (kolory na górze pliku, sekcja :root)
js/config.js                – ⭐ TWOJE USTAWIENIA: e-mail, telefon, link do kalendarza, klucz formularza
js/portfolio.js             – ⭐ lista zdjęć w galerii
js/wydarzenia.js            – ⭐ wydarzenia / warsztaty (sekcja chowa się, gdy nie ma nadchodzących)
js/main.js                  – logika (nie trzeba ruszać)
images/o-mnie.jpg           – zdjęcie do sekcji „O mnie” (docelowo portret Eweliny)
images/dodatkowe/           – zdjęcia nieużyte na stronie
images/portfolio/           – zdjęcia do galerii
```

## Krok 1 – podgląd lokalnie
Otwórz `index.html` w przeglądarce (dwuklik). Z WSL: `explorer.exe .` w folderze projektu.

## Krok 2 – treści
W `index.html` szukaj komentarzy `TODO` – tekst „O mnie”, pakiety i ceny, FAQ.

## Krok 3 – zdjęcia
1. Wybierz 15–30 najlepszych zdjęć (pionowe i poziome na zmianę wyglądają najlepiej).
2. Zmniejsz je: dłuższy bok **2000 px**, jakość ~80%, rozmiar ~200–400 KB.
   Najprościej: https://squoosh.app (format WebP lub MozJPEG) albo darmowy IrfanView (Plik → Konwersja wsadowa).
3. Wgraj do `images/portfolio/`, a w `js/portfolio.js` usuń przykładowe wpisy i dopisz swoje:
   ```js
   { src: "images/portfolio/rodzina-01.jpg", category: "rodzinne", caption: "Ania i Tomek" },
   ```
4. Zdjęcie główne (hero) ustawiasz w `index.html` – szukaj `hero__bg`. Najlepiej poziome, ~2000 px.

> Nazwy plików bez spacji i polskich znaków (`slub-ania-01.jpg`, nie `Ślub Ania 01.JPG`).

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
1. Grafikę wrzuć do `images/wydarzenia/` (jpg ~1600 px szerokości).
2. W `js/wydarzenia.js` dopisz wpis (data, godziny, tytuł, opis, miejsce, cena, liczba miejsc, zdjęcie).
3. Minione wydarzenia znikają same. Gdy nie ma żadnego nadchodzącego, znika też sekcja i link w menu.
4. Zapisy: pole `zapisy` = link (np. typ wydarzenia w cal.com z włączonymi „Seats” – limit miejsc).
   Puste pole = przycisk „Zapisz się” przewija do formularza kontaktowego z gotową wiadomością.
5. Zaproszenie do subskrybentów: kampania w newsletterze (np. MailerLite) z linkiem `…/#wydarzenia`.

## Krok 5 – formularz kontaktowy (Web3Forms)
1. Wejdź na https://web3forms.com → wpisz e-mail Eweliny → „Create Access Key”.
2. Klucz przyjdzie mailem – wklej go do `js/config.js` w pole `web3formsKey`.
3. Wiadomości z formularza trafiają prosto na tę skrzynkę.

## Krok 6 – publikacja (GitHub Pages)
1. Załóż konto na https://github.com (najlepiej na mail Eweliny lub Twój).
2. Utwórz repozytorium, np. `ewelina-foto` (publiczne).
3. Wgraj pliki: przez przeglądarkę (**Add file → Upload files**, przeciągnij całą zawartość folderu)
   albo z terminala:
   ```bash
   git init && git add . && git commit -m "Pierwsza wersja strony"
   gh repo create ewelina-foto --public --source=. --push
   ```
4. W repo: **Settings → Pages → Branch: main / root → Save**.
5. Po ~1 min strona działa pod `https://<login>.github.io/ewelina-foto/`.

Każda zmiana (nowe zdjęcie, cena) = wgranie pliku / `git push` → strona aktualizuje się sama.

**Prostsza alternatywa bez Gita:** https://app.netlify.com/drop – przeciągasz folder i gotowe.

## Krok 7 – własna domena (opcjonalnie)
Kup domenę `.pl` (np. OVH, home.pl, nazwa.pl – pierwszy rok często za kilka zł, potem sprawdź cenę odnowienia!).
W GitHub: **Settings → Pages → Custom domain**, a u rejestratora dodaj rekordy DNS wg instrukcji GitHuba.

## Krok 8 – żeby ludzie ją znaleźli
- Załóż **Profil Firmy w Google** (Google Maps) – za darmo, najwięcej daje w lokalnym wyszukiwaniu.
- Dodaj link do strony na Facebooku i Instagramie.
- Zgłoś stronę w https://search.google.com/search-console.
