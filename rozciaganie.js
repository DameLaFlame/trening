/* ==========================================================================
   rozciaganie.js — zakładka „Rozciąganie”: pozycje, zestawy i odtwarzacz
   --------------------------------------------------------------------------
   Zestaw rozciągania działa inaczej niż zestaw na siłownię: po starcie sam
   prowadzi przez pozycje. Każda pozycja trzymana jest przez zadany czas
   (domyślnie 30 s), między pozycjami jest przerwa (domyślnie 5 s). Oba czasy
   można ustawić osobno dla każdego zestawu.

   Ekran ma trzy widoki (lista / edycja zestawu / pozycje) budowane w jednym
   miejscu, a odtwarzacz to osobna nakładka na cały ekran.
   ========================================================================== */

let widokRozc = 'lista';          // lista | zestaw | pozycje
let roboczyZestawRozc = null;     // kopia zestawu w trakcie edycji
let edytowanaPozycjaRozc = null;  // id pozycji w trakcie zmiany nazwy

/* --------------------------------------------------------------------------
   Dane pomocnicze
   -------------------------------------------------------------------------- */
function znajdzPozycjeRozc(id) {
  return dane.rozciaganie.find(p => p.id === id) || null;
}
function znajdzZestawRozc(id) {
  return dane.zestawyRozciagania.find(z => z.id === id) || null;
}

/* Nazwy pozycji zestawu — pomijamy skasowane z listy. */
function pozycjeZestawu(zestaw) {
  return zestaw.pozycje
    .map(id => znajdzPozycjeRozc(id))
    .filter(Boolean);
}

/* Czas 65 s -> „1:05”, 30 s -> „0:30”. */
function formatujCzas(sekundy) {
  const m = Math.floor(sekundy / 60);
  const s = sekundy % 60;
  return m + ':' + String(s).padStart(2, '0');
}

/* --------------------------------------------------------------------------
   Główne rysowanie — trzy widoki w #rozc-tresc
   -------------------------------------------------------------------------- */
function wejscieNaRozciaganie() {
  widokRozc = 'lista';
  roboczyZestawRozc = null;
  edytowanaPozycjaRozc = null;
  rysujRozciaganie();
}

function rysujRozciaganie() {
  const miejsce = el('rozc-tresc');
  miejsce.innerHTML = '';

  if (widokRozc === 'zestaw')      rysujEdycjeZestawuRozc(miejsce);
  else if (widokRozc === 'pozycje') rysujPozycjeRozc(miejsce);
  else                              rysujListeZestawowRozc(miejsce);
}

function przyciskPowrotuRozc(tekst, onClick) {
  const b = document.createElement('button');
  b.className = 'przycisk wtorny przycisk-powrotu';
  b.textContent = tekst;
  b.addEventListener('click', onClick);
  return b;
}

