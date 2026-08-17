/* ==========================================================================
   storage.js — wszystko, co dotyczy pamięci telefonu (localStorage)
   --------------------------------------------------------------------------
   Cała aplikacja trzyma dane w JEDNYM miejscu: zmienna `dane`.
   Po każdej zmianie wołamy zapiszDane() — wtedy dane lądują w pamięci
   przeglądarki i przeżyją zamknięcie aplikacji.
   ========================================================================== */

/* Pod tym kluczem siedzą dane w pamięci przeglądarki. */
const KLUCZ_DANYCH = 'silownia-dane-v1';

/* Kategorie wpisywane automatycznie przy pierwszym uruchomieniu. */
const DOMYSLNE_KATEGORIE = [
  'Klatka',
  'Plecy',
  'Barki',
  'Biceps',
  'Triceps',
  'Nogi',
  'Brzuch',
  'Cardio'
];

/* Ćwiczenia wpisywane automatycznie przy pierwszym uruchomieniu,
   razem z kategorią, do której należą. */
const DOMYSLNE_CWICZENIA = {
  'Przysiad ze sztangą':           'Nogi',
  'Martwy ciąg':                   'Plecy',
  'Wyciskanie leżąc':              'Klatka',
  'Wyciskanie żołnierskie':        'Barki',
  'Wiosłowanie sztangą':           'Plecy',
  'Podciąganie':                   'Plecy',
  'Wyciskanie hantlami skos':      'Klatka',
  'Uginanie ramion ze sztangą':    'Biceps',
  'Prostowanie ramion na wyciągu': 'Triceps',
  'Wyciskanie nogami':             'Nogi'
};

/* Pozycje rozciągania wpisywane automatycznie przy pierwszym uruchomieniu. */
const DOMYSLNE_POZYCJE_ROZCIAGANIA = [
  'Skłon w przód (proste nogi)',
  'Rozciąganie klatki w drzwiach',
  'Koci grzbiet',
  'Gołąb — biodra',
  'Rozciąganie czworogłowego stojąc',
  'Skłon do nóg w siadzie',
  'Rozciąganie barku w poprzek',
  'Skręt tułowia leżąc'
];

/* Krótki, niepowtarzalny identyfikator (np. dla ćwiczenia albo treningu). */
function nowyId() {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
}

