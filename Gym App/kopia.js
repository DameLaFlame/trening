/* ==========================================================================
   kopia.js — kopia zapasowa danych: zapis do pliku i wczytywanie z pliku
   --------------------------------------------------------------------------
   Cała historia treningów siedzi w pamięci telefonu i istnieje w jednym
   egzemplarzu. Ten plik pozwala odłożyć ją do zwykłego pliku — na iPhonie
   najlepiej do aplikacji „Pliki” albo iCloud Drive.

   WAŻNE OGRANICZENIE: przeglądarka nie może sama zapisywać plików na dysku.
   Każda kopia wymaga jednego kliknięcia — to zabezpieczenie przeglądarki,
   nie da się go obejść. Dlatego zamiast automatu jest przypomnienie:
   aplikacja pilnuje daty ostatniej kopii i sama się upomina.
   ========================================================================== */

/* Co ile dni przypominać o kopii. */
const ODSTEPY_PRZYPOMNIEN = {
  dzien:   1,
  tydzien: 7,
  miesiac: 30,
  nigdy:   null
};

/* --------------------------------------------------------------------------
   Ile dni minęło od ostatniej kopii
   -------------------------------------------------------------------------- */
function dniOdKopii() {
  const ostatnia = dane.ustawienia.ostatniaKopia;
  if (!ostatnia) return null;                 // nigdy nie robiona

  const roznica = Date.now() - new Date(ostatnia).getTime();
  return Math.floor(roznica / (24 * 60 * 60 * 1000));
}

/* Czy pora przypomnieć o kopii? */
function poraNaKopie() {
  const odstep = ODSTEPY_PRZYPOMNIEN[dane.ustawienia.przypominajOKopii];
  if (odstep === null || odstep === undefined) return false;

  // nie zawracamy głowy, dopóki nie ma czego tracić
  if (dane.treningi.length === 0 && dane.pomiaryWagi.length === 0) return false;

  const dni = dniOdKopii();
  return dni === null || dni >= odstep;
}

/* --------------------------------------------------------------------------
   Zapisywanie kopii
   -------------------------------------------------------------------------- */

/* Nazwa pliku z dzisiejszą datą, np. „trening-kopia-2026-08-13.json”. */
function nazwaPlikuKopii() {
  return `trening-kopia-${dzisiajISO()}.json`;
}

/* Zawartość pliku: dane plus krótka metryczka. */
function trescKopii() {
  return JSON.stringify({
    aplikacja: 'Trening — dziennik siłowni',
    wersjaDanych: 1,
    zapisano: new Date().toISOString(),
    dane: dane
  }, null, 2);
}

function zapiszKopie() {
  const plik = new File([trescKopii()], nazwaPlikuKopii(), { type: 'application/json' });

  const poUdanym = () => {
    dane.ustawienia.ostatniaKopia = new Date().toISOString();
    zapiszDane();
    rysujUstawienia();
    rysujTrening();      // pasek z przypomnieniem może zniknąć
  };

  // Na iPhonie to otwiera zwykły arkusz udostępniania — jest tam „Zapisz
  // w Plikach” (także iCloud Drive), Mail, WhatsApp i cała reszta.
  if (navigator.canShare && navigator.canShare({ files: [plik] })) {
    navigator.share({ files: [plik], title: 'Kopia danych z aplikacji Trening' })
      .then(poUdanym)
      .catch(blad => {
        // użytkownik zamknął arkusz — to nie błąd, nic nie robimy
        if (blad && blad.name === 'AbortError') return;
        pobierzPlikiem(plik, poUdanym);
      });
    return;
  }

  pobierzPlikiem(plik, poUdanym);
}

/* Zwykłe pobranie pliku — na Macu ląduje w „Pobrane rzeczy”. */
function pobierzPlikiem(plik, poUdanym) {
  const adres = URL.createObjectURL(plik);
  const odnosnik = document.createElement('a');
  odnosnik.href = adres;
  odnosnik.download = plik.name;
  document.body.appendChild(odnosnik);
  odnosnik.click();
  document.body.removeChild(odnosnik);
  setTimeout(() => URL.revokeObjectURL(adres), 10000);

  poUdanym();
}

/* --------------------------------------------------------------------------
   Wczytywanie kopii
   -------------------------------------------------------------------------- */
function wybierzPlikKopii() {
  el('plik-kopii').value = '';   // bez tego drugi wybór tego samego pliku nic nie da
  el('plik-kopii').click();
}

