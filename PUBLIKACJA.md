# Jak wrzucić aplikację do internetu i zainstalować ją na iPhonie

Instrukcja dla osoby, która nigdy tego nie robiła. Wszystko klika się w przeglądarce
— nie trzeba instalować żadnych programów ani znać żadnych komend.

Całość zajmuje jakieś 15 minut. Robisz to **raz**; późniejsze poprawki to już
minuta pracy (patrz ostatnia część).

---

## Zanim zaczniesz — dwie rzeczy do wiedzenia

**Kod aplikacji będzie widoczny publicznie.** Darmowy GitHub Pages działa tylko
z publicznych projektów. Nie ma w tym nic wrażliwego: publikujesz *program*, a nie
*swoje treningi*. Historia treningów zostaje w pamięci telefonu i nigdzie się nie
wysyła — nikt poza Tobą jej nie zobaczy.

**Adres będzie publiczny, ale nie do znalezienia.** Kto go zna, ten wejdzie. Zobaczy
pustą aplikację ze swoimi własnymi danymi (czyli żadnymi), bo dane nie podróżują
razem z adresem.

---

## Krok 1. Załóż konto na GitHubie

1. Wejdź na **https://github.com/signup**
2. Podaj adres e-mail, wymyśl hasło i nazwę użytkownika.
   **Nazwę użytkownika zapamiętaj** — będzie częścią adresu Twojej aplikacji.
   Najlepiej krótka, bez polskich znaków, np. `damianskow`.
3. Potwierdź e-mail — GitHub wyśle Ci kod do wpisania.
4. Gdy zapyta o plan, wybierz **Free**.

Masz już konto? Pomiń ten krok.

---

## Krok 2. Załóż miejsce na pliki (repozytorium)

1. Wejdź na **https://github.com/new**
2. **Repository name** — wpisz: `trening`
   (małe litery, bez spacji i polskich znaków)
3. Zaznacz **Public** (powinno być zaznaczone samo).
4. **Nie zaznaczaj** żadnego z pól „Add a README file", „Add .gitignore",
   „Choose a license".
5. Kliknij zielony **Create repository** na dole.

Zobaczysz stronę z instrukcjami dla programistów. Zignoruj je — idziemy dalej.

---

## Krok 3. Wrzuć pliki aplikacji

**Nie przeciągaj plików myszką.** Przeglądarka zamiast wgrać potrafi je po prostu
otworzyć — wystarczy upuścić o centymetr obok właściwego miejsca. Klikanie jest
pewniejsze.

1. Wejdź na adres (podmień nazwę użytkownika na swoją):

   ```
   https://github.com/TWOJA-NAZWA/trening/upload/main
   ```

   Poznasz właściwą stronę po dużym polu z przerywaną ramką i napisem
   *„Drag files here to add them to your repository or choose your files"*.

   Gdyby wyskoczył błąd 404, wróć na `https://github.com/TWOJA-NAZWA/trening`
   i kliknij tam link **„uploading an existing file"**.

2. Kliknij niebieski napis **„choose your files"**. Otworzy się okno Findera.

3. Przejdź do folderu **Gym App**, naciśnij **Cmd+A** (zaznacz wszystko)
   i kliknij **Otwórz**.

   Wrzucenie wszystkiego jest w porządku: pliki `BRIEF.md` i `PUBLIKACJA.md`
   niczemu nie szkodzą, a folder `.claude` jest w Finderze ukryty i sam się
   nie zaznaczy.

4. Poczekaj, aż nazwy plików pokażą się listą na stronie.

5. Zjedź na dół i kliknij zielony **Commit changes**.
   **Bez tego kroku nic się nie zapisuje** — samo wybranie plików nie wystarczy.

Aplikacja potrzebuje tych 18 plików:

```
index.html      storage.js      trening.js      ikona-180.png
style.css       okna.js         historia.js     ikona-192.png
manifest.json   wykres.js       waga.js         ikona-512.png
sw.js           edytor.js       progres.js
app.js          cwiczenia.js    zestawy.js
```

