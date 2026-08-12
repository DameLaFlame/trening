/* ==========================================================================
   wykres.js — rysowanie wykresu liniowego
   --------------------------------------------------------------------------
   Używa go ekran „Waga ciała” (waga w czasie) i „Progres” (ciężar w czasie).
   Wykres to zwykły SVG budowany tutaj, bez żadnej dodatkowej biblioteki —
   dzięki temu aplikacja działa offline i startuje od razu.

   punkty  – lista od najstarszego: { data: '2026-08-06', wartosc: 82.4,
                                      krotka: '6.08' }
   formatuj – jak podpisać liczby na osi pionowej
   ========================================================================== */

function rysunekWykresu(punkty, formatuj = formatujKg) {
  // rozmiar „papieru” — SVG i tak rozciąga się na szerokość karty
  const szer = 320, wys = 190;
  const lewy = 40, prawy = 8, gorny = 12, dolny = 28;
  const pole = { szer: szer - lewy - prawy, wys: wys - gorny - dolny };

  // --- zakres wartości (oś pionowa) ---
  const wartosci = punkty.map(p => p.wartosc);
  let min = Math.min(...wartosci);
  let max = Math.max(...wartosci);
  if (min === max) { min -= 1; max += 1; }   // płaska linia też musi być widoczna
  const zapas = (max - min) * 0.12;
  min -= zapas;
  max += zapas;

  // --- zakres czasu (oś pozioma) ---
  const czasy = punkty.map(p => new Date(p.data + 'T12:00:00').getTime());
  const czasOd = czasy[0];
  const czasDo = czasy[czasy.length - 1];
  const rozpietosc = czasDo - czasOd;

  const naX = (czas, numer) => rozpietosc > 0
    ? lewy + (czas - czasOd) / rozpietosc * pole.szer
    : lewy + (numer / Math.max(punkty.length - 1, 1)) * pole.szer;

  const naY = wartosc => gorny + (max - wartosc) / (max - min) * pole.wys;

  const wspolrzedne = punkty.map((p, i) => ({ x: naX(czasy[i], i), y: naY(p.wartosc) }));

  // --- siatka i opisy osi pionowej ---
  let siatka = '';
  for (let i = 0; i <= 2; i++) {
    const wartosc = max - (max - min) * (i / 2);
    const y = naY(wartosc);
    siatka += `<line class="siatka" x1="${lewy}" y1="${y.toFixed(1)}" ` +
              `x2="${szer - prawy}" y2="${y.toFixed(1)}" />`;
    siatka += `<text class="opis-osi opis-y" x="${lewy - 6}" y="${(y + 4).toFixed(1)}">` +
              `${formatuj(Math.round(wartosc * 10) / 10)}</text>`;
  }

  // --- linia i kropki ---
  const linia = wspolrzedne.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  // przy dużej liczbie punktów kropki zlewają się w plamę — wtedy sama linia
  const kropki = wspolrzedne.length <= 30
    ? wspolrzedne.map(p => `<circle class="punkt-wagi" cx="${p.x.toFixed(1)}" ` +
                           `cy="${p.y.toFixed(1)}" r="3.5" />`).join('')
    : '';

  return `
    <svg class="wykres" viewBox="0 0 ${szer} ${wys}" role="img" aria-label="Wykres">
      ${siatka}
      <polyline class="linia-wagi" points="${linia}" />
      ${kropki}
      <text class="opis-osi" x="${lewy}" y="${wys - 8}">${punkty[0].krotka}</text>
      <text class="opis-osi opis-koniec" x="${szer - prawy}" y="${wys - 8}">${punkty[punkty.length - 1].krotka}</text>
    </svg>`;
}
