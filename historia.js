/* ==========================================================================
   historia.js — ekran „Historia”: lista treningów, szczegóły, poprawki
   --------------------------------------------------------------------------
   Ekran ma trzy widoki:
     1. lista zapisanych treningów (od najnowszego)
     2. szczegóły jednego treningu — do oglądania
     3. ten sam trening w trybie poprawiania (te same kafelki co w treningu)

   Poprawki robimy na KOPII treningu. Dopóki nie klikniesz „Zapisz zmiany”,
   w pamięci telefonu leży stara wersja.
   ========================================================================== */

let otwartyTreningId = null;    // null = pokazujemy listę
let trybEdycjiHistorii = false;
let kopiaTreningu = null;       // wersja robocza podczas poprawiania

/* Ustawienia edytora dla treningu z historii. */
function edytorHistorii() {
  return {
    trening: kopiaTreningu,
    pokazPodpowiedz: false,  // przy poprawianiu przeszłości podpowiedź myli
    kopiujSerie: false,      // tu wpisuje się to, co faktycznie było
    poZmianie: przerysuj => { if (przerysuj) rysujHistorie(); }
  };
}

function znajdzTrening(id) {
  return dane.treningi.find(t => t.id === id) || null;
}

/* Ile trwał trening, np. „1 godz. 12 min”. */
function czasTrwania(od, doKiedy) {
  if (!od || !doKiedy) return null;

  const minuty = Math.round((new Date(doKiedy) - new Date(od)) / 60000);
  if (minuty < 1)  return 'krócej niż minutę';
  if (minuty < 60) return `${minuty} min`;

  const godziny = Math.floor(minuty / 60);
  const reszta = minuty % 60;
  return reszta === 0 ? `${godziny} godz.` : `${godziny} godz. ${reszta} min`;
}

/* Krótkie podsumowanie treningu, np. „2 ćwiczenia · 5 serii”. */
function podsumowanieTreningu(trening) {
  const ileCwiczen = trening.cwiczenia.length;
  const ileSerii = trening.cwiczenia.reduce((suma, w) => suma + w.serie.length, 0);
  return `${ileCwiczen} ${odmien(ileCwiczen, 'ćwiczenie', 'ćwiczenia', 'ćwiczeń')} · ` +
         `${ileSerii} ${odmien(ileSerii, 'seria', 'serie', 'serii')}`;
}

/* Wejście na zakładkę zawsze pokazuje listę — chyba że trwa poprawianie
   treningu, bo wtedy zgubilibyśmy niezapisane zmiany. */
function wejscieNaHistorie() {
  if (!trybEdycjiHistorii) otwartyTreningId = null;
  rysujHistorie();
}

/* --------------------------------------------------------------------------
   Główne rysowanie — wybiera jeden z trzech widoków
   -------------------------------------------------------------------------- */
function rysujHistorie() {
  const otwarty = otwartyTreningId !== null;

  el('historia-lista').hidden = otwarty;
  el('historia-szczegoly').hidden = !otwarty;

  if (!otwarty) {
    rysujListeTreningow();
    return;
  }

  // w trybie poprawiania nie ma jak „wyjść bokiem” — są Zapisz i Odrzuć
  el('btn-wroc-historia').hidden = trybEdycjiHistorii;

  if (trybEdycjiHistorii) rysujEdycjeTreningu();
  else                    rysujSzczegolyTreningu();
}

/* --------------------------------------------------------------------------
   Widok 1: lista treningów
   -------------------------------------------------------------------------- */
function rysujListeTreningow() {
  el('szczegoly-tresc').innerHTML = '';   // patrz uwaga w rysujEkranStartu()

  const treningi = treningiOdNajnowszych();
  const lista = el('lista-treningow');

  el('ile-treningow').textContent = treningi.length;
  lista.innerHTML = '';

  if (treningi.length === 0) {
    lista.innerHTML = '<li class="pusty-wpis">Nie masz jeszcze żadnego ' +
                      'zapisanego treningu.</li>';
    return;
  }

  treningi.forEach(trening => {
    const pozycja = document.createElement('li');
    pozycja.className = 'wpis-treningu';
    pozycja.innerHTML = `
      <button class="wybor-treningu">
        <span class="glowa-wpisu">
          <span class="data-treningu"></span>
          <span class="strzalka">›</span>
        </span>
        <span class="podsumowanie"></span>
        <span class="cwiczenia-skrot"></span>
      </button>`;

    const godzina = formatujGodzine(trening.rozpoczety);
    pozycja.querySelector('.data-treningu').textContent =
      formatujDate(trening.data) + (godzina ? ' · ' + godzina : '');
    pozycja.querySelector('.podsumowanie').textContent = podsumowanieTreningu(trening);
    pozycja.querySelector('.cwiczenia-skrot').textContent =
      trening.cwiczenia.map(w => w.nazwa).join(', ');

    pozycja.querySelector('.wybor-treningu').addEventListener('click', () => {
      otwartyTreningId = trening.id;
      trybEdycjiHistorii = false;
      rysujHistorie();
      el('tresc').scrollTop = 0;
    });

    lista.appendChild(pozycja);
  });
}

