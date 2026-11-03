// Pixel-Charaktere der Klasse (16x28). Stimmungen tauschen nur einzelne Gesichtszeilen.
(function () {
  var MATTEO_PAL = {
    H: '#6b4a30', h: '#8c6a47', S: '#f2c9ae', s: '#d9a68a', W: '#ffffff', E: '#2a2018',
    M: '#5a3d27', m: '#b8645c', O: '#3a1010', B: '#18181d', b: '#34343e', G: '#d8b46a',
    P: '#2b3550', K: '#111111', k: '#4a4a4a'
  };
  var MATTEO = [
    '......H..H......',
    '....H.HH.HH.H...',
    '...HHHHHHHHHHH..',
    '..HHHhHHHHhHHHH.',
    '..HHHHHHHHHHHHH.',
    '.HHHHHHHHHHHHHH.',
    '.HHSHHHSHHHSHHH.',
    '.HSSSSSSSSSSSSH.',
    'sSSWESSSSSSEWSSs',
    'sSSSSSSssSSSSSSs',
    '.SSSSMMMMMMSSSS.',
    '.SSSSSSmmSSSSSS.',
    '..SSSSSSSSSSSS..',
    '...ssSSSSSSss...',
    '......ssss......',
    '..BBBBBSSBBBBB..',
    '.BBBBBBGGBBBBBB.',
    '.BBbBBBBBBBBbBB.',
    'BBBbBBBBBBBBbBBB',
    'BBBBBBBBBBBBBBBB',
    'SBBBBBBBBBBBBBBS',
    'S.BBBBBBBBBBBB.S',
    '..PPPPPPPPPPPP..',
    '..PPPPP..PPPPP..',
    '..PPPPP..PPPPP..',
    '..PPPP....PPPP..',
    '.KKKKK....KKKKK.',
    '.KkKKK....KKkKK.'
  ];
  var MATTEO_MOODS = {
    neutral: {},
    shock: { 7: '.HSWWSSSSSSWWSH.', 11: '.SSSSSmOOmSSSSS.', 12: '..SSSSSOOSSSSS..' },
    happy: { 8: 'sSSEESSSSSSEESSs', 11: '.SSSSOWWWWOSSSS.' },
    angry: { 7: '.HSEESSSSSSEESH.', 11: '.SSSSSmmmmSSSSS.' }
  };

  var TIMO_PAL = {
    H: '#cf8f4f', h: '#e9b878', S: '#f7d2bb', s: '#e2ad94', W: '#ffffff', E: '#2c3e5a',
    R: '#f2a090', m: '#c27870', O: '#3a1010', T: '#b4cdeb', t: '#93b2da', w: '#ffffff',
    J: '#b9bec4', j: '#9aa0a8', X: '#f4f4f4', x: '#c9c9c9'
  };
  var TIMO = [
    '................',
    '....hHHhHHh.....',
    '...HHHHHHHHHH...',
    '..HHHhHHHHHhHH..',
    '..HHHHHHHHHHHHH.',
    '.HHHHHHHHHHHHHH.',
    '.HHSSSSSSSSSSHH.',
    '.HSSSSSSSSSSSSH.',
    'sSSWESSSSSSEWSSs',
    'sSRRSSSssSSSRRSs',
    '.SSSSSSSSSSSSSS.',
    '.SSSSSmmmmSSSSS.',
    '..SSSSSSSSSSSS..',
    '...ssSSSSSSss...',
    '......ssss......',
    '..TTTTTssTTTTT..',
    '.TTTTTTTTTTTTTT.',
    '.TTtTTTTTTTwtTT.',
    'TTTtTTTTTTTTtTTT',
    'SSTTTTTTTTTTTTSS',
    'SSTTTTTTTTTTTTSS',
    'S.TTTTTTTTTTTT.S',
    '..JJJJJJJJJJJJ..',
    '..JJJJj..jJJJJ..',
    '..JJJJJ..JJJJJ..',
    '..JJJJ....JJJJ..',
    '.XXXXX....XXXXX.',
    '.XxXXX....XXxXX.'
  ];
  var TIMO_MOODS = {
    neutral: {},
    happy: { 8: 'sSSEESSSSSSEESSs', 11: '.SSSSOWWWWOSSSS.' },
    shock: { 7: '.HSWWSSSSSSWWSH.', 11: '.SSSSSmOOmSSSSS.' }
  };


  var LEON_PAL = {
    H: '#2a1a12', h: '#4a3020', S: '#e8b896', s: '#d29c7a', W: '#ffffff', E: '#2a2018',
    m: '#a85a52', O: '#3a1010', T: '#e8707a', B: '#141418', b: '#2c2c34',
    P: '#1e2433', X: '#f2f2f2', x: '#c8c8c8'
  };
  var LEON = [
    '................',
    '....HHHHHHHH....',
    '...HHHHHHHHHH...',
    '..HHHHhHHHHHHH..',
    '..HHHHHHHHHHHH..',
    '..HHHHHHHHHHHH..',
    '.sSHHHHHHHHHHSs.',
    '.sSSSSSSSSSSSSs.',
    '..SWESSSSSSEWS..',
    '..SSSSSssSSSSS..',
    '..SSSSSSSSSSSS..',
    '..SSSSmmmmSSSS..',
    '...SSSSSSSSSS...',
    '....ssSSSSss....',
    '......SSSS......',
    '......SSSS......',
    '......sSSs......',
    '......SSSS......',
    '......SSSS......',
    '......sSSs......',
    '..BBBBBSSBBBBB..',
    '.BBBBBBBBBBBBBB.',
    'BBBbBBBBBBBBbBBB',
    'BBBbBBBBBBBBbBBB',
    'BBBBBBBBBBBBBBBB',
    'SBBBBBBBBBBBBBBS',
    'S.BBBBBBBBBBBB.S',
    '..PPPPPPPPPPPP..',
    '..PPPPP..PPPPP..',
    '..PPPPP..PPPPP..',
    '..PPPP....PPPP..',
    '.XXXXX....XXXXX.',
    '.XxXXX....XXxXX.'
  ];
  var LEON_MOODS = {
    neutral: {},
    happy: { 8: '..SEESSSSSSEES..', 11: '..SSSOWWWWOSSS..', 12: '...SSSTTTTSSS...' },
    shock: { 7: '.sSWWSSSSSSWWSs.', 11: '..SSSSmOOmSSSS..' }
  };


  // Mo: winzig, wilde Locken, orange Oakley-Sonnenbrille, schwarzes Shirt (12x16, mit Laufbildern)
  var MO_PAL = {
    H: '#6b4a2e', h: '#9a7048', S: '#f0c4a4', s: '#d8a888', G: '#ff9a1c', g: '#f4f4f4', m: '#c27870',
    T: '#18181c', t: '#34343e', L: '#2a3040', K: '#f2f2f2'
  };
  var MO_KOPF = [
    '.h..H.Hh..h.',
    '..HHHHHHHH..',
    '.HHhHHHHHhH.',
    'HHHHHHHHHHHH',
    'HHSSSSSSSSHH',
    'HgGGGggGGGgH',
    '.SSSSSSSSSS.',
    '.SSSSmmSSSS.',
    '..SSSSSSSS..',
    '.TTTTTTTTTT.',
    'STTTTTTTTTTS',
    'STTtTTTTtTTS',
    '..TTTTTTTT..'
  ];
  var MO_BEINE = {
    steh: ['..LLL..LLL..', '..LLL..LLL..', '.KKKK..KKKK.'],
    laufA: ['..LLL..LLL..', '.LLL....LLL.', 'KKK......KKK'],
    laufB: ['...LLLLLL...', '...LLL.LL...', '..KKK..KK...'],
    sprung: ['..LLLLLLLL..', '..LLL..LLL..', '..KKK..KKK..'],
    fall: ['..LLL..LLL..', '.LL......LL.', '.KK......KK.']
  };


  // Omar: dunkle Locken, kurzer Bart, schwarzer Hoodie
  var OMAR_PAL = {
    H: '#1e1410', h: '#3a2a1e', S: '#d9a47c', s: '#c08a64', W: '#ffffff', E: '#2a1a10', B: '#2a1e18',
    m: '#a8625a', O: '#3a1010', K: '#141418', k: '#2c2c34', w: '#d8d8d8', P: '#2a3040', X: '#f2f2f2', x: '#c8c8c8'
  };
  var OMAR = [
    '...H.HH.HH.H....',
    '..HHHhHHHHhHH...',
    '.HHhHHHHHHHHhH..',
    '.HHHHHhHHhHHHH..',
    '.HHHHHHHHHHHHHH.',
    '.HHSHHSSHHSSHHH.',
    '.HSSSSSSSSSSSSH.',
    'sSSWESSSSSSEWSSs',
    'sSSSSSSssSSSSSSs',
    '.SSSSSSSSSSSSSS.',
    '.SBSSSmmmmSSSBS.',
    '..BBSSSSSSSSBB..',
    '...BBBBBBBBBB...',
    '......ssss......',
    '..KKKKKssKKKKK..',
    '.KKKKKkKKkKKKKK.',
    'KKKkKwwwwwwKkKKK',
    'KKKkKKKKKKKKkKKK',
    'KKKKKKKKKKKKKKKK',
    'SKKKKKKKKKKKKKKS',
    'S.KKKKKKKKKKKK.S',
    '..PPPPPPPPPPPP..',
    '..PPPPP..PPPPP..',
    '..PPPPP..PPPPP..',
    '..PPPP....PPPP..',
    '.XXXXX....XXXXX.',
    '.XxXXX....XXxXX.'
  ];
  var OMAR_MOODS = {
    neutral: {},
    happy: { 7: 'sSSEESSSSSSEESSs', 10: '.SBSSOWWWWOSSBS.' }
  };

  // Felix: dunkle Wuschellocken unter der Uschanka mit rotem Stern, Marschallmantel mit Orden
  var FELIX_PAL = {
    U: '#6e5a48', u: '#8a7460', R: '#c8102e', Y: '#e8b84a', H: '#3a2618', h: '#5a3e28', S: '#f2c4a8', s: '#dca88c',
    W: '#ffffff', E: '#3a2a1e', r: '#ec9a8a', m: '#b0645c', O: '#3a1010', C: '#5a6a3c', B: '#5a3a1e', P: '#2a2c34', K: '#141418', k: '#3a3a42'
  };
  var FELIX = [
    '.....uuuuuu.....',
    '...uUUUUUUUUu...',
    '..UUUUUYYUUUUU..',
    '..UUUUURRUUUUU..',
    '.uUUUUUUUUUUUUu.',
    '.UUHhHHhHHhHHUU.',
    '.UHSHHSHHSHHSHU.',
    '.UHSSSSSSSSSSHU.',
    '.USWESSSSSSEWSU.',
    '.USSSSSssSSSSSU.',
    '..SSrSSSSSSrSS..',
    '..SSSSSmmSSSSS..',
    '...sSSSSSSSSs...',
    '.....ssssss.....',
    '..RCCCCssCCCCR..',
    '.RRCCCYCCYCCCRR.',
    '.CCrYRCCCCCCCCC.',
    'CCCCCCYCCYCCCCCC',
    'CCCCCCCCCCCCCCCC',
    'SCBBBBBYYBBBBBCS',
    'S.CCCCCYCCYCCC.S',
    '..CCCCCCCCCCCC..',
    '..PPPRPPPPRPPP..',
    '..PPPRP..PRPPP..',
    '..PPPRP..PRPPP..',
    '..KKKKK..KKKKK..',
    '.KKKKKK..KKKKKK.',
    '.KkKKKK..KKKKkK.'
  ];
  var FELIX_MOODS = {
    neutral: {},
    happy: { 8: '.USEESSSSSSEESU.', 11: '..SSSSOWWOSSSS..' }
  };

  // Julian: verwuschelte braune Haare, Schwimmbrille auf der Stirn, Laborkittel über grauem Polo, irres Grinsen
  var JULIAN_PAL = {
    H: '#6a4a2e', h: '#9a7048', G: '#2a2a30', B: '#5ac8f0', S: '#f0c4a6', s: '#d8a88a', W: '#ffffff', E: '#3a2a1e', O: '#3a1010',
    L: '#f2f2ee', l: '#c8ccd0', P: '#6a7078', p: '#4a5058', R: '#d83a3a', b: '#3a6ad8', J: '#3a4a6a', K: '#e8e8e8', k: '#b0b0b0'
  };
  var JULIAN = [
    '..h..H.h..Hh..h.',
    '.hHH.HHhH.HHhHh.',
    '..HHHHHHHHHHHHH.',
    '.HHHhHHHHHhHHHH.',
    '.HHHHHHHHHHHHHH.',
    '.GGGGGGGGGGGGGG.',
    '.GBBBGGGGGGBBBG.',
    '.HSSSSSSSSSSSSH.',
    'sSSWEWSSSSWEWSSs',
    'sSSSSSSssSSSSSSs',
    '.SSSSSSSSSSSSSS.',
    '.SSSOWWWWWWOSSS.',
    '..SSSOOOOOOSSS..',
    '...ssSSSSSSss...',
    '......ssss......',
    '..LLLLPppPLLLL..',
    '.LLLLLPPPPLLLLL.',
    'LLLlLLPPPPLLRbLL',
    'LLLlLLPPPPLLlLLL',
    'LLLLLLLPPLLLLLLL',
    'SLLLLLLLLLLLLLLS',
    'S.LLLLLLLLLLLL.S',
    '..JJJJJJJJJJJJ..',
    '..JJJJJ..JJJJJ..',
    '..JJJJJ..JJJJJ..',
    '..JJJJ....JJJJ..',
    '.KKKKK....KKKKK.',
    '.KkKKK....KKkKK.'
  ];
  var JULIAN_MOODS = {
    neutral: {},
    traurig: { 8: 'sSSEESSSSSSEESSs', 11: '.SSSSSOOOOSSSSS.', 12: '..SSSOSSSSOSSS..' }
  };

  // Moritz: blonder Wuschelpony, Zahnspange, Zunge raus, schwarzes Shirt mit Print
  var MORITZ_PAL = {
    H: '#e8c068', h: '#f6dc98', S: '#f2c8b0', s: '#dcaa90', W: '#ffffff', E: '#5a4a3a', B: '#9aa0a8', O: '#401818', R: '#e87a8a',
    T: '#1c1c20', t: '#34343c', P: '#e8e8e8', p: '#8a8a8a', J: '#8a96a8', K: '#f2f2f2', k: '#c8c8c8'
  };
  var MORITZ = [
    '....hHhHHhH.....', '..hHHHHHHHHHh...', '.hHHHHHHHHHHHh..', '.HHHHHHHHHHHHHH.', 'hHHHHHHHHHHHHHHh', '.HHSSHHHHHHHHSH.',
    '.HSSSSSHHHHHSSH.', '.SSSSSSSSSSHSSS.', 'sSSEESSSSSSEESSs', 'sSSSSSSssSSSSSSs', '.SSRSSSSSSSSRSS.', '.SSSSOBBBBOSSSS.',
    '..SSSORRRROSSS..', '...ssSRRRSsss...', '......ssss......', '..TTTTTssTTTTT..', '.TTTTTTTTTTTTTT.', 'TTTtTTPPPTTTtTTT',
    'TTTtTTPpPTTTtTTT', 'TTTTTTPPPTTTTTTT', 'STTTTTTTTTTTTTTS', 'S.TTTTTTTTTTTT.S', '..JJJJJJJJJJJJ..', '..JJJJJ..JJJJJ..',
    '..JJJJJ..JJJJJ..', '..JJJJ....JJJJ..', '.KKKKK....KKKKK.', '.KkKKK....KKkKK.'
  ];
  // Damon: dunkler Kurzhaarschnitt mit Fade, weißes Metal-Shirt mit rotem Logo, graue Jeans
  var DAMON_PAL = {
    H: '#3a2618', h: '#5a3a26', f: '#7a6050', S: '#eec2a4', s: '#d6a486', W: '#ffffff', E: '#2a1a10', M: '#a86058',
    T: '#f2f2f0', t: '#d0d0d0', R: '#c81e2a', r: '#8a1018', K: '#202020', k: '#5a5a5a', J: '#a8a8a8', j: '#8a8a8a', B: '#141418', b: '#3a3a3a'
  };
  var DAMON = [
    '....hHHHHHHh....', '...hHHHHHHHHh...', '..HHHHHHHHHHHH..', '..fHHHHHHHHHHf..', '..fSSSSSSSSSSf..', '.fSHHHSSSSHHHSf.',
    'sSSWESSSSSSWESSs', 'sSSSSSSssSSSSSSs', '.SSSSSSsSSSSSSS.', '.SSSSMMMMMSSSSS.', '..SSSSSSSSSSSS..', '..sSSSSSSSSSSs..',
    '....ssssssss....', '......ssss......', '..TTTTTssTTTTT..', '.TTTTTTTTTTTTTT.', 'TTTRRrRRRrRRTTTT', 'TTTtRRrRrRRRtTTT',
    'TTTtTKKkKKKTtTTT', 'TTTTTKKWWKKTTTTT', 'STTTTTKKKKTTTTTS', 'S.TTTTTTTTTTTT.S', '..JJJJJJJJJJJJ..', '..JJJJJ..JJJJJ..',
    '..JJJjJ..JjJJJ..', '..JJJJ....JJJJ..', '.BBBBB....BBBBB.', '.BbBBB....BBbBB.'
  ];

  // Ecki: kurze braune Haare, schwarze Brille mit blauem Innenrand, grauer Hoodie, rote Sneaker
  var ECKI_PAL = {
    H: '#7a5a3a', h: '#9a7650', S: '#f2c8b0', s: '#dca890', G: '#141418', g: '#3ab0e8', W: '#ffffff', E: '#4a3020', M: '#b06060', O: '#401818',
    T: '#a8acb2', t: '#8a8e96', w: '#f2f2f2', J: '#3a4a6a', K: '#e84a3a', k: '#ffffff', R: '#e86a6a'
  };
  var ECKI_KOPF = [
    '....hHHhHHhH....', '..hHHHHHHHHHHh..', '.HHHHHHHHHHHHHH.', '.HHHhHHHHHHhHHH.', '.HSHHSSHHSSHHSH.', '.SSSSSSSSSSSSSS.',
    '.GGGGGGSSGGGGGG.', '.GgWEgGGGGgWEgG.', '.GGGGGGSSGGGGGG.', 'sSSSSSSssSSSSSSs', '.SSSSSSSSSSSSSS.', '.SSSSMMMMMMSSSS.',
    '..SSSSOOOOSSSS..', '...ssSSSSSSss...', '......ssss......',
    '..TTTTwSSwTTTT..', '.TTTTTwTTwTTTTT.', 'TTTtTTwTTwTTtTTT', 'TTTtTTTTTTTTtTTT', 'TTTTttttttttTTTT', 'STTTtTTTTTTtTTTS', 'S.TTTTTTTTTTTT.S'
  ];
  var ECKI_MOODS = {
    druck: { 7: '.GgEEgGGGGgEEgG.', 9: 'sSRSSSSssSSSSRSs', 11: '.SSSSSMMMMSSSSS.', 12: '..SSSSSSSSSSSS..' },
    puh: { 7: '.GgSSgGGGGgSSgG.', 11: '.SSSOWWWWWWOSSS.', 12: '..SSSSOOOOSSSS..' },
    rot: { 4: '.RRHHRRHHRRHHRH.', 5: '.RRRRRRRRRRRRRR.', 7: '.GgEEgGGGGgEEgG.', 9: 'RRRRRRRRRRRRRRRR', 10: '.RRRRRRRRRRRRRR.', 11: '.RRRRRMMMMRRRRR.', 12: '..RRRROOOORRRR..' }
  };
  var ECKI_BEINE = {
    steh: ['..JJJJJJJJJJJJ..', '..JJJJJ..JJJJJ..', '..JJJJJ..JJJJJ..', '..JJJJ....JJJJ..', '.KKKKK....KKKKK.', '.KkKKK....KKkKK.'],
    laufA: ['..JJJJJJJJJJJJ..', '..JJJJJ.JJJJJ...', '.JJJJJ...JJJJ...', 'JJJJ......JJJJ..', 'KKKK.......KKKK.', 'KkK........KkKK.'],
    laufB: ['..JJJJJJJJJJJJ..', '...JJJJJJJJJ....', '....JJJJJJJ.....', '.....JJJJJ......', '....KKKKKKK.....', '....KkKKKkK.....'],
    sprung: ['..JJJJJJJJJJJJ..', '..JJJJ..JJJJ....', '.JJJJ....JJJJ...', 'KKKK......KKKK..', 'KkK........KKk..', '................'],
    duck: ['..JJJJJJJJJJJJ..', '.KKKKJJ..JJKKKK.', '.KkKK......KKkK.']
  };

  // Philipp: Möchtegern-Gangster-Look – dunkler Wuschel-Pony, Sonnenbrille im Haar, grüner Hoodie mit weißem Streifen, Bauchtasche, Goldkette
  var PHILIPP_PAL = {
    H: '#241812', h: '#3e2c22', S: '#e2b48c', s: '#c69270', E: '#2a1a10', W: '#ffffff', M: '#a86058', O: '#3a1a14',
    G: '#1e4a3c', g: '#163a2e', T: '#f2f2f2', t: '#202020', B: '#141414', b: '#3a3a3a', K: '#e8c040', Y: '#101014', y: '#5a7a9a'
  };
  var PHILIPP = [
    '.....hHHHHhHHH......', '...HHHHHHHHHHHHHH...', '..HHHYyYYYYYYyYHHH..', '..HHHHHHHHHHHHHHHH..', '.HHHHhHHHHHHhHHHHHH.',
    '.HHSHHHSHHHSHHHSHHH.', '..HSSSSSSSSSSSSSSH..', '..HSHHSSSSSSSSHHSH..', '..SSWESSSSSSSSWESS..', 'sSSSSSSSSssSSSSSSSSs',
    '.SSSSSSSSssSSSSSSSS.', '..SSSSSSSSMMMMSSSS..', '...sSSSSSSSSSSSSs...', '....ssSSSSSSSSss....', '.......ssssss.......',
    '...GGGGKGssGKGGGG...', '..GGGGGGKKKKGGGGGG..', '.TtGbGGGGGGGGGGGGtT.', 'TtTGGbGGGGGGGGGGGTtT', 'TTtGGGbGGGGGGGGGGtTT',
    'TtTGGGGbBBBBGGGGGTtT', 'TTtGGGGBBBBBBGGGGtTT', 'TtTGGGGBBbBBBGGGGTtT', 'gTTGGGGGGGGGGGGGGTTg'
  ];
  var PHILIPP_MOODS = {
    lernen: { 7: '..HSSSSSSSSSSSSSSH..', 8: '..SSHHSSSSSSSSHHSS..', 11: '..SSSSSSSMMMSSSSSS..' },
    erwischt: { 7: '..HHHSSSSSSSSSSHHH..', 8: '..SWEWSSSSSSSSWEWS..', 11: '..SSSSSSSOOOOSSSSS..', 12: '...sSSSSSOOSSSSSs...' },
    cool: { 2: '..HHHHHHHHHHHHHHHH..', 7: '..HSYYYYYSSYYYYYSH..', 8: '..SYyYYYYSSYYYyYYS..', 11: '..SSSSSSSSSMMMMSSS..' },
    stolz: { 2: '..HHHHHHHHHHHHHHHH..', 7: '..HSYYYYYSSYYYYYSH..', 8: '..SYyYYYYSSYYYyYYS..', 11: '..SSSSSMWWWWMSSSSS..' },
    traurig: { 7: '..HSSHHSSSSSSHHSSH..', 8: '..SSEESSSSSSSSEESS..', 11: '..SSSSSSSSSSSSSSSS..', 12: '...sSSSSMMMMSSSSs...' }
  };
  // Philipps Jungs (Hintergrund-Figuren, keine echten Personen): 14 breit, Augen schauen nach vorn, links, rechts oder runter
  var JUNGE = [
    '....HHHHHH....', '..HHHHHHHHHH..', '..HHHHHHHHHH..', '..HSSSSSSSSH..', '..SSESSSSESS..', '.sSSSSSSSSSSs.',
    '..SSSSMMSSSS..', '...SSSSSSSS...', '.....ssss.....', '..CCCCCCCCCC..', '.CCCCCCCCCCCC.', 'CCCCCCCCCCCCCC', 'CCCCCCCCCCCCCC', 'CCCCCCCCCCCCCC'
  ];
  var JUNGE_BLICK = {
    vorne: {}, links: { 4: '..SESSSSESSS..' }, rechts: { 4: '..SSSESSSSES..' }, runter: { 4: '..SSSSSSSSSS..', 5: '.sSSESSSSESSs.' },
    schock: { 4: '..SWEWSSWEWS..', 6: '..SSSSOOSSSS..' }
  };
  var JUNGE_PAL = [
    { H: '#c89a4a', S: '#f0c8a8', s: '#d8a888', E: '#202020', W: '#fff', M: '#a85a5a', O: '#3a1a1a', C: '#c83a3a' },
    { H: '#1a1a1e', S: '#8a5a3a', s: '#704830', E: '#101010', W: '#fff', M: '#5a2a2a', O: '#2a1010', C: '#3a6ac8' },
    { H: '#5a3a22', S: '#e8b898', s: '#c89878', E: '#202020', W: '#fff', M: '#a85a5a', O: '#3a1a1a', C: '#e8a82a' }
  ];

  // Saro: großer dunkler Lockenkopf, dicke Augenbrauen, Navy-Zip-Hoodie, gelbes Lanyard mit roter Karte, hellgraue Jogginghose
  var SARO_PAL = {
    H: '#24160e', h: '#4a3020', S: '#c8946e', s: '#a87452', B: '#1e120a', E: '#2a1608', W: '#ffffff', M: '#8a4e44', O: '#3a1410',
    N: '#1c2238', n: '#2e3654', Z: '#c8c8d0', Y: '#e8d040', R: '#c83a2a', G: '#d2d2cc', g: '#a8a8a0', K: '#f2f2f2', k: '#9a9a9a', P: '#ff5a8a'
  };
  var SARO = [
    '...hHHhHHhHHh...', '..HHhHHHHhHHHH..', '.hHHHhHHhHHHhHH.', 'HHhHHHHhHHHHhHHH', 'HhHHhHHHHhHHHhHH',
    'HHHSHhSHHSHhSHHH', 'hHSSSSSSSSSSSSHh', 'HHSBBBSSSSBBBSHH', 'HsSWESSSSSSEWSsH', 'HSSSSSSssSSSSSSH',
    '.SSSSSSssSSSSSS.', '.SSSSMMMMMMSSSS.', '..SSSSSSSSSSSS..', '...ssSSSSSSss...', '......ssss......',
    '..NNNYNZZNYNNN..', '.NNNNNYZZYNNNNN.', '.NnNNNNYYNNNNnN.', 'NNnNNNNRRNNNNnNN', 'NNnNNNNRRNNNNnNN',
    'SNNNNNNZZNNNNNNS', 'S.NNNNNZZNNNNN.S', '..GGGGGGGGGGGG..', '..GGGGG..GGGGG..', '..GGgGG..GGgGG..',
    '..GGGG....GGGG..', '.KKKKK....KKKKK.', '.KkKKK....KKkKK.'
  ];
  var SARO_MOODS = {
    neutral: {},
    cool: { 7: 'HHSSBBSSSSBBSSHH', 8: 'HsSBESSSSSSEBSsH', 11: '.SSSSSSMMMMMSSS.' },
    stolz: { 8: 'HsSEESSSSSSEESsH', 11: '.SSSSMWWWWMSSSS.' },
    verliebt: { 8: 'HsSPPSSSSSSPPSsH', 11: '.SSSSMWWWWMSSSS.' },
    schock: { 7: 'HHBBBSSSSSSBBBHH', 8: 'HsSWEWSSSSWEWSsH', 11: '.SSSSSMOOMSSSSS.', 12: '..SSSSSOOSSSSS..' }
  };
  // Aro, Saros großer Bruder aus Berlin (Mog-Off-Boss): gleiche Locken, Sonnenbrille, Bart, schwarzer Hoodie, Goldkette
  var ARO_PAL = {
    H: '#1e120a', h: '#3a2418', S: '#b8845e', s: '#966444', B: '#1e120a', E: '#2a1608', W: '#ffffff', M: '#7a443a', O: '#3a1410',
    N: '#141418', n: '#2a2a32', Z: '#8a8a92', Y: '#ffd23f', R: '#ffd23f', G: '#1e1e24', g: '#34343c', K: '#f2f2f2', k: '#9a9a9a', X: '#0a0a0e', x: '#5a6a8a'
  };
  var ARO_ZEILEN = { 7: 'HHSXXXXSSXXXXSHH', 8: 'HsSXxXXSSXXxXSsH', 11: '.SSSSSSMMMMMSSS.', 12: '..sSsSsSsSsSsS..', 13: '...sssSSSSsss...' };

  // Saros Freundin („Schatzi“, Nebenfigur): lange dunkle Haare, rosa Hoodie mit Herz
  var SCHATZI_PAL = {
    H: '#2a1a14', S: '#e8b898', s: '#c89878', E: '#2a1a10', W: '#ffffff', M: '#c8506a', O: '#3a1418', R: '#f08a9a',
    P: '#f4a8c8', D: '#e83a6a', J: '#4a6aa8', K: '#f2f2f2', k: '#9a9a9a', X: '#ff5a8a'
  };
  var SCHATZI = [
    '................', '....HHHHHHHH....', '...HHHHHHHHHH...', '..HHHHHHHHHHHH..', '..HHHHHHHHHHHH..',
    '..HHSSSSSSSSHH..', '..HSSSSSSSSSSH..', '..HSSSSSSSSSSH..', '..HSWESSSSEWSH..', '.HHRSSSssSSSRHH.',
    '.HHSSSSSSSSSSHH.', '.HHSSSMMMMSSSHH.', '.HHHSSSSSSSSHHH.', '.HHHHssSSssHHHH.', '.HHHH.ssss.HHHH.',
    '.HHPPPPssPPPPHH.', '.HPPPPPPPPPPPPH.', '.HPPPDDPPDDPPPH.', 'PPPPPDDDDDDPPPPP', 'PPPPPPDDDDPPPPPP',
    'SPPPPPPDDPPPPPPS', 'S.PPPPPPPPPPPP.S', '..JJJJJJJJJJJJ..', '..JJJJJ..JJJJJ..', '..JJJJJ..JJJJJ..',
    '..JJJJ....JJJJ..', '.KKKKK....KKKKK.', '.KkKKK....KKkKK.'
  ];
  var SCHATZI_MOODS = {
    neutral: {},
    verliebt: { 8: '..HSXXSSSSXXSH..', 11: '.HHSSMWWWWMSSHH.' },
    sauer: { 7: '..HSHHSSSSHHSH..', 8: '..HSEESSSSEESH..', 11: '.HHSSSOOOOSSSHH.' }
  };

  function withMood(base, moods, mood) {
    var o = moods[mood] || {};
    return base.map(function (row, i) { return o[i] || row; });
  }

  window.Sprites = {
    matteo: function (mood) {
      mood = mood || 'neutral';
      return Pixel.sprite('matteo-' + mood, withMood(MATTEO, MATTEO_MOODS, mood), MATTEO_PAL);
    },
    leon: function (mood) {
      mood = mood || 'neutral';
      return Pixel.sprite('leon-' + mood, withMood(LEON, LEON_MOODS, mood), LEON_PAL);
    },
    mo: function (bild) {
      bild = MO_BEINE[bild] ? bild : 'steh';
      return Pixel.sprite('mo-' + bild, MO_KOPF.concat(MO_BEINE[bild]), MO_PAL);
    },
    omar: function (mood) {
      mood = mood || 'neutral';
      return Pixel.sprite('omar-' + mood, withMood(OMAR, OMAR_MOODS, mood), OMAR_PAL);
    },
    felix: function (mood) {
      mood = mood || 'neutral';
      return Pixel.sprite('felix-' + mood, withMood(FELIX, FELIX_MOODS, mood), FELIX_PAL);
    },
    julian: function (mood) {
      mood = mood || 'neutral';
      return Pixel.sprite('julian-' + mood, withMood(JULIAN, JULIAN_MOODS, mood), JULIAN_PAL);
    },
    doppeldate: function () {
      var c = document.createElement('canvas'); c.width = 34; c.height = 28;
      var x = c.getContext('2d');
      x.drawImage(Pixel.sprite('moritz-menue', MORITZ, MORITZ_PAL), 0, 0);
      x.drawImage(Pixel.sprite('damon-menue', DAMON, DAMON_PAL), 18, 0);
      return c;
    },
    ecki: function (bild, mood) {
      bild = ECKI_BEINE[bild] ? bild : 'steh'; mood = ECKI_MOODS[mood] ? mood : 'neutral';
      return Pixel.sprite('ecki-' + bild + '-' + mood, withMood(ECKI_KOPF, ECKI_MOODS, mood).concat(ECKI_BEINE[bild]), ECKI_PAL);
    },
    philipp: function (mood) {
      mood = PHILIPP_MOODS[mood] ? mood : 'neutral';
      return Pixel.sprite('philipp-' + mood, withMood(PHILIPP, PHILIPP_MOODS, mood), PHILIPP_PAL);
    },
    saro: function (mood) {
      mood = SARO_MOODS[mood] ? mood : 'neutral';
      return Pixel.sprite('saro-' + mood, withMood(SARO, SARO_MOODS, mood), SARO_PAL);
    },
    aro: function () {
      return Pixel.sprite('aro', withMood(SARO, { aro: ARO_ZEILEN }, 'aro'), ARO_PAL);
    },
    schatzi: function (mood) {
      mood = SCHATZI_MOODS[mood] ? mood : 'neutral';
      return Pixel.sprite('schatzi-' + mood, withMood(SCHATZI, SCHATZI_MOODS, mood), SCHATZI_PAL);
    },
    junge: function (nr, blick) {
      blick = JUNGE_BLICK[blick] ? blick : 'vorne';
      return Pixel.sprite('junge-' + nr + '-' + blick, withMood(JUNGE, JUNGE_BLICK, blick), JUNGE_PAL[nr % JUNGE_PAL.length]);
    },
    timo: function (mood) {
      mood = mood || 'neutral';
      return Pixel.sprite('timo-' + mood, withMood(TIMO, TIMO_MOODS, mood), TIMO_PAL);
    }
  };
})();
