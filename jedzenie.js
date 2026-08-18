/* ==========================================================================
   jedzenie.js — dzienny cel kalorii i białka + dziennik posiłków
   --------------------------------------------------------------------------
   Cel liczymy z aktualnej wagi (najświeższy pomiar). Po porannym zważeniu
   aplikacja od razu pokazuje, ile dziś zjeść.

   JAK LICZYMY CEL (wzory z pliku kontekstowego)
     BMR (Mifflin-St Jeor, mężczyzna) = 10·kg + 6,25·wzrost − 5·wiek + 5
     TDEE = BMR × PAL        PAL: poza sezonem 1,55 · w sezonie 1,725
     cel kcal   = TDEE + nadwyżka na masę (domyślnie +400)
     cel białka = kg × g/kg  (domyślnie 2,0 g/kg)

   PODŚWIETLENIE „CZY SPEŁNIŁEM”
     Aplikacja to strona — nie chodzi w tle, więc nie zaświeci się sama
     o 22:00 przy zamkniętym telefonie. Zamiast tego: gdy otworzysz ją po
     22:00, karta celu jest już pokolorowana (zielona = dobiłeś, czerwona =
     nie), a każdy dodany po 22:00 posiłek od razu przelicza kolor. Dni
     wcześniejsze są w historii zawsze pokolorowane — czyli następnego dnia
     po zważeniu widzisz werdykt z wczoraj.
   ========================================================================== */

/* Godzina, od której dzień uznajemy za „zamknięty” i kolorujemy werdykt.
   `let`, żeby dało się nią sterować w testach. */
let GODZINA_PODSUMOWANIA = 22;

/* Id posiłku, który właśnie poprawiamy na liście „Dzisiejsze posiłki”. */
let posilekWEdycji = null;

/* --------------------------------------------------------------------------
   Liczenie celu
   -------------------------------------------------------------------------- */
function bmr(kg) {
  const p = dane.profil;
  const podstawa = 10 * kg + 6.25 * p.wzrost - 5 * p.wiek;
  return p.plec === 'k' ? podstawa - 161 : podstawa + 5;
}

function wspolczynnikAktywnosci() {
  return dane.profil.tryb === 'sezon' ? 1.725 : 1.55;
}

function tdee(kg) {
  return bmr(kg) * wspolczynnikAktywnosci();
}

/* Cele zaokrąglone do czytelnych liczb. */
function celKcal(kg) {
  return Math.round((tdee(kg) + dane.profil.nadwyzka) / 50) * 50;
}
function celBialko(kg) {
  return Math.round(kg * dane.profil.bialkoNaKg / 5) * 5;
}

/* --------------------------------------------------------------------------
   Waga i posiłki danego dnia
   -------------------------------------------------------------------------- */

/* Waga obowiązująca danego dnia = ostatni pomiar zrobiony tego dnia lub wcześniej. */
function wagaNaDzien(iso) {
  const doTego = pomiaryChronologicznie().filter(p => p.data <= iso);
  return doTego.length ? doTego[doTego.length - 1].kg : null;
}

/* Cele dnia (albo null, gdy nie ma jeszcze żadnej wagi). */
function celeDnia(iso) {
  const kg = wagaNaDzien(iso);
  if (kg === null) return null;
  return { waga: kg, kcal: celKcal(kg), bialko: celBialko(kg) };
}

function posilkiDnia(iso) {
  return dane.posilki.filter(p => p.data === iso);
}

function sumaDnia(iso) {
  return posilkiDnia(iso).reduce(
    (suma, p) => ({ kcal: suma.kcal + p.kcal, bialko: suma.bialko + p.bialko }),
    { kcal: 0, bialko: 0 }
  );
}

function czySpelniony(iso) {
  const cel = celeDnia(iso);
  if (!cel) return false;
  const suma = sumaDnia(iso);
  return suma.kcal >= cel.kcal && suma.bialko >= cel.bialko;
}

/* Czy dzień jest już „domknięty” — wtedy pokazujemy werdykt kolorem. */
function dzienZamkniety(iso) {
  const dzis = dzisiajISO();
  if (iso < dzis) return true;
  if (iso === dzis) return new Date().getHours() >= GODZINA_PODSUMOWANIA;
  return false;
}

/* --------------------------------------------------------------------------
   Przełączanie podzakładek ekranu Waga: „Waga” / „Jedzenie”
   -------------------------------------------------------------------------- */
function wejscieNaWage() {
  const sekcja = dane.ustawienia.sekcjaWagi || 'waga';
  pokazSekcjeWagi(sekcja);
}

