/* ==========================================================================
   edytor.js — wspólny kafelek ćwiczenia z seriami do poprawiania
   --------------------------------------------------------------------------
   Korzystają z niego dwa miejsca: ekran „Trening” (trening w toku) oraz
   „Historia” (poprawianie zapisanego treningu). Dzięki temu jedno i drugie
   wygląda i zachowuje się tak samo.

   „edytor” to zwykły obiekt z ustawieniami:
     trening         – obiekt treningu, na którym pracujemy
     poZmianie(tak)  – co zrobić po każdej zmianie (tak = przerysuj od nowa)
     pokazPodpowiedz – czy pokazywać „Ostatnio: 80 kg × 8…”
     kopiujSerie     – czy nowe ćwiczenie ma dostać serie z poprzedniego razu
   ========================================================================== */

/* --------------------------------------------------------------------------
   Szukanie, co było ostatnim razem
   -------------------------------------------------------------------------- */

/* Zapisane treningi ułożone od najnowszego. */
function treningiOdNajnowszych() {
  return [...dane.treningi].sort((a, b) =>
    String(b.rozpoczety || b.data).localeCompare(String(a.rozpoczety || a.data))
  );
}

/* Serie tego ćwiczenia z ostatniego treningu, w którym się pojawiło. */
function ostatnieSerie(cwiczenieId) {
  for (const trening of treningiOdNajnowszych()) {
    for (const wpis of trening.cwiczenia) {
      if (wpis.cwiczenieId === cwiczenieId && wpis.serie.length > 0) {
        return { data: trening.data, serie: wpis.serie };
      }
    }
  }
  return null;
}

/* Gotowy tekst podpowiedzi, np. „Ostatnio (wczoraj): 80 kg × 8, 80 kg × 7”. */
function tekstPodpowiedzi(cwiczenieId) {
  const ostatnie = ostatnieSerie(cwiczenieId);
  if (!ostatnie) return 'Pierwszy raz — brak wcześniejszych zapisów';
  return `Ostatnio (${formatujDate(ostatnie.data)}): ${opisListySerii(ostatnie.serie)}`;
}

/* Seria wypełniona do końca? (puste pola zdarzają się w trakcie treningu) */
function seriaKompletna(seria) {
  return typeof seria.kg === 'number' && typeof seria.powt === 'number';
}

/* Ile serii w treningu jest gotowych do zapisania. */
function ileGotowychSerii(trening) {
  return trening.cwiczenia
    .reduce((suma, wpis) => suma + wpis.serie.filter(seriaKompletna).length, 0);
}

/* Ćwiczenia z samymi wypełnionymi seriami — reszta odpada.
   Zwraca też, ile serii odpadło, żeby dało się o tym uprzedzić. */
function tylkoWypelnione(trening) {
  let odpadlo = 0;
  const cwiczenia = trening.cwiczenia
    .map(wpis => ({
      id: wpis.id,
      cwiczenieId: wpis.cwiczenieId,
      nazwa: wpis.nazwa,
      serie: wpis.serie.filter(seria => {
        if (seriaKompletna(seria)) return true;
        odpadlo++;
        return false;
      })
    }))
    .filter(wpis => wpis.serie.length > 0);

  return { cwiczenia: cwiczenia, odpadlo: odpadlo };
}

/* Liczba z pola tekstowego — przecinek zamieniamy na kropkę.
   Gdy ktoś wpisze coś, co nie jest liczbą, dostajemy NaN. */
function naLiczbe(tekst) {
  const czysty = String(tekst).trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(czysty)) return NaN;
  return parseFloat(czysty);
}

/* --------------------------------------------------------------------------
   Kafelek jednego ćwiczenia
   -------------------------------------------------------------------------- */
function kartaCwiczenia(wpis, edytor) {
  const karta = document.createElement('div');
  karta.className = 'karta karta-cwiczenia';
  karta.innerHTML = `
    <div class="glowa-cwiczenia">
      <h3></h3>
      <button class="ikonka" data-akcja="usun-cwiczenie" title="Usuń ćwiczenie">🗑️</button>
    </div>
    <p class="podpowiedz"></p>
    <ol class="serie"></ol>
    <button class="przycisk" data-akcja="dodaj-serie">+ Dodaj serię</button>`;

  karta.querySelector('h3').textContent = wpis.nazwa;

  const podpowiedz = karta.querySelector('.podpowiedz');
  if (edytor.pokazPodpowiedz) {
    podpowiedz.textContent = tekstPodpowiedzi(wpis.cwiczenieId);
  } else {
    podpowiedz.remove();
  }

  const listaSerii = karta.querySelector('.serie');
  wpis.serie.forEach((seria, numer) => {
    listaSerii.appendChild(wierszSerii(wpis, seria, numer, edytor));
  });

  karta.querySelector('[data-akcja="dodaj-serie"]')
    .addEventListener('click', () => dodajSerie(edytor, wpis.id));

  karta.querySelector('[data-akcja="usun-cwiczenie"]')
    .addEventListener('click', () => usunCwiczenieZTreningu(edytor, wpis.id));

  return karta;
}

