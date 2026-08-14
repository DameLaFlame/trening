/* ==========================================================================
   waga.js — ekran „Waga ciała”: wpisywanie pomiarów, wykres i lista
   --------------------------------------------------------------------------
   Wagę wpisujesz zawsze dla konkretnego dnia. Jeden dzień = jeden pomiar;
   przy powtórce aplikacja pyta, czy zastąpić stary wynik.

   Oglądać można w trzech skalach:
     dzień    – każdy pomiar osobno
     tydzień  – średnia z każdego tygodnia (poniedziałek–niedziela)
     miesiąc  – średnia z każdego miesiąca

   Wykres rysujemy sami, zwykłym SVG — bez żadnej dodatkowej biblioteki,
   żeby aplikacja działała offline i startowała od razu.
   ========================================================================== */

/* Który pomiar jest właśnie poprawiany (null = żaden). */
let edytowanyPomiar = null;

/* --------------------------------------------------------------------------
   Układanie pomiarów
   -------------------------------------------------------------------------- */

/* Pomiary od najstarszego. */
function pomiaryChronologicznie() {
  return [...dane.pomiaryWagi].sort((a, b) => a.data.localeCompare(b.data));
}

/* Poniedziałek tygodnia, w którym wypada podana data. */
function poczatekTygodnia(iso) {
  const d = new Date(iso + 'T12:00:00');
  const przesuniecie = (d.getDay() + 6) % 7;   // 0 = poniedziałek
  d.setDate(d.getDate() - przesuniecie);
  return isoZDaty(d);
}

/* Opis tygodnia, np. „27.07 – 2.08”. */
function opisTygodnia(poniedzialek) {
  const niedziela = new Date(poniedzialek + 'T12:00:00');
  niedziela.setDate(niedziela.getDate() + 6);
  return formatujDateKrotko(poniedzialek) + ' – ' + formatujDateKrotko(isoZDaty(niedziela));
}

/* Opis miesiąca, np. „lipiec 2026”. */
function opisMiesiaca(iso) {
  return new Date(iso + 'T12:00:00')
    .toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });
}

/* Pomiary zwinięte do wybranej skali.
   Zwraca listę od najstarszego: { data, etykieta, krotka, kg, ile, pomiar } */
function punktyWagi(skala) {
  const pomiary = pomiaryChronologicznie();

  if (skala === 'dzien') {
    return pomiary.map(p => ({
      data: p.data,
      etykieta: formatujDate(p.data),
      krotka: formatujDateKrotko(p.data),
      kg: p.kg,
      ile: 1,
      pomiar: p                 // przy skali dziennej da się wejść w poprawianie
    }));
  }

  // tydzień albo miesiąc — grupujemy i liczymy średnią
  const grupy = new Map();

  pomiary.forEach(p => {
    const klucz = skala === 'tydzien'
      ? poczatekTygodnia(p.data)
      : p.data.slice(0, 7) + '-01';

    if (!grupy.has(klucz)) grupy.set(klucz, []);
    grupy.get(klucz).push(p.kg);
  });

  return [...grupy.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([klucz, wagi]) => {
      const suma = wagi.reduce((s, kg) => s + kg, 0);
      return {
        data: klucz,
        etykieta: skala === 'tydzien' ? opisTygodnia(klucz) : opisMiesiaca(klucz),
        krotka: skala === 'tydzien'
          ? formatujDateKrotko(klucz)
          : new Date(klucz + 'T12:00:00').toLocaleDateString('pl-PL', { month: 'short' }),
        kg: Math.round(suma / wagi.length * 10) / 10,
        ile: wagi.length,
        pomiar: null
      };
    });
}

/* --------------------------------------------------------------------------
   Znacznik zmiany: strzałka, tekst i kolor
   -------------------------------------------------------------------------- */
function znacznikZmiany(roznica) {
  const zaokraglona = Math.round(roznica * 10) / 10;

  if (zaokraglona === 0) return { tekst: '→ bez zmian', klasa: 'bez-zmian' };

  return zaokraglona > 0
    ? { tekst: '↑ +' + formatujKg(zaokraglona) + ' kg',            klasa: 'w-gore' }
    : { tekst: '↓ −' + formatujKg(Math.abs(zaokraglona)) + ' kg',  klasa: 'w-dol'  };
}

/* --------------------------------------------------------------------------
   Główne rysowanie
   -------------------------------------------------------------------------- */