function pokazSekcjeWagi(sekcja) {
  posilekWEdycji = null;   // świeże wejście na ekran nie zostawia otwartej edycji
  dane.ustawienia.sekcjaWagi = sekcja;
  zapiszDane();

  el('sekcja-waga').hidden = sekcja !== 'waga';
  el('sekcja-jedzenie').hidden = sekcja !== 'jedzenie';
  document.querySelectorAll('#przelacznik-sekcji button').forEach(b =>
    b.classList.toggle('aktywna', b.dataset.sekcja === sekcja));

  el('tresc').scrollTop = 0;

  if (sekcja === 'jedzenie') rysujJedzenie();
  else                       rysujWage();
}

/* --------------------------------------------------------------------------
   Podgląd celu na podzakładce „Waga” — glanceable, zaraz po zważeniu
   -------------------------------------------------------------------------- */
function rysujCelInline() {
  const miejsce = el('waga-cel-inline');
  miejsce.innerHTML = '';

  const cel = celeDnia(dzisiajISO());
  if (!cel) return;   // bez wagi nie ma czego pokazać

  const karta = document.createElement('button');
  karta.className = 'karta cel-inline';
  karta.innerHTML = `
    <span class="podpis-karty">Dziś zjedz</span>
    <span class="cel-inline-liczby">
      <b></b> kcal · <b></b> g białka
    </span>
    <span class="cel-inline-link">Zapisz posiłki →</span>`;

  const liczby = karta.querySelectorAll('.cel-inline-liczby b');
  liczby[0].textContent = cel.kcal;
  liczby[1].textContent = cel.bialko;

  karta.addEventListener('click', () => pokazSekcjeWagi('jedzenie'));
  miejsce.appendChild(karta);
}

/* --------------------------------------------------------------------------
   Podzakładka „Jedzenie”
   -------------------------------------------------------------------------- */
function rysujJedzenie() {
  document.querySelectorAll('#przelacznik-trybu button').forEach(b =>
    b.classList.toggle('aktywna', b.dataset.tryb === dane.profil.tryb));

  rysujCelDnia();
  rysujPresetyPosilkow();
  rysujListePosilkow();
  rysujHistorieJedzenia();
}

/* Pasek postępu: [==== ] z liczbą i kolorem zależnym od stanu. */
function paseKPostepu(etykieta, wartosc, cel, zamkniety) {
  const procent = cel > 0 ? Math.min(100, Math.round(wartosc / cel * 100)) : 0;
  const osiagniety = wartosc >= cel;
  const stan = !zamkniety ? 'wtoku' : (osiagniety ? 'spelniony' : 'niespelniony');

  const blok = document.createElement('div');
  blok.className = 'blok-postepu';
  blok.innerHTML = `
    <div class="glowa-postepu">
      <span class="etykieta-postepu"></span>
      <span class="liczby-postepu"><b></b> / <span class="cel-postepu"></span></span>
    </div>
    <div class="pasek-postepu"><div class="wypelnienie ${stan}"></div></div>`;

  blok.querySelector('.etykieta-postepu').textContent = etykieta;
  blok.querySelector('.liczby-postepu b').textContent = Math.round(wartosc);
  blok.querySelector('.cel-postepu').textContent = cel;
  blok.querySelector('.wypelnienie').style.width = procent + '%';
  return blok;
}

function rysujCelDnia() {
  const miejsce = el('jedzenie-cel');
  miejsce.innerHTML = '';

  const dzis = dzisiajISO();
  const cel = celeDnia(dzis);

  if (!cel) {
    const pusto = document.createElement('div');
    pusto.className = 'karta pusto';
    pusto.innerHTML = '<p>Dodaj dzisiejszą wagę w zakładce „Waga”, ' +
                      'a policzę Twój cel na dziś.</p>';
    miejsce.appendChild(pusto);
    return;
  }

  const suma = sumaDnia(dzis);
  const zamkniety = dzienZamkniety(dzis);
  const spelniony = czySpelniony(dzis);

  const karta = document.createElement('div');
  karta.className = 'karta cel-karta' +
    (zamkniety ? (spelniony ? ' spelniony' : ' niespelniony') : '');

  const naglowek = document.createElement('p');
  naglowek.className = 'podpis-karty';
  naglowek.textContent = `Dziś — cel przy wadze ${formatujKg(cel.waga)} kg`;
  karta.appendChild(naglowek);

  karta.appendChild(paseKPostepu('Kalorie', suma.kcal, cel.kcal, zamkniety));
  karta.appendChild(paseKPostepu('Białko (g)', suma.bialko, cel.bialko, zamkniety));

  const podsumowanie = document.createElement('p');
  podsumowanie.className = 'opis podsumowanie-celu';
  podsumowanie.textContent = tekstPodsumowaniaCelu(cel, suma, zamkniety, spelniony);
  karta.appendChild(podsumowanie);

  miejsce.appendChild(karta);
}