/* --- widok A: lista zestawów --- */
function rysujListeZestawowRozc(miejsce) {
  const podpis = document.createElement('p');
  podpis.className = 'podpis';
  podpis.textContent = 'Zestawy rozciągania';
  miejsce.appendChild(podpis);

  const lista = document.createElement('ul');
  lista.className = 'lista';

  if (dane.zestawyRozciagania.length === 0) {
    lista.innerHTML = '<li class="pusty-wpis">Ułóż zestaw, a potem odpal go ' +
                      'jednym kliknięciem — pozycje polecą same.</li>';
  }

  dane.zestawyRozciagania.forEach(zestaw => {
    const pozycje = pozycjeZestawu(zestaw);

    const wpis = document.createElement('li');
    wpis.className = 'wpis-zestawu';
    wpis.innerHTML = `
      <button class="wybor-zestawu">
        <span class="nazwa-zestawu"></span>
        <span class="podsumowanie"></span>
        <span class="cwiczenia-skrot"></span>
      </button>
      <button class="ikonka" data-akcja="edytuj" title="Popraw zestaw">✏️</button>
      <button class="ikonka" data-akcja="usun" title="Usuń zestaw">🗑️</button>`;

    wpis.querySelector('.nazwa-zestawu').textContent = zestaw.nazwa;
    wpis.querySelector('.podsumowanie').textContent =
      `${pozycje.length} ${odmien(pozycje.length, 'pozycja', 'pozycje', 'pozycji')} · ` +
      `${zestaw.czasTrzymania}s trzymanie · ${zestaw.czasPrzerwy}s przerwa`;
    wpis.querySelector('.cwiczenia-skrot').textContent =
      pozycje.length > 0 ? pozycje.map(p => p.nazwa).join(', ') : 'Zestaw jest pusty';

    wpis.querySelector('.wybor-zestawu')
      .addEventListener('click', () => startZestawRozc(zestaw.id));
    wpis.querySelector('[data-akcja="edytuj"]')
      .addEventListener('click', () => otworzZestawRozcDoEdycji(zestaw.id));
    wpis.querySelector('[data-akcja="usun"]')
      .addEventListener('click', () => usunZestawRozc(zestaw.id));

    lista.appendChild(wpis);
  });

  miejsce.appendChild(lista);

  const btnNowy = document.createElement('button');
  btnNowy.className = 'przycisk wtorny';
  btnNowy.textContent = '+ Nowy zestaw';
  btnNowy.addEventListener('click', nowyZestawRozc);
  miejsce.appendChild(btnNowy);

  const btnPozycje = document.createElement('button');
  btnPozycje.className = 'przycisk tekstowy neutralny';
  btnPozycje.textContent = 'Pozycje do rozciągania';
  btnPozycje.addEventListener('click', () => { widokRozc = 'pozycje'; rysujRozciaganie(); el('tresc').scrollTop = 0; });
  miejsce.appendChild(btnPozycje);
}

/* --- widok B: edycja zestawu --- */
function nowyZestawRozc() {
  roboczyZestawRozc = { id: nowyId(), nazwa: '', pozycje: [], czasTrzymania: 30, czasPrzerwy: 5, nowy: true };
  widokRozc = 'zestaw';
  rysujRozciaganie();
  el('tresc').scrollTop = 0;
}

function otworzZestawRozcDoEdycji(id) {
  const zestaw = znajdzZestawRozc(id);
  if (!zestaw) return;
  roboczyZestawRozc = JSON.parse(JSON.stringify(zestaw));
  widokRozc = 'zestaw';
  rysujRozciaganie();
  el('tresc').scrollTop = 0;
}