function rysujWage() {
  // data zawsze podstawiona na dzisiaj — najczęściej właśnie o nią chodzi
  if (!el('pole-daty-wagi').value) el('pole-daty-wagi').value = dzisiajISO();

  const skala = dane.ustawienia.skalaWagi || 'dzien';
  const punkty = punktyWagi(skala);

  document.querySelectorAll('#przelacznik-skali button').forEach(przycisk => {
    przycisk.classList.toggle('aktywna', przycisk.dataset.skala === skala);
  });

  rysujCelInline();          // podgląd dziennego celu kcal/białka po zważeniu
  rysujPodsumowanieWagi(punkty, skala);
  rysujWykresWagi(punkty, skala);
  rysujListePomiarow(punkty, skala);
}

function zmienSkaleWagi(skala) {
  dane.ustawienia.skalaWagi = skala;
  edytowanyPomiar = null;      // poprawianie ma sens tylko w skali dziennej
  zapiszDane();
  rysujWage();
}

/* --------------------------------------------------------------------------
   Podsumowanie u góry
   -------------------------------------------------------------------------- */
function rysujPodsumowanieWagi(punkty, skala) {
  const miejsce = el('waga-podsumowanie');
  miejsce.innerHTML = '';

  if (punkty.length === 0) return;

  const ostatni = punkty[punkty.length - 1];
  const naglowki = { dzien: 'Ostatni pomiar', tydzien: 'Ostatni tydzień', miesiac: 'Ostatni miesiąc' };

  const karta = document.createElement('div');
  karta.className = 'karta';
  karta.innerHTML = `
    <p class="podpis-karty"><span class="co"></span> — <span class="kiedy"></span></p>
    <p class="waga-duza"></p>`;
  karta.querySelector('.co').textContent = naglowki[skala];
  karta.querySelector('.kiedy').textContent = ostatni.etykieta;
  karta.querySelector('.waga-duza').textContent = formatujKg(ostatni.kg) + ' kg';

  if (skala !== 'dzien') {
    const info = document.createElement('p');
    info.className = 'opis';
    info.textContent = `Średnia z ${ostatni.ile} ` +
      odmien(ostatni.ile, 'pomiaru', 'pomiarów', 'pomiarów');
    karta.insertBefore(info, karta.querySelector('.waga-duza').nextSibling);
  }

  if (punkty.length > 1) {
    const poprzedni = punkty[punkty.length - 2];
    const podpisy = {
      dzien: 'Od poprzedniego pomiaru',
      tydzien: 'Od poprzedniego tygodnia',
      miesiac: 'Od poprzedniego miesiąca'
    };

    const zmiana = znacznikZmiany(ostatni.kg - poprzedni.kg);
    const wiersz1 = document.createElement('div');
    wiersz1.className = 'wiersz-info';
    wiersz1.innerHTML = `<span>${podpisy[skala]}</span><b class="${zmiana.klasa}"></b>`;
    wiersz1.querySelector('b').textContent = zmiana.tekst;
    karta.appendChild(wiersz1);

    const odPoczatku = znacznikZmiany(ostatni.kg - punkty[0].kg);
    const wiersz2 = document.createElement('div');
    wiersz2.className = 'wiersz-info';
    wiersz2.innerHTML = `<span>Od początku</span><b class="${odPoczatku.klasa}"></b>`;
    wiersz2.querySelector('b').textContent = odPoczatku.tekst;
    karta.appendChild(wiersz2);
  }

  miejsce.appendChild(karta);
}

/* --------------------------------------------------------------------------
   Wykres
   -------------------------------------------------------------------------- */
function rysujWykresWagi(punkty, skala) {
  const miejsce = el('waga-wykres');
  miejsce.innerHTML = '';

  const tytuly = {
    dzien: 'Waga w czasie',
    tydzien: 'Średnia tygodniowa',
    miesiac: 'Średnia miesięczna'
  };

  if (punkty.length < 2) {
    const karta = document.createElement('div');
    karta.className = 'karta pusto';
    const czego = { dzien: 'pomiarze', tydzien: 'tygodniu', miesiac: 'miesiącu' };
    karta.innerHTML = punkty.length === 0
      ? '<p>Wpisz pierwszą wagę, a tu pojawi się wykres.</p>'
      : `<p>Wykres pojawi się przy drugim ${czego[skala]} z pomiarem.</p>`;
    miejsce.appendChild(karta);
    return;
  }

  const doWykresu = punkty.map(p => ({
    data: p.data,
    wartosc: p.kg,
    krotka: p.krotka
  }));

  const karta = document.createElement('div');
  karta.className = 'karta';
  karta.innerHTML = `<p class="podpis-karty">${tytuly[skala]}</p>` + rysunekWykresu(doWykresu);
  miejsce.appendChild(karta);
}

