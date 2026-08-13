/* ==========================================================================
   progres.js — ekran „Progres”: partie mięśniowe → ćwiczenia → wykres
   --------------------------------------------------------------------------
   Trzy poziomy:
     1. partie mięśniowe (kategorie) ze strzałką postępu
     2. ćwiczenia w wybranej partii, każde ze strzałką
     3. jedno ćwiczenie: rekord, wykres i trening po treningu

   JAK MIERZYMY SIŁĘ
   Dla każdego treningu bierzemy najlepszą serię i liczymy z niej „szacowany
   ciężar maksymalny” — ile dałbyś radę podnieść na 1 powtórzenie. Wzór Epleya:
        e1RM = waga × (1 + powtórzenia / 30)
   Dzięki temu i większy ciężar, i więcej powtórzeń przy tym samym ciężarze
   podnoszą wynik — czyli dokładnie to, co znaczy „zrobiłem się silniejszy”.

   Strzałka to zmiana PROCENTOWA (nie w kg). Procent jest porównywalny między
   ćwiczeniami: +5% znaczy to samo przy wyciskaniu 100 kg i przy uginaniu 20 kg.
   Dlatego da się z nich policzyć jedną strzałkę dla całej partii.

   Ćwiczenia z masą własną (ciężar 0) mierzymy liczbą powtórzeń — tam postępem
   jest zrobienie większej liczby powtórzeń.
   ========================================================================== */

const BRAK_KATEGORII = '__brak__';   // koszyk na ćwiczenia bez kategorii

let progresKategoria = undefined;    // undefined = lista partii
let wybranyProgres = null;           // id ćwiczenia, null = lista ćwiczeń partii

/* --------------------------------------------------------------------------
   Metryka siły
   -------------------------------------------------------------------------- */

/* Szacowany ciężar na 1 powtórzenie (wzór Epleya). */
function e1rm(kg, powt) {
  return kg * (1 + powt / 30);
}

/* Wynik ćwiczenia w jednym treningu:
   - z ciężarem: najlepszy e1RM ze wszystkich serii,
   - masa własna: najwięcej powtórzeń. */
function wynikSesji(serie, masaWlasna) {
  return masaWlasna
    ? Math.max(...serie.map(s => s.powt))
    : Math.max(...serie.map(s => e1rm(s.kg, s.powt)));
}

/* Zmiana procentowa z „od” na „do” (null, gdy nie ma od czego liczyć). */
function procentZmiany(od, doWartosci) {
  if (!od) return null;
  return (doWartosci - od) / od * 100;
}

/* Strzałka: tekst + kolor. Poniżej 1% traktujemy jako „bez zmian”, żeby
   drobne wahania nie migały na zielono i czerwono. */
function znacznikProcent(procent) {
  if (procent === null || procent === undefined) {
    return { tekst: 'za mało danych', klasa: 'bez-zmian' };
  }
  const p = Math.round(procent * 10) / 10;
  if (Math.abs(p) < 1) return { tekst: '≈ bez zmian', klasa: 'bez-zmian' };

  return p > 0
    ? { tekst: '↑ +' + formatujKg(p) + '%', klasa: 'w-gore' }
    : { tekst: '↓ −' + formatujKg(Math.abs(p)) + '%', klasa: 'w-dol' };
}

/* --------------------------------------------------------------------------
   Zbieranie danych o jednym ćwiczeniu z całej historii
   -------------------------------------------------------------------------- */
function daneCwiczenia(cwiczenieId) {
  const dni = new Map();     // data -> serie z tego dnia
  let nazwa = '';

  treningiOdNajnowszych().forEach(trening => {
    trening.cwiczenia
      .filter(wpis => wpis.cwiczenieId === cwiczenieId)
      .forEach(wpis => {
        nazwa = nazwa || wpis.nazwa;
        if (!dni.has(trening.data)) dni.set(trening.data, []);
        dni.get(trening.data).push(...wpis.serie);
      });
  });

  const zListy = znajdzCwiczenie(cwiczenieId);
  if (zListy) nazwa = zListy.nazwa;

  const wszystkie = [...dni.values()].flat();
  const masaWlasna = wszystkie.length > 0 && Math.max(...wszystkie.map(s => s.kg)) === 0;

  const punkty = [...dni.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([data, serie]) => ({
      data: data,
      krotka: formatujDateKrotko(data),
      wartosc: Math.round(wynikSesji(serie, masaWlasna) * 10) / 10,
      serie: serie
    }));

  const n = punkty.length;
  return {
    nazwa: nazwa,
    masaWlasna: masaWlasna,
    punkty: punkty,
    rekord: znajdzRekord(punkty, masaWlasna),
    ileTreningow: n,
    zmianaOstatnia:   n >= 2 ? procentZmiany(punkty[n - 2].wartosc, punkty[n - 1].wartosc) : null,
    zmianaOdPoczatku: n >= 2 ? procentZmiany(punkty[0].wartosc,     punkty[n - 1].wartosc) : null
  };
}

