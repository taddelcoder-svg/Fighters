// Bravo Stars – eine Runde: Karte, Kämpfer, Projektile, Bots, Modus-Regeln, Zeichnen und Steuerung.
// BS.starten(optionen, fertig) startet eine Runde im #spiel-Container; fertig(ergebnis) kommt am Ende.
(function () {
  var T = 40;                       // Feldgröße in Pixeln
  var SH = 6;                       // Schusshöhe über dem Boden (klein = Schüsse fliegen auf Höhe der Ziellinie)
  var REGEN_PAUSE = 3, REGEN_PRO_S = 0.13;
  var TEAMFARBE = ['#3fa2ff', '#ff4d5a'];
  var sfx = Pixel.sfx;

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function klemm(v, a, b) { return v < a ? a : v > b ? b : v; }
  function abst(a, b) { var dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); }
  function winkelDiff(a, b) { var d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; }
  function mischen(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  // Laufbild: linke und rechte Beinhälfte abwechselnd einen Pixel anheben
  var laufCache = typeof WeakMap !== 'undefined' ? new WeakMap() : null, weissCache = laufCache ? new WeakMap() : null;
  function laufBild(img, phase) {
    if (!laufCache) return img;
    var m = laufCache.get(img); if (!m) { m = []; laufCache.set(img, m); }
    if (m[phase]) return m[phase];
    var w = img.width, h = img.height, beine = Math.max(3, Math.round(h * 0.22)), oben = h - beine, halb = Math.floor(w / 2);
    var c = document.createElement('canvas'); c.width = w; c.height = h; var x = c.getContext('2d');
    x.drawImage(img, 0, 0, w, oben, 0, 0, w, oben);
    x.drawImage(img, 0, oben, halb, beine, 0, oben - (phase ? 0 : 1), halb, beine);
    x.drawImage(img, halb, oben, w - halb, beine, halb, oben - (phase ? 1 : 0), w - halb, beine);
    m[phase] = c; return c;
  }
  // Weiße Silhouette fürs Aufblitzen bei Treffern
  function weissBild(img) {
    if (!weissCache) return img;
    var c = weissCache.get(img); if (c) return c;
    c = document.createElement('canvas'); c.width = img.width; c.height = img.height; var x = c.getContext('2d');
    x.drawImage(img, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
    weissCache.set(img, c); return c;
  }

  BS.starten = function (opt, fertig) {
    var root = document.getElementById('spiel');
    root.innerHTML = '';
    root.hidden = false;
    var cv = document.createElement('canvas'); cv.className = 'feld'; root.appendChild(cv);
    var ctx = cv.getContext('2d');
    var hud = document.createElement('div'); hud.className = 'hud'; root.appendChild(hud);
    var pauseKnopf = document.createElement('button'); pauseKnopf.className = 'pause'; pauseKnopf.type = 'button';
    pauseKnopf.textContent = '✕'; pauseKnopf.setAttribute('aria-label', 'Runde aufgeben'); root.appendChild(pauseKnopf);

    var modus = opt.modus, duo = modus === 'duo', royaleArt = modus === 'royale' || duo, team = !royaleArt;
    var training = modus === 'training', rangspiel = !!opt.rang;
    var koop = modus === 'boss' || modus === 'wellen', gross = modus === 'grosskeile', eroberung = modus === 'eroberung';
    var mod = training ? 'keiner' : (opt.modifikator || (opt.netz && opt.netz.init && opt.netz.init.mod) || BS.modifikatorHeute(modus));
    var zeitFaktor = opt.zeitFaktor || 1;
    // Bot-Stärke: Leicht / Normal / Schwer (Rangspiel ist immer Schwer und noch etwas besser)
    var STAERKE = {
      leicht: { fehler: 0.42, takt: 1.9, vorhalt: 0, sicht: 7, denk: 0.75, stufe: -1.5, schaden: 0.7, seite: 0.35, super: 0.35, trick: 0.15 },
      normal: { fehler: 0.26, takt: 1.4, vorhalt: 0.3, sicht: 8.5, denk: 0.5, stufe: -0.8, schaden: 0.85, seite: 0.5, super: 0.65, trick: 0.3 },
      schwer: { fehler: 0.12, takt: 1, vorhalt: 0.7, sicht: 11, denk: 0.35, stufe: 0, schaden: 1, seite: 0.7, super: 1, trick: 0.6 }
    };
    var ks = STAERKE[rangspiel ? 'schwer' : opt.schwierigkeit] || STAERKE.normal;
    // Online: der Host rechnet alles und schickt 20x pro Sekunde den Stand, Gäste schicken nur Eingaben
    var netz = opt.netz || null, host = !!(netz && netz.rolle === 'host'), gast = !!(netz && netz.rolle === 'gast');
    var ev = [];   // Ereignisse (Effekte, Zahlen, Töne, kaputte Wände) seit dem letzten Stand
    var sfx = {
      tone: function () { Pixel.sfx.tone.apply(null, arguments); if (host) ev.push(['s', 0, [].slice.call(arguments)]); },
      noise: function () { Pixel.sfx.noise.apply(null, arguments); if (host) ev.push(['s', 1, [].slice.call(arguments)]); }
    };
    function fx(e) { effekte.push(e); if (host) ev.push(['f', e]); }
    function zahl(z) { zahlen.push(z); if (host) ev.push(['z', z]); }
    var kartenName = opt.karte || (opt.netz && opt.netz.init && opt.netz.init.karte) || BS.karteHeute(modus);
    var karte = BS.karte(modus, kartenName);
    var B = karte.zeilen[0].length, H = karte.zeilen.length;
    var W = B * T, HH = H * T;
    // Felder: 0 Boden, 1 Wand, 2 Hecke, 3 Wasser, 4 Kiste
    var feld = new Uint8Array(B * H), kistenHp = {};
    karte.zeilen.forEach(function (z, y) {
      for (var x = 0; x < B; x++) {
        var c = z[x], v = c === '#' ? 1 : c === 'b' ? 2 : c === 'w' ? 3 : c === 'K' ? 4 : c === 'J' ? 5 : c === 'O' ? 6 : c === 'H' ? 7 : c === 'F' ? 8 : 0;
        feld[y * B + x] = v;
        if (v === 4) kistenHp[y * B + x] = 90;
        if (v === 8) kistenHp[y * B + x] = 40;
      }
    });
    function fAt(tx, ty) { if (tx < 0 || ty < 0 || tx >= B || ty >= H) return 1; return feld[ty * B + tx]; }
    function fPx(x, y) { return fAt(Math.floor(x / T), Math.floor(y / T)); }
    function blockiertLauf(v) { return v === 1 || v === 3 || v === 4 || v === 8; }
    function blockiertSchuss(v) { return v === 1 || v === 4 || v === 8; }

    // ---------- Untergrund vorzeichnen ----------
    var boden = document.createElement('canvas'); boden.width = W; boden.height = HH;
    var bctx = boden.getContext('2d');
    function feldZeichnen(tx, ty) {
      var x = tx * T, y = ty * T, v = fAt(tx, ty);
      bctx.fillStyle = ((tx + ty) & 1) ? '#c9a86c' : '#d2b276'; bctx.fillRect(x, y, T, T);
      if (((tx * 7 + ty * 13) % 11) === 0) { bctx.fillStyle = 'rgba(120,80,40,.18)'; bctx.fillRect(x + 8, y + 22, 6, 3); }
      if (v === 3) {
        bctx.fillStyle = '#3d8fd6'; bctx.fillRect(x, y, T, T);
        bctx.fillStyle = 'rgba(255,255,255,.25)'; bctx.fillRect(x + 6, y + 10, 12, 3); bctx.fillRect(x + 20, y + 26, 10, 3);
      } else if (v === 1) {
        bctx.fillStyle = '#5a3a24'; bctx.fillRect(x, y + 8, T, T - 8);
        bctx.fillStyle = '#8a5a34'; bctx.fillRect(x, y, T, T - 10);
        bctx.fillStyle = '#a8703f'; bctx.fillRect(x + 3, y + 3, T - 6, T - 18);
        bctx.fillStyle = 'rgba(0,0,0,.25)'; bctx.fillRect(x, y + T - 4, T, 4);
      } else if (v === 5) {
        bctx.fillStyle = '#5a3a1a'; bctx.beginPath(); bctx.arc(x + T / 2, y + T / 2, 16, 0, Math.PI * 2); bctx.fill();
        bctx.fillStyle = '#ffb84a'; bctx.beginPath(); bctx.arc(x + T / 2, y + T / 2, 12, 0, Math.PI * 2); bctx.fill();
        bctx.fillStyle = '#fff'; bctx.beginPath(); bctx.moveTo(x + T / 2, y + 10); bctx.lineTo(x + T / 2 + 7, y + 20); bctx.lineTo(x + T / 2 - 7, y + 20); bctx.fill();
      } else if (v === 6) {
        bctx.fillStyle = '#2a1060'; bctx.beginPath(); bctx.ellipse(x + T / 2, y + T / 2, 17, 12, 0, 0, Math.PI * 2); bctx.fill();
        bctx.strokeStyle = '#c46aff'; bctx.lineWidth = 4; bctx.beginPath(); bctx.ellipse(x + T / 2, y + T / 2, 16, 11, 0, 0, Math.PI * 2); bctx.stroke();
      } else if (v === 7) {
        bctx.fillStyle = '#e8f8ea'; bctx.fillRect(x + 4, y + 4, T - 8, T - 8);
        bctx.fillStyle = '#2aa84a'; bctx.fillRect(x + T / 2 - 4, y + 9, 8, T - 18); bctx.fillRect(x + 9, y + T / 2 - 4, T - 18, 8);
      } else if (v === 8) {
        bctx.fillStyle = '#5a6a7a'; bctx.fillRect(x, y + 8, T, T - 8);
        bctx.fillStyle = 'rgba(160,220,255,.85)'; bctx.fillRect(x + 3, y + 2, T - 6, T - 14);
        bctx.fillStyle = 'rgba(255,255,255,.7)'; bctx.fillRect(x + 7, y + 6, 4, 14); bctx.fillRect(x + 14, y + 6, 3, 8);
        bctx.fillStyle = '#5a6a7a'; bctx.fillRect(x + T / 2 - 1, y + 2, 3, T - 14);
      } else if (v === 4) {
        bctx.fillStyle = '#7a4a1e'; bctx.fillRect(x + 3, y + 3, T - 6, T - 6);
        bctx.fillStyle = '#b8792e'; bctx.fillRect(x + 6, y + 6, T - 12, T - 12);
        bctx.strokeStyle = '#7a4a1e'; bctx.lineWidth = 3;
        bctx.beginPath(); bctx.moveTo(x + 6, y + 6); bctx.lineTo(x + T - 6, y + T - 6); bctx.moveTo(x + T - 6, y + 6); bctx.lineTo(x + 6, y + T - 6); bctx.stroke();
      }
    }
    for (var ty0 = 0; ty0 < H; ty0++) for (var tx0 = 0; tx0 < B; tx0++) feldZeichnen(tx0, ty0);
    // Mittelkreis / Teamhälften
    if (team) {
      bctx.strokeStyle = 'rgba(255,255,255,.35)'; bctx.lineWidth = 4;
      bctx.beginPath(); bctx.arc(W / 2, HH / 2, T * 2.2, 0, Math.PI * 2); bctx.stroke();
    }

    var effekte = [], zahlen = [], projektile = [], flaechen = [], sterne = [], energie = [];
    var wackeln = 0;

    function feldWeg(tx, ty) {
      var v = fAt(tx, ty);
      if (v !== 1 && v !== 4 && v !== 8) return;
      feld[ty * B + tx] = 0;
      if (host) ev.push(['w', tx, ty]);
      if (v === 4) energie.push({ x: (tx + 0.5) * T, y: (ty + 0.5) * T });
      for (var i = 0; i < 6; i++) fx({ art: 'splitter', x: (tx + 0.5) * T, y: (ty + 0.5) * T, vx: rnd(-150, 150), vy: rnd(-150, 150), t: 0, d: 0.5, farbe: v === 4 ? '#b8792e' : v === 8 ? '#bfe8ff' : '#8a5a34' });
      if (v === 8) sfx.noise(0.25, 0.2, 3000);
      feldZeichnen(tx, ty);
      wegeNeu = true;
    }

    // ---------- Kämpfer ----------
    var kaempfer = [];
    function neuerKaempfer(def, tm, istSpieler, stufe, mehr) {
      stufe = klemm(Math.round(stufe || 1), 1, BS.MAX_STUFE);
      mehr = mehr || {};
      var tal = {}, f = 1 + (stufe - 1) * 0.07;
      // Talent und Ausrüstung zu einem Satz Faktoren zusammenfassen
      var talentWahl = def.talente && def.talente[mehr.talentWahl || 0] ? mehr.talentWahl || 0 : 0, trickWahl = def.tricks && def.tricks[mehr.trickWahl || 0] ? mehr.trickWahl || 0 : 0;
      var quellen = [stufe >= BS.TALENT_AB ? ((def.talente && def.talente[talentWahl].mod) || def.talent || {}) : {}];
      if (stufe >= BS.AUSRUESTUNG_AB) (mehr.ausruestung || []).slice(0, 2).forEach(function (id) { var t = BS.teil(id); if (t) quellen.push(t.mod); });
      quellen.forEach(function (q) { for (var key in q) tal[key] = key === 'biss' || key === 'regenPause' ? q[key] : (tal[key] || 1) * q[key]; });
      var modHp = def.npc ? 1 : mod === 'glas' ? 0.6 : mod === 'riesen' ? 1.4 : 1;
      var hp0 = Math.round(def.hp * f * (tal.hp || 1) * modHp);
      var riese = mod === 'riesen' && !def.npc;
      var k = {
        def: def, team: tm, spieler: istSpieler, x: 0, y: 0, r: riese ? Math.min(19, (def.radius || 16) * 1.2) : (def.radius || 16), groesse: riese ? 1.25 : 1,
        stufe: stufe, dmgF: f * (tal.schaden || 1), tempoF: tal.tempo || 1, ladeF: (tal.laden || 1) * (mod === 'nachschub' && !def.npc ? 0.6 : 1), superF: tal.superF || 1,
        regenPause: REGEN_PAUSE * (tal.regenPause || 1), regenTempo: tal.regenTempo || 1, biss: tal.biss || 0,
        tricks: stufe >= BS.TRICK_AB && !def.npc ? 3 : 0, trickT: 0, verliebt: 0, verliebtZu: null,
        trickArt: def.tricks ? def.tricks[trickWahl].art : def.trick, trickName: def.tricks ? def.tricks[trickWahl].name : def.trickName,
        trickWahl: trickWahl, talentWahl: talentWahl,
        skin: BS.skin(def.id, mehr.skin), ausruestung: (mehr.ausruestung || []).slice(0, 2),
        ultraOk: stufe >= BS.ULTRA_AB, ultraLadung: 0, ultra: 0, emote: null, kopfgeld: 2,
        statSchaden: 0, statSupers: 0, statTore: 0, statTode: 0,
        hp: hp0, maxHp: hp0, munition: 3, ladeT: 0, superLadung: 0, superBereit: false,
        blick: tm === 0 ? -Math.PI / 2 : Math.PI / 2, lauf: 0, bewegt: false,
        betaeubt: 0, gebremst: 0, schild: 0, unsichtbar: 0, gross: 0, turbo: 0, doppelt: false,
        dash: null, stoss: null, zuletztAktiv: -9, zuletztGetroffen: -9, salve: [],
        tot: false, respawn: 0, sterne: 0, kos: 0, energie: 0, platz: 0,
        ki: istSpieler ? null : neueKi()
      };
      kaempfer.push(k);
      return k;
    }

    function botStufe(s) { return klemm(Math.round((s || 1) + rnd(-1.2, 0.8) + (rangspiel ? 1 : ks.stufe)), 1, BS.MAX_STUFE); }
    // Bots bekommen manchmal einen Skin und ab Stufe 7 zufällige Ausrüstung
    function botMehr(def, st) {
      var l = BS.SKINS[def.id] || [], m = {};
      if (l.length && Math.random() < 0.35) m.skin = l[Math.floor(Math.random() * l.length)].id;
      if (st >= BS.AUSRUESTUNG_AB) m.ausruestung = mischen(BS.AUSRUESTUNG.map(function (t) { return t.id; })).slice(0, 2);
      return m;
    }
    function bot(def, tm, s) { var st = botStufe(s); return neuerKaempfer(def, tm, false, st, botMehr(def, st)); }
    function neueKi() { return { ziel: null, denk: rnd(0, 0.3), schussT: rnd(0.4, 0.9), seite: Math.random() < 0.5 ? -1 : 1, seiteT: 0 }; }

    var spieler, gegnerPool = mischen(BS.KAEMPFER.filter(function (d) { return d.id !== opt.kaempfer; }));
    var spawns = [];
    if (gast) {
      netz.init.k.forEach(function (z) {
        var k = neuerKaempfer(BS.kaempfer(z[0]), z[1], z[3] === netz.ich, z[4], { skin: z[5], ausruestung: z[6], trickWahl: z[7], talentWahl: z[8] });
        if (z[9]) { k.hp = k.maxHp = z[9]; k.npc = BS.kaempfer(z[0]).npc; }
        k.ki = null; k.name = z[2]; k.mensch = z[3];
        if (z[3] === netz.ich) spieler = k;
      });
    } else if (host) {
      var benutzt = netz.spieler.map(function (m) { return m.kaempfer; });
      var botPool = mischen(BS.KAEMPFER.filter(function (d) { return benutzt.indexOf(d.id) < 0; })).concat(mischen(BS.KAEMPFER.slice()));
      var bi = 0, schnitt = 0;
      netz.spieler.forEach(function (m) { schnitt += (m.stufe || 1) / netz.spieler.length; });
      var mensch = function (m, tm) {
        var k = neuerKaempfer(BS.kaempfer(m.kaempfer), tm, m.id === netz.ich, m.stufe, { skin: m.skin, ausruestung: m.ausruestung, trickWahl: m.trickWahl, talentWahl: m.talentWahl });
        k.name = m.name; k.mensch = m.id;
        if (m.id === netz.ich) spieler = k; else { k.ki = null; k.eingabe = { mx: 0, my: 0, b: 0 }; }
      };
      // Echte Spieler zuerst, freie Plätze füllen Bots
      if (team) {
        netz.spieler.forEach(function (m) { mensch(m, koop ? 0 : m.team); });
        var proTeam = gross ? 5 : 3;
        [0, 1].forEach(function (tm) {
          if (koop && tm === 1) return;
          for (var n = kaempfer.filter(function (k) { return k.team === tm; }).length; n < proTeam; n++) bot(botPool[bi++ % botPool.length], tm, schnitt);
        });
      } else {
        netz.spieler.forEach(function (m, i) { mensch(m, duo ? Math.floor(i / 2) : i); });
        for (var i3 = netz.spieler.length; i3 < 8; i3++) bot(botPool[bi++ % botPool.length], duo ? Math.floor(i3 / 2) : i3, schnitt);
      }
    } else if (training) {
      spieler = neuerKaempfer(BS.kaempfer(opt.kaempfer), 0, true, opt.stufe, opt);
      for (var gt = 0; gt < 3; gt++) {
        var puppe = neuerKaempfer(gegnerPool[gt], 1, false, 1);
        puppe.ki = null; puppe.eingabe = { mx: 0, my: 0, b: Math.PI / 2 }; puppe.hp = puppe.maxHp = 600; puppe.name = 'Puppe';
      }
    } else if (koop) {
      spieler = neuerKaempfer(BS.kaempfer(opt.kaempfer), 0, true, opt.stufe, opt);
      bot(gegnerPool[0], 0, opt.stufe);
      bot(gegnerPool[1], 0, opt.stufe);
    } else if (gross) {
      spieler = neuerKaempfer(BS.kaempfer(opt.kaempfer), 0, true, opt.stufe, opt);
      for (var gg = 0; gg < 9; gg++) bot(gegnerPool[gg % gegnerPool.length], gg < 4 ? 0 : 1, opt.stufe);
    } else if (team) {
      spieler = neuerKaempfer(BS.kaempfer(opt.kaempfer), 0, true, opt.stufe, opt);
      bot(gegnerPool[0], 0, opt.stufe);
      bot(gegnerPool[1], 0, opt.stufe);
      for (var g = 2; g < 5; g++) bot(gegnerPool[g], 1, opt.stufe);
    } else {
      spieler = neuerKaempfer(BS.kaempfer(opt.kaempfer), 0, true, opt.stufe, opt);
      for (var g2 = 0; g2 < 7; g2++) bot(gegnerPool[g2 % gegnerPool.length], duo ? Math.floor((g2 + 1) / 2) : g2 + 1, opt.stufe);
    }
    if (koop && !gast) {
      var menschen = kaempfer.filter(function (k) { return k.team === 0; }).length;
      if (modus === 'boss') {
        var boss = neuerKaempfer(BS.npc('robo'), 1, false, 1);
        boss.npc = 'boss'; boss.hp = boss.maxHp = 1600 + menschen * 1100; boss.name = 'Robo-Hausmeister';
        boss.ki = neueKi(); boss.ki.spezialT = 5;
      } else {
        for (var mi = 0; mi < 22; mi++) {
          var m0 = neuerKaempfer(BS.npc('klecks'), 1, false, 1);
          m0.npc = 'monster'; m0.tot = true; m0.weg = true; m0.respawn = 1e9; m0.name = 'Kreideklecks'; m0.ki = neueKi();
        }
      }
    }
    function freiesFeld(tx, ty) {
      for (var rad = 0; rad < 6; rad++) for (var dy = -rad; dy <= rad; dy++) for (var dx = -rad; dx <= rad; dx++) {
        var v = fAt(tx + dx, ty + dy); if (v === 0 || v === 2 || v === 7) return { x: (tx + dx + 0.5) * T, y: (ty + dy + 0.5) * T };
      }
      return { x: (tx + 0.5) * T, y: (ty + 0.5) * T };
    }
    function spawnPunkt(k) {
      if (team) {
        var mitglieder = kaempfer.filter(function (o) { return o.team === k.team; });
        var i = mitglieder.indexOf(k), cx = Math.round(B / 2 - 0.5 + (i - (mitglieder.length - 1) / 2) * (mitglieder.length > 3 ? 2.5 : 3));
        if (k.npc) return { x: W / 2, y: 4 * T };
        return freiesFeld(k.team === 0 ? B - 1 - cx : cx, k.team === 0 ? H - 2 : 1);
      }
      var n = kaempfer.indexOf(k), w = n / kaempfer.length * Math.PI * 2 + Math.PI / 2;
      if (duo) {   // Duos starten nebeneinander
        var paar = kaempfer.filter(function (o) { return o.team === k.team; }), seite = paar.indexOf(k) ? 1 : -1;
        w = k.team / 4 * Math.PI * 2 + Math.PI / 2 + seite * 0.12;
      }
      return freiesFeld(Math.round(B / 2 - 0.5 + Math.cos(w) * (B / 2 - 3)), Math.round(H / 2 - 0.5 + Math.sin(w) * (H / 2 - 3)));
    }
    kaempfer.forEach(function (k) { var s = spawnPunkt(k); k.x = s.x; k.y = s.y; spawns.push(s); k.spawnT = 0.45; });
    if (host) netz.senden({ t: 'an_alle', d: { t: 'init', karte: kartenName, mod: mod, k: kaempfer.map(function (k) { return [k.def.id, k.team, k.name || '', k.mensch || 0, k.stufe, k.skin ? k.skin.id : '', k.ausruestung, k.trickWahl, k.talentWahl, k.npc ? k.maxHp : 0]; }) } });

    // ---------- Wege für die Bots (Breitensuche auf dem Raster) ----------
    var wegeNeu = false, wegCache = {};
    function wegfeld(zx, zy) {
      var key = zx + ',' + zy;
      if (!wegeNeu && wegCache[key]) return wegCache[key];
      if (wegeNeu) { wegCache = {}; wegeNeu = false; }
      var d = new Int16Array(B * H).fill(-1), q = [zy * B + zx], kopf = 0;
      if (zx < 0 || zy < 0 || zx >= B || zy >= H) return d;
      d[q[0]] = 0;
      while (kopf < q.length) {
        var c = q[kopf++], cx = c % B, cy = (c - cx) / B;
        for (var n = 0; n < 4; n++) {
          var nx = cx + (n === 0 ? 1 : n === 1 ? -1 : 0), ny = cy + (n === 2 ? 1 : n === 3 ? -1 : 0);
          if (nx < 0 || ny < 0 || nx >= B || ny >= H) continue;
          var ni = ny * B + nx;
          if (d[ni] >= 0 || blockiertLauf(feld[ni])) continue;
          d[ni] = d[c] + 1; q.push(ni);
        }
      }
      var schl = Object.keys(wegCache); if (schl.length > 60) delete wegCache[schl[0]];
      wegCache[key] = d;
      return d;
    }
    // Richtung zum Ziel: nächstes Nachbarfeld mit kleinerer Entfernung (8 Richtungen)
    function wegRichtung(k, zx, zy) {
      var ztx = klemm(Math.floor(zx / T), 0, B - 1), zty = klemm(Math.floor(zy / T), 0, H - 1);
      if (blockiertLauf(fAt(ztx, zty))) { var f = freiesFeld(ztx, zty); ztx = Math.floor(f.x / T); zty = Math.floor(f.y / T); }
      var d = wegfeld(ztx, zty), tx = Math.floor(k.x / T), ty = Math.floor(k.y / T);
      if (tx === ztx && ty === zty || sichtfrei(k.x, k.y, zx, zy, true)) return Math.atan2(zy - k.y, zx - k.x);
      var best = 1e9, bx = 0, by = 0;
      for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        var v = (tx + dx < 0 || ty + dy < 0 || tx + dx >= B || ty + dy >= H) ? -1 : d[(ty + dy) * B + tx + dx];
        if (v < 0) continue;
        if (dx && dy && (blockiertLauf(fAt(tx + dx, ty)) || blockiertLauf(fAt(tx, ty + dy)))) continue;
        var wert = v + (dx && dy ? 0.4 : 0);
        if (wert < best) { best = wert; bx = dx; by = dy; }
      }
      if (best === 1e9) return Math.atan2(zy - k.y, zx - k.x);
      return Math.atan2((ty + by + 0.5) * T - k.y, (tx + bx + 0.5) * T - k.x);
    }

    function sichtfrei(x1, y1, x2, y2, lauf) {
      var d = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1)), n = Math.ceil(d / (T / 4));
      for (var i = 1; i < n; i++) {
        var v = fPx(x1 + (x2 - x1) * i / n, y1 + (y2 - y1) * i / n);
        if (lauf ? blockiertLauf(v) : blockiertSchuss(v)) return false;
      }
      return true;
    }

    // ---------- Sichtbarkeit (Hecken, Unsichtbarkeit) ----------
    function inHecke(k) { return fPx(k.x, k.y) === 2; }
    function sichtbarFuer(k, tm) {
      if (k.tot) return false;
      if (k.team === tm) return true;
      if (k.unsichtbar > 0) return false;
      if (!inHecke(k) || zeit - k.zuletztAktiv < 1) return true;
      for (var i = 0; i < kaempfer.length; i++) {
        var o = kaempfer[i];
        if (o.team === tm && !o.tot && abst(o, k) < T * 2.3) return true;
      }
      return false;
    }

    // ---------- Bewegung ----------
    function bewegen(k, dx, dy) {
      var schritte = Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 8) || 1;
      for (var s = 0; s < schritte; s++) {
        k.x += dx / schritte; aufloesen(k);
        k.y += dy / schritte; aufloesen(k);
      }
      k.x = klemm(k.x, k.r, W - k.r); k.y = klemm(k.y, k.r, HH - k.r);
    }
    function aufloesen(k) {
      var r = k.r * (k.gross > 0 ? 1.5 : 1) * 0.85;
      var x0 = Math.floor((k.x - r) / T), x1 = Math.floor((k.x + r) / T), y0 = Math.floor((k.y - r) / T), y1 = Math.floor((k.y + r) / T);
      for (var ty = y0; ty <= y1; ty++) for (var tx = x0; tx <= x1; tx++) {
        var v = fAt(tx, ty);
        if (!blockiertLauf(v)) continue;
        if (k.gross > 0 && (v === 1 || v === 4) && tx >= 0 && ty >= 0 && tx < B && ty < H) { feldWeg(tx, ty); sfx.noise(0.1, 0.12, 600); continue; }
        var nx = klemm(k.x, tx * T, tx * T + T), ny = klemm(k.y, ty * T, ty * T + T);
        var ddx = k.x - nx, ddy = k.y - ny, d2 = ddx * ddx + ddy * ddy;
        if (d2 >= r * r) continue;
        if (d2 === 0) { // Mittelpunkt im Feld: zum nächsten Rand schieben
          var l = k.x - tx * T, rr = tx * T + T - k.x, o = k.y - ty * T, u = ty * T + T - k.y, m = Math.min(l, rr, o, u);
          if (m === l) k.x = tx * T - r; else if (m === rr) k.x = tx * T + T + r; else if (m === o) k.y = ty * T - r; else k.y = ty * T + T + r;
          continue;
        }
        var d = Math.sqrt(d2), push = r - d;
        k.x += ddx / d * push; k.y += ddy / d * push;
      }
    }

    // ---------- Schaden ----------
    function schaden(ziel, menge, von, ohneLadung) {
      if (ziel.tot || ziel.schild > 0 || (ziel.dash && ziel.dash.unverwundbar)) return 0;
      if (von && von.doppelt) { menge *= 2; von.doppelt = false; }
      if (von && von.energie) menge *= 1 + von.energie * 0.1;
      if (von && von.ki && !rangspiel && (ziel.spieler || ziel.mensch)) menge *= ks.schaden;   // Bots treffen Menschen schwächer
      if (von && von.dmgF) menge *= von.dmgF;
      if (von && von.ultra > 0) menge *= 1.2;
      if (ziel.ultra > 0) menge *= 0.75;
      if (von && von.gross > 0) menge *= 1.6;
      if (mod === 'glas' && von && !von.npc) menge *= 1.5;
      menge = Math.round(menge);
      ziel.hp -= menge; ziel.zuletztGetroffen = zeit; ziel.trefferT = 0.12;
      if (von) von.statSchaden += menge;
      if (mod === 'vampir' && von && von !== ziel && von.team !== ziel.team && menge > 0) heilen(von, menge * 0.25);
      if (von && von.team !== ziel.team) ultraLaden(von, menge);
      if (ziel.unsichtbar > 0) ziel.unsichtbar = 0;
      zahl({ x: ziel.x + rnd(-8, 8), y: ziel.y - 40, t: 0, text: String(menge), farbe: ziel === spieler ? '#ff6a6a' : '#fff' });
      if (von && !ohneLadung && von.team !== ziel.team) { von.superLadung = Math.min(von.def.superKosten, von.superLadung + (mod === 'superschnell' ? 2 : 1) * menge / (von.dmgF || 1) * (von.superF || 1)); }
      if (ziel === spieler) wackeln = Math.min(10, wackeln + 4);
      if (ziel.hp <= 0) sterben(ziel, von);
      return menge;
    }
    function ultraLaden(k, menge) {
      if (!k.ultraOk || k.ultra > 0 || k.superLadung < k.def.superKosten) return;
      k.ultraLadung = Math.min(k.def.superKosten * 1.5, k.ultraLadung + menge / (k.dmgF || 1));
    }
    function ultraBereit(k) { return k.ultraOk && !k.tot && k.ultra <= 0 && k.ultraLadung >= k.def.superKosten * 1.5; }
    function ultraZuenden(k) {
      if (!ultraBereit(k) || k.betaeubt > 0) return false;
      k.ultraLadung = 0; k.ultra = 5; k.zuletztAktiv = zeit;
      fx({ art: 'ring', x: k.x, y: k.y, r: 2 * T, t: 0, d: 0.5, farbe: '#c46aff' });
      sfx.tone(330, 0.15, 'sawtooth', 0.07, 990); sfx.tone(990, 0.25, 'square', 0.05, null, 0.12);
      if (k === spieler || k.mensch) zahl({ x: k.x, y: k.y - 70, t: -0.3, text: 'ULTRA!', farbe: '#d89aff' });
      return true;
    }
    function emoteZeigen(k, id) {
      if (!BS.emote(id) || k.tot || (k.emote && k.emote.t > 0.5)) return;
      k.emote = { id: id, t: 2.2 };
      if (host) ev.push(['m', kaempfer.indexOf(k), id]);
    }
    function heilen(k, menge) { if (k.tot) return; k.hp = Math.min(k.maxHp, k.hp + menge); zahl({ x: k.x, y: k.y - 44, t: 0, text: '+' + Math.round(menge), farbe: '#6ef08a' }); }

    function feedPlus(von, k) {
      var e = { a: von ? kaempfer.indexOf(von) : -1, b: kaempfer.indexOf(k), t: 4.5, art: von ? '' : (k.durchMeteor ? 'meteor' : 'gas') };
      feed.unshift(e); feed = feed.slice(0, 5);
      if (host) ev.push(['kf', e.a, e.b, e.art]);
    }
    function sterben(k, von) {
      if (k.npc !== 'monster') feedPlus(von, k);
      fx({ art: 'geist', ki: kaempfer.indexOf(k), x: k.x, y: k.y, t: 0, d: 0.9, links: Math.cos(k.blick) < 0 });
      k.statTode++;
      k.tot = true; k.hp = 0; k.dash = null; k.stoss = null; k.salve = [];
      for (var i = 0; i < 14; i++) fx({ art: 'splitter', x: k.x, y: k.y - 14, vx: rnd(-200, 200), vy: rnd(-260, 80), t: 0, d: 0.7, farbe: k.def.farbe });
      sfx.tone(300, 0.3, 'sawtooth', 0.07, 80);
      if (von && von !== k) { von.kos++; if (von === spieler) { sfx.tone(880, 0.12, 'square', 0.07); sfx.tone(1320, 0.15, 'square', 0.06, null, 0.1); } }
      if (modus === 'sterne' && k.sterne > 0) {
        for (var s = 0; s < k.sterne; s++) { var w = rnd(0, Math.PI * 2), v = rnd(60, 200); sterne.push({ x: k.x, y: k.y, vx: Math.cos(w) * v, vy: Math.sin(w) * v, sperre: 0.6 }); }
        k.sterne = 0;
      }
      if ((modus === 'kloppe' || gross) && von && von.team !== k.team) teamKos[von.team]++;
      if (modus === 'kopfgeld' && von && von.team !== k.team) {
        teamKopf[von.team] += k.kopfgeld;
        zahl({ x: k.x, y: k.y - 60, t: -0.2, text: '+' + k.kopfgeld + ' ★', farbe: '#ffd23f' });
        von.kopfgeld = Math.min(7, von.kopfgeld + 1); k.kopfgeld = 2;
      }
      if (von && von !== k && !von.spieler && !von.mensch && Math.random() < 0.25) emoteZeigen(von, Math.random() < 0.5 ? 'gg' : 'haha');
      if (royaleArt) {
        for (var e = 0; e < Math.max(1, k.energie); e++) energie.push({ x: k.x + rnd(-14, 14), y: k.y + rnd(-14, 14) });
        if (duo) {
          var teamLebt = kaempfer.some(function (o) { return o.team === k.team && !o.tot; });
          if (!teamLebt) {
            var teamsLebend = {}; kaempfer.forEach(function (o) { if (!o.tot) teamsLebend[o.team] = 1; });
            var pl = Object.keys(teamsLebend).length + 1;
            kaempfer.forEach(function (o) { if (o.team === k.team) o.platz = pl; });
          }
        } else k.platz = kaempfer.filter(function (o) { return !o.tot; }).length + 1;
      } else k.respawn = training && !k.spieler ? 2 : koop ? 4 : 3;
      if (k.npc) { k.respawn = 1e9; k.weg = true; if (k.npc === 'boss') abschluss(0); }
    }

    // ---------- Angriffe ----------
    function zielPunkt(k, w, dist) { return { x: k.x + Math.cos(w) * dist, y: k.y + Math.sin(w) * dist }; }

    function angreifen(k, w, dist) {
      if (k.tot || k.betaeubt > 0 || k.verliebt > 0 || k.dash) return false;
      if (ball && ball.traeger === k) return ballSchiessen(k, w, dist);
      if (k.munition < 1) return false;
      var a = k.def.angriff;
      k.munition -= 1; k.blick = w; k.zuletztAktiv = zeit; k.angriffT = 0.15;
      if (k.unsichtbar > 0) k.unsichtbar = 0;
      if (a.art === 'schuss') {
        var n = a.anzahl || 1;
        for (var i = 0; i < n; i++) {
          var ww = w, ox = 0, oy = 0;
          if (a.parallel) { var seite = i === 0 ? -1 : 1; ox = Math.cos(w + Math.PI / 2) * a.parallel * seite; oy = Math.sin(w + Math.PI / 2) * a.parallel * seite; }
          else if (n > 1 && !a.salve) ww = w - a.streuung / 2 + a.streuung * i / (n - 1);
          else if (a.salve) ww = w + rnd(-a.streuung, a.streuung) / 2;
          if (a.salve && i > 0) k.salve.push({ t: a.salve * i, w: ww });
          else schiessen(k, ww, ox, oy);
        }
        sfx.tone(a.look === 'welle' ? 220 : 520, 0.07, 'square', 0.04, a.look === 'welle' ? 140 : 300);
      } else if (a.art === 'wurf') {
        var d = klemm(dist === undefined ? a.reichweite * T : dist, T, a.reichweite * T);
        var z = zielPunkt(k, w, d);
        projektile.push({ wurf: true, sx: k.x, sy: k.y - 16, tx: z.x, ty: z.y, t: 0, T: a.flugzeit, owner: k, team: k.team, schaden: a.schaden, flaeche: a.flaeche * T, look: a.look });
        sfx.tone(400, 0.12, 'triangle', 0.05, 700);
      } else if (a.art === 'nah') {
        nahkampf(k, w, a.reichweite * T, a.breite, a.schaden, k.biss || a.heilt);
        sfx.noise(0.08, 0.15, 900);
      }
      return true;
    }
    function schiessen(k, w, ox, oy) {
      var a = k.def.angriff;
      projektile.push({ x: k.x + (ox || 0) + Math.cos(w) * 14, y: k.y - SH + (oy || 0) + Math.sin(w) * 14, vx: Math.cos(w) * a.tempo, vy: Math.sin(w) * a.tempo,
        weg: 0, max: a.reichweite * T, schaden: a.schaden, r: a.radius, owner: k, team: k.team, look: a.look,
        durch: !!a.durch, getroffen: [], abprall: a.abprall || 0, bremst: a.bremst || 0, w: w });
    }
    function nahkampf(k, w, reich, breite, dmg, heilt) {
      fx({ art: 'hieb', x: k.x, y: k.y - 14, w: w, r: reich, breite: breite, t: 0, d: 0.18, farbe: k.def.angriff.look === 'biss' ? '#ff6a5a' : '#fff' });
      gegnerVon(k).forEach(function (o) {
        var d = abst(k, o); if (d > reich + o.r) return;
        if (Math.abs(winkelDiff(Math.atan2(o.y - k.y, o.x - k.x), w)) > breite / 2 + 0.25) return;
        if (!sichtfrei(k.x, k.y, o.x, o.y)) return;
        var m = schaden(o, dmg, k);
        if (heilt && m) heilen(k, m * heilt);
      });
      tresore.forEach(function (t) {
        if (t.team === k.team) return;
        if (Math.hypot(t.x - k.x, t.y - k.y) > reich + t.r || Math.abs(winkelDiff(Math.atan2(t.y - k.y, t.x - k.x), w)) > breite / 2 + 0.4) return;
        tresorTreffer(t, dmg, k);
      });
      // Kisten zerschlagen
      var z = zielPunkt(k, w, reich * 0.7); kisteTreffen(Math.floor(z.x / T), Math.floor(z.y / T), dmg);
    }
    function kisteTreffen(tx, ty, dmg) {
      var kv = fAt(tx, ty); if (kv !== 4 && kv !== 8) return false;
      var i = ty * B + tx; kistenHp[i] -= dmg;
      fx({ art: 'splitter', x: (tx + 0.5) * T, y: (ty + 0.5) * T, vx: rnd(-80, 80), vy: rnd(-120, 0), t: 0, d: 0.3, farbe: '#b8792e' });
      if (kistenHp[i] <= 0) feldWeg(tx, ty);
      return true;
    }
    function gegnerVon(k) { return kaempfer.filter(function (o) { return o.team !== k.team && !o.tot; }); }

    function tresorTreffer(t, menge, von) {
      if (t.hp <= 0 || ende) return;
      if (von && von.dmgF) menge *= von.dmgF;
      if (von && von.ultra > 0) menge *= 1.2;
      menge = Math.round(menge);
      t.hp -= menge; t.blitz = 0.12;
      if (von) { von.statSchaden += menge; von.superLadung = Math.min(von.def.superKosten, von.superLadung + menge * 0.4 / (von.dmgF || 1)); }
      zahl({ x: t.x + rnd(-10, 10), y: t.y - 40, t: 0, text: String(menge), farbe: '#ffd23f' });
      if (t.hp <= 0) {
        t.hp = 0;
        for (var i = 0; i < 20; i++) fx({ art: 'splitter', x: t.x, y: t.y, vx: rnd(-250, 250), vy: rnd(-300, 50), t: 0, d: 0.9, farbe: i % 2 ? '#ffd23f' : '#8a8e96' });
        sfx.noise(0.6, 0.35, 500); wackeln = 10;
        abschluss(1 - t.team);
      }
    }
    function flaechenSchaden(k, x, y, rad, dmg, extra) {
      tresore.forEach(function (t) { if (t.team !== k.team && Math.hypot(t.x - x, t.y - y) < rad + t.r * 0.6) tresorTreffer(t, dmg, k); });
      gegnerVon(k).forEach(function (o) {
        var d = Math.sqrt((o.x - x) * (o.x - x) + (o.y - y) * (o.y - y));
        if (d > rad + o.r * 0.5) return;
        schaden(o, dmg, k, extra && extra.ohneLadung);
        if (extra && extra.betaeubt) o.betaeubt = Math.max(o.betaeubt, extra.betaeubt);
        if (extra && extra.stoss) { var w = Math.atan2(o.y - y, o.x - x); o.stoss = { vx: Math.cos(w) * extra.stoss, vy: Math.sin(w) * extra.stoss, t: 0.25 }; }
      });
      if (extra && extra.waende) {
        var r = Math.ceil(rad / T);
        for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) {
          var tx = Math.floor(x / T) + dx, ty = Math.floor(y / T) + dy;
          if (tx < 0 || ty < 0 || tx >= B || ty >= H) continue;
          if (Math.hypot((tx + 0.5) * T - x, (ty + 0.5) * T - y) < rad) feldWeg(tx, ty);
        }
      } else {
        var r2 = Math.ceil(rad / T);
        for (var dy2 = -r2; dy2 <= r2; dy2++) for (var dx2 = -r2; dx2 <= r2; dx2++) {
          var tx2 = Math.floor(x / T) + dx2, ty2 = Math.floor(y / T) + dy2;
          if (Math.hypot((tx2 + 0.5) * T - x, (ty2 + 0.5) * T - y) < rad) kisteTreffen(tx2, ty2, dmg);
        }
      }
    }

    // ---------- Supers ----------
    function superZuenden(k, w, dist) {
      if (k.tot || k.betaeubt > 0 || k.verliebt > 0 || k.superLadung < k.def.superKosten || k.dash) return false;
      k.superLadung = 0; k.blick = w; k.zuletztAktiv = zeit; k.statSupers++; k.angriffT = 0.15;
      var maxD = (k.def.superReichweite || 0) * T, d = klemm(dist === undefined ? maxD : dist, T, Math.max(T, maxD)), z = zielPunkt(k, w, d);
      sfx.tone(660, 0.1, 'square', 0.07); sfx.tone(990, 0.18, 'square', 0.06, null, 0.08);
      fx({ art: 'ring', x: k.x, y: k.y, r: 10, t: 0, d: 0.4, farbe: k.def.farbe });
      switch (k.def.superArt) {
        case 'veto':
          projektile.push({ wurf: true, sx: k.x, sy: k.y - 16, tx: z.x, ty: z.y, t: 0, T: 0.75, owner: k, team: k.team, schaden: 45, flaeche: 2.2 * T, look: 'riesenstempel', betaeubt: 1.3 });
          break;
        case 'boot':
          k.dash = { vx: Math.cos(w) * 620, vy: Math.sin(w) * 620, t: 0.48, getroffen: [], schaden: 38, stoss: 520, unverwundbar: true, look: 'boot' };
          sfx.noise(0.5, 0.18, 500);
          break;
        case 'klau':
          projektile.push({ x: k.x, y: k.y - SH, vx: Math.cos(w) * 760, vy: Math.sin(w) * 760, weg: 0, max: maxD, schaden: 30, r: 12, owner: k, team: k.team, look: 'hals', getroffen: [], klau: true, w: w });
          break;
        case 'unsichtbar':
          k.unsichtbar = 4; k.turbo = 4; k.doppelt = true;
          break;
        case 'sandsturm':
          flaechen.push({ x: z.x, y: z.y, r: 2.6 * T, t: 0, d: 5, dps: 14, bremst: true, owner: k, team: k.team, look: 'sand', tick: 0 });
          break;
        case 'schwarzesloch':
          flaechen.push({ x: z.x, y: z.y, r: 2.6 * T, t: 0, d: 3, dps: 18, zug: 230, owner: k, team: k.team, look: 'loch', tick: 0 });
          sfx.tone(120, 0.6, 'sawtooth', 0.06, 40);
          break;
        case 'hunger':
          k.gross = 6; k.schild = 0; heilen(k, 40);
          break;
        case 'natrium':
          projektile.push({ wurf: true, sx: k.x, sy: k.y - 16, tx: z.x, ty: z.y, t: 0, T: 0.8, owner: k, team: k.team, schaden: 55, flaeche: 2.6 * T, look: 'natrium', waende: true, stoss: 300 });
          break;
        case 'dinner':
          for (var i = 0; i < 14; i++) {
            var ww = w + i / 14 * Math.PI * 2;
            projektile.push({ x: k.x, y: k.y - SH, vx: Math.cos(ww) * 520, vy: Math.sin(ww) * 520, weg: 0, max: 6 * T, schaden: 22, r: 9, owner: k, team: k.team, look: 'teller', getroffen: [], w: ww });
          }
          break;
        case 'haarflip':
          flaechenSchaden(k, k.x, k.y, 3 * T, 32, { stoss: 440, betaeubt: 0.8 });
          fx({ art: 'ring', x: k.x, y: k.y, r: 3 * T, t: 0, d: 0.5, farbe: '#ff7ac8' });
          for (var kf = 0; kf < 16; kf++) fx({ art: 'splitter', x: k.x, y: k.y - 30, vx: rnd(-260, 260), vy: rnd(-320, 40), t: 0, d: 0.9, farbe: ['#ff7ac8', '#ffd23f', '#7ae8ff', '#fff'][kf % 4] });
          zahl({ x: k.x, y: k.y - 80, t: -0.3, text: 'SLAY!', farbe: '#ff7ac8' });
          break;
        case 'zungenwirbel':
          flaechen.push({ x: k.x, y: k.y, r: 2.8 * T, t: 0, d: 1.5, dps: 40, zug: 160, folgt: k, owner: k, team: k.team, look: 'zunge', tick: 0 });
          break;
        case 'korbstapel':
          projektile.push({ x: k.x, y: k.y - SH, vx: Math.cos(w) * 480, vy: Math.sin(w) * 480, weg: 0, max: maxD, schaden: 42, r: 20, owner: k, team: k.team,
            look: 'korb', durch: true, getroffen: [], wegstoss: 380, w: w });
          break;
        case 'knie':
          k.dash = { vx: Math.cos(w) * 760, vy: Math.sin(w) * 760, t: Math.min(maxD, d) / 760, getroffen: [], schaden: 48, stoss: 440, unverwundbar: true, look: 'sprint' };
          sfx.noise(0.2, 0.2, 900);
          break;
        case 'moshpit':
          flaechen.push({ x: k.x, y: k.y, r: 2.2 * T, t: 0, d: 3, dps: 26, stoss: 260, folgt: k, owner: k, team: k.team, look: 'mosh', tick: 0 });
          wackeln = Math.max(wackeln, 3);
          break;
        case 'charme':
          projektile.push({ x: k.x, y: k.y - SH, vx: Math.cos(w) * 650, vy: Math.sin(w) * 650, weg: 0, max: maxD, schaden: 25, r: 13, owner: k, team: k.team, look: 'grossherz', getroffen: [], charme: 2, w: w });
          break;
        case 'klosprint':
          var sd = Math.min(d, maxD);
          k.dash = { vx: Math.cos(w) * 900, vy: Math.sin(w) * 900, t: sd / 900, getroffen: [], schaden: 0, stoss: 0, unverwundbar: true, look: 'sprint',
            ende: function () { flaechenSchaden(k, k.x, k.y, 1.7 * T, 32, { stoss: 380 }); heilen(k, 40); fx({ art: 'ring', x: k.x, y: k.y, r: 1.7 * T, t: 0, d: 0.35, farbe: '#3ab0e8' }); wackeln = Math.max(wackeln, 5); } };
          break;
        case 'lernnie':
          k.schild = 3;
          zahl({ x: k.x, y: k.y - 60, t: -0.4, text: 'DIGGA, ICH LERN NIE', farbe: '#d8c8ff' });
          break;
        case 'aura':
          flaechenSchaden(k, k.x, k.y, 3.2 * T, 22, { betaeubt: 1.6 });
          fx({ art: 'ring', x: k.x, y: k.y, r: 3.2 * T, t: 0, d: 0.5, farbe: '#ffd23f' });
          zahl({ x: k.x, y: k.y - 60, t: -0.4, text: 'MOG!', farbe: '#ffd23f' });
          wackeln = Math.max(wackeln, 4);
          break;
      }
      return true;
    }

    // ---------- Modus-Zustand ----------
    var zeit = 0, ende = null, dauer = modus === 'sterne' || modus === 'ball' || modus === 'huegel' ? 150 : modus === 'kloppe' ? 120 : 9999;
    var ball = modus === 'ball' ? { x: 0, y: 0, vx: 0, vy: 0, traeger: null, sperre: 0, kicker: null } : null;
    var tore = [0, 0], torAnsage = 0, torTeam = 0, TOR_X0 = 8 * T, TOR_X1 = 13 * T;
    var huegel = [0, 0], huegelHalter = -1, ZONE_R = 2.6 * T;
    var teamKopf = [0, 0];
    var welle = 0, wellenPause = 3, WELLEN = 8;
    var zonen = eroberung ? [{ x: 4.5 * T, y: HH / 2, f: 0, besitzer: -1 }, { x: W / 2, y: HH / 2, f: 0, besitzer: -1 }, { x: W - 4.5 * T, y: HH / 2, f: 0, besitzer: -1 }] : [], zonenPunkte = [0, 0], ZONE = 1.7 * T;
    var tresore = modus === 'wellen' ? [{ team: 0, x: W / 2, y: HH - 3.5 * T, r: 26, hp: 1600, max: 1600, blitz: 0, glocke: true }] : modus === 'tresor' ? [{ team: 0, x: W / 2, y: HH - 3.5 * T, r: 30, hp: 2600, max: 2600, blitz: 0 }, { team: 1, x: W / 2, y: 3.5 * T, r: 30, hp: 2600, max: 2600, blitz: 0 }] : [];
    if (modus === 'kopfgeld') dauer = 120;
    if (modus === 'boss') dauer = 180;
    if (modus === 'wellen') dauer = 9999;
    if (gross) dauer = 150;
    if (eroberung) dauer = 150;
    if (modus === 'tresor') dauer = 150;
    if (!royaleArt) dauer = Math.round(dauer * zeitFaktor);
    if (training) dauer = 9999;
    var pilze = [], pilzT = 6, meteore = [], meteorT = 12, feed = [];
    var sternT = 3, sternCountdown = null, sternTeam = -1, teamKos = [0, 0];
    var gas = { r: Math.hypot(W, HH) / 2 + T, ziel: T * 3, start: 20, dauer: 100 };

    function teamSterne(tm) { var s = 0; kaempfer.forEach(function (k) { if (k.team === tm && !k.tot) s += k.sterne; }); return s; }

    function ballSchiessen(k, w, dist) {
      var kraft = klemm((dist || 6 * T) / (7 * T), 0.35, 1) * 820 + 160;
      ball.traeger = null; ball.kicker = k; ball.sperre = 0.35;
      ball.vx = Math.cos(w) * kraft; ball.vy = Math.sin(w) * kraft;
      k.blick = w; k.zuletztAktiv = zeit;
      sfx.noise(0.08, 0.2, 1400); sfx.tone(180, 0.08, 'square', 0.05, 90);
      return true;
    }
    function ballZurueck() {
      ball.x = W / 2; ball.y = HH / 2; ball.vx = ball.vy = 0; ball.traeger = null; ball.sperre = 0; ball.kicker = null;
    }
    function ballSchritt(dt) {
      var b = ball;
      if (b.traeger) {
        var t = b.traeger;
        if (t.tot || t.betaeubt > 0 || t.verliebt > 0) { b.traeger = null; b.kicker = t; b.sperre = 0.6; b.vx = rnd(-90, 90); b.vy = rnd(-90, 90); }
        else { b.x = t.x + Math.cos(t.blick) * 16; b.y = t.y + 2 + Math.sin(t.blick) * 10; b.vx = b.vy = 0; }
      }
      if (!b.traeger) {
        b.sperre -= dt;
        var nx = b.x + b.vx * dt, ny = b.y + b.vy * dt, imTor = nx > TOR_X0 && nx < TOR_X1;
        if (blockiertSchuss(fPx(nx, b.y)) || nx < 8 || nx > W - 8) b.vx = -b.vx * 0.7; else b.x = nx;
        if ((ny > 0 && ny < HH && blockiertSchuss(fPx(b.x, ny))) || (!imTor && (ny < 8 || ny > HH - 8))) b.vy = -b.vy * 0.7; else b.y = ny;
        var reib = Math.pow(0.3, dt); b.vx *= reib; b.vy *= reib;
        for (var i = 0; i < kaempfer.length; i++) {
          var k = kaempfer[i];
          if (k.tot || k.betaeubt > 0 || k.verliebt > 0 || (b.sperre > 0 && k === b.kicker)) continue;
          if (Math.hypot(k.x - b.x, k.y - b.y) < k.r + 14) { b.traeger = k; if (k === spieler) sfx.tone(700, 0.05, 'square', 0.04); break; }
        }
      }
      if (b.x > TOR_X0 && b.x < TOR_X1 && (b.y < T * 0.45 || b.y > HH - T * 0.45)) {
        var tm = b.y < T * 0.45 ? 0 : 1, schuetze = b.traeger || b.kicker;
        if (schuetze && schuetze.team === tm) schuetze.statTore++;
        tore[tm]++; torAnsage = 2.2; torTeam = tm;
        fx({ art: 'ring', x: b.x, y: b.y, r: 3 * T, t: 0, d: 0.6, farbe: '#fff' });
        sfx.tone(523, 0.12, 'square', 0.07); sfx.tone(784, 0.25, 'square', 0.07, null, 0.12);
        if (tore[tm] >= 2) return abschluss(tm);
        kaempfer.forEach(function (k) {
          var sp = spawnPunkt(k); k.x = sp.x; k.y = sp.y; k.dash = null; k.stoss = null; k.verliebt = 0;
          if (k.tot) { k.tot = false; k.hp = k.maxHp; k.munition = 3; }
        });
        ballZurueck();
      }
    }

    // ---------- Tricks ----------
    function trickAusloesen(k, w, d) {
      if (k.tot || k.betaeubt > 0 || k.verliebt > 0 || k.tricks <= 0 || k.trickT > 0 || k.dash) return false;
      k.tricks--; k.trickT = 4; k.zuletztAktiv = zeit;
      fx({ art: 'ring', x: k.x, y: k.y, r: 30, t: 0, d: 0.3, farbe: '#6ef08a' });
      sfx.tone(520, 0.06, 'triangle', 0.06, 1040);
      if (k === spieler || k.mensch) zahl({ x: k.x, y: k.y - 64, t: -0.3, text: (k.trickName || '').toUpperCase(), farbe: '#9affb0' });
      switch (k.trickArt) {
        case 'schild': k.schild = Math.max(k.schild, 1.5); break;
        case 'nachladen': k.munition = 3; k.ladeT = 0; break;
        case 'ring': heilen(k, k.maxHp * 0.35); break;
        case 'borschtsch': heilen(k, k.maxHp * 0.4); break;
        case 'flasche': heilen(k, k.maxHp * 0.25); k.turbo = 2; break;
        case 'klopapier': k.turbo = 3; break;
        case 'spickzettel': k.doppelt = true; break;
        case 'rueckzug': k.dash = { vx: -Math.cos(w) * 700, vy: -Math.sin(w) * 700, t: 0.17, getroffen: [], schaden: 0, stoss: 0, unverwundbar: true, look: 'sprint' }; break;
        case 'sprung': k.dash = { vx: Math.cos(w) * 900, vy: Math.sin(w) * 900, t: 0.13, getroffen: [], schaden: 0, stoss: 0, unverwundbar: true, look: 'sprint' }; break;
        case 'rauch': flaechen.push({ x: k.x, y: k.y, r: 2.2 * T, t: 0, d: 3, dps: 0, bremst: true, owner: k, team: k.team, look: 'rauch', tick: 0 }); break;
        case 'stagedive':
          var sd = klemm(d || 4 * T, T, 4 * T);
          k.dash = { vx: Math.cos(w) * 800, vy: Math.sin(w) * 800, t: sd / 800, getroffen: [], schaden: 0, stoss: 0, unverwundbar: true, look: 'sprint',
            ende: function () { flaechenSchaden(k, k.x, k.y, 1.4 * T, 20, { stoss: 320 }); fx({ art: 'ring', x: k.x, y: k.y, r: 1.4 * T, t: 0, d: 0.3, farbe: '#c81e2a' }); } };
          break;
        case 'magnetfeld':
          flaechenSchaden(k, k.x, k.y, 2.6 * T, 12, { stoss: 460 });
          fx({ art: 'ring', x: k.x, y: k.y, r: 2.6 * T, t: 0, d: 0.4, farbe: '#5af0ff' });
          break;
        case 'strauss':
          kaempfer.forEach(function (o) { if (o.team === k.team && !o.tot && abst(o, k) < 3 * T) heilen(o, 30); });
          fx({ art: 'ring', x: k.x, y: k.y, r: 3 * T, t: 0, d: 0.4, farbe: '#ff8ab0' });
          break;
        case 'goldregen':
          for (var i = 0; i < 10; i++) {
            var ww = i / 10 * Math.PI * 2;
            projektile.push({ x: k.x, y: k.y - SH, vx: Math.cos(ww) * 560, vy: Math.sin(ww) * 560, weg: 0, max: 4 * T, schaden: 13, r: 7, owner: k, team: k.team, look: 'gold', getroffen: [], w: ww });
          }
          break;
      }
      return true;
    }

    function modSchritt(dt) {
      if (mod === 'heilpilze') {
        pilzT -= dt;
        if (pilzT <= 0 && pilze.length < 4) {
          pilzT = 8;
          for (var v = 0; v < 30; v++) {
            var tx = Math.floor(rnd(1, B - 1)), ty = Math.floor(rnd(2, H - 2));
            if (fAt(tx, ty) === 0) { pilze.push({ x: (tx + 0.5) * T, y: (ty + 0.5) * T }); break; }
          }
        }
        for (var i = pilze.length - 1; i >= 0; i--) {
          var pz = pilze[i];
          for (var j = 0; j < kaempfer.length; j++) {
            var k = kaempfer[j];
            if (!k.tot && Math.hypot(k.x - pz.x, k.y - pz.y) < k.r + 14) { heilen(k, k.maxHp * 0.35); pilze.splice(i, 1); sfx.tone(600, 0.1, 'triangle', 0.05, 1200); break; }
          }
        }
      }
      if (mod === 'meteore' && zeit > 8) {
        meteorT -= dt;
        if (meteorT <= 0) {
          meteorT = rnd(2.2, 3.6);
          var opfer = kaempfer.filter(function (o) { return !o.tot; });
          if (opfer.length) { var o = opfer[Math.floor(Math.random() * opfer.length)]; meteore.push({ x: klemm(o.x + rnd(-2, 2) * T, T, W - T), y: klemm(o.y + rnd(-2, 2) * T, T, HH - T), t: 0 }); }
        }
        for (var m = meteore.length - 1; m >= 0; m--) {
          var me = meteore[m]; me.t += dt;
          if (me.t >= 1.3) {
            kaempfer.forEach(function (o) { if (!o.tot && Math.hypot(o.x - me.x, o.y - me.y) < 1.4 * T + o.r * 0.5) { o.durchMeteor = true; schaden(o, 38, null); o.durchMeteor = false; } });
            fx({ art: 'boom', x: me.x, y: me.y, r: 1.4 * T, t: 0, d: 0.4, farbe: '#ff8a2a' });
            sfx.noise(0.3, 0.25, 600); wackeln = Math.max(wackeln, 4);
            meteore.splice(m, 1);
          }
        }
      }
    }
    function modusSchritt(dt) {
      modSchritt(dt);
      // Online ohne Bots: hat ein Team niemanden mehr, gewinnt das andere
      if (host && team && !training && !koop && zeit > 1) {
        for (var tt = 0; tt < 2; tt++) if (!kaempfer.some(function (k) { return k.team === tt && !k.weg; })) return abschluss(1 - tt);
      }
      if (ball) { if (!ball.da) { ball.da = true; ballZurueck(); } if (torAnsage > 0) torAnsage -= dt; }
      if (modus === 'sterne') {
        sternT -= dt;
        var imSpiel = sterne.length + teamSterne(0) + teamSterne(1);
        if (sternT <= 0 && imSpiel < 29) {
          sternT = 7; var w = rnd(0, Math.PI * 2);
          sterne.push({ x: W / 2, y: HH / 2, vx: Math.cos(w) * 70, vy: Math.sin(w) * 70, sperre: 0.3, neu: 0 });
          sfx.tone(1200, 0.08, 'triangle', 0.04); sfx.tone(1600, 0.1, 'triangle', 0.04, null, 0.06);
        }
        var a = teamSterne(0), b = teamSterne(1), fuehrt = a >= 10 && a > b ? 0 : b >= 10 && b > a ? 1 : -1;
        if (fuehrt !== sternTeam) { sternTeam = fuehrt; sternCountdown = fuehrt >= 0 ? 15 : null; }
        if (sternCountdown !== null) {
          var vorher = Math.ceil(sternCountdown);
          sternCountdown -= dt;
          if (Math.ceil(sternCountdown) !== vorher) sfx.tone(fuehrt === 0 ? 700 : 300, 0.08, 'square', 0.05);
          if (sternCountdown <= 0) return abschluss(fuehrt);
        }
        if (zeit >= dauer) return abschluss(a > b ? 0 : a < b ? 1 : -1);
      } else if (modus === 'ball') {
        ballSchritt(dt);
        if (ende) return;
        if (zeit >= dauer) return abschluss(tore[0] > tore[1] ? 0 : tore[0] < tore[1] ? 1 : -1);
      } else if (modus === 'huegel') {
        var drin = [0, 0];
        kaempfer.forEach(function (k) { if (!k.tot && Math.hypot(k.x - W / 2, k.y - HH / 2) < ZONE_R) drin[k.team]++; });
        huegelHalter = drin[0] && !drin[1] ? 0 : drin[1] && !drin[0] ? 1 : drin[0] ? -2 : -1;
        if (huegelHalter >= 0) {
          huegel[huegelHalter] = Math.min(100, huegel[huegelHalter] + dt * 1.5);
          if (huegel[huegelHalter] >= 100) return abschluss(huegelHalter);
        }
        if (zeit >= dauer) return abschluss(huegel[0] > huegel[1] ? 0 : huegel[0] < huegel[1] ? 1 : -1);
      } else if (modus === 'tresor') {
        tresore.forEach(function (t) { if (t.blitz > 0) t.blitz -= dt; });
        if (zeit >= dauer) { var a0 = tresore[0].hp / tresore[0].max, a1 = tresore[1].hp / tresore[1].max; return abschluss(a0 > a1 ? 0 : a0 < a1 ? 1 : -1); }
      } else if (modus === 'kopfgeld') {
        if (zeit >= dauer) return abschluss(teamKopf[0] > teamKopf[1] ? 0 : teamKopf[0] < teamKopf[1] ? 1 : -1);
      } else if (training) {
        return;
      } else if (modus === 'boss') {
        if (zeit >= dauer) return abschluss(1);
      } else if (modus === 'wellen') {
        tresore.forEach(function (t) { if (t.blitz > 0) t.blitz -= dt; });
        var lebendeMonster = kaempfer.filter(function (k) { return k.npc && !k.tot; }).length;
        if (!lebendeMonster) {
          wellenPause -= dt;
          if (wellenPause <= 0) {
            if (welle >= WELLEN) return abschluss(0);
            welle++; wellenPause = 4;
            var anzahl = Math.min(22, 3 + welle * 2), pool = kaempfer.filter(function (k) { return k.npc === 'monster'; });
            for (var wi = 0; wi < anzahl && wi < pool.length; wi++) {
              var mo = pool[wi], ziel = freiesFeld(Math.floor(rnd(2, B - 2)), Math.floor(rnd(1, 5)));
              mo.tot = false; mo.weg = false; mo.hp = mo.maxHp = 70 + welle * 16; mo.x = ziel.x; mo.y = ziel.y; mo.spawnT = 0.45; mo.betaeubt = 0; mo.stoss = null;
            }
            sfx.tone(440, 0.15, 'square', 0.06); sfx.tone(330, 0.2, 'square', 0.06, null, 0.15);
          }
        }
      } else if (eroberung) {
        zonen.forEach(function (z) {
          var drin = [0, 0];
          kaempfer.forEach(function (k) { if (!k.tot && Math.hypot(k.x - z.x, k.y - z.y) < ZONE) drin[k.team]++; });
          if (drin[0] && !drin[1]) z.f = Math.min(100, z.f + dt * 40);
          if (drin[1] && !drin[0]) z.f = Math.max(-100, z.f - dt * 40);
          if (z.f >= 100) z.besitzer = 0; else if (z.f <= -100) z.besitzer = 1; else if ((z.besitzer === 0 && z.f <= 0) || (z.besitzer === 1 && z.f >= 0)) z.besitzer = -1;
          if (z.besitzer >= 0) zonenPunkte[z.besitzer] += dt;
        });
        if (zonenPunkte[0] >= 100 || zonenPunkte[1] >= 100) return abschluss(zonenPunkte[0] >= zonenPunkte[1] ? 0 : 1);
        if (zeit >= dauer) return abschluss(zonenPunkte[0] > zonenPunkte[1] ? 0 : zonenPunkte[0] < zonenPunkte[1] ? 1 : -1);
      } else if (modus === 'kloppe' || gross) {
        var kosZiel = gross ? 15 : 10;
        if (teamKos[0] >= kosZiel) return abschluss(0);
        if (teamKos[1] >= kosZiel) return abschluss(1);
        if (zeit >= dauer) return abschluss(teamKos[0] > teamKos[1] ? 0 : teamKos[0] < teamKos[1] ? 1 : -1);
      } else {
        var f = klemm((zeit - gas.start) / gas.dauer, 0, 1);
        gas.r = (Math.hypot(W, HH) / 2 + T) * (1 - f) + gas.ziel * f;
        kaempfer.forEach(function (k) {
          if (k.tot) return;
          if (Math.hypot(k.x - W / 2, k.y - HH / 2) > gas.r) {
            k.gasT = (k.gasT || 0) + dt;
            if (k.gasT >= 0.5) { k.gasT = 0; schaden(k, 9 + Math.floor(zeit / 30) * 3, null); k.zuletztGetroffen = zeit; }
          }
        });
        var lebend = kaempfer.filter(function (k) { return !k.tot; });
        var menschTeams = {}; kaempfer.forEach(function (k) { if (k === spieler || k.mensch) menschTeams[k.team] = 1; });
        var menschDa = lebend.some(function (k) { return menschTeams[k.team]; });
        var teamsLebend = {}; lebend.forEach(function (k) { teamsLebend[k.team] = 1; });
        if (Object.keys(teamsLebend).length <= 1 || !menschDa) {
          if (Object.keys(teamsLebend).length === 1) kaempfer.forEach(function (k) { if (teamsLebend[k.team]) k.platz = 1; });
          return abschluss(-1);
        }
      }
    }

    // ---------- Bot-Gehirn ----------
    function partnerWeit(k) {
      var p = kaempfer.filter(function (o) { return o.team === k.team && o !== k && !o.tot; })[0];
      return p && abst(p, k) > 5 * T ? p : null;
    }
    function npcSchritt(k, dt) {
      var ki = k.ki; ki.schussT -= dt;
      var ziel = null, zd = 1e9;
      kaempfer.forEach(function (o) { if (o.team !== k.team && !o.tot) { var d0 = abst(k, o); if (d0 < zd) { zd = d0; ziel = o; } } });
      var mx = 0, my = 0;
      if (k.npc === 'boss') {
        if (ziel) {
          var bw = Math.atan2(ziel.y - k.y, ziel.x - k.x);
          if (zd > 5 * T) { var rw = wegRichtung(k, ziel.x, ziel.y); mx = Math.cos(rw); my = Math.sin(rw); }
          else { mx = Math.cos(bw + Math.PI / 2) * 0.6; my = Math.sin(bw + Math.PI / 2) * 0.6; }
          k.blick = bw;
          var wut = k.hp < k.maxHp * 0.5;
          if (ki.schussT <= 0 && zd < 8.5 * T && sichtfrei(k.x, k.y, ziel.x, ziel.y)) { ki.schussT = wut ? 0.8 : 1.3; k.munition = 3; angreifen(k, bw, zd); }
          ki.spezialT -= dt;
          if (ki.spezialT <= 0) {
            ki.spezialT = wut ? 4 : 6.5;
            kaempfer.filter(function (o) { return o.team !== k.team && !o.tot; }).slice(0, 4).forEach(function (o) {
              projektile.push({ wurf: true, sx: k.x, sy: k.y - 40, tx: o.x, ty: o.y, t: 0, T: 1, owner: k, team: k.team, schaden: 28, flaeche: 1.5 * T, look: 'eimer' });
            });
            zahl({ x: k.x, y: k.y - 110, t: -0.3, text: 'WISCHEIMER!', farbe: '#ffd23f' });
            sfx.tone(200, 0.25, 'square', 0.06, 120);
          }
        }
        return { mx: mx, my: my };
      }
      // Kreideklecks: Spieler in der Nähe angreifen, sonst zur Glocke
      var glocke = tresore[0];
      var zx = glocke ? glocke.x : W / 2, zy = glocke ? glocke.y : HH / 2, aufGlocke = true;
      if (ziel && zd < 4.5 * T) { zx = ziel.x; zy = ziel.y; aufGlocke = false; }
      var dz = Math.hypot(zx - k.x, zy - k.y), reich = k.def.angriff.reichweite * T + (aufGlocke ? glocke.r : ziel.r);
      var zw = Math.atan2(zy - k.y, zx - k.x); k.blick = zw;
      if (dz > reich * 0.8) { var rw2 = wegRichtung(k, zx, zy); mx = Math.cos(rw2); my = Math.sin(rw2); }
      if (dz < reich && ki.schussT <= 0) { ki.schussT = 0.9; k.munition = 3; angreifen(k, zw, dz); }
      return { mx: mx, my: my };
    }
    function kiSchritt(k, dt) {
      if (k.npc) return npcSchritt(k, dt);
      var ki = k.ki, a = k.def.angriff;
      var reich = (a.art === 'nah' ? a.reichweite : a.reichweite) * T;
      ki.denk -= dt; ki.seiteT -= dt;
      if (ki.seiteT <= 0) { ki.seiteT = rnd(0.6, 1.6) / Math.max(0.5, ks.seite + 0.3); ki.seite = -ki.seite; }
      if (ki.denk <= 0) {
        ki.denk = rnd(0.7, 1.3) * ks.denk;
        // nächsten sichtbaren Gegner suchen
        var best = null, bd = 1e9;
        kaempfer.forEach(function (o) {
          if (o.team === k.team || o.tot || !sichtbarFuer(o, k.team)) return;
          var d = abst(k, o); if (d < bd && d < T * ks.sicht) { bd = d; best = o; }
        });
        ki.ziel = best;
      }
      var z = ki.ziel && !ki.ziel.tot ? ki.ziel : null;
      var d = z ? abst(k, z) : 1e9;
      var wohin = null, wunschAbst = a.art === 'nah' ? 0 : reich * 0.7;
      var schwach = k.hp < k.maxHp * 0.35;

      if (royaleArt && Math.hypot(k.x - W / 2, k.y - HH / 2) > gas.r - T * 2.5) wohin = { x: W / 2, y: HH / 2 };
      else if (modus === 'sterne') {
        var meinTeam = teamSterne(k.team), andere = teamSterne(1 - k.team);
        if (k.sterne >= 3 && (schwach || (meinTeam >= 10 && meinTeam > andere))) wohin = spawnPunkt(k);
        else if (sterne.length && (!z || d > T * 4)) {
          var ns = null, nd = 1e9;
          sterne.forEach(function (s) { var dd = abst(k, s); if (dd < nd) { nd = dd; ns = s; } });
          if (nd < T * 14) wohin = ns;
        }
        if (!wohin && !z) wohin = { x: W / 2, y: HH / 2 + (k.team === 0 ? T * 2 : -T * 2) };
      } else if (duo && !z && partnerWeit(k)) {
        wohin = partnerWeit(k);
      } else if (royaleArt && !z) {
        var ne = null, ned = 1e9;
        energie.forEach(function (e) { var dd = abst(k, e); if (dd < ned) { ned = dd; ne = e; } });
        if (ne && ned < T * 10) wohin = ne;
        else {
          // nächste Kiste ansteuern und zerschlagen
          var kx = Math.floor(k.x / T), ky = Math.floor(k.y / T), kb = null, kd = 1e9;
          for (var yy = Math.max(0, ky - 8); yy < Math.min(H, ky + 9); yy++) for (var xx = Math.max(0, kx - 8); xx < Math.min(B, kx + 9); xx++) {
            if (feld[yy * B + xx] !== 4) continue;
            var dk = Math.abs(xx - kx) + Math.abs(yy - ky); if (dk < kd) { kd = dk; kb = { x: (xx + 0.5) * T, y: (yy + 0.5) * T }; }
          }
          if (kb) {
            var dkist = abst(k, kb);
            if (dkist < reich * 0.9 && sichtfrei(k.x, k.y, kb.x, kb.y) || dkist < T * 1.6) {
              if (k.munition >= 1 && ki.schussT <= 0) { ki.schussT = rnd(0.35, 0.7); angreifen(k, Math.atan2(kb.y - k.y, kb.x - k.x), dkist); }
            } else wohin = kb;
          } else wohin = { x: W / 2, y: HH / 2 };
        }
      } else if (koop && !z) {
        var bo = kaempfer.filter(function (o) { return o.npc && !o.tot; })[0];
        wohin = modus === 'boss' && bo ? bo : { x: W / 2 + Math.cos(kaempfer.indexOf(k) * 2) * 2.5 * T, y: HH - 5.5 * T };
      } else if (eroberung && (!z || d > 4 * T)) {
        var bz = null, bd = 1e9;
        zonen.forEach(function (zo) { var wert = Math.hypot(zo.x - k.x, zo.y - k.y) + (zo.besitzer === k.team ? 8 * T : 0); if (wert < bd) { bd = wert; bz = zo; } });
        if (bz) wohin = { x: bz.x + Math.cos(kaempfer.indexOf(k)) * T * 0.6, y: bz.y + Math.sin(kaempfer.indexOf(k)) * T * 0.6 };
      } else if ((modus === 'kloppe' || gross) && !z) wohin = { x: W / 2 + Math.sin(zeit * 0.3 + kaempfer.indexOf(k)) * T * 4, y: HH / 2 };

      if (modus === 'ball') {
        var torY = k.team === 0 ? T * 0.2 : HH - T * 0.2;
        if (ball.traeger === k) {
          var dTor = Math.hypot(W / 2 - k.x, torY - k.y);
          if (dTor < T * 6.5 && sichtfrei(k.x, k.y, W / 2, torY) && ki.schussT <= 0) { ki.schussT = 0.6; ballSchiessen(k, Math.atan2(torY - k.y, W / 2 - k.x) + rnd(-0.12, 0.12), dTor); }
          wohin = { x: W / 2, y: torY };
        } else if (!ball.traeger) { if (!z || abst(k, ball) < d + T * 2) wohin = ball; }
        else if (ball.traeger.team !== k.team) { if (sichtbarFuer(ball.traeger, k.team)) { z = ki.ziel = ball.traeger; d = abst(k, z); } }
        else if (!z) wohin = { x: ball.x, y: ball.y + (k.team === 0 ? T * 2.5 : -T * 2.5) };
      } else if (modus === 'huegel') {
        var dz = Math.hypot(k.x - W / 2, k.y - HH / 2);
        if ((!z || d > T * 5) && dz > ZONE_R * 0.5) wohin = { x: W / 2 + Math.cos(kaempfer.indexOf(k)) * T, y: HH / 2 + Math.sin(kaempfer.indexOf(k)) * T };
      }
      if (modus === 'tresor') {
        var meiner = tresore[k.team], fremd = tresore[1 - k.team];
        var stoerer = gegnerVon(k).filter(function (o) { return Math.hypot(o.x - meiner.x, o.y - meiner.y) < 6 * T && sichtbarFuer(o, k.team); })[0];
        var verteidiger = kaempfer.filter(function (o) { return o.team === k.team; })[0] === k;
        if (stoerer && (verteidiger || Math.hypot(k.x - meiner.x, k.y - meiner.y) < 8 * T)) { z = ki.ziel = stoerer; d = abst(k, z); }
        else if (!z || d > T * 4.5) {
          var dT = Math.hypot(fremd.x - k.x, fremd.y - k.y);
          if (verteidiger && !stoerer) wohin = { x: meiner.x + Math.sin(zeit) * T * 2, y: meiner.y + (k.team === 0 ? -T * 2.5 : T * 2.5) };
          else if (dT < reich * 0.9 && (a.art === 'wurf' || sichtfrei(k.x, k.y, fremd.x, fremd.y))) {
            if (k.munition >= 1 && ki.schussT <= 0) { ki.schussT = rnd(0.3, 0.6); angreifen(k, Math.atan2(fremd.y - k.y, fremd.x - k.x), dT); }
            if (k.superLadung >= k.def.superKosten) superZuenden(k, Math.atan2(fremd.y - k.y, fremd.x - k.x), dT);
          } else wohin = fremd;
        }
      }
      if (training) return { mx: 0, my: 0 };
      if (schwach && z && d < T * 6 && !royaleArt && !(ball && ball.traeger === k)) wohin = spawnPunkt(k);

      var mx = 0, my = 0;
      if (wohin) {
        var rw = wegRichtung(k, wohin.x, wohin.y);
        if (abst(k, wohin) > 10) { mx = Math.cos(rw); my = Math.sin(rw); }
      } else if (z) {
        var zw = Math.atan2(z.y - k.y, z.x - k.x), frei = sichtfrei(k.x, k.y, z.x, z.y);
        if (!frei && a.art !== 'wurf' || d > reich * 0.95) { var rw2 = wegRichtung(k, z.x, z.y); mx = Math.cos(rw2); my = Math.sin(rw2); }
        else if (d < wunschAbst * 0.7) { mx = -Math.cos(zw); my = -Math.sin(zw); }
        else if (a.art === 'nah') { mx = Math.cos(zw); my = Math.sin(zw); }
        mx += Math.cos(zw + Math.PI / 2) * ki.seite * ks.seite; my += Math.sin(zw + Math.PI / 2) * ki.seite * ks.seite;
      }
      var len = Math.hypot(mx, my);
      if (len > 0) { mx /= len; my /= len; }

      // schießen
      ki.schussT -= dt;
      if (z) {
        var frei2 = a.art === 'wurf' || sichtfrei(k.x, k.y, z.x, z.y);
        // Vorhalt: wohin der Gegner gleich läuft
        var flug = a.art === 'wurf' ? a.flugzeit : d / (a.tempo || 1000);
        var px = z.x + (z.vx || 0) * flug * ks.vorhalt, py = z.y + (z.vy || 0) * flug * ks.vorhalt;
        var fehler = rangspiel ? 0.05 : ks.fehler;
        var zielW = Math.atan2(py - k.y, px - k.x) + rnd(-fehler, fehler);
        var mitBall = ball && ball.traeger === k;
        if (k.tricks > 0 && k.trickT <= 0 && d < reich * 1.2 && Math.random() < dt * ks.trick) {
          var heil = ['ring', 'flasche', 'borschtsch', 'strauss', 'schild'].indexOf(k.trickArt) >= 0;
          if (!heil || k.hp < k.maxHp * 0.5) trickAusloesen(k, zielW, d);
        }
        if (!mitBall && frei2 && d < reich * 0.95 + z.r && ki.schussT <= 0 && k.munition >= 1) {
          ki.schussT = (rnd(0.3, 0.75) + (k.munition < 2 ? 0.4 : 0)) * (rangspiel ? 0.75 : ks.takt);
          if (ultraBereit(k) && d < reich) ultraZuenden(k);
          angreifen(k, zielW, Math.hypot(px - k.x, py - k.y));
        }
        if (k.superLadung >= k.def.superKosten && ki.schussT < 0.3 && Math.random() < (rangspiel ? 1 : ks.super)) {
          var sa = k.def.superArt, sr = (k.def.superReichweite || 0) * T;
          var ok = (sa === 'moshpit' && d < T * 2.5) || (sa === 'zungenwirbel' && d < T * 2.8) || (sa === 'haarflip' && d < T * 2.8) || (sa === 'aura' && d < T * 3) || (sa === 'dinner' && d < T * 4.5) || (sa === 'hunger' && d < T * 4) ||
            (sa === 'lernnie' && k.hp < k.maxHp * 0.6 && d < reich) || (sa === 'unsichtbar' && d < T * 7) ||
            (sr && d < sr && (sa === 'schwarzesloch' || sa === 'veto' || sa === 'natrium' || sa === 'sandsturm' || frei2));
          if (ok) superZuenden(k, zielW, Math.hypot(px - k.x, py - k.y));
        }
      }
      return { mx: mx, my: my };
    }

    // ---------- Steuerung ----------
    var tasten = {}, maus = { x: 0, y: 0, unten: false, drin: false };
    var touch = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
    var stickL = null, stickR = null, stickS = null;   // { id, sx, sy, x, y }
    var superKnopf = { x: 0, y: 0, r: 46 }, angriffKnopf = { x: 0, y: 0, r: 58 }, trickKnopf = { x: 0, y: 0, r: 30 }, ultraKnopf = { x: 0, y: 0, r: 30 };
    function istTaste(c) { return tasten[c]; }
    function aufTaste(e) {
      tasten[e.code] = e.type === 'keydown';
      if (e.type === 'keydown' && (e.code === 'Space' || e.code === 'KeyE')) { e.preventDefault(); spielerSuper(mausWinkel(), mausDist()); }
      if (e.type === 'keydown' && e.code === 'KeyR') { e.preventDefault(); spielerUltra(); }
      if (e.type === 'keydown' && /^Digit[1-9]$/.test(e.code)) { var ei = +e.code.slice(5) - 1; if (meineEmotes[ei]) spielerEmote(meineEmotes[ei]); }
      if (e.type === 'keydown' && (e.code === 'KeyQ' || e.code === 'KeyF')) { e.preventDefault(); spielerTrick(mausWinkel(), mausDist()); }
      if (e.type === 'keydown' && e.code === 'Escape') aufgeben();
    }
    addEventListener('keydown', aufTaste); addEventListener('keyup', aufTaste);
    var dpr = 1, VW = 0, VH = 0, zoom = 1, kamX = 0, kamY = 0;
    function welt(px, py) { return { x: (px - VW / 2) / zoom + kamX, y: (py - VH / 2) / zoom + kamY }; }
    function mausWinkel() { var p = welt(maus.x, maus.y); return Math.atan2(p.y - (spieler.y - SH), p.x - spieler.x); }
    function mausDist() { var p = welt(maus.x, maus.y); return Math.hypot(p.x - spieler.x, p.y - spieler.y); }
    cv.addEventListener('mousemove', function (e) { maus.x = e.clientX; maus.y = e.clientY; maus.drin = true; touch = false; });
    cv.addEventListener('mousedown', function (e) {
      touch = false; maus.x = e.clientX; maus.y = e.clientY; maus.drin = true;
      if (e.button === 2) spielerSuper(mausWinkel(), mausDist());
      else { maus.unten = true; spielerAngriff(mausWinkel(), mausDist()); }
    });
    addEventListener('mouseup', function () { maus.unten = false; });
    cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    function nahe(t, kn) { return Math.hypot(t.clientX - kn.x, t.clientY - kn.y) < kn.r * 1.35; }
    cv.addEventListener('touchstart', function (e) {
      e.preventDefault(); touch = true;
      for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i], s = { id: t.identifier, sx: t.clientX, sy: t.clientY, x: t.clientX, y: t.clientY, t0: zeit };
        if (ultraBereit(spieler) && nahe(t, ultraKnopf)) { spielerUltra(); continue; }
        if (spieler.tricks > 0 && nahe(t, trickKnopf)) { var az = autoZiel(false); spielerTrick(stickL ? Math.atan2(stickL.y - stickL.sy, stickL.x - stickL.sx) : az.w, az.d); continue; }
        if (!stickS && superBereit() && nahe(t, superKnopf)) { s.sx = superKnopf.x; s.sy = superKnopf.y; stickS = s; }
        else if (t.clientX < VW * 0.45 && !stickL) stickL = s;
        else if (!stickR) { if (nahe(t, angriffKnopf)) { s.sx = angriffKnopf.x; s.sy = angriffKnopf.y; } stickR = s; }
      }
    }, { passive: false });
    cv.addEventListener('touchmove', function (e) {
      e.preventDefault();
      for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        [stickL, stickR, stickS].forEach(function (s) { if (s && s.id === t.identifier) { s.x = t.clientX; s.y = t.clientY; } });
      }
    }, { passive: false });
    function touchEnde(e) {
      e.preventDefault();
      for (var i = 0; i < e.changedTouches.length; i++) {
        var id = e.changedTouches[i].identifier;
        if (stickL && stickL.id === id) stickL = null;
        if (stickR && stickR.id === id) { stickLos(stickR, false); stickR = null; }
        if (stickS && stickS.id === id) { stickLos(stickS, true); stickS = null; }
      }
    }
    cv.addEventListener('touchend', touchEnde, { passive: false }); cv.addEventListener('touchcancel', touchEnde, { passive: false });
    var STICK = 70;
    function stickZiel(s, istSuper) {
      var dx = s.x - s.sx, dy = s.y - s.sy, l = Math.hypot(dx, dy);
      if (l < 18) return null;   // nur getippt: automatisch zielen
      var reich = istSuper ? (spieler.def.superReichweite || 6) * T : spieler.def.angriff.reichweite * T;
      return { w: Math.atan2(dy, dx), d: Math.min(1, l / STICK) * reich };
    }
    function stickLos(s, istSuper) {
      var z = stickZiel(s, istSuper);
      if (!z) z = autoZiel(istSuper);
      if (istSuper) spielerSuper(z.w, z.d); else spielerAngriff(z.w, z.d);
    }
    function autoZiel(istSuper) {
      var reich = (istSuper ? (spieler.def.superReichweite || 6) : spieler.def.angriff.reichweite) * T, best = null, bd = 1e9;
      kaempfer.forEach(function (o) {
        if (o.team === spieler.team || o.tot || !sichtbarFuer(o, spieler.team)) return;
        var d = abst(spieler, o); if (d < bd) { bd = d; best = o; }
      });
      if (best && bd < reich * 1.3) return { w: Math.atan2(best.y - spieler.y, best.x - spieler.x), d: bd };
      return { w: spieler.blick, d: reich };
    }
    function spielerTrick(w, d) {
      if (ende || pausiert || spieler.tricks <= 0 || spieler.trickT > 0) return;
      if (gast) { netz.senden({ t: 'an_host', d: { a: 'trick', w: w, d: d } }); spieler.trickT = 4; return; }
      trickAusloesen(spieler, w, d);
    }
    var meineEmotes = (opt.emotes && opt.emotes.length ? opt.emotes : ['gg', 'haha', 'ups', 'herz']).slice(0, 9);
    function spielerUltra() {
      if (ende || pausiert || !ultraBereit(spieler)) return;
      if (gast) { netz.senden({ t: 'an_host', d: { a: 'ultra' } }); return; }
      ultraZuenden(spieler);
    }
    function spielerEmote(id) {
      if (ende) return;
      if (gast) { netz.senden({ t: 'an_host', d: { a: 'emote', e: id } }); return; }
      emoteZeigen(spieler, id);
    }
    // Emote-Knopf mit Auswahl (für Maus und Touch)
    var emoteKnopf = document.createElement('button'); emoteKnopf.type = 'button'; emoteKnopf.className = 'emoteknopf'; emoteKnopf.textContent = '💬';
    emoteKnopf.setAttribute('aria-label', 'Emote senden'); root.appendChild(emoteKnopf);
    var emoteListe = document.createElement('div'); emoteListe.className = 'emoteliste'; emoteListe.hidden = true; root.appendChild(emoteListe);
    meineEmotes.forEach(function (id, i) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = (touch ? '' : (i + 1) + ' ') + BS.emote(id).text;
      b.addEventListener('click', function () { spielerEmote(id); emoteListe.hidden = true; });
      emoteListe.appendChild(b);
    });
    emoteKnopf.addEventListener('click', function () { emoteListe.hidden = !emoteListe.hidden; });
    function superBereit() { return !spieler.tot && spieler.superLadung >= spieler.def.superKosten; }
    var gastAngriffT = 0;
    // Zielhilfe: lenkt den Schuss auf den Gegner, der am nächsten an der Ziellinie steht
    function zielhilfeAuf(w, d, art, reich) {
      var best = null, bestWert = 1e9, kegel = art === 'nah' ? 0.7 : 0.42;
      kaempfer.forEach(function (o) {
        if (o.team === spieler.team || o.tot || !sichtbarFuer(o, spieler.team)) return;
        var od = abst(spieler, o); if (od > reich * 1.15 + o.r) return;
        var dw = Math.abs(winkelDiff(Math.atan2(o.y - spieler.y, o.x - spieler.x), w));
        if (art === 'wurf') { var px = spieler.x + Math.cos(w) * d, py = spieler.y + Math.sin(w) * d, pd = Math.hypot(o.x - px, o.y - py); if (pd > 2 * T) return; dw = pd / T; }
        else if (dw > kegel) return;
        var wert = dw * 3 + od / reich; if (wert < bestWert) { bestWert = wert; best = o; }
      });
      if (!best) return { w: w, d: d };
      var flug = art === 'wurf' ? (spieler.def.angriff.flugzeit || 0.6) : abst(spieler, best) / (spieler.def.angriff.tempo || 900);
      var tx = best.x + (best.vx || 0) * flug * 0.5, ty = best.y + (best.vy || 0) * flug * 0.5;
      return { w: Math.atan2(ty - spieler.y, tx - spieler.x), d: Math.hypot(tx - spieler.x, ty - spieler.y) };
    }
    function spielerAngriff(w, d) {
      if (ende || pausiert) return;
      if (!(ball && ball.traeger === spieler)) { var a0 = spieler.def.angriff, zh = zielhilfeAuf(w, d, a0.art, a0.reichweite * T); w = zh.w; d = zh.d; }
      if (gast) { if (spieler.munition >= 1 && zeit - gastAngriffT > 0.15) { gastAngriffT = zeit; netz.senden({ t: 'an_host', d: { a: 'angriff', w: w, d: d } }); } return; }
      angreifen(spieler, w, d);
    }
    function spielerSuper(w, d) {
      if (ende || pausiert || !superBereit()) return;
      var sr = (spieler.def.superReichweite || 0) * T;
      if (sr) { var lob = ['veto', 'natrium', 'sandsturm', 'schwarzesloch', 'klosprint'].indexOf(spieler.def.superArt) >= 0, zs = zielhilfeAuf(w, d, lob ? 'wurf' : 'schuss', sr); w = zs.w; d = zs.d; }
      if (gast) { netz.senden({ t: 'an_host', d: { a: 'super', w: w, d: d } }); spieler.superLadung = 0; return; }
      superZuenden(spieler, w, d);
    }

    var pausiert = false;
    function aufgeben() {
      if (ende || root.querySelector('.frage')) return;
      pausiert = !netz;
      var box = document.createElement('div'); box.className = 'frage';
      box.innerHTML = '<p>Runde aufgeben?</p><div><button type="button" class="knopf rot" data-a="ja">Aufgeben</button><button type="button" class="knopf" data-a="nein">Weiterspielen</button></div>';
      root.appendChild(box);
      box.addEventListener('click', function (e) {
        var a = e.target.getAttribute('data-a'); if (!a) return;
        box.remove(); pausiert = false; letzte = performance.now();
        if (a !== 'ja') return;
        if (host) { netz.senden({ t: 'an_alle', d: { t: 'abbruch' } }); netz.senden({ t: 'ende' }); beenden({ ergebnis: 'abbruch' }); return; }
        if (gast) netz.senden({ t: 'an_host', d: { a: 'aufgeben' } });
        if (training) { beenden({ ergebnis: 'training' }); return; }
        beenden(royaleArt ? { ergebnis: 'raus', platz: spieler.platz || kaempfer.filter(function (k) { return !k.tot; }).length, kos: spieler.kos }
          : { ergebnis: 'niederlage', kos: spieler.kos, sterne: modus === 'sterne' ? teamSterne(spieler.team) : 0 });
      });
    }
    pauseKnopf.addEventListener('click', aufgeben);
    function nameVon(k) { return k === spieler ? (k.name || 'Du') : k.name || k.def.name; }
    function spriteVon(k, groesse) {
      var img = k.def.sprite('normal'); if (k.skin) img = BS.umfaerben(img, k.skin);
      var c = document.createElement('canvas'); c.width = img.width; c.height = img.height; c.className = 'px'; c.style.height = groesse + 'px';
      c.getContext('2d').drawImage(img, 0, 0); return c;
    }
    // Punktetabelle (Tab-Taste oder Knopf)
    var tabelleKnopf = document.createElement('button'); tabelleKnopf.type = 'button'; tabelleKnopf.className = 'tabelleknopf'; tabelleKnopf.textContent = '📋';
    tabelleKnopf.setAttribute('aria-label', 'Punktetabelle'); root.appendChild(tabelleKnopf);
    var tabelleEl = document.createElement('div'); tabelleEl.className = 'spieltabelle'; tabelleEl.hidden = true; root.appendChild(tabelleEl);
    function tabelleZeigen(an) {
      tabelleEl.hidden = !an; if (!an) return;
      tabelleEl.innerHTML = '';
      var teams = {}; kaempfer.forEach(function (k) { if (k.npc !== 'monster') (teams[k.team] = teams[k.team] || []).push(k); });
      Object.keys(teams).sort(function (a, b) { return (+a === spieler.team ? -1 : 0) - (+b === spieler.team ? -1 : 0); }).forEach(function (t) {
        var block = document.createElement('div'); block.className = 'tblock ' + (+t === spieler.team ? 'eigen' : 'fremd');
        teams[t].sort(function (a, b) { return b.kos - a.kos; }).forEach(function (k) {
          var z = document.createElement('div'); z.className = 'tzeile' + (k === spieler ? ' ich' : '') + (k.weg ? ' weg' : '');
          z.appendChild(spriteVon(k, 28));
          var n = document.createElement('b'); n.textContent = nameVon(k) + (k.weg ? ' (weg)' : ''); z.appendChild(n);
          var w = document.createElement('span'); w.textContent = '✖ ' + k.kos + '   💥 ' + Math.round(k.statSchaden) + (ball ? '   ⚽ ' + k.statTore : ''); z.appendChild(w);
          block.appendChild(z);
        });
        tabelleEl.appendChild(block);
      });
    }
    tabelleKnopf.addEventListener('click', function () { tabelleZeigen(tabelleEl.hidden); });
    addEventListener('keydown', tabTaste); addEventListener('keyup', tabTaste);
    function tabTaste(e) { if (e.code === 'Tab') { e.preventDefault(); tabelleZeigen(e.type === 'keydown'); } }
    var tabelleT = 0;

    // VS-Intro: Teams vorstellen
    var intro = 2.6;
    (function () {
      var v = document.createElement('div'); v.className = 'vsintro';
      var md = BS.MODI.filter(function (m) { return m.id === modus; })[0] || BS.MODI[0];
      var kopf = document.createElement('div'); kopf.className = 'vskopf';
      kopf.innerHTML = '<span class="vsicon"></span><b></b><small></small>';
      kopf.querySelector('.vsicon').textContent = md.icon; kopf.querySelector('b').textContent = md.name;
      var mo = BS.modifikator(mod);
      kopf.querySelector('small').textContent = BS.KARTEN_NAMEN[kartenName] + (mo && mo.id !== 'keiner' ? '  ·  ' + mo.icon + ' ' + mo.name : '');
      v.appendChild(kopf);
      var reihe = document.createElement('div'); reihe.className = 'vsreihe';
      var teams = {}; kaempfer.forEach(function (k) { if (!(k.npc === 'monster')) (teams[k.team] = teams[k.team] || []).push(k); });
      if (modus === 'wellen') teams[1] = [{ def: BS.npc('klecks'), name: '8 Wellen Kreidekleckse', team: 1 }];
      var ids = Object.keys(teams).sort(function (a, b) { return (+a === spieler.team ? -1 : 0) - (+b === spieler.team ? -1 : 0); });
      ids.forEach(function (t, i) {
        if (i && team) { var vs = document.createElement('div'); vs.className = 'vs'; vs.textContent = 'VS'; reihe.appendChild(vs); }
        var g = document.createElement('div'); g.className = 'vsteam ' + (+t === spieler.team ? 'eigen' : 'fremd');
        teams[t].forEach(function (k) {
          var c = document.createElement('div'); c.className = 'vskarte';
          c.appendChild(spriteVon(k, team ? 64 : 40));
          var n = document.createElement('b'); n.textContent = nameVon(k); c.appendChild(n);
          g.appendChild(c);
        });
        reihe.appendChild(g);
      });
      v.appendChild(reihe);
      root.appendChild(v);
      setTimeout(function () { v.classList.add('weg'); }, 2200);
      setTimeout(function () { v.remove(); }, 2700);
    })();

    function lokaleEingabe() {
      var mx = 0, my = 0, k = spieler;
      if (k.tot) return { mx: 0, my: 0 };
      if (stickL) { var dx = stickL.x - stickL.sx, dy = stickL.y - stickL.sy, l = Math.hypot(dx, dy); if (l > 8) { mx = dx / Math.max(l, STICK); my = dy / Math.max(l, STICK); } }
      else {
        mx = (istTaste('KeyD') || istTaste('ArrowRight') ? 1 : 0) - (istTaste('KeyA') || istTaste('ArrowLeft') ? 1 : 0);
        my = (istTaste('KeyS') || istTaste('ArrowDown') ? 1 : 0) - (istTaste('KeyW') || istTaste('ArrowUp') ? 1 : 0);
        var l2 = Math.hypot(mx, my); if (l2) { mx /= l2; my /= l2; }
      }
      if (maus.unten && !touch) spielerAngriff(mausWinkel(), mausDist());
      if (maus.drin && !touch) k.blick = mausWinkel();
      else if (stickR) { var z = stickZiel(stickR, false); if (z) k.blick = z.w; }
      else if (stickS) { var z2 = stickZiel(stickS, true); if (z2) k.blick = z2.w; }
      else if (mx || my) k.blick = Math.atan2(my, mx);
      return { mx: mx, my: my };
    }

    // ---------- Online ----------
    function r2(v) { return Math.round(v * 100) / 100; }
    function sendeZustand() {
      var r1 = Math.round;
      var d = { t: 'z', z: r2(zeit),
        k: kaempfer.map(function (k) {
          return [r1(k.x), r1(k.y), Math.max(0, Math.ceil(k.hp)), k.maxHp, r2(k.blick), k.munition, r2(k.ladeT), Math.round(k.superLadung), k.sterne, k.energie,
            k.tot ? 1 : 0, r2(k.respawn), k.kos, r2(k.gross), r2(k.schild), r2(k.unsichtbar), r2(k.betaeubt), k.bewegt ? 1 : 0,
            k.dash ? (k.dash.look === 'boot' ? 1 : 2) : 0, Math.min(99, Math.round((zeit - k.zuletztAktiv) * 10)), k.platz, k.tricks, r2(k.trickT), r2(k.verliebt), Math.round(k.ultraLadung), r2(k.ultra), k.kopfgeld, Math.round(k.statSchaden), k.weg ? 1 : 0, k.statTore, k.sprung ? r2(Math.min(1, k.sprung.t / k.sprung.T)) : 0, k.maxHp];
        }),
        p: projektile.map(function (p) {
          return p.wurf ? [1, r1(p.sx), r1(p.sy), r1(p.tx), r1(p.ty), r2(p.t), p.T, r1(p.flaeche), p.look]
            : [0, r1(p.x), r1(p.y), r1(p.vx), r1(p.vy), p.look, r2(p.w || 0), kaempfer.indexOf(p.owner), p.r];
        }),
        s: sterne.map(function (o) { return [r1(o.x), r1(o.y)]; }),
        e: energie.map(function (o) { return [r1(o.x), r1(o.y)]; }),
        f: flaechen.map(function (o) { return [r1(o.x), r1(o.y), r1(o.r)]; }),
        b: ball ? [r1(ball.x), r1(ball.y), r1(ball.vx), r1(ball.vy), ball.traeger ? kaempfer.indexOf(ball.traeger) : -1] : null, to: tore,
        hz: [r2(huegel[0]), r2(huegel[1]), huegelHalter], tr: tresore.map(function (t) { return Math.round(t.hp); }), kg: teamKopf, wl: welle, zo: zonen.map(function (z) { return [r2(z.f), z.besitzer]; }), zp: [r2(zonenPunkte[0]), r2(zonenPunkte[1])], pz: pilze.map(function (o) { return [Math.round(o.x), Math.round(o.y)]; }), mt: meteore.map(function (o) { return [Math.round(o.x), Math.round(o.y), r2(o.t)]; }),
        g: r1(gas.r), tk: teamKos, sc: sternCountdown === null ? null : r2(sternCountdown), st: sternTeam, ev: ev };
      ev = [];
      netz.senden({ t: 'an_alle', d: d });
    }
    function zustandAnwenden(d) {
      zeit = d.z;
      d.k.forEach(function (a, i) {
        var k = kaempfer[i]; if (!k) return;
        if (k === spieler && a[2] < k.hp && !k.tot) wackeln = Math.min(10, wackeln + 4);
        if (a[2] < k.hp && !k.tot) k.trefferT = 0.12;
        if (a[5] < k.munition) k.angriffT = 0.15;
        if (k.tot && !a[10]) k.spawnT = 0.45;
        k.zx = a[0]; k.zy = a[1];
        if (!k.da || (k.tot && !a[10]) || Math.hypot(k.x - a[0], k.y - a[1]) > 160) { k.x = a[0]; k.y = a[1]; k.da = true; }
        k.hp = a[2]; k.maxHp = a[3]; if (k !== spieler) k.blick = a[4];
        k.munition = a[5]; k.ladeT = a[6]; k.superLadung = a[7]; k.sterne = a[8]; k.energie = a[9]; k.tot = !!a[10]; k.respawn = a[11]; k.kos = a[12];
        k.gross = a[13]; k.schild = a[14]; k.unsichtbar = a[15]; k.betaeubt = a[16]; k.bewegt = !!a[17];
        k.dash = a[18] ? { look: a[18] === 1 ? 'boot' : 'sprint' } : null; k.zuletztAktiv = zeit - a[19] / 10; k.platz = a[20];
        k.tricks = a[21]; k.trickT = a[22]; k.verliebt = a[23]; k.ultraLadung = a[24]; k.ultra = a[25]; k.kopfgeld = a[26]; k.statSchaden = a[27]; k.weg = !!a[28]; k.statTore = a[29]; k.sprungF = a[30] || 0; if (a[31]) k.maxHp = a[31];
      });
      projektile = d.p.map(function (a) {
        return a[0] ? { wurf: true, sx: a[1], sy: a[2], tx: a[3], ty: a[4], t: a[5], T: a[6], flaeche: a[7], look: a[8] }
          : { x: a[1], y: a[2], vx: a[3], vy: a[4], look: a[5], w: a[6], owner: kaempfer[a[7]] || spieler, r: a[8] };
      });
      sterne = d.s.map(function (a) { return { x: a[0], y: a[1] }; });
      energie = d.e.map(function (a) { return { x: a[0], y: a[1] }; });
      flaechen = d.f.map(function (a) { return { x: a[0], y: a[1], r: a[2] }; });
      if (ball && d.b) { ball.x = d.b[0]; ball.y = d.b[1]; ball.vx = d.b[2]; ball.vy = d.b[3]; ball.traeger = d.b[4] >= 0 ? kaempfer[d.b[4]] : null; ball.da = true; }
      if (d.to) { if (d.to[0] + d.to[1] > tore[0] + tore[1]) { torAnsage = 2.2; torTeam = d.to[0] > tore[0] ? 0 : 1; } tore = d.to; }
      if (d.hz) { huegel = [d.hz[0], d.hz[1]]; huegelHalter = d.hz[2]; }
      if (d.tr) d.tr.forEach(function (hp, i) { if (tresore[i]) { if (hp < tresore[i].hp) tresore[i].blitz = 0.12; tresore[i].hp = hp; } });
      if (d.kg) teamKopf = d.kg;
      if (d.wl !== undefined) welle = d.wl;
      if (d.zo) d.zo.forEach(function (a, i) { if (zonen[i]) { zonen[i].f = a[0]; zonen[i].besitzer = a[1]; } });
      if (d.zp) zonenPunkte = d.zp;
      if (d.pz) pilze = d.pz.map(function (a) { return { x: a[0], y: a[1] }; });
      if (d.mt) meteore = d.mt.map(function (a) { return { x: a[0], y: a[1], t: a[2] }; });
      gas.r = d.g; teamKos = d.tk; sternCountdown = d.sc; sternTeam = d.st;
      d.ev.forEach(function (e) {
        if (e[0] === 'f') effekte.push(e[1]);
        else if (e[0] === 'z') zahlen.push(e[1]);
        else if (e[0] === 'w') { feld[e[2] * B + e[1]] = 0; feldZeichnen(e[1], e[2]); }
        else if (e[0] === 'kf') { feed.unshift({ a: e[1], b: e[2], t: 4.5, art: e[3] }); feed = feed.slice(0, 5); }
        else if (e[0] === 'm') { var ek = kaempfer[e[1]]; if (ek) ek.emote = { id: e[2], t: 2.2 }; }
        else if (e[0] === 's') Pixel.sfx[e[1] === 0 ? 'tone' : 'noise'].apply(null, e[2]);
      });
    }
    var gastSendeT = 0;
    function feedZeit(dt) { feed.forEach(function (f) { f.t -= dt; }); feed = feed.filter(function (f) { return f.t > 0; }); }
    function gastSchritt(dt) {
      zeit += dt;
      kaempfer.forEach(function (k) {
        if (k.zx !== undefined) { var f = Math.min(1, dt * 14); k.x += (k.zx - k.x) * f; k.y += (k.zy - k.y) * f; }
        if (k.bewegt) k.lauf += dt;
      });
      projektile.forEach(function (p) { if (p.wurf) p.t = Math.min(p.T, p.t + dt); else { p.x += p.vx * dt; p.y += p.vy * dt; } });
      if (ball && !ball.traeger) { ball.x += ball.vx * dt; ball.y += ball.vy * dt; }
      if (ball && ball.traeger) { ball.x = ball.traeger.x + Math.cos(ball.traeger.blick) * 16; ball.y = ball.traeger.y + 2 + Math.sin(ball.traeger.blick) * 10; }
      if (torAnsage > 0) torAnsage -= dt;
      tresore.forEach(function (t) { if (t.blitz > 0) t.blitz -= dt; });
      kaempfer.forEach(function (k) {
        if (k.emote) { k.emote.t -= dt; if (k.emote.t <= 0) k.emote = null; }
        ['angriffT', 'trefferT', 'spawnT'].forEach(function (f) { if (k[f] > 0) k[f] = Math.max(0, k[f] - dt); });
      });
      effekte.forEach(function (e) { e.t += dt; if (e.vx !== undefined) { e.x += e.vx * dt; e.y += e.vy * dt; e.vy += 400 * dt; } });
      effekte = effekte.filter(function (e) { return e.t < e.d; });
      zahlen.forEach(function (z) { z.t += dt; z.y -= 40 * dt; });
      zahlen = zahlen.filter(function (z) { return z.t < 0.9; });
      wackeln = Math.max(0, wackeln - dt * 30);
      var le = lokaleEingabe();
      gastSendeT -= dt;
      if (gastSendeT <= 0) { gastSendeT = 0.033; netz.senden({ t: 'an_host', d: { a: 'e', mx: r2(le.mx), my: r2(le.my), b: r2(spieler.blick) } }); }
    }
    function menschVon(id) { for (var i = 0; i < kaempfer.length; i++) if (kaempfer[i].mensch === id && kaempfer[i] !== spieler) return kaempfer[i]; return null; }
    // Wer online geht oder aufgibt, verschwindet aus der Runde
    function zumBot(k) {
      k.eingabe = null; k.ki = neueKi(); k.mensch = 0;
      zahl({ x: k.x, y: k.y - 50, t: -0.3, text: (k.name || k.def.name) + ' ist weg – ein Bot übernimmt', farbe: '#bbb' });
      k.name = (k.name || k.def.name) + ' (Bot)';
    }
    if (netz) Netz.spiel = function (o) {
      if (host) {
        if (o.t === 'von') {
          var k = menschVon(o.id), d = o.d || {}; if (!k || !k.eingabe) return;
          if (d.a === 'trick') { trickAusloesen(k, +d.w || 0, +d.d || 0); return; }
          if (d.a === 'ultra') { ultraZuenden(k); return; }
          if (d.a === 'emote') { emoteZeigen(k, String(d.e)); return; }
          if (d.a === 'e') k.eingabe = { mx: klemm(+d.mx || 0, -1, 1), my: klemm(+d.my || 0, -1, 1), b: +d.b || 0 };
          else if (d.a === 'angriff') angreifen(k, +d.w || 0, +d.d || 0);
          else if (d.a === 'super') superZuenden(k, +d.w || 0, +d.d || 0);
          else if (d.a === 'aufgeben') zumBot(k);
        } else if (o.t === 'weg') { var k2 = menschVon(o.id); if (k2) zumBot(k2); }
      } else if (o.t === 'daten') {
        var dd = o.d || {};
        if (dd.t === 'z') zustandAnwenden(dd);
        else if (dd.t === 'ende') beenden((dd.r && dd.r[netz.ich]) || { ergebnis: 'abbruch' });
        else if (dd.t === 'abbruch') beenden({ ergebnis: 'abbruch' });
      } else if (o.t === 'host_weg') beenden({ ergebnis: 'abbruch', text: 'Der Host hat das Spiel verlassen.' });
    };

    // ---------- Hauptschleife ----------
    function schritt(dt) {
      zeit += dt;
      kaempfer.forEach(function (k) {
        if (k.tot) {
          if (team && !k.weg) { k.respawn -= dt; if (k.respawn <= 0) { var s = spawnPunkt(k); k.x = s.x; k.y = s.y; k.tot = false; k.hp = k.maxHp; k.munition = 3; k.schild = 1.5; k.betaeubt = 0; k.gross = 0; k.unsichtbar = 0; k.verliebt = 0; k.spawnT = 0.45; } }
          return;
        }
        if (k.emote) { k.emote.t -= dt; if (k.emote.t <= 0) k.emote = null; }
        ['betaeubt', 'gebremst', 'schild', 'unsichtbar', 'gross', 'turbo', 'trickT', 'verliebt', 'ultra', 'angriffT', 'trefferT', 'spawnT', 'sprungT', 'teleT'].forEach(function (f) { if (k[f] > 0) k[f] = Math.max(0, k[f] - dt); });
        // Munition
        var lt = k.def.laden * k.ladeF * (k.schild > 0 && k.def.superArt === 'lernnie' ? 0.5 : 1);
        if (k.munition < 3) { k.ladeT += dt; if (k.ladeT >= lt) { k.ladeT = 0; k.munition++; } } else k.ladeT = 0;
        // Salven
        for (var i = k.salve.length - 1; i >= 0; i--) { k.salve[i].t -= dt; if (k.salve[i].t <= 0) { schiessen(k, k.salve[i].w); k.salve.splice(i, 1); } }
        // Heilen nach Pause
        if (zeit - k.zuletztGetroffen > k.regenPause && zeit - k.zuletztAktiv > k.regenPause && k.hp < k.maxHp) {
          k.regenT = (k.regenT || 0) + dt;
          if (k.regenT >= 1 / k.regenTempo) { k.regenT = 0; heilen(k, k.maxHp * REGEN_PRO_S); }
        } else k.regenT = 0;

        var ox = k.x, oy = k.y;
        if (k.sprung) {
          var sp = k.sprung; sp.t += dt; var sf = Math.min(1, sp.t / sp.T);
          k.x = sp.sx + (sp.tx - sp.sx) * sf; k.y = sp.sy + (sp.ty - sp.sy) * sf;
          if (sf >= 1) { k.sprung = null; fx({ art: 'ring', x: k.x, y: k.y, r: 26, t: 0, d: 0.3, farbe: '#ffb84a' }); }
        } else if (k.dash) {
          var ds = k.dash; bewegen(k, ds.vx * dt, ds.vy * dt); ds.t -= dt;
          if (ds.schaden) gegnerVon(k).forEach(function (o) {
            if (ds.getroffen.indexOf(o) >= 0 || abst(k, o) > k.r + o.r + 10) return;
            ds.getroffen.push(o); schaden(o, ds.schaden, k);
            var w = Math.atan2(o.y - k.y, o.x - k.x); o.stoss = { vx: Math.cos(w) * ds.stoss, vy: Math.sin(w) * ds.stoss, t: 0.25 }; o.betaeubt = Math.max(o.betaeubt, 0.4);
          });
          if (Math.random() < 0.6) fx({ art: 'staub', x: k.x + rnd(-8, 8), y: k.y + 6, t: 0, d: 0.4, farbe: ds.look === 'boot' ? '#bfe2ff' : '#e8d8b0' });
          if (ds.t <= 0 || (Math.hypot(k.x - ox, k.y - oy) < 0.2 * Math.hypot(ds.vx, ds.vy) * dt)) { if (ds.ende) ds.ende(); k.dash = null; }
        } else if (k.stoss) {
          bewegen(k, k.stoss.vx * dt, k.stoss.vy * dt); k.stoss.t -= dt; if (k.stoss.t <= 0) k.stoss = null;
        } else if (k.verliebt > 0 && k.verliebtZu && !k.verliebtZu.tot) {
          var vw = Math.atan2(k.verliebtZu.y - k.y, k.verliebtZu.x - k.x);
          k.blick = vw;
          if (abst(k, k.verliebtZu) > k.r * 2) bewegen(k, Math.cos(vw) * k.def.tempo * 0.5 * dt, Math.sin(vw) * k.def.tempo * 0.5 * dt);
        } else if (k.betaeubt <= 0) {
          var mx = 0, my = 0;
          if (k.spieler) {
            var le = lokaleEingabe(); mx = le.mx; my = le.my;
          } else if (k.eingabe) {
            mx = k.eingabe.mx; my = k.eingabe.my; k.blick = k.eingabe.b;
            var l3 = Math.hypot(mx, my); if (l3 > 1) { mx /= l3; my /= l3; }
          } else {
            var m = kiSchritt(k, dt); mx = m.mx; my = m.my;
            if (mx || my) { if (!k.ki.ziel) k.blick = Math.atan2(my, mx); else k.blick = Math.atan2(k.ki.ziel.y - k.y, k.ki.ziel.x - k.x); }
          }
          var tempo = k.def.tempo * k.tempoF * (mod === 'turbo' ? 1.15 : 1) * (k.ultra > 0 ? 1.2 : 1) * (ball && ball.traeger === k ? 0.9 : 1) * (k.gebremst > 0 ? 0.55 : 1) * (k.turbo > 0 ? 1.3 : 1) * (k.gross > 0 ? 1.1 : 1);
          if (fPx(k.x, k.y) === 2) tempo *= 0.95;
          bewegen(k, mx * tempo * dt, my * tempo * dt);
        }
        k.vx = (k.x - ox) / dt; k.vy = (k.y - oy) / dt;
        if (!k.sprung && !k.npc) {
          var ftx = Math.floor(k.x / T), fty = Math.floor(k.y / T), fv = fAt(ftx, fty);
          if (fv === 5 && !(k.sprungT > 0)) {
            var jw = Math.hypot(k.vx, k.vy) > 20 ? Math.atan2(k.vy, k.vx) : k.blick;
            var lz = freiesFeld(klemm(Math.floor((k.x + Math.cos(jw) * 4.5 * T) / T), 0, B - 1), klemm(Math.floor((k.y + Math.sin(jw) * 4.5 * T) / T), 0, H - 1));
            k.sprung = { sx: k.x, sy: k.y, tx: lz.x, ty: lz.y, t: 0, T: 0.6 }; k.sprungT = 1.2;
            sfx.tone(300, 0.2, 'triangle', 0.06, 900);
          } else if (fv === 6 && !(k.teleT > 0)) {
            var px2 = B - 1 - ftx, py2 = H - 1 - fty;
            if (fAt(px2, py2) === 6 && (px2 !== ftx || py2 !== fty)) {
              fx({ art: 'ring', x: k.x, y: k.y, r: 30, t: 0, d: 0.35, farbe: '#c46aff' });
              k.x = (px2 + 0.5) * T; k.y = (py2 + 0.5) * T; k.teleT = 1.5; k.spawnT = 0.3;
              fx({ art: 'ring', x: k.x, y: k.y, r: 30, t: 0, d: 0.35, farbe: '#c46aff' });
              sfx.tone(900, 0.15, 'sine', 0.06, 300);
            }
          } else if (fv === 7) {
            k.heilT = (k.heilT || 0) + dt;
            if (k.heilT >= 0.5) { k.heilT = 0; if (k.hp < k.maxHp) { heilen(k, k.maxHp * 0.06); fx({ art: 'staub', x: k.x, y: k.y - 20, t: 0, d: 0.4, farbe: '#6ef08a' }); } }
          }
        }
        k.bewegt = Math.hypot(k.vx, k.vy) > 20; if (k.bewegt) k.lauf += dt;

        // Sterne / Energie einsammeln
        if (modus === 'sterne') for (var s = sterne.length - 1; s >= 0; s--) {
          var st = sterne[s]; if (st.sperre > 0) continue;
          if (Math.hypot(st.x - k.x, st.y - k.y) < k.r + 16) { sterne.splice(s, 1); k.sterne++; if (k === spieler || k.team === spieler.team) sfx.tone(1400, 0.06, 'triangle', 0.05); }
        }
        if (royaleArt) for (var e = energie.length - 1; e >= 0; e--) {
          var en = energie[e];
          if (Math.hypot(en.x - k.x, en.y - k.y) < k.r + 14) {
            energie.splice(e, 1); k.energie++; k.maxHp += Math.round(k.def.hp * 0.1); heilen(k, k.def.hp * 0.1);
            if (k === spieler) sfx.tone(900, 0.1, 'square', 0.05, 1500);
          }
        }
      });
      // Tresore sind fest
      tresore.forEach(function (t) {
        kaempfer.forEach(function (k) {
          if (k.tot || k.sprung) return;
          var dd = Math.hypot(k.x - t.x, k.y - t.y), min = t.r + k.r * 0.7;
          if (dd < min && dd > 0.01) { k.x = t.x + (k.x - t.x) / dd * min; k.y = t.y + (k.y - t.y) / dd * min; }
        });
      });
      // Kämpfer nicht ineinander
      for (var i2 = 0; i2 < kaempfer.length; i2++) for (var j = i2 + 1; j < kaempfer.length; j++) {
        var a = kaempfer[i2], b = kaempfer[j]; if (a.tot || b.tot || a.sprung || b.sprung) continue;
        var dd = abst(a, b), min = (a.r + b.r) * 0.8;
        if (dd < min && dd > 0.01) { var px = (a.x - b.x) / dd * (min - dd) / 2, py = (a.y - b.y) / dd * (min - dd) / 2; a.x += px; a.y += py; b.x -= px; b.y -= py; aufloesen(a); aufloesen(b); }
      }

      projektileSchritt(dt);
      flaechen.forEach(function (f) {
        f.t += dt; f.tick -= dt;
        if (f.folgt) { if (f.folgt.tot) f.t = f.d; f.x = f.folgt.x; f.y = f.folgt.y; }
        if (f.tick <= 0) {
          f.tick = 0.5;
          gegnerVon(f.owner).forEach(function (o) {
            if (Math.hypot(o.x - f.x, o.y - f.y) >= f.r) return;
            if (f.dps) schaden(o, f.dps / 2, f.owner);
            if (f.bremst) o.gebremst = Math.max(o.gebremst, 0.6);
            if (f.stoss) { var sw = Math.atan2(o.y - f.y, o.x - f.x); o.stoss = { vx: Math.cos(sw) * f.stoss, vy: Math.sin(sw) * f.stoss, t: 0.2 }; }
            if (f.zug) { var zw = Math.atan2(f.y - o.y, f.x - o.x), zd = Math.hypot(f.x - o.x, f.y - o.y); if (zd > 12) o.stoss = { vx: Math.cos(zw) * f.zug, vy: Math.sin(zw) * f.zug, t: Math.min(0.45, zd / f.zug) }; }
          });
          if (f.dps) tresore.forEach(function (t) { if (t.team !== f.team && Math.hypot(t.x - f.x, t.y - f.y) < f.r + t.r * 0.5) tresorTreffer(t, f.dps / 2, f.owner); });
        }
      });
      flaechen = flaechen.filter(function (f) { return f.t < f.d; });
      sterne.forEach(function (s) {
        if (s.sperre > 0) s.sperre -= dt;
        if (s.vx || s.vy) {
          var nx = s.x + s.vx * dt, ny = s.y + s.vy * dt;
          if (blockiertLauf(fPx(nx, s.y))) s.vx = -s.vx * 0.5; else s.x = nx;
          if (blockiertLauf(fPx(s.x, ny))) s.vy = -s.vy * 0.5; else s.y = ny;
          s.vx *= Math.pow(0.05, dt); s.vy *= Math.pow(0.05, dt);
          if (Math.abs(s.vx) + Math.abs(s.vy) < 5) s.vx = s.vy = 0;
        }
      });
      effekte.forEach(function (e) { e.t += dt; if (e.vx !== undefined) { e.x += e.vx * dt; e.y += e.vy * dt; e.vy += 400 * dt; } });
      effekte = effekte.filter(function (e) { return e.t < e.d; });
      zahlen.forEach(function (z) { z.t += dt; z.y -= 40 * dt; });
      zahlen = zahlen.filter(function (z) { return z.t < 0.9; });
      wackeln = Math.max(0, wackeln - dt * 30);
      modusSchritt(dt);
    }

    function projektileSchritt(dt) {
      for (var i = projektile.length - 1; i >= 0; i--) {
        var p = projektile[i], weg = false;
        if (p.wurf) {
          p.t += dt;
          if (p.t >= p.T) {
            flaechenSchaden(p.owner, p.tx, p.ty, p.flaeche, p.schaden, { betaeubt: p.betaeubt, waende: p.waende, stoss: p.stoss });
            fx({ art: 'boom', x: p.tx, y: p.ty, r: p.flaeche, t: 0, d: 0.35, farbe: p.look === 'natrium' ? '#ffe14a' : p.look === 'riesenstempel' ? '#e8343f' : '#7af0e0' });
            sfx.noise(p.look === 'kolben' ? 0.15 : 0.4, p.look === 'kolben' ? 0.15 : 0.3, p.look === 'kolben' ? 1800 : 700);
            if (p.flaeche > T * 2) wackeln = Math.max(wackeln, 7);
            weg = true;
          }
        } else {
          var schritte = Math.ceil(Math.hypot(p.vx, p.vy) * dt / 10);
          for (var s = 0; s < schritte && !weg; s++) {
            var sx = p.vx * dt / schritte, sy = p.vy * dt / schritte;
            p.x += sx; p.y += sy; p.weg += Math.hypot(sx, sy);
            var v = fPx(p.x, p.y + SH);
            if (blockiertSchuss(v)) {
              var tx = Math.floor(p.x / T), ty = Math.floor((p.y + SH) / T);
              if (v === 4) { kisteTreffen(tx, ty, p.schaden); weg = true; break; }
              if (p.abprall > 0) {
                p.abprall--; p.x -= sx; p.y -= sy;
                if (blockiertSchuss(fPx(p.x + sx, p.y + SH))) p.vx = -p.vx; else p.vy = -p.vy;
                p.w = Math.atan2(p.vy, p.vx); continue;
              }
              fx({ art: 'staub', x: p.x, y: p.y, t: 0, d: 0.25, farbe: '#fff' }); weg = true; break;
            }
            for (var ti = 0; ti < tresore.length && !weg; ti++) {
              var tz = tresore[ti];
              if (tz.team === p.team || (p.getroffen && p.getroffen.indexOf(tz) >= 0)) continue;
              if (Math.hypot(tz.x - p.x, tz.y - (p.y + SH)) > tz.r + p.r) continue;
              tresorTreffer(tz, p.schaden, p.owner);
              if (p.durch) p.getroffen.push(tz); else weg = true;
            }
            if (weg) break;
            for (var k = 0; k < kaempfer.length; k++) {
              var o = kaempfer[k];
              if (o.tot || o.team === p.team || p.getroffen.indexOf(o) >= 0) continue;
              var orr = o.r * (o.gross > 0 ? 1.5 : 1);
              var ky = klemm(p.y, o.y - 30 * (o.gross > 0 ? 1.6 : 1), o.y + 4);
              if (Math.hypot(o.x - p.x, ky - p.y) > orr + p.r + (o.ki ? 6 : 2)) continue;   // großzügig, vor allem gegen Bots
              p.getroffen.push(o);
              var m = schaden(o, p.schaden, p.owner);
              if (p.bremst) o.gebremst = Math.max(o.gebremst, p.bremst);
              if (p.wegstoss && !o.tot) { var sw2 = Math.atan2(p.vy, p.vx); o.stoss = { vx: Math.cos(sw2) * p.wegstoss, vy: Math.sin(sw2) * p.wegstoss, t: 0.3 }; }
              if (p.charme && !o.tot) { o.verliebt = p.charme; o.verliebtZu = p.owner; zahl({ x: o.x, y: o.y - 60, t: -0.2, text: '<3', farbe: '#ff8ab0' }); }
              if (p.klau) {
                if (m) heilen(p.owner, m);
                var w = Math.atan2(p.owner.y - o.y, p.owner.x - o.x), dd = Math.max(0, abst(o, p.owner) - T * 1.2);
                o.stoss = { vx: Math.cos(w) * dd / 0.3, vy: Math.sin(w) * dd / 0.3, t: 0.3 }; o.betaeubt = Math.max(o.betaeubt, 0.6);
              }
              fx({ art: 'staub', x: p.x, y: p.y, t: 0, d: 0.2, farbe: '#ffe' });
              if (!p.durch) { weg = true; break; }
            }
            if (p.weg >= p.max) weg = true;
          }
        }
        if (weg) projektile.splice(i, 1);
      }
    }

    // ---------- Zeichnen ----------
    function groesse() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      VW = innerWidth; VH = innerHeight;
      cv.width = Math.round(VW * dpr); cv.height = Math.round(VH * dpr);
      cv.style.width = VW + 'px'; cv.style.height = VH + 'px';
      zoom = Math.min(VW / (15 * T), VH / (9.5 * T));
      if (VW < VH) zoom = VW / (12 * T);
      angriffKnopf.x = VW - 80; angriffKnopf.y = VH - 110;
      superKnopf.x = VW - 190; superKnopf.y = VH - 70;
      if (VW < 500) { angriffKnopf.x = VW - 74; angriffKnopf.y = VH - 150; superKnopf.x = VW - 170; superKnopf.y = VH - 74; }
      trickKnopf.x = superKnopf.x - 30; trickKnopf.y = superKnopf.y - 92;
      ultraKnopf.x = angriffKnopf.x + 4; ultraKnopf.y = angriffKnopf.y - 112;
    }
    groesse(); addEventListener('resize', groesse);

    function zeichneKaempfer(k) {
      if (k.tot) return;
      var sicht = sichtbarFuer(k, spieler.team);
      var eigen = k.team === spieler.team;
      if (!sicht && !eigen) return;
      var transparent = (k.unsichtbar > 0 || (inHecke(k) && eigen)) ? 0.45 : 1;
      var def = k.def, img = (k.bewegt && def.laufSprite) ? def.laufSprite(k.lauf) : def.sprite(k.superLadung >= def.superKosten ? 'super' : 'normal');
      if (k.skin) img = BS.umfaerben(img, k.skin);
      var s = (def.skala || 2) * (k.gross > 0 ? 1.6 : 1) * (k.groesse || 1);
      var bw = img.width * s, bh = img.height * s, bob = k.bewegt ? Math.abs(Math.sin(k.lauf * 12)) * 3 : 0;
      ctx.globalAlpha = transparent;
      // Schatten + Teamring
      ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(k.x, k.y + 6, bw * 0.42, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = k === spieler ? '#7dff8a' : (k.team === spieler.team ? TEAMFARBE[0] : TEAMFARBE[1]);
      if (k.ultra > 0) { ctx.save(); ctx.globalAlpha = 0.35 + Math.sin(zeit * 12) * 0.15; ctx.fillStyle = '#c46aff'; ctx.beginPath(); ctx.ellipse(k.x, k.y - 20, bw * 0.7, bh * 0.6, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); } ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(k.x, k.y + 6, bw * 0.46, 10, 0, 0, Math.PI * 2); ctx.stroke();
      if (k.dash && k.dash.look === 'boot') {
        ctx.fillStyle = '#e8e8e8'; ctx.beginPath(); ctx.ellipse(k.x, k.y + 2, 30, 14, k.blick, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#3d8fd6'; ctx.fillRect(k.x - 22, k.y + 8, 44, 4);
      }
      var spiegeln = Math.cos(k.blick) < 0;
      if (k.bewegt && !def.laufSprite && !k.dash) img = laufBild(img, Math.floor(k.lauf * 7) % 2);
      var neig = k.bewegt ? Math.sin(k.lauf * 12) * 0.06 : 0;
      var atmen = k.bewegt ? 1 : 1 + Math.sin(zeit * 3 + k.x * 0.1) * 0.025;
      var ruck = k.angriffT > 0 ? k.angriffT / 0.15 : 0;
      var auf = k.spawnT > 0 ? 1 - k.spawnT / 0.45 : 1;
      var jubel = k.jubel && ende ? Math.abs(Math.sin(performance.now() / 120)) * 16 : 0;
      var sprF = k.sprung ? Math.min(1, k.sprung.t / k.sprung.T) : k.sprungF || 0;
      jubel += sprF ? Math.sin(sprF * Math.PI) * 48 : 0;
      ctx.save();
      ctx.translate(k.x - Math.cos(k.blick) * ruck * 4, k.y + 8 - bob - jubel - Math.sin(k.blick) * ruck * 2);
      ctx.rotate(neig + (jubel ? Math.sin(performance.now() / 120) * 0.12 : 0));
      ctx.scale((1 + ruck * 0.07) * (0.4 + auf * 0.6), atmen * (1 - ruck * 0.05) * (0.4 + auf * 0.6));
      if (auf < 1) ctx.globalAlpha = transparent * auf;
      Pixel.draw(ctx, img, -bw / 2, -bh, s, spiegeln);
      if (k.trefferT > 0) { ctx.globalAlpha = transparent * Math.min(1, k.trefferT / 0.12) * 0.85; Pixel.draw(ctx, weissBild(img), -bw / 2, -bh, s, spiegeln); }
      ctx.restore(); ctx.globalAlpha = transparent;
      if (k.schild > 0) { ctx.strokeStyle = 'rgba(200,220,255,.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(k.x, k.y - bh / 2 + 8, bh * 0.6, 0, Math.PI * 2); ctx.stroke(); }
      if (k.verliebt > 0) { for (var hi = 0; hi < 2; hi++) zeichneHerz(k.x - 8 + hi * 16, k.y - bh - 2 + Math.sin(zeit * 6 + hi) * 3, 5); }
      if (k.betaeubt > 0) { for (var i = 0; i < 3; i++) { var w = zeit * 5 + i * 2.1; Pixel.text(ctx, '*', k.x + Math.cos(w) * 14 - 3, k.y - bh - 4 + Math.sin(w) * 4, 3, '#ffd23f'); } }
      ctx.globalAlpha = 1;
      // Leiste über dem Kopf
      var lb = 54, ly = k.y + 8 - bh - 22;
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(k.x - lb / 2 - 2, ly - 2, lb + 4, 10);
      ctx.fillStyle = k === spieler ? '#7dff8a' : (eigen ? '#3fa2ff' : '#ff4d5a');
      ctx.fillRect(k.x - lb / 2, ly, lb * klemm(k.hp / k.maxHp, 0, 1), 6);
      var name = k === spieler ? 'DU' : (k.name || def.name.split(' ')[0]);
      ctx.font = '13px "Lilita One", sans-serif'; ctx.textAlign = 'center';
      ctx.fillStyle = '#000'; ctx.fillText(name, k.x + 1, ly - 5); ctx.fillStyle = k === spieler ? '#7dff8a' : '#fff'; ctx.fillText(name, k.x, ly - 6);
      if (k === spieler) {
        for (var m = 0; m < 3; m++) {
          ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(k.x - lb / 2 + m * (lb / 3) , ly + 9, lb / 3 - 2, 5);
          var voll = m < k.munition ? 1 : m === k.munition ? k.ladeT / k.def.laden : 0;
          ctx.fillStyle = '#ffa53a'; ctx.fillRect(k.x - lb / 2 + m * (lb / 3), ly + 9, (lb / 3 - 2) * voll, 5);
        }
      }
      if (modus === 'kopfgeld') { zeichneStern(k.x - lb / 2 - 12, ly + 2, 8, '#ffd23f'); ctx.fillStyle = '#fff'; ctx.font = '13px "Lilita One", sans-serif'; ctx.textAlign = 'right'; ctx.fillText(k.kopfgeld, k.x - lb / 2 - 22, ly + 7); }
      if (k.emote) {
        var et = BS.emote(k.emote.id).text; ctx.font = '17px "Lilita One", sans-serif'; ctx.textAlign = 'center';
        var ew = ctx.measureText(et).width + 16, ey = ly - 34 - (2.2 - k.emote.t < 0.15 ? (0.15 - (2.2 - k.emote.t)) * 60 : 0);
        ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.rect(k.x - ew / 2, ey - 16, ew, 24); ctx.moveTo(k.x - 6, ey + 8); ctx.lineTo(k.x, ey + 15); ctx.lineTo(k.x + 6, ey + 8); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#1c1430'; ctx.fillText(et, k.x, ey + 1);
      }
      if (k.sterne > 0) { zeichneStern(k.x + lb / 2 + 10, ly + 2, 8); ctx.fillStyle = '#fff'; ctx.font = '13px "Lilita One", sans-serif'; ctx.textAlign = 'left'; ctx.fillText(k.sterne, k.x + lb / 2 + 20, ly + 7); }
      if (k.energie > 0) { ctx.fillStyle = '#6ef08a'; ctx.font = '12px "Lilita One", sans-serif'; ctx.textAlign = 'left'; ctx.fillText('⚡' + k.energie, k.x + lb / 2 + 4, ly + 7); }
    }
    function zeichneHerz(x, y, r) {
      ctx.fillStyle = '#ff5a8a'; ctx.beginPath(); ctx.arc(x - r / 2, y, r / 2 + 1, Math.PI, 0); ctx.arc(x + r / 2, y, r / 2 + 1, Math.PI, 0);
      ctx.lineTo(x, y + r + 2); ctx.closePath(); ctx.fill();
    }
    function zeichneStern(x, y, r, farbe) {
      ctx.fillStyle = farbe || '#ffd23f'; ctx.strokeStyle = '#8a5a00'; ctx.lineWidth = 2; ctx.beginPath();
      for (var i = 0; i < 10; i++) { var w = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(w) * rr, y + Math.sin(w) * rr); }
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }

    function zeichneProjektil(p) {
      if (p.wurf) {
        var f = p.t / p.T, x = p.sx + (p.tx - p.sx) * f, y = p.sy + (p.ty - p.sy) * f - Math.sin(f * Math.PI) * 70;
        ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
        ctx.beginPath(); ctx.arc(p.tx, p.ty, p.flaeche, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
        if (p.look === 'eimer') {
          ctx.save(); ctx.translate(x, y); ctx.rotate(p.t * 8);
          ctx.fillStyle = '#3a6ad8'; ctx.beginPath(); ctx.moveTo(-12, -12); ctx.lineTo(12, -12); ctx.lineTo(9, 12); ctx.lineTo(-9, 12); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#9ad8ff'; ctx.fillRect(-11, -12, 22, 5); ctx.restore();
        } else if (p.look === 'riesenstempel') {
          ctx.fillStyle = '#e8343f'; ctx.fillRect(x - 26, y - 18, 52, 36); ctx.fillStyle = '#fff'; ctx.font = '11px "Lilita One", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('VETO', x, y + 4);
        } else {
          ctx.fillStyle = p.look === 'natrium' ? '#d8d8e0' : '#9ae8f0';
          ctx.beginPath(); ctx.moveTo(x - 4, y - 10); ctx.lineTo(x + 4, y - 10); ctx.lineTo(x + 10, y + 8); ctx.lineTo(x - 10, y + 8); ctx.closePath(); ctx.fill();
          ctx.fillStyle = p.look === 'natrium' ? '#ffe14a' : '#3ad6a0'; ctx.fillRect(x - 8, y + 1, 16, 7);
        }
        return;
      }
      var x2 = p.x, y2 = p.y;
      ctx.save(); ctx.translate(x2, y2); ctx.rotate(p.w || 0);
      switch (p.look) {
        case 'stempel': ctx.fillStyle = '#e8343f'; ctx.fillRect(-10, -7, 20, 14); ctx.fillStyle = '#fff'; ctx.fillRect(-7, -2, 14, 4); break;
        case 'welle': ctx.fillStyle = 'rgba(120,200,255,.85)'; ctx.beginPath(); ctx.ellipse(0, 0, 10, p.r + 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(4, -p.r, 4, p.r * 2); break;
        case 'kopf': ctx.fillStyle = '#e8b896'; ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#2a1a12'; ctx.fillRect(-9, -9, 18, 6); ctx.fillStyle = '#e8b896'; ctx.fillRect(-30, -3, 24, 6); break;
        case 'hals': ctx.restore(); ctx.strokeStyle = '#e8b896'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(p.owner.x, p.owner.y - 30); ctx.lineTo(x2, y2); ctx.stroke();
          ctx.fillStyle = '#e8b896'; ctx.beginPath(); ctx.arc(x2, y2, 12, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#2a1a12'; ctx.fillRect(x2 - 12, y2 - 12, 24, 7); return;
        case 'kugel': ctx.fillStyle = '#ff9a1c'; ctx.fillRect(-5, -3, 10, 6); break;
        case 'spucke': ctx.fillStyle = '#d8f0a0'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(-2, -5, 4, 4); break;
        case 'note': ctx.rotate(-(p.w || 0)); ctx.fillStyle = '#c81e2a'; ctx.beginPath(); ctx.ellipse(-2, 4, 6, 4.5, -0.4, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(3, -10, 3, 14); ctx.fillRect(3, -10, 8, 3); break;
        case 'herz': ctx.restore(); zeichneHerz(x2, y2 - 3, 8); return;
        case 'schraube': ctx.fillStyle = '#c8ccd6'; ctx.fillRect(-8, -3, 16, 6); ctx.fillStyle = '#8a8e98'; ctx.fillRect(4, -6, 5, 12); break;
        case 'glitzer': ctx.rotate(zeit * 15); ctx.fillStyle = ['#ff7ac8', '#ffd23f', '#7ae8ff'][Math.floor(p.x) % 3];
          ctx.beginPath(); for (var gi2 = 0; gi2 < 8; gi2++) { var gw = gi2 * Math.PI / 4, gr = gi2 % 2 ? 4 : 9; ctx.lineTo(Math.cos(gw) * gr, Math.sin(gw) * gr); } ctx.closePath(); ctx.fill(); break;
        case 'zunge': ctx.restore(); ctx.strokeStyle = '#f08a9a'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(p.owner.x, p.owner.y - 24); ctx.lineTo(x2, y2); ctx.stroke();
          ctx.fillStyle = '#d86a7a'; ctx.beginPath(); ctx.arc(x2, y2, 9, 0, Math.PI * 2); ctx.fill(); ctx.lineCap = 'butt'; return;
        case 'spruch': ctx.rotate(-(p.w || 0)); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#1c1430'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.ellipse(0, -2, 11, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(-4, 5); ctx.lineTo(-8, 11); ctx.lineTo(1, 6); ctx.fill();
          ctx.fillStyle = '#e8343f'; ctx.fillRect(-6, -4, 3, 3); ctx.fillRect(-1, -4, 3, 3); ctx.fillRect(4, -4, 3, 3); break;
        case 'korb': ctx.rotate(zeit * 9); ctx.fillStyle = '#a8702a'; ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#6a4418'; ctx.lineWidth = 3; for (var kr = -14; kr <= 14; kr += 7) { ctx.beginPath(); ctx.moveTo(kr, -18); ctx.lineTo(kr, 18); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-18, kr); ctx.lineTo(18, kr); ctx.stroke(); }
          ctx.strokeStyle = '#d8a050'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, 19, 0, Math.PI * 2); ctx.stroke(); break;
        case 'plasma': ctx.fillStyle = 'rgba(90,240,255,.35)'; ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#5af0ff'; ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-2, -2, 3, 0, Math.PI * 2); ctx.fill(); break;
        case 'grossherz': ctx.restore(); zeichneHerz(x2, y2 - 6, 14); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x2, y2, 18 + Math.sin(zeit * 20) * 3, 0, Math.PI * 2); ctx.stroke(); return;
        case 'teller': ctx.rotate(zeit * 20); ctx.fillStyle = '#f4f4f4'; ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#c8a0ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.stroke(); break;
        case 'buch': ctx.rotate(zeit * 14); ctx.fillStyle = '#5a3ac8'; ctx.fillRect(-10, -7, 20, 14); ctx.fillStyle = '#fff'; ctx.fillRect(-8, -5, 3, 10); break;
        case 'gold': ctx.fillStyle = '#ffd23f'; ctx.fillRect(-5, -5, 10, 10); ctx.fillStyle = '#fff6b0'; ctx.fillRect(-3, -3, 3, 3); break;
        default: ctx.fillStyle = '#fff'; ctx.fillRect(-5, -5, 10, 10);
      }
      ctx.restore();
    }

    function zeichnen() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#2a2236'; ctx.fillRect(0, 0, VW, VH);
      // Kamera
      var fokus = spieler;
      if (spieler.tot && royaleArt) {   // raus: anderen zuschauen (im Duo zuerst dem Partner)
        var lebend = kaempfer.filter(function (k) { return !k.tot; });
        fokus = lebend.filter(function (k) { return k.team === spieler.team; })[0] || lebend.filter(function (k) { return k.mensch; })[0] || lebend[0] || spieler;
      }
      var zx = fokus.x + Math.cos(fokus.blick) * 30, zy = fokus.y - 20 + Math.sin(fokus.blick) * 30;
      kamX += (zx - kamX) * 0.12; kamY += (zy - kamY) * 0.12;
      var halbW = VW / 2 / zoom, halbH = VH / 2 / zoom;
      kamX = W < halbW * 2 ? W / 2 : klemm(kamX, halbW, W - halbW);
      kamY = HH < halbH * 2 ? HH / 2 : klemm(kamY, halbH - T * 2.5, HH - halbH + T * 2);
      var sx = (Math.random() - 0.5) * wackeln, sy = (Math.random() - 0.5) * wackeln;
      ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, dpr * (VW / 2 - (kamX + sx) * zoom), dpr * (VH / 2 - (kamY + sy) * zoom));
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#4a3a5a'; ctx.fillRect(-T, -T, W + 2 * T, HH + 2 * T);
      ctx.drawImage(boden, 0, 0);
      if (team) {
        var unten = spieler.team === 0;
        ctx.fillStyle = 'rgba(63,162,255,.13)'; ctx.fillRect(0, unten ? HH - T * 3 : 0, W, T * 3);
        ctx.fillStyle = 'rgba(255,77,90,.13)'; ctx.fillRect(0, unten ? 0 : HH - T * 3, W, T * 3);
      }

      // Flächen
      flaechen.forEach(function (f) {
        if (f.look === 'zunge') {
          ctx.strokeStyle = '#f08a9a'; ctx.lineWidth = 10; ctx.lineCap = 'round';
          for (var zi2 = 0; zi2 < 2; zi2++) { var zw2 = zeit * 12 + zi2 * Math.PI; ctx.beginPath(); ctx.moveTo(f.x, f.y - 24); ctx.lineTo(f.x + Math.cos(zw2) * f.r, f.y - 24 + Math.sin(zw2) * f.r * 0.7); ctx.stroke(); }
          ctx.lineCap = 'butt'; return;
        }
        if (f.look === 'loch') {
          var lg = ctx.createRadialGradient(f.x, f.y, 4, f.x, f.y, f.r);
          lg.addColorStop(0, 'rgba(0,0,0,.95)'); lg.addColorStop(0.35, 'rgba(40,10,80,.75)'); lg.addColorStop(1, 'rgba(90,60,200,0)');
          ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = 'rgba(160,140,255,.7)'; ctx.lineWidth = 3;
          for (var sp = 0; sp < 3; sp++) { ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.35 + sp * 0.2), zeit * (3 + sp) + sp, zeit * (3 + sp) + sp + 2); ctx.stroke(); }
          ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(f.x, f.y, 12, 0, Math.PI * 2); ctx.fill();
          return;
        }
        var farbe = f.look === 'mosh' ? 'rgba(200,30,42,' : f.look === 'rauch' ? 'rgba(170,170,185,' : 'rgba(230,190,110,';
        ctx.fillStyle = farbe + (0.32 + Math.sin(zeit * 10) * 0.05) + ')'; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
        if (f.look === 'mosh') { ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 3; ctx.setLineDash([10, 8]); ctx.lineDashOffset = -zeit * 80; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 0.85, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
        for (var i = 0; i < 8; i++) { var w = zeit * 3 + i, rr = f.r * ((i * 0.37 + zeit * 0.5) % 1); ctx.fillStyle = 'rgba(255,240,220,.55)'; ctx.fillRect(f.x + Math.cos(w) * rr, f.y + Math.sin(w) * rr, 6, 3); }
      });
      if (ball) {
        [[0, 1], [HH - T * 0.6, 0]].forEach(function (tz) {
          var feind = (tz[1] === 1) === (spieler.team === 0);
          ctx.fillStyle = feind ? 'rgba(255,77,90,.35)' : 'rgba(63,162,255,.35)'; ctx.fillRect(TOR_X0, tz[0] - (tz[1] ? T * 0.4 : 0), TOR_X1 - TOR_X0, T);
          ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2;
          for (var nx = TOR_X0; nx <= TOR_X1; nx += 10) { ctx.beginPath(); ctx.moveTo(nx, tz[0] - (tz[1] ? T * 0.4 : 0)); ctx.lineTo(nx, tz[0] + T * (tz[1] ? 0.6 : 1)); ctx.stroke(); }
          ctx.lineWidth = 5; ctx.strokeStyle = '#fff'; ctx.strokeRect(TOR_X0, tz[0] - (tz[1] ? T * 0.4 : 0), TOR_X1 - TOR_X0, T);
        });
        ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, HH / 2); ctx.lineTo(W, HH / 2); ctx.stroke();
      }
      if (modus === 'huegel') {
        var hf = huegelHalter === -2 ? 'rgba(255,210,63,' : huegelHalter === -1 ? 'rgba(255,255,255,' : huegelHalter === spieler.team ? 'rgba(63,162,255,' : 'rgba(255,77,90,';
        ctx.fillStyle = hf + (0.22 + Math.sin(zeit * 4) * 0.05) + ')'; ctx.beginPath(); ctx.arc(W / 2, HH / 2, ZONE_R, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = hf + '.9)'; ctx.lineWidth = 4; ctx.setLineDash([12, 8]); ctx.lineDashOffset = -zeit * 20; ctx.beginPath(); ctx.arc(W / 2, HH / 2, ZONE_R, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      }
      pilze.forEach(function (pz) {
        var bb = Math.sin(zeit * 4 + pz.x) * 2;
        ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(pz.x, pz.y + 10, 12, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f4e8d0'; ctx.fillRect(pz.x - 4, pz.y - 2 + bb, 8, 12);
        ctx.fillStyle = '#e8343f'; ctx.beginPath(); ctx.arc(pz.x, pz.y - 2 + bb, 13, Math.PI, 0); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.fillRect(pz.x - 7, pz.y - 9 + bb, 4, 4); ctx.fillRect(pz.x + 3, pz.y - 11 + bb, 4, 4);
      });
      meteore.forEach(function (me) {
        var f = Math.min(1, me.t / 1.3);
        ctx.fillStyle = 'rgba(255,90,40,' + (0.15 + f * 0.25) + ')'; ctx.beginPath(); ctx.arc(me.x, me.y, 1.4 * T, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,140,60,.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(me.x, me.y, 1.4 * T * f, 0, Math.PI * 2); ctx.stroke();
        var hy = me.y - (1 - f) * 420, hx = me.x + (1 - f) * 160;
        ctx.fillStyle = '#ffb04a'; ctx.beginPath(); ctx.arc(hx, hy, 12, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#7a3a1a'; ctx.beginPath(); ctx.arc(hx, hy, 8, 0, Math.PI * 2); ctx.fill();
      });
      // Energie und Sterne
      energie.forEach(function (e) { var b = Math.sin(zeit * 5 + e.x) * 3; ctx.fillStyle = '#1e8a3a'; ctx.fillRect(e.x - 9, e.y - 12 + b, 18, 22); ctx.fillStyle = '#6ef08a'; ctx.fillRect(e.x - 6, e.y - 9 + b, 12, 16); Pixel.text(ctx, '+', e.x - 4, e.y - 6 + b, 3, '#0a3a18'); });
      sterne.forEach(function (s) { zeichneStern(s.x, s.y - 6 + Math.sin(zeit * 4 + s.x) * 3, 11); });
      if (modus === 'sterne') { ctx.fillStyle = 'rgba(255,210,63,' + (0.25 + Math.sin(zeit * 3) * 0.1) + ')'; ctx.beginPath(); ctx.arc(W / 2, HH / 2, 18, 0, Math.PI * 2); ctx.fill(); }

      // Zielhilfe des Spielers
      zielhilfe();

      // Kämpfer nach y sortiert
      kaempfer.slice().sort(function (a, b) { return a.y - b.y; }).forEach(zeichneKaempfer);
      zonen.forEach(function (z, zi) {
        var eigen = z.besitzer === spieler.team, fremd = z.besitzer >= 0 && !eigen;
        var zf = eigen ? 'rgba(63,162,255,' : fremd ? 'rgba(255,77,90,' : 'rgba(255,255,255,';
        ctx.fillStyle = zf + '.22)'; ctx.beginPath(); ctx.arc(z.x, z.y, ZONE, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = zf + '.9)'; ctx.lineWidth = 4; ctx.setLineDash([10, 8]); ctx.beginPath(); ctx.arc(z.x, z.y, ZONE, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
        var anteil = Math.abs(z.f) / 100, fuerMich = (z.f > 0 ? 0 : 1) === spieler.team;
        ctx.strokeStyle = fuerMich ? '#3fa2ff' : '#ff4d5a'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(z.x, z.y, ZONE + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * anteil); ctx.stroke();
        ctx.font = '26px "Lilita One", sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#000'; ctx.fillText('ABC'[zi], z.x + 2, z.y + 11); ctx.fillStyle = '#fff'; ctx.fillText('ABC'[zi], z.x, z.y + 9);
      });
      tresore.forEach(function (t) {
        var meins = t.team === spieler.team;
        if (t.glocke) {
          var sw0 = Math.sin(zeit * 3) * (t.blitz > 0 ? 0.3 : 0.06);
          ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(t.x, t.y + 22, 30, 9, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#6a4a2a'; ctx.fillRect(t.x - 26, t.y + 8, 52, 12); ctx.fillRect(t.x - 4, t.y - 40, 8, 50);
          ctx.save(); ctx.translate(t.x, t.y - 36); ctx.rotate(sw0);
          ctx.fillStyle = t.blitz > 0 ? '#fff' : '#ffc828'; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.lineTo(22, 34); ctx.lineTo(-22, 34); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#c8960a'; ctx.fillRect(-22, 30, 44, 6); ctx.fillStyle = '#8a6a1a'; ctx.beginPath(); ctx.arc(0, 40, 5, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
          ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(t.x - 36, t.y - 58, 72, 10);
          ctx.fillStyle = '#3fa2ff'; ctx.fillRect(t.x - 34, t.y - 56, 68 * t.hp / t.max, 6);
          return;
        }
        ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(t.x, t.y + 22, 34, 10, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = t.blitz > 0 ? '#fff' : '#6a6e78'; ctx.fillRect(t.x - 30, t.y - 34, 60, 56);
        ctx.fillStyle = t.blitz > 0 ? '#fff' : '#8a8e98'; ctx.fillRect(t.x - 26, t.y - 30, 52, 48);
        ctx.strokeStyle = '#3a3e48'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(t.x, t.y - 6, 13, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#ffd23f'; ctx.fillRect(t.x - 2, t.y - 19, 4, 10); ctx.fillRect(t.x + 18, t.y - 10, 5, 10);
        ctx.strokeStyle = meins ? '#3fa2ff' : '#ff4d5a'; ctx.lineWidth = 4; ctx.strokeRect(t.x - 32, t.y - 36, 64, 60);
        ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(t.x - 36, t.y - 52, 72, 10);
        ctx.fillStyle = meins ? '#3fa2ff' : '#ff4d5a'; ctx.fillRect(t.x - 34, t.y - 50, 68 * t.hp / t.max, 6);
      });
      projektile.forEach(zeichneProjektil);
      if (ball && ball.da) {
        var bh2 = ball.traeger ? 0 : Math.min(10, Math.hypot(ball.vx, ball.vy) / 60);
        ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(ball.x, ball.y + 8, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.strokeStyle = '#222'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ball.x, ball.y - bh2, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#222'; ctx.save(); ctx.translate(ball.x, ball.y - bh2); ctx.rotate(ball.x * 0.05 + ball.y * 0.05);
        ctx.fillRect(-3, -3, 6, 6); ctx.fillRect(-9, -2, 3, 4); ctx.fillRect(6, -2, 3, 4); ctx.fillRect(-2, 6, 4, 3); ctx.fillRect(-2, -9, 4, 3); ctx.restore();
      }

      // Hecken über allem
      var x0 = Math.max(0, Math.floor((kamX - halbW) / T) - 1), x1 = Math.min(B - 1, Math.ceil((kamX + halbW) / T) + 1);
      var y0 = Math.max(0, Math.floor((kamY - halbH) / T) - 1), y1 = Math.min(H - 1, Math.ceil((kamY + halbH) / T) + 1);
      var spielerHecke = inHecke(spieler) ? Math.floor(spieler.x / T) + ',' + Math.floor(spieler.y / T) : '';
      for (var ty = y0; ty <= y1; ty++) for (var tx = x0; tx <= x1; tx++) {
        if (feld[ty * B + tx] !== 2) continue;
        var nah = Math.hypot((tx + 0.5) * T - spieler.x, (ty + 0.5) * T - spieler.y) < T * 1.6 && spielerHecke;
        ctx.globalAlpha = nah ? 0.45 : 1;
        var x = tx * T, y = ty * T;
        ctx.fillStyle = '#2f7a34'; ctx.fillRect(x - 2, y - 10, T + 4, T + 8);
        ctx.fillStyle = '#46a24a'; ctx.fillRect(x + 2, y - 8, 14, 12); ctx.fillRect(x + 20, y - 4, 16, 12); ctx.fillRect(x + 6, y + 10, 14, 12);
        ctx.fillStyle = '#6ac86a'; ctx.fillRect(x + 6, y - 6, 4, 4); ctx.fillRect(x + 26, y - 2, 4, 4);
      }
      ctx.globalAlpha = 1;

      effekte.forEach(function (e) {
        var f = e.t / e.d;
        ctx.globalAlpha = 1 - f;
        if (e.art === 'splitter' || e.art === 'staub') { ctx.fillStyle = e.farbe; var g = e.art === 'staub' ? 6 + f * 10 : 6; ctx.fillRect(e.x - g / 2, e.y - g / 2, g, g); }
        else if (e.art === 'ring') { ctx.strokeStyle = e.farbe; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(e.x, e.y, 10 + (e.r - 10) * Math.min(1, f * 1.5) + (e.r < 20 ? f * 60 : 0), 0, Math.PI * 2); ctx.stroke(); }
        else if (e.art === 'boom') { ctx.fillStyle = e.farbe; ctx.beginPath(); ctx.arc(e.x, e.y, e.r * (0.5 + f * 0.6), 0, Math.PI * 2); ctx.fill(); }
        else if (e.art === 'geist') {
          var gk = kaempfer[e.ki];
          if (gk) {
            var gi = gk.def.sprite('tot'); if (gk.skin) gi = BS.umfaerben(gi, gk.skin);
            var gs = (gk.def.skala || 2) * (1 - f * 0.4);
            ctx.save(); ctx.globalAlpha = (1 - f) * 0.8; ctx.translate(e.x, e.y + 8 - f * 50); ctx.rotate(f * (e.links ? -0.8 : 0.8));
            Pixel.draw(ctx, weissBild(gi), -gi.width * gs / 2, -gi.height * gs, gs, e.links);
            ctx.restore();
          }
        }
        else if (e.art === 'hieb') { ctx.strokeStyle = e.farbe; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(e.x, e.y, e.r * (0.6 + f * 0.4), e.w - e.breite / 2, e.w + e.breite / 2); ctx.stroke(); }
        ctx.globalAlpha = 1;
      });
      zahlen.forEach(function (z) {
        if (z.t < 0) return;
        ctx.globalAlpha = 1 - Math.max(0, z.t - 0.5) * 2.5;
        ctx.font = '17px "Lilita One", sans-serif'; ctx.textAlign = 'center';
        ctx.fillStyle = '#000'; ctx.fillText(z.text, z.x + 2, z.y + 2); ctx.fillStyle = z.farbe; ctx.fillText(z.text, z.x, z.y);
        ctx.globalAlpha = 1;
      });

      // Kreidestaub (Royale)
      if (royaleArt && gas.r < Math.hypot(W, HH) / 2) {
        ctx.save();
        ctx.beginPath(); ctx.rect(-T * 3, -T * 3, W + T * 6, HH + T * 6); ctx.arc(W / 2, HH / 2, gas.r, 0, Math.PI * 2, true);
        ctx.fillStyle = 'rgba(235,240,255,.45)'; ctx.fill('evenodd');
        ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(W / 2, HH / 2, gas.r, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      steuerungZeichnen();
      feedZeichnen();
      hudAktualisieren();
    }

    function zielhilfe() {
      if (spieler.tot) return;
      var z = null, istSuper = false;
      if (stickR) z = stickZiel(stickR, false);
      else if (stickS) { z = stickZiel(stickS, true); istSuper = true; }
      else if (!touch && maus.drin) z = { w: mausWinkel(), d: mausDist() };
      if (!z) return;
      var ox = spieler.x, oy = spieler.y - SH;
      if (ball && ball.traeger === spieler && !istSuper) {
        ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 4; ctx.setLineDash([10, 8]);
        ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + Math.cos(z.w) * klemm(z.d, T * 2, T * 9), oy + Math.sin(z.w) * klemm(z.d, T * 2, T * 9)); ctx.stroke(); ctx.setLineDash([]);
        return;
      }
      var a = spieler.def.angriff, art = istSuper ? spieler.def.superArt : a.art;
      var reich = (istSuper ? (spieler.def.superReichweite || 3.2) : a.reichweite) * T;
      ctx.fillStyle = istSuper ? 'rgba(255,210,63,.28)' : 'rgba(255,255,255,.2)';
      if (art === 'wurf' || art === 'veto' || art === 'natrium' || art === 'sandsturm' || art === 'schwarzesloch' || art === 'klosprint') {
        var d = klemm(z.d, T, reich), px = ox + Math.cos(z.w) * d, py = oy + Math.sin(z.w) * d;
        var fl = art === 'wurf' ? a.flaeche * T : art === 'veto' ? 2.2 * T : art === 'natrium' ? 2.6 * T : art === 'sandsturm' || art === 'schwarzesloch' ? 2.6 * T : 1.7 * T;
        ctx.beginPath(); ctx.arc(px, py, fl, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 3; ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(px, py); ctx.stroke(); ctx.setLineDash([]);
      } else if (art === 'nah') {
        ctx.beginPath(); ctx.moveTo(ox, oy); ctx.arc(ox, oy, reich, z.w - a.breite / 2, z.w + a.breite / 2); ctx.closePath(); ctx.fill();
      } else if (art === 'aura' || art === 'moshpit' || art === 'zungenwirbel' || art === 'haarflip' || art === 'dinner' || art === 'hunger' || art === 'unsichtbar' || art === 'lernnie') {
        ctx.beginPath(); ctx.arc(spieler.x, spieler.y, art === 'aura' ? 3.2 * T : art === 'moshpit' ? 2.2 * T : art === 'zungenwirbel' ? 2.8 * T : art === 'haarflip' ? 3 * T : art === 'dinner' ? 6 * T : T * 1.2, 0, Math.PI * 2); ctx.fill();
      } else {
        var breite = istSuper ? 24 : Math.max(16, (a.radius || 8) * 2) + (a.streuung ? 0 : 0);
        ctx.save(); ctx.translate(ox, oy); ctx.rotate(z.w);
        if (!istSuper && a.streuung > 0.2) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, reich, -a.streuung / 2 - 0.05, a.streuung / 2 + 0.05); ctx.closePath(); ctx.fill(); }
        else ctx.fillRect(0, -breite / 2, reich, breite);
        ctx.restore();
      }
    }

    function feedZeichnen() {
      ctx.font = '13px "Lilita One", sans-serif'; ctx.textAlign = 'right';
      feed.forEach(function (f, i) {
        var a = kaempfer[f.a], b = kaempfer[f.b]; if (!b) return;
        var na = a ? (a === spieler ? 'Du' : a.name || a.def.name) : f.art === 'meteor' ? '☄ Meteor' : '☠ Kreidestaub';
        var nb = b === spieler ? 'Du' : b.name || b.def.name;
        var y = 64 + i * 26, x = VW - 14;
        ctx.globalAlpha = Math.min(1, f.t);
        var w = ctx.measureText(na + '  ✖  ' + nb).width + 18;
        ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(x - w, y - 16, w, 22);
        ctx.fillStyle = b.team === spieler.team ? '#ff6a6a' : '#7dc4ff';
        ctx.fillText(nb, x - 8, y);
        var wb = ctx.measureText(nb).width;
        ctx.fillStyle = '#fff'; ctx.fillText('✖', x - 8 - wb - 8, y);
        ctx.fillStyle = a ? (a.team === spieler.team ? '#7dc4ff' : '#ff6a6a') : '#ddd';
        ctx.fillText(na, x - 8 - wb - 28, y);
        ctx.globalAlpha = 1;
      });
    }
    function steuerungZeichnen() {
      if (!touch) return;
      function kreis(x, y, r, f, l) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); if (f) { ctx.fillStyle = f; ctx.fill(); } if (l) { ctx.strokeStyle = l; ctx.lineWidth = 3; ctx.stroke(); } }
      if (stickL) {
        kreis(stickL.sx, stickL.sy, STICK, 'rgba(255,255,255,.12)', 'rgba(255,255,255,.35)');
        var dx = stickL.x - stickL.sx, dy = stickL.y - stickL.sy, l = Math.hypot(dx, dy), f = l > STICK ? STICK / l : 1;
        kreis(stickL.sx + dx * f, stickL.sy + dy * f, 28, 'rgba(255,255,255,.5)');
      } else { ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.font = '14px "Lilita One", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('LAUFEN', VW * 0.18, VH - 40); }
      // Angriff
      var a = stickR || { sx: angriffKnopf.x, sy: angriffKnopf.y, x: angriffKnopf.x, y: angriffKnopf.y };
      kreis(a.sx, a.sy, angriffKnopf.r, 'rgba(255,120,60,.25)', 'rgba(255,160,90,.8)');
      var ax = a.x - a.sx, ay = a.y - a.sy, al = Math.hypot(ax, ay), af = al > STICK ? STICK / al : 1;
      kreis(a.sx + ax * af, a.sy + ay * af, 24, 'rgba(255,160,90,.85)');
      // Super
      var bereit = superBereit(), sp = stickS || { sx: superKnopf.x, sy: superKnopf.y, x: superKnopf.x, y: superKnopf.y };
      var anteil = spieler.superLadung / spieler.def.superKosten;
      kreis(sp.sx, sp.sy, superKnopf.r, bereit ? 'rgba(255,210,63,.4)' : 'rgba(0,0,0,.3)', 'rgba(255,255,255,.25)');
      ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(sp.sx, sp.sy, superKnopf.r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * anteil); ctx.stroke();
      if (bereit) { var sx = sp.x - sp.sx, sy = sp.y - sp.sy, sl = Math.hypot(sx, sy), sf = sl > STICK ? STICK / sl : 1; kreis(sp.sx + sx * sf, sp.sy + sy * sf, 20, '#ffd23f'); }
      ctx.fillStyle = bereit ? '#3a2400' : 'rgba(255,255,255,.6)'; ctx.font = '13px "Lilita One", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('SUPER', sp.sx, sp.sy + 4);
      if (spieler.ultraOk) {
        var ub = ultraBereit(spieler), ua = spieler.ultra > 0 ? spieler.ultra / 5 : spieler.ultraLadung / (spieler.def.superKosten * 1.5);
        kreis(ultraKnopf.x, ultraKnopf.y, ultraKnopf.r, ub ? 'rgba(196,106,255,.6)' : 'rgba(0,0,0,.3)', 'rgba(255,255,255,.3)');
        ctx.strokeStyle = '#c46aff'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(ultraKnopf.x, ultraKnopf.y, ultraKnopf.r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ua); ctx.stroke();
        ctx.fillStyle = ub ? '#2a0a3a' : 'rgba(255,255,255,.5)'; ctx.font = '12px "Lilita One", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('ULTRA', ultraKnopf.x, ultraKnopf.y + 4);
      }
      if (spieler.stufe >= BS.TRICK_AB) {
        var tb = spieler.tricks > 0 && spieler.trickT <= 0;
        kreis(trickKnopf.x, trickKnopf.y, trickKnopf.r, tb ? 'rgba(110,240,138,.55)' : 'rgba(0,0,0,.3)', 'rgba(255,255,255,.3)');
        ctx.fillStyle = tb ? '#0a3a18' : 'rgba(255,255,255,.5)'; ctx.font = '12px "Lilita One", sans-serif'; ctx.fillText('TRICK', trickKnopf.x, trickKnopf.y + 1);
        ctx.fillText(spieler.tricks + 'x', trickKnopf.x, trickKnopf.y + 13);
      }
    }

    var letzterHud = '';
    function hudAktualisieren() {
      var rest = Math.max(0, Math.ceil(dauer - zeit)), uhr = Math.floor(rest / 60) + ':' + ('0' + rest % 60).slice(-2);
      var h = '';
      if (modus === 'sterne') {
        var a = teamSterne(spieler.team), b = teamSterne(1 - spieler.team);
        h = '<div class="punkte"><span class="blau">★ ' + a + '</span><span class="uhr">' + uhr + '</span><span class="rotx">' + b + ' ★</span></div>';
        if (sternCountdown !== null) h += '<div class="ansage ' + (sternTeam === spieler.team ? 'blau' : 'rotx') + '">' + (sternTeam === spieler.team ? 'Ihr gewinnt in ' : 'Gegner gewinnt in ') + Math.ceil(sternCountdown) + '</div>';
      } else if (modus === 'ball') {
        h = '<div class="punkte"><span class="blau">⚽ ' + tore[spieler.team] + '</span><span class="uhr">' + uhr + '</span><span class="rotx">' + tore[1 - spieler.team] + ' ⚽</span></div>';
        if (torAnsage > 0) h += '<div class="ansage gross ' + (torTeam === spieler.team ? 'blau' : 'rotx') + '">TOR!</div>';
        else if (ball.traeger === spieler) h += '<div class="ansage">Du hast den Ball – zielen und schießen! Tor ist oben.</div>';
      } else if (modus === 'huegel') {
        var hz = huegelHalter === -2 ? 'umkämpft!' : huegelHalter === -1 ? 'frei' : huegelHalter === spieler.team ? 'eure Zone' : 'gegnerische Zone';
        h = '<div class="punkte"><span class="blau">♛ ' + Math.floor(huegel[spieler.team]) + ' %</span><span class="uhr">' + uhr + '</span><span class="rotx">' + Math.floor(huegel[1 - spieler.team]) + ' % ♛</span></div><div class="ansage">Zone: ' + hz + '</div>';
      } else if (modus === 'tresor') {
        var tm0 = tresore[spieler.team], tm1 = tresore[1 - spieler.team];
        h = '<div class="punkte"><span class="blau">🔒 ' + Math.ceil(tm0.hp / tm0.max * 100) + ' %</span><span class="uhr">' + uhr + '</span><span class="rotx">' + Math.ceil(tm1.hp / tm1.max * 100) + ' % 🔒</span></div>';
      } else if (modus === 'kopfgeld') {
        h = '<div class="punkte"><span class="blau">★ ' + teamKopf[spieler.team] + '</span><span class="uhr">' + uhr + '</span><span class="rotx">' + teamKopf[1 - spieler.team] + ' ★</span></div><div class="ansage">Dein Kopfgeld: ' + spieler.kopfgeld + ' ★</div>';
      } else if (training) {
        h = '<div class="punkte"><span>🎯 Trainingsplatz</span></div><div class="ansage">Probier alles aus – ✕ oben rechts beendet das Training.</div>';
      } else if (modus === 'boss') {
        var bs = kaempfer.filter(function (k) { return k.npc === 'boss'; })[0];
        var bp = bs ? Math.max(0, Math.ceil(bs.hp / bs.maxHp * 100)) : 0;
        h = '<div class="punkte"><span>🤖 Robo-Hausmeister</span><span class="uhr">' + uhr + '</span></div><div class="bossbalken"><i style="width:' + bp + '%"></i><span>' + bp + ' %</span></div>';
      } else if (modus === 'wellen') {
        var gl = tresore[0], ml = kaempfer.filter(function (k) { return k.npc && !k.tot; }).length;
        h = '<div class="punkte"><span class="blau">🔔 ' + Math.ceil(gl.hp / gl.max * 100) + ' %</span><span>Welle ' + Math.max(1, welle) + '/' + WELLEN + '</span></div>';
        h += ml ? '<div class="ansage">' + ml + (ml === 1 ? ' Kreideklecks' : ' Kreidekleckse') + ' übrig</div>' : (welle < WELLEN ? '<div class="ansage gross">Welle ' + (welle + 1) + ' kommt!</div>' : '');
      } else if (eroberung) {
        var zb = zonen.map(function (z, i) { return '<b class="' + (z.besitzer === spieler.team ? 'blau' : z.besitzer >= 0 ? 'rotx' : '') + '">' + 'ABC'[i] + '</b>'; }).join(' ');
        h = '<div class="punkte"><span class="blau">🚩 ' + Math.floor(zonenPunkte[spieler.team]) + '</span><span class="uhr">' + uhr + '</span><span class="rotx">' + Math.floor(zonenPunkte[1 - spieler.team]) + ' 🚩</span></div><div class="ansage zonenzeile">' + zb + '</div>';
      } else if (modus === 'kloppe' || gross) {
        h = '<div class="punkte"><span class="blau">✊ ' + teamKos[spieler.team] + '</span><span class="uhr">' + uhr + '</span><span class="rotx">' + teamKos[1 - spieler.team] + ' ✊</span></div>';
      } else {
        var lebend = kaempfer.filter(function (k) { return !k.tot; }).length;
        if (duo) { var tl = {}; kaempfer.forEach(function (k) { if (!k.tot) tl[k.team] = 1; }); lebend = Object.keys(tl).length + ' Duos'; }
        h = '<div class="punkte"><span>☠ ' + lebend + ' übrig</span>' + (spieler.energie ? '<span class="gruen">⚡ ' + spieler.energie + '</span>' : '') + '</div>';
        if (zeit > gas.start - 4 && zeit < gas.start + 2) h += '<div class="ansage">Der Kreidestaub kommt!</div>';
      }
      if (spieler.tot && duo && kaempfer.some(function (k) { return k.team === spieler.team && !k.tot; })) h += '<div class="ansage">Raus – dein Partner kämpft weiter!</div>';
      else if (spieler.tot && !team) h += '<div class="ansage gross">Raus – Platz ' + (spieler.platz || '?') + '<br><small>Du schaust zu …</small></div>';
      if (spieler.tot && team) h += '<div class="ansage gross">K.o.! Zurück in ' + Math.ceil(spieler.respawn) + '</div>';
      if (!touch) h += '<div class="superanz' + (superBereit() ? ' bereit' : '') + '"><i style="width:' + Math.round(spieler.superLadung / spieler.def.superKosten * 100) + '%"></i><span>' + (superBereit() ? 'SUPER BEREIT – Leertaste / Rechtsklick' : 'Super lädt …') + '</span></div>'
        + (spieler.ultraOk ? '<div class="ultraanz' + (ultraBereit(spieler) ? ' bereit' : '') + (spieler.ultra > 0 ? ' aktiv' : '') + '">' + (spieler.ultra > 0 ? 'ULTRA AKTIV' : ultraBereit(spieler) ? 'ULTRA (R)!' : 'Ultra ' + Math.floor(spieler.ultraLadung / (spieler.def.superKosten * 1.5) * 100) + ' %') + '</div>' : '')
        + (spieler.stufe >= BS.TRICK_AB ? '<div class="trickanz' + (spieler.tricks > 0 && spieler.trickT <= 0 ? ' bereit' : '') + '">Trick (Q): ' + spieler.tricks + '×</div>' : '');
      if (zeit < 3) h += '<div class="ansage gross">' + BS.MODI.filter(function (m) { return m.id === modus; })[0].name + '</div>';
      if (h !== letzterHud) { hud.innerHTML = h; letzterHud = h; }
    }

    // ---------- Ende ----------
    var aus = false;
    function abschluss(sieger) {
      function fuer(k) {
        var st = { kos: k.kos, schaden: Math.round(k.statSchaden), supers: k.statSupers, tore: k.statTore };
        if (royaleArt) { st.ergebnis = k.platz === 1 ? 'sieg' : 'raus'; st.platz = k.platz || 1; st.sterne = 0; return st; }
        st.ergebnis = sieger === -1 ? 'unentschieden' : k.team === sieger ? 'sieg' : 'niederlage'; st.platz = 0;
        st.sterne = modus === 'sterne' ? teamSterne(k.team) : modus === 'kopfgeld' ? teamKopf[k.team] : 0;
        return st;
      }
      // Tabelle für den Ergebnisbildschirm und bester Spieler (MVP) aus dem Gewinnerteam
      var punkte = function (k) { return k.kos * 3 + k.statSchaden / 250 + k.statTore * 5 + (k.platz === 1 ? 5 : 0); };
      var spielende = kaempfer.filter(function (k) { return !k.npc; });
      var kandidaten = spielende.filter(function (k) { return royaleArt ? k.platz === 1 : sieger === -1 || k.team === sieger; });
      if (!kandidaten.length) kandidaten = spielende;
      var mvp = kandidaten.reduce(function (a, b) { return punkte(b) > punkte(a) ? b : a; });
      var tabelle = kaempfer.filter(function (k) { return k.npc !== 'monster'; }).map(function (k) {
        return { n: k.name || k.def.name, kid: k.def.id, skin: k.skin ? k.skin.id : '', team: k.team, kos: k.kos, schaden: Math.round(k.statSchaden), tore: k.statTore, supers: k.statSupers, tode: k.statTode, npc: k.npc ? 1 : 0, mvp: k === mvp, mensch: k.mensch || 0, weg: !!k.weg };
      });
      var fuerAlt = fuer;
      fuer = function (k) { var st = fuerAlt(k); st.tabelle = tabelle; st.ich = kaempfer.filter(function (o) { return o.npc !== 'monster'; }).indexOf(k); st.meinTeam = k.team; st.mvp = k === mvp; return st; };
      if (host) {
        var r = {};
        kaempfer.forEach(function (k) { if (k.mensch && k !== spieler) r[k.mensch] = fuer(k); });
        sendeZustand();
        netz.senden({ t: 'an_alle', d: { t: 'ende', r: r } });
        netz.senden({ t: 'ende' });
      }
      beenden(fuer(spieler));
    }
    function beenden(e) {
      if (ende) return;
      ende = e; e.kos = e.kos || 0; e.online = !!netz;
      if (e.ergebnis === 'sieg') kaempfer.forEach(function (k) { if (k.team === spieler.team && !k.tot) k.jubel = true; });
      if (e.schaden === undefined) { e.schaden = Math.round(spieler.statSchaden); e.supers = spieler.statSupers; e.tore = spieler.statTore; }
      var ergebnis = e.ergebnis;
      if (ergebnis === 'sieg') { sfx.tone(523, 0.15, 'square', 0.07); sfx.tone(659, 0.15, 'square', 0.07, null, 0.15); sfx.tone(784, 0.3, 'square', 0.07, null, 0.3); }
      else if (ergebnis === 'niederlage' || ergebnis === 'raus') sfx.tone(300, 0.5, 'sawtooth', 0.06, 120);
      setTimeout(function () { stop(); fertig(ende); }, 1400);
    }
    function stop() {
      aus = true;
      if (netz && Netz.spiel) Netz.spiel = null;
      removeEventListener('keydown', aufTaste); removeEventListener('keyup', aufTaste); removeEventListener('resize', groesse);
      removeEventListener('keydown', tabTaste); removeEventListener('keyup', tabTaste);
      root.hidden = true; root.innerHTML = '';
    }

    var letzte = performance.now(), hostSendeT = 0;
    kamX = spieler.x; kamY = spieler.y;
    function loop(jetzt) {
      if (aus) return;
      var dt = Math.min(0.05, (jetzt - letzte) / 1000); letzte = jetzt;
      if (intro > 0) { intro -= dt; zeichnen(); requestAnimationFrame(loop); return; }
      feedZeit(dt);
      if (!tabelleEl.hidden) { tabelleT -= dt; if (tabelleT <= 0) { tabelleT = 0.5; tabelleZeigen(true); } }
      if (!pausiert && !ende) {
        if (gast) gastSchritt(dt);
        else schritt(dt);
        if (host && !ende) { hostSendeT -= dt; if (hostSendeT <= 0) { hostSendeT = 0.05; sendeZustand(); } }
      }
      else if (ende) { effekte.forEach(function (e) { e.t += dt * 0.3; }); }
      zeichnen();
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
    return { stop: stop };
  };
})();