function rysujEdycjeZestawuRozc(miejsce) {
  const z = roboczyZestawRozc;

  const naglowek = document.createElement('div');
  naglowek.className = 'karta';
  naglowek.innerHTML = `
    <label class="pole">
      <span>Nazwa zestawu</span>
      <input type="text" id="rozc-nazwa" placeholder="np. Poranna rozgrzewka"
             autocomplete="off" autocapitalize="sentences">
    </label>
    <div class="rzad-pol odstep">
      <label class="pole">
        <span>Trzymanie (s)</span>
        <input type="text" id="rozc-trzymanie" inputmode="numeric" autocomplete="off">
      </label>
      <label class="pole">
        <span>Przerwa (s)</span>
        <input type="text" id="rozc-przerwa" inputmode="numeric" autocomplete="off">
      </label>
    </div>`;
  miejsce.appendChild(naglowek);

  el('rozc-nazwa').value = z.nazwa;
  el('rozc-trzymanie').value = z.czasTrzymania;
  el('rozc-przerwa').value = z.czasPrzerwy;
  // trzymamy nazwę i czasy w kopii na bieżąco, żeby nie zgubić ich przy dodawaniu pozycji
  el('rozc-nazwa').addEventListener('input', e => z.nazwa = e.target.value);
  el('rozc-trzymanie').addEventListener('input', e => z.czasTrzymania = e.target.value);
  el('rozc-przerwa').addEventListener('input', e => z.czasPrzerwy = e.target.value);

  const podpis = document.createElement('p');
  podpis.className = 'podpis';
  podpis.textContent = 'Pozycje w zestawie';
  miejsce.appendChild(podpis);

  const lista = document.createElement('ul');
  lista.className = 'lista';

  if (z.pozycje.length === 0) {
    lista.innerHTML = '<li class="pusty-wpis">Dodaj pierwszą pozycję poniżej.</li>';
  }

  z.pozycje.forEach((pozycjaId, numer) => {
    const pozycja = znajdzPozycjeRozc(pozycjaId);

    const wpis = document.createElement('li');
    wpis.className = 'wpis-cwiczenia-zestawu';
    wpis.innerHTML = `
      <span class="numer"></span>
      <span class="nazwa"></span>
      <button class="ikonka mala" data-akcja="w-gore" title="Wyżej">↑</button>
      <button class="ikonka mala" data-akcja="w-dol" title="Niżej">↓</button>
      <button class="ikonka mala" data-akcja="usun" title="Usuń z zestawu">🗑️</button>`;

    wpis.querySelector('.numer').textContent = (numer + 1) + '.';
    wpis.querySelector('.nazwa').textContent =
      pozycja ? pozycja.nazwa : '(pozycja usunięta z listy)';

    const gora = wpis.querySelector('[data-akcja="w-gore"]');
    const dol = wpis.querySelector('[data-akcja="w-dol"]');
    gora.disabled = numer === 0;
    dol.disabled = numer === z.pozycje.length - 1;
    gora.addEventListener('click', () => przesunWZestawieRozc(numer, -1));
    dol.addEventListener('click', () => przesunWZestawieRozc(numer, 1));
    wpis.querySelector('[data-akcja="usun"]').addEventListener('click', () => {
      z.pozycje.splice(numer, 1);
      rysujRozciaganie();
    });

    lista.appendChild(wpis);
  });

  miejsce.appendChild(lista);

  const btnDodaj = document.createElement('button');
  btnDodaj.className = 'przycisk wtorny';
  btnDodaj.textContent = '+ Dodaj pozycję';
  btnDodaj.addEventListener('click', otworzWyborPozycjiRozc);
  miejsce.appendChild(btnDodaj);

  const btnZapisz = document.createElement('button');
  btnZapisz.className = 'przycisk zielony';
  btnZapisz.textContent = 'Zapisz zestaw';
  btnZapisz.addEventListener('click', zapiszZestawRozc);
  miejsce.appendChild(btnZapisz);

  const btnAnuluj = document.createElement('button');
  btnAnuluj.className = 'przycisk tekstowy neutralny';
  btnAnuluj.textContent = 'Anuluj';
  btnAnuluj.addEventListener('click', () => { widokRozc = 'lista'; roboczyZestawRozc = null; rysujRozciaganie(); });
  miejsce.appendChild(btnAnuluj);

  if (!z.nowy) {
    const btnUsun = document.createElement('button');
    btnUsun.className = 'przycisk tekstowy';
    btnUsun.textContent = 'Usuń zestaw';
    btnUsun.addEventListener('click', () => usunZestawRozc(z.id));
    miejsce.appendChild(btnUsun);
  }
}

function przesunWZestawieRozc(numer, kierunek) {
  const lista = roboczyZestawRozc.pozycje;
  const cel = numer + kierunek;
  if (cel < 0 || cel >= lista.length) return;
  [lista[numer], lista[cel]] = [lista[cel], lista[numer]];
  rysujRozciaganie();
}

/* Okno wyboru pozycji — korzysta z tej samej nakładki co wybór ćwiczenia. */
function otworzWyborPozycjiRozc() {
  const lista = el('lista-wyboru');
  el('tytul-okna-wyboru').textContent = 'Wybierz pozycję';
  lista.innerHTML = '';

  if (dane.rozciaganie.length === 0) {
    lista.innerHTML = '<li class="pusty-wpis">Nie masz żadnych pozycji. ' +
                      'Dodaj je w „Pozycje do rozciągania”.</li>';
  }

  const juz = roboczyZestawRozc.pozycje;

  dane.rozciaganie.forEach(pozycja => {
    const dodane = juz.includes(pozycja.id);

    const wpis = document.createElement('li');
    wpis.className = 'wpis-wyboru' + (dodane ? ' juz-dodane' : '');
    wpis.innerHTML = '<button class="wybor"><span class="nazwa"></span></button>';
    wpis.querySelector('.nazwa').textContent =
      pozycja.nazwa + (dodane ? '  ✓ już w zestawie' : '');

    wpis.querySelector('.wybor').addEventListener('click', () => {
      // pozycję można dodać wielokrotnie? nie — trzymamy unikaty, ale pozwalamy
      // dodać ponownie tę samą, gdyby ktoś chciał ją powtórzyć w sekwencji
      roboczyZestawRozc.pozycje.push(pozycja.id);
      zamknijWyborCwiczenia();
      rysujRozciaganie();
    });

    lista.appendChild(wpis);
  });

  el('okno-wyboru').hidden = false;
}