function tekstPodsumowaniaCelu(cel, suma, zamkniety, spelniony) {
  const brakKcal = Math.max(0, cel.kcal - suma.kcal);
  const brakBialka = Math.max(0, cel.bialko - suma.bialko);

  if (spelniony) return 'Cel na dziś osiągnięty. Dobra robota!';

  if (zamkniety) {
    const czego = [];
    if (brakKcal > 0)   czego.push(`${brakKcal} kcal`);
    if (brakBialka > 0) czego.push(`${brakBialka} g białka`);
    return 'Dzień zamknięty — zabrakło: ' + czego.join(' i ') + '.';
  }

  const zostalo = [];
  if (brakKcal > 0)   zostalo.push(`${brakKcal} kcal`);
  if (brakBialka > 0) zostalo.push(`${brakBialka} g białka`);
  return zostalo.length ? 'Zostało: ' + zostalo.join(' · ') : 'Cel prawie osiągnięty.';
}

/* --------------------------------------------------------------------------
   Szybkie posiłki (presety do powtarzania)
   -------------------------------------------------------------------------- */
function rysujPresetyPosilkow() {
  const miejsce = el('jedzenie-presety');
  miejsce.innerHTML = '';

  const presety = dane.presetyPosilkow || [];
  if (presety.length === 0) return;   // nic nie pokazujemy, gdy brak szybkich posiłków

  const podpis = document.createElement('p');
  podpis.className = 'podpis';
  podpis.textContent = 'Szybkie posiłki — kliknij, aby dodać';
  miejsce.appendChild(podpis);

  const lista = document.createElement('ul');
  lista.className = 'lista';

  presety.forEach(preset => {
    const pozycja = document.createElement('li');
    pozycja.className = 'wpis-presetu';
    pozycja.innerHTML = `
      <button class="wybor-presetu">
        <b class="nazwa-presetu"></b>
        <span class="makro-presetu"></span>
      </button>
      <button class="ikonka mala" data-akcja="usun-preset" title="Usuń szybki posiłek">🗑️</button>`;

    pozycja.querySelector('.nazwa-presetu').textContent = preset.nazwa;
    pozycja.querySelector('.makro-presetu').textContent =
      `${preset.kcal} kcal · ${formatujKg(preset.bialko)} g białka`;
    pozycja.querySelector('.wybor-presetu')
      .addEventListener('click', () => dodajPosilekZPresetu(preset.id));
    pozycja.querySelector('[data-akcja="usun-preset"]')
      .addEventListener('click', () => usunPreset(preset.id));

    lista.appendChild(pozycja);
  });

  miejsce.appendChild(lista);
}

/* Kliknięcie w szybki posiłek dokłada go do dzisiejszych posiłków. */
function dodajPosilekZPresetu(id) {
  const preset = (dane.presetyPosilkow || []).find(p => p.id === id);
  if (!preset) return;

  dane.posilki.push({
    id: nowyId(),
    data: dzisiajISO(),
    nazwa: preset.nazwa,
    kcal: preset.kcal,
    bialko: preset.bialko,
    dodano: new Date().toISOString()
  });
  zapiszDane();
  rysujJedzenie();
}

