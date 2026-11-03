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
  var onlineEl = document.getElementById('online'), losKnopf = document.getElementById('los');
  var online = null;          // Lobby-Stand vom Server: { code, host, modus, spieler: [{id, name, kaempfer}] }
  var onlineStatus = '', warteInit = null, imSpiel = false;
  var meinName = Pixel.get('bravostars.name', '') || Pixel.get('sl_name', '');
  function istHost() { return online && online.host === Netz.ich; }

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
      b.addEventListener('click', function () {
        wahl = def.id; Pixel.set(K_WAHL, wahl); Pixel.sfx.tone(700, 0.05, 'square', 0.04);
        if (online) Netz.senden({ t: 'wahl', kaempfer: wahl });
        aufbauen();
      });
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
      var b = document.createElement('button'); b.type = 'button'; b.className = 'modus' + (m.id === modus ? ' an' : '') + (online && !istHost() ? ' zu' : '');
      b.setAttribute('aria-pressed', m.id === modus ? 'true' : 'false');
      b.innerHTML = '<span class="mi"></span><span class="mt"><b></b><small></small></span>';
      b.querySelector('.mi').textContent = m.icon; b.querySelector('b').textContent = m.name; b.querySelector('small').textContent = m.text;
      b.addEventListener('click', function () {
        if (online && !istHost()) return;
        modus = m.id; Pixel.set(K_MODUS, modus); Pixel.sfx.tone(600, 0.05, 'square', 0.04);
        if (online) Netz.senden({ t: 'modus', modus: modus });
        aufbauen();
      });
      modi.appendChild(b);
    });
    onlineAufbauen();
  }

  // ---------- Online ----------
  function el(tag, klasse, text) { var e = document.createElement(tag); if (klasse) e.className = klasse; if (text !== undefined) e.textContent = text; return e; }
  function onlineAufbauen() {
    onlineEl.innerHTML = '';
    losKnopf.disabled = false;
    if (!online) {
      losKnopf.textContent = 'Kämpfen!';
      var z1 = el('div', 'zeile');
      var name = el('input'); name.type = 'text'; name.maxLength = 16; name.placeholder = 'Dein Name'; name.value = meinName; name.setAttribute('aria-label', 'Dein Name');
      name.addEventListener('input', function () { meinName = name.value.trim(); Pixel.set('bravostars.name', meinName); });
      var erst = el('button', 'knopf gelb', 'Raum erstellen'); erst.type = 'button';
      erst.addEventListener('click', function () { verbinden({ t: 'erstellen', modus: modus }); });
      z1.appendChild(name); z1.appendChild(erst);
      var z2 = el('div', 'zeile');
      var code = el('input', 'code'); code.type = 'text'; code.maxLength = 4; code.placeholder = 'CODE'; code.setAttribute('aria-label', 'Raum-Code');
      code.autocapitalize = 'characters'; code.autocomplete = 'off';
      var bei = el('button', 'knopf', 'Beitreten'); bei.type = 'button';
      var beitreten = function () { if (code.value.trim().length === 4) verbinden({ t: 'beitreten', code: code.value.trim().toUpperCase() }); else { onlineStatus = 'Der Code hat 4 Buchstaben.'; onlineAufbauen(); } };
      bei.addEventListener('click', beitreten);
      code.addEventListener('keydown', function (e) { if (e.key === 'Enter') beitreten(); });
      z2.appendChild(code); z2.appendChild(bei);
      onlineEl.appendChild(z1); onlineEl.appendChild(z2);
      onlineEl.appendChild(el('p', 'status', onlineStatus || 'Erstell einen Raum und gib den Code an deine Freunde – freie Plätze übernehmen Bots.'));
      return;
    }
    var kopf = el('div', 'zeile');
    kopf.appendChild(el('span', '', 'Raum')); kopf.appendChild(el('span', 'raumcode', online.code));
    var raus = el('button', 'knopf rot', 'Verlassen'); raus.type = 'button'; raus.style.marginLeft = 'auto';
    raus.addEventListener('click', function () { Netz.senden({ t: 'verlassen' }); online = null; onlineStatus = ''; aufbauen(); });
    kopf.appendChild(raus);
    onlineEl.appendChild(kopf);
    var teamModus = modus !== 'royale';
    var ul = el('ul');
    online.spieler.forEach(function (sp, i) {
      var li = el('li', sp.id === Netz.ich ? 'ich' : '');
      var d = BS.kaempfer(sp.kaempfer), img = d.sprite('normal'), c = document.createElement('canvas');
      c.width = img.width; c.height = img.height; c.className = 'px'; c.getContext('2d').drawImage(img, 0, 0);
      li.appendChild(c);
      li.appendChild(el('span', '', (sp.id === online.host ? '👑 ' : '') + sp.name + (sp.id === Netz.ich ? ' (du)' : '')));
      li.appendChild(el('span', '', '· ' + d.name));
      if (teamModus) li.appendChild(el('span', 'tm t' + (i % 2), i % 2 ? 'Rot' : 'Blau'));
      ul.appendChild(li);
    });
    onlineEl.appendChild(ul);
    var n = online.spieler.length, plaetze = teamModus ? 6 : 8;
    onlineEl.appendChild(el('p', 'tipp', 'Gib deinen Freunden den Code ' + online.code + '. ' + n + ' von ' + plaetze + ' Plätzen belegt, den Rest füllen Bots.'));
    if (onlineStatus) onlineEl.appendChild(el('p', 'status', onlineStatus));
    if (istHost()) { losKnopf.textContent = 'Online starten!'; losKnopf.disabled = teamModus && n > 6; }
    else { losKnopf.textContent = online.laeuft ? 'Runde läuft gerade …' : 'Warte auf den Host …'; losKnopf.disabled = true; }
  }
  function verbinden(nachricht) {
    if (!meinName || meinName.length < 2) { onlineStatus = 'Gib zuerst deinen Namen ein (mind. 2 Zeichen).'; onlineAufbauen(); return; }
    onlineStatus = 'Verbinde … (der Server kann kurz zum Aufwachen brauchen)'; onlineAufbauen();
    nachricht.name = meinName; nachricht.kaempfer = wahl;
    Netz.verbinden().then(function () { onlineStatus = ''; Netz.senden(nachricht); },
      function () { onlineStatus = 'Keine Verbindung zum Server. Nochmal versuchen?'; onlineAufbauen(); });
  }
  function onlineStarten(o) {
    var ich = o.spieler.filter(function (sp) { return sp.id === Netz.ich; })[0];
    if (!ich) return;
    modus = o.modus; wahl = BS.kaempfer(ich.kaempfer).id;
    menue.hidden = true; ergebnis.hidden = true; imSpiel = true;
    var netz = o.host === Netz.ich ? { rolle: 'host', ich: Netz.ich, spieler: o.spieler, senden: Netz.senden }
      : { rolle: 'gast', ich: Netz.ich, init: o.init, senden: Netz.senden };
    BS.starten({ kaempfer: wahl, modus: modus, netz: netz }, zeigeErgebnis);
  }
  Netz.bei(function (o) {
    if (o.t === 'lobby') {
      online = o;
      if (!istHost()) modus = o.modus;
      if (!imSpiel && ergebnis.hidden) aufbauen(); else if (!imSpiel) onlineAufbauen();
    } else if (o.t === 'fehler') { onlineStatus = o.text; if (!imSpiel) onlineAufbauen(); }
    else if (o.t === 'start') {
      if (o.host === Netz.ich) onlineStarten(o);
      else { warteInit = o; menue.hidden = true; ergebnis.hidden = true; }
    } else if (o.t === 'daten' && o.d && o.d.t === 'init' && warteInit) {
      warteInit.init = o.d; var w = warteInit; warteInit = null; onlineStarten(w);
    } else if (o.t === 'host_weg' || o.t === 'getrennt') {
      online = null; warteInit = null;
      onlineStatus = o.t === 'host_weg' ? 'Der Host hat den Raum verlassen.' : 'Die Verbindung zum Server ist weg.';
      if (!imSpiel) { ergebnis.hidden = true; menue.hidden = false; aufbauen(); }
    }
  });

  function los() {
    if (online) { if (istHost()) Netz.senden({ t: 'start' }); return; }
    Pixel.sfx.tone(523, 0.08, 'square', 0.06); Pixel.sfx.tone(784, 0.12, 'square', 0.06, null, 0.08);
    menue.hidden = true; ergebnis.hidden = true;
    var start = function () { BS.starten({ kaempfer: wahl, modus: modus }, zeigeErgebnis); };
    if (document.fonts && document.fonts.load) document.fonts.load('10px "Press Start 2P"').then(start, start); else start();
  }

  var PLATZ_POKALE = [0, 10, 8, 6, 4, 2, 0, -2, -4];
  function zeigeErgebnis(e) {
    imSpiel = false;
    var delta = 0, titel = '', unter = '';
    if (e.ergebnis === 'abbruch') {
      titel = 'Runde abgebrochen'; unter = e.text || 'Die Runde wurde beendet – keine Pokale.';
    } else if (modus === 'royale') {
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
    if (e.ergebnis !== 'abbruch') box.appendChild(pk);
    var k = document.createElement('div'); k.className = 'knoepfe';
    var nochmal = document.createElement('button'); nochmal.type = 'button'; nochmal.className = 'knopf gelb'; nochmal.textContent = online ? 'Nochmal (alle)' : 'Nochmal';
    var zur = document.createElement('button'); zur.type = 'button'; zur.className = 'knopf'; zur.textContent = online ? 'Zur Lobby' : 'Zum Menü';
    if (online && !istHost()) nochmal.hidden = true;
    nochmal.addEventListener('click', los);
    zur.addEventListener('click', function () { ergebnis.hidden = true; menue.hidden = false; aufbauen(); });
    k.appendChild(nochmal); k.appendChild(zur); box.appendChild(k);
    if (online && !istHost()) box.appendChild(el('p', 'stat', 'Wenn der Host nochmal startet, geht es automatisch los.'));
    ergebnis.appendChild(box);
    ergebnis.hidden = false;
    (nochmal.hidden ? zur : nochmal).focus();
  }

  function tonText() { tonKnopf.textContent = Pixel.isMuted() ? '🔇' : '🔊'; }
  tonKnopf.addEventListener('click', function () { Pixel.setMuted(!Pixel.isMuted()); tonText(); });
  tonText();
  document.getElementById('los').addEventListener('click', los);
  aufbauen();
  menue.hidden = false;
})();
