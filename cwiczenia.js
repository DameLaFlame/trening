/* ==========================================================================
   cwiczenia.js — ekran „Ćwiczenia”: dodawanie, zmiana nazwy, usuwanie
   ========================================================================== */

/* Które ćwiczenie jest właśnie edytowane (null = żadne). */
let edytowaneCwiczenie = null;

/* Znajdź ćwiczenie po jego identyfikatorze. */
function znajdzCwiczenie(id) {
  return dane.cwiczenia.find(c => c.id === id) || null;
}

/* --------------------------------------------------------------------------
   Rysowanie listy
   -------------------------------------------------------------------------- */
function rysujCwiczenia() {
  const lista = el('lista-cwiczen');
  lista.innerHTML = '';
  el('ile-cwiczen').textContent = dane.cwiczenia.length;

  if (dane.cwiczenia.length === 0) {
    lista.innerHTML = '<li class="pusty-wpis">Lista jest pusta — dodaj pierwsze ćwiczenie.</li>';
    return;
  }

  dane.cwiczenia.forEach(cwiczenie => {
    const pozycja = document.createElement('li');

    if (edytowaneCwiczenie === cwiczenie.id) {
      // --- tryb edycji nazwy ---
      pozycja.className = 'wpis-edycja';
      pozycja.innerHTML = `
        <input type="text" class="pole-edycji" value="" autocomplete="off">
        <div class="rzad">
          <button class="przycisk maly" data-akcja="zapisz-nazwe">Zapisz</button>
          <button class="przycisk maly wtorny" data-akcja="anuluj-nazwe">Anuluj</button>
        </div>`;
      const pole = pozycja.querySelector('.pole-edycji');
      pole.value = cwiczenie.nazwa;

      pozycja.querySelector('[data-akcja="zapisz-nazwe"]')
        .addEventListener('click', () => zapiszNazwe(cwiczenie.id, pole.value));
      pozycja.querySelector('[data-akcja="anuluj-nazwe"]')
        .addEventListener('click', () => { edytowaneCwiczenie = null; rysujCwiczenia(); });

      // Enter na klawiaturze też zapisuje
      pole.addEventListener('keydown', zdarzenie => {
        if (zdarzenie.key === 'Enter') zapiszNazwe(cwiczenie.id, pole.value);
      });

    } else {
      // --- zwykły wiersz ---
      pozycja.className = 'wpis-cwiczenia';
      pozycja.innerHTML = `
        <span class="nazwa"></span>
        <button class="ikonka" data-akcja="edytuj" title="Zmień nazwę">✏️</button>
        <button class="ikonka" data-akcja="usun" title="Usuń">🗑️</button>`;
      pozycja.querySelector('.nazwa').textContent = cwiczenie.nazwa;

      pozycja.querySelector('[data-akcja="edytuj"]').addEventListener('click', () => {
        edytowaneCwiczenie = cwiczenie.id;
        rysujCwiczenia();
        const pole = el('lista-cwiczen').querySelector('.pole-edycji');
        if (pole) { pole.focus(); pole.select(); }
      });

      pozycja.querySelector('[data-akcja="usun"]').addEventListener('click', () => {
        usunCwiczenie(cwiczenie.id);
      });
    }

    lista.appendChild(pozycja);
  });
}

/* --------------------------------------------------------------------------
   Dodawanie
   -------------------------------------------------------------------------- */
function dodajCwiczenie() {
  const pole = el('nowe-cwiczenie');
  const nazwa = pole.value.trim();

  if (!nazwa) {
    powiadom('Wpisz nazwę ćwiczenia.');
    return;
  }
  if (dane.cwiczenia.some(c => c.nazwa.toLowerCase() === nazwa.toLowerCase())) {
    powiadom('Takie ćwiczenie już jest na liście.');
    return;
  }

  dane.cwiczenia.push({ id: nowyId(), nazwa: nazwa });
  zapiszDane();

  pole.value = '';
  pole.blur();          // chowa klawiaturę na telefonie
  rysujCwiczenia();
}

/* --------------------------------------------------------------------------
   Zmiana nazwy
   -------------------------------------------------------------------------- */
function zapiszNazwe(id, nowaNazwa) {
  const nazwa = nowaNazwa.trim();
  if (!nazwa) {
    powiadom('Nazwa nie może być pusta.');
    return;
  }

  const inneOTejNazwie = dane.cwiczenia
    .some(c => c.id !== id && c.nazwa.toLowerCase() === nazwa.toLowerCase());
  if (inneOTejNazwie) {
    powiadom('Takie ćwiczenie już jest na liście.');
    return;
  }

  const cwiczenie = znajdzCwiczenie(id);
  if (cwiczenie) {
    cwiczenie.nazwa = nazwa;
    // trening w toku ma skopiowaną nazwę — poprawiamy też tam
    if (dane.aktywnyTrening) {
      dane.aktywnyTrening.cwiczenia
        .filter(w => w.cwiczenieId === id)
        .forEach(w => w.nazwa = nazwa);
    }
    zapiszDane();
  }

  edytowaneCwiczenie = null;
  rysujCwiczenia();
}

/* --------------------------------------------------------------------------
   Usuwanie
   -------------------------------------------------------------------------- */
function usunCwiczenie(id) {
  const cwiczenie = znajdzCwiczenie(id);
  if (!cwiczenie) return;

  const wZestawach = dane.zestawy.filter(z => z.cwiczenia.includes(id)).length;
  const ostrzezenie = wZestawach > 0
    ? `\n\nZniknie też z ${wZestawach} ${odmien(wZestawach, 'zestawu', 'zestawów', 'zestawów')}.`
    : '';

  const pytanie = `Usunąć „${cwiczenie.nazwa}” z listy?\n\n` +
                  'Zapisane treningi zostają nietknięte — ćwiczenie zniknie ' +
                  'tylko z listy do wyboru.' + ostrzezenie;

  zapytaj(pytanie, 'Usuń', () => {
    dane.cwiczenia = dane.cwiczenia.filter(c => c.id !== id);

    // ćwiczenie znika też z zestawów, żeby nie zostawały w nich dziury
    dane.zestawy.forEach(zestaw => {
      zestaw.cwiczenia = zestaw.cwiczenia.filter(cwiczenieId => cwiczenieId !== id);
    });

    zapiszDane();
    rysujCwiczenia();
  });
}

/* --------------------------------------------------------------------------
   Podpięcie przycisków (wołane raz, przy starcie aplikacji)
   -------------------------------------------------------------------------- */
function podepnijCwiczenia() {
  el('btn-dodaj-do-listy').addEventListener('click', dodajCwiczenie);
  el('nowe-cwiczenie').addEventListener('keydown', zdarzenie => {
    if (zdarzenie.key === 'Enter') dodajCwiczenie();
  });
}