/* „Zapisz jako szybki posiłek” — bierze to, co wpisane w polach dodawania. */
function zapiszPreset() {
  const poleNazwa  = el('posilek-nazwa');
  const poleKcal   = el('posilek-kcal');
  const poleBialko = el('posilek-bialko');

  const nazwa = poleNazwa.value.trim();
  const kcal = naLiczbe(poleKcal.value);
  const bialko = poleBialko.value.trim() === '' ? 0 : naLiczbe(poleBialko.value);

  if (!nazwa) {
    powiadom('Wpisz nazwę dania, np. „Owsianka z bananem”, a potem zapisz je jako szybki posiłek.');
    return;
  }
  if (isNaN(kcal) || kcal < 0 || kcal > 10000) {
    powiadom('Wpisz kalorie dania (liczbę).');
    poleKcal.focus();
    return;
  }
  if (isNaN(bialko) || bialko < 0 || bialko > 500) {
    powiadom('Białko wpisz w gramach albo zostaw puste.');
    poleBialko.focus();
    return;
  }
  if (kcal === 0 && bialko === 0) {
    powiadom('Danie musi mieć kalorie albo białko.');
    return;
  }

  if (!Array.isArray(dane.presetyPosilkow)) dane.presetyPosilkow = [];

  const istniejacy = dane.presetyPosilkow.find(
    p => p.nazwa.toLowerCase() === nazwa.toLowerCase());

  if (istniejacy) {
    istniejacy.kcal = Math.round(kcal);
    istniejacy.bialko = Math.round(bialko * 10) / 10;
  } else {
    dane.presetyPosilkow.push({
      id: nowyId(),
      nazwa: nazwa,
      kcal: Math.round(kcal),
      bialko: Math.round(bialko * 10) / 10
    });
  }
  zapiszDane();

  powiadom(istniejacy
    ? `„${nazwa}” zaktualizowany w szybkich posiłkach.`
    : `„${nazwa}” dodany do szybkich posiłków. Następnym razem dodasz go jednym kliknięciem.`);

  rysujPresetyPosilkow();
}

function usunPreset(id) {
  const preset = (dane.presetyPosilkow || []).find(p => p.id === id);
  if (!preset) return;

  zapytaj(`Usunąć „${preset.nazwa}” z szybkich posiłków?`, 'Usuń', () => {
    dane.presetyPosilkow = dane.presetyPosilkow.filter(p => p.id !== id);
    zapiszDane();
    rysujPresetyPosilkow();
  });
}

/* --------------------------------------------------------------------------
   Dzisiejsze posiłki
   -------------------------------------------------------------------------- */
function rysujListePosilkow() {
  const lista = el('lista-posilkow');
  const posilki = posilkiDnia(dzisiajISO());
  lista.innerHTML = '';
  el('ile-posilkow').textContent = posilki.length;

  if (posilki.length === 0) {
    lista.innerHTML = '<li class="pusty-wpis">Nie masz dziś żadnego posiłku.</li>';
    return;
  }

  posilki.forEach(posilek => {
    const pozycja = document.createElement('li');

    // --- tryb poprawiania posiłku ---
    if (posilekWEdycji === posilek.id) {
      pozycja.className = 'wpis-posilku wpis-edycja';
      pozycja.innerHTML = `
        <label class="pole">
          <span>Nazwa posiłku</span>
          <input type="text" class="edp-nazwa" autocomplete="off" autocapitalize="sentences">
        </label>
        <div class="rzad-pol odstep">
          <label class="pole">
            <span>Kalorie</span>
            <input type="text" class="edp-kcal" inputmode="numeric" autocomplete="off">
          </label>
          <label class="pole">
            <span>Białko (g)</span>
            <input type="text" class="edp-bialko" inputmode="decimal" autocomplete="off">
          </label>
        </div>
        <div class="rzad">
          <button class="przycisk maly" data-akcja="zapisz-posilek">Zapisz</button>
          <button class="przycisk maly wtorny" data-akcja="anuluj-posilek">Anuluj</button>
        </div>`;

      pozycja.querySelector('.edp-nazwa').value = posilek.nazwa;
      pozycja.querySelector('.edp-kcal').value = posilek.kcal;
      pozycja.querySelector('.edp-bialko').value = formatujKg(posilek.bialko);

      pozycja.querySelector('[data-akcja="zapisz-posilek"]')
        .addEventListener('click', () => zapiszEdycjePosilku(posilek.id, pozycja));
      pozycja.querySelector('[data-akcja="anuluj-posilek"]')
        .addEventListener('click', () => { posilekWEdycji = null; rysujListePosilkow(); });

      lista.appendChild(pozycja);
      return;
    }

    // --- zwykły wiersz z posiłkiem ---
    pozycja.className = 'wpis-posilku';
    pozycja.innerHTML = `
      <span class="opis-pomiaru">
        <b class="nazwa-posilku"></b>
        <span class="makro-posilku"></span>
      </span>
      <button class="ikonka mala" data-akcja="edytuj-posilek" title="Edytuj posiłek">✏️</button>
      <button class="ikonka mala" data-akcja="usun-posilek" title="Usuń posiłek">🗑️</button>`;

    pozycja.querySelector('.nazwa-posilku').textContent = posilek.nazwa;
    pozycja.querySelector('.makro-posilku').textContent =
      `${posilek.kcal} kcal · ${formatujKg(posilek.bialko)} g białka`;
    pozycja.querySelector('[data-akcja="edytuj-posilek"]').addEventListener('click', () => {
      posilekWEdycji = posilek.id;
      rysujListePosilkow();
      const pole = lista.querySelector('.edp-nazwa');
      if (pole) { pole.focus(); pole.select(); }
    });
    pozycja.querySelector('[data-akcja="usun-posilek"]')
      .addEventListener('click', () => usunPosilek(posilek.id));

    lista.appendChild(pozycja);
  });
}

