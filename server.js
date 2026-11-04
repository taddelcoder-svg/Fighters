// Bravo Stars – kleiner Webserver ohne Abhängigkeiten (für Render als Node-Web-Service).
// Liefert die Dateien aus und vermittelt unter /ws Online-Räume per WebSocket.
// Der Host (wer den Raum erstellt) rechnet das Spiel, der Server reicht Eingaben und Spielstände nur weiter.
// Start: node server.js — hört auf PORT (Render setzt die Variable, sonst 10000).
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const PORT = process.env.PORT || 10000;
const TYPEN = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.ico': 'image/x-icon'
};
const ERLAUBT = ['index.html', 'style.css', 'js', 'vendor'];

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/healthz') { res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end('ok\n'); }
  let datei = path.normalize(path.join(ROOT, url === '/' ? 'index.html' : url));
  const rel = path.relative(ROOT, datei);
  if (rel.startsWith('..') || !ERLAUBT.some((e) => rel === e || rel.startsWith(e + path.sep))) datei = path.join(ROOT, 'index.html');
  fs.readFile(datei, (fehler, inhalt) => {
    if (fehler) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Nicht gefunden\n'); }
    const typ = TYPEN[path.extname(datei)] || 'application/octet-stream';
    const fest = rel.startsWith('vendor' + path.sep);
    res.writeHead(200, { 'Content-Type': typ, 'Cache-Control': fest ? 'public, max-age=86400' : 'no-cache' });
    res.end(inhalt);
  });
});

/* ---------------- WebSocket (RFC 6455, nur Text-Nachrichten) ---------------- */
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const MAX_NACHRICHT = 256 * 1024;

function rahmen(opcode, nutzlast) {
  const n = nutzlast.length;
  let kopf;
  if (n < 126) { kopf = Buffer.alloc(2); kopf[1] = n; }
  else if (n < 65536) { kopf = Buffer.alloc(4); kopf[1] = 126; kopf.writeUInt16BE(n, 2); }
  else { kopf = Buffer.alloc(10); kopf[1] = 127; kopf.writeBigUInt64BE(BigInt(n), 2); }
  kopf[0] = 0x80 | opcode;
  return Buffer.concat([kopf, nutzlast]);
}

server.on('upgrade', (req, sock) => {
  const key = req.headers['sec-websocket-key'];
  if (req.url.split('?')[0] !== '/ws' || !key) { sock.destroy(); return; }
  const accept = crypto.createHash('sha1').update(key + GUID).digest('base64');
  sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
  sock.setNoDelay(true);
  const c = neuerClient(sock);
  let puffer = Buffer.alloc(0), teile = [];
  sock.on('data', (d) => {
    puffer = Buffer.concat([puffer, d]);
    while (puffer.length >= 2) {
      const fin = puffer[0] & 0x80, op = puffer[0] & 0x0f, maskiert = puffer[1] & 0x80;
      let len = puffer[1] & 0x7f, pos = 2;
      if (len === 126) { if (puffer.length < 4) return; len = puffer.readUInt16BE(2); pos = 4; }
      else if (len === 127) { if (puffer.length < 10) return; len = Number(puffer.readBigUInt64BE(2)); pos = 10; }
      if (len > MAX_NACHRICHT) { sock.destroy(); return; }
      const maske = maskiert ? 4 : 0;
      if (puffer.length < pos + maske + len) return;
      const m = maskiert ? puffer.slice(pos, pos + 4) : null;
      const daten = Buffer.from(puffer.slice(pos + maske, pos + maske + len));
      if (m) for (let i = 0; i < daten.length; i++) daten[i] ^= m[i & 3];
      puffer = puffer.slice(pos + maske + len);
      if (op === 8) { try { sock.write(rahmen(8, Buffer.alloc(0))); } catch (e) {} sock.end(); return; }
      if (op === 9) { try { sock.write(rahmen(10, daten)); } catch (e) {} continue; }
      if (op === 10) { c.lebt = true; continue; }
      if (op === 1 || op === 0) {
        teile.push(daten);
        if (fin) { const text = Buffer.concat(teile).toString('utf8'); teile = []; let o; try { o = JSON.parse(text); } catch (e) { continue; } nachricht(c, o); }
      }
    }
  });
  sock.on('close', () => weg(c));
  sock.on('error', () => weg(c));
});

/* ---------------- Räume ---------------- */
let naechsteId = 1;
const clients = new Set();
const raeume = new Map();
const MAX_SPIELER = 8;