/* Liczba z pola — dodatnia liczba całkowita w rozsądnym zakresie. */
function czasZPola(wartosc, min, max) {
  const n = parseInt(String(wartosc).trim(), 10);
  if (isNaN(n) || n < min || n > max) return null;
  return n;
}

function zapiszZestawRozc() {
  const z = roboczyZestawRozc;
  const nazwa = String(z.nazwa).trim();

  if (!nazwa) { powiadom('Nazwij zestaw, np. „Poranna rozgrzewka”.'); return; }
  if (z.pozycje.length === 0) { powiadom('Zestaw musi mieć co najmniej jedną pozycję.'); return; }

  const trzymanie = czasZPola(z.czasTrzymania, 5, 600);
  if (trzymanie === null) { powiadom('Czas trzymania wpisz w sekundach (5–600).'); return; }
  const przerwa = czasZPola(z.czasPrzerwy, 0, 300);
  if (przerwa === null) { powiadom('Czas przerwy wpisz w sekundach (0–300).'); return; }

  const zapisywany = {
    id: z.id, nazwa: nazwa, pozycje: [...z.pozycje],
    czasTrzymania: trzymanie, czasPrzerwy: przerwa
  };

  const i = dane.zestawyRozciagania.findIndex(x => x.id === z.id);
  if (i === -1) dane.zestawyRozciagania.push(zapisywany);
  else          dane.zestawyRozciagania[i] = zapisywany;

  zapiszDane();
  widokRozc = 'lista';
  roboczyZestawRozc = null;
  rysujRozciaganie();
}

function usunZestawRozc(id) {
  const zestaw = znajdzZestawRozc(id);
  if (!zestaw) return;

  zapytaj(`Usunąć zestaw „${zestaw.nazwa}”?`, 'Usuń zestaw', () => {
    dane.zestawyRozciagania = dane.zestawyRozciagania.filter(z => z.id !== id);
    zapiszDane();
    widokRozc = 'lista';
    roboczyZestawRozc = null;
    rysujRozciaganie();
  });
}

/* --- widok C: pozycje do rozciągania --- */
function rysujPozycjeRozc(miejsce) {
  miejsce.appendChild(przyciskPowrotuRozc('← Wróć do zestawów', () => {
    widokRozc = 'lista'; edytowanaPozycjaRozc = null; rysujRozciaganie(); el('tresc').scrollTop = 0;
  }));

  const karta = document.createElement('div');
  karta.className = 'karta';
  karta.innerHTML = `
    <label class="pole">
      <span>Nowa pozycja</span>
      <input type="text" id="rozc-nowa-pozycja" placeholder="np. Rozciąganie łydek"
             autocomplete="off" autocapitalize="sentences">
    </label>
    <button class="przycisk" id="rozc-dodaj-pozycje">Dodaj do listy</button>`;
  miejsce.appendChild(karta);

  el('rozc-dodaj-pozycje').addEventListener('click', dodajPozycjeRozc);
  el('rozc-nowa-pozycja').addEventListener('keydown', e => { if (e.key === 'Enter') dodajPozycjeRozc(); });

  const podpis = document.createElement('p');
  podpis.className = 'podpis';
  podpis.textContent = `Moje pozycje (${dane.rozciaganie.length})`;
  miejsce.appendChild(podpis);

  const lista = document.createElement('ul');
  lista.className = 'lista';

  if (dane.rozciaganie.length === 0) {
    lista.innerHTML = '<li class="pusty-wpis">Lista jest pusta — dodaj pierwszą pozycję.</li>';
  }

  dane.rozciaganie.forEach(pozycja => {
    const wpis = document.createElement('li');

    if (edytowanaPozycjaRozc === pozycja.id) {
      wpis.className = 'wpis-edycja';
      wpis.innerHTML = `
        <input type="text" class="pole-edycji" autocomplete="off">
        <div class="rzad">
          <button class="przycisk maly" data-akcja="zapisz">Zapisz</button>
          <button class="przycisk maly wtorny" data-akcja="anuluj">Anuluj</button>
        </div>`;
      const pole = wpis.querySelector('.pole-edycji');
      pole.value = pozycja.nazwa;
      const zapisz = () => zapiszNazwePozycjiRozc(pozycja.id, pole.value);
      wpis.querySelector('[data-akcja="zapisz"]').addEventListener('click', zapisz);
      pole.addEventListener('keydown', e => { if (e.key === 'Enter') zapisz(); });
      wpis.querySelector('[data-akcja="anuluj"]').addEventListener('click', () => {
        edytowanaPozycjaRozc = null; rysujRozciaganie();
      });
    } else {
      wpis.className = 'wpis-cwiczenia';
      wpis.innerHTML = `
        <span class="nazwa"></span>
        <button class="ikonka mala" data-akcja="edytuj" title="Zmień nazwę">✏️</button>
        <button class="ikonka mala" data-akcja="usun" title="Usuń">🗑️</button>`;
      wpis.querySelector('.nazwa').textContent = pozycja.nazwa;
      wpis.querySelector('[data-akcja="edytuj"]').addEventListener('click', () => {
        edytowanaPozycjaRozc = pozycja.id;
        rysujRozciaganie();
        const pole = el('rozc-tresc').querySelector('.pole-edycji');
        if (pole) { pole.focus(); pole.select(); }
      });
      wpis.querySelector('[data-akcja="usun"]').addEventListener('click', () => usunPozycjeRozc(pozycja.id));
    }

    lista.appendChild(wpis);
  });

  miejsce.appendChild(lista);
}

