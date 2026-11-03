// Kämpfer, Spielmodi und Karten von Bravo Stars.
// Die Figuren kommen aus Crazy Lineup (js/sprites.js), jede hat einen Angriff und einen Super.
(function () {
  // Tempo in Pixeln pro Sekunde (1 Feld = 40 px)
  var dd = null;   // Doppel-Sprite wird nur einmal gebaut
  var LANGSAM = 160, NORMAL = 185, SCHNELL = 215, RASEND = 240;

  // angriff.art: 'schuss' (gerade Projektile), 'wurf' (fliegt über Wände, explodiert am Ziel), 'nah' (kurzer Hieb)
  // reichweite in Feldern; laden = Sekunden pro Munitionsbalken (3 Balken); superKosten = Schaden bis zum Super
  var KAEMPFER = [
    {
      id: 'matteo', name: 'Matteo', titel: 'Der Kanzler', rolle: 'Kontrolle', farbe: '#e8343f',
      sprite: function (m) { return Sprites.matteo(m === 'super' ? 'angry' : m === 'tot' ? 'shock' : 'neutral'); },
      hp: 120, tempo: NORMAL, laden: 1.3, superKosten: 110,
      angriff: { art: 'schuss', anzahl: 3, streuung: 0.32, tempo: 560, reichweite: 7, schaden: 15, radius: 9, look: 'stempel' },
      angriffText: 'Wirft 3 „ABGELEHNT“-Stempel im Fächer.',
      superArt: 'veto', superReichweite: 7,
      superText: 'Veto! – Riesenstempel aus der Luft: Flächenschaden und Betäubung.'
    },
    {
      id: 'timo', name: 'Timo', titel: 'Käpt’n Chill', rolle: 'Nahkampf', farbe: '#7fb4ff',
      sprite: function (m) { return Sprites.timo(m === 'super' ? 'happy' : m === 'tot' ? 'shock' : 'neutral'); },
      hp: 150, tempo: NORMAL, laden: 1.25, superKosten: 120,
      angriff: { art: 'schuss', anzahl: 1, streuung: 0, tempo: 380, reichweite: 5.5, schaden: 30, radius: 22, look: 'welle', durch: true },
      angriffText: 'Breite Bugwelle, die durch alle Gegner rollt.',
      superArt: 'boot', superReichweite: 7,
      superText: '40 Knoten – rammt mit dem Boot nach vorn und schleudert alle weg.'
    },
    {
      id: 'leon', name: 'Leon', titel: 'Langhals', rolle: 'Scharfschütze', farbe: '#e8707a',
      sprite: function (m) { return Sprites.leon(m === 'tot' ? 'shock' : 'happy'); },
      hp: 90, tempo: NORMAL, laden: 1.7, superKosten: 90,
      angriff: { art: 'schuss', anzahl: 1, streuung: 0, tempo: 900, reichweite: 10, schaden: 40, radius: 8, look: 'kopf' },
      angriffText: 'Schnellt den Hals nach vorn: weite, harte Kopfnuss.',
      superArt: 'klau', superReichweite: 9,
      superText: 'Pausenbrot-Klau – zieht den ersten Gegner heran und klaut ihm Leben.'
    },
    {
      id: 'mo', name: 'Mo', titel: 'Mini-Mo', rolle: 'Flitzer', farbe: '#ff9a1c', skala: 1.6, radius: 12,
      sprite: function () { return Sprites.mo('steh'); },
      laufSprite: function (t) { return Sprites.mo(Math.floor(t * 8) % 2 ? 'laufA' : 'laufB'); },
      hp: 85, tempo: RASEND, laden: 1.0, superKosten: 80,
      angriff: { art: 'schuss', anzahl: 4, salve: 0.07, streuung: 0.12, tempo: 700, reichweite: 6.5, schaden: 8, radius: 5, look: 'kugel' },
      angriffText: 'Feuert 4 Mini-Kugeln schnell hintereinander.',
      superArt: 'unsichtbar', superReichweite: 0,
      superText: 'Ganz klein – 4 Sekunden unsichtbar und schneller, der nächste Treffer zählt doppelt.'
    },
    {
      id: 'omar', name: 'Omar', titel: 'Sahara Express', rolle: 'Kontrolle', farbe: '#e8b04a',
      sprite: function (m) { return Sprites.omar(m === 'tot' ? 'neutral' : 'happy'); },
      hp: 130, tempo: NORMAL, laden: 1.2, superKosten: 110,
      angriff: { art: 'schuss', anzahl: 2, salve: 0.12, streuung: 0.06, tempo: 520, reichweite: 7, schaden: 17, radius: 8, look: 'spucke', bremst: 0.8 },
      angriffText: 'Kamelspucke: 2 Spritzer, die Gegner kurz verlangsamen.',
      superArt: 'sandsturm', superReichweite: 7,
      superText: 'Sandsturm – 5 Sekunden Wirbel, der Schaden macht und bremst.'
    },
    {
      id: 'felix', name: 'Felix', titel: 'Genosse', rolle: 'Panzer', farbe: '#d8302a', radius: 19,
      sprite: function () { return Sprites.felix(); },
      hp: 195, tempo: LANGSAM, laden: 1.0, superKosten: 120,
      angriff: { art: 'nah', reichweite: 2.2, breite: 1.4, schaden: 32, look: 'biss', heilt: 0.35 },
      angriffText: 'Großer Biss aus der Nähe – heilt ihn ein bisschen.',
      superArt: 'hunger', superReichweite: 0,
      superText: 'Großer Hunger – wird riesig, haut doppelt zu und isst Tische und Kisten auf.'
    },
    {
      id: 'julian', name: 'Julian', titel: 'Chemiker', rolle: 'Werfer', farbe: '#5ad6c8',
      sprite: function () { return Sprites.julian(); },
      hp: 95, tempo: NORMAL, laden: 1.35, superKosten: 100,
      angriff: { art: 'wurf', reichweite: 7, schaden: 28, flaeche: 1.3, flugzeit: 0.6, look: 'kolben' },
      angriffText: 'Wirft Erlenmeyerkolben über Wände – platzen am Ziel.',
      superArt: 'natrium', superReichweite: 8,
      superText: 'Natrium! – riesige Explosion, die sogar Wände sprengt.'
    },
    {
      id: 'doppeldate', name: 'Damon & Moritz', titel: 'Chaos-Dinner', rolle: 'Schütze', farbe: '#f08a9a', skala: 1.5, radius: 18,
      sprite: function () { return dd || (dd = Sprites.doppeldate()); },
      hp: 125, tempo: NORMAL, laden: 1.1, superKosten: 110,
      angriff: { art: 'schuss', anzahl: 2, parallel: 14, streuung: 0, tempo: 600, reichweite: 7.5, schaden: 16, radius: 8, look: 'teller' },
      angriffText: 'Werfen zu zweit je einen Teller.',
      superArt: 'dinner', superReichweite: 0,
      superText: 'Chaos-Dinner – 14 Teller fliegen in alle Richtungen.'
    },
    {
      id: 'ecki', name: 'Ecki', titel: 'Muss mal!', rolle: 'Flitzer', farbe: '#3ab0e8',
      sprite: function (m) { return Sprites.ecki('steh', m === 'tot' ? 'neutral' : 'neutral'); },
      laufSprite: function (t) { return Sprites.ecki(Math.floor(t * 9) % 2 ? 'laufA' : 'laufB'); },
      hp: 120, tempo: RASEND, laden: 0.85, superKosten: 90,
      angriff: { art: 'nah', reichweite: 1.9, breite: 1.1, schaden: 26, look: 'faust' },
      angriffText: 'Schnelle Schläge aus der Nähe.',
      superArt: 'klosprint', superReichweite: 7,
      superText: 'Klo-Sprint – rast zum Ziel, rempelt alle um und trinkt Kamillentee (+40 Leben).'
    },
    {
      id: 'philipp', name: 'Philipp', titel: 'Lernt nie', rolle: 'Schütze', farbe: '#8a6ae8',
      sprite: function (m) { return Sprites.philipp(m === 'super' ? 'cool' : 'neutral'); },
      hp: 110, tempo: NORMAL, laden: 1.15, superKosten: 100,
      angriff: { art: 'schuss', anzahl: 1, streuung: 0, tempo: 620, reichweite: 8.5, schaden: 24, radius: 9, look: 'buch', abprall: 1 },
      angriffText: 'Wirft Schulbücher, die einmal von Wänden abprallen.',
      superArt: 'lernnie', superReichweite: 0,
      superText: '„Digga, ich lern nie“ – 3 Sekunden unverwundbar und doppelt so schnell nachladen.'
    },
    {
      id: 'saro', name: 'Saro', titel: 'Goldgräber', rolle: 'Nahkampf', farbe: '#ffd23f',
      sprite: function (m) { return Sprites.saro(m === 'super' ? 'cool' : m === 'tot' ? 'schock' : 'stolz'); },
      hp: 140, tempo: SCHNELL, laden: 1.25, superKosten: 110,
      angriff: { art: 'schuss', anzahl: 5, streuung: 0.55, tempo: 640, reichweite: 4.5, schaden: 10, radius: 6, look: 'gold' },
      angriffText: 'Schrotladung aus Goldnuggets – aus der Nähe brutal.',
      superArt: 'aura', superReichweite: 0,
      superText: 'Aura-Mog – alle Gegner in der Nähe sind kurz betäubt.'
    }
  ];

  var MODI = [
    { id: 'sterne', name: 'Sternenregen', icon: '★', team: true,
      text: '3 gegen 3: Sammelt die Sterne aus der Mitte. Wer 10 hat und 15 Sekunden hält, gewinnt. Wer stirbt, verliert seine Sterne.' },
    { id: 'royale', name: 'Pausenhof-Royale', icon: '☠', team: false,
      text: 'Jeder gegen jeden, 8 Leute. Kisten knacken, Energie sammeln, der Kreidestaub zieht sich zusammen. Wer zuletzt steht, gewinnt.' },
    { id: 'kloppe', name: 'Klassenkeile', icon: '✊', team: true,
      text: '3 gegen 3: Das erste Team mit 10 K.o.s gewinnt. Nach einem K.o. geht es nach 3 Sekunden weiter.' }
  ];

  // Legende: . Boden  # Wand (Tische, Regale)  b Hecke (versteckt)  w Wasser (Schüsse fliegen drüber)  K Kiste
  // Teamkarten: obere Hälfte + Mittelzeile, die untere Hälfte entsteht durch Drehung um 180°.
  var KARTEN = {
    schulhof: {
      name: 'Schulhof',
      haelfte: [
        'bb.......bbb.......bb',
        'bb.................bb',
        '....##.........##....',
        '....##...www...##....',
        '#........www........#',
        '##.....b.....b.....##',
        '......bbb...bbb......',
        '..b....#.....#....b..',
        '.bbb...#.....#...bbb.',
        '..b...............b..',
        '......####.####......',
        '...ww...........ww...',
        '...ww..bb...bb..ww...',
        '........bb.bb........',
        '..##.............##..',
        '..##.....b.b.....##..'
      ],
      mitte: 'bbb...............bbb'
    },
    turnhalle: {
      name: 'Turnhalle',
      haelfte: [
        '.....bb.....bb.......',
        '.....................',
        '..###...........###..',
        '..#...............#..',
        '......bbb...bbb......',
        '......bbb...bbb......',
        '.##.................#',
        '.##....##...##.....##',
        '.......##...##.......',
        '..bb.............bb..',
        '..bb....#####....bb..',
        '.....................',
        '....ww.........ww....'
      ],
      mitte: '###....b.....b....###'
    }
  };

  // Royale-Karte: Viertel oben links, wird in beide Richtungen gespiegelt (36 x 36)
  var ROYALE = {
    name: 'Pausenhof',
    viertel: [
      'bbb..........b....',
      'bb.....K.....bb...',
      'b...##.......b....',
      '....##..ww........',
      '..K.....ww...##...',
      '.............##.K.',
      '...bbb............',
      '..bbbbb...K...bb..',
      '...bbb.......bbbb.',
      '.........##.......',
      '..K......##...K...',
      '....ww............',
      '....ww....bbb.....',
      '.........bbbbb..##',
      '..##..K...bbb...##',
      '..##..............',
      '..........K.......',
      '.......bb.........'
    ]
  };

  function zeile(s, breite) { s = s || ''; while (s.length < breite) s += '.'; return s.slice(0, breite); }

  function teamKarte(k) {
    var b = 21, oben = k.haelfte.map(function (z) { return zeile(z, b); });
    var unten = oben.slice().reverse().map(function (z) { return z.split('').reverse().join(''); });
    return { name: k.name, zeilen: oben.concat([zeile(k.mitte, b)], unten) };
  }
  function royaleKarte() {
    var v = ROYALE.viertel.map(function (z) { return zeile(z, 18); });
    var oben = v.map(function (z) { return z + z.split('').reverse().join(''); });
    return { name: ROYALE.name, zeilen: oben.concat(oben.slice().reverse()) };
  }

  window.BS = window.BS || {};
  BS.KAEMPFER = KAEMPFER;
  BS.MODI = MODI;
  BS.karte = function (modus) {
    if (modus === 'royale') return royaleKarte();
    return teamKarte(modus === 'kloppe' ? KARTEN.turnhalle : KARTEN.schulhof);
  };
  BS.kaempfer = function (id) { for (var i = 0; i < KAEMPFER.length; i++) if (KAEMPFER[i].id === id) return KAEMPFER[i]; return KAEMPFER[0]; };
})();
