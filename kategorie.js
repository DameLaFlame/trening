/* ==========================================================================
   kategorie.js — partie mięśniowe, do których należą ćwiczenia
   --------------------------------------------------------------------------
   Kategoria to zwykła etykieta („Klatka”, „Nogi”). Ćwiczenie trzyma jej
   identyfikator, a nie nazwę — dzięki temu zmiana nazwy kategorii nie gubi
   przypisań.

   Ćwiczenie może nie mieć kategorii (kategoriaId = null). Trafia wtedy na
   koniec listy, do grupy „Bez kategorii”.
   ========================================================================== */

let edytowanaKategoria = null;   // id kategorii w trakcie zmiany nazwy

function znajdzKategorie(id) {
  return dane.kategorie.find(k => k.id === id) || null;
}

function nazwaKategorii(id) {
  const kategoria = znajdzKategorie(id);
  return kategoria ? kategoria.nazwa : 'Bez kategorii';
}

/* Ile ćwiczeń należy do tej kategorii. */
function ileWKategorii(id) {
  return dane.cwiczenia.filter(c => c.kategoriaId === id).length;
}

/* --------------------------------------------------------------------------
   Lista kategorii
   -------------------------------------------------------------------------- */
function rysujKategorie() {
  const lista = el('lista-kategorii');
  lista.innerHTML = '';
  el('ile-kategorii').textContent = dane.kategorie.length;

  if (dane.kategorie.length === 0) {
    lista.innerHTML = '<li class="pusty-wpis">Nie masz żadnej kategorii.</li>';
    return;
  }

  dane.kategorie.forEach(kategoria => {
    const pozycja = document.createElement('li');

    if (edytowanaKategoria === kategoria.id) {
      pozycja.className = 'wpis-edycja';
      pozycja.innerHTML = `
        <input type="text" class="pole-edycji" autocomplete="off">
        <div class="rzad">
          <button class="przycisk maly" data-akcja="zapisz">Zapisz</button>
          <button class="przycisk maly wtorny" data-akcja="anuluj">Anuluj</button>
        </div>`;

      const pole = pozycja.querySelector('.pole-edycji');
      pole.value = kategoria.nazwa;

      const zapisz = () => zapiszNazweKategorii(kategoria.id, pole.value);
      pozycja.querySelector('[data-akcja="zapisz"]').addEventListener('click', zapisz);
      pole.addEventListener('keydown', z => { if (z.key === 'Enter') zapisz(); });
      pozycja.querySelector('[data-akcja="anuluj"]').addEventListener('click', () => {
        edytowanaKategoria = null;
        rysujKategorie();
      });

    } else {
      pozycja.className = 'wpis-cwiczenia';
      pozycja.innerHTML = `
        <span class="opis-pomiaru">
          <b class="nazwa"></b>
          <span class="data-pomiaru"></span>
        </span>
        <button class="ikonka mala" data-akcja="edytuj" title="Zmień nazwę">✏️</button>
        <button class="ikonka mala" data-akcja="usun" title="Usuń kategorię">🗑️</button>`;

      const ile = ileWKategorii(kategoria.id);
      pozycja.querySelector('.nazwa').textContent = kategoria.nazwa;
      pozycja.querySelector('.data-pomiaru').textContent =
        `${ile} ${odmien(ile, 'ćwiczenie', 'ćwiczenia', 'ćwiczeń')}`;

      pozycja.querySelector('[data-akcja="edytuj"]').addEventListener('click', () => {
        edytowanaKategoria = kategoria.id;
        rysujKategorie();
        const pole = el('lista-kategorii').querySelector('.pole-edycji');
        if (pole) { pole.focus(); pole.select(); }
      });
      pozycja.querySelector('[data-akcja="usun"]')
        .addEventListener('click', () => usunKategorie(kategoria.id));
    }

    lista.appendChild(pozycja);
  });
}

/* --------------------------------------------------------------------------
   Dodawanie, zmiana nazwy, usuwanie
   -------------------------------------------------------------------------- */
