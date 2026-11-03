// Gemeinsame Helfer: Pixel-Sprites, 3x5-Pixelschrift, kleine Soundeffekte, Speicher.
(function () {
  var FONT = {
    A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
    E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
    I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
    M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100',
    Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
    U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
    Y: '101101010010010', Z: '111001010100111',
    0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
    4: '101101111001001', 5: '111100110001110', 6: '011100110101010', 7: '111001010010010',
    8: '010101010101010', 9: '010101011001110',
    '+': '000010111010000', '-': '000000111000000', 'x': '000101010101000', '!': '010010010000010',
    '.': '000000000000010', ':': '000010000010000', '?': '110001010000010', ' ': '000000000000000'
  };

  function textWidth(str, s) { return str.length * 4 * s - s; }

  function text(ctx, str, x, y, s, color, align) {
    str = String(str).toUpperCase();
    s = s || 1;
    if (align === 'center') x -= Math.floor(textWidth(str, s) / 2);
    else if (align === 'right') x -= textWidth(str, s);
    ctx.fillStyle = color;
    for (var i = 0; i < str.length; i++) {
      var g = FONT[str[i]] || FONT[' '];
      for (var p = 0; p < 15; p++) {
        if (g[p] === '1') ctx.fillRect(Math.round(x + (p % 3) * s), Math.round(y + Math.floor(p / 3) * s), s, s);
      }
      x += 4 * s;
    }
  }

  // Sprite aus Zeichen-Zeilen + Palette in ein Offscreen-Canvas (1 Zeichen = 1 Pixel)
  var cache = {};
  function sprite(key, rows, pal) {
    if (cache[key]) return cache[key];
    var w = rows[0].length, h = rows.length;
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var x = c.getContext('2d');
    for (var r = 0; r < h; r++) {
      if (rows[r].length !== w) console.warn('Sprite', key, 'Zeile', r, 'hat Länge', rows[r].length);
      for (var q = 0; q < w; q++) {
        var col = pal[rows[r][q]];
        if (col) { x.fillStyle = col; x.fillRect(q, r, 1, 1); }
      }
    }
    cache[key] = c;
    return c;
  }

  function draw(ctx, img, x, y, s, flip) {
    ctx.imageSmoothingEnabled = false;
    if (flip) {
      ctx.save(); ctx.translate(Math.round(x) + img.width * s, Math.round(y)); ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0, img.width * s, img.height * s); ctx.restore();
    } else {
      ctx.drawImage(img, Math.round(x), Math.round(y), img.width * s, img.height * s);
    }
  }

  // ---- Speicher (localStorage kann fehlen) ----
  function get(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }
  function set(k, v) { try { localStorage.setItem(k, String(v)); } catch (e) {} }

  // ---- Sound: winzige WebAudio-Effekte ----
  var ac = null;
  var muted = get('bravostars.stumm', '0') === '1';
  function audio() {
    if (muted) return null;
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  function tone(f, dur, type, vol, slideTo, delay) {
    var a = audio(); if (!a) return;
    var t = a.currentTime + (delay || 0);
    var o = a.createOscillator(), g = a.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(f, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol || 0.08, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, freq) {
    var a = audio(); if (!a) return;
    var n = Math.floor(a.sampleRate * dur), b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    var s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    s.buffer = b; f.type = 'lowpass'; f.frequency.value = freq || 1200; g.gain.value = vol || 0.2;
    s.connect(f); f.connect(g); g.connect(a.destination); s.start();
  }

  window.Pixel = {
    text: text, textWidth: textWidth, sprite: sprite, draw: draw,
    get: get, set: set,
    sfx: { tone: tone, noise: noise },
    isMuted: function () { return muted; },
    setMuted: function (m) { muted = m; set('bravostars.stumm', m ? '1' : '0'); }
  };
})();