/* Zapis poprawionego posiłku — te same sprawdzenia co przy dodawaniu. */
function zapiszEdycjePosilku(id, pozycja) {
  const posilek = dane.posilki.find(p => p.id === id);
  if (!posilek) return;

  const nazwa = pozycja.querySelector('.edp-nazwa').value.trim();
  const kcal = naLiczbe(pozycja.querySelector('.edp-kcal').value);
  const bialkoTekst = pozycja.querySelector('.edp-bialko').value.trim();
  const bialko = bialkoTekst === '' ? 0 : naLiczbe(bialkoTekst);

  if (!nazwa) { powiadom('Wpisz nazwę posiłku.'); return; }
  if (isNaN(kcal) || kcal < 0 || kcal > 10000) { powiadom('Wpisz kalorie posiłku (liczbę).'); return; }
  if (isNaN(bialko) || bialko < 0 || bialko > 500) { powiadom('Białko wpisz w gramach albo zostaw puste.'); return; }
  if (kcal === 0 && bialko === 0) { powiadom('Posiłek musi mieć kalorie albo białko.'); return; }

  posilek.nazwa = nazwa;
  posilek.kcal = Math.round(kcal);
  posilek.bialko = Math.round(bialko * 10) / 10;
  zapiszDane();

  posilekWEdycji = null;
  rysujJedzenie();   // odświeża też cel dnia — suma się zmieniła
}

/* --------------------------------------------------------------------------
   Historia poprzednich dni
   -------------------------------------------------------------------------- */
function rysujHistorieJedzenia() {
  const miejsce = el('jedzenie-historia');
  miejsce.innerHTML = '';

  const dzis = dzisiajISO();
  const dni = [...new Set(dane.posilki.map(p => p.data))]
    .filter(d => d < dzis)
    .sort((a, b) => b.localeCompare(a))
    .slice(0, 30);

  if (dni.length === 0) return;

  const podpis = document.createElement('p');
  podpis.className = 'podpis';
  podpis.textContent = 'Poprzednie dni';
  miejsce.appendChild(podpis);

  const lista = document.createElement('ul');
  lista.className = 'lista';

  dni.forEach(iso => {
    const cel = celeDnia(iso);
    const suma = sumaDnia(iso);
    const spelniony = cel && suma.kcal >= cel.kcal && suma.bialko >= cel.bialko;

    const pozycja = document.createElement('li');
    pozycja.className = 'wpis-dnia-jedzenia';
    pozycja.innerHTML = `
      <span class="opis-pomiaru">
        <b class="data-dnia"></b>
        <span class="makro-dnia"></span>
      </span>
      <span class="werdykt"></span>`;

    pozycja.querySelector('.data-dnia').textContent = formatujDate(iso);
    pozycja.querySelector('.makro-dnia').textContent = cel
      ? `${suma.kcal} / ${cel.kcal} kcal · ${formatujKg(suma.bialko)} / ${cel.bialko} g`
      : `${suma.kcal} kcal · ${formatujKg(suma.bialko)} g białka`;

    const werdykt = pozycja.querySelector('.werdykt');
    if (cel) {
      werdykt.textContent = spelniony ? '✓' : '✕';
      werdykt.classList.add(spelniony ? 'w-gore' : 'w-dol');
    }

    lista.appendChild(pozycja);
  });

  miejsce.appendChild(lista);
}

/* --------------------------------------------------------------------------
   Dodawanie i usuwanie posiłków
   -------------------------------------------------------------------------- */