function dodajKategorie() {
  const pole = el('nowa-kategoria-nazwa');
  const nazwa = pole.value.trim();

  if (!nazwa) {
    powiadom('Wpisz nazwę kategorii.');
    return;
  }
  if (dane.kategorie.some(k => k.nazwa.toLowerCase() === nazwa.toLowerCase())) {
    powiadom('Taka kategoria już jest na liście.');
    return;
  }

  dane.kategorie.push({ id: nowyId(), nazwa: nazwa });
  zapiszDane();

  pole.value = '';
  pole.blur();
  rysujKategorie();
}

function zapiszNazweKategorii(id, nowaNazwa) {
  const nazwa = nowaNazwa.trim();

  if (!nazwa) {
    powiadom('Nazwa nie może być pusta.');
    return;
  }
  if (dane.kategorie.some(k => k.id !== id && k.nazwa.toLowerCase() === nazwa.toLowerCase())) {
    powiadom('Taka kategoria już jest na liście.');
    return;
  }

  const kategoria = znajdzKategorie(id);
  if (kategoria) {
    kategoria.nazwa = nazwa;
    zapiszDane();
  }

  edytowanaKategoria = null;
  rysujKategorie();
}

function usunKategorie(id) {
  const kategoria = znajdzKategorie(id);
  if (!kategoria) return;

  const ile = ileWKategorii(id);
  const ostrzezenie = ile > 0
    ? `\n\n${ile} ${odmien(ile, 'ćwiczenie trafi', 'ćwiczenia trafią', 'ćwiczeń trafi')} ` +
      'do grupy „Bez kategorii”. Same ćwiczenia zostają nietknięte.'
    : '';

  zapytaj(`Usunąć kategorię „${kategoria.nazwa}”?` + ostrzezenie, 'Usuń', () => {
    dane.kategorie = dane.kategorie.filter(k => k.id !== id);
    dane.cwiczenia.forEach(c => {
      if (c.kategoriaId === id) c.kategoriaId = null;
    });
    zapiszDane();

    edytowanaKategoria = null;
    rysujKategorie();
  });
}

/* --------------------------------------------------------------------------
   Lista rozwijana z kategoriami — używana przy dodawaniu i poprawianiu
   ćwiczenia. Na iPhonie otwiera się jako wygodne, duże koło wyboru.
   -------------------------------------------------------------------------- */
function wypelnijListeKategorii(pole, wybranaId) {
  pole.innerHTML = '';

  dane.kategorie.forEach(kategoria => {
    const opcja = document.createElement('option');
    opcja.value = kategoria.id;
    opcja.textContent = kategoria.nazwa;
    pole.appendChild(opcja);
  });

  const bez = document.createElement('option');
  bez.value = '';
  bez.textContent = 'Bez kategorii';
  pole.appendChild(bez);

  pole.value = wybranaId && znajdzKategorie(wybranaId) ? wybranaId : '';
}

/* --------------------------------------------------------------------------
   Podpięcie przycisków (wołane raz, przy starcie aplikacji)
   -------------------------------------------------------------------------- */
function podepnijKategorie() {
  el('btn-dodaj-kategorie').addEventListener('click', dodajKategorie);
  el('nowa-kategoria-nazwa').addEventListener('keydown', z => {
    if (z.key === 'Enter') dodajKategorie();
  });

  el('btn-kategorie').addEventListener('click', () => {
    pokazKategorie(true);
  });
  el('btn-wroc-cwiczenia').addEventListener('click', () => {
    pokazKategorie(false);
  });
}

/* Przełączanie między listą ćwiczeń a zarządzaniem kategoriami. */
function pokazKategorie(czyKategorie) {
  el('cwiczenia-lista').hidden = czyKategorie;
  el('cwiczenia-kategorie').hidden = !czyKategorie;
  el('tresc').scrollTop = 0;

  edytowanaKategoria = null;
  edytowaneCwiczenie = null;

  if (czyKategorie) rysujKategorie();
  else              rysujCwiczenia();
}