/* Najlepsza pojedyncza seria w historii — po e1RM (albo po powtórzeniach). */
function znajdzRekord(punkty, masaWlasna) {
  let rekord = null;
  const ocena = s => masaWlasna ? s.powt : e1rm(s.kg, s.powt);

  punkty.forEach(punkt => {
    punkt.serie.forEach(seria => {
      if (!rekord || ocena(seria) > ocena(rekord.seria)) {
        rekord = { seria: seria, data: punkt.data };
      }
    });
  });

  return rekord;
}

/* Rekord jako tekst, np. „100 kg × 5” albo „18 powtórzeń”. */
function opisRekordu(rekord, masaWlasna) {
  if (!rekord) return '—';
  return masaWlasna
    ? `${rekord.seria.powt} ${odmien(rekord.seria.powt, 'powtórzenie', 'powtórzenia', 'powtórzeń')}`
    : opisSerii(rekord.seria);
}

/* --------------------------------------------------------------------------
   Grupowanie po partiach
   -------------------------------------------------------------------------- */

/* Partie zawierające ćwiczenia, które w ogóle były trenowane. */
function kategorieProgresu() {
  const trenowane = new Set();
  dane.treningi.forEach(trening => {
    trening.cwiczenia.forEach(wpis => {
      if (wpis.serie.length > 0) trenowane.add(wpis.cwiczenieId);
    });
  });

  const grupy = dane.kategorie.map(kategoria => ({
    id: kategoria.id,
    nazwa: kategoria.nazwa,
    cwiczenia: dane.cwiczenia.filter(c => c.kategoriaId === kategoria.id && trenowane.has(c.id))
  }));

  grupy.push({
    id: BRAK_KATEGORII,
    nazwa: 'Bez kategorii',
    cwiczenia: dane.cwiczenia.filter(c => !znajdzKategorie(c.kategoriaId) && trenowane.has(c.id))
  });

  return grupy.filter(grupa => grupa.cwiczenia.length > 0);
}

/* Postęp partii = średnia z procentowych zmian jej ćwiczeń. */
function progresKategorii(cwiczenia) {
  const zmiany = [];
  cwiczenia.forEach(c => {
    const zmiana = daneCwiczenia(c.id).zmianaOstatnia;
    if (zmiana !== null) zmiany.push(zmiana);
  });
  if (zmiany.length === 0) return null;
  return zmiany.reduce((suma, z) => suma + z, 0) / zmiany.length;
}

function nazwaBiezacejKategorii() {
  if (progresKategoria === BRAK_KATEGORII) return 'Bez kategorii';
  const kategoria = znajdzKategorie(progresKategoria);
  return kategoria ? kategoria.nazwa : 'Partie';
}

/* --------------------------------------------------------------------------
   Rysowanie — wybór jednego z trzech poziomów
   -------------------------------------------------------------------------- */
function rysujProgres() {
  const miejsce = el('progres-tresc');
  miejsce.innerHTML = '';

  if (wybranyProgres)                    rysujSzczegolyProgresu(miejsce);
  else if (progresKategoria !== undefined) rysujCwiczeniaKategorii(miejsce);
  else                                    rysujKategorieProgresu(miejsce);
}

/* Wejście na zakładkę zawsze zaczyna od listy partii. */
function wejscieNaProgres() {
  progresKategoria = undefined;
  wybranyProgres = null;
  rysujProgres();
}

