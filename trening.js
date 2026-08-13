/* ==========================================================================
   trening.js — ekran „Trening”: rozpoczęcie, ćwiczenia, serie, zakończenie
   --------------------------------------------------------------------------
   Zasada: po KAŻDEJ zmianie wołamy zapiszDane(). Gdy aplikacja się zamknie
   w połowie treningu, po ponownym otwarciu wszystko wraca na swoje miejsce.

   Sam kafelek ćwiczenia z seriami siedzi w edytor.js — tym samym, którego
   używa poprawianie treningu w Historii.
   ========================================================================== */

/* Ustawienia edytora dla treningu, który właśnie trwa. */
function edytorTreningu() {
  return {
    trening: dane.aktywnyTrening,
    pokazPodpowiedz: true,
    kopiujSerie: true,
    poZmianie: przerysuj => {
      zapiszDane();
      if (przerysuj) rysujTrening();
      else           odswiezPasekStanu();
    }
  };
}

/* --------------------------------------------------------------------------
   Rysowanie ekranu
   -------------------------------------------------------------------------- */
/* Ekran ma trzy widoki: start, trening w toku i układanie zestawu. */
function rysujTrening() {
  const edycjaZestawu = edytowanyZestaw !== null;
  const trwa = !!dane.aktywnyTrening;

  el('trening-start').hidden  = trwa || edycjaZestawu;
  el('trening-wtoku').hidden  = !trwa || edycjaZestawu;
  el('zestaw-edycja').hidden  = !edycjaZestawu;

  if (edycjaZestawu) rysujEdycjeZestawu();
  else if (trwa)     rysujTreningWToku();
  else               rysujEkranStartu();
}

/* --- widok A: nie ma rozpoczętego treningu --- */
function rysujEkranStartu() {
  // kafelki poprzedniego treningu muszą zniknąć z pamięci strony, inaczej
  // wiszą tam ukryte i dalej są podpięte do danych
  el('cwiczenia-treningu').innerHTML = '';

  rysujListeZestawow();

  const miejsce = el('podsumowanie-ostatniego');
  miejsce.innerHTML = '';

  const przypomnienie = pasekPrzypomnienia();
  if (przypomnienie) miejsce.appendChild(przypomnienie);

  const ostatni = treningiOdNajnowszych()[0];
  const karta = document.createElement('div');

  if (!ostatni) {
    karta.className = 'karta pusto';
    karta.innerHTML = '<p>Nie masz jeszcze żadnego zapisanego treningu.<br>' +
                      'Kliknij duży przycisk powyżej i zaczynamy.</p>';
  } else {
    const ileSerii = ostatni.cwiczenia.reduce((suma, w) => suma + w.serie.length, 0);
    karta.className = 'karta';
    karta.innerHTML = `
      <p class="podpis-karty">Ostatni trening — ${formatujDate(ostatni.data)}</p>
      <p class="opis">${ostatni.cwiczenia.length}
        ${odmien(ostatni.cwiczenia.length, 'ćwiczenie', 'ćwiczenia', 'ćwiczeń')},
        ${ileSerii} ${odmien(ileSerii, 'seria', 'serie', 'serii')}</p>
      <ul class="mini-lista"></ul>`;

    const lista = karta.querySelector('.mini-lista');
    ostatni.cwiczenia.forEach(wpis => {
      const pozycja = document.createElement('li');
      pozycja.innerHTML = '<b></b><span></span>';
      pozycja.querySelector('b').textContent = wpis.nazwa;
      pozycja.querySelector('span').textContent = opisListySerii(wpis.serie);
      lista.appendChild(pozycja);
    });
  }

  miejsce.appendChild(karta);
}

/* --- widok B: trening trwa --- */
function rysujTreningWToku() {
  const edytor = edytorTreningu();

  odswiezPasekStanu();

  const miejsce = el('cwiczenia-treningu');
  miejsce.innerHTML = '';

  if (edytor.trening.cwiczenia.length === 0) {
    miejsce.innerHTML = '<div class="karta pusto"><p>Dodaj pierwsze ćwiczenie ' +
                        'przyciskiem poniżej.</p></div>';
    return;
  }

  edytor.trening.cwiczenia.forEach(wpis => {
    miejsce.appendChild(kartaCwiczenia(wpis, edytor));
  });
}