/* --------------------------------------------------------------------------
   Lista
   -------------------------------------------------------------------------- */
function rysujListePomiarow(punkty, skala) {
  const lista = el('lista-pomiarow');
  const podpisy = { dzien: 'Pomiary', tydzien: 'Tygodnie', miesiac: 'Miesiące' };

  el('podpis-listy').textContent = podpisy[skala];
  el('ile-pomiarow').textContent = punkty.length;
  lista.innerHTML = '';

  if (punkty.length === 0) {
    lista.innerHTML = '<li class="pusty-wpis">Nie masz jeszcze żadnego pomiaru.</li>';
    return;
  }

  // od najnowszego
  [...punkty].reverse().forEach((punkt, numerOdKonca) => {
    const poprzedni = punkty[punkty.length - 2 - numerOdKonca] || null;

    if (punkt.pomiar && edytowanyPomiar === punkt.pomiar.id) {
      lista.appendChild(wierszEdycjiPomiaru(punkt.pomiar));
    } else {
      lista.appendChild(wierszPomiaru(punkt, poprzedni, skala));
    }
  });
}

function wierszPomiaru(punkt, poprzedni, skala) {
  const pozycja = document.createElement('li');
  pozycja.className = 'wpis-pomiaru';
  pozycja.innerHTML = `
    <span class="opis-pomiaru">
      <b class="kg-pomiaru"></b>
      <span class="data-pomiaru"></span>
    </span>
    <span class="roznica"></span>`;

  pozycja.querySelector('.kg-pomiaru').textContent = formatujKg(punkt.kg) + ' kg';
  pozycja.querySelector('.data-pomiaru').textContent = skala === 'dzien'
    ? punkt.etykieta
    : `${punkt.etykieta} · ${punkt.ile} ${odmien(punkt.ile, 'pomiar', 'pomiary', 'pomiarów')}`;

  const roznica = pozycja.querySelector('.roznica');
  if (poprzedni) {
    const zmiana = znacznikZmiany(punkt.kg - poprzedni.kg);
    roznica.textContent = zmiana.tekst;
    roznica.classList.add(zmiana.klasa);
  } else {
    roznica.textContent = 'pierwszy';
    roznica.classList.add('bez-zmian');
  }

  // poprawiać i usuwać da się tylko konkretny pomiar, nie średnią
  if (punkt.pomiar) {
    const przyciski = document.createElement('span');
    przyciski.className = 'przyciski-pomiaru';
    przyciski.innerHTML = `
      <button class="ikonka mala" data-akcja="edytuj-pomiar" title="Popraw pomiar">✏️</button>
      <button class="ikonka mala" data-akcja="usun-pomiar" title="Usuń pomiar">🗑️</button>`;

    przyciski.querySelector('[data-akcja="edytuj-pomiar"]').addEventListener('click', () => {
      edytowanyPomiar = punkt.pomiar.id;
      rysujWage();
      const pole = el('lista-pomiarow').querySelector('.pole-edycji-wagi');
      if (pole) { pole.focus(); pole.select(); }
    });
    przyciski.querySelector('[data-akcja="usun-pomiar"]')
      .addEventListener('click', () => usunPomiar(punkt.pomiar.id));

    pozycja.appendChild(przyciski);
  }

  return pozycja;
}

/* Wiersz zamieniony w formularz — poprawianie wagi i daty. */
function wierszEdycjiPomiaru(pomiar) {
  const pozycja = document.createElement('li');
  pozycja.className = 'wpis-edycja';
  pozycja.innerHTML = `
    <div class="rzad-pol">
      <label class="pole">
        <span>Waga (kg)</span>
        <input type="text" class="pole-edycji-wagi" inputmode="decimal" autocomplete="off">
      </label>
      <label class="pole">
        <span>Data</span>
        <input type="date" class="pole-edycji-daty">
      </label>
    </div>
    <div class="rzad">
      <button class="przycisk maly" data-akcja="zapisz-pomiar">Zapisz</button>
      <button class="przycisk maly wtorny" data-akcja="anuluj-pomiar">Anuluj</button>
    </div>`;

  const poleWagi = pozycja.querySelector('.pole-edycji-wagi');
  const poleDaty = pozycja.querySelector('.pole-edycji-daty');
  poleWagi.value = formatujKg(pomiar.kg);
  poleDaty.value = pomiar.data;

  const zapisz = () => zapiszPoprawionyPomiar(pomiar.id, poleWagi.value, poleDaty.value);

  pozycja.querySelector('[data-akcja="zapisz-pomiar"]').addEventListener('click', zapisz);
  poleWagi.addEventListener('keydown', z => { if (z.key === 'Enter') zapisz(); });

  pozycja.querySelector('[data-akcja="anuluj-pomiar"]').addEventListener('click', () => {
    edytowanyPomiar = null;
    rysujWage();
  });

  return pozycja;
}