/* Jeden wiersz serii: [ 80 ] kg × [ 8 ]  ✕  — pola można poprawiać wprost. */
function wierszSerii(wpis, seria, numer, edytor) {
  const wiersz = document.createElement('li');
  wiersz.innerHTML = `
    <span class="numer"></span>
    <input type="text" class="pole-serii pole-kg" inputmode="decimal"
           autocomplete="off" aria-label="Ciężar w kilogramach">
    <span class="jednostka">kg</span>
    <span class="jednostka">×</span>
    <input type="text" class="pole-serii pole-powt" inputmode="numeric"
           autocomplete="off" aria-label="Liczba powtórzeń">
    <button class="ikonka" data-akcja="usun-serie" title="Usuń serię">✕</button>`;

  wiersz.querySelector('.numer').textContent = (numer + 1) + '.';

  const poleKg   = wiersz.querySelector('.pole-kg');
  const polePowt = wiersz.querySelector('.pole-powt');
  poleKg.value   = seria.kg   === null || seria.kg   === undefined ? '' : formatujKg(seria.kg);
  polePowt.value = seria.powt === null || seria.powt === undefined ? '' : seria.powt;

  poleKg.addEventListener('input',   () => zmienSerie(edytor, wpis.id, numer, 'kg',   poleKg));
  polePowt.addEventListener('input', () => zmienSerie(edytor, wpis.id, numer, 'powt', polePowt));

  // zaznaczenie całej zawartości ułatwia poprawienie liczby jednym ruchem
  [poleKg, polePowt].forEach(pole => {
    pole.addEventListener('focus', () => pole.select());
  });

  wiersz.querySelector('[data-akcja="usun-serie"]')
    .addEventListener('click', () => usunSerie(edytor, wpis.id, numer));

  return wiersz;
}

/* --------------------------------------------------------------------------
   Zmiany w seriach
   -------------------------------------------------------------------------- */

/* Poprawienie liczby w polu — bez żadnego przycisku „zapisz”. */
function zmienSerie(edytor, wpisId, numer, ktore, pole) {
  const wpis = edytor.trening.cwiczenia.find(w => w.id === wpisId);
  if (!wpis || !wpis.serie[numer]) return;

  const tekst = pole.value.trim();
  const liczba = naLiczbe(tekst);

  const poprawna = ktore === 'kg'
    ? !isNaN(liczba) && liczba <= 999
    : !isNaN(liczba) && liczba >= 1 && liczba % 1 === 0;

  wpis.serie[numer][ktore] = poprawna ? liczba : null;

  // czerwona obwódka tylko wtedy, gdy coś wpisano i to coś nie ma sensu
  pole.classList.toggle('blad', tekst !== '' && !poprawna);

  edytor.poZmianie(false);
}

/* Nowa seria = kopia poprzedniej (albo pusta, gdy to pierwsza). */
function dodajSerie(edytor, wpisId) {
  const wpis = edytor.trening.cwiczenia.find(w => w.id === wpisId);
  if (!wpis) return;

  const poprzednia = wpis.serie[wpis.serie.length - 1];
  wpis.serie.push(poprzednia
    ? { kg: poprzednia.kg, powt: poprzednia.powt }
    : { kg: null, powt: null });

  edytor.poZmianie(true);
}

function usunSerie(edytor, wpisId, numer) {
  const wpis = edytor.trening.cwiczenia.find(w => w.id === wpisId);
  if (!wpis) return;

  wpis.serie.splice(numer, 1);
  edytor.poZmianie(true);
}

function usunCwiczenieZTreningu(edytor, wpisId) {
  const wpis = edytor.trening.cwiczenia.find(w => w.id === wpisId);
  if (!wpis) return;

  zapytaj(`Usunąć „${wpis.nazwa}” z tego treningu razem z seriami?`, 'Usuń', () => {
    edytor.trening.cwiczenia = edytor.trening.cwiczenia.filter(w => w.id !== wpisId);
    edytor.poZmianie(true);
  });
}