function dodajPozycjeRozc() {
  const pole = el('rozc-nowa-pozycja');
  const nazwa = pole.value.trim();
  if (!nazwa) { powiadom('Wpisz nazwę pozycji.'); return; }
  if (dane.rozciaganie.some(p => p.nazwa.toLowerCase() === nazwa.toLowerCase())) {
    powiadom('Taka pozycja już jest na liście.'); return;
  }
  dane.rozciaganie.push({ id: nowyId(), nazwa: nazwa });
  zapiszDane();
  pole.value = '';
  pole.blur();
  rysujRozciaganie();
}

function zapiszNazwePozycjiRozc(id, nowaNazwa) {
  const nazwa = nowaNazwa.trim();
  if (!nazwa) { powiadom('Nazwa nie może być pusta.'); return; }
  if (dane.rozciaganie.some(p => p.id !== id && p.nazwa.toLowerCase() === nazwa.toLowerCase())) {
    powiadom('Taka pozycja już jest na liście.'); return;
  }
  const pozycja = znajdzPozycjeRozc(id);
  if (pozycja) { pozycja.nazwa = nazwa; zapiszDane(); }
  edytowanaPozycjaRozc = null;
  rysujRozciaganie();
}

function usunPozycjeRozc(id) {
  const pozycja = znajdzPozycjeRozc(id);
  if (!pozycja) return;

  const wZestawach = dane.zestawyRozciagania.filter(z => z.pozycje.includes(id)).length;
  const ostrzezenie = wZestawach > 0
    ? `\n\nZniknie też z ${wZestawach} ${odmien(wZestawach, 'zestawu', 'zestawów', 'zestawów')}.`
    : '';

  zapytaj(`Usunąć „${pozycja.nazwa}” z listy?` + ostrzezenie, 'Usuń', () => {
    dane.rozciaganie = dane.rozciaganie.filter(p => p.id !== id);
    dane.zestawyRozciagania.forEach(z => { z.pozycje = z.pozycje.filter(pid => pid !== id); });
    zapiszDane();
    rysujRozciaganie();
  });
}

/* ==========================================================================
   ODTWARZACZ — prowadzi przez zestaw, sam zmienia pozycje
   ========================================================================== */
let odtw = null;   // stan odtwarzacza (null = wyłączony)

