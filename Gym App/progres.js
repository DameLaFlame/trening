/* ==========================================================================
   progres.js — ekran „Progres”: jak zmieniał się ciężar w danym ćwiczeniu
   --------------------------------------------------------------------------
   Ekran ma dwa widoki: listę ćwiczeń z rekordami i szczegóły jednego z nich.

   Przy ćwiczeniach z masą własną (podciąganie, pompki — ciężar 0 kg) liczenie
   rekordu w kilogramach nie ma sensu, więc aplikacja sama przechodzi
   na liczenie powtórzeń.
   ========================================================================== */

let wybranyProgres = null;   // id ćwiczenia albo null = lista

/* --------------------------------------------------------------------------
   Zbieranie danych o ćwiczeniu z całej historii
   -------------------------------------------------------------------------- */

/* Wszystko, co wiemy o jednym ćwiczeniu:
   { nazwa, trybPowtorzen, punkty[], rekord, ileTreningow } */
function daneCwiczenia(cwiczenieId) {
  const dni = new Map();     // data -> lista serii z tego dnia
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

  // ćwiczenie mogło zostać przemianowane — bierzemy aktualną nazwę z listy
  const zListy = znajdzCwiczenie(cwiczenieId);
  if (zListy) nazwa = zListy.nazwa;

  const wszystkieSerie = [...dni.values()].flat();
  const najciezsza = Math.max(...wszystkieSerie.map(s => s.kg));

  // same ćwiczenia z masą własną -> liczymy powtórzenia zamiast kilogramów
  const trybPowtorzen = najciezsza === 0;
  const wartoscSerii = seria => trybPowtorzen ? seria.powt : seria.kg;

  const punkty = [...dni.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([data, serie]) => ({
      data: data,
      krotka: formatujDateKrotko(data),
      wartosc: Math.max(...serie.map(wartoscSerii)),
      serie: serie
    }));

  return {
    nazwa: nazwa,
    trybPowtorzen: trybPowtorzen,
    punkty: punkty,
    rekord: znajdzRekord(punkty, trybPowtorzen),
    ileTreningow: punkty.length
  };
}

/* Najlepsza seria w historii ćwiczenia. Przy równym ciężarze wygrywa ta
   z większą liczbą powtórzeń, a przy pełnym remisie — ta zrobiona pierwsza. */
function znajdzRekord(punkty, trybPowtorzen) {
  let rekord = null;

  punkty.forEach(punkt => {
    punkt.serie.forEach(seria => {
      if (!rekord) { rekord = { seria: seria, data: punkt.data }; return; }

      const lepsza = trybPowtorzen
        ? seria.powt > rekord.seria.powt
        : seria.kg > rekord.seria.kg ||
          (seria.kg === rekord.seria.kg && seria.powt > rekord.seria.powt);

      if (lepsza) rekord = { seria: seria, data: punkt.data };
    });
  });

  return rekord;
}

/* Ćwiczenia, które w ogóle pojawiły się w historii — od ostatnio robionych. */
function cwiczeniaZHistorii() {
  const widziane = new Map();   // cwiczenieId -> data ostatniego treningu

  treningiOdNajnowszych().forEach(trening => {
    trening.cwiczenia.forEach(wpis => {
      if (wpis.serie.length === 0) return;
      if (!widziane.has(wpis.cwiczenieId)) widziane.set(wpis.cwiczenieId, trening.data);
    });
  });

  return [...widziane.entries()]
    .sort((a, b) => b[1].localeCompare(a[1]))
    .map(([id, data]) => ({ id: id, ostatnio: data }));
}

/* Rekord jako gotowy tekst, np. „100 kg × 5” albo „18 powtórzeń”. */
function opisRekordu(rekord, trybPowtorzen) {
  if (!rekord) return '—';
  return trybPowtorzen
    ? `${rekord.seria.powt} ${odmien(rekord.seria.powt, 'powtórzenie', 'powtórzenia', 'powtórzeń')}`
    : opisSerii(rekord.seria);
}

/* --------------------------------------------------------------------------
   Rysowanie
   -------------------------------------------------------------------------- */
function rysujProgres() {
  const otwarty = wybranyProgres !== null;

  el('progres-lista').hidden = otwarty;
  el('progres-szczegoly').hidden = !otwarty;

  if (otwarty) rysujSzczegolyProgresu();
  else         rysujListeProgresu();
}

/* Wejście na zakładkę zawsze zaczyna od listy ćwiczeń. */
function wejscieNaProgres() {
  wybranyProgres = null;
  rysujProgres();
}

