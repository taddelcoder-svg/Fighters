# Bravo Stars

Arena-Kloppe von oben mit der Klasse aus [Crazy Lineup](https://github.com/taddelcoder-svg/Crazylineup):
11 Kämpfer mit eigenem Angriff und Super, Bots als Mit- und Gegenspieler, Pokale pro Kämpfer.
Reines HTML/CSS/JS ohne Build: `node server.js` starten und `http://localhost:10000` öffnen
(oder `python3 -m http.server`). Auf Render läuft es als Web Service (siehe `render.yaml`).

## Online

Online spielen nur echte Leute – keine Bots (mindestens 2 im Raum). Der Host legt Modus, Modifikator und Spielzeit fest.
Wer geht oder aufgibt, verschwindet aus der Runde; hat ein Team niemanden mehr, gewinnt das andere.

Unter „Online mit Freunden“ erstellt einer einen Raum und gibt den 4-stelligen Code weiter, die anderen treten bei.
Bis zu 6 Leute in den Team-Modi (abwechselnd Blau/Rot), bis zu 8 im Royale; freie Plätze übernehmen Bots.
Der Host rechnet das Spiel und schickt 20-mal pro Sekunde den Stand, die Gäste schicken nur ihre Eingaben.
`server.js` liefert dafür unter `/ws` einen kleinen WebSocket-Raumdienst ohne Abhängigkeiten.
Wer die Verbindung verliert oder aufgibt, wird zum Bot; verlässt der Host, ist die Runde vorbei.

## Modi

| Modus | Regeln |
|---|---|
| Sternenregen | 3 gegen 3, Sterne aus der Mitte sammeln; 10 Sterne 15 Sekunden halten gewinnt |
| Pausenball | 3 gegen 3, Ball ins gegnerische Tor schießen; zwei Tore gewinnen |
| Hügelkönig | 3 gegen 3, die Zone in der Mitte halten, bis die Leiste 100 % hat |
| Tresorknacker | 3 gegen 3, den gegnerischen Tresor knacken |
| Kopfgeld | 3 gegen 3, K.o.s bringen so viele Sterne, wie Kopfgeld auf dem Gegner liegt |
| Duo-Royale | Vier 2er-Teams, das letzte Duo gewinnt |
| Trainingsplatz | Übungspuppen, keine Pokale |
| Pausenhof-Royale | Jeder gegen jeden (8), Kisten knacken für Energie, Kreidestaub zieht sich zusammen |
| Klassenkeile | 3 gegen 3, das erste Team mit 10 K.o.s gewinnt |

## Menü und Spiel-Extras

Startbildschirm mit Kämpfer auf der Bühne, Profil mit Rang, Münzen, Schnellknöpfen und SPIELEN-Knopf; Unterbildschirme für Kämpfer, Shop,
Aufgaben, Pokal-Weg, Modus-Auswahl (Kartenvorschau, Modifikator des Tages) und Freunde.
Jede Runde beginnt mit einem VS-Intro, zeigt einen Kill-Feed, eine Punktetabelle (Tab / 📋) und am Ende den besten Spieler (MVP).
Modifikatoren: Super-Turbo, Heilpilze, Meteoritenschauer, Energydrink.

## Fortschritt

Das Menü hat Tabs: **Spielen** (Modus, Karte des Tages, Rangspiel, Online), **Kämpfer** (Stufe, Skins, Ausrüstung),
**Shop** (Truhen, Tagesangebote, Gratis-Geschenk, Emotes), **Aufgaben** (3 Tagesaufgaben) und **Pokal-Weg** (Belohnungen bei Pokal-Stationen).
Jeder Modus hat mehrere Karten, jeden Tag ist eine andere dran. Im Rangspiel (Team-Modi) geht es von Bronze bis Legende.
Ab Stufe 7 trägt ein Kämpfer zwei Ausrüstungsteile, ab Stufe 9 hat er eine Ultra (Taste R): 5 Sekunden schneller, stärker, zäher.

Nach jeder Runde gibt es Münzen (mehr für Siege, K.o.s, den ersten Sieg am Tag und alle 100 Pokale).
Damit steigt jeder Kämpfer bis Stufe 9 (+7 % Leben und Schaden pro Stufe).
Ab Stufe 3 hat er einen **Trick** (aktiv, 3× pro Runde, Taste Q), ab Stufe 5 ein **Talent** (passiv).

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
| Damon | 3 Noten (Power-Chord) | Moshpit – Schaden und Wegschubsen rundherum |
| Moritz | Zwei Herzen | Herzensbrecher – Getroffene laufen verliebt auf ihn zu |
| Ecki | Schnelle Schläge | Klo-Sprint – Ansturm + Kamillentee |
| Philipp | Abprallende Bücher | „Digga, ich lern nie“ – unverwundbar, schneller laden |
| Saro | Gold-Schrot | Aura-Mog – betäubt alle in der Nähe |

## Aufbau

| Datei | Inhalt |
|---|---|
| `js/pixel.js`, `js/sprites.js` | Pixel-Helfer und Figuren aus Crazy Lineup |
| `js/daten.js` | Kämpferwerte, Modi, Karten (als Textraster) |
| `vendor/` | Schriften Lilita One, Pixelify Sans, Press Start 2P (alle SIL OFL 1.1, Lizenzdateien liegen bei) |
| `js/extras.js` | Skins, Ausrüstung, Emotes, Ränge, Truhen, Pokal-Weg, Tagesaufgaben, Karten-Rotation |
| `js/spiel.js` | Eine Runde: Bewegung, Kampf, Bots, Modusregeln, Zeichnen, Steuerung |
| `js/menue.js` | Menü, Online-Lobby, Pokale (localStorage `bravostars.*`), Ergebnis |
| `js/netz.js` | WebSocket-Verbindung zum Raumdienst |
| `server.js` | Dateien ausliefern + Online-Räume (`/ws`) |
