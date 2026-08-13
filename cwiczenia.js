/* ==========================================================================
   cwiczenia.js — ekran „Ćwiczenia”: dodawanie, zmiana nazwy i kategorii,
                  usuwanie. Lista jest pogrupowana po kategoriach.
   ========================================================================== */

/* Które ćwiczenie jest właśnie edytowane (null = żadne). */
let edytowaneCwiczenie = null;

/* Znajdź ćwiczenie po jego identyfikatorze. */
function znajdzCwiczenie(id) {
  return dane.cwiczenia.find(c => c.id === id) || null;
}

/* Ćwiczenia poukładane w grupy: [{ kategoria, cwiczenia: [...] }].
   Kolejność grup jak na liście kategorii, „Bez kategorii” na końcu. */
function cwiczeniaWGrupach() {
  const grupy = dane.kategorie.map(kategoria => ({
    id: kategoria.id,
    nazwa: kategoria.nazwa,
    cwiczenia: dane.cwiczenia.filter(c => c.kategoriaId === kategoria.id)
  }));

  const bezKategorii = dane.cwiczenia.filter(c => !znajdzKategorie(c.kategoriaId));
  if (bezKategorii.length > 0) {
    grupy.push({ id: null, nazwa: 'Bez kategorii', cwiczenia: bezKategorii });
  }

  return grupy.filter(grupa => grupa.cwiczenia.length > 0);
}

/* --------------------------------------------------------------------------
   Rysowanie listy
   -------------------------------------------------------------------------- */
function rysujCwiczenia() {
  wypelnijListeKategorii(el('nowa-cwiczenie-kategoria'), el('nowa-cwiczenie-kategoria').value);

  const miejsce = el('lista-cwiczen');
  miejsce.innerHTML = '';
  el('ile-cwiczen').textContent = dane.cwiczenia.length;

  if (dane.cwiczenia.length === 0) {
    miejsce.innerHTML = '<ul class="lista"><li class="pusty-wpis">' +
                        'Lista jest pusta — dodaj pierwsze ćwiczenie.</li></ul>';
    return;
  }

  cwiczeniaWGrupach().forEach(grupa => {
    const naglowek = document.createElement('p');
    naglowek.className = 'podpis podpis-grupy';
    naglowek.textContent = `${grupa.nazwa} (${grupa.cwiczenia.length})`;
    miejsce.appendChild(naglowek);

    const lista = document.createElement('ul');
    lista.className = 'lista';
    grupa.cwiczenia.forEach(cwiczenie => lista.appendChild(wpisCwiczenia(cwiczenie)));
    miejsce.appendChild(lista);
  });
}

function wpisCwiczenia(cwiczenie) {
  const pozycja = document.createElement('li');

  if (edytowaneCwiczenie === cwiczenie.id) {
    // --- tryb poprawiania: nazwa i kategoria ---
    pozycja.className = 'wpis-edycja';
    pozycja.innerHTML = `
      <input type="text" class="pole-edycji" autocomplete="off">
      <label class="pole">
        <span>Kategoria</span>
        <select class="pole-kategorii"></select>
      </label>
      <div class="rzad">
        <button class="przycisk maly" data-akcja="zapisz-nazwe">Zapisz</button>
        <button class="przycisk maly wtorny" data-akcja="anuluj-nazwe">Anuluj</button>
      </div>`;

    const pole = pozycja.querySelector('.pole-edycji');
    const wyborKategorii = pozycja.querySelector('.pole-kategorii');
    pole.value = cwiczenie.nazwa;
    wypelnijListeKategorii(wyborKategorii, cwiczenie.kategoriaId);

    const zapisz = () => zapiszCwiczenie(cwiczenie.id, pole.value, wyborKategorii.value);
    pozycja.querySelector('[data-akcja="zapisz-nazwe"]').addEventListener('click', zapisz);
    pole.addEventListener('keydown', z => { if (z.key === 'Enter') zapisz(); });

    pozycja.querySelector('[data-akcja="anuluj-nazwe"]').addEventListener('click', () => {
      edytowaneCwiczenie = null;
      rysujCwiczenia();
    });

  } else {
    // --- zwykły wiersz ---
    pozycja.className = 'wpis-cwiczenia';
    pozycja.innerHTML = `
      <span class="nazwa"></span>
      <button class="ikonka mala" data-akcja="edytuj" title="Popraw ćwiczenie">✏️</button>
      <button class="ikonka mala" data-akcja="usun" title="Usuń">🗑️</button>`;
    pozycja.querySelector('.nazwa').textContent = cwiczenie.nazwa;

    pozycja.querySelector('[data-akcja="edytuj"]').addEventListener('click', () => {
      edytowaneCwiczenie = cwiczenie.id;
      rysujCwiczenia();
      const pole = el('lista-cwiczen').querySelector('.pole-edycji');
      if (pole) { pole.focus(); pole.select(); }
    });

    pozycja.querySelector('[data-akcja="usun"]')
      .addEventListener('click', () => usunCwiczenie(cwiczenie.id));
  }

  return pozycja;
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

  dane.cwiczenia.push({
    id: nowyId(),
    nazwa: nazwa,
    kategoriaId: el('nowa-cwiczenie-kategoria').value || null
  });
  zapiszDane();

  pole.value = '';
  pole.blur();          // chowa klawiaturę na telefonie
  rysujCwiczenia();
}

/* --------------------------------------------------------------------------
   Zmiana nazwy i kategorii
   -------------------------------------------------------------------------- */
function zapiszCwiczenie(id, nowaNazwa, nowaKategoria) {
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
    cwiczenie.kategoriaId = nowaKategoria || null;

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