/* --------------------------------------------------------------------------
   Okno z listą ćwiczeń — używane przez trening, historię i zestawy
   -------------------------------------------------------------------------- */

/* opcje:
     juzWybrane      – lista id, które są już dodane (wyszarzone)
     etykietaDodane  – dopisek przy takim ćwiczeniu, np. 'już w treningu'
     poWyborze(id)   – co zrobić po kliknięciu w ćwiczenie                   */
function otworzListeCwiczen(opcje) {
  const lista = el('lista-wyboru');
  el('tytul-okna-wyboru').textContent = 'Wybierz ćwiczenie';
  lista.innerHTML = '';

  if (dane.cwiczenia.length === 0) {
    lista.innerHTML = '<li class="pusty-wpis">Nie masz żadnych ćwiczeń. ' +
                      'Dodaj je w zakładce „Ćwicz.”.</li>';
  }

  const juzWybrane = opcje.juzWybrane || [];

  dane.cwiczenia.forEach(cwiczenie => {
    const dodane = juzWybrane.includes(cwiczenie.id);

    const pozycja = document.createElement('li');
    pozycja.className = 'wpis-wyboru' + (dodane ? ' juz-dodane' : '');
    pozycja.innerHTML = `
      <button class="wybor">
        <span class="nazwa"></span>
        <span class="podpowiedz"></span>
      </button>`;
    pozycja.querySelector('.nazwa').textContent =
      cwiczenie.nazwa + (dodane ? '  ✓ ' + opcje.etykietaDodane : '');
    pozycja.querySelector('.podpowiedz').textContent = tekstPodpowiedzi(cwiczenie.id);

    pozycja.querySelector('.wybor').addEventListener('click', () => {
      if (dodane) zamknijWyborCwiczenia();
      else opcje.poWyborze(cwiczenie.id);
    });

    lista.appendChild(pozycja);
  });

  el('okno-wyboru').hidden = false;
}

function otworzWyborCwiczenia(edytor) {
  otworzListeCwiczen({
    juzWybrane: edytor.trening.cwiczenia.map(w => w.cwiczenieId),
    etykietaDodane: 'już w treningu',
    poWyborze: id => dodajCwiczenieDoTreningu(edytor, id)
  });
}

/* Świeży wpis ćwiczenia do treningu.
   kopiujSerie = true -> przepisujemy serie z ostatniego razu, zostaje tylko
   poprawić liczby. Przy poprawianiu historii zaczynamy od pustej serii,
   bo tam wpisuje się to, co faktycznie było. */
function nowyWpisCwiczenia(cwiczenieId, kopiujSerie) {
  const cwiczenie = znajdzCwiczenie(cwiczenieId);
  if (!cwiczenie) return null;

  const ostatnie = kopiujSerie ? ostatnieSerie(cwiczenieId) : null;
  const serie = ostatnie
    ? ostatnie.serie.map(seria => ({ kg: seria.kg, powt: seria.powt }))
    : [{ kg: null, powt: null }];

  return {
    id: nowyId(),
    cwiczenieId: cwiczenie.id,
    nazwa: cwiczenie.nazwa,   // kopia nazwy — historia przetrwa zmiany na liście
    serie: serie
  };
}

function dodajCwiczenieDoTreningu(edytor, cwiczenieId) {
  const wpis = nowyWpisCwiczenia(cwiczenieId, edytor.kopiujSerie);
  if (!wpis) return;

  edytor.trening.cwiczenia.push(wpis);

  zamknijWyborCwiczenia();
  edytor.poZmianie(true);

  // przewiń do świeżo dodanego kafelka
  const kafelki = document.querySelectorAll('.karta-cwiczenia');
  const ostatniKafelek = kafelki[kafelki.length - 1];
  if (ostatniKafelek) ostatniKafelek.scrollIntoView({ block: 'center' });
}

function zamknijWyborCwiczenia() {
  el('okno-wyboru').hidden = true;
}

/* Podpięcie okna wyboru — wołane raz, przy starcie aplikacji. */
function podepnijEdytor() {
  el('btn-zamknij-wybor').addEventListener('click', zamknijWyborCwiczenia);

  // kliknięcie w ciemne tło zamyka okno wyboru
  el('okno-wyboru').addEventListener('click', zdarzenie => {
    if (zdarzenie.target === el('okno-wyboru')) zamknijWyborCwiczenia();
  });
}
