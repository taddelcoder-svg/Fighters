// Skins (Umfärbungen der Pixel-Figuren), Ausrüstung, Emotes, Ränge, Truhen, Pokal-Weg und Tagesaufgaben.
(function () {
  // ---------- Skins: Farbe alt -> neu (Hex aus den Paletten in sprites.js) ----------
  // preis: Münzen im Shop; selten: nur aus Truhen oder vom Pokal-Weg
  var SKINS = {
    matteo: [
      { id: 'anzug', name: 'Staatsanzug', preis: 150, farben: { '#18181d': '#1e2a4a', '#34343e': '#2e3e66', '#2b3550': '#1e2a4a', '#d8b46a': '#e8343f' } },
      { id: 'gold', name: 'Goldkanzler', preis: 400, selten: true, farben: { '#18181d': '#b8902a', '#34343e': '#e0b84a', '#2b3550': '#8a6a1a' } }
    ],
    timo: [
      { id: 'kapitaen', name: 'Kapitän', preis: 150, farben: { '#b4cdeb': '#f4f4f4', '#93b2da': '#d0d0d0', '#b9bec4': '#1e2a4a', '#9aa0a8': '#2e3e66' } },
      { id: 'nacht', name: 'Blaue Stunde', preis: 300, selten: true, farben: { '#b4cdeb': '#2a3a6a', '#93b2da': '#1e2a4a', '#b9bec4': '#141418', '#9aa0a8': '#2a2a32' } }
    ],
    leon: [
      { id: 'giraffe', name: 'Giraffe', preis: 200, farben: { '#141418': '#e8b04a', '#2c2c34': '#8a5a20', '#1e2433': '#6a4a2a' } },
      { id: 'sprecher', name: 'Schulsprecher', preis: 150, farben: { '#141418': '#2a6ad8', '#2c2c34': '#1e4aa8', '#1e2433': '#d8d8d8' } }
    ],
    mo: [
      { id: 'held', name: 'Mini-Held', preis: 200, farben: { '#18181c': '#d81e2a', '#34343e': '#a81018', '#2a3040': '#2a4ad8', '#ff9a1c': '#ffd23f' } },
      { id: 'tarn', name: 'Tarnung', preis: 300, selten: true, farben: { '#18181c': '#4a5a2a', '#34343e': '#3a4a1e', '#2a3040': '#5a4a2a' } }
    ],
    omar: [
      { id: 'prinz', name: 'Wüstenprinz', preis: 200, farben: { '#141418': '#f2f2f2', '#2c2c34': '#d8d8d8', '#2a3040': '#e8d8b0' } },
      { id: 'sand', name: 'Sandsturm', preis: 300, selten: true, farben: { '#141418': '#c8a060', '#2c2c34': '#a88040', '#2a3040': '#8a6a3a' } }
    ],
    felix: [
      { id: 'koch', name: 'Chefkoch', preis: 200, farben: { '#5a6a3c': '#f2f2f2', '#6e5a48': '#f4f4f4', '#8a7460': '#d8d8d8', '#5a3a1e': '#d8d8d8' } },
      { id: 'winter', name: 'Winterparade', preis: 400, selten: true, farben: { '#5a6a3c': '#e8e8f0', '#6e5a48': '#5a5a6a', '#8a7460': '#3a3a4a', '#5a3a1e': '#8a8a9a' } }
    ],
    julian: [
      { id: 'unfall', name: 'Laborunfall', preis: 200, farben: { '#f2f2ee': '#7af0a0', '#c8ccd0': '#4ac878' } },
      { id: 'nobel', name: 'Nobelpreis', preis: 400, selten: true, farben: { '#f2f2ee': '#1e1e24', '#c8ccd0': '#34343c', '#d83a3a': '#ffd23f' } }
    ],
    damon: [
      { id: 'tour', name: 'Tour-Shirt', preis: 150, farben: { '#f2f2f0': '#141418', '#d0d0d0': '#2a2a32', '#c81e2a': '#ffd23f', '#8a1018': '#b8902a' } },
      { id: 'zombie', name: 'Zombie-Konzert', preis: 400, selten: true, farben: { '#eec2a4': '#9ad08a', '#d6a486': '#7ab06a', '#f2f2f0': '#6a5a4a', '#d0d0d0': '#4a3a2a' } },
      { id: 'abschlussball', name: 'Abschlussball', pass: true, farben: { '#f2f2f0': '#1a1a24', '#d0d0d0': '#2a2a3a', '#c81e2a': '#ffd23f', '#8a1018': '#e0b020', '#a8a8a8': '#1a1a24', '#8a8a8a': '#101018' } }
    ],
    moritz: [
      { id: 'labor', name: 'Laborkittel', preis: 200, farben: { '#2a3a7a': '#f2f2ee', '#1e2a5a': '#c8ccd0', '#ffd23f': '#3a6ad8', '#ff8a1c': '#d83a3a' } },
      { id: 'quanten', name: 'Quantenfeld', preis: 300, selten: true, farben: { '#2a3a7a': '#5a1e9a', '#1e2a5a': '#3a1068', '#ffd23f': '#5af0ff', '#ff8a1c': '#ff5af0', '#202028': '#5af0ff', '#cfe8ff': '#e8c8ff' } }
    ],
    ecki: [
      { id: 'sprinter', name: 'Sprinter', preis: 200, farben: { '#a8acb2': '#ffd23f', '#8a8e96': '#e0b020', '#3a4a6a': '#141418', '#e84a3a': '#3ab0e8' } },
      { id: 'pyjama', name: 'Nachts um drei', preis: 300, selten: true, farben: { '#a8acb2': '#a8c8f0', '#8a8e96': '#88a8d8', '#3a4a6a': '#a8c8f0' } },
      { id: 'goldsprint', name: 'Goldmedaille', pass: true, farben: { '#a8acb2': '#ffd23f', '#8a8e96': '#c8960a', '#3a4a6a': '#ffd23f', '#e84a3a': '#ffffff' } }
    ],
    philipp: [
      { id: 'streber', name: 'Heimlicher Streber', preis: 150, farben: { '#1e4a3c': '#e8e8e8', '#163a2e': '#c8c8c8' } },
      { id: 'boss', name: 'Pausenhof-Boss', preis: 400, selten: true, farben: { '#1e4a3c': '#141414', '#163a2e': '#2a2a2a', '#e8c040': '#ffd23f' } }
    ],
    matti: [
      { id: 'kavalier', name: 'Rosenhemd', preis: 200, farben: { '#1c1c22': '#c8304a', '#34343e': '#a81e3a' } },
      { id: 'korbkoenig', name: 'Korbkönig', preis: 400, selten: true, farben: { '#1c1c22': '#c8902a', '#34343e': '#a87018', '#3a4a6a': '#5a3a1a' } }
    ],
    sinan: [
      { id: 'blau', name: 'Blaue Ecke', preis: 200, farben: { '#d02a2a': '#2a6ad8', '#141418': '#1e2a5a' } },
      { id: 'champion', name: 'Champion', preis: 400, selten: true, farben: { '#d02a2a': '#ffd23f', '#141418': '#2a1a08', '#2a2a32': '#4a3010' } }
    ],
    paul: [
      { id: 'weiss', name: 'Winter-Beanie', preis: 200, farben: { '#18181c': '#e8e8f0', '#2e2e36': '#c8c8d4', '#1a1a20': '#3a6ad8', '#2c2c36': '#2a4aa8' } },
      { id: 'erdbeer', name: 'Erdbeer-Look', preis: 400, selten: true, farben: { '#18181c': '#e8343f', '#2e2e36': '#a81e2a', '#1a1a20': '#ff8aa0', '#2c2c36': '#e86a80' } }
    ],
    saro: [
      { id: 'gold', name: 'Goldader', preis: 300, farben: { '#1c2238': '#b8902a', '#2e3654': '#e0b84a' } },
      { id: 'nacht', name: 'Frankfurt bei Nacht', preis: 400, selten: true, farben: { '#1c2238': '#141418', '#2e3654': '#2a2a32', '#e8d040': '#ff5a8a' } }
    ]
  };

  // Umgefärbte Sprites werden je Bild und Skin nur einmal gebaut
  var cache = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
  function hex(r, g, b) { return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1); }
  function umfaerben(img, skin) {
    if (!skin || !cache) return img;
    var m = cache.get(img); if (!m) { m = {}; cache.set(img, m); }
    if (m[skin.id]) return m[skin.id];
    var c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    var x = c.getContext('2d'); x.drawImage(img, 0, 0);
    var d = x.getImageData(0, 0, c.width, c.height), p = d.data, ziel = {};
    for (var alt in skin.farben) { var n = skin.farben[alt]; ziel[alt.toLowerCase()] = [parseInt(n.slice(1, 3), 16), parseInt(n.slice(3, 5), 16), parseInt(n.slice(5, 7), 16)]; }
    for (var i = 0; i < p.length; i += 4) {
      if (!p[i + 3]) continue;
      var z = ziel[hex(p[i], p[i + 1], p[i + 2])];
      if (z) { p[i] = z[0]; p[i + 1] = z[1]; p[i + 2] = z[2]; }
    }
    x.putImageData(d, 0, 0);
    m[skin.id] = c;
    return c;
  }
  function skin(kid, sid) { var l = SKINS[kid] || []; for (var i = 0; i < l.length; i++) if (l[i].id === sid) return l[i]; return null; }

  // ---------- Ausrüstung (ab Stufe 7, zwei Teile pro Kämpfer) ----------
  var AUSRUESTUNG = [
    { id: 'schuhe', name: 'Turnschuhe', icon: '👟', text: '+6 % Tempo', mod: { tempo: 1.06 }, preis: 250 },
    { id: 'weste', name: 'Schutzweste', icon: '🦺', text: '+10 % Leben', mod: { hp: 1.1 }, preis: 250 },
    { id: 'brotdose', name: 'Brotdose', icon: '🥪', text: 'Heilt 50 % schneller', mod: { regenTempo: 1.5 }, preis: 250 },
    { id: 'rechner', name: 'Taschenrechner', icon: '🧮', text: 'Super lädt 12 % schneller', mod: { superF: 1.12 }, preis: 250 },
    { id: 'kaugummi', name: 'Kaugummi', icon: '🍬', text: '+6 % Schaden', mod: { schaden: 1.06 }, preis: 250 }
  ];
  function teil(id) { for (var i = 0; i < AUSRUESTUNG.length; i++) if (AUSRUESTUNG[i].id === id) return AUSRUESTUNG[i]; return null; }

  // ---------- Emotes (Sprechblasen im Spiel) ----------
  var EMOTES = [
    { id: 'gg', text: 'GG', start: true }, { id: 'haha', text: 'Haha', start: true },
    { id: 'ups', text: 'Ups', start: true }, { id: 'herz', text: '<3', start: true },
    { id: 'digga', text: 'Digga!', preis: 100 }, { id: 'veto', text: 'VETO!', preis: 100 },
    { id: 'lern', text: 'Lern lieber!', preis: 100 }, { id: 'wut', text: 'Grrr!', preis: 100 },
    { id: 'klo', text: 'Muss mal…', preis: 120 }, { id: 'aura', text: 'Aura +1000', preis: 150 },
    { id: 'yalla', text: 'Yalla!', preis: 120 }, { id: 'chill', text: 'Chill mal', preis: 120 }
  ];
  function emote(id) { for (var i = 0; i < EMOTES.length; i++) if (EMOTES[i].id === id) return EMOTES[i]; return null; }

  // ---------- Ränge im Rangspiel (alle 100 Punkte eine Stufe) ----------
  var RAENGE = ['Bronze I', 'Bronze II', 'Bronze III', 'Silber I', 'Silber II', 'Silber III', 'Gold I', 'Gold II', 'Gold III',
    'Diamant I', 'Diamant II', 'Diamant III', 'Mythisch I', 'Mythisch II', 'Mythisch III', 'Legende'];
  var RANG_FARBE = ['#c88a4a', '#c88a4a', '#c88a4a', '#c8d0d8', '#c8d0d8', '#c8d0d8', '#ffd23f', '#ffd23f', '#ffd23f',
    '#7ae8ff', '#7ae8ff', '#7ae8ff', '#e85aff', '#e85aff', '#e85aff', '#ff5a5a'];
  function rang(punkte) { var i = Math.min(RAENGE.length - 1, Math.floor((punkte || 0) / 100)); return { i: i, name: RAENGE[i], farbe: RANG_FARBE[i] }; }

  // ---------- Truhen ----------
  var TRUHEN = {
    tasche: { name: 'Schultasche', icon: '🎒', preis: 120, muenzen: [30, 70], wuerfe: 1 },
    rucksack: { name: 'Wanderrucksack', icon: '🧳', preis: 300, muenzen: [80, 160], wuerfe: 2 },
    koffer: { name: 'Klassenfahrt-Koffer', icon: '💼', preis: 700, muenzen: [200, 350], wuerfe: 4 }
  };

  // ---------- Pokal-Weg: Belohnung bei so vielen Pokalen insgesamt ----------
  var WEG = [
    { pokale: 10, art: 'muenzen', wert: 50 }, { pokale: 25, art: 'truhe', wert: 'tasche' }, { pokale: 50, art: 'emote', wert: 'digga' },
    { pokale: 75, art: 'muenzen', wert: 100 }, { pokale: 100, art: 'truhe', wert: 'rucksack' }, { pokale: 150, art: 'skin', wert: 'matteo/gold' },
    { pokale: 200, art: 'muenzen', wert: 200 }, { pokale: 250, art: 'truhe', wert: 'rucksack' }, { pokale: 300, art: 'ausruestung', wert: 'schuhe' },
    { pokale: 400, art: 'emote', wert: 'aura' }, { pokale: 500, art: 'truhe', wert: 'koffer' }, { pokale: 600, art: 'skin', wert: 'julian/nobel' },
    { pokale: 750, art: 'muenzen', wert: 500 }, { pokale: 900, art: 'ausruestung', wert: 'rechner' }, { pokale: 1000, art: 'truhe', wert: 'koffer' },
    { pokale: 1250, art: 'skin', wert: 'saro/nacht' }, { pokale: 1500, art: 'truhe', wert: 'koffer' }, { pokale: 2000, art: 'muenzen', wert: 1500 }
  ];

  // ---------- Tagesaufgaben: aus dem Datum ausgewürfelt, für alle am selben Tag gleich ----------
  function zufall(seed) { return function () { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }; }
  function tagNummer(d) { d = d || new Date(); return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000); }
  function aufgabenFuer(tag) {
    var r = zufall(tag * 7919 + 13), k = BS.KAEMPFER, m = BS.MODI.filter(function (x) { return x.id !== 'training'; });
    var vorlagen = [
      function () { var n = 2 + Math.floor(r() * 2); return { art: 'siege', ziel: n, text: 'Gewinne ' + n + ' Runden', lohn: 60 }; },
      function () { var x = k[Math.floor(r() * k.length)], n = 4 + Math.floor(r() * 4); return { art: 'kos', kaempfer: x.id, ziel: n, text: n + ' K.o.s mit ' + x.name, lohn: 50 }; },
      function () { var x = m[Math.floor(r() * m.length)], n = 2 + Math.floor(r() * 2); return { art: 'runden', modus: x.id, ziel: n, text: 'Spiele ' + n + '× ' + x.name, lohn: 40 }; },
      function () { var n = (3 + Math.floor(r() * 4)) * 500; return { art: 'schaden', ziel: n, text: 'Mach ' + n + ' Schaden', lohn: 50 }; },
      function () { var n = 2 + Math.floor(r() * 3); return { art: 'supers', ziel: n * 2, text: 'Setze ' + (n * 2) + ' Supers ein', lohn: 40 }; },
      function () { var n = 6 + Math.floor(r() * 6); return { art: 'kosAlle', ziel: n, text: n + ' K.o.s mit beliebigen Kämpfern', lohn: 50 }; }
    ];
    var liste = [], benutzt = {};
    while (liste.length < 3) { var i = Math.floor(r() * vorlagen.length); if (benutzt[i]) continue; benutzt[i] = 1; var a = vorlagen[i](); a.id = tag + '-' + i; liste.push(a); }
    return liste;
  }

  // ---------- Karten-Rotation: jeden Tag eine andere Karte pro Modus ----------
  function karteHeute(modus, tag) {
    var l = BS.KARTEN_FUER[modus] || ['schulhof'], h = 0;
    for (var i = 0; i < modus.length; i++) h += modus.charCodeAt(i);
    return l[((tag === undefined ? tagNummer() : tag) + h) % l.length];
  }

  // ---------- Modifikatoren: jeden Tag hat jeder Modus vielleicht einen ----------
  var MODIFIKATOREN = [
    { id: 'keiner', name: 'Normal', icon: '·', text: 'Keine Besonderheit.' },
    { id: 'superschnell', name: 'Super-Turbo', icon: '⚡', text: 'Supers laden doppelt so schnell.' },
    { id: 'heilpilze', name: 'Heilpilze', icon: '🍄', text: 'Überall wachsen Pilze, die 35 % Leben geben.' },
    { id: 'meteore', name: 'Meteoritenschauer', icon: '☄', text: 'Meteore schlagen ein – auf den roten Kreis achten!' },
    { id: 'turbo', name: 'Energydrink', icon: '🥤', text: 'Alle laufen 15 % schneller.' },
    { id: 'vampir', name: 'Vampir-Biss', icon: '🧛', text: 'Jeder Treffer auf einen Gegner heilt dich um 25 % des Schadens.' },
    { id: 'glas', name: 'Glaskanone', icon: '💎', text: 'Alle haben nur 60 % Leben, teilen aber 50 % mehr aus.' },
    { id: 'riesen', name: 'Riesenmodus', icon: '🦣', text: 'Alle sind größer und haben 40 % mehr Leben.' },
    { id: 'nachschub', name: 'Pausenbrot-Nachschub', icon: '🥪', text: 'Die Munition lädt 40 % schneller nach.' }
  ];
  function modifikator(id) { for (var i = 0; i < MODIFIKATOREN.length; i++) if (MODIFIKATOREN[i].id === id) return MODIFIKATOREN[i]; return MODIFIKATOREN[0]; }
  function modifikatorHeute(modus, tag) {
    if (modus === 'training') return 'keiner';
    var h = 7; for (var i = 0; i < modus.length; i++) h = h * 31 + modus.charCodeAt(i);
    var r = zufall(((tag === undefined ? tagNummer() : tag) * 977 + h) % 4294967296)();
    return r < 0.4 ? 'keiner' : MODIFIKATOREN[1 + Math.floor((r - 0.4) / 0.6 * (MODIFIKATOREN.length - 1))].id;
  }
  // Schnell-Sprüche für den Lobby-Chat: nur feste Sätze, es wird nur die Nummer verschickt
  var SPRUECHE = ['Hi zusammen! 👋', 'Bereit! ✅', 'Warte kurz ⏳', 'Gleich nochmal? 🔁', 'GG! 🤝', 'Gut gespielt! 👏', 'Revanche! 😤', 'Ich such eine Karte aus 🗺', 'Lasst Bots auffüllen 🤖', 'Muss los – bis bald! 👋'];
  BS.SPRUECHE = SPRUECHE;
  BS.MODIFIKATOREN = MODIFIKATOREN; BS.modifikator = modifikator; BS.modifikatorHeute = modifikatorHeute;

  // ---------- Schuljahr-Pass: alle 28 Tage eine neue Saison, 30 Stufen à 100 Pass-Punkte ----------
  var PASS_TAGE = 28, PASS_STUFEN = 30, PASS_PUNKTE = 100, GOLD_PREIS = 1200;
  var SAISON_NAMEN = ['Erste Schulwoche', 'Herbstferien', 'Klassenfahrt', 'Winterzauber', 'Projektwoche', 'Sportfest', 'Abschlussball', 'Sommerhitze'];
  function saison(tag) {
    tag = tag === undefined ? tagNummer() : tag;
    var nr = Math.floor(tag / PASS_TAGE), rest = PASS_TAGE - (tag % PASS_TAGE);
    return { nr: nr, name: 'Saison ' + Math.max(1, nr - 740) + ': ' + SAISON_NAMEN[nr % SAISON_NAMEN.length], restTage: rest };
  }
  // Belohnung je Stufe: frei und Gold
  function passBelohnung(stufe, gold) {
    if (gold) {
      if (stufe === 30) return { art: 'skin', wert: 'damon/abschlussball' };
      if (stufe === 15) return { art: 'skin', wert: 'ecki/goldsprint' };
      if (stufe % 10 === 0) return { art: 'truhe', wert: 'koffer' };
      if (stufe % 5 === 0) return { art: 'truhe', wert: 'rucksack' };
      if (stufe === 8 || stufe === 22) return { art: 'emote', wert: stufe === 8 ? 'chill' : 'yalla' };
      return { art: 'muenzen', wert: 60 + stufe * 4 };
    }
    if (stufe % 10 === 0) return { art: 'truhe', wert: 'rucksack' };
    if (stufe % 3 === 0) return { art: 'truhe', wert: 'tasche' };
    return { art: 'muenzen', wert: 25 + stufe * 2 };
  }

  // ---------- Kämpfer-Ränge: jeder Kämpfer steigt mit seinen eigenen Pokalen auf (Rang 1–30) ----------
  var RANG_POKALE = [0, 10, 20, 30, 40, 60, 80, 100, 120, 140, 160, 180, 220, 260, 300, 340, 380, 420, 460, 500,
    550, 600, 650, 700, 750, 800, 900, 1000, 1100, 1250];
  var RANG_STUFEN = [
    { bis: 4, name: 'Holz', farbe: '#a8743a' }, { bis: 9, name: 'Bronze', farbe: '#d88a4a' }, { bis: 14, name: 'Silber', farbe: '#c8d4e0' },
    { bis: 19, name: 'Gold', farbe: '#ffd23f' }, { bis: 24, name: 'Diamant', farbe: '#7ae8ff' }, { bis: 29, name: 'Meister', farbe: '#e85aff' },
    { bis: 30, name: 'Legende', farbe: '#ff5a5a' }
  ];
  function kaempferRang(pokale) {
    pokale = pokale || 0;
    var nr = 1;
    for (var i = 0; i < RANG_POKALE.length; i++) if (pokale >= RANG_POKALE[i]) nr = i + 1;
    var st = RANG_STUFEN.filter(function (x) { return nr <= x.bis; })[0];
    var von = RANG_POKALE[nr - 1], bis = nr < RANG_POKALE.length ? RANG_POKALE[nr] : null;
    return { nr: nr, stufe: st.name, farbe: st.farbe, von: von, bis: bis, anteil: bis ? (pokale - von) / (bis - von) : 1 };
  }
  // Belohnung, wenn ein Kämpfer zum ersten Mal einen Rang erreicht
  function rangBelohnung(nr) {
    if (nr === 30) return { art: 'truhe', wert: 'koffer' };
    if (nr % 10 === 0) return { art: 'truhe', wert: nr === 10 ? 'rucksack' : 'koffer' };
    if (nr % 5 === 0) return { art: 'truhe', wert: 'tasche' };
    return { art: 'muenzen', wert: 20 + nr * 8 };
  }
  BS.kaempferRang = kaempferRang; BS.rangBelohnung = rangBelohnung; BS.RANG_POKALE = RANG_POKALE;

  BS.saison = saison; BS.passBelohnung = passBelohnung;
  BS.PASS = { stufen: PASS_STUFEN, punkte: PASS_PUNKTE, goldPreis: GOLD_PREIS };

  BS.SKINS = SKINS; BS.skin = skin; BS.umfaerben = umfaerben;
  BS.AUSRUESTUNG = AUSRUESTUNG; BS.teil = teil;
  BS.EMOTES = EMOTES; BS.emote = emote;
  BS.rang = rang; BS.RAENGE = RAENGE;
  BS.TRUHEN = TRUHEN; BS.WEG = WEG;
  BS.tagNummer = tagNummer; BS.aufgabenFuer = aufgabenFuer; BS.zufall = zufall; BS.karteHeute = karteHeute;
})();