function startZestawRozc(zestawId) {
  const zestaw = znajdzZestawRozc(zestawId);
  if (!zestaw) return;

  const pozycje = pozycjeZestawu(zestaw);
  if (pozycje.length === 0) {
    powiadom(`Zestaw „${zestaw.nazwa}” nie ma żadnej pozycji.`);
    return;
  }

  odtw = {
    nazwy: pozycje.map(p => p.nazwa),
    trzymanie: zestaw.czasTrzymania,
    przerwa: zestaw.czasPrzerwy,
    idx: 0,
    faza: 'trzymanie',
    pozostalo: zestaw.czasTrzymania,
    koniecFazy: Date.now() + zestaw.czasTrzymania * 1000,
    pauza: false,
    timer: null,
    audio: null,
    wakeLock: null,
    ostatniBip: null
  };

  // dźwięk trzeba uruchomić z gestu użytkownika — start liczy się jako gest
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) odtw.audio = new AC();
  } catch (e) { odtw.audio = null; }

  trzymajEkranWlaczony();
  document.addEventListener('visibilitychange', ponowWakeLock);

  el('odtwarzacz-rozc').hidden = false;
  odtw.timer = setInterval(tykOdtwarzacza, 200);
  rysujOdtwarzacz();
  bip(880, 0.12);   // sygnał startu
}

function tykOdtwarzacza() {
  if (!odtw || odtw.pauza) return;

  odtw.pozostalo = Math.max(0, Math.ceil((odtw.koniecFazy - Date.now()) / 1000));

  // ciche „tyknięcia” na 3, 2, 1 sekundę przed zmianą
  if (odtw.pozostalo <= 3 && odtw.pozostalo > 0 && odtw.ostatniBip !== odtw.pozostalo) {
    odtw.ostatniBip = odtw.pozostalo;
    bip(500, 0.06);
  }

  if (Date.now() >= odtw.koniecFazy) {
    nastepnaFaza();
  } else {
    rysujOdtwarzacz();
  }
}

function nastepnaFaza() {
  odtw.ostatniBip = null;

  if (odtw.faza === 'trzymanie') {
    const ostatnia = odtw.idx === odtw.nazwy.length - 1;
    if (ostatnia) { zakonczOdtwarzacz(true); return; }

    if (odtw.przerwa > 0) {
      odtw.faza = 'przerwa';
      odtw.pozostalo = odtw.przerwa;
      odtw.koniecFazy = Date.now() + odtw.przerwa * 1000;
      bip(400, 0.15);
    } else {
      odtw.idx++;
      odtw.pozostalo = odtw.trzymanie;
      odtw.koniecFazy = Date.now() + odtw.trzymanie * 1000;
      bip(880, 0.12);
    }
  } else {
    // koniec przerwy -> następna pozycja
    odtw.idx++;
    odtw.faza = 'trzymanie';
    odtw.pozostalo = odtw.trzymanie;
    odtw.koniecFazy = Date.now() + odtw.trzymanie * 1000;
    bip(880, 0.12);
  }

  rysujOdtwarzacz();
}

function rysujOdtwarzacz() {
  if (!odtw) return;

  if (odtw.faza === 'koniec') {
    el('odtw-postep').textContent = 'Gotowe';
    el('odtw-faza').textContent = '✓';
    el('odtw-faza').className = 'odtw-faza spelniony';
    el('odtw-czas').textContent = '';
    el('odtw-pozycja').textContent = 'Zestaw ukończony';
    el('odtw-nastepne').textContent = '';
    el('odtw-pauza').hidden = true;
    el('odtw-pomin').hidden = true;
    el('odtw-zakoncz').textContent = 'Zamknij';
    return;
  }

  const trzymanie = odtw.faza === 'trzymanie';
  el('odtw-faza').textContent = trzymanie ? 'Trzymaj' : 'Przerwa';
  el('odtw-faza').className = 'odtw-faza ' + (trzymanie ? 'faza-trzymanie' : 'faza-przerwa');
  el('odtw-czas').textContent = odtw.pozostalo;
  el('odtw-czas').className = 'odtw-czas ' + (trzymanie ? 'faza-trzymanie' : 'faza-przerwa');

  if (trzymanie) {
    // trzymanie: duża nazwa bieżącej pozycji, pod spodem co dalej
    const nastepna = odtw.nazwy[odtw.idx + 1];
    el('odtw-postep').textContent = `Pozycja ${odtw.idx + 1} / ${odtw.nazwy.length}`;
    el('odtw-pozycja').textContent = odtw.nazwy[odtw.idx];
    el('odtw-nastepne').textContent = nastepna ? 'Następne: ' + nastepna : 'To ostatnia pozycja';
  } else {
    // przerwa: duża nazwa pozycji, do której się szykujesz
    el('odtw-postep').textContent = `Za chwilę pozycja ${odtw.idx + 2} / ${odtw.nazwy.length}`;
    el('odtw-pozycja').textContent = odtw.nazwy[odtw.idx + 1];
    el('odtw-nastepne').textContent = 'Przygotuj się';
  }

  el('odtw-pauza').hidden = false;
  el('odtw-pomin').hidden = false;
  el('odtw-pauza').textContent = odtw.pauza ? 'Wznów' : 'Pauza';
  el('odtw-zakoncz').textContent = 'Zakończ';
}

