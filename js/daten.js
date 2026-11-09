// Kämpfer, Spielmodi und Karten von Bravo Stars.
// Die Figuren kommen aus Crazy Lineup (js/sprites.js), jede hat einen Angriff und einen Super.
(function () {
  var BS_SELTENHEITEN;
  // Tempo in Pixeln pro Sekunde (1 Feld = 40 px)
  var LANGSAM = 125, NORMAL = 145, SCHNELL = 165, RASEND = 182;

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
      id: 'damon', name: 'Damon', titel: 'Metalhead', rolle: 'Schütze', farbe: '#c81e2a',
      sprite: function () { return Sprites.damon(); },
      hp: 125, tempo: NORMAL, laden: 1.15, superKosten: 110,
      angriff: { art: 'schuss', anzahl: 3, salve: 0.09, streuung: 0.08, tempo: 640, reichweite: 7, schaden: 12, radius: 8, look: 'note' },
      angriffText: 'Power-Chord: 3 Noten schnell hintereinander.',
      superArt: 'moshpit', superReichweite: 0,
      superText: 'Moshpit – 3 Sekunden tobt um ihn ein Pit, der Schaden macht und wegschubst.'
    },
    {
      id: 'moritz', name: 'Moritz', titel: 'Physiker', rolle: 'Kontrolle', farbe: '#4a6ad8',
      sprite: function () { return Sprites.moritz(); },
      hp: 115, tempo: NORMAL, laden: 1.2, superKosten: 100,
      angriff: { art: 'schuss', anzahl: 2, parallel: 9, streuung: 0, tempo: 600, reichweite: 7.5, schaden: 16, radius: 9, look: 'plasma' },
      angriffText: 'Feuert zwei Plasmakugeln gleichzeitig.',
      superArt: 'schwarzesloch', superReichweite: 7,
      superText: 'Schwarzes Loch – zieht 3 Sekunden lang alle Gegner in die Mitte und macht Schaden.'
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
      id: 'matti', name: 'Matti', titel: 'Korbsammler', rolle: 'Flitzer', farbe: '#3ad84a', radius: 14,
      sprite: function (m) { return Sprites.matti(m === 'super' ? 'jubel' : m === 'tot' ? 'korb' : 'flirt'); },
      hp: 100, tempo: SCHNELL, laden: 1.05, superKosten: 95,
      angriff: { art: 'schuss', anzahl: 3, streuung: 0.38, tempo: 560, reichweite: 6, schaden: 12, radius: 9, look: 'spruch' },
      angriffText: 'Drei Anmach-Sprüche im Fächer – kurz, aber nervig.',
      superArt: 'korbstapel', superReichweite: 8,
      superText: 'Korbstapel – wirft seinen ganzen Stapel Körbe: ein Riesenkorb rollt durch alle Gegner und schiebt sie weg.'
    },
    {
      id: 'sinan', name: 'Sinan', titel: 'Muay-Thai-Kämpfer', rolle: 'Nahkampf', farbe: '#d02a2a',
      sprite: function (m) { return Sprites.sinan(m === 'tot' ? 'au' : 'kampf'); },
      hp: 165, tempo: SCHNELL, laden: 0.95, superKosten: 105,
      angriff: { art: 'nah', reichweite: 2.1, breite: 1.3, schaden: 30, look: 'faust' },
      angriffText: 'Harte Low Kicks aus der Nähe.',
      superArt: 'knie', superReichweite: 6,
      superText: 'Knie-Sprung – springt mit dem Knie voran nach vorn, betäubt und schleudert alle weg, die er trifft.'
    },
    {
      id: 'paul', name: 'Paul', titel: 'Zunge raus!', rolle: 'Kontrolle', farbe: '#f08a9a',
      sprite: function (m) { return Sprites.paul(m === 'super' ? 'zunge' : m === 'tot' ? 'scharf' : 'happy'); },
      hp: 125, tempo: NORMAL, laden: 1.1, superKosten: 100,
      angriff: { art: 'schuss', anzahl: 1, streuung: 0, tempo: 820, reichweite: 6.5, schaden: 30, radius: 10, look: 'zunge', durch: true },
      angriffText: 'Schnellt die Zunge raus – trifft alle in einer Linie.',
      superArt: 'zungenwirbel', superReichweite: 0,
      superText: 'Zungenwirbel – wirbelt die Zunge rundherum, trifft alle in der Nähe dreimal und zieht sie heran.'
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

  // Trick (aktiv, 3x pro Runde, ab Stufe 3) und Talent (passiv, ab Stufe 5)
  var EXTRAS = {
    matteo: { trick: 'nachladen', trickName: 'Eilverordnung', trickText: 'Sofort volle Munition.',
      talent: { superF: 1.25 }, talentName: 'Amtsbonus', talentText: 'Super lädt 25 % schneller.' },
    timo: { trick: 'ring', trickName: 'Rettungsring', trickText: 'Heilt 35 % Leben.',
      talent: { hp: 1.15 }, talentName: 'Seebär', talentText: '+15 % Leben.' },
    leon: { trick: 'rueckzug', trickName: 'Hals einziehen', trickText: 'Springt 3 Felder zurück.',
      talent: { schaden: 1.12 }, talentName: 'Kopfnuss-Profi', talentText: '+12 % Schaden.' },
    mo: { trick: 'sprung', trickName: 'Mini-Sprung', trickText: 'Springt 3 Felder nach vorn.',
      talent: { tempo: 1.08 }, talentName: 'Turboschuhe', talentText: 'Läuft 8 % schneller.' },
    omar: { trick: 'flasche', trickName: 'Wasserflasche', trickText: 'Heilt 25 % und macht 2 Sekunden schneller.',
      talent: { regenTempo: 2 }, talentName: 'Wüstenfest', talentText: 'Heilt sich doppelt so schnell.' },
    felix: { trick: 'borschtsch', trickName: 'Borschtsch', trickText: 'Heilt 40 % Leben.',
      talent: { biss: 0.6, hp: 1.05 }, talentName: 'Volksküche', talentText: 'Biss heilt 60 % statt 35 % des Schadens.' },
    julian: { trick: 'rauch', trickName: 'Rauchbombe', trickText: 'Wolke um ihn, die Gegner 3 Sekunden bremst.',
      talent: { laden: 0.88 }, talentName: 'Katalysator', talentText: 'Lädt 12 % schneller nach.' },
    damon: { trick: 'stagedive', trickName: 'Stagedive', trickText: 'Springt bis zu 4 Felder und schubst bei der Landung.',
      talent: { schaden: 1.1 }, talentName: 'Lautstärke 11', talentText: '+10 % Schaden.' },
    moritz: { trick: 'magnetfeld', trickName: 'Magnetfeld', trickText: 'Schleudert alle Gegner in der Nähe weg.',
      talent: { schaden: 1.1 }, talentName: 'E = mc²', talentText: '+10 % Schaden.' },
    ecki: { trick: 'klopapier', trickName: 'Notfall-Klopapier', trickText: '3 Sekunden lang 30 % schneller.',
      talent: { regenPause: 0.5 }, talentName: 'Blasenstark', talentText: 'Fängt doppelt so früh an zu heilen.' },
    matti: { trick: 'ring', trickName: 'Ego-Boost', trickText: 'Heilt 35 % Leben – ein Korb mehr macht ihm nichts.',
      talent: { tempo: 1.08 }, talentName: 'Klein & flink', talentText: 'Läuft 8 % schneller.' },
    sinan: { trick: 'schild', trickName: 'Deckung', trickText: '1,5 Sekunden unverwundbar.',
      talent: { hp: 1.12 }, talentName: 'Abgehärtet', talentText: '+12 % Leben.' },
    paul: { trick: 'ring', trickName: 'Gummibärchen', trickText: 'Heilt 35 % Leben.',
      talent: { schaden: 1.1 }, talentName: 'Extralange Zunge', talentText: '+10 % Schaden.' },
    philipp: { trick: 'spickzettel', trickName: 'Spickzettel', trickText: 'Der nächste Treffer zählt doppelt.',
      talent: { laden: 0.85 }, talentName: 'Streber', talentText: 'Lädt 15 % schneller nach.' },
    saro: { trick: 'goldregen', trickName: 'Goldregen', trickText: '10 Goldnuggets fliegen ringsum.',
      talent: { superF: 1.2 }, talentName: 'Goldader', talentText: 'Super lädt 20 % schneller.' }
  };
  KAEMPFER.forEach(function (k) { var e = EXTRAS[k.id]; for (var f in e) k[f] = e[f]; });
  // Zweite Wahl: Trick 2 und Talent 2 (umschaltbar im Kämpfer-Bildschirm)
  var ZWEITE = {
    matteo: { t: ['schild', 'Immunität', '1,5 Sekunden unverwundbar.'], a: [{ hp: 1.12 }, 'Leibwache', '+12 % Leben.'] },
    timo: { t: ['rueckzug', 'Rückwärtsgang', 'Springt 3 Felder zurück.'], a: [{ tempo: 1.08 }, 'Rückenwind', 'Läuft 8 % schneller.'] },
    leon: { t: ['spickzettel', 'Langer Blick', 'Der nächste Treffer zählt doppelt.'], a: [{ laden: 0.88 }, 'Schnellhals', 'Lädt 12 % schneller nach.'] },
    mo: { t: ['rauch', 'Staubwolke', 'Wolke um ihn, die Gegner 3 Sekunden bremst.'], a: [{ superF: 1.2 }, 'Kleiner Akku', 'Super lädt 20 % schneller.'] },
    omar: { t: ['klopapier', 'Kamelgalopp', '3 Sekunden lang 30 % schneller.'], a: [{ schaden: 1.1 }, 'Scharfe Spucke', '+10 % Schaden.'] },
    felix: { t: ['magnetfeld', 'Bauchklatscher', 'Schleudert alle Gegner in der Nähe weg.'], a: [{ tempo: 1.1 }, 'Hungerlauf', 'Läuft 10 % schneller.'] },
    julian: { t: ['ring', 'Heiltrank', 'Heilt 35 % Leben.'], a: [{ schaden: 1.1 }, 'Konzentrat', '+10 % Schaden.'] },
    damon: { t: ['nachladen', 'Zugabe!', 'Sofort volle Munition.'], a: [{ regenTempo: 2 }, 'Lärmschutz', 'Heilt sich doppelt so schnell.'] },
    moritz: { t: ['sprung', 'Teleport', 'Springt 3 Felder nach vorn.'], a: [{ superF: 1.2 }, 'Teilchenbeschleuniger', 'Super lädt 20 % schneller.'] },
    ecki: { t: ['flasche', 'Kamillentee', 'Heilt 25 % und macht 2 Sekunden schneller.'], a: [{ schaden: 1.1 }, 'Wut im Bauch', '+10 % Schaden.'] },
    matti: { t: ['sprung', 'Abgang', 'Springt 3 Felder nach vorn – schnell weg nach dem Korb.'], a: [{ superF: 1.2 }, 'Stapelweise', 'Super lädt 20 % schneller.'] },
    sinan: { t: ['klopapier', 'Kampfgeist', '3 Sekunden lang 30 % schneller.'], a: [{ schaden: 1.1 }, 'Ellbogen', '+10 % Schaden.'] },
    paul: { t: ['klopapier', 'Erdbeer-Power', '3 Sekunden lang 30 % schneller.'], a: [{ superF: 1.2 }, 'Chill-Modus', 'Super lädt 20 % schneller.'] },
    philipp: { t: ['schild', 'Krankmeldung', '1,5 Sekunden unverwundbar.'], a: [{ hp: 1.12 }, 'Ausgeschlafen', '+12 % Leben.'] }
  };
  KAEMPFER.forEach(function (k) {
    var z = ZWEITE[k.id];
    k.tricks = [{ art: k.trick, name: k.trickName, text: k.trickText }];
    k.talente = [{ mod: k.talent, name: k.talentName, text: k.talentText }];
    if (z) { k.tricks.push({ art: z.t[0], name: z.t[1], text: z.t[2] }); k.talente.push({ mod: z.a[0], name: z.a[1], text: z.a[2] }); }
  });

  // Gegner ohne Spieler: Boss und Kreidekleckse (nur für Boss-Kampf und Wellen)
  var NPC = [
    { id: 'robo', name: 'Robo-Hausmeister', npc: 'boss', farbe: '#8a8e98', skala: 3.2, radius: 30, titel: 'Boss', rolle: 'Boss',
      sprite: function () { return Sprites.robo(); }, hp: 4200, tempo: 95, laden: 0.9, superKosten: 99999,
      angriff: { art: 'schuss', anzahl: 5, streuung: 0.9, tempo: 420, reichweite: 8, schaden: 14, radius: 10, look: 'schraube' },
      superArt: 'keiner', superReichweite: 0, tricks: [{ art: '', name: '', text: '' }], talente: [{ mod: {}, name: '', text: '' }], talent: {} },
    { id: 'klecks', name: 'Kreideklecks', npc: 'monster', farbe: '#e8eef8', skala: 2.2, radius: 13, titel: 'Monster', rolle: 'Monster',
      sprite: function () { return Sprites.klecks(); }, hp: 90, tempo: 105, laden: 0.8, superKosten: 99999,
      angriff: { art: 'nah', reichweite: 1.3, breite: 1.3, schaden: 14, look: 'biss' },
      superArt: 'keiner', superReichweite: 0, tricks: [{ art: '', name: '', text: '' }], talente: [{ mod: {}, name: '', text: '' }], talent: {} }
  ];

  // Seltenheiten (nur Anzeige: Rahmenfarbe und Etikett)
  var SELTENHEITEN = [
    { id: 'selten', name: 'Selten', farbe: '#4ac85a' },
    { id: 'superselten', name: 'Super-selten', farbe: '#3a8ae8' },
    { id: 'episch', name: 'Episch', farbe: '#a84ae8' },
    { id: 'mythisch', name: 'Mythisch', farbe: '#e83a5a' },
    { id: 'legendaer', name: 'Legendär', farbe: '#ffc828' }
  ];
  var SELTEN = { matteo: 4, felix: 3, julian: 2, moritz: 2, leon: 1, damon: 1, omar: 0, philipp: 0, timo: 0, mo: 0, ecki: 0, saro: 3, matti: 1, sinan: 2, paul: 1 };
  KAEMPFER.forEach(function (k) { k.seltenheit = SELTENHEITEN[SELTEN[k.id] || 0]; k.seltenRang = SELTEN[k.id] || 0; });
  BS_SELTENHEITEN = SELTENHEITEN;

  // Stufen: jede Stufe +7 % Leben und Schaden; Kosten in Münzen für den Schritt auf die nächste Stufe
  var STUFE_KOSTEN = [0, 20, 35, 75, 140, 290, 480, 800, 1250];
  var MAX_STUFE = 9, TRICK_AB = 3, TALENT_AB = 5, AUSRUESTUNG_AB = 7, ULTRA_AB = 9;

  var MODI = [
    { id: 'sterne', farbe: '#8a4ad8', name: 'Sternenregen', icon: '★', team: true,
      text: '3 gegen 3: Sammelt die Sterne aus der Mitte. Wer 10 hat und 15 Sekunden hält, gewinnt. Wer stirbt, verliert seine Sterne.' },
    { id: 'royale', farbe: '#3a9a4a', name: 'Pausenhof-Royale', icon: '☠', team: false,
      text: 'Jeder gegen jeden, 8 Leute. Kisten knacken, Energie sammeln, der Kreidestaub zieht sich zusammen. Wer zuletzt steht, gewinnt.' },
    { id: 'kloppe', farbe: '#d8343f', name: 'Klassenkeile', icon: '✊', team: true,
      text: '3 gegen 3: Das erste Team mit 10 K.o.s gewinnt. Nach einem K.o. geht es nach 3 Sekunden weiter.' },
    { id: 'ball', farbe: '#2a8ad8', name: 'Pausenball', icon: '⚽', team: true,
      text: '3 gegen 3: Schnapp dir den Ball und schieß ihn ins gegnerische Tor (oben). Mit Ball schießt du statt anzugreifen. Zwei Tore gewinnen.' },
    { id: 'huegel', farbe: '#d89a2a', name: 'Hügelkönig', icon: '♛', team: true,
      text: '3 gegen 3: Haltet die Zone in der Mitte. Steht nur euer Team drin, füllt sich eure Leiste – wer zuerst 100 % hat, gewinnt.' },
    { id: 'tresor', farbe: '#5a6a8a', name: 'Tresorknacker', icon: '🔒', team: true,
      text: '3 gegen 3: Jedes Team hat einen Tresor. Knackt den gegnerischen, bevor sie euren knacken. Nach Ablauf gewinnt, wessen Tresor mehr Leben hat.' },
    { id: 'kopfgeld', farbe: '#c8902a', name: 'Kopfgeld', icon: '💰', team: true,
      text: '3 gegen 3: Jeder K.o. bringt so viele Sterne, wie Kopfgeld auf dem Gegner liegt. Wer viele K.o.s schafft, wird selbst wertvoller.' },
    { id: 'duo', farbe: '#2aa898', name: 'Duo-Royale', icon: '👥', team: false,
      text: 'Vier 2er-Teams auf dem Pausenhof: du und ein Partner gegen den Rest. Das letzte Duo, das noch steht, gewinnt.' },
    { id: 'boss', farbe: '#7a7e88', name: 'Boss-Kampf', icon: '🤖', team: true, koop: true,
      text: 'Gemeinsam gegen den Robo-Hausmeister: Er schießt Schrauben und wirft Wischeimer. Besiegt ihn in 3 Minuten.' },
    { id: 'wellen', farbe: '#2a9ab8', name: 'Glocken-Wache', icon: '🔔', team: true, koop: true,
      text: 'Kreidekleckse greifen die Schulglocke an. Haltet 8 Wellen durch, ohne dass die Glocke kaputtgeht.' },
    { id: 'grosskeile', farbe: '#e8603a', name: 'Große Keile', icon: '🔥', team: true, gross: true,
      text: '5 gegen 5: Das erste Team mit 15 K.o.s gewinnt. Online bis zu 10 Leute.' },
    { id: 'eroberung', farbe: '#3aa86a', name: 'Eroberung', icon: '🚩', team: true,
      text: '3 gegen 3: Drei Zonen erobern und halten. Jede eigene Zone bringt Punkte – wer zuerst 100 hat, gewinnt.' },
    { id: 'training', farbe: '#6a6a7a', name: 'Trainingsplatz', icon: '🎯', team: true, training: true,
      text: 'Ohne Gegner, ohne Pokale: Probier Angriff, Super, Trick und Ultra an Übungspuppen aus.' }
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
        '...ww....J.J....ww...',
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

  KARTEN.sportplatz = {
    name: 'Sportplatz',
    haelfte: [
      '#######.......#######',
      '..b...............b..',
      '..b....##...##....b..',
      '.......##...##.......',
      '.....................',
      'bb....b.......b....bb',
      'bb...bbb.....bbb...bb',
      '.........###.........',
      '.....................',
      '..##.............##..',
      '..##....b...b....##..',
      '........b...b........',
      '.....................'
    ],
    mitte: '.....................'
  };
  KARTEN.aula = {
    name: 'Aula',
    haelfte: [
      '......bb.....bb......',
      '.....................',
      '..##.....FFF.....##..',
      '..##.............##..',
      '.......b.....b.......',
      'bb....bbb...bbb....bb',
      'bb.................bb',
      '.....##.......##.....',
      '.....##...w...##.....',
      '..........w..........',
      '.b.................b.',
      'bbb......#.#......bbb',
      '.b.................b.',
      '.....................'
    ],
    mitte: '.##...............##.'
  };

  KARTEN.pausenhalle = {
    name: 'Pausenhalle',
    haelfte: [
      '..b.....bbbbb.....b..',
      '.....................',
      '###...##.....##...###',
      '.....................',
      '.....b....H....b.....',
      '....bbb...w...bbb....',
      '.....b.........b.....',
      '##.......###.......##',
      '.....................',
      '...ww...b...b...ww...',
      '...ww..bbb.bbb..ww...',
      '.....................',
      '..##.............##..',
      '..##.....#.#.....##..',
      '.....................'
    ],
    mitte: 'bb.................bb'
  };
  KARTEN.flur = {
    name: 'Schulflur',
    haelfte: [
      '.........bbb.........',
      '.....................',
      '.###.###..O..###.###.',
      '.....................',
      'bb.......#.#.......bb',
      'bb..ww...#.#...ww..bb',
      '....ww.........ww....',
      '.....................',
      '..####...bbb...####..',
      '.........bbb.........',
      '.....................',
      '.b...##.......##...b.',
      'bbb..##.......##..bbb'
    ],
    mitte: '.....................'
  };
  KARTEN.schulgarten = {
    name: 'Schulgarten',
    haelfte: [
      '#######.......#######',
      '.....................',
      '.bb..ww.......ww..bb.',
      '.bb..ww.......ww..bb.',
      '.....................',
      '..#.....bbbbb.....#..',
      '..#.....bbbbb.....#..',
      '.....................',
      'bbb....##...##....bbb',
      '.....................',
      '....b...........b....',
      '...bbb...www...bbb...',
      '.........www.........'
    ],
    mitte: '.....................'
  };
  KARTEN.dach = {
    name: 'Schuldach',
    haelfte: [
      '.....................',
      '..##.............##..',
      '..##....bbbbb....##..',
      '.....................',
      'ww.......###.......ww',
      'ww.................ww',
      '.....b.........b.....',
      '....bbb..#.#..bbb....',
      '.....b.........b.....',
      '..##.............##..',
      '..##...b.....b...##..',
      '.......b.....b.......',
      '.....................',
      '.....................'
    ],
    mitte: 'bbb...............bbb'
  };
  KARTEN.keller = {
    name: 'Heizungskeller',
    haelfte: [
      '..bb.............bb..',
      '..bb.............bb..',
      '.....FF.......FF.....',
      '.....##.......##.....',
      '.....................',
      '##..bb...#.#...bb..##',
      '....bb.........bb....',
      '.........bbb.........',
      '..###....bbb....###..',
      '.....................',
      'bb...ww.......ww...bb',
      'bb...ww...#...ww...bb',
      '.....................'
    ],
    mitte: '....##.........##....'
  };
  KARTEN.bibliothek = {
    name: 'Bibliothek',
    haelfte: [
      '.b.................b.',
      '.b...............b.b.',
      '.....#.........#.....',
      '.....#.........#.....',
      '.....................',
      '###.###..bbb..###.###',
      '.........bbb.........',
      '.....................',
      '..bb...#######...bb..',
      '..bb.............bb..',
      '.....................',
      '....##...b.b...##....',
      '.........b.b.........'
    ],
    mitte: '.....................'
  };
  KARTEN.robohalle = {
    name: 'Robo-Werkstatt',
    haelfte: [
      '.....................',
      '..FF.............FF..',
      '..F.......H.......F..',
      '.....................',
      '....bb.........bb....',
      '....bb...J.J...bb....',
      '.....................',
      '..##.............##..',
      '..#...............#..',
      '......F.......F......',
      '.....................',
      '...H.............H...',
      '.....................'
    ],
    mitte: '.......bb...bb.......'
  };
  KARTEN.glockenhof = {
    name: 'Glockenhof',
    haelfte: [
      '.....................',
      '..bb.....###.....bb..',
      '..bb.............bb..',
      '.....................',
      '.##...F.......F...##.',
      '.....................',
      '....bb....H....bb....',
      '....bb.........bb....',
      '.....................',
      '..J.....F...F.....J..',
      '.....................',
      '.##...............##.',
      '.....................'
    ],
    mitte: 'bb.......bbb.......bb'
  };
  KARTEN.grosshalle = {
    name: 'Große Halle',
    haelfte: [
      '.b.................b.',
      '.b..O..........O...b.',
      '.....................',
      '###....FFF.FFF....###',
      '.....................',
      '..bb.....J.J.....bb..',
      '..bb.............bb..',
      '.......##...##.......',
      '.....................',
      '.H...ww.......ww...H.',
      '.....ww.......ww.....',
      '.....................',
      '..##....bb.bb....##..',
      '..##....bb.bb....##..',
      '.....................'
    ],
    mitte: '.....................'
  };
  KARTEN.zonenhof = {
    name: 'Zonenhof',
    haelfte: [
      '..b......bbb......b..',
      '..b...............b..',
      '.....##.......##.....',
      '.....##...H...##.....',
      '.....................',
      'bb.......FFF.......bb',
      'bb.................bb',
      '....J...........J....',
      '...##...#...#...##...',
      '.....................',
      '..bb.............bb..',
      '.....................'
    ],
    mitte: '.....................'
  };
  KARTEN.training = {
    name: 'Trainingsplatz',
    haelfte: [
      '.....................',
      '.....................',
      '.....................',
      '..##.............##..',
      '.....................',
      '.....bbb.....bbb.....',
      '.....................',
      '.........###.........',
      '.....................',
      '.....................'
    ],
    mitte: '.....................'
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
  var SPORTFEST = {
    name: 'Sportfest',
    viertel: [
      '..........bb......',
      '.bbb..K...bb...K..',
      '.bbb..............',
      '.......###...ww...',
      '..K....#.....ww...',
      '.......#..........',
      'ww.........bbb..K.',
      'ww..K......bbb....',
      '...........bbb....',
      '..bbb.............',
      '..bbb...##....##..',
      '........##....##..',
      '..K...........K...',
      '.....ww...bb......',
      '.....ww...bb...bbb',
      '.K.............bbb',
      '.......K..........',
      '..##..........K...'
    ]
  };
  function royaleKarte(vorlage) {
    var ROYALE_V = vorlage || ROYALE;
    var v = ROYALE_V.viertel.map(function (z) { return zeile(z, 18); });
    var oben = v.map(function (z) { return z + z.split('').reverse().join(''); });
    return { name: ROYALE_V.name, zeilen: oben.concat(oben.slice().reverse()) };
  }

  window.BS = window.BS || {};
  BS.KAEMPFER = KAEMPFER;
  BS.MODI = MODI;
  BS.SELTENHEITEN = BS_SELTENHEITEN;
  BS.STUFE_KOSTEN = STUFE_KOSTEN; BS.MAX_STUFE = MAX_STUFE; BS.TRICK_AB = TRICK_AB; BS.TALENT_AB = TALENT_AB;
  // Karten je Modus; welche heute dran ist, entscheidet BS.karteHeute (extras.js)
  BS.KARTEN_FUER = {
    sterne: ['schulhof', 'pausenhalle', 'dach'], kloppe: ['turnhalle', 'flur', 'pausenhalle'], kopfgeld: ['flur', 'turnhalle', 'dach'],
    ball: ['sportplatz', 'schulgarten'], huegel: ['aula', 'dach', 'pausenhalle'], tresor: ['keller', 'bibliothek'],
    royale: ['pausenhof', 'sportfest'], duo: ['sportfest', 'pausenhof'], training: ['training'],
    boss: ['robohalle'], wellen: ['glockenhof'], grosskeile: ['grosshalle', 'pausenhalle'], eroberung: ['zonenhof']
  };
  BS.KARTEN_NAMEN = { pausenhof: ROYALE.name, sportfest: SPORTFEST.name };
  for (var kn in KARTEN) BS.KARTEN_NAMEN[kn] = KARTEN[kn].name;
  BS.karte = function (modus, name) {
    name = name || (BS.KARTEN_FUER[modus] || ['schulhof'])[0];
    if (name === 'pausenhof') return royaleKarte(ROYALE);
    if (name === 'sportfest') return royaleKarte(SPORTFEST);
    return teamKarte(KARTEN[name] || KARTEN.schulhof);
  };
  BS.AUSRUESTUNG_AB = AUSRUESTUNG_AB; BS.ULTRA_AB = ULTRA_AB;
  BS.kaempfer = function (id) {
    for (var i = 0; i < KAEMPFER.length; i++) if (KAEMPFER[i].id === id) return KAEMPFER[i];
    for (var j = 0; j < NPC.length; j++) if (NPC[j].id === id) return NPC[j];
    return KAEMPFER[0];
  };
  BS.npc = function (id) { for (var j = 0; j < NPC.length; j++) if (NPC[j].id === id) return NPC[j]; return null; };
})();
