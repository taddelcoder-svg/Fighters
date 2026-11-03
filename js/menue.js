// Menü von Bravo Stars: Tabs (Spielen, Kämpfer, Shop, Aufgaben, Pokal-Weg), Online-Lobby, Truhen und Ergebnis.
(function () {
  // ---------- Spielstand (localStorage bravostars.*) ----------
  var K_POKALE = 'bravostars.pokale', K_WAHL = 'bravostars.wahl', K_MODUS = 'bravostars.modus', K_SIEGE = 'bravostars.siege';
  var K_MUENZEN = 'bravostars.muenzen', K_STUFEN = 'bravostars.stufen', K_TAG = 'bravostars.tagessieg', K_KONTO = 'bravostars.konto';
  function lesen(k, d) { try { var v = JSON.parse(Pixel.get(k, '')); return v && typeof v === 'object' ? v : d; } catch (e) { return d; } }
  var pokale = lesen(K_POKALE, {}), stufen = lesen(K_STUFEN, {});
  var siege = +Pixel.get(K_SIEGE, '0') || 0, muenzen = +Pixel.get(K_MUENZEN, '0') || 0;
  var konto = lesen(K_KONTO, {});
  // Teile des Kontos, die es vorher noch nicht gab
  konto.skins = konto.skins || {};          // { kaempfer: [skinIds] }
  konto.angelegt = konto.angelegt || {};    // { kaempfer: skinId }
  konto.teile = konto.teile || [];          // eigene Ausrüstung
  konto.teileAn = konto.teileAn || {};      // { kaempfer: [teilIds] }
  konto.emotes = konto.emotes || BS.EMOTES.filter(function (e) { return e.start; }).map(function (e) { return e.id; });
  konto.truhen = konto.truhen || { tasche: 1, rucksack: 0, koffer: 0 };
  konto.weg = konto.weg || [];
  konto.aufgaben = konto.aufgaben || {};
  konto.shop = konto.shop || {};
  konto.rang = konto.rang || 0; konto.rangHoch = konto.rangHoch || 0;
  // Alte Pokale vom Doppel-Kämpfer gehen an Damon und Moritz
  if (pokale.doppeldate) { pokale.damon = (pokale.damon || 0) + pokale.doppeldate; pokale.moritz = (pokale.moritz || 0) + pokale.doppeldate; delete pokale.doppeldate; }

  var wahl = Pixel.get(K_WAHL, 'matteo'), modus = Pixel.get(K_MODUS, 'sterne'), rangspiel = Pixel.get('bravostars.rangspiel', '0') === '1';
  var schwierigkeit = Pixel.get('bravostars.schwierigkeit', 'normal');
  if (['leicht', 'normal', 'schwer'].indexOf(schwierigkeit) < 0) schwierigkeit = 'normal';
  if (!BS.KAEMPFER.some(function (k) { return k.id === wahl; })) wahl = 'matteo';
  if (!BS.MODI.some(function (m) { return m.id === modus; })) modus = 'sterne';
  var tab = 'spielen';

  function speichern() {
    Pixel.set(K_POKALE, JSON.stringify(pokale)); Pixel.set(K_SIEGE, siege); Pixel.set(K_MUENZEN, muenzen);
    Pixel.set(K_STUFEN, JSON.stringify(stufen)); Pixel.set(K_KONTO, JSON.stringify(konto));
  }
  function gesamt() { var s = 0; for (var k in pokale) s += pokale[k] || 0; return s; }
  function stufe(id) { return Math.max(1, Math.min(BS.MAX_STUFE, stufen[id] || 1)); }
  function hatSkin(kid, sid) { return (konto.skins[kid] || []).indexOf(sid) >= 0; }
  function skinVon(kid) { var s = konto.angelegt[kid]; return s && hatSkin(kid, s) ? s : ''; }
  function teileVon(kid) { return stufe(kid) >= BS.AUSRUESTUNG_AB ? (konto.teileAn[kid] || []).filter(function (t) { return konto.teile.indexOf(t) >= 0; }).slice(0, 2) : []; }
  function rangModusOk(m) { var x = BS.MODI.filter(function (y) { return y.id === m; })[0]; return x && x.team && !x.training; }
  speichern();

  // Rangliste der Spielesammlung: Punkte = alle Pokale, Progress = wie viele Kämpfer schon 100 Pokale haben (anteilig)
  window.SLRangAdapter = function () {
    var p = 0; BS.KAEMPFER.forEach(function (k) { p += Math.min(100, pokale[k.id] || 0); });
    return { punkte: gesamt(), progress: p / BS.KAEMPFER.length };
  };

  // ---------- DOM-Helfer ----------
  var menue = document.getElementById('menue'), ergebnis = document.getElementById('ergebnis'), seite = document.getElementById('seite');
  var tabsEl = document.getElementById('tabs'), gesamtEl = document.getElementById('gesamt'), tonKnopf = document.getElementById('ton');
  var truheEl = document.getElementById('truhe');
  function el(tag, klasse, text) { var e = document.createElement(tag); if (klasse) e.className = klasse; if (text !== undefined) e.textContent = text; return e; }
  function knopf(text, klasse, fn) { var b = el('button', 'knopf ' + (klasse || ''), text); b.type = 'button'; if (fn) b.addEventListener('click', fn); return b; }
  function bild(def, mood, skinId) {
    var img = def.sprite(mood || 'normal'), s = BS.skin(def.id, skinId);
    if (s) img = BS.umfaerben(img, s);
    var c = document.createElement('canvas'); c.width = img.width; c.height = img.height; c.className = 'px';
    c.getContext('2d').drawImage(img, 0, 0);
    return c;
  }
  function klick() { Pixel.sfx.tone(700, 0.05, 'square', 0.04); }
  function kasse() { Pixel.sfx.tone(880, 0.06, 'square', 0.05); Pixel.sfx.tone(1320, 0.1, 'square', 0.05, null, 0.06); }

  // ---------- Kopf ----------
  function kopfAufbauen() {
    var r = BS.rang(konto.rang);
    gesamtEl.innerHTML = '';
    gesamtEl.appendChild(el('span', '', '🏆 ' + gesamt()));
    gesamtEl.appendChild(el('span', '', '🪙 ' + muenzen));
    var rs = el('span', 'rangchip', '◆ ' + r.name); rs.style.color = r.farbe; gesamtEl.appendChild(rs);
    tabsEl.innerHTML = '';
    var offen = offeneSachen();
    [['spielen', '▶ Spielen'], ['kaempfer', '👤 Kämpfer'], ['shop', '🛒 Shop'], ['aufgaben', '✔ Aufgaben'], ['weg', '🏆 Pokal-Weg']].forEach(function (t) {
      var b = el('button', 'tab' + (tab === t[0] ? ' an' : ''), t[1]); b.type = 'button';
      if (offen[t[0]]) b.appendChild(el('i', 'punkt', String(offen[t[0]])));
      b.addEventListener('click', function () { tab = t[0]; klick(); aufbauen(); seite.scrollIntoView({ block: 'start' }); });
      tabsEl.appendChild(b);
    });
  }
  // Rote Punkte an den Tabs: was kann man abholen?
  function offeneSachen() {
    var o = {};
    var weg = BS.WEG.filter(function (w, i) { return gesamt() >= w.pokale && konto.weg.indexOf(i) < 0; }).length; if (weg) o.weg = weg;
    var auf = aufgabenHeute().filter(function (a) { return fortschritt(a) >= a.ziel && konto.aufgaben.abgeholt.indexOf(a.id) < 0; }).length; if (auf) o.aufgaben = auf;
    var tr = konto.truhen.tasche + konto.truhen.rucksack + konto.truhen.koffer + (shopHeute().gratisOffen ? 1 : 0); if (tr) o.shop = tr;
    return o;
  }

  function aufbauen() {
    kopfAufbauen();
    seite.innerHTML = '';
    ({ spielen: seiteSpielen, kaempfer: seiteKaempfer, shop: seiteShop, aufgaben: seiteAufgaben, weg: seiteWeg })[tab]();
  }

  // ---------- Tab: Spielen ----------
  var online = null, onlineStatus = '', warteInit = null, imSpiel = false;
  var meinName = Pixel.get('bravostars.name', '') || Pixel.get('sl_name', '');
  function istHost() { return online && online.host === Netz.ich; }

  function seiteSpielen() {
    var d = BS.kaempfer(wahl);
    var mini = el('div', 'mini'); mini.style.setProperty('--farbe', d.farbe);
    mini.appendChild(bild(d, 'super', skinVon(wahl)));
    var mt = el('div', 'mt');
    mt.appendChild(el('b', '', d.name));
    mt.appendChild(el('span', '', 'Stufe ' + stufe(wahl) + ' · 🏆 ' + (pokale[wahl] || 0) + (skinVon(wahl) ? ' · ' + BS.skin(wahl, skinVon(wahl)).name : '')));
    mini.appendChild(mt);
    mini.appendChild(knopf('Wechseln', '', function () { tab = 'kaempfer'; aufbauen(); }));
    seite.appendChild(mini);

    seite.appendChild(el('h3', '', 'Modus'));
    var modi = el('div', 'modi');
    var gesperrt = online && !istHost();
    BS.MODI.forEach(function (m) {
      if (online && m.training) return;
      var b = el('button', 'modus' + (m.id === modus ? ' an' : '') + (gesperrt ? ' zu' : '')); b.type = 'button';
      b.setAttribute('aria-pressed', m.id === modus ? 'true' : 'false');
      b.appendChild(el('span', 'mi', m.icon));
      var t = el('span', 'mt'); t.appendChild(el('b', '', m.name));
      t.appendChild(el('small', '', m.text));
      t.appendChild(el('em', 'karte', '🗺 Heute: ' + BS.KARTEN_NAMEN[BS.karteHeute(m.id)]));
      b.appendChild(t);
      b.addEventListener('click', function () {
        if (gesperrt) return;
        modus = m.id; Pixel.set(K_MODUS, modus); klick();
        if (online) Netz.senden({ t: 'modus', modus: modus });
        aufbauen();
      });
      modi.appendChild(b);
    });
    seite.appendChild(modi);

    // Bot-Stärke
    if (!online || istHost()) {
      var sb = el('div', 'staerke');
      sb.appendChild(el('b', '', '🤖 Bots:'));
      [['leicht', 'Leicht'], ['normal', 'Normal'], ['schwer', 'Schwer']].forEach(function (x) {
        var b = knopf(x[1], schwierigkeit === x[0] ? 'gelb' : '', function () { schwierigkeit = x[0]; Pixel.set('bravostars.schwierigkeit', schwierigkeit); klick(); aufbauen(); });
        b.setAttribute('aria-pressed', schwierigkeit === x[0] ? 'true' : 'false');
        sb.appendChild(b);
      });
      if (rangspiel && rangModusOk(modus) && !online) sb.appendChild(el('small', '', 'Im Rangspiel sind die Bots immer stark.'));
      seite.appendChild(sb);
    }

    // Rangspiel
    if (!online) {
      var r = BS.rang(konto.rang);
      var rb = el('div', 'rangbox' + (rangspiel ? ' an' : ''));
      var schalter = el('button', 'schalter' + (rangspiel ? ' an' : ''), rangspiel ? 'AN' : 'AUS'); schalter.type = 'button';
      schalter.setAttribute('aria-pressed', rangspiel ? 'true' : 'false');
      schalter.addEventListener('click', function () { rangspiel = !rangspiel; Pixel.set('bravostars.rangspiel', rangspiel ? '1' : '0'); klick(); aufbauen(); });
      var rt = el('div', 'rt');
      rt.appendChild(el('b', '', '◆ Rangspiel'));
      var rn = el('span', 'rangname', r.name + ' · ' + konto.rang + ' Punkte'); rn.style.color = r.farbe; rt.appendChild(rn);
      rt.appendChild(el('small', '', rangModusOk(modus) ? 'Stärkere Bots. Sieg +20, Niederlage −12 Rangpunkte. Jeder neue Rang bringt Münzen.' : 'Nur in Team-Modi (3 gegen 3) – wähl oben einen davon.'));
      rb.appendChild(schalter); rb.appendChild(rt);
      seite.appendChild(rb);
    }

    seite.appendChild(el('h3', '', 'Online mit Freunden'));
    var onl = el('div', 'online'); seite.appendChild(onl);
    onlineAufbauen(onl);
    var los = knopf('Kämpfen!', 'gelb gross-knopf', starten); los.id = 'los';
    if (online) {
      if (istHost()) { los.textContent = 'Online starten!'; los.disabled = BS.MODI.filter(function (m) { return m.id === modus; })[0].team && online.spieler.length > 6; }
      else { los.textContent = online.laeuft ? 'Runde läuft gerade …' : 'Warte auf den Host …'; los.disabled = true; }
    } else if (rangspiel && rangModusOk(modus)) los.textContent = 'Rangspiel starten!';
    seite.appendChild(los);
    seite.appendChild(el('p', 'hilfe', 'PC: WASD laufen · Maus zielen · Klick angreifen · Leertaste/Rechtsklick Super · Q Trick · R Ultra · 1–9 Emotes · Esc aufgeben'));
    seite.appendChild(el('p', 'hilfe', 'Handy/Tablet: links ziehen = laufen · rechts ziehen = zielen, loslassen = schießen (tippen zielt automatisch) · gelb = Super · grün = Trick · lila = Ultra · 💬 = Emotes'));
  }

  function onlineAufbauen(box) {
    if (!online) {
      var z1 = el('div', 'zeile');
      var name = el('input'); name.type = 'text'; name.maxLength = 16; name.placeholder = 'Dein Name'; name.value = meinName; name.setAttribute('aria-label', 'Dein Name');
      name.addEventListener('input', function () { meinName = name.value.trim(); Pixel.set('bravostars.name', meinName); });
      z1.appendChild(name);
      z1.appendChild(knopf('Raum erstellen', 'gelb', function () { if (BS.MODI.filter(function (m) { return m.id === modus; })[0].training) { modus = 'sterne'; } verbinden({ t: 'erstellen', modus: modus }); }));
      var z2 = el('div', 'zeile');
      var code = el('input', 'code'); code.type = 'text'; code.maxLength = 4; code.placeholder = 'CODE'; code.setAttribute('aria-label', 'Raum-Code');
      code.autocapitalize = 'characters'; code.autocomplete = 'off';
      var beitreten = function () { if (code.value.trim().length === 4) verbinden({ t: 'beitreten', code: code.value.trim().toUpperCase() }); else { onlineStatus = 'Der Code hat 4 Buchstaben.'; aufbauen(); } };
      code.addEventListener('keydown', function (e) { if (e.key === 'Enter') beitreten(); });
      z2.appendChild(code); z2.appendChild(knopf('Beitreten', '', beitreten));
      box.appendChild(z1); box.appendChild(z2);
      box.appendChild(el('p', 'status', onlineStatus || 'Erstell einen Raum und gib den Code an deine Freunde – freie Plätze übernehmen Bots.'));
      return;
    }
    var kopf = el('div', 'zeile');
    kopf.appendChild(el('span', '', 'Raum')); kopf.appendChild(el('span', 'raumcode', online.code));
    var raus = knopf('Verlassen', 'rot', function () { Netz.senden({ t: 'verlassen' }); online = null; onlineStatus = ''; aufbauen(); });
    raus.style.marginLeft = 'auto'; kopf.appendChild(raus);
    box.appendChild(kopf);
    var m = BS.MODI.filter(function (x) { return x.id === modus; })[0] || BS.MODI[0];
    var ul = el('ul');
    online.spieler.forEach(function (sp, i) {
      var li = el('li', sp.id === Netz.ich ? 'ich' : '');
      var d = BS.kaempfer(sp.kaempfer);
      li.appendChild(bild(d, 'normal', sp.skin));
      li.appendChild(el('span', '', (sp.id === online.host ? '👑 ' : '') + sp.name + (sp.id === Netz.ich ? ' (du)' : '')));
      li.appendChild(el('span', '', '· ' + d.name + ' (St. ' + (sp.stufe || 1) + ')'));
      if (m.team) li.appendChild(el('span', 'tm t' + (i % 2), i % 2 ? 'Rot' : 'Blau'));
      else if (m.id === 'duo') li.appendChild(el('span', 'tm t' + (Math.floor(i / 2) % 2), 'Duo ' + (Math.floor(i / 2) + 1)));
      ul.appendChild(li);
    });
    box.appendChild(ul);
    var plaetze = m.team ? 6 : 8;
    box.appendChild(el('p', 'tipp', 'Gib deinen Freunden den Code ' + online.code + '. ' + online.spieler.length + ' von ' + plaetze + ' Plätzen belegt, den Rest füllen Bots.'));
    if (onlineStatus) box.appendChild(el('p', 'status', onlineStatus));
  }
  function meineDaten() { return { kaempfer: wahl, stufe: stufe(wahl), skin: skinVon(wahl), ausruestung: teileVon(wahl) }; }
  function verbinden(nachricht) {
    if (!meinName || meinName.length < 2) { onlineStatus = 'Gib zuerst deinen Namen ein (mind. 2 Zeichen).'; aufbauen(); return; }
    onlineStatus = 'Verbinde … (der Server kann kurz zum Aufwachen brauchen)'; aufbauen();
    nachricht.name = meinName; var md = meineDaten(); for (var k in md) nachricht[k] = md[k];
    Netz.verbinden().then(function () { onlineStatus = ''; Netz.senden(nachricht); },
      function () { onlineStatus = 'Keine Verbindung zum Server. Nochmal versuchen?'; aufbauen(); });
  }
  function wahlMelden() { if (online) { var md = meineDaten(); md.t = 'wahl'; Netz.senden(md); } }
  function onlineStarten(o) {
    var ich = o.spieler.filter(function (sp) { return sp.id === Netz.ich; })[0];
    if (!ich) return;
    modus = o.modus; wahl = BS.kaempfer(ich.kaempfer).id;
    menue.hidden = true; ergebnis.hidden = true; imSpiel = true;
    var netz = o.host === Netz.ich ? { rolle: 'host', ich: Netz.ich, spieler: o.spieler, senden: Netz.senden }
      : { rolle: 'gast', ich: Netz.ich, init: o.init, senden: Netz.senden };
    BS.starten({ kaempfer: wahl, modus: modus, netz: netz, emotes: konto.emotes, karte: o.karte, schwierigkeit: schwierigkeit }, zeigeErgebnis);
  }
  Netz.bei(function (o) {
    if (o.t === 'lobby') {
      online = o;
      if (!istHost()) modus = o.modus;
      if (!imSpiel && ergebnis.hidden) aufbauen();
    } else if (o.t === 'fehler') { onlineStatus = o.text; if (!imSpiel) aufbauen(); }
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

  var laeuftRang = false;
  function starten() {
    if (online) { if (istHost()) Netz.senden({ t: 'start' }); return; }
    Pixel.sfx.tone(523, 0.08, 'square', 0.06); Pixel.sfx.tone(784, 0.12, 'square', 0.06, null, 0.08);
    menue.hidden = true; ergebnis.hidden = true;
    laeuftRang = rangspiel && rangModusOk(modus);
    var opt = { kaempfer: wahl, modus: modus, stufe: stufe(wahl), skin: skinVon(wahl), ausruestung: teileVon(wahl), emotes: konto.emotes, rang: laeuftRang, schwierigkeit: schwierigkeit };
    var start = function () { BS.starten(opt, zeigeErgebnis); };
    if (document.fonts && document.fonts.load) document.fonts.load('10px "Press Start 2P"').then(start, start); else start();
  }

  // ---------- Tab: Kämpfer ----------
  function seiteKaempfer() {
    var liste = el('div', 'kaempfer');
    BS.KAEMPFER.forEach(function (def, i) {
      var b = el('button', 'karte' + (def.id === wahl ? ' an' : '')); b.type = 'button';
      b.style.setProperty('--farbe', def.farbe); b.style.setProperty('--d', (i * 0.03) + 's');
      b.setAttribute('aria-pressed', def.id === wahl ? 'true' : 'false');
      var bi = el('div', 'bild'); bi.appendChild(bild(def, 'normal', skinVon(def.id))); b.appendChild(bi);
      b.appendChild(el('div', 'name', def.name));
      b.appendChild(el('div', 'pok', '🏆 ' + (pokale[def.id] || 0)));
      b.appendChild(el('div', 'stufe', 'St. ' + stufe(def.id)));
      b.addEventListener('click', function () { wahl = def.id; Pixel.set(K_WAHL, wahl); klick(); wahlMelden(); aufbauen(); });
      liste.appendChild(b);
    });
    seite.appendChild(liste);

    var d = BS.kaempfer(wahl), sd = stufe(d.id), f = 1 + (sd - 1) * 0.07;
    var info = el('div', 'info'); info.style.setProperty('--farbe', d.farbe);
    var gr = el('div', 'gross'); gr.appendChild(bild(d, 'super', skinVon(d.id))); info.appendChild(gr);
    var t = el('div', 'text');
    t.appendChild(el('h2', '', d.name));
    t.appendChild(el('p', 'titel', d.titel + ' · ' + d.rolle));
    var w = el('div', 'werte');
    [['Leben', d.hp, 200], ['Tempo', d.tempo - 120, 130], ['Reichweite', d.angriff.reichweite, 10]].forEach(function (x) {
      var z = el('div', 'wert'); z.appendChild(el('span', '', x[0]));
      var ii = el('i'), bb = el('b'); bb.style.width = Math.round(Math.min(1, x[1] / x[2]) * 100) + '%'; ii.appendChild(bb); z.appendChild(ii); w.appendChild(z);
    });
    t.appendChild(w);
    function zeile(titel, text, zu) { var p = el('p', 'ab' + (zu ? ' zu' : '')); p.appendChild(el('b', '', titel + ' ')); p.appendChild(document.createTextNode(text)); t.appendChild(p); }
    zeile('Angriff:', d.angriffText);
    zeile('Super:', d.superText);
    zeile('Trick – ' + d.trickName + ':', d.trickText + (sd < BS.TRICK_AB ? ' 🔒 ab Stufe ' + BS.TRICK_AB : ' (3× pro Runde)'), sd < BS.TRICK_AB);
    zeile('Talent – ' + d.talentName + ':', d.talentText + (sd < BS.TALENT_AB ? ' 🔒 ab Stufe ' + BS.TALENT_AB : ''), sd < BS.TALENT_AB);
    zeile('Ausrüstung:', 'Zwei Teile anlegen' + (sd < BS.AUSRUESTUNG_AB ? ' 🔒 ab Stufe ' + BS.AUSRUESTUNG_AB : ''), sd < BS.AUSRUESTUNG_AB);
    zeile('Ultra:', 'Nach vollem Super lädt sich eine lila Leiste. Dann 5 Sekunden schneller, stärker und zäher.' + (sd < BS.ULTRA_AB ? ' 🔒 ab Stufe ' + BS.ULTRA_AB : ''), sd < BS.ULTRA_AB);

    var x = el('div', 'extras');
    var stp = el('p', 'ab'); stp.appendChild(el('b', '', 'Stufe ' + sd + '/' + BS.MAX_STUFE));
    stp.appendChild(document.createTextNode(' · ' + Math.round(d.hp * f) + ' Leben · ' + Math.round(f * 100) + ' % Schaden'));
    x.appendChild(stp);
    if (sd < BS.MAX_STUFE) {
      var kosten = BS.STUFE_KOSTEN[sd];
      var up = knopf('Auf Stufe ' + (sd + 1) + ' · ' + kosten + ' 🪙', 'gelb upgrade', function () {
        if (muenzen < kosten) return;
        muenzen -= kosten; stufen[d.id] = sd + 1; speichern();
        Pixel.sfx.tone(660, 0.08, 'square', 0.06); Pixel.sfx.tone(990, 0.14, 'square', 0.06, null, 0.08);
        wahlMelden(); aufbauen();
      });
      up.disabled = muenzen < kosten; x.appendChild(up);
    } else x.appendChild(el('p', 'ab', '⭐ Höchste Stufe erreicht!'));
    t.appendChild(x);
    info.appendChild(t);
    seite.appendChild(info);

    // Skins
    seite.appendChild(el('h3', '', 'Skins'));
    var sk = el('div', 'skins');
    [{ id: '', name: 'Standard' }].concat(BS.SKINS[d.id] || []).forEach(function (s) {
      var hat = !s.id || hatSkin(d.id, s.id), an = skinVon(d.id) === s.id;
      var b = el('button', 'skin' + (an ? ' an' : '') + (hat ? '' : ' fehlt')); b.type = 'button';
      b.appendChild(bild(d, 'normal', s.id));
      b.appendChild(el('b', '', s.name));
      b.appendChild(el('small', '', an ? 'Angelegt' : hat ? 'Anlegen' : s.selten ? 'Selten – aus Truhen' : s.preis + ' 🪙 im Shop'));
      b.addEventListener('click', function () {
        if (!hat) {
          if (s.selten || muenzen < s.preis) return;
          muenzen -= s.preis; (konto.skins[d.id] = konto.skins[d.id] || []).push(s.id); kasse();
        }
        konto.angelegt[d.id] = s.id; speichern(); klick(); wahlMelden(); aufbauen();
      });
      if (!hat && !s.selten) b.title = 'Für ' + s.preis + ' Münzen kaufen';
      sk.appendChild(b);
    });
    seite.appendChild(sk);

    // Ausrüstung
    seite.appendChild(el('h3', '', 'Ausrüstung' + (sd < BS.AUSRUESTUNG_AB ? ' (ab Stufe ' + BS.AUSRUESTUNG_AB + ')' : ' – 2 Teile')));
    var au = el('div', 'teile');
    var an = konto.teileAn[d.id] || [];
    BS.AUSRUESTUNG.forEach(function (tl) {
      var hat = konto.teile.indexOf(tl.id) >= 0, ist = an.indexOf(tl.id) >= 0;
      var b = el('button', 'teil' + (ist ? ' an' : '') + (hat ? '' : ' fehlt')); b.type = 'button';
      b.appendChild(el('span', 'ti', tl.icon)); b.appendChild(el('b', '', tl.name)); b.appendChild(el('small', '', tl.text));
      b.appendChild(el('em', '', !hat ? tl.preis + ' 🪙 kaufen' : sd < BS.AUSRUESTUNG_AB ? '🔒' : ist ? 'Angelegt' : 'Anlegen'));
      b.addEventListener('click', function () {
        if (!hat) { if (muenzen < tl.preis) return; muenzen -= tl.preis; konto.teile.push(tl.id); kasse(); speichern(); aufbauen(); return; }
        if (sd < BS.AUSRUESTUNG_AB) return;
        var l = (konto.teileAn[d.id] = (konto.teileAn[d.id] || []).filter(function (x) { return x !== tl.id; }));
        if (!ist) { l.push(tl.id); if (l.length > 2) l.shift(); }
        speichern(); klick(); wahlMelden(); aufbauen();
      });
      au.appendChild(b);
    });
    seite.appendChild(au);
  }

  // ---------- Tab: Shop & Truhen ----------
  function shopHeute() {
    var tag = BS.tagNummer();
    if (konto.shop.tag !== tag) konto.shop = { tag: tag, gekauft: [], gratis: false };
    var r = BS.zufall(tag * 31 + 7), angebote = [];
    var skins = [];
    BS.KAEMPFER.forEach(function (k) { (BS.SKINS[k.id] || []).forEach(function (s) { if (!s.selten) skins.push({ k: k, s: s }); }); });
    for (var i = 0; i < 2 && skins.length; i++) {
      var x = skins.splice(Math.floor(r() * skins.length), 1)[0];
      angebote.push({ id: 'skin-' + x.k.id + '-' + x.s.id, art: 'skin', k: x.k, s: x.s, preis: Math.round(x.s.preis * 0.8), name: x.s.name + ' (' + x.k.name + ')', text: '20 % günstiger als sonst' });
    }
    var tl = BS.AUSRUESTUNG[Math.floor(r() * BS.AUSRUESTUNG.length)];
    angebote.push({ id: 'teil-' + tl.id, art: 'teil', t: tl, preis: 200, name: tl.icon + ' ' + tl.name, text: tl.text + ' – heute 200 statt 250' });
    var em = BS.EMOTES.filter(function (e) { return !e.start; }); em = em[Math.floor(r() * em.length)];
    angebote.push({ id: 'emote-' + em.id, art: 'emote', e: em, preis: em.preis, name: 'Emote „' + em.text + '“', text: 'Sprechblase im Spiel' });
    angebote.push({ id: 'rucksack', art: 'truhe', truhe: 'rucksack', preis: 240, name: '🧳 Wanderrucksack', text: 'Tagesangebot: 240 statt 300' });
    return { tag: tag, angebote: angebote, gratisOffen: !konto.shop.gratis, gratis: tag % 2 ? { art: 'truhe', truhe: 'tasche', name: '🎒 Gratis-Schultasche' } : { art: 'muenzen', wert: 40, name: '🪙 40 Gratis-Münzen' } };
  }
  function seiteShop() {
    var sh = shopHeute();
    seite.appendChild(el('h3', '', 'Deine Truhen'));
    var tr = el('div', 'truhen');
    Object.keys(BS.TRUHEN).forEach(function (id) {
      var t = BS.TRUHEN[id], n = konto.truhen[id] || 0;
      var b = el('div', 'truhenkarte' + (n ? ' hat' : ''));
      b.appendChild(el('span', 'ti', t.icon)); b.appendChild(el('b', '', t.name)); b.appendChild(el('small', '', '× ' + n));
      if (n) b.appendChild(knopf('Öffnen', 'gelb', function () { konto.truhen[id]--; speichern(); truheOeffnen(id); }));
      b.appendChild(knopf(t.preis + ' 🪙', '', function () { if (muenzen < t.preis) return; muenzen -= t.preis; konto.truhen[id] = (konto.truhen[id] || 0) + 1; kasse(); speichern(); aufbauen(); }));
      tr.appendChild(b);
    });
    seite.appendChild(tr);

    seite.appendChild(el('h3', '', 'Tagesangebote'));
    var rest = el('p', 'hilfe', 'Neue Angebote in ' + bisMorgen()); seite.appendChild(rest);
    var gl = el('div', 'angebote');
    var g = el('div', 'angebot gratis' + (konto.shop.gratis ? ' weg' : ''));
    g.appendChild(el('b', '', sh.gratis.name)); g.appendChild(el('small', '', 'Jeden Tag ein Geschenk'));
    g.appendChild(knopf(konto.shop.gratis ? 'Abgeholt' : 'Abholen', 'gelb', function () {
      if (konto.shop.gratis) return;
      konto.shop.gratis = true;
      if (sh.gratis.art === 'muenzen') muenzen += sh.gratis.wert; else konto.truhen[sh.gratis.truhe]++;
      kasse(); speichern(); aufbauen();
    }));
    gl.appendChild(g);
    sh.angebote.forEach(function (a) {
      var gekauft = konto.shop.gekauft.indexOf(a.id) >= 0 || (a.art === 'skin' && hatSkin(a.k.id, a.s.id)) || (a.art === 'teil' && konto.teile.indexOf(a.t.id) >= 0) || (a.art === 'emote' && konto.emotes.indexOf(a.e.id) >= 0);
      var c = el('div', 'angebot' + (gekauft ? ' weg' : ''));
      if (a.art === 'skin') c.appendChild(bild(a.k, 'normal', a.s.id));
      c.appendChild(el('b', '', a.name)); c.appendChild(el('small', '', a.text));
      var b = knopf(gekauft ? 'Gekauft' : a.preis + ' 🪙', 'gelb', function () {
        if (gekauft || muenzen < a.preis) return;
        muenzen -= a.preis; konto.shop.gekauft.push(a.id);
        if (a.art === 'skin') (konto.skins[a.k.id] = konto.skins[a.k.id] || []).push(a.s.id);
        if (a.art === 'teil') konto.teile.push(a.t.id);
        if (a.art === 'emote') konto.emotes.push(a.e.id);
        if (a.art === 'truhe') konto.truhen[a.truhe]++;
        kasse(); speichern(); aufbauen();
      });
      b.disabled = gekauft || muenzen < a.preis;
      c.appendChild(b);
      gl.appendChild(c);
    });
    seite.appendChild(gl);

    seite.appendChild(el('h3', '', 'Emotes'));
    var ems = el('div', 'emotes');
    BS.EMOTES.forEach(function (e) {
      var hat = konto.emotes.indexOf(e.id) >= 0;
      var b = el('button', 'emote' + (hat ? ' hat' : '')); b.type = 'button';
      b.appendChild(el('b', '', e.text)); b.appendChild(el('small', '', hat ? 'Hast du' : e.preis + ' 🪙'));
      b.addEventListener('click', function () { if (hat || muenzen < e.preis) return; muenzen -= e.preis; konto.emotes.push(e.id); kasse(); speichern(); aufbauen(); });
      ems.appendChild(b);
    });
    seite.appendChild(ems);
  }
  function bisMorgen() {
    var j = new Date(), m = new Date(j); m.setHours(24, 0, 0, 0);
    var min = Math.ceil((m - j) / 60000); return Math.floor(min / 60) + ' h ' + (min % 60) + ' min';
  }

  // Truhe öffnen: Münzen plus ein paar Würfe auf Skins, Emotes, Ausrüstung
  function zufallsBeute() {
    var r = Math.random();
    if (r < 0.16) {
      var offen = []; BS.KAEMPFER.forEach(function (k) { (BS.SKINS[k.id] || []).forEach(function (s) { if (!hatSkin(k.id, s.id)) offen.push({ k: k, s: s }); }); });
      if (offen.length) { var x = offen[Math.floor(Math.random() * offen.length)]; (konto.skins[x.k.id] = konto.skins[x.k.id] || []).push(x.s.id); return { icon: '👕', text: 'Skin: ' + x.s.name + ' für ' + x.k.name, k: x.k, s: x.s, selten: true }; }
    } else if (r < 0.32) {
      var em = BS.EMOTES.filter(function (e) { return konto.emotes.indexOf(e.id) < 0; });
      if (em.length) { var e = em[Math.floor(Math.random() * em.length)]; konto.emotes.push(e.id); return { icon: '💬', text: 'Emote: „' + e.text + '“', selten: true }; }
    } else if (r < 0.42) {
      var tl = BS.AUSRUESTUNG.filter(function (t) { return konto.teile.indexOf(t.id) < 0; });
      if (tl.length) { var t = tl[Math.floor(Math.random() * tl.length)]; konto.teile.push(t.id); return { icon: t.icon, text: 'Ausrüstung: ' + t.name + ' (' + t.text + ')', selten: true }; }
    }
    var m = 20 + Math.floor(Math.random() * 40); muenzen += m;
    return { icon: '🪙', text: '+' + m + ' Münzen' };
  }
  function truheOeffnen(id) {
    var t = BS.TRUHEN[id], beute = [];
    var m = t.muenzen[0] + Math.floor(Math.random() * (t.muenzen[1] - t.muenzen[0])); muenzen += m;
    beute.push({ icon: '🪙', text: '+' + m + ' Münzen' });
    for (var i = 0; i < t.wuerfe; i++) beute.push(zufallsBeute());
    speichern();
    var schritt = -1;
    truheEl.innerHTML = ''; truheEl.hidden = false;
    var box = el('div', 'tbox'); truheEl.appendChild(box);
    var gross = el('div', 'ticon', t.icon), txt = el('p', 'ttext', t.name + ' – tippen zum Öffnen!'), weiter = knopf('Öffnen', 'gelb');
    var sammlung = el('div', 'tliste');
    box.appendChild(gross); box.appendChild(txt); box.appendChild(sammlung); box.appendChild(weiter);
    function next() {
      schritt++;
      if (schritt >= beute.length) { truheEl.hidden = true; aufbauen(); return; }
      var b = beute[schritt];
      gross.textContent = b.icon; gross.className = 'ticon pop' + (b.selten ? ' selten' : '');
      void gross.offsetWidth; gross.classList.add('los');
      txt.textContent = b.text;
      if (b.selten) { Pixel.sfx.tone(523, 0.1, 'square', 0.06); Pixel.sfx.tone(784, 0.1, 'square', 0.06, null, 0.1); Pixel.sfx.tone(1046, 0.2, 'square', 0.06, null, 0.2); }
      else Pixel.sfx.tone(880, 0.08, 'triangle', 0.06);
      sammlung.appendChild(el('span', b.selten ? 'selten' : '', b.icon));
      weiter.textContent = schritt === beute.length - 1 ? 'Fertig' : 'Weiter';
    }
    weiter.addEventListener('click', next); gross.addEventListener('click', next);
    weiter.focus();
  }

  // ---------- Tab: Tagesaufgaben ----------
  function aufgabenHeute() {
    var tag = BS.tagNummer();
    if (konto.aufgaben.tag !== tag) konto.aufgaben = { tag: tag, stand: {}, abgeholt: [] };
    return BS.aufgabenFuer(tag);
  }
  function fortschritt(a) { return Math.min(a.ziel, konto.aufgaben.stand[a.id] || 0); }
  function aufgabenZaehlen(e) {
    var fertig = [];
    aufgabenHeute().forEach(function (a) {
      var vorher = fortschritt(a), plus = 0;
      if (a.art === 'siege' && e.ergebnis === 'sieg') plus = 1;
      if (a.art === 'kos' && wahl === a.kaempfer) plus = e.kos || 0;
      if (a.art === 'kosAlle') plus = e.kos || 0;
      if (a.art === 'runden' && modus === a.modus) plus = 1;
      if (a.art === 'schaden') plus = e.schaden || 0;
      if (a.art === 'supers') plus = e.supers || 0;
      konto.aufgaben.stand[a.id] = (konto.aufgaben.stand[a.id] || 0) + plus;
      if (vorher < a.ziel && fortschritt(a) >= a.ziel) fertig.push(a);
    });
    return fertig;
  }
  function seiteAufgaben() {
    seite.appendChild(el('h3', '', 'Tagesaufgaben'));
    seite.appendChild(el('p', 'hilfe', 'Neue Aufgaben in ' + bisMorgen() + '. Jede bringt Münzen.'));
    var l = el('div', 'aufgaben');
    aufgabenHeute().forEach(function (a) {
      var f = fortschritt(a), ab = konto.aufgaben.abgeholt.indexOf(a.id) >= 0;
      var c = el('div', 'aufgabe' + (ab ? ' weg' : f >= a.ziel ? ' fertig' : ''));
      c.appendChild(el('b', '', a.text));
      var bar = el('i', 'bar'), fill = el('b'); fill.style.width = Math.round(f / a.ziel * 100) + '%'; bar.appendChild(fill); c.appendChild(bar);
      c.appendChild(el('small', '', f + ' / ' + a.ziel + ' · Belohnung ' + a.lohn + ' 🪙'));
      var b = knopf(ab ? 'Abgeholt' : f >= a.ziel ? 'Abholen' : 'Läuft', 'gelb', function () {
        if (ab || f < a.ziel) return;
        konto.aufgaben.abgeholt.push(a.id); muenzen += a.lohn; kasse(); speichern(); aufbauen();
      });
      b.disabled = ab || f < a.ziel; c.appendChild(b);
      l.appendChild(c);
    });
    seite.appendChild(l);
    seite.appendChild(el('p', 'hilfe', 'Training zählt nicht. Online-Runden zählen mit.'));
  }

  // ---------- Tab: Pokal-Weg ----------
  function wegText(w) {
    if (w.art === 'muenzen') return { icon: '🪙', text: w.wert + ' Münzen' };
    if (w.art === 'truhe') return { icon: BS.TRUHEN[w.wert].icon, text: BS.TRUHEN[w.wert].name };
    if (w.art === 'emote') return { icon: '💬', text: 'Emote „' + BS.emote(w.wert).text + '“' };
    if (w.art === 'ausruestung') { var t = BS.teil(w.wert); return { icon: t.icon, text: t.name }; }
    var p = w.wert.split('/'), s = BS.skin(p[0], p[1]); return { icon: '👕', text: 'Skin ' + s.name + ' (' + BS.kaempfer(p[0]).name + ')' };
  }
  function wegAbholen(i) {
    var w = BS.WEG[i]; if (konto.weg.indexOf(i) >= 0 || gesamt() < w.pokale) return;
    konto.weg.push(i);
    if (w.art === 'muenzen') muenzen += w.wert;
    if (w.art === 'truhe') konto.truhen[w.wert]++;
    if (w.art === 'emote' && konto.emotes.indexOf(w.wert) < 0) konto.emotes.push(w.wert);
    if (w.art === 'ausruestung' && konto.teile.indexOf(w.wert) < 0) konto.teile.push(w.wert);
    if (w.art === 'skin') { var p = w.wert.split('/'); if (!hatSkin(p[0], p[1])) (konto.skins[p[0]] = konto.skins[p[0]] || []).push(p[1]); }
    kasse(); speichern(); aufbauen();
  }
  function seiteWeg() {
    var g = gesamt();
    seite.appendChild(el('h3', '', 'Pokal-Weg · du hast ' + g + ' 🏆'));
    var l = el('div', 'weg');
    BS.WEG.forEach(function (w, i) {
      var t = wegText(w), erreicht = g >= w.pokale, ab = konto.weg.indexOf(i) >= 0;
      var c = el('div', 'station' + (ab ? ' weg' : erreicht ? ' bereit' : ''));
      c.appendChild(el('span', 'sp', w.pokale + ' 🏆'));
      c.appendChild(el('span', 'ti', t.icon));
      c.appendChild(el('b', '', t.text));
      var b = knopf(ab ? '✓' : erreicht ? 'Abholen' : '🔒', 'gelb', function () { wegAbholen(i); });
      b.disabled = ab || !erreicht; c.appendChild(b);
      l.appendChild(c);
    });
    seite.appendChild(l);
  }

  // ---------- Ergebnis ----------
  var PLATZ_POKALE = [0, 10, 8, 6, 4, 2, 0, -2, -4], DUO_POKALE = [0, 9, 5, 0, -3];
  function zeigeErgebnis(e) {
    imSpiel = false;
    var delta = 0, titel = '', unter = '', duo = modus === 'duo', training = e.ergebnis === 'training';
    if (e.ergebnis === 'abbruch' || training) {
      titel = training ? 'Training beendet' : 'Runde abgebrochen';
      unter = training ? 'Gut geübt! Im Training gibt es keine Pokale.' : e.text || 'Die Runde wurde beendet – keine Pokale.';
    } else if (modus === 'royale' || duo) {
      var pl = e.platz || (duo ? 4 : 8); delta = (duo ? DUO_POKALE : PLATZ_POKALE)[pl] || -4;
      titel = pl === 1 ? (duo ? 'Bestes Duo!' : 'Letzter auf dem Pausenhof!') : 'Platz ' + pl;
      unter = pl === 1 ? 'Alle anderen liegen im Kreidestaub.' : pl <= (duo ? 2 : 3) ? 'Knapp dran!' : 'Rausgeflogen. Nächstes Mal mehr Kisten knacken.';
      if (pl === 1) siege++;
    } else if (e.ergebnis === 'sieg') { delta = 8; titel = 'Sieg!'; unter = 'Bravo! Das Team hat abgeräumt.'; siege++; }
    else if (e.ergebnis === 'niederlage') { delta = -4; titel = 'Niederlage'; unter = 'Die anderen waren diesmal besser.'; }
    else { delta = 0; titel = 'Unentschieden'; unter = 'Gleichstand – keiner bekommt was.'; }
    var zaehlt = e.ergebnis !== 'abbruch' && !training;
    var vorher = pokale[wahl] || 0;
    if (zaehlt) { pokale[wahl] = Math.max(0, vorher + delta); delta = pokale[wahl] - vorher; }
    // Münzen, Rangpunkte, Aufgaben
    var gewinn = 0, extra = [], rangText = '';
    if (zaehlt) {
      if (modus === 'royale') gewinn = [0, 40, 32, 26, 20, 15, 12, 10, 8][e.platz || 8] || 8;
      else if (duo) gewinn = [0, 40, 28, 18, 10][e.platz || 4] || 10;
      else gewinn = e.ergebnis === 'sieg' ? 30 : e.ergebnis === 'unentschieden' ? 18 : 10;
      gewinn += Math.min(10, (e.kos || 0) * 2);
      var heute = new Date().toISOString().slice(0, 10);
      if (e.ergebnis === 'sieg' && Pixel.get(K_TAG, '') !== heute) { Pixel.set(K_TAG, heute); gewinn += 50; extra.push('Erster Sieg heute: +50 🪙'); }
      if (laeuftRang && !e.online) {
        var rv = konto.rang, rangVorher = BS.rang(rv).i;
        konto.rang = Math.max(0, rv + (e.ergebnis === 'sieg' ? 20 : e.ergebnis === 'unentschieden' ? 2 : -12));
        var rn = BS.rang(konto.rang);
        rangText = '◆ ' + rn.name + ': ' + rv + ' → ' + konto.rang + ' Rangpunkte';
        if (rn.i > rangVorher && rn.i > konto.rangHoch) { konto.rangHoch = rn.i; var lohn = 80 + rn.i * 20; gewinn += lohn; extra.push('Neuer Rang ' + rn.name + '! +' + lohn + ' 🪙'); }
      }
      aufgabenZaehlen(e).forEach(function (a) { extra.push('Aufgabe geschafft: ' + a.text + ' – im Tab „Aufgaben“ abholen!'); });
      muenzen += gewinn;
      var neueWeg = BS.WEG.filter(function (w, i) { return gesamt() >= w.pokale && konto.weg.indexOf(i) < 0; }).length;
      if (neueWeg) extra.push('Auf dem Pokal-Weg wartet ' + (neueWeg === 1 ? 'eine Belohnung' : neueWeg + ' Belohnungen') + '!');
    }
    laeuftRang = false;
    speichern();
    var d = BS.kaempfer(wahl);
    ergebnis.innerHTML = '';
    ergebnis.className = 'ergebnis ' + (delta > 0 || e.ergebnis === 'sieg' ? 'gut' : delta < 0 ? 'schlecht' : '');
    var box = el('div', 'ebox');
    box.appendChild(el('h2', '', titel));
    var gr = el('div', 'gross'); gr.appendChild(bild(d, delta >= 0 ? 'super' : 'tot', skinVon(wahl))); box.appendChild(gr);
    box.appendChild(el('p', '', unter));
    if (!training) box.appendChild(el('p', 'stat', 'K.o.s: ' + e.kos + ' · Schaden: ' + (e.schaden || 0) + (e.tore ? ' · Tore: ' + e.tore : '') + (modus === 'sterne' || modus === 'kopfgeld' ? ' · Team-Sterne: ' + e.sterne : '')));
    if (zaehlt) {
      box.appendChild(el('p', 'pokdelta', '🏆 ' + d.name + ': ' + vorher + ' → ' + pokale[wahl] + ' (' + (delta > 0 ? '+' : '') + delta + ')'));
      box.appendChild(el('p', 'pokdelta muenz', '🪙 +' + gewinn + ' Münzen (jetzt ' + muenzen + ')'));
      if (rangText) box.appendChild(el('p', 'pokdelta', rangText));
      extra.forEach(function (t) { box.appendChild(el('p', 'stat bonus', t)); });
    }
    var k = el('div', 'knoepfe');
    var nochmal = knopf(online ? 'Nochmal (alle)' : 'Nochmal', 'gelb', starten);
    var zur = knopf(online ? 'Zur Lobby' : 'Zum Menü', '', function () { ergebnis.hidden = true; menue.hidden = false; tab = 'spielen'; aufbauen(); });
    if (online && !istHost()) nochmal.hidden = true;
    k.appendChild(nochmal); k.appendChild(zur); box.appendChild(k);
    if (online && !istHost()) box.appendChild(el('p', 'stat', 'Wenn der Host nochmal startet, geht es automatisch los.'));
    ergebnis.appendChild(box);
    ergebnis.hidden = false;
    (nochmal.hidden ? zur : nochmal).focus();
  }

  function tonText() { tonKnopf.textContent = Pixel.isMuted() ? '🔇' : '🔊'; }
  tonKnopf.addEventListener('click', function () { Pixel.setMuted(!Pixel.isMuted()); tonText(); });
  tonText();
  aufbauen();
  menue.hidden = false;
})();
