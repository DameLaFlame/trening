/* ==========================================================================
   sw.js — service worker, czyli tryb offline
   --------------------------------------------------------------------------
   Przy pierwszym otwarciu odkłada wszystkie pliki aplikacji na bok. Potem
   aplikacja startuje z tej kopii — bez internetu, w piwnicy, w samolocie.

   WAŻNE PRZY ZMIANACH W KODZIE:
   Po każdej poprawce w plikach podnieś numer poniżej (v1 -> v2 -> v3...).
   To jedyny sygnał dla telefonu, że ma pobrać nowe pliki zamiast kopii,
   którą już ma.
   ========================================================================== */

const WERSJA = 'silownia-v9';

/* Ścieżki są względne („./”), żeby aplikacja działała też w podkatalogu —
   a tak właśnie wygląda adres na GitHub Pages. */
const PLIKI = [
  './',
  './index.html',
  './style.css',
  './storage.js',
  './okna.js',
  './wykres.js',
  './edytor.js',
  './kategorie.js',
  './cwiczenia.js',
  './zestawy.js',
  './trening.js',
  './historia.js',
  './waga.js',
  './jedzenie.js',
  './progres.js',
  './rozciaganie.js',
  './kopia.js',
  './app.js',
  './manifest.json',
  './ikona-180.png',
  './ikona-192.png',
  './ikona-512.png'
];

/* --- instalacja: odkładamy pliki na bok --- */
self.addEventListener('install', zdarzenie => {
  zdarzenie.waitUntil(
    caches.open(WERSJA)
      .then(magazyn => magazyn.addAll(PLIKI))
      .then(() => self.skipWaiting())     // nowa wersja wchodzi od razu
  );
});

/* --- uruchomienie: sprzątamy kopie po starszych wersjach --- */
self.addEventListener('activate', zdarzenie => {
  zdarzenie.waitUntil(
    caches.keys()
      .then(nazwy => Promise.all(
        nazwy.filter(nazwa => nazwa !== WERSJA).map(nazwa => caches.delete(nazwa))
      ))
      .then(() => self.clients.claim())
  );
});

/* --- każde pobranie pliku ---
   Najpierw dajemy to, co mamy odłożone (aplikacja startuje natychmiast),
   a w tle sprawdzamy, czy w sieci nie ma nowszej wersji. */
self.addEventListener('fetch', zdarzenie => {
  if (zdarzenie.request.method !== 'GET') return;

  zdarzenie.respondWith(
    caches.match(zdarzenie.request).then(odlozone => {
      const zSieci = fetch(zdarzenie.request)
        .then(odpowiedz => {
          if (odpowiedz && odpowiedz.ok && odpowiedz.type === 'basic') {
            const kopia = odpowiedz.clone();
            caches.open(WERSJA).then(magazyn => magazyn.put(zdarzenie.request, kopia));
          }
          return odpowiedz;
        })
        .catch(() => odlozone || caches.match('./index.html'));

      return odlozone || zSieci;
    })
  );
});