function neuerClient(sock) {
  const c = { id: naechsteId++, sock, name: 'Spieler', kaempfer: 'matteo', stufe: 1, raum: null, lebt: true, offen: true };
  clients.add(c);
  return c;
}
function senden(c, o) {
  if (!c.offen) return;
  try { c.sock.write(rahmen(1, Buffer.from(JSON.stringify(o)))); } catch (e) {}
}
function stufeVon(v) { v = Math.round(+v || 1); return v < 1 ? 1 : v > 9 ? 9 : v; }
function teileVon(l) { return Array.isArray(l) ? l.slice(0, 2).map((x) => String(x).replace(/[^a-z]/g, '').slice(0, 20)) : []; }
function sauber(t, n) { return String(t || '').replace(/[<>]/g, '').trim().slice(0, n) || 'Spieler'; }
function code() {
  const z = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  for (;;) { let s = ''; for (let i = 0; i < 4; i++) s += z[Math.floor(Math.random() * z.length)]; if (!raeume.has(s)) return s; }
}
function lobby(r) {
  const o = { t: 'lobby', code: r.code, host: r.host.id, modus: r.modus, laeuft: r.laeuft, regeln: r.regeln,
    spieler: r.spieler.map((c) => ({ id: c.id, name: c.name, kaempfer: c.kaempfer, stufe: c.stufe, skin: c.skin })) };
  r.spieler.forEach((c) => senden(c, o));
}
function verlassen(c) {
  const r = c.raum; if (!r) return;
  c.raum = null;
  r.spieler = r.spieler.filter((x) => x !== c);
  if (r.host === c) {
    r.spieler.forEach((x) => { x.raum = null; senden(x, { t: 'host_weg' }); });
    raeume.delete(r.code);
    return;
  }
  if (r.laeuft) senden(r.host, { t: 'weg', id: c.id });
  lobby(r);
}
function starte(r) {
  r.laeuft = true;
  const liste = r.spieler.map((x, i) => ({ id: x.id, name: x.name, kaempfer: x.kaempfer, stufe: x.stufe, skin: x.skin, ausruestung: x.ausruestung, team: i % 2 }));
  r.spieler.forEach((x) => senden(x, { t: 'start', modus: r.modus, spieler: liste, host: r.host.id, regeln: r.regeln }));
  lobby(r);
}

/* ---------- Online-Suche: Warteschlange pro Modus, nur echte Spieler ---------- */
const SUCH_MODI = ['sterne', 'kloppe', 'ball', 'huegel', 'tresor', 'kopfgeld', 'royale', 'duo'];
const schlangen = new Map();   // modus -> [{ c, seit }]
function ausSchlange(c) {
  if (!c.sucht) return;
  const l = schlangen.get(c.sucht) || [];
  schlangen.set(c.sucht, l.filter((e) => e.c !== c));
  c.sucht = null;
}
setInterval(() => {
  const jetzt = Date.now();
  schlangen.forEach((l, modus) => {
    l = l.filter((e) => e.c.offen && e.c.sucht === modus);
    const max = modus === 'royale' || modus === 'duo' ? 8 : 6;
    // Start, wenn der Modus voll ist oder seit dem zweiten Spieler 6 Sekunden vergangen sind
    while (l.length >= 2 && (l.length >= max || jetzt - l[1].seit >= 6000)) {
      const gruppe = l.splice(0, max).map((e) => e.c);
      const r = { code: code(), host: gruppe[0], spieler: gruppe, modus, laeuft: false, regeln: { mod: 'heute', zeit: 1 }, zufall: true };
      raeume.set(r.code, r);
      gruppe.forEach((x) => { x.sucht = null; x.raum = r; senden(x, { t: 'du', id: x.id }); senden(x, { t: 'gefunden', anzahl: gruppe.length }); });
      starte(r);
    }
    schlangen.set(modus, l);
    l.forEach((e) => senden(e.c, { t: 'suche', modus, anzahl: l.length, sekunden: Math.round((jetzt - e.seit) / 1000) }));
  });
}, 1000);

function weg(c) {
  if (!c.offen) return;
  c.offen = false; clients.delete(c);
  ausSchlange(c);
  verlassen(c);
  try { c.sock.destroy(); } catch (e) {}
}

