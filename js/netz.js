// Verbindung zum Raum-Server (WebSocket /ws auf derselben Adresse).
// Netz.verbinden() -> Promise; Netz.senden(obj); Netz.bei(fn) setzt den Empfänger fürs Menü,
// Netz.spiel = fn bekommt während einer Runde die Spieldaten ('von', 'daten', 'weg').
(function () {
  var ws = null, offen = false, warte = [], empfaenger = null;
  var Netz = {
    ich: 0, spiel: null,
    verbunden: function () { return offen; },
    verbinden: function () {
      if (offen) return Promise.resolve();
      return new Promise(function (ok, nein) {
        var adr = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws';
        try { ws = new WebSocket(adr); } catch (e) { nein(e); return; }
        var fertig = false;
        var zeit = setTimeout(function () { if (!fertig) { fertig = true; nein(new Error('Zeitüberschreitung')); try { ws.close(); } catch (e) {} } }, 15000);
        ws.onopen = function () { offen = true; if (!fertig) { fertig = true; clearTimeout(zeit); ok(); } warte.forEach(function (m) { ws.send(m); }); warte = []; };
        ws.onerror = function () { if (!fertig) { fertig = true; clearTimeout(zeit); nein(new Error('Keine Verbindung')); } };
        ws.onclose = function () {
          var war = offen; offen = false; ws = null;
          if (war && empfaenger) empfaenger({ t: 'getrennt' });
          if (war && Netz.spiel) Netz.spiel({ t: 'host_weg' });
        };
        ws.onmessage = function (e) {
          var o; try { o = JSON.parse(e.data); } catch (f) { return; }
          if (o.t === 'du') Netz.ich = o.id;
          if (Netz.spiel && (o.t === 'von' || o.t === 'daten' || o.t === 'weg' || o.t === 'host_weg')) { Netz.spiel(o); if (o.t !== 'host_weg') return; }
          if (empfaenger) empfaenger(o);
        };
      });
    },
    senden: function (o) {
      var m = JSON.stringify(o);
      if (offen && ws) ws.send(m); else warte.push(m);
    },
    bei: function (fn) { empfaenger = fn; }
  };
  window.Netz = Netz;
})();