/* Wspólny wiersz „nazwa + strzałka + podtytuł”. */
function wierszProgresu(nazwa, znacznik, podtytul, onClick) {
  const pozycja = document.createElement('li');
  pozycja.className = 'wpis-treningu';
  pozycja.innerHTML = `
    <button class="wybor-treningu">
      <span class="glowa-progresu">
        <span class="nazwa-progres-wiersz"></span>
        <span class="znacznik-progres"></span>
      </span>
      <span class="cwiczenia-skrot"></span>
    </button>`;

  pozycja.querySelector('.nazwa-progres-wiersz').textContent = nazwa;
  const zn = pozycja.querySelector('.znacznik-progres');
  zn.textContent = znacznik.tekst;
  zn.classList.add(znacznik.klasa);
  pozycja.querySelector('.cwiczenia-skrot').textContent = podtytul;
  pozycja.querySelector('.wybor-treningu').addEventListener('click', onClick);

  return pozycja;
}

function przyciskPowrotu(tekst, onClick) {
  const przycisk = document.createElement('button');
  przycisk.className = 'przycisk wtorny przycisk-powrotu';
  przycisk.textContent = tekst;
  przycisk.addEventListener('click', onClick);
  return przycisk;
}

/* --- poziom 1: partie mięśniowe --- */
function rysujKategorieProgresu(miejsce) {
  const podpis = document.createElement('p');
  podpis.className = 'podpis';
  podpis.textContent = 'Postęp według partii';
  miejsce.appendChild(podpis);

  const grupy = kategorieProgresu();

  if (grupy.length === 0) {
    const pusto = document.createElement('div');
    pusto.className = 'karta pusto';
    pusto.innerHTML = '<p>Zapisz kilka treningów, a tutaj pojawi się Twój postęp.</p>';
    miejsce.appendChild(pusto);
    return;
  }

  const lista = document.createElement('ul');
  lista.className = 'lista';

  grupy.forEach(grupa => {
    const znacznik = znacznikProcent(progresKategorii(grupa.cwiczenia));
    const podtytul = `${grupa.cwiczenia.length} ` +
      odmien(grupa.cwiczenia.length, 'ćwiczenie', 'ćwiczenia', 'ćwiczeń');

    lista.appendChild(wierszProgresu(grupa.nazwa, znacznik, podtytul, () => {
      progresKategoria = grupa.id;
      rysujProgres();
      el('tresc').scrollTop = 0;
    }));
  });

  miejsce.appendChild(lista);

  const nota = document.createElement('p');
  nota.className = 'opis nota-progres';
  nota.textContent = 'Strzałka: średnia zmiana siły ćwiczeń tej partii — ostatni ' +
    'trening względem poprzedniego. Siłę liczymy jako szacowany ciężar ' +
    'na jedno powtórzenie.';
  miejsce.appendChild(nota);
}

/* --- poziom 2: ćwiczenia w wybranej partii --- */
function rysujCwiczeniaKategorii(miejsce) {
  const grupa = kategorieProgresu().find(g => g.id === progresKategoria);
  if (!grupa) { progresKategoria = undefined; rysujProgres(); return; }

  miejsce.appendChild(przyciskPowrotu('← Partie', () => {
    progresKategoria = undefined;
    rysujProgres();
    el('tresc').scrollTop = 0;
  }));

  const naglowek = document.createElement('h2');
  naglowek.className = 'nazwa-progresu';
  naglowek.textContent = grupa.nazwa;
  miejsce.appendChild(naglowek);

  const lista = document.createElement('ul');
  lista.className = 'lista';

  grupa.cwiczenia.forEach(cwiczenie => {
    const info = daneCwiczenia(cwiczenie.id);
    const znacznik = znacznikProcent(info.zmianaOstatnia);
    const podtytul = 'Rekord: ' + opisRekordu(info.rekord, info.masaWlasna);

    lista.appendChild(wierszProgresu(cwiczenie.nazwa, znacznik, podtytul, () => {
      wybranyProgres = cwiczenie.id;
      rysujProgres();
      el('tresc').scrollTop = 0;
    }));
  });

  miejsce.appendChild(lista);
}