function nachricht(c, o) {
  const r = c.raum;
  switch (o.t) {
    case 'erstellen': {
      verlassen(c);
      c.name = sauber(o.name, 16); c.kaempfer = sauber(o.kaempfer, 20); c.stufe = stufeVon(o.stufe); c.skin = String(o.skin || '').slice(0, 20); c.ausruestung = teileVon(o.ausruestung);
      const neu = { code: code(), host: c, spieler: [c], modus: sauber(o.modus, 12), laeuft: false, regeln: { mod: 'heute', zeit: 1 } };
      raeume.set(neu.code, neu); c.raum = neu;
      senden(c, { t: 'du', id: c.id });
      lobby(neu);
      break;
    }
    case 'beitreten': {
      const ziel = raeume.get(String(o.code || '').toUpperCase().trim());
      if (!ziel) return senden(c, { t: 'fehler', text: 'Diesen Raum gibt es nicht.' });
      if (ziel.laeuft) return senden(c, { t: 'fehler', text: 'Dort läuft gerade eine Runde – gleich nochmal versuchen.' });
      if (ziel.spieler.length >= MAX_SPIELER) return senden(c, { t: 'fehler', text: 'Der Raum ist voll.' });
      verlassen(c);
      c.name = sauber(o.name, 16); c.kaempfer = sauber(o.kaempfer, 20); c.stufe = stufeVon(o.stufe); c.skin = String(o.skin || '').slice(0, 20); c.ausruestung = teileVon(o.ausruestung);
      ziel.spieler.push(c); c.raum = ziel;
      senden(c, { t: 'du', id: c.id });
      lobby(ziel);
      break;
    }
    case 'verlassen': verlassen(c); break;
    case 'suchen': {
      if (SUCH_MODI.indexOf(o.modus) < 0) return senden(c, { t: 'fehler', text: 'Diesen Modus gibt es online nicht.' });
      verlassen(c); ausSchlange(c);
      c.name = sauber(o.name, 16); c.kaempfer = sauber(o.kaempfer, 20); c.stufe = stufeVon(o.stufe); c.skin = String(o.skin || '').slice(0, 20); c.ausruestung = teileVon(o.ausruestung);
      c.sucht = o.modus;
      if (!schlangen.has(o.modus)) schlangen.set(o.modus, []);
      schlangen.get(o.modus).push({ c, seit: Date.now() });
      senden(c, { t: 'suche', modus: o.modus, anzahl: schlangen.get(o.modus).length, sekunden: 0 });
      break;
    }
    case 'suche_stopp': ausSchlange(c); senden(c, { t: 'suche_aus' }); break;
    case 'wahl': if (r) { c.kaempfer = sauber(o.kaempfer, 20); c.stufe = stufeVon(o.stufe); c.skin = String(o.skin || '').slice(0, 20); c.ausruestung = teileVon(o.ausruestung); lobby(r); } break;
    case 'modus': if (r && r.host === c && !r.laeuft) { r.modus = sauber(o.modus, 12); lobby(r); } break;
    case 'regeln': if (r && r.host === c && !r.laeuft) {
      const z = +o.zeit; r.regeln = { mod: sauber(o.mod, 16), zeit: z === 0.7 || z === 1.4 ? z : 1 }; lobby(r);
    } break;
    case 'start': {
      if (!r || r.host !== c || r.laeuft) return;
      if (r.modus === 'training') return senden(c, { t: 'fehler', text: 'Der Trainingsplatz geht nur allein.' });
      if (r.spieler.length < 2) return senden(c, { t: 'fehler', text: 'Online spielen nur echte Leute – warte, bis mindestens ein Freund im Raum ist.' });
      if (r.modus !== 'royale' && r.modus !== 'duo' && r.spieler.length > 6) return senden(c, { t: 'fehler', text: 'Im Team-Modus passen höchstens 6 Leute rein (3 gegen 3).' });
      starte(r);
      break;
    }
    case 'ende': if (r && r.host === c) {
      r.laeuft = false;
      if (r.zufall) { r.spieler.forEach((x) => { x.raum = null; senden(x, { t: 'raum_zu' }); }); raeume.delete(r.code); }
      else lobby(r);
    } break;
    // Weiterreichen: Gast -> Host (Eingaben) und Host -> alle Gäste (Spielstand)
    case 'an_host': if (r && r.laeuft && r.host !== c) senden(r.host, { t: 'von', id: c.id, d: o.d }); break;
    case 'an_alle': if (r && r.host === c) r.spieler.forEach((x) => { if (x !== c) senden(x, { t: 'daten', d: o.d }); }); break;
  }
}

// Alle 25 Sekunden anpingen, damit Render die Verbindung nicht kappt; Tote aufräumen
setInterval(() => {
  clients.forEach((c) => {
    if (!c.lebt) return weg(c);
    c.lebt = false;
    try { c.sock.write(rahmen(9, Buffer.alloc(0))); } catch (e) { weg(c); }
  });
}, 25000);

server.listen(PORT, '0.0.0.0', () => console.log('Bravo Stars läuft auf Port ' + PORT));