/* --------------------------------------------------------------------------
   Widok 2: szczegóły treningu (do oglądania)
   -------------------------------------------------------------------------- */
function rysujSzczegolyTreningu() {
  const trening = znajdzTrening(otwartyTreningId);
  const miejsce = el('szczegoly-tresc');
  miejsce.innerHTML = '';

  if (!trening) {          // trening zniknął (np. po usunięciu) — wracamy do listy
    otwartyTreningId = null;
    rysujHistorie();
    return;
  }

  // --- nagłówek z datą i podsumowaniem ---
  const naglowek = document.createElement('div');
  naglowek.className = 'karta';
  naglowek.innerHTML = `
    <p class="podpis-karty">Trening</p>
    <h2 class="data-duza"></h2>
    <div class="wiersz-info"><span>Ćwiczenia i serie</span><b></b></div>`;
  naglowek.querySelector('.data-duza').textContent = formatujDate(trening.data);
  naglowek.querySelector('.wiersz-info b').textContent = podsumowanieTreningu(trening);

  const godzina = formatujGodzine(trening.rozpoczety);
  if (godzina) {
    const wiersz = document.createElement('div');
    wiersz.className = 'wiersz-info';
    wiersz.innerHTML = '<span>Godzina</span><b></b>';
    wiersz.querySelector('b').textContent = godzina;
    naglowek.appendChild(wiersz);
  }

  const czas = czasTrwania(trening.rozpoczety, trening.zakonczony);
  if (czas) {
    const wiersz = document.createElement('div');
    wiersz.className = 'wiersz-info';
    wiersz.innerHTML = '<span>Czas trwania</span><b></b>';
    wiersz.querySelector('b').textContent = czas;
    naglowek.appendChild(wiersz);
  }

  miejsce.appendChild(naglowek);

  // --- ćwiczenia z seriami ---
  trening.cwiczenia.forEach(wpis => {
    const karta = document.createElement('div');
    karta.className = 'karta';
    karta.innerHTML = '<h3 class="nazwa-cwiczenia"></h3><ol class="serie-podglad"></ol>';
    karta.querySelector('.nazwa-cwiczenia').textContent = wpis.nazwa;

    const lista = karta.querySelector('.serie-podglad');
    wpis.serie.forEach((seria, numer) => {
      const pozycja = document.createElement('li');
      pozycja.innerHTML = '<span class="numer"></span><span class="wynik"></span>';
      pozycja.querySelector('.numer').textContent = (numer + 1) + '.';
      pozycja.querySelector('.wynik').textContent = opisSerii(seria);
      lista.appendChild(pozycja);
    });

    miejsce.appendChild(karta);
  });

  // --- przyciski ---
  const btnEdytuj = document.createElement('button');
  btnEdytuj.className = 'przycisk';
  btnEdytuj.textContent = 'Popraw trening';
  btnEdytuj.addEventListener('click', () => zacznijEdycje(trening));
  miejsce.appendChild(btnEdytuj);

  const btnUsun = document.createElement('button');
  btnUsun.className = 'przycisk tekstowy';
  btnUsun.textContent = 'Usuń trening';
  btnUsun.addEventListener('click', () => usunTrening(trening.id));
  miejsce.appendChild(btnUsun);
}

/* --------------------------------------------------------------------------
   Widok 3: poprawianie treningu
   -------------------------------------------------------------------------- */
function zacznijEdycje(trening) {
  // kopia, żeby dało się odrzucić zmiany bez śladu
  kopiaTreningu = JSON.parse(JSON.stringify(trening));
  trybEdycjiHistorii = true;
  rysujHistorie();
  el('tresc').scrollTop = 0;
}