> **Sprawdź po wgraniu:** wejdź na `https://github.com/TWOJA-NAZWA/trening`.
> Na liście plików `index.html` musi być widoczny od razu, bez wchodzenia
> w żaden folder. Jeśli powstał folder „Gym App" — aplikacja nie ruszy
> (patrz „Gdyby coś nie zadziałało" na końcu).

---

## Krok 4. Włącz publikowanie

1. W swoim projekcie kliknij zakładkę **Settings** (na górze, koło zębate).
2. W menu po lewej kliknij **Pages**.
3. W sekcji **Build and deployment**:
   - **Source**: zostaw „Deploy from a branch"
   - **Branch**: wybierz z listy **main**, obok zostaw **/ (root)**
4. Kliknij **Save**.
5. Odśwież stronę po minucie. Na górze pojawi się zielona ramka z adresem:

```
https://TWOJA-NAZWA.github.io/trening/
```

To jest adres Twojej aplikacji. Pierwsze uruchomienie potrafi zająć 2–3 minuty —
jeśli widzisz błąd 404, odczekaj chwilę i odśwież.

---

## Krok 5. Sprawdź na komputerze

Otwórz ten adres w przeglądarce na Macu. Powinieneś zobaczyć aplikację.

Wejdź w zakładkę **Ustaw.** i sprawdź wiersz **„Kopia aplikacji w telefonie"** —
po chwili (może wymagać jednego odświeżenia) ma tam być **gotowa**. To znaczy,
że tryb offline działa.

---

## Krok 6. Zainstaluj na iPhonie

1. Otwórz adres `https://TWOJA-NAZWA.github.io/trening/` **w Safari** na iPhonie.
   Musi to być Safari — Chrome na iPhonie nie umie dodawać aplikacji do ekranu
   początkowego.
2. Kliknij przycisk **udostępniania** na dolnym pasku (kwadrat ze strzałką w górę).
3. Przewiń listę w dół i wybierz **„Dodaj do ekranu początkowego"**.
4. Nazwa („Trening") i ikona ze sztangą podstawią się same. Kliknij **Dodaj**.
5. Zamknij Safari i uruchom aplikację z nowej ikony na ekranie.

Powinna otworzyć się na pełnym ekranie, bez paska adresu — jak zwykła aplikacja.

### Co sprawdzić na telefonie

- **Dolne zakładki** działają, wszystko mieści się na ekranie.
- **Rozpocznij trening** → wybór zestawu → wpisywanie serii. Klawiatura ma być
  numeryczna, przecinek ma działać.
- **Tryb samolotowy** → zamknij aplikację i otwórz z ikony ponownie.
  Ma się uruchomić normalnie. To jest ten test, który najbardziej się liczy —
  w piwnicy siłowni nie ma zasięgu.
- **Wpisz trening bez zasięgu**, wyjdź, wróć — ma być zapisany.

---

## Jak wgrać poprawki przez GitHub Desktop (tak robimy teraz)

Od momentu, gdy folder `Gym App` jest połączony z GitHubem, wgrywanie zmian
to jedno kliknięcie:

1. Otwórz **GitHub Desktop**.
2. Jeśli projektu nie ma jeszcze na liście: **File → Add Local Repository…**
   (skrót **Cmd+O**) → **Choose…** → wskaż `Documents/Damian/Gym App` →
   **Add Repository**.
   Można też kliknąć **Current Repository** w lewym górnym rogu → **Add** →
   **Add Existing Repository…**
3. Na górze okna pojawi się **Push origin** z liczbą commitów. Kliknij.
4. Poczekaj minutę i odśwież aplikację na telefonie (dwa razy).

> **Od teraz nie wgrywaj plików przez stronę GitHuba.** Mieszanie obu sposobów
> rozjeżdża historię projektu i trzeba to potem prostować. Wybieramy jeden:
> GitHub Desktop.

---

## Wgrywanie przez przeglądarkę (sposób zapasowy)

Za każdym razem, gdy coś w aplikacji zmienimy:

1. W pliku **`sw.js`** trzeba podnieść numer wersji w drugiej linijce:
   `silownia-v1` → `silownia-v2` → `silownia-v3`…
   **Bez tego telefon będzie w kółko pokazywał starą wersję.**
   (Ja o tym pamiętam przy każdej zmianie — piszę, żebyś wiedział, po co to jest.)
2. Wejdź na `https://github.com/TWOJA-NAZWA/trening`
3. Kliknij **Add file** → **Upload files**.
4. Przeciągnij zmienione pliki (albo wszystkie — nadpiszą stare).
5. Kliknij **Commit changes**.
6. Poczekaj minutę. Na telefonie otwórz aplikację i **odśwież ją dwa razy** —
   za pierwszym razem telefon pobiera nową wersję w tle, za drugim ją pokazuje.

**Twoje treningi przeżywają aktualizację.** Dane siedzą w pamięci telefonu,
a wgranie nowych plików ich nie rusza.

---

## Gdyby coś nie zadziałało

**Przeciągam pliki, a przeglądarka je otwiera zamiast wgrać**
Upuszczasz je poza polem do wgrywania albo jesteś na zwykłej stronie projektu
zamiast na stronie wgrywania. Nie przeciągaj — wejdź na
`https://github.com/TWOJA-NAZWA/trening/upload/main` i kliknij
**„choose your files"**.

**Wybrałem pliki, ale po odświeżeniu ich nie ma**
Nie kliknąłeś zielonego **Commit changes** na dole strony. Samo wybranie plików
niczego nie zapisuje.

**Błąd „The custom domain … is not properly formatted"**
Adres wylądował w polu **Custom domain** na stronie Settings → Pages. To pole
służy do czegoś zupełnie innego (własna domena typu `mojastrona.pl`) i ma
zostać **puste**. Adresy z tej instrukcji wpisuje się w **pasek adresu
przeglądarki**, na samej górze okna. Zamknij komunikat krzyżykiem i zostaw
pole Custom domain puste.

**Strona daje 404, a w zakładce Actions build wisi w „queued" albo jest czerwony**
Najpierw sprawdź **https://www.githubstatus.com** — jeśli przy „Actions" albo
„Pages" świeci się coś innego niż zielone „Operational", to awaria po stronie
GitHuba i trzeba poczekać.

Gdy awaria minie, **nieudany build trzeba powtórzyć ręcznie** — sam się nie
uruchomi. Zakładka **Actions** → kliknij wpis „pages build and deployment" →
**Re-run all jobs** w prawym górnym rogu.

Alternatywnie wgraj jakikolwiek plik, bo każde wgranie uruchamia build od nowa.
Dobrym kandydatem jest pusty plik `.nojekyll`: **Add file** → **Create new
file** → nazwa `.nojekyll` (z kropką z przodu), treść pusta → **Commit
changes**. Wyłącza on niepotrzebne przetwarzanie strony przez GitHuba —
aplikacja to gotowy HTML i żadnej obróbki nie wymaga.

**Wgrałem pliki, a aplikacja się nie zmieniła**
Najczęstsza przyczyna: przeciągnięcie na stronę GitHuba **całego folderu**
zamiast samych plików. Wtedy powstaje podkatalog (np. `Gym App/`) obok
aplikacji, a pliki w katalogu głównym zostają stare — GitHub Pages nadal
pokazuje starą wersję. Wejdź na `https://github.com/DameLaFlame/trening`
i sprawdź, czy na liście nie ma dodatkowego folderu.

Druga możliwość: nie podniesiony numer wersji w `sw.js` (patrz niżej).

**Widzę 404 zamiast aplikacji**
Sprawdź, czy `index.html` leży bezpośrednio w projekcie, a nie w folderze.
Wejdź na `https://github.com/TWOJA-NAZWA/trening` — na liście plików musi być
widoczny `index.html`. Jeśli jest tam folder, wejdź w niego, otwórz każdy plik,
kliknij ikonę kosza i wgraj pliki jeszcze raz, tym razem bez folderu.

**Strona jest biała albo wygląda jak goły tekst**
Nie wgrał się `style.css` albo któryś plik `.js`. Porównaj listę plików
na GitHubie z listą z kroku 3 — musi być wszystkie 18.

**Ikona na ekranie iPhone'a jest szara albo pokazuje zrzut strony**
Nie wgrały się pliki `ikona-*.png` albo `manifest.json`.

**Aplikacja nie działa w trybie samolotowym**
Otwórz ją raz przy włączonym internecie i poczekaj kilkanaście sekund —
telefon musi zdążyć odłożyć kopię. Potem spróbuj ponownie.

**Zmieniłem pliki, a telefon pokazuje starą wersję**
Nie podniesiony numer wersji w `sw.js` (patrz wyżej). Awaryjnie: usuń aplikację
z ekranu początkowego i dodaj ją od nowa — **ale uwaga, to skasuje zapisane
treningi**, bo dane idą razem z aplikacją.