/* --- widok A: lista ćwiczeń z rekordami --- */
function rysujListeProgresu() {
  el('progres-tresc').innerHTML = '';   // ekran sprząta po sobie

  const lista = el('lista-progresu');
  const cwiczenia = cwiczeniaZHistorii();
  lista.innerHTML = '';

  if (cwiczenia.length === 0) {
    lista.innerHTML = '<li class="pusty-wpis">Zapisz pierwszy trening, ' +
                      'a tutaj pojawią się Twoje rekordy.</li>';
    return;
  }

  cwiczenia.forEach(pozycjaHistorii => {
    const info = daneCwiczenia(pozycjaHistorii.id);

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

    pozycja.querySelector('.data-treningu').textContent = info.nazwa;
    pozycja.querySelector('.podsumowanie').textContent =
      'Rekord: ' + opisRekordu(info.rekord, info.trybPowtorzen);
    pozycja.querySelector('.cwiczenia-skrot').textContent =
      `${info.ileTreningow} ${odmien(info.ileTreningow, 'trening', 'treningi', 'treningów')} · ` +
      `ostatnio ${formatujDate(pozycjaHistorii.ostatnio)}`;

    pozycja.querySelector('.wybor-treningu').addEventListener('click', () => {
      wybranyProgres = pozycjaHistorii.id;
      rysujProgres();
      el('tresc').scrollTop = 0;
    });

    lista.appendChild(pozycja);
  });
}

/* --- widok B: szczegóły jednego ćwiczenia --- */
function rysujSzczegolyProgresu() {
  const info = daneCwiczenia(wybranyProgres);
  const miejsce = el('progres-tresc');
  miejsce.innerHTML = '';

  if (info.punkty.length === 0) {   // ćwiczenie zniknęło z historii
    wybranyProgres = null;
    rysujProgres();
    return;
  }

  // --- rekord życiowy ---
  const karta = document.createElement('div');
  karta.className = 'karta';
  karta.innerHTML = `
    <h2 class="nazwa-progresu"></h2>
    <p class="podpis-karty">Rekord życiowy</p>
    <p class="waga-duza"></p>
    <div class="wiersz-info"><span>Ustanowiony</span><b class="kiedy-rekord"></b></div>
    <div class="wiersz-info"><span>Treningi z tym ćwiczeniem</span><b class="ile-treningow"></b></div>`;

  karta.querySelector('.nazwa-progresu').textContent = info.nazwa;
  karta.querySelector('.waga-duza').textContent = opisRekordu(info.rekord, info.trybPowtorzen);
  karta.querySelector('.kiedy-rekord').textContent = formatujDate(info.rekord.data);
  karta.querySelector('.ile-treningow').textContent = info.ileTreningow;
  miejsce.appendChild(karta);

  // --- wykres ---
  const tytul = info.trybPowtorzen
    ? 'Najwięcej powtórzeń w treningu'
    : 'Najcięższa seria w treningu';

  const kartaWykresu = document.createElement('div');
  kartaWykresu.className = info.punkty.length < 2 ? 'karta pusto' : 'karta';

  if (info.punkty.length < 2) {
    kartaWykresu.innerHTML = '<p>Wykres pojawi się po drugim treningu ' +
                             'z tym ćwiczeniem.</p>';
  } else {
    const formatuj = info.trybPowtorzen ? (v => String(Math.round(v))) : formatujKg;
    kartaWykresu.innerHTML = `<p class="podpis-karty">${tytul}</p>` +
                             rysunekWykresu(info.punkty, formatuj);
  }
  miejsce.appendChild(kartaWykresu);

  // --- historia ćwiczenia ---
  const podpis = document.createElement('p');
  podpis.className = 'podpis';
  podpis.textContent = 'Trening po treningu';
  miejsce.appendChild(podpis);

  const lista = document.createElement('ul');
  lista.className = 'lista';

  [...info.punkty].reverse().forEach(punkt => {
    const najlepsza = info.trybPowtorzen
      ? `${punkt.wartosc} ${odmien(punkt.wartosc, 'powtórzenie', 'powtórzenia', 'powtórzeń')}`
      : formatujKg(punkt.wartosc) + ' kg';

    const pozycja = document.createElement('li');
    pozycja.className = 'wpis-progresu';
    pozycja.innerHTML = `
      <span class="opis-pomiaru">
        <b class="kg-pomiaru"></b>
        <span class="data-pomiaru"></span>
      </span>`;
    pozycja.querySelector('.kg-pomiaru').textContent = najlepsza;
    pozycja.querySelector('.data-pomiaru').textContent =
      formatujDate(punkt.data) + ' · ' + opisListySerii(punkt.serie);

    lista.appendChild(pozycja);
  });

  miejsce.appendChild(lista);
}

/* --------------------------------------------------------------------------
   Podpięcie przycisków (wołane raz, przy starcie aplikacji)
   -------------------------------------------------------------------------- */
function podepnijProgres() {
  el('btn-wroc-progres').addEventListener('click', () => {
    wybranyProgres = null;
    rysujProgres();
    el('tresc').scrollTop = 0;
  });
}
