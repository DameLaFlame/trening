/* ==========================================================================
   zestawy.js — gotowe zestawy ćwiczeń (np. „Push A”, „Nogi”)
   --------------------------------------------------------------------------
   Zestaw to sama lista ćwiczeń w kolejności — bez ciężarów. Ciężary i serie
   biorą się przy starcie z ostatniego treningu, w którym dane ćwiczenie było
   robione. Dzięki temu zestaw nigdy się nie „starzeje”: podbijasz ciężar
   raz w treningu i następnym razem startujesz już z nowym.

   Zestaw poprawiamy na kopii — dopóki nie klikniesz „Zapisz zestaw”,
   w pamięci telefonu leży stara wersja.
   ========================================================================== */

let edytowanyZestaw = null;   // null = nie edytujemy; inaczej kopia robocza

function znajdzZestaw(id) {
  return dane.zestawy.find(z => z.id === id) || null;
}

/* Nazwy ćwiczeń zestawu — pomijamy te skasowane z listy. */
function nazwyZestawu(zestaw) {
  return zestaw.cwiczenia
    .map(id => znajdzCwiczenie(id))
    .filter(Boolean)
    .map(c => c.nazwa);
}

/* --------------------------------------------------------------------------
   Lista zestawów na ekranie startowym — służy do zarządzania nimi.
   Trening startuje się z okna, które wychodzi po „Rozpocznij trening”.
   -------------------------------------------------------------------------- */
function rysujListeZestawow() {
  const lista = el('lista-zestawow');
  lista.innerHTML = '';

  if (dane.zestawy.length === 0) {
    lista.innerHTML = '<li class="pusty-wpis">Nie masz jeszcze zestawu. ' +
                      'Ułóż go raz, a potem startuj jednym kliknięciem.</li>';
    return;
  }

  dane.zestawy.forEach(zestaw => {
    const nazwy = nazwyZestawu(zestaw);

    const pozycja = document.createElement('li');
    pozycja.className = 'wpis-zestawu';
    pozycja.innerHTML = `
      <button class="wybor-zestawu">
        <span class="nazwa-zestawu"></span>
        <span class="podsumowanie"></span>
      </button>
      <button class="ikonka" data-akcja="edytuj-zestaw" title="Popraw zestaw">✏️</button>
      <button class="ikonka" data-akcja="usun-zestaw" title="Usuń zestaw">🗑️</button>`;

    pozycja.querySelector('.nazwa-zestawu').textContent = zestaw.nazwa;
    pozycja.querySelector('.podsumowanie').textContent = nazwy.length > 0
      ? `${nazwy.length} ${odmien(nazwy.length, 'ćwiczenie', 'ćwiczenia', 'ćwiczeń')}`
      : 'Zestaw jest pusty';

    pozycja.querySelector('.wybor-zestawu')
      .addEventListener('click', () => otworzZestawDoEdycji(zestaw.id));
    pozycja.querySelector('[data-akcja="edytuj-zestaw"]')
      .addEventListener('click', () => otworzZestawDoEdycji(zestaw.id));
    pozycja.querySelector('[data-akcja="usun-zestaw"]')
      .addEventListener('click', () => usunZestawOId(zestaw.id));

    lista.appendChild(pozycja);
  });
}

/* --------------------------------------------------------------------------
   Okno wyboru zestawu — wychodzi po kliknięciu „Rozpocznij trening”
   -------------------------------------------------------------------------- */
function otworzWyborZestawu() {
  // bez zestawów nie ma o co pytać — od razu pusty trening
  if (dane.zestawy.length === 0) {
    rozpocznijPustyTrening();
    return;
  }

  const lista = el('lista-wyboru');
  el('tytul-okna-wyboru').textContent = 'Wybierz zestaw';
  lista.innerHTML = '';

  dane.zestawy.forEach(zestaw => {
    const pozycja = document.createElement('li');
    pozycja.className = 'wpis-wyboru';
    pozycja.innerHTML = '<button class="wybor"><span class="nazwa"></span></button>';
    pozycja.querySelector('.nazwa').textContent = zestaw.nazwa;

    pozycja.querySelector('.wybor')
      .addEventListener('click', () => rozpocznijZZestawu(zestaw.id));

    lista.appendChild(pozycja);
  });

  // wyjście awaryjne: trening układany na bieżąco
  const bezZestawu = document.createElement('li');
  bezZestawu.className = 'wpis-wyboru bez-zestawu';
  bezZestawu.innerHTML = '<button class="wybor"><span class="nazwa">Bez zestawu</span></button>';
  bezZestawu.querySelector('.wybor').addEventListener('click', rozpocznijPustyTrening);
  lista.appendChild(bezZestawu);

  el('okno-wyboru').hidden = false;
}

