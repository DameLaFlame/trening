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
    pokazNotatke: true,
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

  const treningi = treningiOdNajnowszych();

  if (treningi.length === 0) {
    const karta = document.createElement('div');
    karta.className = 'karta pusto';
    karta.innerHTML = '<p>Nie masz jeszcze żadnego zapisanego treningu.<br>' +
                      'Kliknij duży przycisk powyżej i zaczynamy.</p>';
    miejsce.appendChild(karta);
    return;
  }

  rysujStatystykiTreningu(miejsce, treningi);
}

/* --------------------------------------------------------------------------
   Statystyki pod zestawami (zamiast podglądu ostatniego treningu)
   -------------------------------------------------------------------------- */
/* Dwa kafelki (treningi w tym roku · ostatni trening) + lista partii, których
   dawno nie było na treningu. */
function rysujStatystykiTreningu(miejsce, treningi) {
  const rok = new Date().getFullYear();
  const wTymRoku = treningi.filter(t =>
    new Date(t.data + 'T12:00:00').getFullYear() === rok).length;
  const ostatni = treningi[0];

  const kafelki = document.createElement('div');
  kafelki.className = 'kafelki-statystyk';
  kafelki.innerHTML = `
    <div class="kafelek-stat">
      <span class="stat-liczba"><b></b></span>
      <span class="stat-podpis"></span>
    </div>
    <div class="kafelek-stat">
      <span class="stat-liczba stat-data"><b></b></span>
      <span class="stat-podpis">ostatni trening</span>
    </div>`;
  const liczby = kafelki.querySelectorAll('.stat-liczba b');
  liczby[0].textContent = wTymRoku;
  liczby[1].textContent = ostatni ? formatujDate(ostatni.data) : '—';
  kafelki.querySelector('.stat-podpis').textContent =
    odmien(wTymRoku, 'trening w tym roku', 'treningi w tym roku', 'treningów w tym roku');
  miejsce.appendChild(kafelki);

  rysujZaniedbanePartie(miejsce);
}

/* Partie mięśniowe (kategorie), których nie było na treningu od ponad 7 dni
   albo wcale. Ostatni trening danej partii bierzemy po kategorii ćwiczeń. */
function rysujZaniedbanePartie(miejsce) {
  const dzis = new Date(dzisiajISO() + 'T12:00:00');
  const dniOd = iso => Math.round((dzis - new Date(iso + 'T12:00:00')) / 86400000);

  // najświeższa data treningu dla każdej kategorii
  const ostatnieDaty = {};
  dane.treningi.forEach(trening => {
    trening.cwiczenia.forEach(wpis => {
      const cwiczenie = znajdzCwiczenie(wpis.cwiczenieId);
      if (!cwiczenie || !cwiczenie.kategoriaId) return;
      const dotad = ostatnieDaty[cwiczenie.kategoriaId];
      if (!dotad || trening.data > dotad) ostatnieDaty[cwiczenie.kategoriaId] = trening.data;
    });
  });

  // tylko kategorie, które mają jakiekolwiek ćwiczenie (inne trudno „trenować”)
  const maCwiczenia = {};
  dane.cwiczenia.forEach(c => { if (c.kategoriaId) maCwiczenia[c.kategoriaId] = true; });

  const zaniedbane = dane.kategorie
    .filter(k => maCwiczenia[k.id])
    .map(k => ({ nazwa: k.nazwa, data: ostatnieDaty[k.id] || null }))
    .filter(p => p.data === null || dniOd(p.data) > 7)
    .sort((a, b) => {
      if (a.data === null) return b.data === null ? 0 : -1;   // „nigdy” na górze
      if (b.data === null) return 1;
      return a.data.localeCompare(b.data);                    // najstarsze wyżej
    });

  const podpis = document.createElement('p');
  podpis.className = 'podpis';
  podpis.textContent = 'Dawno nie trenowane';
  miejsce.appendChild(podpis);

  if (zaniedbane.length === 0) {
    const karta = document.createElement('div');
    karta.className = 'karta pusto';
    karta.innerHTML = '<p>Wszystkie partie trenowane w ostatnim tygodniu. ' +
                      'Dobra robota! 💪</p>';
    miejsce.appendChild(karta);
    return;
  }

  const lista = document.createElement('ul');
  lista.className = 'lista';
  zaniedbane.forEach(partia => {
    const li = document.createElement('li');
    li.className = 'wpis-partii';
    li.innerHTML = `
      <span class="opis-pomiaru">
        <b class="nazwa-partii"></b>
        <span class="data-partii"></span>
      </span>
      <span class="dni-partii"></span>`;
    li.querySelector('.nazwa-partii').textContent = partia.nazwa;

    if (partia.data === null) {
      li.querySelector('.data-partii').textContent = 'jeszcze nietrenowane';
      li.querySelector('.dni-partii').textContent = 'nigdy';
    } else {
      const dni = dniOd(partia.data);
      li.querySelector('.data-partii').textContent = 'ostatnio ' + formatujDate(partia.data);
      li.querySelector('.dni-partii').textContent =
        dni + ' ' + odmien(dni, 'dzień', 'dni', 'dni');
    }
    lista.appendChild(li);
  });
  miejsce.appendChild(lista);
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
