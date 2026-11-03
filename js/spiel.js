// Bravo Stars – eine Runde: Karte, Kämpfer, Projektile, Bots, Modus-Regeln, Zeichnen und Steuerung.
// BS.starten(optionen, fertig) startet eine Runde im #spiel-Container; fertig(ergebnis) kommt am Ende.
(function () {
  var T = 40;                       // Feldgröße in Pixeln
  var REGEN_PAUSE = 3, REGEN_PRO_S = 0.13;
  var TEAMFARBE = ['#3fa2ff', '#ff4d5a'];
  var sfx = Pixel.sfx;

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function klemm(v, a, b) { return v < a ? a : v > b ? b : v; }
  function abst(a, b) { var dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); }
  function winkelDiff(a, b) { var d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; }
  function mischen(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  BS.starten = function (opt, fertig) {
    var root = document.getElementById('spiel');
    root.innerHTML = '';
    root.hidden = false;
    var cv = document.createElement('canvas'); cv.className = 'feld'; root.appendChild(cv);
    var ctx = cv.getContext('2d');
    var hud = document.createElement('div'); hud.className = 'hud'; root.appendChild(hud);
    var pauseKnopf = document.createElement('button'); pauseKnopf.className = 'pause'; pauseKnopf.type = 'button';
    pauseKnopf.textContent = '✕'; pauseKnopf.setAttribute('aria-label', 'Runde aufgeben'); root.appendChild(pauseKnopf);

    var modus = opt.modus, team = modus !== 'royale';
    // Online: der Host rechnet alles und schickt 20x pro Sekunde den Stand, Gäste schicken nur Eingaben
    var netz = opt.netz || null, host = !!(netz && netz.rolle === 'host'), gast = !!(netz && netz.rolle === 'gast');
    var ev = [];   // Ereignisse (Effekte, Zahlen, Töne, kaputte Wände) seit dem letzten Stand
    var sfx = {
      tone: function () { Pixel.sfx.tone.apply(null, arguments); if (host) ev.push(['s', 0, [].slice.call(arguments)]); },
      noise: function () { Pixel.sfx.noise.apply(null, arguments); if (host) ev.push(['s', 1, [].slice.call(arguments)]); }
    };
    function fx(e) { effekte.push(e); if (host) ev.push(['f', e]); }
    function zahl(z) { zahlen.push(z); if (host) ev.push(['z', z]); }
    var karte = BS.karte(modus);
    var B = karte.zeilen[0].length, H = karte.zeilen.length;
    var W = B * T, HH = H * T;
    // Felder: 0 Boden, 1 Wand, 2 Hecke, 3 Wasser, 4 Kiste
    var feld = new Uint8Array(B * H), kistenHp = {};
    karte.zeilen.forEach(function (z, y) {
      for (var x = 0; x < B; x++) {
        var c = z[x], v = c === '#' ? 1 : c === 'b' ? 2 : c === 'w' ? 3 : c === 'K' ? 4 : 0;
        feld[y * B + x] = v;
        if (v === 4) kistenHp[y * B + x] = 90;
      }
    });
    function fAt(tx, ty) { if (tx < 0 || ty < 0 || tx >= B || ty >= H) return 1; return feld[ty * B + tx]; }
    function fPx(x, y) { return fAt(Math.floor(x / T), Math.floor(y / T)); }
    function blockiertLauf(v) { return v === 1 || v === 3 || v === 4; }
    function blockiertSchuss(v) { return v === 1 || v === 4; }

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
      if (v !== 1 && v !== 4) return;
      feld[ty * B + tx] = 0;
      if (host) ev.push(['w', tx, ty]);
      if (v === 4) energie.push({ x: (tx + 0.5) * T, y: (ty + 0.5) * T });
      for (var i = 0; i < 6; i++) fx({ art: 'splitter', x: (tx + 0.5) * T, y: (ty + 0.5) * T, vx: rnd(-150, 150), vy: rnd(-150, 150), t: 0, d: 0.5, farbe: v === 4 ? '#b8792e' : '#8a5a34' });
      feldZeichnen(tx, ty);
      wegeNeu = true;
    }

    // ---------- Kämpfer ----------
    var kaempfer = [];
    function neuerKaempfer(def, tm, istSpieler) {
      var k = {
        def: def, team: tm, spieler: istSpieler, x: 0, y: 0, r: def.radius || 16,
        hp: def.hp, maxHp: def.hp, munition: 3, ladeT: 0, superLadung: 0, superBereit: false,
        blick: tm === 0 ? -Math.PI / 2 : Math.PI / 2, lauf: 0, bewegt: false,
        betaeubt: 0, gebremst: 0, schild: 0, unsichtbar: 0, gross: 0, turbo: 0, doppelt: false,
        dash: null, stoss: null, zuletztAktiv: -9, zuletztGetroffen: -9, salve: [],
        tot: false, respawn: 0, sterne: 0, kos: 0, energie: 0, platz: 0,
        ki: istSpieler ? null : neueKi()
      };
      kaempfer.push(k);
      return k;
    }

    function neueKi() { return { ziel: null, denk: rnd(0, 0.3), schussT: rnd(0.4, 0.9), seite: Math.random() < 0.5 ? -1 : 1, seiteT: 0 }; }

    var spieler, gegnerPool = mischen(BS.KAEMPFER.filter(function (d) { return d.id !== opt.kaempfer; }));
    var spawns = [];
    if (gast) {
      netz.init.k.forEach(function (z) {
        var k = neuerKaempfer(BS.kaempfer(z[0]), z[1], z[3] === netz.ich);
        k.ki = null; k.name = z[2]; k.mensch = z[3];
        if (z[3] === netz.ich) spieler = k;
      });
    } else if (host) {
      var benutzt = netz.spieler.map(function (m) { return m.kaempfer; });
      var botPool = mischen(BS.KAEMPFER.filter(function (d) { return benutzt.indexOf(d.id) < 0; })).concat(mischen(BS.KAEMPFER.slice()));
      var bi = 0;
      var mensch = function (m, tm) {
        var k = neuerKaempfer(BS.kaempfer(m.kaempfer), tm, m.id === netz.ich);
        k.name = m.name; k.mensch = m.id;
        if (m.id === netz.ich) spieler = k; else { k.ki = null; k.eingabe = { mx: 0, my: 0, b: 0 }; }
      };
      if (team) {
        [0, 1].forEach(function (tm) {
          var drin = netz.spieler.filter(function (m) { return m.team === tm; });
          drin.forEach(function (m) { mensch(m, tm); });
          for (var i = drin.length; i < 3; i++) neuerKaempfer(botPool[bi++], tm, false);
        });
      } else {
        netz.spieler.forEach(function (m, i) { mensch(m, i); });
        for (var i3 = netz.spieler.length; i3 < 8; i3++) neuerKaempfer(botPool[bi++], i3, false);
      }
    } else if (team) {
      spieler = neuerKaempfer(BS.kaempfer(opt.kaempfer), 0, true);
      neuerKaempfer(gegnerPool[0], 0, false);
      neuerKaempfer(gegnerPool[1], 0, false);
      for (var g = 2; g < 5; g++) neuerKaempfer(gegnerPool[g], 1, false);
    } else {
      spieler = neuerKaempfer(BS.kaempfer(opt.kaempfer), 0, true);
      for (var g2 = 0; g2 < 7; g2++) neuerKaempfer(gegnerPool[g2 % gegnerPool.length], g2 + 1, false);
    }
    function freiesFeld(tx, ty) {
      for (var rad = 0; rad < 6; rad++) for (var dy = -rad; dy <= rad; dy++) for (var dx = -rad; dx <= rad; dx++) {
        var v = fAt(tx + dx, ty + dy); if (v === 0 || v === 2) return { x: (tx + dx + 0.5) * T, y: (ty + dy + 0.5) * T };
      }
      return { x: (tx + 0.5) * T, y: (ty + 0.5) * T };
    }
    function spawnPunkt(k) {
      if (team) {
        var mitglieder = kaempfer.filter(function (o) { return o.team === k.team; });
        var i = mitglieder.indexOf(k), cx = Math.floor(B / 2) + (i - 1) * 3;
        return freiesFeld(k.team === 0 ? B - 1 - cx : cx, k.team === 0 ? H - 2 : 1);
      }
      var n = kaempfer.indexOf(k), w = n / kaempfer.length * Math.PI * 2 + Math.PI / 2;
      return freiesFeld(Math.round(B / 2 - 0.5 + Math.cos(w) * (B / 2 - 3)), Math.round(H / 2 - 0.5 + Math.sin(w) * (H / 2 - 3)));
    }
    kaempfer.forEach(function (k) { var s = spawnPunkt(k); k.x = s.x; k.y = s.y; spawns.push(s); });
    if (host) netz.senden({ t: 'an_alle', d: { t: 'init', k: kaempfer.map(function (k) { return [k.def.id, k.team, k.name || '', k.mensch || 0]; }) } });

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
      if (von && von.gross > 0) menge *= 1.6;
      menge = Math.round(menge);
      ziel.hp -= menge; ziel.zuletztGetroffen = zeit;
      if (ziel.unsichtbar > 0) ziel.unsichtbar = 0;
      zahl({ x: ziel.x + rnd(-8, 8), y: ziel.y - 40, t: 0, text: String(menge), farbe: ziel === spieler ? '#ff6a6a' : '#fff' });
      if (von && !ohneLadung && von.team !== ziel.team) { von.superLadung = Math.min(von.def.superKosten, von.superLadung + menge); }
      if (ziel === spieler) wackeln = Math.min(10, wackeln + 4);
      if (ziel.hp <= 0) sterben(ziel, von);
      return menge;
    }
    function heilen(k, menge) { if (k.tot) return; k.hp = Math.min(k.maxHp, k.hp + menge); zahl({ x: k.x, y: k.y - 44, t: 0, text: '+' + Math.round(menge), farbe: '#6ef08a' }); }

    function sterben(k, von) {
      k.tot = true; k.hp = 0; k.dash = null; k.stoss = null; k.salve = [];
      for (var i = 0; i < 14; i++) fx({ art: 'splitter', x: k.x, y: k.y - 14, vx: rnd(-200, 200), vy: rnd(-260, 80), t: 0, d: 0.7, farbe: k.def.farbe });
      sfx.tone(300, 0.3, 'sawtooth', 0.07, 80);
      if (von && von !== k) { von.kos++; if (von === spieler) { sfx.tone(880, 0.12, 'square', 0.07); sfx.tone(1320, 0.15, 'square', 0.06, null, 0.1); } }
      if (modus === 'sterne' && k.sterne > 0) {
        for (var s = 0; s < k.sterne; s++) { var w = rnd(0, Math.PI * 2), v = rnd(60, 200); sterne.push({ x: k.x, y: k.y, vx: Math.cos(w) * v, vy: Math.sin(w) * v, sperre: 0.6 }); }
        k.sterne = 0;
      }
      if (modus === 'kloppe' && von && von.team !== k.team) teamKos[von.team]++;
      if (modus === 'royale') {
        for (var e = 0; e < Math.max(1, k.energie); e++) energie.push({ x: k.x + rnd(-14, 14), y: k.y + rnd(-14, 14) });
        k.platz = kaempfer.filter(function (o) { return !o.tot; }).length + 1;
      } else k.respawn = 3;
    }

    // ---------- Angriffe ----------
    function zielPunkt(k, w, dist) { return { x: k.x + Math.cos(w) * dist, y: k.y + Math.sin(w) * dist }; }

    function angreifen(k, w, dist) {
      if (k.tot || k.betaeubt > 0 || k.munition < 1 || k.dash) return false;
      var a = k.def.angriff;
      k.munition -= 1; k.blick = w; k.zuletztAktiv = zeit;
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
        nahkampf(k, w, a.reichweite * T, a.breite, a.schaden, a.heilt);
        sfx.noise(0.08, 0.15, 900);
      }
      return true;
    }
    function schiessen(k, w, ox, oy) {
      var a = k.def.angriff;
      projektile.push({ x: k.x + (ox || 0) + Math.cos(w) * 14, y: k.y - 14 + (oy || 0) + Math.sin(w) * 14, vx: Math.cos(w) * a.tempo, vy: Math.sin(w) * a.tempo,
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
      // Kisten zerschlagen
      var z = zielPunkt(k, w, reich * 0.7); kisteTreffen(Math.floor(z.x / T), Math.floor(z.y / T), dmg);
    }
    function kisteTreffen(tx, ty, dmg) {
      if (fAt(tx, ty) !== 4) return false;
      var i = ty * B + tx; kistenHp[i] -= dmg;
      fx({ art: 'splitter', x: (tx + 0.5) * T, y: (ty + 0.5) * T, vx: rnd(-80, 80), vy: rnd(-120, 0), t: 0, d: 0.3, farbe: '#b8792e' });
      if (kistenHp[i] <= 0) feldWeg(tx, ty);
      return true;
    }
    function gegnerVon(k) { return kaempfer.filter(function (o) { return o.team !== k.team && !o.tot; }); }

    function flaechenSchaden(k, x, y, rad, dmg, extra) {
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
      if (k.tot || k.betaeubt > 0 || k.superLadung < k.def.superKosten || k.dash) return false;
      k.superLadung = 0; k.blick = w; k.zuletztAktiv = zeit;
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
          projektile.push({ x: k.x, y: k.y - 14, vx: Math.cos(w) * 760, vy: Math.sin(w) * 760, weg: 0, max: maxD, schaden: 30, r: 12, owner: k, team: k.team, look: 'hals', getroffen: [], klau: true, w: w });
          break;
        case 'unsichtbar':
          k.unsichtbar = 4; k.turbo = 4; k.doppelt = true;
          break;
        case 'sandsturm':
          flaechen.push({ x: z.x, y: z.y, r: 2.6 * T, t: 0, d: 5, dps: 14, bremst: true, owner: k, team: k.team, look: 'sand', tick: 0 });
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
            projektile.push({ x: k.x, y: k.y - 14, vx: Math.cos(ww) * 520, vy: Math.sin(ww) * 520, weg: 0, max: 6 * T, schaden: 22, r: 9, owner: k, team: k.team, look: 'teller', getroffen: [], w: ww });
          }
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
    var zeit = 0, ende = null, dauer = modus === 'sterne' ? 150 : modus === 'kloppe' ? 120 : 9999;
    var sternT = 3, sternCountdown = null, sternTeam = -1, teamKos = [0, 0];
    var gas = { r: Math.hypot(W, HH) / 2 + T, ziel: T * 3, start: 20, dauer: 100 };

    function teamSterne(tm) { var s = 0; kaempfer.forEach(function (k) { if (k.team === tm && !k.tot) s += k.sterne; }); return s; }

    function modusSchritt(dt) {
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
      } else if (modus === 'kloppe') {
        if (teamKos[0] >= 10) return abschluss(0);
        if (teamKos[1] >= 10) return abschluss(1);
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
        var menschDa = lebend.some(function (k) { return k === spieler || k.mensch; });
        if (lebend.length <= 1 || !menschDa) { if (lebend.length === 1) lebend[0].platz = 1; return abschluss(-1); }
      }
    }

    // ---------- Bot-Gehirn ----------
    function kiSchritt(k, dt) {
      var ki = k.ki, a = k.def.angriff;
      var reich = (a.art === 'nah' ? a.reichweite : a.reichweite) * T;
      ki.denk -= dt; ki.seiteT -= dt;
      if (ki.seiteT <= 0) { ki.seiteT = rnd(0.6, 1.6); ki.seite = -ki.seite; }
      if (ki.denk <= 0) {
        ki.denk = rnd(0.25, 0.45);
        // nächsten sichtbaren Gegner suchen
        var best = null, bd = 1e9;
        kaempfer.forEach(function (o) {
          if (o.team === k.team || o.tot || !sichtbarFuer(o, k.team)) return;
          var d = abst(k, o); if (d < bd && d < T * 11) { bd = d; best = o; }
        });
        ki.ziel = best;
      }
      var z = ki.ziel && !ki.ziel.tot ? ki.ziel : null;
      var d = z ? abst(k, z) : 1e9;
      var wohin = null, wunschAbst = a.art === 'nah' ? 0 : reich * 0.7;
      var schwach = k.hp < k.maxHp * 0.35;

      if (modus === 'royale' && Math.hypot(k.x - W / 2, k.y - HH / 2) > gas.r - T * 2.5) wohin = { x: W / 2, y: HH / 2 };
      else if (modus === 'sterne') {
        var meinTeam = teamSterne(k.team), andere = teamSterne(1 - k.team);
        if (k.sterne >= 3 && (schwach || (meinTeam >= 10 && meinTeam > andere))) wohin = spawnPunkt(k);
        else if (sterne.length && (!z || d > T * 4)) {
          var ns = null, nd = 1e9;
          sterne.forEach(function (s) { var dd = abst(k, s); if (dd < nd) { nd = dd; ns = s; } });
          if (nd < T * 14) wohin = ns;
        }
        if (!wohin && !z) wohin = { x: W / 2, y: HH / 2 + (k.team === 0 ? T * 2 : -T * 2) };
      } else if (modus === 'royale' && !z) {
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
      } else if (modus === 'kloppe' && !z) wohin = { x: W / 2 + Math.sin(zeit * 0.3 + kaempfer.indexOf(k)) * T * 4, y: HH / 2 };

      if (schwach && z && d < T * 6 && modus !== 'royale') wohin = spawnPunkt(k);

      var mx = 0, my = 0;
      if (wohin) {
        var rw = wegRichtung(k, wohin.x, wohin.y);
        if (abst(k, wohin) > 10) { mx = Math.cos(rw); my = Math.sin(rw); }
      } else if (z) {
        var zw = Math.atan2(z.y - k.y, z.x - k.x), frei = sichtfrei(k.x, k.y, z.x, z.y);
        if (!frei && a.art !== 'wurf' || d > reich * 0.95) { var rw2 = wegRichtung(k, z.x, z.y); mx = Math.cos(rw2); my = Math.sin(rw2); }
        else if (d < wunschAbst * 0.7) { mx = -Math.cos(zw); my = -Math.sin(zw); }
        else if (a.art === 'nah') { mx = Math.cos(zw); my = Math.sin(zw); }
        mx += Math.cos(zw + Math.PI / 2) * ki.seite * 0.7; my += Math.sin(zw + Math.PI / 2) * ki.seite * 0.7;
      }
      var len = Math.hypot(mx, my);
      if (len > 0) { mx /= len; my /= len; }

      // schießen
      ki.schussT -= dt;
      if (z) {
        var frei2 = a.art === 'wurf' || sichtfrei(k.x, k.y - 14, z.x, z.y - 14);
        // Vorhalt: wohin der Gegner gleich läuft
        var flug = a.art === 'wurf' ? a.flugzeit : d / (a.tempo || 1000);
        var px = z.x + (z.vx || 0) * flug * 0.7, py = z.y + (z.vy || 0) * flug * 0.7;
        var zielW = Math.atan2(py - k.y, px - k.x) + rnd(-0.12, 0.12);
        if (frei2 && d < reich * 0.95 + z.r && ki.schussT <= 0 && k.munition >= 1) {
          ki.schussT = rnd(0.3, 0.75) + (k.munition < 2 ? 0.4 : 0);
          angreifen(k, zielW, Math.hypot(px - k.x, py - k.y));
        }
        if (k.superLadung >= k.def.superKosten && ki.schussT < 0.3) {
          var sa = k.def.superArt, sr = (k.def.superReichweite || 0) * T;
          var ok = (sa === 'aura' && d < T * 3) || (sa === 'dinner' && d < T * 4.5) || (sa === 'hunger' && d < T * 4) ||
            (sa === 'lernnie' && k.hp < k.maxHp * 0.6 && d < reich) || (sa === 'unsichtbar' && d < T * 7) ||
            (sr && d < sr && (sa === 'veto' || sa === 'natrium' || sa === 'sandsturm' || frei2));
          if (ok) superZuenden(k, zielW, Math.hypot(px - k.x, py - k.y));
        }
      }
      return { mx: mx, my: my };
    }

    // ---------- Steuerung ----------
    var tasten = {}, maus = { x: 0, y: 0, unten: false, drin: false };
    var touch = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
    var stickL = null, stickR = null, stickS = null;   // { id, sx, sy, x, y }
    var superKnopf = { x: 0, y: 0, r: 46 }, angriffKnopf = { x: 0, y: 0, r: 58 };
    function istTaste(c) { return tasten[c]; }
    function aufTaste(e) {
      tasten[e.code] = e.type === 'keydown';
      if (e.type === 'keydown' && (e.code === 'Space' || e.code === 'KeyE')) { e.preventDefault(); spielerSuper(mausWinkel(), mausDist()); }
      if (e.type === 'keydown' && e.code === 'Escape') aufgeben();
    }
    addEventListener('keydown', aufTaste); addEventListener('keyup', aufTaste);
    var dpr = 1, VW = 0, VH = 0, zoom = 1, kamX = 0, kamY = 0;
    function welt(px, py) { return { x: (px - VW / 2) / zoom + kamX, y: (py - VH / 2) / zoom + kamY }; }
    function mausWinkel() { var p = welt(maus.x, maus.y); return Math.atan2(p.y - (spieler.y - 14), p.x - spieler.x); }
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
    function superBereit() { return !spieler.tot && spieler.superLadung >= spieler.def.superKosten; }
    var gastAngriffT = 0;
    function spielerAngriff(w, d) {
      if (ende || pausiert) return;
      if (gast) { if (spieler.munition >= 1 && zeit - gastAngriffT > 0.15) { gastAngriffT = zeit; netz.senden({ t: 'an_host', d: { a: 'angriff', w: w, d: d } }); } return; }
      angreifen(spieler, w, d);
    }
    function spielerSuper(w, d) {
      if (ende || pausiert || !superBereit()) return;
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
        beenden(modus === 'royale' ? { ergebnis: 'raus', platz: spieler.platz || kaempfer.filter(function (k) { return !k.tot; }).length, kos: spieler.kos }
          : { ergebnis: 'niederlage', kos: spieler.kos, sterne: modus === 'sterne' ? teamSterne(spieler.team) : 0 });
      });
    }
    pauseKnopf.addEventListener('click', aufgeben);

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
            k.dash ? (k.dash.look === 'boot' ? 1 : 2) : 0, Math.min(99, Math.round((zeit - k.zuletztAktiv) * 10)), k.platz];
        }),
        p: projektile.map(function (p) {
          return p.wurf ? [1, r1(p.sx), r1(p.sy), r1(p.tx), r1(p.ty), r2(p.t), p.T, r1(p.flaeche), p.look]
            : [0, r1(p.x), r1(p.y), r1(p.vx), r1(p.vy), p.look, r2(p.w || 0), kaempfer.indexOf(p.owner), p.r];
        }),
        s: sterne.map(function (o) { return [r1(o.x), r1(o.y)]; }),
        e: energie.map(function (o) { return [r1(o.x), r1(o.y)]; }),
        f: flaechen.map(function (o) { return [r1(o.x), r1(o.y), r1(o.r)]; }),
        g: r1(gas.r), tk: teamKos, sc: sternCountdown === null ? null : r2(sternCountdown), st: sternTeam, ev: ev };
      ev = [];
      netz.senden({ t: 'an_alle', d: d });
    }
    function zustandAnwenden(d) {
      zeit = d.z;
      d.k.forEach(function (a, i) {
        var k = kaempfer[i]; if (!k) return;
        if (k === spieler && a[2] < k.hp && !k.tot) wackeln = Math.min(10, wackeln + 4);
        k.zx = a[0]; k.zy = a[1];
        if (!k.da || (k.tot && !a[10]) || Math.hypot(k.x - a[0], k.y - a[1]) > 160) { k.x = a[0]; k.y = a[1]; k.da = true; }
        k.hp = a[2]; k.maxHp = a[3]; if (k !== spieler) k.blick = a[4];
        k.munition = a[5]; k.ladeT = a[6]; k.superLadung = a[7]; k.sterne = a[8]; k.energie = a[9]; k.tot = !!a[10]; k.respawn = a[11]; k.kos = a[12];
        k.gross = a[13]; k.schild = a[14]; k.unsichtbar = a[15]; k.betaeubt = a[16]; k.bewegt = !!a[17];
        k.dash = a[18] ? { look: a[18] === 1 ? 'boot' : 'sprint' } : null; k.zuletztAktiv = zeit - a[19] / 10; k.platz = a[20];
      });
      projektile = d.p.map(function (a) {
        return a[0] ? { wurf: true, sx: a[1], sy: a[2], tx: a[3], ty: a[4], t: a[5], T: a[6], flaeche: a[7], look: a[8] }
          : { x: a[1], y: a[2], vx: a[3], vy: a[4], look: a[5], w: a[6], owner: kaempfer[a[7]] || spieler, r: a[8] };
      });
      sterne = d.s.map(function (a) { return { x: a[0], y: a[1] }; });
      energie = d.e.map(function (a) { return { x: a[0], y: a[1] }; });
      flaechen = d.f.map(function (a) { return { x: a[0], y: a[1], r: a[2] }; });
      gas.r = d.g; teamKos = d.tk; sternCountdown = d.sc; sternTeam = d.st;
      d.ev.forEach(function (e) {
        if (e[0] === 'f') effekte.push(e[1]);
        else if (e[0] === 'z') zahlen.push(e[1]);
        else if (e[0] === 'w') { feld[e[2] * B + e[1]] = 0; feldZeichnen(e[1], e[2]); }
        else if (e[0] === 's') Pixel.sfx[e[1] === 0 ? 'tone' : 'noise'].apply(null, e[2]);
      });
    }
    var gastSendeT = 0;
    function gastSchritt(dt) {
      zeit += dt;
      kaempfer.forEach(function (k) {
        if (k.zx !== undefined) { var f = Math.min(1, dt * 14); k.x += (k.zx - k.x) * f; k.y += (k.zy - k.y) * f; }
        if (k.bewegt) k.lauf += dt;
      });
      projektile.forEach(function (p) { if (p.wurf) p.t = Math.min(p.T, p.t + dt); else { p.x += p.vx * dt; p.y += p.vy * dt; } });
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
    function zumBot(k) { k.ki = neueKi(); k.eingabe = null; k.mensch = 0; }
    if (netz) Netz.spiel = function (o) {
      if (host) {
        if (o.t === 'von') {
          var k = menschVon(o.id), d = o.d || {}; if (!k || !k.eingabe) return;
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
          if (team) { k.respawn -= dt; if (k.respawn <= 0) { var s = spawnPunkt(k); k.x = s.x; k.y = s.y; k.tot = false; k.hp = k.maxHp; k.munition = 3; k.schild = 1.5; k.betaeubt = 0; k.gross = 0; k.unsichtbar = 0; } }
          return;
        }
        ['betaeubt', 'gebremst', 'schild', 'unsichtbar', 'gross', 'turbo'].forEach(function (f) { if (k[f] > 0) k[f] = Math.max(0, k[f] - dt); });
        // Munition
        var lt = k.def.laden * (k.schild > 0 && k.def.superArt === 'lernnie' ? 0.5 : 1);
        if (k.munition < 3) { k.ladeT += dt; if (k.ladeT >= lt) { k.ladeT = 0; k.munition++; } } else k.ladeT = 0;
        // Salven
        for (var i = k.salve.length - 1; i >= 0; i--) { k.salve[i].t -= dt; if (k.salve[i].t <= 0) { schiessen(k, k.salve[i].w); k.salve.splice(i, 1); } }
        // Heilen nach Pause
        if (zeit - k.zuletztGetroffen > REGEN_PAUSE && zeit - k.zuletztAktiv > REGEN_PAUSE && k.hp < k.maxHp) {
          k.regenT = (k.regenT || 0) + dt;
          if (k.regenT >= 1) { k.regenT = 0; heilen(k, k.maxHp * REGEN_PRO_S); }
        } else k.regenT = 0;

        var ox = k.x, oy = k.y;
        if (k.dash) {
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
          var tempo = k.def.tempo * (k.gebremst > 0 ? 0.55 : 1) * (k.turbo > 0 ? 1.3 : 1) * (k.gross > 0 ? 1.1 : 1);
          if (fPx(k.x, k.y) === 2) tempo *= 0.95;
          bewegen(k, mx * tempo * dt, my * tempo * dt);
        }
        k.vx = (k.x - ox) / dt; k.vy = (k.y - oy) / dt;
        k.bewegt = Math.hypot(k.vx, k.vy) > 20; if (k.bewegt) k.lauf += dt;

        // Sterne / Energie einsammeln
        if (modus === 'sterne') for (var s = sterne.length - 1; s >= 0; s--) {
          var st = sterne[s]; if (st.sperre > 0) continue;
          if (Math.hypot(st.x - k.x, st.y - k.y) < k.r + 16) { sterne.splice(s, 1); k.sterne++; if (k === spieler || k.team === spieler.team) sfx.tone(1400, 0.06, 'triangle', 0.05); }
        }
        if (modus === 'royale') for (var e = energie.length - 1; e >= 0; e--) {
          var en = energie[e];
          if (Math.hypot(en.x - k.x, en.y - k.y) < k.r + 14) {
            energie.splice(e, 1); k.energie++; k.maxHp += Math.round(k.def.hp * 0.1); heilen(k, k.def.hp * 0.1);
            if (k === spieler) sfx.tone(900, 0.1, 'square', 0.05, 1500);
          }
        }
      });
      // Kämpfer nicht ineinander
      for (var i2 = 0; i2 < kaempfer.length; i2++) for (var j = i2 + 1; j < kaempfer.length; j++) {
        var a = kaempfer[i2], b = kaempfer[j]; if (a.tot || b.tot) continue;
        var dd = abst(a, b), min = (a.r + b.r) * 0.8;
        if (dd < min && dd > 0.01) { var px = (a.x - b.x) / dd * (min - dd) / 2, py = (a.y - b.y) / dd * (min - dd) / 2; a.x += px; a.y += py; b.x -= px; b.y -= py; aufloesen(a); aufloesen(b); }
      }

      projektileSchritt(dt);
      flaechen.forEach(function (f) {
        f.t += dt; f.tick -= dt;
        if (f.tick <= 0) {
          f.tick = 0.5;
          gegnerVon(f.owner).forEach(function (o) { if (Math.hypot(o.x - f.x, o.y - f.y) < f.r) { schaden(o, f.dps / 2, f.owner); if (f.bremst) o.gebremst = Math.max(o.gebremst, 0.6); } });
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
            var v = fPx(p.x, p.y + 14);
            if (blockiertSchuss(v)) {
              var tx = Math.floor(p.x / T), ty = Math.floor((p.y + 14) / T);
              if (v === 4) { kisteTreffen(tx, ty, p.schaden); weg = true; break; }
              if (p.abprall > 0) {
                p.abprall--; p.x -= sx; p.y -= sy;
                if (blockiertSchuss(fPx(p.x + sx, p.y + 14))) p.vx = -p.vx; else p.vy = -p.vy;
                p.w = Math.atan2(p.vy, p.vx); continue;
              }
              fx({ art: 'staub', x: p.x, y: p.y, t: 0, d: 0.25, farbe: '#fff' }); weg = true; break;
            }
            for (var k = 0; k < kaempfer.length; k++) {
              var o = kaempfer[k];
              if (o.tot || o.team === p.team || p.getroffen.indexOf(o) >= 0) continue;
              var orr = o.r * (o.gross > 0 ? 1.5 : 1);
              if (Math.hypot(o.x - p.x, o.y - 14 - p.y) > orr + p.r) continue;
              p.getroffen.push(o);
              var m = schaden(o, p.schaden, p.owner);
              if (p.bremst) o.gebremst = Math.max(o.gebremst, p.bremst);
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
    }
    groesse(); addEventListener('resize', groesse);

    function zeichneKaempfer(k) {
      if (k.tot) return;
      var sicht = sichtbarFuer(k, spieler.team);
      var eigen = k.team === spieler.team;
      if (!sicht && !eigen) return;
      var transparent = (k.unsichtbar > 0 || (inHecke(k) && eigen)) ? 0.45 : 1;
      var def = k.def, img = (k.bewegt && def.laufSprite) ? def.laufSprite(k.lauf) : def.sprite(k.superLadung >= def.superKosten ? 'super' : 'normal');
      var s = (def.skala || 2) * (k.gross > 0 ? 1.6 : 1);
      var bw = img.width * s, bh = img.height * s, bob = k.bewegt ? Math.abs(Math.sin(k.lauf * 12)) * 3 : 0;
      ctx.globalAlpha = transparent;
      // Schatten + Teamring
      ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(k.x, k.y + 6, bw * 0.42, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = k === spieler ? '#7dff8a' : (team && k.team === spieler.team ? TEAMFARBE[0] : TEAMFARBE[1]); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(k.x, k.y + 6, bw * 0.46, 10, 0, 0, Math.PI * 2); ctx.stroke();
      if (k.dash && k.dash.look === 'boot') {
        ctx.fillStyle = '#e8e8e8'; ctx.beginPath(); ctx.ellipse(k.x, k.y + 2, 30, 14, k.blick, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#3d8fd6'; ctx.fillRect(k.x - 22, k.y + 8, 44, 4);
      }
      Pixel.draw(ctx, img, k.x - bw / 2, k.y + 8 - bh - bob, s, Math.cos(k.blick) < 0);
      if (k.schild > 0) { ctx.strokeStyle = 'rgba(200,220,255,.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(k.x, k.y - bh / 2 + 8, bh * 0.6, 0, Math.PI * 2); ctx.stroke(); }
      if (k.betaeubt > 0) { for (var i = 0; i < 3; i++) { var w = zeit * 5 + i * 2.1; Pixel.text(ctx, '*', k.x + Math.cos(w) * 14 - 3, k.y - bh - 4 + Math.sin(w) * 4, 3, '#ffd23f'); } }
      ctx.globalAlpha = 1;
      // Leiste über dem Kopf
      var lb = 54, ly = k.y + 8 - bh - 22;
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(k.x - lb / 2 - 2, ly - 2, lb + 4, 10);
      ctx.fillStyle = k === spieler ? '#7dff8a' : (team && eigen ? '#3fa2ff' : '#ff4d5a');
      ctx.fillRect(k.x - lb / 2, ly, lb * klemm(k.hp / k.maxHp, 0, 1), 6);
      var name = k === spieler ? 'DU' : (k.name || def.name.split(' ')[0]);
      ctx.font = '9px "Press Start 2P", monospace'; ctx.textAlign = 'center';
      ctx.fillStyle = '#000'; ctx.fillText(name, k.x + 1, ly - 5); ctx.fillStyle = k === spieler ? '#7dff8a' : '#fff'; ctx.fillText(name, k.x, ly - 6);
      if (k === spieler) {
        for (var m = 0; m < 3; m++) {
          ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(k.x - lb / 2 + m * (lb / 3) , ly + 9, lb / 3 - 2, 5);
          var voll = m < k.munition ? 1 : m === k.munition ? k.ladeT / k.def.laden : 0;
          ctx.fillStyle = '#ffa53a'; ctx.fillRect(k.x - lb / 2 + m * (lb / 3), ly + 9, (lb / 3 - 2) * voll, 5);
        }
      }
      if (k.sterne > 0) { zeichneStern(k.x + lb / 2 + 10, ly + 2, 8); ctx.fillStyle = '#fff'; ctx.font = '9px "Press Start 2P", monospace'; ctx.textAlign = 'left'; ctx.fillText(k.sterne, k.x + lb / 2 + 20, ly + 7); }
      if (k.energie > 0) { ctx.fillStyle = '#6ef08a'; ctx.font = '8px "Press Start 2P", monospace'; ctx.textAlign = 'left'; ctx.fillText('⚡' + k.energie, k.x + lb / 2 + 4, ly + 7); }
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
        if (p.look === 'riesenstempel') {
          ctx.fillStyle = '#e8343f'; ctx.fillRect(x - 26, y - 18, 52, 36); ctx.fillStyle = '#fff'; ctx.font = '7px "Press Start 2P", monospace'; ctx.textAlign = 'center'; ctx.fillText('VETO', x, y + 4);
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
      if (spieler.tot && modus === 'royale') {   // raus: anderen zuschauen
        var lebend = kaempfer.filter(function (k) { return !k.tot; });
        fokus = lebend.filter(function (k) { return k.mensch; })[0] || lebend[0] || spieler;
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
        ctx.fillStyle = 'rgba(230,190,110,' + (0.35 + Math.sin(zeit * 10) * 0.05) + ')'; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
        for (var i = 0; i < 8; i++) { var w = zeit * 3 + i, rr = f.r * ((i * 0.37 + zeit * 0.5) % 1); ctx.fillStyle = 'rgba(255,230,170,.6)'; ctx.fillRect(f.x + Math.cos(w) * rr, f.y + Math.sin(w) * rr, 6, 3); }
      });
      // Energie und Sterne
      energie.forEach(function (e) { var b = Math.sin(zeit * 5 + e.x) * 3; ctx.fillStyle = '#1e8a3a'; ctx.fillRect(e.x - 9, e.y - 12 + b, 18, 22); ctx.fillStyle = '#6ef08a'; ctx.fillRect(e.x - 6, e.y - 9 + b, 12, 16); Pixel.text(ctx, '+', e.x - 4, e.y - 6 + b, 3, '#0a3a18'); });
      sterne.forEach(function (s) { zeichneStern(s.x, s.y - 6 + Math.sin(zeit * 4 + s.x) * 3, 11); });
      if (modus === 'sterne') { ctx.fillStyle = 'rgba(255,210,63,' + (0.25 + Math.sin(zeit * 3) * 0.1) + ')'; ctx.beginPath(); ctx.arc(W / 2, HH / 2, 18, 0, Math.PI * 2); ctx.fill(); }

      // Zielhilfe des Spielers
      zielhilfe();

      // Kämpfer nach y sortiert
      kaempfer.slice().sort(function (a, b) { return a.y - b.y; }).forEach(zeichneKaempfer);
      projektile.forEach(zeichneProjektil);

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
        else if (e.art === 'hieb') { ctx.strokeStyle = e.farbe; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(e.x, e.y, e.r * (0.6 + f * 0.4), e.w - e.breite / 2, e.w + e.breite / 2); ctx.stroke(); }
        ctx.globalAlpha = 1;
      });
      zahlen.forEach(function (z) {
        if (z.t < 0) return;
        ctx.globalAlpha = 1 - Math.max(0, z.t - 0.5) * 2.5;
        ctx.font = '11px "Press Start 2P", monospace'; ctx.textAlign = 'center';
        ctx.fillStyle = '#000'; ctx.fillText(z.text, z.x + 2, z.y + 2); ctx.fillStyle = z.farbe; ctx.fillText(z.text, z.x, z.y);
        ctx.globalAlpha = 1;
      });

      // Kreidestaub (Royale)
      if (modus === 'royale' && gas.r < Math.hypot(W, HH) / 2) {
        ctx.save();
        ctx.beginPath(); ctx.rect(-T * 3, -T * 3, W + T * 6, HH + T * 6); ctx.arc(W / 2, HH / 2, gas.r, 0, Math.PI * 2, true);
        ctx.fillStyle = 'rgba(235,240,255,.45)'; ctx.fill('evenodd');
        ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(W / 2, HH / 2, gas.r, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      steuerungZeichnen();
      hudAktualisieren();
    }

    function zielhilfe() {
      if (spieler.tot) return;
      var z = null, istSuper = false;
      if (stickR) z = stickZiel(stickR, false);
      else if (stickS) { z = stickZiel(stickS, true); istSuper = true; }
      else if (!touch && maus.drin) z = { w: mausWinkel(), d: mausDist() };
      if (!z) return;
      var a = spieler.def.angriff, art = istSuper ? spieler.def.superArt : a.art;
      var reich = (istSuper ? (spieler.def.superReichweite || 3.2) : a.reichweite) * T;
      ctx.fillStyle = istSuper ? 'rgba(255,210,63,.28)' : 'rgba(255,255,255,.2)';
      if (art === 'wurf' || art === 'veto' || art === 'natrium' || art === 'sandsturm' || art === 'klosprint') {
        var d = klemm(z.d, T, reich), px = spieler.x + Math.cos(z.w) * d, py = spieler.y + Math.sin(z.w) * d;
        var fl = art === 'wurf' ? a.flaeche * T : art === 'veto' ? 2.2 * T : art === 'natrium' ? 2.6 * T : art === 'sandsturm' ? 2.6 * T : 1.7 * T;
        ctx.beginPath(); ctx.arc(px, py, fl, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 3; ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.moveTo(spieler.x, spieler.y); ctx.lineTo(px, py); ctx.stroke(); ctx.setLineDash([]);
      } else if (art === 'nah') {
        ctx.beginPath(); ctx.moveTo(spieler.x, spieler.y); ctx.arc(spieler.x, spieler.y, reich, z.w - a.breite / 2, z.w + a.breite / 2); ctx.closePath(); ctx.fill();
      } else if (art === 'aura' || art === 'dinner' || art === 'hunger' || art === 'unsichtbar' || art === 'lernnie') {
        ctx.beginPath(); ctx.arc(spieler.x, spieler.y, art === 'aura' ? 3.2 * T : art === 'dinner' ? 6 * T : T * 1.2, 0, Math.PI * 2); ctx.fill();
      } else {
        var breite = istSuper ? 24 : Math.max(16, (a.radius || 8) * 2) + (a.streuung ? 0 : 0);
        ctx.save(); ctx.translate(spieler.x, spieler.y); ctx.rotate(z.w);
        if (!istSuper && a.streuung > 0.2) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, reich, -a.streuung / 2 - 0.05, a.streuung / 2 + 0.05); ctx.closePath(); ctx.fill(); }
        else ctx.fillRect(0, -breite / 2, reich, breite);
        ctx.restore();
      }
    }

    function steuerungZeichnen() {
      if (!touch) return;
      function kreis(x, y, r, f, l) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); if (f) { ctx.fillStyle = f; ctx.fill(); } if (l) { ctx.strokeStyle = l; ctx.lineWidth = 3; ctx.stroke(); } }
      if (stickL) {
        kreis(stickL.sx, stickL.sy, STICK, 'rgba(255,255,255,.12)', 'rgba(255,255,255,.35)');
        var dx = stickL.x - stickL.sx, dy = stickL.y - stickL.sy, l = Math.hypot(dx, dy), f = l > STICK ? STICK / l : 1;
        kreis(stickL.sx + dx * f, stickL.sy + dy * f, 28, 'rgba(255,255,255,.5)');
      } else { ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.font = '10px "Press Start 2P", monospace'; ctx.textAlign = 'center'; ctx.fillText('LAUFEN', VW * 0.18, VH - 40); }
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
      ctx.fillStyle = bereit ? '#3a2400' : 'rgba(255,255,255,.6)'; ctx.font = '9px "Press Start 2P", monospace'; ctx.textAlign = 'center'; ctx.fillText('SUPER', sp.sx, sp.sy + 4);
    }

    var letzterHud = '';
    function hudAktualisieren() {
      var rest = Math.max(0, Math.ceil(dauer - zeit)), uhr = Math.floor(rest / 60) + ':' + ('0' + rest % 60).slice(-2);
      var h = '';
      if (modus === 'sterne') {
        var a = teamSterne(spieler.team), b = teamSterne(1 - spieler.team);
        h = '<div class="punkte"><span class="blau">★ ' + a + '</span><span class="uhr">' + uhr + '</span><span class="rotx">' + b + ' ★</span></div>';
        if (sternCountdown !== null) h += '<div class="ansage ' + (sternTeam === spieler.team ? 'blau' : 'rotx') + '">' + (sternTeam === spieler.team ? 'Ihr gewinnt in ' : 'Gegner gewinnt in ') + Math.ceil(sternCountdown) + '</div>';
      } else if (modus === 'kloppe') {
        h = '<div class="punkte"><span class="blau">✊ ' + teamKos[spieler.team] + '</span><span class="uhr">' + uhr + '</span><span class="rotx">' + teamKos[1 - spieler.team] + ' ✊</span></div>';
      } else {
        var lebend = kaempfer.filter(function (k) { return !k.tot; }).length;
        h = '<div class="punkte"><span>☠ ' + lebend + ' übrig</span>' + (spieler.energie ? '<span class="gruen">⚡ ' + spieler.energie + '</span>' : '') + '</div>';
        if (zeit > gas.start - 4 && zeit < gas.start + 2) h += '<div class="ansage">Der Kreidestaub kommt!</div>';
      }
      if (spieler.tot && !team) h += '<div class="ansage gross">Raus – Platz ' + (spieler.platz || '?') + '<br><small>Du schaust zu …</small></div>';
      if (spieler.tot && team) h += '<div class="ansage gross">K.o.! Zurück in ' + Math.ceil(spieler.respawn) + '</div>';
      if (!touch) h += '<div class="superanz' + (superBereit() ? ' bereit' : '') + '"><i style="width:' + Math.round(spieler.superLadung / spieler.def.superKosten * 100) + '%"></i><span>' + (superBereit() ? 'SUPER BEREIT – Leertaste / Rechtsklick' : 'Super lädt …') + '</span></div>';
      if (zeit < 3) h += '<div class="ansage gross">' + BS.MODI.filter(function (m) { return m.id === modus; })[0].name + '</div>';
      if (h !== letzterHud) { hud.innerHTML = h; letzterHud = h; }
    }

    // ---------- Ende ----------
    var aus = false;
    function abschluss(sieger) {
      function fuer(k) {
        if (modus === 'royale') return { ergebnis: k.platz === 1 ? 'sieg' : 'raus', platz: k.platz || 1, kos: k.kos, sterne: 0 };
        return { ergebnis: sieger === -1 ? 'unentschieden' : k.team === sieger ? 'sieg' : 'niederlage', platz: 0, kos: k.kos, sterne: modus === 'sterne' ? teamSterne(k.team) : 0 };
      }
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
      var ergebnis = e.ergebnis;
      if (ergebnis === 'sieg') { sfx.tone(523, 0.15, 'square', 0.07); sfx.tone(659, 0.15, 'square', 0.07, null, 0.15); sfx.tone(784, 0.3, 'square', 0.07, null, 0.3); }
      else if (ergebnis === 'niederlage' || ergebnis === 'raus') sfx.tone(300, 0.5, 'sawtooth', 0.06, 120);
      setTimeout(function () { stop(); fertig(ende); }, 1400);
    }
    function stop() {
      aus = true;
      if (netz && Netz.spiel) Netz.spiel = null;
      removeEventListener('keydown', aufTaste); removeEventListener('keyup', aufTaste); removeEventListener('resize', groesse);
      root.hidden = true; root.innerHTML = '';
    }

    var letzte = performance.now(), hostSendeT = 0;
    kamX = spieler.x; kamY = spieler.y;
    function loop(jetzt) {
      if (aus) return;
      var dt = Math.min(0.05, (jetzt - letzte) / 1000); letzte = jetzt;
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