/* --------------------------------------------------------------------------
   Start treningu z zestawu
   -------------------------------------------------------------------------- */
function rozpocznijZZestawu(zestawId) {
  const zestaw = znajdzZestaw(zestawId);
  if (!zestaw) return;

  zamknijWyborCwiczenia();

  // każde ćwiczenie dostaje serie z ostatniego treningu, w którym było
  const cwiczenia = zestaw.cwiczenia
    .map(id => nowyWpisCwiczenia(id, true))
    .filter(Boolean);

  if (cwiczenia.length === 0) {
    powiadom(`Zestaw „${zestaw.nazwa}” nie ma żadnego ćwiczenia.\n\n` +
             'Dodaj je ołówkiem obok nazwy zestawu.');
    return;
  }

  dane.aktywnyTrening = {
    id: nowyId(),
    data: dzisiajISO(),
    rozpoczety: new Date().toISOString(),
    zZestawu: zestaw.nazwa,
    cwiczenia: cwiczenia
  };
  zapiszDane();
  rysujTrening();
}

/* --------------------------------------------------------------------------
   Poprawianie zestawu
   -------------------------------------------------------------------------- */
function otworzZestawDoEdycji(zestawId) {
  const zestaw = znajdzZestaw(zestawId);
  if (!zestaw) return;

  edytowanyZestaw = JSON.parse(JSON.stringify(zestaw));   // kopia robocza
  rysujTrening();
  el('tresc').scrollTop = 0;
}

function nowyZestaw() {
  edytowanyZestaw = { id: nowyId(), nazwa: '', cwiczenia: [], nowy: true };
  rysujTrening();
  el('tresc').scrollTop = 0;

  const pole = el('pole-nazwy-zestawu');
  if (pole) pole.focus();
}

function rysujEdycjeZestawu() {
  el('pole-nazwy-zestawu').value = edytowanyZestaw.nazwa;
  el('btn-usun-zestaw').hidden = !!edytowanyZestaw.nowy;

  const lista = el('lista-zestawu');
  lista.innerHTML = '';

  if (edytowanyZestaw.cwiczenia.length === 0) {
    lista.innerHTML = '<li class="pusty-wpis">Dodaj pierwsze ćwiczenie ' +
                      'przyciskiem poniżej.</li>';
    return;
  }

  edytowanyZestaw.cwiczenia.forEach((cwiczenieId, numer) => {
    const cwiczenie = znajdzCwiczenie(cwiczenieId);

    const pozycja = document.createElement('li');
    pozycja.className = 'wpis-cwiczenia-zestawu';
    pozycja.innerHTML = `
      <span class="numer"></span>
      <span class="nazwa"></span>
      <button class="ikonka mala" data-akcja="w-gore" title="Wyżej">↑</button>
      <button class="ikonka mala" data-akcja="w-dol" title="Niżej">↓</button>
      <button class="ikonka mala" data-akcja="usun" title="Usuń z zestawu">🗑️</button>`;

    pozycja.querySelector('.numer').textContent = (numer + 1) + '.';
    pozycja.querySelector('.nazwa').textContent =
      cwiczenie ? cwiczenie.nazwa : '(ćwiczenie usunięte z listy)';

    const gora = pozycja.querySelector('[data-akcja="w-gore"]');
    const dol = pozycja.querySelector('[data-akcja="w-dol"]');
    gora.disabled = numer === 0;
    dol.disabled = numer === edytowanyZestaw.cwiczenia.length - 1;

    gora.addEventListener('click', () => przesunWZestawie(numer, -1));
    dol.addEventListener('click', () => przesunWZestawie(numer, 1));
    pozycja.querySelector('[data-akcja="usun"]').addEventListener('click', () => {
      edytowanyZestaw.cwiczenia.splice(numer, 1);
      rysujTrening();
    });

    lista.appendChild(pozycja);
  });
}