function pauzaOdtwarzacza() {
  if (!odtw) return;
  if (odtw.pauza) {
    // wznów — przesuwamy koniec fazy o czas pauzy
    odtw.pauza = false;
    odtw.koniecFazy = Date.now() + odtw.pozostalo * 1000;
  } else {
    odtw.pauza = true;
  }
  rysujOdtwarzacz();
}

function pominFaze() {
  if (!odtw || odtw.faza === 'koniec') return;
  odtw.koniecFazy = Date.now();   // najbliższy tyk przejdzie dalej
  if (odtw.pauza) { odtw.pauza = false; }
  nastepnaFaza();
}

function zakonczOdtwarzacz(ukonczony) {
  if (!odtw) return;

  clearInterval(odtw.timer);
  odtw.timer = null;

  if (ukonczony) {
    odtw.faza = 'koniec';
    odtw.pauza = false;
    bip(1046, 0.25);   // wyższy sygnał końca
    rysujOdtwarzacz();
    puscEkran();
    // zostawiamy nakładkę z ekranem „Gotowe”, zamknie ją przycisk
    return;
  }

  zamknijOdtwarzacz();
}

function zamknijOdtwarzacz() {
  if (odtw && odtw.timer) clearInterval(odtw.timer);
  document.removeEventListener('visibilitychange', ponowWakeLock);
  puscEkran();
  if (odtw && odtw.audio) { try { odtw.audio.close(); } catch (e) {} }
  odtw = null;
  el('odtwarzacz-rozc').hidden = true;
}

/* Przycisk „Zakończ / Zamknij”. */
function zakonczZOdtwarzacza() {
  if (odtw && odtw.faza === 'koniec') { zamknijOdtwarzacz(); return; }
  zamknijOdtwarzacz();
}

/* --- dźwięk i utrzymanie ekranu --- */
function bip(czestotliwosc, dlugosc) {
  if (!odtw || !odtw.audio) return;
  try {
    if (odtw.audio.state === 'suspended') odtw.audio.resume();
    const o = odtw.audio.createOscillator();
    const g = odtw.audio.createGain();
    o.type = 'sine';
    o.frequency.value = czestotliwosc;
    g.gain.setValueAtTime(0.18, odtw.audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, odtw.audio.currentTime + dlugosc);
    o.connect(g);
    g.connect(odtw.audio.destination);
    o.start();
    o.stop(odtw.audio.currentTime + dlugosc);
  } catch (e) { /* dźwięk to dodatek — brak nie przeszkadza */ }
}

function trzymajEkranWlaczony() {
  try {
    if ('wakeLock' in navigator) {
      navigator.wakeLock.request('screen')
        .then(lock => { if (odtw) odtw.wakeLock = lock; })
        .catch(() => { /* np. karta w tle — utrzymanie ekranu to tylko dodatek */ });
    }
  } catch (e) { /* nie każdy telefon to umie */ }
}
function ponowWakeLock() {
  if (odtw && document.visibilityState === 'visible') trzymajEkranWlaczony();
}
function puscEkran() {
  try { if (odtw && odtw.wakeLock) { odtw.wakeLock.release(); odtw.wakeLock = null; } } catch (e) {}
}

/* --------------------------------------------------------------------------
   Podpięcie przycisków (wołane raz, przy starcie aplikacji)
   -------------------------------------------------------------------------- */
function podepnijRozciaganie() {
  el('odtw-pauza').addEventListener('click', pauzaOdtwarzacza);
  el('odtw-pomin').addEventListener('click', pominFaze);
  el('odtw-zakoncz').addEventListener('click', zakonczZOdtwarzacza);
}