function rysujEdycjeTreningu() {
  const edytor = edytorHistorii();
  const miejsce = el('szczegoly-tresc');
  miejsce.innerHTML = '';

  // --- data treningu ---
  const naglowek = document.createElement('div');
  naglowek.className = 'karta';
  naglowek.innerHTML = `
    <p class="podpis-karty">Poprawiasz trening</p>
    <label class="pole">
      <span>Data treningu</span>
      <input type="date" id="pole-daty-treningu">
    </label>`;
  miejsce.appendChild(naglowek);

  const poleDaty = el('pole-daty-treningu');
  poleDaty.value = kopiaTreningu.data;
  poleDaty.addEventListener('change', () => {
    if (poleDaty.value) kopiaTreningu.data = poleDaty.value;
  });

  // --- ćwiczenia (te same kafelki co w trwającym treningu) ---
  if (kopiaTreningu.cwiczenia.length === 0) {
    const pusto = document.createElement('div');
    pusto.className = 'karta pusto';
    pusto.innerHTML = '<p>Ten trening nie ma już żadnego ćwiczenia. ' +
                      'Dodaj jakieś albo odrzuć zmiany.</p>';
    miejsce.appendChild(pusto);
  } else {
    kopiaTreningu.cwiczenia.forEach(wpis => {
      miejsce.appendChild(kartaCwiczenia(wpis, edytor));
    });
  }

  // --- przyciski ---
  const btnDodaj = document.createElement('button');
  btnDodaj.className = 'przycisk wtorny';
  btnDodaj.textContent = '+ Dodaj ćwiczenie';
  btnDodaj.addEventListener('click', () => otworzWyborCwiczenia(edytorHistorii()));
  miejsce.appendChild(btnDodaj);

  const btnZapisz = document.createElement('button');
  btnZapisz.className = 'przycisk zielony';
  btnZapisz.textContent = 'Zapisz zmiany';
  btnZapisz.addEventListener('click', zapiszZmianyHistorii);
  miejsce.appendChild(btnZapisz);

  const btnOdrzuc = document.createElement('button');
  btnOdrzuc.className = 'przycisk tekstowy';
  btnOdrzuc.textContent = 'Odrzuć zmiany';
  btnOdrzuc.addEventListener('click', odrzucZmianyHistorii);
  miejsce.appendChild(btnOdrzuc);
}

/* Data zmieniona ręcznie — przestawiamy też godzinę rozpoczęcia i końca,
   żeby trening nie wylądował w złym miejscu listy. */
function przestawDate(znacznik, nowaData) {
  if (!znacznik) return znacznik;

  const stary = new Date(znacznik);
  const nowy = new Date(nowaData + 'T00:00:00');
  nowy.setHours(stary.getHours(), stary.getMinutes(), stary.getSeconds(), 0);
  return nowy.toISOString();
}

function zapiszZmianyHistorii() {
  const gotowe = tylkoWypelnione(kopiaTreningu);

  if (gotowe.cwiczenia.length === 0) {
    powiadom('Trening musi mieć co najmniej jedną wypełnioną serię.\n\n' +
             'Jeśli chcesz się go pozbyć, odrzuć zmiany i użyj „Usuń trening”.');
    return;
  }

  if (gotowe.odpadlo > 0) {
    zapytaj(
      `${gotowe.odpadlo} ${odmien(gotowe.odpadlo, 'seria jest niewypełniona', 'serie są niewypełnione', 'serii jest niewypełnionych')} ` +
      '— brakuje ciężaru albo powtórzeń. Zapisać bez nich?',
      'Zapisz zmiany',
      () => wykonajZapisHistorii(gotowe.cwiczenia),
      false
    );
    return;
  }

  wykonajZapisHistorii(gotowe.cwiczenia);
}

function wykonajZapisHistorii(cwiczenia) {
  const trening = znajdzTrening(otwartyTreningId);
  if (!trening) return;

  if (trening.data !== kopiaTreningu.data) {
    trening.rozpoczety = przestawDate(trening.rozpoczety, kopiaTreningu.data);
    trening.zakonczony = przestawDate(trening.zakonczony, kopiaTreningu.data);
  }
  trening.data = kopiaTreningu.data;
  trening.cwiczenia = cwiczenia;
  trening.poprawiony = new Date().toISOString();

  zapiszDane();

  trybEdycjiHistorii = false;
  kopiaTreningu = null;
  rysujHistorie();
}

function odrzucZmianyHistorii() {
  const oryginal = znajdzTrening(otwartyTreningId);
  const bezZmian = oryginal &&
    JSON.stringify(oryginal.cwiczenia) === JSON.stringify(kopiaTreningu.cwiczenia) &&
    oryginal.data === kopiaTreningu.data;

  const wroc = () => {
    trybEdycjiHistorii = false;
    kopiaTreningu = null;
    rysujHistorie();
  };

  if (bezZmian) wroc();
  else zapytaj('Odrzucić poprawki i wrócić do zapisanej wersji?', 'Odrzuć', wroc);
}

/* --------------------------------------------------------------------------
   Usuwanie treningu
   -------------------------------------------------------------------------- */
function usunTrening(id) {
  const trening = znajdzTrening(id);
  if (!trening) return;

  zapytaj(
    `Usunąć trening z ${formatujDate(trening.data)} (${podsumowanieTreningu(trening)})?\n\n` +
    'Tego nie da się cofnąć.',
    'Usuń trening',
    () => {
      dane.treningi = dane.treningi.filter(t => t.id !== id);
      zapiszDane();
      otwartyTreningId = null;
      trybEdycjiHistorii = false;
      kopiaTreningu = null;
      rysujHistorie();
    }
  );
}

/* --------------------------------------------------------------------------
   Podpięcie przycisków (wołane raz, przy starcie aplikacji)
   -------------------------------------------------------------------------- */
function podepnijHistorie() {
  el('btn-wroc-historia').addEventListener('click', () => {
    otwartyTreningId = null;
    rysujHistorie();
    el('tresc').scrollTop = 0;
  });
}