function przesunWZestawie(numer, kierunek) {
  const lista = edytowanyZestaw.cwiczenia;
  const cel = numer + kierunek;
  if (cel < 0 || cel >= lista.length) return;

  [lista[numer], lista[cel]] = [lista[cel], lista[numer]];
  rysujTrening();
}

function dodajCwiczenieDoZestawu() {
  // nazwa mogła zostać wpisana i jeszcze nie trafić do kopii — zapisujemy ją teraz
  edytowanyZestaw.nazwa = el('pole-nazwy-zestawu').value;

  otworzListeCwiczen({
    juzWybrane: edytowanyZestaw.cwiczenia,
    etykietaDodane: 'już w zestawie',
    poWyborze: id => {
      edytowanyZestaw.cwiczenia.push(id);
      zamknijWyborCwiczenia();
      rysujTrening();
    }
  });
}

function zapiszZestaw() {
  const nazwa = el('pole-nazwy-zestawu').value.trim();

  if (!nazwa) {
    powiadom('Nazwij zestaw, np. „Push A” albo „Nogi”.');
    el('pole-nazwy-zestawu').focus();
    return;
  }
  if (edytowanyZestaw.cwiczenia.length === 0) {
    powiadom('Zestaw musi mieć co najmniej jedno ćwiczenie.');
    return;
  }

  const zapisywany = {
    id: edytowanyZestaw.id,
    nazwa: nazwa,
    cwiczenia: [...edytowanyZestaw.cwiczenia]
  };

  const istniejacy = dane.zestawy.findIndex(z => z.id === zapisywany.id);
  if (istniejacy === -1) dane.zestawy.push(zapisywany);
  else                   dane.zestawy[istniejacy] = zapisywany;

  zapiszDane();
  edytowanyZestaw = null;
  rysujTrening();
}

function anulujZestaw() {
  const oryginal = znajdzZestaw(edytowanyZestaw.id);
  const nazwa = el('pole-nazwy-zestawu').value.trim();

  const bezZmian = edytowanyZestaw.nowy
    ? nazwa === '' && edytowanyZestaw.cwiczenia.length === 0
    : oryginal && oryginal.nazwa === nazwa &&
      JSON.stringify(oryginal.cwiczenia) === JSON.stringify(edytowanyZestaw.cwiczenia);

  const wroc = () => { edytowanyZestaw = null; rysujTrening(); };

  if (bezZmian) wroc();
  else zapytaj('Odrzucić zmiany w zestawie?', 'Odrzuć', wroc);
}

/* Usuwanie zestawu — z listy i z widoku poprawiania prowadzi tu samo. */
function usunZestawOId(id) {
  const zestaw = znajdzZestaw(id);
  if (!zestaw) return;

  zapytaj(`Usunąć zestaw „${zestaw.nazwa}”?\n\n` +
          'Zapisane treningi zostają nietknięte.', 'Usuń zestaw', () => {
    dane.zestawy = dane.zestawy.filter(z => z.id !== id);
    zapiszDane();
    edytowanyZestaw = null;
    rysujTrening();
  });
}

function usunZestaw() {
  if (!znajdzZestaw(edytowanyZestaw.id)) {   // zestaw jeszcze nie zapisany
    edytowanyZestaw = null;
    rysujTrening();
    return;
  }
  usunZestawOId(edytowanyZestaw.id);
}

/* --------------------------------------------------------------------------
   Podpięcie przycisków (wołane raz, przy starcie aplikacji)
   -------------------------------------------------------------------------- */
function podepnijZestawy() {
  el('btn-nowy-zestaw').addEventListener('click', nowyZestaw);
  el('btn-dodaj-do-zestawu').addEventListener('click', dodajCwiczenieDoZestawu);
  el('btn-zapisz-zestaw').addEventListener('click', zapiszZestaw);
  el('btn-anuluj-zestaw').addEventListener('click', anulujZestaw);
  el('btn-usun-zestaw').addEventListener('click', usunZestaw);
}