/* Data z obiektu Date w formacie 2026-08-06 — łatwo po niej sortować. */
function isoZDaty(d) {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function dzisiajISO() {
  return isoZDaty(new Date());
}

/* --------------------------------------------------------------------------
   Wspólne narzędzia — używane przez kilka ekranów
   -------------------------------------------------------------------------- */

/* '2026-08-06' -> 'dzisiaj', 'wczoraj' albo '6 sierpnia' (rok dopisany, gdy inny). */
function formatujDate(iso) {
  if (!iso) return '';
  if (iso === dzisiajISO()) return 'dzisiaj';

  const wczoraj = new Date();
  wczoraj.setDate(wczoraj.getDate() - 1);
  const data = new Date(iso + 'T12:00:00');

  if (data.toDateString() === wczoraj.toDateString()) return 'wczoraj';

  const opcje = { day: 'numeric', month: 'long' };
  if (data.getFullYear() !== new Date().getFullYear()) opcje.year = 'numeric';
  return data.toLocaleDateString('pl-PL', opcje);
}

/* '2026-08-06' -> '6.08' — krótka etykieta pod wykresem. */
function formatujDateKrotko(iso) {
  if (!iso) return '';
  const czesci = iso.split('-');
  return Number(czesci[2]) + '.' + czesci[1];
}

/* Godzina 'HH:MM' z pełnego znacznika czasu. */
function formatujGodzine(znacznik) {
  if (!znacznik) return '';
  return new Date(znacznik).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
}

/* Liczba po polsku: 82.5 -> '82,5'. */
function formatujKg(kg) {
  return String(kg).replace('.', ',');
}

/* Jedna seria -> '80 kg × 8' (przy ciężarze 0 -> 'masa własna × 8'). */
function opisSerii(seria) {
  const ciezar = seria.kg > 0 ? `${formatujKg(seria.kg)} kg` : 'masa własna';
  return `${ciezar} × ${seria.powt}`;
}

/* Lista serii -> '80 kg × 8, 80 kg × 7, 75 kg × 8'. */
function opisListySerii(serie) {
  return serie.map(opisSerii).join(', ');
}

/* Odmiana słowa po liczbie: 1 seria, 2 serie, 5 serii. */
function odmien(liczba, jeden, dwa, piec) {
  if (liczba === 1) return jeden;
  const reszta = liczba % 10;
  const setki = liczba % 100;
  if (reszta >= 2 && reszta <= 4 && (setki < 12 || setki > 14)) return dwa;
  return piec;
}

/* Tak wygląda komplet danych przy pierwszym uruchomieniu. */
function pustaBaza() {
  const kategorie = DOMYSLNE_KATEGORIE.map(nazwa => ({ id: nowyId(), nazwa: nazwa }));

  const idKategorii = nazwaKategorii => {
    const znaleziona = kategorie.find(k => k.nazwa === nazwaKategorii);
    return znaleziona ? znaleziona.id : null;
  };

  return {
    wersja: 1,
    kategorie: kategorie,
    cwiczenia: Object.keys(DOMYSLNE_CWICZENIA).map(nazwa => ({
      id: nowyId(),
      nazwa: nazwa,
      kategoriaId: idKategorii(DOMYSLNE_CWICZENIA[nazwa])
    })),
    zestawy: [],           // gotowe zestawy ćwiczeń do powtarzania
    treningi: [],          // zakończone treningi
    aktywnyTrening: null,  // trening rozpoczęty, jeszcze nie zakończony
    pomiaryWagi: [],       // waga ciała
    posilki: [],           // zjedzone posiłki (kalorie i białko)
    rozciaganie: DOMYSLNE_POZYCJE_ROZCIAGANIA.map(nazwa => ({ id: nowyId(), nazwa: nazwa })),
    zestawyRozciagania: [], // gotowe zestawy rozciągania (z timerem)
    rozciaganieDaty: [],    // dni (ISO), w które ukończono zestaw — do liczenia serii
    profil: {              // dane do liczenia dziennego celu kcal i białka
      wiek: 24,
      wzrost: 180,         // cm
      plec: 'm',           // m | k
      tryb: 'poza',        // poza | sezon (współczynnik aktywności)
      nadwyzka: 400,       // kcal ponad zapotrzebowanie (budowa masy)
      bialkoNaKg: 2.0      // g białka na kg masy ciała
    },
    ustawienia: {
      ostatniaZakladka: 'trening',
      skalaWagi: 'dzien',        // dzien | tydzien | miesiac
      sekcjaWagi: 'waga',        // waga | jedzenie — podzakładka ekranu Waga
      ostatniaKopia: null,       // kiedy ostatnio zapisano kopię danych
      przypominajOKopii: 'tydzien'   // dzien | tydzien | miesiac | nigdy
    }
  };
}

/* Wczytanie danych z pamięci. Gdy pusto albo coś jest zepsute — zaczynamy od zera. */
function wczytajDane() {
  try {
    const tekst = localStorage.getItem(KLUCZ_DANYCH);
    if (!tekst) return pustaBaza();

    const wczytane = JSON.parse(tekst);
    const baza = pustaBaza();

    // Doklejamy brakujące pola — dzięki temu starsze dane nie wysypią aplikacji.
    const polaczone = Object.assign(baza, wczytane, {
      ustawienia: Object.assign(baza.ustawienia, wczytane.ustawienia || {}),
      profil: Object.assign(baza.profil, wczytane.profil || {})
    });

    uzupelnijKategorie(polaczone);
    return polaczone;
  } catch (blad) {
    console.warn('Nie udało się wczytać danych, zaczynam od pustej bazy.', blad);
    return pustaBaza();
  }
}

/* Dane zapisane zanim istniały kategorie nie mają ich przy ćwiczeniach.
   Podstawową dziesiątkę rozpoznajemy po nazwie, reszta ląduje bez kategorii —
   można ją przypisać ręcznie w zakładce „Ćwicz.”. */
function uzupelnijKategorie(baza) {
  if (!Array.isArray(baza.kategorie)) baza.kategorie = [];

  baza.cwiczenia.forEach(cwiczenie => {
    if (cwiczenie.kategoriaId) return;             // już przypisane

    const nazwaKategorii = DOMYSLNE_CWICZENIA[cwiczenie.nazwa];
    const kategoria = nazwaKategorii
      ? baza.kategorie.find(k => k.nazwa === nazwaKategorii)
      : null;

    cwiczenie.kategoriaId = kategoria ? kategoria.id : null;
  });
}

/* Zapis danych do pamięci. Wołane po KAŻDEJ zmianie. */
function zapiszDane() {
  try {
    localStorage.setItem(KLUCZ_DANYCH, JSON.stringify(dane));
    return true;
  } catch (blad) {
    console.error('Nie udało się zapisać danych.', blad);
    alert('Uwaga: nie udało się zapisać danych w pamięci telefonu.');
    return false;
  }
}

/* Ile miejsca zajmują dane — pokazujemy w Ustawieniach. */
function rozmiarDanych() {
  const tekst = localStorage.getItem(KLUCZ_DANYCH) || '';
  return (tekst.length / 1024).toFixed(1) + ' KB';
}

/* Główny worek z danymi, dostępny w całej aplikacji. */
let dane = wczytajDane();

/* Pierwsze uruchomienie: od razu zapisujemy, żeby lista ćwiczeń miała gdzie usiąść. */
if (!localStorage.getItem(KLUCZ_DANYCH)) {
  zapiszDane();
}
