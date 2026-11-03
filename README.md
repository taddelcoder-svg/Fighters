# Bravo Stars

Arena-Kloppe von oben mit der Klasse aus [Crazy Lineup](https://github.com/taddelcoder-svg/Crazylineup):
11 Kämpfer mit eigenem Angriff und Super, Bots als Mit- und Gegenspieler, Pokale pro Kämpfer.
Reines HTML/CSS/JS ohne Build: `node server.js` starten und `http://localhost:10000` öffnen
(oder `python3 -m http.server`). Auf Render läuft es als Web Service (siehe `render.yaml`).

## Modi

| Modus | Regeln |
|---|---|
| Sternenregen | 3 gegen 3, Sterne aus der Mitte sammeln; 10 Sterne 15 Sekunden halten gewinnt |
| Pausenhof-Royale | Jeder gegen jeden (8), Kisten knacken für Energie, Kreidestaub zieht sich zusammen |
| Klassenkeile | 3 gegen 3, das erste Team mit 10 K.o.s gewinnt |

## Kämpfer

| Kämpfer | Angriff | Super |
|---|---|---|
| Matteo | 3 „ABGELEHNT“-Stempel im Fächer | Veto! – Riesenstempel, betäubt |
| Timo | Bugwelle, rollt durch alle | 40 Knoten – Boot-Rammattacke |
| Leon | Weite Kopfnuss (Scharfschütze) | Pausenbrot-Klau – zieht Gegner heran, klaut Leben |
| Mo | 4 Mini-Kugeln | Ganz klein – unsichtbar, schneller, doppelter Treffer |
| Omar | Kamelspucke, bremst | Sandsturm |
| Felix | Biss, heilt | Großer Hunger – riesig, isst Wände |
| Julian | Kolben über Wände werfen | Natrium! – sprengt Wände |
| Damon & Moritz | Zwei Teller | Chaos-Dinner – Teller in alle Richtungen |
| Ecki | Schnelle Schläge | Klo-Sprint – Ansturm + Kamillentee |
| Philipp | Abprallende Bücher | „Digga, ich lern nie“ – unverwundbar, schneller laden |
| Saro | Gold-Schrot | Aura-Mog – betäubt alle in der Nähe |

## Aufbau

| Datei | Inhalt |
|---|---|
| `js/pixel.js`, `js/sprites.js` | Pixel-Helfer und Figuren aus Crazy Lineup |
| `js/daten.js` | Kämpferwerte, Modi, Karten (als Textraster) |
| `js/spiel.js` | Eine Runde: Bewegung, Kampf, Bots, Modusregeln, Zeichnen, Steuerung |
| `js/menue.js` | Menü, Pokale (localStorage `bravostars.*`), Ergebnis |