/* --------------------------------------------------------------------------
   Zapisywanie, poprawianie, usuwanie
   -------------------------------------------------------------------------- */

/* Sprawdza wagę wpisaną w pole. Zwraca liczbę albo NaN (i pokazuje komunikat). */
function sprawdzWage(wartosc) {
  const kg = naLiczbe(wartosc);
  if (isNaN(kg) || kg < 20 || kg > 400) {
    powiadom('Wpisz wagę w kilogramach, np. 82,4.');
    return NaN;
  }
  return kg;
}

function zapiszPomiar() {
  const poleWagi = el('pole-wagi');
  const poleDaty = el('pole-daty-wagi');

  const kg = sprawdzWage(poleWagi.value);
  if (isNaN(kg)) { poleWagi.focus(); return; }

  const data = poleDaty.value || dzisiajISO();
  const istniejacy = dane.pomiaryWagi.find(p => p.data === data);

  const zapisz = () => {
    if (istniejacy) istniejacy.kg = kg;
    else dane.pomiaryWagi.push({ id: nowyId(), data: data, kg: kg });

    zapiszDane();
    poleWagi.value = '';
    poleWagi.blur();               // chowa klawiaturę na telefonie
    poleDaty.value = dzisiajISO();
    rysujWage();
  };

  if (istniejacy) {
    zapytaj(
      `Na ${formatujDate(data)} jest już zapisane ${formatujKg(istniejacy.kg)} kg.\n\n` +
      `Zastąpić wynikiem ${formatujKg(kg)} kg?`,
      'Zastąp',
      zapisz,
      false
    );
    return;
  }

  zapisz();
}

function zapiszPoprawionyPomiar(id, wartoscWagi, wartoscDaty) {
  const pomiar = dane.pomiaryWagi.find(p => p.id === id);
  if (!pomiar) return;

  const kg = sprawdzWage(wartoscWagi);
  if (isNaN(kg)) return;

  const data = wartoscDaty || pomiar.data;

  // na jeden dzień przypada jeden pomiar
  const kolizja = dane.pomiaryWagi.find(p => p.id !== id && p.data === data);
  if (kolizja) {
    powiadom(`Na ${formatujDate(data)} jest już zapisane ${formatujKg(kolizja.kg)} kg.\n\n` +
             'Najpierw usuń tamten pomiar albo wybierz inny dzień.');
    return;
  }

  pomiar.kg = kg;
  pomiar.data = data;
  zapiszDane();

  edytowanyPomiar = null;
  rysujWage();
}

function usunPomiar(id) {
  const pomiar = dane.pomiaryWagi.find(p => p.id === id);
  if (!pomiar) return;

  zapytaj(
    `Usunąć pomiar ${formatujKg(pomiar.kg)} kg z ${formatujDate(pomiar.data)}?`,
    'Usuń',
    () => {
      dane.pomiaryWagi = dane.pomiaryWagi.filter(p => p.id !== id);
      zapiszDane();
      edytowanyPomiar = null;
      rysujWage();
    }
  );
}

/* --------------------------------------------------------------------------
   Podpięcie przycisków (wołane raz, przy starcie aplikacji)
   -------------------------------------------------------------------------- */
function podepnijWage() {
  el('btn-zapisz-wage').addEventListener('click', zapiszPomiar);

  el('pole-wagi').addEventListener('keydown', zdarzenie => {
    if (zdarzenie.key === 'Enter') zapiszPomiar();
  });

  document.querySelectorAll('#przelacznik-skali button').forEach(przycisk => {
    przycisk.addEventListener('click', () => zmienSkaleWagi(przycisk.dataset.skala));
  });
}