/* Sam zielony pasek u góry — odświeżany też przy poprawianiu pól. */
function odswiezPasekStanu() {
  const trening = dane.aktywnyTrening;
  if (!trening) return;

  const ileCwiczen = trening.cwiczenia.length;
  const ileSerii = ileGotowychSerii(trening);
  const skad = trening.zZestawu ? `${trening.zZestawu} · ` : '';

  el('opis-treningu').textContent =
    `${skad}od ${formatujGodzine(trening.rozpoczety)} · ` +
    `${ileCwiczen} ${odmien(ileCwiczen, 'ćwiczenie', 'ćwiczenia', 'ćwiczeń')}, ` +
    `${ileSerii} ${odmien(ileSerii, 'seria', 'serie', 'serii')}`;
}

/* --------------------------------------------------------------------------
   Rozpoczęcie i zakończenie treningu
   -------------------------------------------------------------------------- */
/* „Rozpocznij trening” najpierw pyta o zestaw. Gdy zestawów nie ma,
   od razu zaczyna pusty trening. */
function rozpocznijTrening() {
  otworzWyborZestawu();
}

/* Trening układany na bieżąco — od razu pytamy o pierwsze ćwiczenie. */
function rozpocznijPustyTrening() {
  dane.aktywnyTrening = {
    id: nowyId(),
    data: dzisiajISO(),
    rozpoczety: new Date().toISOString(),
    cwiczenia: []
  };
  zapiszDane();
  rysujTrening();
  otworzWyborCwiczenia(edytorTreningu());
}

function zakonczTrening() {
  const trening = dane.aktywnyTrening;
  if (!trening) return;

  // do historii trafiają tylko serie wypełnione do końca
  const gotowe = tylkoWypelnione(trening);

  if (gotowe.cwiczenia.length === 0) {
    powiadom('Ten trening nie ma ani jednej wypełnionej serii.\n\n' +
             'Uzupełnij ciężar i powtórzenia albo zamknij trening ' +
             'przyciskiem „Anuluj trening”.');
    return;
  }

  if (gotowe.odpadlo > 0) {
    // wprost wymieniamy ćwiczenia, które w całości wypadną — to najczęstszy
    // przypadek: coś było w zestawie, ale dziś nie zostało zrobione
    const opisPominietych = gotowe.pominiete.length > 0
      ? `\n\nW ogóle nie zapiszę: ${gotowe.pominiete.join(', ')}.`
      : '';

    zapytaj(
      `${gotowe.odpadlo} ${odmien(gotowe.odpadlo, 'seria jest pusta', 'serie są puste', 'serii jest pustych')} ` +
      '— nie wpisałeś ciężaru albo powtórzeń.' + opisPominietych +
      '\n\nZapisać trening bez nich?',
      'Zapisz trening',
      () => zapiszZakonczony(gotowe.cwiczenia),
      false
    );
    return;
  }

  zapiszZakonczony(gotowe.cwiczenia);
}

function zapiszZakonczony(cwiczenia) {
  const trening = dane.aktywnyTrening;

  dane.treningi.push({
    id: trening.id,
    data: trening.data,
    rozpoczety: trening.rozpoczety,
    zakonczony: new Date().toISOString(),
    cwiczenia: cwiczenia
  });
  dane.aktywnyTrening = null;
  zapiszDane();
  rysujTrening();
}

function anulujTrening() {
  if (!dane.aktywnyTrening) return;

  const ileSerii = ileGotowychSerii(dane.aktywnyTrening);
  const pytanie = ileSerii > 0
    ? `Wyrzucić ten trening razem z ${ileSerii} wypełnionymi ` +
      `${odmien(ileSerii, 'serią', 'seriami', 'seriami')}? Tego nie da się cofnąć.`
    : 'Zamknąć rozpoczęty trening bez zapisywania?';

  zapytaj(pytanie, 'Wyrzuć trening', () => {
    dane.aktywnyTrening = null;
    zapiszDane();
    rysujTrening();
  });
}

/* --------------------------------------------------------------------------
   Podpięcie przycisków (wołane raz, przy starcie aplikacji)
   -------------------------------------------------------------------------- */
function podepnijTrening() {
  el('btn-rozpocznij').addEventListener('click', rozpocznijTrening);
  el('btn-dodaj-cwiczenie').addEventListener('click',
    () => otworzWyborCwiczenia(edytorTreningu()));
  el('btn-zakoncz').addEventListener('click', zakonczTrening);
  el('btn-anuluj').addEventListener('click', anulujTrening);
}