/* --- poziom 3: szczegóły jednego ćwiczenia --- */
function rysujSzczegolyProgresu(miejsce) {
  const info = daneCwiczenia(wybranyProgres);

  if (info.punkty.length === 0) {   // ćwiczenie zniknęło z historii
    wybranyProgres = null;
    rysujProgres();
    return;
  }

  miejsce.appendChild(przyciskPowrotu('← ' + nazwaBiezacejKategorii(), () => {
    wybranyProgres = null;
    rysujProgres();
    el('tresc').scrollTop = 0;
  }));

  // --- rekord i zmiany ---
  const karta = document.createElement('div');
  karta.className = 'karta';
  karta.innerHTML = `
    <h2 class="nazwa-progresu"></h2>
    <p class="podpis-karty">Rekord życiowy</p>
    <p class="waga-duza"></p>
    <div class="wiersz-info"><span>Ustanowiony</span><b class="kiedy-rekord"></b></div>
    <div class="wiersz-info"><span>Od poprzedniego treningu</span><b class="zmiana-ostatnia"></b></div>
    <div class="wiersz-info"><span>Od pierwszego treningu</span><b class="zmiana-poczatek"></b></div>
    <div class="wiersz-info"><span>Treningi z tym ćwiczeniem</span><b class="ile-treningow"></b></div>`;

  karta.querySelector('.nazwa-progresu').textContent = info.nazwa;
  karta.querySelector('.waga-duza').textContent = opisRekordu(info.rekord, info.masaWlasna);
  karta.querySelector('.kiedy-rekord').textContent = formatujDate(info.rekord.data);
  karta.querySelector('.ile-treningow').textContent = info.ileTreningow;

  const zo = znacznikProcent(info.zmianaOstatnia);
  const bo = karta.querySelector('.zmiana-ostatnia');
  bo.textContent = zo.tekst; bo.classList.add(zo.klasa);

  const zp = znacznikProcent(info.zmianaOdPoczatku);
  const bp = karta.querySelector('.zmiana-poczatek');
  bp.textContent = zp.tekst; bp.classList.add(zp.klasa);

  miejsce.appendChild(karta);

  // --- wykres ---
  const tytul = info.masaWlasna ? 'Najwięcej powtórzeń w treningu' : 'Szacowany ciężar maksymalny';
  const kartaWykresu = document.createElement('div');
  kartaWykresu.className = info.punkty.length < 2 ? 'karta pusto' : 'karta';

  if (info.punkty.length < 2) {
    kartaWykresu.innerHTML = '<p>Wykres pojawi się po drugim treningu z tym ćwiczeniem.</p>';
  } else {
    const formatuj = info.masaWlasna ? (v => String(Math.round(v))) : formatujKg;
    kartaWykresu.innerHTML = `<p class="podpis-karty">${tytul}</p>` +
      rysunekWykresu(info.punkty, formatuj) +
      (info.masaWlasna ? '' :
        '<p class="opis nota-progres">Szacowany ciężar na 1 powtórzenie: ' +
        'waga × (1 + powtórzenia ÷ 30).</p>');
  }
  miejsce.appendChild(kartaWykresu);

  // --- trening po treningu ---
  const podpis = document.createElement('p');
  podpis.className = 'podpis';
  podpis.textContent = 'Trening po treningu';
  miejsce.appendChild(podpis);

  const lista = document.createElement('ul');
  lista.className = 'lista';

  [...info.punkty].reverse().forEach(punkt => {
    const najlepsza = info.masaWlasna
      ? `${punkt.wartosc} ${odmien(punkt.wartosc, 'powtórzenie', 'powtórzenia', 'powtórzeń')}`
      : formatujKg(punkt.wartosc) + ' kg';

    const pozycja = document.createElement('li');
    pozycja.className = 'wpis-progresu';
    pozycja.innerHTML = `
      <span class="opis-pomiaru">
        <b class="kg-pomiaru"></b>
        <span class="data-pomiaru"></span>
      </span>`;
    pozycja.querySelector('.kg-pomiaru').textContent =
      najlepsza + (info.masaWlasna ? '' : ' (max)');
    pozycja.querySelector('.data-pomiaru').textContent =
      formatujDate(punkt.data) + ' · ' + opisListySerii(punkt.serie);

    lista.appendChild(pozycja);
  });

  miejsce.appendChild(lista);
}

/* --------------------------------------------------------------------------
   Podpięcie (wołane raz, przy starcie aplikacji)
   -------------------------------------------------------------------------- */
function podepnijProgres() {
  /* Przyciski w Progresie budujemy w locie przy każdym rysowaniu, więc tutaj
     nie ma nic do podpięcia. Funkcja zostaje, bo woła ją start aplikacji. */
}
