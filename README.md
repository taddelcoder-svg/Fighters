# Bravo Stars

Arena-Kloppe von oben mit der Klasse aus [Crazy Lineup](https://github.com/taddelcoder-svg/Crazylineup):
11 Kämpfer mit eigenem Angriff und Super, Bots als Mit- und Gegenspieler, Pokale pro Kämpfer.
Reines HTML/CSS/JS ohne Build: `node server.js` starten und `http://localhost:10000` öffnen
(oder `python3 -m http.server`). Auf Render läuft es als Web Service (siehe `render.yaml`).

## Online

Unter „Online mit Freunden“ erstellt einer einen Raum und gibt den 4-stelligen Code weiter, die anderen treten bei.
Bis zu 6 Leute in den Team-Modi (abwechselnd Blau/Rot), bis zu 8 im Royale; freie Plätze übernehmen Bots.
Der Host rechnet das Spiel und schickt 20-mal pro Sekunde den Stand, die Gäste schicken nur ihre Eingaben.
`server.js` liefert dafür unter `/ws` einen kleinen WebSocket-Raumdienst ohne Abhängigkeiten.
Wer die Verbindung verliert oder aufgibt, wird zum Bot; verlässt der Host, ist die Runde vorbei.

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
| `js/menue.js` | Menü, Online-Lobby, Pokale (localStorage `bravostars.*`), Ergebnis |
| `js/netz.js` | WebSocket-Verbindung zum Raumdienst |
| `server.js` | Dateien ausliefern + Online-Räume (`/ws`) |
