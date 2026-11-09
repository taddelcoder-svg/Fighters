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
| Boss-Kampf | Koop gegen den Robo-Hausmeister (3 Minuten) |
| Glocken-Wache | Koop: die Schulglocke 8 Wellen lang gegen Kreidekleckse verteidigen |
| Große Keile | 5 gegen 5, das erste Team mit 15 K.o.s gewinnt (online bis 10 Leute) |
| Eroberung | 3 gegen 3, drei Zonen halten, wer zuerst 100 Punkte hat, gewinnt |
| Pausenhof-Royale | Jeder gegen jeden (8), Kisten knacken für Energie, Kreidestaub zieht sich zusammen |
| Klassenkeile | 3 gegen 3, das erste Team mit 10 K.o.s gewinnt |

## Menü und Spiel-Extras

Startbildschirm mit Kämpfer auf der Bühne, Profil mit Rang, Münzen, Schnellknöpfen und SPIELEN-Knopf; Unterbildschirme für Kämpfer, Shop,
Aufgaben, Pokal-Weg, Modus-Auswahl (Kartenvorschau, Modifikator des Tages) und Freunde.
Jede Runde beginnt mit einem VS-Intro, zeigt einen Kill-Feed, eine Punktetabelle (Tab / 📋) und am Ende den besten Spieler (MVP).
Modifikatoren: Super-Turbo, Heilpilze, Meteoritenschauer, Energydrink, Vampir-Biss (Treffer heilen), Glaskanone (60 % Leben, +50 % Schaden), Riesenmodus (größer, +40 % Leben), Pausenbrot-Nachschub (Munition lädt schneller).
Nach der Runde gibt es neben dem MVP **Auszeichnungen** (K.o.-Jäger, Schadens-König, Torjäger, Super-Meister, Krankenzimmer-Stammgast). In der Online-Lobby gibt es einen **Schnell-Chat** mit festen Sprüchen (nur die Nummer wird verschickt, kein freier Text).

## Karten-Extras

`J` Sprungpad (springt 4–5 Felder über alles), `O` Teleporter (bringt zum gespiegelten Gegenstück), `H` Heilstation, `F` Fenster (geht kaputt).

## Profil & Freunde

Profilbild, Statistik (Runden, Siege, MVP, K.o.s, Schaden, Lieblingskämpfer) und Freundesliste nach Namen:
Wer online ist, sieht man mit Status; „Einladen“ schickt eine Einladung in den eigenen Raum.
Jeder Kämpfer hat zwei Tricks und zwei Talente zur Auswahl.

## Fortschritt

**Schuljahr-Pass:** Alle 28 Tage eine neue Saison mit 30 Stufen. Pass-Punkte gibt es für jede Runde und jede Tagesaufgabe;
die Gratis-Spur ist frei, die Gold-Spur kostet 1200 Münzen und hat exklusive Skins (Damon „Abschlussball“, Ecki „Goldmedaille“).
**Kämpfer-Ränge:** Jeder Kämpfer steigt mit seinen eigenen Pokalen von Rang 1 bis 30 auf (Holz, Bronze, Silber, Gold, Diamant, Meister, Legende);
jeder neue Rang bringt einmalig Münzen oder eine Truhe.
**Seltenheiten:** Selten, Super-selten, Episch, Mythisch, Legendär – nur als Anzeige, alle Kämpfer bleiben frei.
**Online suchen:** Warteschlange pro Modus, ab 2 echten Spielern geht es nach 6 Sekunden los (sofort, wenn voll).

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
| Moritz (Physiker) | Zwei Plasmakugeln | Schwarzes Loch – zieht Gegner in die Mitte |
| Ecki | Schnelle Schläge | Klo-Sprint – Ansturm + Kamillentee |
| Philipp | Abprallende Bücher | „Digga, ich lern nie“ – unverwundbar, schneller laden |
| Saro | Gold-Schrot | Aura-Mog – betäubt alle in der Nähe |
| Matti | 3 Anmach-Sprüche | Korbstapel – Riesenkorb rollt durch alle Gegner |
| Sinan | Low Kicks (Nahkampf) | Knie-Sprung – betäubt und schleudert weg |
| Paul | Zunge raus (trifft alle in einer Linie) | Zungenwirbel – trifft alle in der Nähe dreimal und zieht sie heran |
| Leonie Lockenpracht | Glitzer-Konfetti im Fächer | Haar-Flip – schleudert alle weg und betäubt kurz |

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