function dodajPosilek() {
  const poleNazwa  = el('posilek-nazwa');
  const poleKcal   = el('posilek-kcal');
  const poleBialko = el('posilek-bialko');

  const nazwa = poleNazwa.value.trim();
  const kcal = naLiczbe(poleKcal.value);
  const bialko = poleBialko.value.trim() === '' ? 0 : naLiczbe(poleBialko.value);

  if (!nazwa) {
    powiadom('Wpisz nazwę posiłku, np. „Owsianka z bananem”.');
    return;
  }
  if (isNaN(kcal) || kcal < 0 || kcal > 10000) {
    powiadom('Wpisz kalorie posiłku (liczbę).');
    poleKcal.focus();
    return;
  }
  if (isNaN(bialko) || bialko < 0 || bialko > 500) {
    powiadom('Białko wpisz w gramach albo zostaw puste.');
    poleBialko.focus();
    return;
  }
  if (kcal === 0 && bialko === 0) {
    powiadom('Posiłek musi mieć kalorie albo białko.');
    return;
  }

  dane.posilki.push({
    id: nowyId(),
    data: dzisiajISO(),
    nazwa: nazwa,
    kcal: Math.round(kcal),
    bialko: Math.round(bialko * 10) / 10,
    dodano: new Date().toISOString()
  });
  zapiszDane();

  poleNazwa.value = '';
  poleKcal.value = '';
  poleBialko.value = '';
  poleNazwa.blur();

  rysujJedzenie();
}

function usunPosilek(id) {
  const posilek = dane.posilki.find(p => p.id === id);
  if (!posilek) return;

  zapytaj(`Usunąć „${posilek.nazwa}” (${posilek.kcal} kcal)?`, 'Usuń', () => {
    dane.posilki = dane.posilki.filter(p => p.id !== id);
    zapiszDane();
    rysujJedzenie();
  });
}

function zmienTryb(tryb) {
  dane.profil.tryb = tryb;
  zapiszDane();
  rysujJedzenie();
}

/* --------------------------------------------------------------------------
   Ustawienia profilu (Ustawienia → „Cele”)
   -------------------------------------------------------------------------- */
function rysujProfil() {
  const p = dane.profil;
  el('profil-wiek').value = p.wiek;
  el('profil-wzrost').value = p.wzrost;
  el('profil-nadwyzka').value = p.nadwyzka;
  el('profil-bialko').value = formatujKg(p.bialkoNaKg);

  const kg = wagaNaDzien(dzisiajISO());
  el('profil-podglad').textContent = kg === null
    ? 'Dodaj wagę, aby zobaczyć wyliczony cel.'
    : `Przy wadze ${formatujKg(kg)} kg: ${celKcal(kg)} kcal i ${celBialko(kg)} g białka dziennie.`;
}

function zapiszProfil() {
  const wiek = naLiczbe(el('profil-wiek').value);
  const wzrost = naLiczbe(el('profil-wzrost').value);
  const nadwyzka = naLiczbe(el('profil-nadwyzka').value);
  const bialko = naLiczbe(el('profil-bialko').value);

  if (isNaN(wiek) || wiek < 12 || wiek > 100)       { powiadom('Wpisz wiek (lata).'); return; }
  if (isNaN(wzrost) || wzrost < 120 || wzrost > 230) { powiadom('Wpisz wzrost w centymetrach.'); return; }
  if (isNaN(nadwyzka) || nadwyzka < 0 || nadwyzka > 1500) { powiadom('Wpisz nadwyżkę kalorii (0–1500).'); return; }
  if (isNaN(bialko) || bialko < 1 || bialko > 4)    { powiadom('Białko wpisz w gramach na kg (np. 2).'); return; }

  dane.profil.wiek = Math.round(wiek);
  dane.profil.wzrost = Math.round(wzrost);
  dane.profil.nadwyzka = Math.round(nadwyzka);
  dane.profil.bialkoNaKg = bialko;
  zapiszDane();

  rysujProfil();
  powiadom('Zapisane. Cel na dziś przeliczony.');
}

/* --------------------------------------------------------------------------
   Podpięcie przycisków (wołane raz, przy starcie aplikacji)
   -------------------------------------------------------------------------- */
function podepnijJedzenie() {
  document.querySelectorAll('#przelacznik-sekcji button').forEach(b =>
    b.addEventListener('click', () => pokazSekcjeWagi(b.dataset.sekcja)));

  document.querySelectorAll('#przelacznik-trybu button').forEach(b =>
    b.addEventListener('click', () => zmienTryb(b.dataset.tryb)));

  el('btn-dodaj-posilek').addEventListener('click', dodajPosilek);
  el('btn-zapisz-preset').addEventListener('click', zapiszPreset);
  el('posilek-bialko').addEventListener('keydown', z => {
    if (z.key === 'Enter') dodajPosilek();
  });

  el('btn-zapisz-profil').addEventListener('click', zapiszProfil);
}
