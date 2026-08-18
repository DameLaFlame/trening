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
   Do historii trafiają czyste serie, bez szarych podpowiedzi.
   Zwraca też, co odpadło, żeby dało się o tym uprzedzić. */
function tylkoWypelnione(trening) {
  let odpadloSerii = 0;
  const pominieteCwiczenia = [];

  const cwiczenia = trening.cwiczenia
    .map(wpis => {
      const serie = wpis.serie
        .filter(seria => {
          if (seriaKompletna(seria)) return true;
          odpadloSerii++;
          return false;
        })
        .map(seria => ({ kg: seria.kg, powt: seria.powt }));

      if (serie.length === 0) pominieteCwiczenia.push(wpis.nazwa);

      return {
        id: wpis.id,
        cwiczenieId: wpis.cwiczenieId,
        nazwa: wpis.nazwa,
        serie: serie
      };
    })
    .filter(wpis => wpis.serie.length > 0);

  return {
    cwiczenia: cwiczenia,
    odpadlo: odpadloSerii,
    pominiete: pominieteCwiczenia
  };
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
    <div class="rzad">
      <button class="przycisk" data-akcja="dodaj-serie">+ Dodaj serię</button>
      <button class="przycisk wtorny" data-akcja="jak-ostatnio">✓ Jak ostatnio</button>
    </div>`;

  karta.querySelector('h3').textContent = wpis.nazwa;

  const podpowiedz = karta.querySelector('.podpowiedz');
  if (edytor.pokazPodpowiedz) {
    podpowiedz.textContent = tekstPodpowiedzi(wpis.cwiczenieId);
  } else {
    podpowiedz.remove();
  }

  // notatka przy ćwiczeniu — tylko w trwającym treningu (edytor.pokazNotatke).
  // Żółty pasek pojawia się dopiero, gdy notatka ma treść; pusta = dyskretny
  // przycisk „Dodaj notatkę”. Notatka siedzi przy ćwiczeniu, więc sama
  // przenosi się na kolejne treningi tego ćwiczenia.
  if (edytor.pokazNotatke) {
    const obszarNotatki = document.createElement('div');
    obszarNotatki.className = 'notatka-obszar';
    karta.querySelector('.serie').insertAdjacentElement('beforebegin', obszarNotatki);
    rysujNotatke(obszarNotatki, wpis, edytor);
  }

  const listaSerii = karta.querySelector('.serie');
  wpis.serie.forEach((seria, numer) => {
    listaSerii.appendChild(wierszSerii(wpis, seria, numer, edytor));
  });

  karta.querySelector('[data-akcja="dodaj-serie"]')
    .addEventListener('click', () => dodajSerie(edytor, wpis.id));

  karta.querySelector('[data-akcja="usun-cwiczenie"]')
    .addEventListener('click', () => usunCwiczenieZTreningu(edytor, wpis.id));

  // „Jak ostatnio” ma sens tylko wtedy, gdy jest co przepisać
  const doPrzepisania = wpis.serie.some(s => s.wzorzec && !seriaKompletna(s));
  const btnJakOstatnio = karta.querySelector('[data-akcja="jak-ostatnio"]');
  if (doPrzepisania) {
    btnJakOstatnio.addEventListener('click', () => wpiszJakOstatnio(edytor, wpis.id));
  } else {
    btnJakOstatnio.remove();
  }

  return karta;
}

/* --------------------------------------------------------------------------
   Notatka przy ćwiczeniu (żółty pasek w trwającym treningu)
   --------------------------------------------------------------------------
   Notatkę trzymamy przy samym ćwiczeniu (dane.cwiczenia), nie przy treningu —
   dzięki temu przy następnym treningu tego ćwiczenia od razu ją widać.
   -------------------------------------------------------------------------- */
let notatkaWEdycji = null;   // id wpisu ćwiczenia, którego notatkę teraz piszemy

function rysujNotatke(obszar, wpis, edytor) {
  obszar.innerHTML = '';
  const cwiczenie = znajdzCwiczenie(wpis.cwiczenieId);
  const tekst = cwiczenie && cwiczenie.notatka ? cwiczenie.notatka : '';

  // tryb pisania: pole tekstowe + zapisz / anuluj
  if (notatkaWEdycji === wpis.id) {
    obszar.innerHTML = `
      <textarea class="notatka-pole" rows="2"
                placeholder="np. ławka na 4, ściągaj łopatki"></textarea>
      <div class="rzad">
        <button class="przycisk maly" data-akcja="zapisz-notatke">Zapisz notatkę</button>
        <button class="przycisk maly wtorny" data-akcja="anuluj-notatke">Anuluj</button>
      </div>`;
    const pole = obszar.querySelector('.notatka-pole');
    pole.value = tekst;
    pole.focus();
    pole.setSelectionRange(pole.value.length, pole.value.length);

    obszar.querySelector('[data-akcja="zapisz-notatke"]')
      .addEventListener('click', () => zapiszNotatke(obszar, wpis, edytor, pole.value));
    obszar.querySelector('[data-akcja="anuluj-notatke"]')
      .addEventListener('click', () => { notatkaWEdycji = null; rysujNotatke(obszar, wpis, edytor); });
    return;
  }

  // jest notatka: żółty pasek z jej treścią, klik = poprawianie
  if (tekst) {
    const pasek = document.createElement('button');
    pasek.className = 'notatka-pasek';
    pasek.innerHTML = '<span class="notatka-ikona">📝</span><span class="notatka-tekst"></span>';
    pasek.querySelector('.notatka-tekst').textContent = tekst;
    pasek.addEventListener('click', () => { notatkaWEdycji = wpis.id; rysujNotatke(obszar, wpis, edytor); });
    obszar.appendChild(pasek);
    return;
  }

  // brak notatki: dyskretny przycisk, ŻADNEGO żółtego paska
  const dodaj = document.createElement('button');
  dodaj.className = 'notatka-dodaj';
  dodaj.textContent = '📝 Dodaj notatkę';
  dodaj.addEventListener('click', () => { notatkaWEdycji = wpis.id; rysujNotatke(obszar, wpis, edytor); });
  obszar.appendChild(dodaj);
}

function zapiszNotatke(obszar, wpis, edytor, wartosc) {
  const cwiczenie = znajdzCwiczenie(wpis.cwiczenieId);
  if (cwiczenie) {
    const tekst = wartosc.trim();
    if (tekst) cwiczenie.notatka = tekst;
    else       delete cwiczenie.notatka;   // pusta notatka znika, żeby nie było żółtego paska
    zapiszDane();
  }
  notatkaWEdycji = null;
  rysujNotatke(obszar, wpis, edytor);
}

/* Przepisuje szare podpowiedzi do pustych serii — jednym kliknięciem,
   gdy trening przebiegł tak samo jak poprzednio. */
function wpiszJakOstatnio(edytor, wpisId) {
  const wpis = edytor.trening.cwiczenia.find(w => w.id === wpisId);
  if (!wpis) return;

  wpis.serie.forEach(seria => {
    if (!seria.wzorzec) return;
    if (seria.kg === null || seria.kg === undefined) seria.kg = seria.wzorzec.kg;
    if (seria.powt === null || seria.powt === undefined) seria.powt = seria.wzorzec.powt;
  });

  edytor.poZmianie(true);
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

  // szara podpowiedź: tak wyglądała ta seria ostatnim razem
  if (seria.wzorzec) {
    poleKg.placeholder   = formatujKg(seria.wzorzec.kg);
    polePowt.placeholder = seria.wzorzec.powt;
    wiersz.classList.add('z-podpowiedzia');
  }

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

/* Nowa seria: pusta, z szarą podpowiedzią z poprzedniej serii. */
function dodajSerie(edytor, wpisId) {
  const wpis = edytor.trening.cwiczenia.find(w => w.id === wpisId);
  if (!wpis) return;

  const poprzednia = wpis.serie[wpis.serie.length - 1];
  const nowa = { kg: null, powt: null };

  if (poprzednia) {
    // podpowiadamy tym, co wpisane, a jak nic nie wpisano — jej podpowiedzią
    const zrodlo = seriaKompletna(poprzednia) ? poprzednia : poprzednia.wzorzec;
    if (zrodlo) nowa.wzorzec = { kg: zrodlo.kg, powt: zrodlo.powt };
  }

  wpis.serie.push(nowa);
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

   kopiujSerie = true -> odtwarzamy UKŁAD ostatniego treningu: tyle samo serii,
   a w każdej szara podpowiedź z poprzednimi liczbami. Pola zostają PUSTE.
   Dzięki temu ćwiczenie, którego dziś nie zrobiłeś, nie zapisze się samo —
   pusta seria nie trafia do historii.

   Przy poprawianiu historii zaczynamy od jednej pustej serii, bez podpowiedzi:
   tam wpisuje się to, co faktycznie było. */
function nowyWpisCwiczenia(cwiczenieId, kopiujSerie) {
  const cwiczenie = znajdzCwiczenie(cwiczenieId);
  if (!cwiczenie) return null;

  const ostatnie = kopiujSerie ? ostatnieSerie(cwiczenieId) : null;
  const serie = ostatnie
    ? ostatnie.serie.map(seria => ({
        kg: null,
        powt: null,
        wzorzec: { kg: seria.kg, powt: seria.powt }   // tylko podpowiedź
      }))
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
