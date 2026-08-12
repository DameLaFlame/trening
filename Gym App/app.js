/* ==========================================================================
   app.js — nawigacja między ekranami + start aplikacji
   ========================================================================== */

/* Nazwy ekranów i tytuły w górnym pasku. */
const EKRANY = {
  trening:    'Trening',
  cwiczenia:  'Ćwiczenia',
  waga:       'Waga ciała',
  historia:   'Historia',
  progres:    'Progres',
  ustawienia: 'Ustawienia'
};

/* Skrót, żeby nie pisać za każdym razem document.getElementById. */
function el(id) { return document.getElementById(id); }

/* --------------------------------------------------------------------------
   Przełączanie ekranów
   -------------------------------------------------------------------------- */
function pokazEkran(nazwa) {
  if (!EKRANY[nazwa]) nazwa = 'trening';

  zamknijWyborCwiczenia();   // żadne okno nie może wisieć nad innym ekranem
  zamknijPytanie();
  edytowaneCwiczenie = null; // wyjście z ekranu kończy edycję nazwy

  // pokaż właściwą sekcję, resztę schowaj
  Object.keys(EKRANY).forEach(klucz => {
    el('ekran-' + klucz).hidden = (klucz !== nazwa);
  });

  // podświetl zakładkę na dole
  document.querySelectorAll('.zakladka').forEach(przycisk => {
    przycisk.classList.toggle('aktywna', przycisk.dataset.ekran === nazwa);
  });

  el('tytul-ekranu').textContent = EKRANY[nazwa];
  el('tresc').scrollTop = 0;

  // zapamiętaj, gdzie użytkownik skończył
  dane.ustawienia.ostatniaZakladka = nazwa;
  zapiszDane();

  odswiezEkran(nazwa);
}

/* Każdy ekran rysuje się na nowo w momencie wejścia. */
function odswiezEkran(nazwa) {
  if (nazwa === 'trening')    rysujTrening();
  if (nazwa === 'cwiczenia')  rysujCwiczenia();
  if (nazwa === 'waga')       rysujWage();
  if (nazwa === 'historia')   wejscieNaHistorie();
  if (nazwa === 'progres')    wejscieNaProgres();
  if (nazwa === 'ustawienia') rysujUstawienia();
}

/* --------------------------------------------------------------------------
   Ekran „Ustawienia” — podgląd tego, co siedzi w pamięci
   -------------------------------------------------------------------------- */
function rysujUstawienia() {
  el('licznik-cwiczen').textContent   = dane.cwiczenia.length;
  el('licznik-zestawow').textContent  = dane.zestawy.length;
  el('licznik-treningow').textContent = dane.treningi.length;
  el('licznik-wagi').textContent      = dane.pomiaryWagi.length;
  el('licznik-aktywny').textContent   = dane.aktywnyTrening ? 'tak' : 'nie';
  el('licznik-rozmiar').textContent   = rozmiarDanych();

  rysujKopie();
  pokazStanOffline();
}

/* --------------------------------------------------------------------------
   Tryb offline — kopia aplikacji odłożona w telefonie
   -------------------------------------------------------------------------- */
function pokazStanOffline() {
  const stan = el('stan-offline');
  const opis = el('opis-offline');

  if (location.protocol === 'file:') {
    stan.textContent = 'niepotrzebna';
    opis.textContent = 'Aplikacja jest otwarta prosto z pliku na dysku, ' +
                       'więc i tak działa bez internetu.';
    return;
  }
  if (!('serviceWorker' in navigator)) {
    stan.textContent = 'niedostępna';
    opis.textContent = 'Ta przeglądarka nie umie odkładać kopii aplikacji.';
    return;
  }

  navigator.serviceWorker.getRegistration().then(rejestracja => {
    const gotowa = !!(rejestracja && navigator.serviceWorker.controller);
    stan.textContent = gotowa ? 'gotowa' : 'przygotowuję…';
    opis.textContent = gotowa
      ? 'Aplikacja uruchomi się bez zasięgu. Po zmianach w kodzie odśwież ' +
        'stronę dwa razy, żeby telefon pobrał nową wersję.'
      : 'Odśwież stronę za chwilę — kopia właśnie się zapisuje.';
  });
}

/* --------------------------------------------------------------------------
   Rejestracja trybu offline
   -------------------------------------------------------------------------- */
function wlaczTrybOffline() {
  // Otwarta prosto z pliku (dwuklik w Finderze) aplikacja i tak działa bez
  // internetu, a przeglądarki blokują tam service workery.
  if (location.protocol === 'file:') return;
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.register('./sw.js')
    .catch(blad => console.warn('Nie udało się włączyć trybu offline.', blad));
}

/* --------------------------------------------------------------------------
   Start aplikacji
   -------------------------------------------------------------------------- */
function start() {
  // kliknięcia w dolne zakładki
  document.querySelectorAll('.zakladka').forEach(przycisk => {
    przycisk.addEventListener('click', () => pokazEkran(przycisk.dataset.ekran));
  });

  podepnijOkna();
  podepnijEdytor();
  podepnijTrening();
  podepnijCwiczenia();
  podepnijZestawy();
  podepnijHistorie();
  podepnijWage();
  podepnijProgres();
  podepnijKopie();

  // Rozpoczęty trening jest ważniejszy niż ostatnio oglądana zakładka —
  // po ponownym otwarciu aplikacji wracamy prosto do niego.
  const startowyEkran = dane.aktywnyTrening ? 'trening' : dane.ustawienia.ostatniaZakladka;
  pokazEkran(startowyEkran);

  wlaczTrybOffline();
}

start();
