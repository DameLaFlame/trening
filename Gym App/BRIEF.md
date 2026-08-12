# Brief: aplikacja do śledzenia treningów na siłowni

> Ten plik wklej do Claude Code jako pierwsze zadanie.
> Zapisz go w folderze projektu — Claude Code będzie do niego wracał.

---

## Cel

Prosta aplikacja webowa (PWA) do zapisywania treningów siłowych i wagi ciała.
Używana wyłącznie przez jedną osobę, na iPhonie, głównie **offline** (w piwnicy
siłowni często nie ma zasięgu).

Autor projektu **nie programuje**. Kod ma być czytelny, ale przede wszystkim ma
po prostu działać. Wyjaśniaj po polsku, co robisz, bez żargonu.

## Technologia

- Czysty HTML + CSS + JavaScript (bez Reacta, bez frameworków, bez build stepu)
- Dane w `localStorage` przeglądarki
- `manifest.json` + service worker, żeby działało offline i dało się dodać
  do ekranu początkowego iPhone'a
- Wszystko ma działać po otwarciu `index.html` — bez kompilowania

## Ekrany (wersja 1)

### 1. Trening (ekran główny)

- Duży przycisk **„Rozpocznij trening"**
- Podczas treningu: wybieram ćwiczenie z listy → dodaję serie
- Każda seria = **ciężar (kg)** + **liczba powtórzeń**
- Mogę dodać dowolną liczbę serii do ćwiczenia
- Mogę dodać kilka ćwiczeń do jednego treningu
- Przycisk **„Zakończ trening"** zapisuje wszystko z datą

**Kluczowe ułatwienie:** przy wyborze ćwiczenia pokaż, co robiłem ostatnim razem
(np. „Ostatnio: 80 kg × 8, 80 kg × 7, 75 kg × 8") i podstaw te wartości jako
domyślne. Chcę tylko poprawić liczbę, a nie wpisywać wszystko od zera.

**Dodatkowo:** przycisk „Powtórz serię" — kopiuje poprzednią serię tego ćwiczenia
jednym kliknięciem.

### 2. Ćwiczenia

- Lista moich ćwiczeń
- Mogę dodać własne, edytować nazwę, usunąć
- Na start wypełnij listę podstawowymi: przysiad ze sztangą, martwy ciąg,
  wyciskanie leżąc, wyciskanie żołnierskie, wiosłowanie sztangą, podciąganie,
  wyciskanie hantlami skos, uginanie ramion ze sztangą, prostowanie ramion
  na wyciągu, wyciskanie nogami

### 3. Waga ciała

- Pole: waga (kg) + data (domyślnie dzisiaj)
- Lista wszystkich pomiarów
- Wykres wagi w czasie

### 4. Historia

- Lista treningów od najnowszego
- Kliknięcie w trening pokazuje szczegóły (ćwiczenia, serie, ciężary)
- Mogę edytować lub usunąć zapisany trening (pomyłki się zdarzają)

### 5. Progres

- Wybieram ćwiczenie → wykres pokazuje, jak zmieniał się mój najlepszy ciężar
  w czasie
- Pod wykresem: rekord życiowy dla tego ćwiczenia

### 6. Ustawienia

- **Eksport danych do pliku JSON** — to jest obowiązkowe, nie pomijaj
- **Import danych z pliku JSON**
- Przycisk „Usuń wszystkie dane" z potwierdzeniem

## Wygląd

- Ciemny motyw (na siłowni jaśniej się patrzy)
- **Duże przyciski i duże pola** — obsługa jedną ręką, spoconymi palcami,
  w trakcie serii
- Nawigacja: pasek z zakładkami na dole ekranu (jak w natywnych aplikacjach iOS)
- Zero animacji i ozdobników, ma być szybko i czytelnie
- Projektuj pod ekran iPhone'a (szerokość ok. 390 px), ale niech działa
  też w oknie przeglądarki na Macu

## Czego NIE robimy w wersji 1

Nie dodawaj tego, nawet jeśli wydaje się przydatne:

- kont użytkowników, logowania, synchronizacji z chmurą
- planów i szablonów treningowych
- timera przerw między seriami
- liczenia kalorii i makroskładników
- zdjęć sylwetki
- udostępniania i mediów społecznościowych

## Ważne uwagi techniczne

- Dane siedzą wyłącznie w pamięci przeglądarki na telefonie. Wyczyszczenie
  danych Safari albo usunięcie aplikacji = utrata historii. Dlatego eksport
  do JSON musi być w wersji 1 i ma być łatwo dostępny.
- Zapisuj do `localStorage` **po każdej dodanej serii**, a nie dopiero na
  koniec treningu. Jeśli aplikacja się zamknie w połowie, nie chcę stracić
  danych.
- Nieukończony trening (bez „Zakończ") ma się odtworzyć po ponownym otwarciu
  aplikacji.
- Service worker musi cache'ować wszystkie pliki, żeby aplikacja startowała
  bez internetu.

## Kolejność pracy

Buduj etapami i pokazuj mi efekt po każdym, zanim przejdziesz dalej:

1. Szkielet: nawigacja + puste ekrany + zapisywanie do localStorage
2. Ekran „Trening" — pełna obsługa dodawania ćwiczeń i serii
3. Ekran „Historia" — przeglądanie i usuwanie
4. Ekran „Waga ciała"
5. Ekran „Progres" z wykresami
6. Eksport / import JSON
7. PWA: manifest, ikona, service worker, tryb offline
8. Instrukcja publikacji na GitHub Pages — krok po kroku, dla osoby,
   która nigdy tego nie robiła

Po każdym etapie napisz mi po polsku, co dokładnie mam sprawdzić w przeglądarce.
