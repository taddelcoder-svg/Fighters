// Kleiner statischer Webserver ohne Abhängigkeiten (für Render als Node-Web-Service).
// Start: node server.js — hört auf PORT (Render setzt die Variable, sonst 10000).
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = process.env.PORT || 10000;
const TYPEN = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.ico': 'image/x-icon'
};
const ERLAUBT = ['index.html', 'style.css', 'js', 'vendor'];

http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/healthz') { res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end('ok\n'); }
  let datei = path.normalize(path.join(ROOT, url === '/' ? 'index.html' : url));
  const rel = path.relative(ROOT, datei);
  if (rel.startsWith('..') || !ERLAUBT.some((e) => rel === e || rel.startsWith(e + path.sep))) datei = path.join(ROOT, 'index.html');
  fs.readFile(datei, (fehler, inhalt) => {
    if (fehler) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Nicht gefunden\n'); }
    const typ = TYPEN[path.extname(datei)] || 'application/octet-stream';
    // Eigener Code (HTML/CSS/JS) immer frisch, sonst sieht man neue Spiele erst nach einer Stunde; vendor/ darf gecacht werden
    const fest = rel.startsWith('vendor' + path.sep);
    res.writeHead(200, { 'Content-Type': typ, 'Cache-Control': fest ? 'public, max-age=86400' : 'no-cache' });
    res.end(inhalt);
  });
}).listen(PORT, '0.0.0.0', () => console.log('Bravo Stars läuft auf Port ' + PORT));
