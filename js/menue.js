// Menü von Bravo Stars: Kämpfer wählen, Modus wählen, Pokale, Ergebnisbildschirm.
(function () {
  var K_POKALE = 'bravostars.pokale', K_WAHL = 'bravostars.wahl', K_MODUS = 'bravostars.modus', K_SIEGE = 'bravostars.siege';
  var pokale = {};
  try { pokale = JSON.parse(Pixel.get(K_POKALE, '{}')) || {}; } catch (e) { pokale = {}; }
  var siege = +Pixel.get(K_SIEGE, '0') || 0;
  var wahl = Pixel.get(K_WAHL, 'matteo'), modus = Pixel.get(K_MODUS, 'sterne');
  if (!BS.KAEMPFER.some(function (k) { return k.id === wahl; })) wahl = 'matteo';
  if (!BS.MODI.some(function (m) { return m.id === modus; })) modus = 'sterne';

  var menue = document.getElementById('menue'), ergebnis = document.getElementById('ergebnis');
  var liste = document.getElementById('kaempfer'), info = document.getElementById('info'), modi = document.getElementById('modi');
  var gesamtEl = document.getElementById('gesamt'), tonKnopf = document.getElementById('ton');

  function gesamt() { var s = 0; for (var k in pokale) s += pokale[k] || 0; return s; }
  function speichern() { Pixel.set(K_POKALE, JSON.stringify(pokale)); Pixel.set(K_SIEGE, siege); }
  // Rangliste der Spielesammlung: Punkte = alle Pokale, Progress = wie viele Kämpfer schon 100 Pokale haben (anteilig)
  window.SLRangAdapter = function () {
    var p = 0; BS.KAEMPFER.forEach(function (k) { p += Math.min(100, pokale[k.id] || 0); });
    return { punkte: gesamt(), progress: p / BS.KAEMPFER.length };
  };

  function spriteCanvas(def, mood) {
    var img = def.sprite(mood || 'normal'), c = document.createElement('canvas');
    c.width = img.width; c.height = img.height; c.className = 'px';
    c.getContext('2d').drawImage(img, 0, 0);
    return c;
  }

  function aufbauen() {
    gesamtEl.textContent = '🏆 ' + gesamt();
    liste.innerHTML = '';
    BS.KAEMPFER.forEach(function (def, i) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'karte' + (def.id === wahl ? ' an' : '');
      b.style.setProperty('--farbe', def.farbe); b.style.setProperty('--d', (i * 0.03) + 's');
      b.setAttribute('aria-pressed', def.id === wahl ? 'true' : 'false');
      var bild = document.createElement('div'); bild.className = 'bild'; bild.appendChild(spriteCanvas(def));
      b.appendChild(bild);
      var n = document.createElement('div'); n.className = 'name'; n.textContent = def.name; b.appendChild(n);
      var p = document.createElement('div'); p.className = 'pok'; p.textContent = '🏆 ' + (pokale[def.id] || 0); b.appendChild(p);
      b.addEventListener('click', function () { wahl = def.id; Pixel.set(K_WAHL, wahl); Pixel.sfx.tone(700, 0.05, 'square', 0.04); aufbauen(); });
      liste.appendChild(b);
    });
    var d = BS.kaempfer(wahl);
    info.innerHTML = '';
    info.style.setProperty('--farbe', d.farbe);
    var gross = document.createElement('div'); gross.className = 'gross'; gross.appendChild(spriteCanvas(d, 'super')); info.appendChild(gross);
    var t = document.createElement('div'); t.className = 'text';
    t.innerHTML = '<h2></h2><p class="titel"></p><div class="werte"></div><p class="ab"><b>Angriff:</b> <span class="a"></span></p><p class="ab"><b>Super:</b> <span class="s"></span></p>';
    t.querySelector('h2').textContent = d.name;
    t.querySelector('.titel').textContent = d.titel + ' · ' + d.rolle;
    t.querySelector('.a').textContent = d.angriffText;
    t.querySelector('.s').textContent = d.superText;
    var w = t.querySelector('.werte');
    [['Leben', d.hp, 200], ['Tempo', d.tempo - 120, 130], ['Reichweite', d.angriff.reichweite, 10]].forEach(function (x) {
      var z = document.createElement('div'); z.className = 'wert';
      z.innerHTML = '<span></span><i><b style="width:' + Math.round(Math.min(1, x[1] / x[2]) * 100) + '%"></b></i>';
      z.querySelector('span').textContent = x[0];
      w.appendChild(z);
    });
    info.appendChild(t);

    modi.innerHTML = '';
    BS.MODI.forEach(function (m) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'modus' + (m.id === modus ? ' an' : '');
      b.setAttribute('aria-pressed', m.id === modus ? 'true' : 'false');
      b.innerHTML = '<span class="mi"></span><span class="mt"><b></b><small></small></span>';
      b.querySelector('.mi').textContent = m.icon; b.querySelector('b').textContent = m.name; b.querySelector('small').textContent = m.text;
      b.addEventListener('click', function () { modus = m.id; Pixel.set(K_MODUS, modus); Pixel.sfx.tone(600, 0.05, 'square', 0.04); aufbauen(); });
      modi.appendChild(b);
    });
  }

  function los() {
    Pixel.sfx.tone(523, 0.08, 'square', 0.06); Pixel.sfx.tone(784, 0.12, 'square', 0.06, null, 0.08);
    menue.hidden = true; ergebnis.hidden = true;
    var start = function () { BS.starten({ kaempfer: wahl, modus: modus }, zeigeErgebnis); };
    if (document.fonts && document.fonts.load) document.fonts.load('10px "Press Start 2P"').then(start, start); else start();
  }

  var PLATZ_POKALE = [0, 10, 8, 6, 4, 2, 0, -2, -4];
  function zeigeErgebnis(e) {
    var delta = 0, titel = '', unter = '';
    if (modus === 'royale') {
      var pl = e.platz || 8; delta = PLATZ_POKALE[pl] || -4;
      titel = pl === 1 ? 'Letzter auf dem Pausenhof!' : 'Platz ' + pl;
      unter = pl === 1 ? 'Alle anderen liegen im Kreidestaub.' : pl <= 3 ? 'Knapp dran – fast der Letzte.' : 'Rausgeflogen. Nächstes Mal mehr Kisten knacken.';
      if (pl === 1) siege++;
    } else if (e.ergebnis === 'sieg') { delta = 8; titel = 'Sieg!'; unter = 'Bravo! Das Team hat abgeräumt.'; siege++; }
    else if (e.ergebnis === 'niederlage') { delta = -4; titel = 'Niederlage'; unter = 'Die anderen waren diesmal besser.'; }
    else { delta = 0; titel = 'Unentschieden'; unter = 'Gleichstand – keiner bekommt was.'; }
    var vorher = pokale[wahl] || 0;
    pokale[wahl] = Math.max(0, vorher + delta);
    delta = pokale[wahl] - vorher;   // bei 0 Pokalen kann man nichts verlieren
    speichern();
    var d = BS.kaempfer(wahl);
    ergebnis.innerHTML = '';
    ergebnis.className = 'ergebnis ' + (delta > 0 ? 'gut' : delta < 0 ? 'schlecht' : '');
    var box = document.createElement('div'); box.className = 'ebox';
    var h = document.createElement('h2'); h.textContent = titel; box.appendChild(h);
    var bild = document.createElement('div'); bild.className = 'gross'; bild.appendChild(spriteCanvas(d, delta >= 0 ? 'super' : 'tot')); box.appendChild(bild);
    var p = document.createElement('p'); p.textContent = unter; box.appendChild(p);
    var s = document.createElement('p'); s.className = 'stat';
    s.textContent = 'K.o.s: ' + e.kos + (modus === 'sterne' ? ' · Team-Sterne: ' + e.sterne : '');
    box.appendChild(s);
    var pk = document.createElement('p'); pk.className = 'pokdelta';
    pk.textContent = '🏆 ' + d.name + ': ' + vorher + ' → ' + pokale[wahl] + ' (' + (delta > 0 ? '+' : '') + delta + ')';
    box.appendChild(pk);
    var k = document.createElement('div'); k.className = 'knoepfe';
    var nochmal = document.createElement('button'); nochmal.type = 'button'; nochmal.className = 'knopf gelb'; nochmal.textContent = 'Nochmal';
    var zur = document.createElement('button'); zur.type = 'button'; zur.className = 'knopf'; zur.textContent = 'Zum Menü';
    nochmal.addEventListener('click', los);
    zur.addEventListener('click', function () { ergebnis.hidden = true; menue.hidden = false; aufbauen(); });
    k.appendChild(nochmal); k.appendChild(zur); box.appendChild(k);
    ergebnis.appendChild(box);
    ergebnis.hidden = false;
    nochmal.focus();
  }

  function tonText() { tonKnopf.textContent = Pixel.isMuted() ? '🔇' : '🔊'; }
  tonKnopf.addEventListener('click', function () { Pixel.setMuted(!Pixel.isMuted()); tonText(); });
  tonText();
  document.getElementById('los').addEventListener('click', los);
  aufbauen();
  menue.hidden = false;
})();
