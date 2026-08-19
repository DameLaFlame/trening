/* ==========================================================================
   okna.js — własne okienka: pytanie „na pewno?” i zwykły komunikat
   --------------------------------------------------------------------------
   Nie używamy systemowych confirm() i alert(), bo część przeglądarek
   (m.in. podgląd na Macu i aplikacja dodana do ekranu początkowego iPhone'a)
   po prostu ich nie pokazuje — wtedy przyciski wyglądają jak zepsute.
   ========================================================================== */

/* Co ma się wykonać po kliknięciu „tak” — ustawiane przy każdym pytaniu. */
let akcjaPoPotwierdzeniu = null;

/* --------------------------------------------------------------------------
   Pytanie z dwoma przyciskami
   zapytaj('Usunąć trening?', 'Usuń', () => { ...co zrobić... })
   -------------------------------------------------------------------------- */
function zapytaj(tekst, etykietaTak, akcja, czerwony = true) {
  el('tresc-pytania').textContent = tekst;

  const btnTak = el('btn-potwierdz');
  btnTak.textContent = etykietaTak;
  btnTak.className = 'przycisk' + (czerwony ? ' czerwony' : '');

  el('btn-odrzuc').textContent = 'Anuluj';
  akcjaPoPotwierdzeniu = akcja;
  el('okno-pytania').hidden = false;
}

/* --------------------------------------------------------------------------
   Zwykły komunikat — jeden przycisk „OK”
   -------------------------------------------------------------------------- */
function powiadom(tekst) {
  el('tresc-pytania').textContent = tekst;

  const btnTak = el('btn-potwierdz');
  btnTak.textContent = 'OK';
  btnTak.className = 'przycisk';

  el('btn-odrzuc').textContent = '';
  akcjaPoPotwierdzeniu = null;
  el('okno-pytania').hidden = false;

  // przy komunikacie drugi przycisk jest niepotrzebny
  el('btn-odrzuc').hidden = true;
}

function zamknijPytanie() {
  el('okno-pytania').hidden = true;
  el('btn-odrzuc').hidden = false;
  akcjaPoPotwierdzeniu = null;
}

/* --------------------------------------------------------------------------
   Toast — zielone okienko, które samo znika po chwili
   --------------------------------------------------------------------------
   Do drobnych potwierdzeń („Dodano posiłek”), gdzie modalne okno „OK” byłoby
   uciążliwe. Nie blokuje ekranu i gaśnie samo po ~1,8 s.
   -------------------------------------------------------------------------- */
let czasomierzToastu = null;

function toast(tekst) {
  let box = el('toast');
  if (!box) {
    box = document.createElement('div');
    box.id = 'toast';
    box.className = 'toast';
    document.body.appendChild(box);
  }
  box.textContent = tekst;

  // restart animacji, gdy toasty lecą jeden po drugim
  box.classList.remove('widoczny');
  void box.offsetWidth;              // wymusza przeliczenie, żeby animacja ruszyła od nowa
  box.classList.add('widoczny');

  clearTimeout(czasomierzToastu);
  czasomierzToastu = setTimeout(() => box.classList.remove('widoczny'), 1800);
}

/* Podpięcie przycisków — wołane raz, przy starcie aplikacji. */
function podepnijOkna() {
  el('btn-potwierdz').addEventListener('click', () => {
    const akcja = akcjaPoPotwierdzeniu;
    zamknijPytanie();
    if (akcja) akcja();
  });

  el('btn-odrzuc').addEventListener('click', zamknijPytanie);

  // kliknięcie w ciemne tło = rezygnacja
  el('okno-pytania').addEventListener('click', zdarzenie => {
    if (zdarzenie.target === el('okno-pytania')) zamknijPytanie();
  });
}