function wczytajKopie(plik) {
  if (!plik) return;

  const czytnik = new FileReader();

  czytnik.onerror = () => powiadom('Nie udało się odczytać tego pliku.');
  czytnik.onload = () => {
    let wczytane;
    try {
      wczytane = JSON.parse(czytnik.result);
    } catch (blad) {
      powiadom('To nie wygląda na kopię danych z tej aplikacji.\n\n' +
               'Wybierz plik o nazwie zaczynającej się od „trening-kopia”.');
      return;
    }

    // plik może być zapisany z metryczką albo być samym workiem danych
    const nowe = wczytane && wczytane.dane ? wczytane.dane : wczytane;

    if (!nowe || !Array.isArray(nowe.cwiczenia) || !Array.isArray(nowe.treningi)) {
      powiadom('Ten plik nie zawiera danych treningowych.');
      return;
    }

    const ileTreningow = nowe.treningi.length;
    const ilePomiarow = Array.isArray(nowe.pomiaryWagi) ? nowe.pomiaryWagi.length : 0;
    // data liczona po lokalnej strefie — inaczej kopia zapisana wieczorem
    // potrafi się przedstawić jako wczorajsza
    const kiedy = wczytane.zapisano
      ? formatujDate(isoZDaty(new Date(wczytane.zapisano)))
      : 'nieznana data';

    zapytaj(
      `Kopia z ${kiedy}: ${ileTreningow} ` +
      `${odmien(ileTreningow, 'trening', 'treningi', 'treningów')} i ` +
      `${ilePomiarow} ${odmien(ilePomiarow, 'pomiar wagi', 'pomiary wagi', 'pomiarów wagi')}.\n\n` +
      'Wczytanie zastąpi WSZYSTKO, co jest teraz w aplikacji. ' +
      'Tego nie da się cofnąć.',
      'Zastąp dane',
      () => zastapDane(nowe)
    );
  };

  czytnik.readAsText(plik);
}

function zastapDane(nowe) {
  const baza = pustaBaza();

  // doklejamy do świeżej bazy, żeby brakujące pola dostały wartości domyślne
  dane = Object.assign(baza, nowe, {
    ustawienia: Object.assign(baza.ustawienia, nowe.ustawienia || {})
  });
  zapiszDane();

  // wszystkie ekrany od nowa
  edytowanyZestaw = null;
  otwartyTreningId = null;
  trybEdycjiHistorii = false;
  wybranyProgres = null;
  edytowanyPomiar = null;

  pokazEkran('ustawienia');
  powiadom('Dane wczytane.');
}

/* --------------------------------------------------------------------------
   Kasowanie wszystkiego
   -------------------------------------------------------------------------- */
function usunWszystkieDane() {
  zapytaj(
    'Usunąć WSZYSTKIE dane — treningi, zestawy, pomiary wagi i listę ćwiczeń?\n\n' +
    'Aplikacja wróci do stanu z pierwszego uruchomienia. Tego nie da się cofnąć.',
    'Usuń wszystko',
    () => {
      // druga prośba o potwierdzenie — to jedyna operacja bez odwrotu
      zapytaj(
        'Na pewno? Zapisane treningi znikną bezpowrotnie.\n\n' +
        'Jeśli masz kopię w plikach, będzie ją można wczytać z powrotem.',
        'Tak, usuń wszystko',
        () => {
          dane = pustaBaza();
          zapiszDane();

          edytowanyZestaw = null;
          otwartyTreningId = null;
          trybEdycjiHistorii = false;
          wybranyProgres = null;
          edytowanyPomiar = null;

          pokazEkran('ustawienia');
        }
      );
    }
  );
}

/* --------------------------------------------------------------------------
   Rysowanie karty w Ustawieniach
   -------------------------------------------------------------------------- */
function rysujKopie() {
  const dni = dniOdKopii();
  const opis = el('stan-kopii');

  if (dni === null) {
    opis.textContent = 'jeszcze nie robiona';
    opis.className = 'ostrzezenie';
  } else if (dni === 0) {
    opis.textContent = 'dzisiaj';
    opis.className = '';
  } else {
    opis.textContent = `${dni} ${odmien(dni, 'dzień temu', 'dni temu', 'dni temu')}`;
    opis.className = poraNaKopie() ? 'ostrzezenie' : '';
  }

  document.querySelectorAll('#przelacznik-przypomnien button').forEach(przycisk => {
    przycisk.classList.toggle('aktywna',
      przycisk.dataset.odstep === dane.ustawienia.przypominajOKopii);
  });
}

/* Pasek przypomnienia na ekranie startowym treningu. */
function pasekPrzypomnienia() {
  if (!poraNaKopie()) return null;

  const dni = dniOdKopii();
  const pasek = document.createElement('div');
  pasek.className = 'pasek-przypomnienia';
  pasek.innerHTML = `
    <span class="tresc-przypomnienia"></span>
    <button class="przycisk maly" data-akcja="zapisz-kopie">Zapisz kopię</button>`;

  pasek.querySelector('.tresc-przypomnienia').textContent = dni === null
    ? 'Nie masz jeszcze kopii swoich danych.'
    : `Od ostatniej kopii minęło ${dni} ${odmien(dni, 'dzień', 'dni', 'dni')}.`;

  pasek.querySelector('[data-akcja="zapisz-kopie"]')
    .addEventListener('click', zapiszKopie);

  return pasek;
}

/* --------------------------------------------------------------------------
   Podpięcie przycisków (wołane raz, przy starcie aplikacji)
   -------------------------------------------------------------------------- */
function podepnijKopie() {
  el('btn-zapisz-kopie').addEventListener('click', zapiszKopie);
  el('btn-wczytaj-kopie').addEventListener('click', wybierzPlikKopii);
  el('btn-usun-wszystko').addEventListener('click', usunWszystkieDane);

  el('plik-kopii').addEventListener('change', zdarzenie => {
    wczytajKopie(zdarzenie.target.files[0]);
  });

  document.querySelectorAll('#przelacznik-przypomnien button').forEach(przycisk => {
    przycisk.addEventListener('click', () => {
      dane.ustawienia.przypominajOKopii = przycisk.dataset.odstep;
      zapiszDane();
      rysujKopie();
      rysujTrening();
    });
  });
}
