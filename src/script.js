/* =====================================================================
   THE LAST TRAIN HOME — revised story script
   Harlowe keeps the story state. Each passage's header writes the state
   into a hidden <div class="ltth-data">; this script reads it after every
   render and drives the interface around the story:
     - fog, vignette and flicker layers, and sanity-based visual states
     - the HUD (passenger, sanity meter, carriage progress, companions)
     - toolbar: Journal, Sound, Motion, Text size, Restart
     - journal dialog (clues, items, companions)
     - endings gallery (stored in this browser's localStorage)
     - typewriter effect for PA announcements
     - optional procedural ambient sound (Web Audio, off by default)
   ===================================================================== */
(function () {
  'use strict';
  if (window.LTTH) return;

  /* ---------------- storage helpers (never throw) ---------------- */
  function lsGet(key, fallback) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch (e) { return fallback; }
  }
  function lsSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
  }
  var IFID = (document.querySelector('tw-storydata') || { getAttribute: function () { return ''; } }).getAttribute('ifid');
  var SAVE_KEYS = ['(Saved Game ' + IFID + ') auto', '(Saved Game Filename ' + IFID + ') auto'];
  function hasSave() {
    try { return localStorage.getItem(SAVE_KEYS[0]) !== null; } catch (e) { return false; }
  }
  function clearSave() {
    try { SAVE_KEYS.forEach(function (k) { localStorage.removeItem(k); }); } catch (e) { /* ignore */ }
  }
  function clearSession() {
    try { sessionStorage.removeItem('Saved Session'); } catch (e) { /* ignore */ }
  }

  /* ---------------- content ---------------- */
  var CLUES = {
    'warning': ['The conductor’s warning', '“If you hear someone calling your name from outside the train, do not answer.”'],
    'newspaper': ['A newspaper, October 28, 1891', 'MIDNIGHT EXPRESS LOST IN FOG. Line Zero left Ashgrove at midnight and never arrived. Among the missing: the conductor, eleven passengers, and a boy of nine travelling alone.'],
    'armrest': ['Scratches on an armrest', 'DON’T FALL ASLEEP. The letters are fresh, and lean the way yours do.'],
    'conductor-notebook': ['The conductor’s notebook', 'A passenger list. Nearly every name is crossed out. “Seat 13 — M.” is not. Your name is the last entry, and the ink is still wet.'],
    'station-sign': ['The platform at Ashgrove', 'The station sign has CLOSED painted across it. A figure under the last lamp, waiting for a train that has already left.'],
    'mara-photo': ['Mara’s photograph', 'A little girl in a yellow coat. For a moment, words on the window behind her: SHE NEVER BOARDED.'],
    'place-cards': ['Place cards in the dining car', 'Every seat is reserved, each card with a name and a date. Yours bears tonight’s. The conductor’s has no date at all.'],
    'girl-on-platform': ['Thomas’s girl in yellow', '“There’s a girl in a yellow coat who waves at the train every night. She was little when I first saw her. She’s grown up now.”'],
    'unsent-letter': ['An unsent letter', 'In your own hand, the ink run as if by rain: “I’m on the last train. Leave the porch light on.”'],
    'firebox': ['The firebox', 'The engine burns tickets. Each one punched once. None of them ever coming back.']
  };
  var ITEMS = {
    lantern: ['Railway lantern', 'Hooded brass, half full of paraffin. It keeps the dark at arm’s length.'],
    keycard: ['Brass keycard', 'Stamped LOCOMOTIVE — CREW ONLY. Found folded in the conductor’s napkin.'],
    watch: ['Thomas’s pocket watch', 'The second hand runs backward. It ticks against your palm, sharp as a pin, and will not let you rest.']
  };
  var ENDINGS = [
    { id: 'home', num: 'I', title: 'Home', hint: 'Understand enough to let go.' },
    { id: 'together', num: 'II', title: 'Together', hint: 'Some people should not be left behind, or lied to.' },
    { id: 'conductor', num: 'III', title: 'The New Conductor', hint: 'Somebody has to punch the tickets.' },
    { id: 'sleep', num: 'IV', title: 'The Long Sleep', hint: 'The armrest gave you good advice.' },
    { id: 'nowhere', num: 'V', title: 'Nowhere Station', hint: 'Some voices should not be answered.' }
  ];
  var ROMAN = ['I', 'II', 'III', 'IV', 'V'];

  /* ---------------- settings ---------------- */
  var prefersReduce = false;
  try { prefersReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* ignore */ }
  var settings = Object.assign({ reduceMotion: prefersReduce, largeText: false }, lsGet('ltth-settings', {}));
  function saveSettings() { lsSet('ltth-settings', settings); }
  function applySettings() {
    document.body.classList.toggle('reduce-motion', !!settings.reduceMotion);
    document.body.classList.toggle('large-text', !!settings.largeText);
  }

  /* ---------------- DOM helpers ---------------- */
  function el(tag, attrs, html) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (html != null) n.innerHTML = html;
    return n;
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------------- atmosphere layers ---------------- */
  var fog = el('div', { 'class': 'ltth-layer ltth-fog', 'aria-hidden': 'true' }, '<i></i><i></i><i></i>');
  var vignette = el('div', { 'class': 'ltth-layer ltth-vignette', 'aria-hidden': 'true' });
  var flicker = el('div', { 'class': 'ltth-layer ltth-flicker', 'aria-hidden': 'true' });
  document.body.appendChild(fog);
  document.body.appendChild(vignette);
  document.body.appendChild(flicker);

  function doFlicker() {
    if (settings.reduceMotion) return;
    flicker.classList.remove('on');
    void flicker.offsetWidth; // restart animation
    flicker.classList.add('on');
    Sound.staticBurst(0.8);
  }

  /* ---------------- toast ---------------- */
  var toast = el('div', { 'class': 'ltth-toast', role: 'status', 'aria-live': 'polite' });
  document.body.appendChild(toast);
  var toastTimer;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 2600);
  }

  /* ---------------- toolbar ---------------- */
  var toolbar = el('nav', { 'class': 'ltth-toolbar', 'aria-label': 'Game controls' });
  toolbar.innerHTML =
    '<button type="button" data-act="journal" aria-label="Open journal"><span class="ico" aria-hidden="true">✎</span><span class="lbl">Journal</span><span class="badge"></span></button>' +
    '<button type="button" data-act="sound" aria-pressed="false" aria-label="Ambient sound"><span class="ico" aria-hidden="true">♪</span><span class="lbl">Sound: Off</span></button>' +
    '<button type="button" data-act="motion" aria-pressed="false" aria-label="Reduce motion"><span class="ico" aria-hidden="true">◐</span><span class="lbl">Reduce motion</span></button>' +
    '<button type="button" data-act="text" aria-pressed="false" aria-label="Larger text"><span class="ico" aria-hidden="true">A+</span><span class="lbl">Text</span></button>' +
    '<button type="button" data-act="restart" aria-label="Restart the game"><span class="ico" aria-hidden="true">↺</span><span class="lbl">Restart</span></button>';
  document.body.appendChild(toolbar);
  var btn = {};
  toolbar.querySelectorAll('button').forEach(function (b) { btn[b.getAttribute('data-act')] = b; });

  function syncToolbar() {
    btn.sound.setAttribute('aria-pressed', String(Sound.on));
    btn.sound.querySelector('.lbl').textContent = Sound.on ? 'Sound: On' : 'Sound: Off';
    btn.motion.setAttribute('aria-pressed', String(!!settings.reduceMotion));
    btn.text.setAttribute('aria-pressed', String(!!settings.largeText));
  }
  toolbar.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    var act = b.getAttribute('data-act');
    if (act === 'journal') openJournal();
    if (act === 'sound') { Sound.toggle(); syncToolbar(); }
    if (act === 'motion') {
      settings.reduceMotion = !settings.reduceMotion; saveSettings(); applySettings(); syncToolbar();
      showToast(settings.reduceMotion ? 'Motion reduced' : 'Motion effects on');
    }
    if (act === 'text') {
      settings.largeText = !settings.largeText; saveSettings(); applySettings(); syncToolbar();
    }
    if (act === 'restart') openConfirm();
  });

  /* ---------------- journal dialog ---------------- */
  var journal = el('dialog', { 'class': 'ltth-dialog', 'aria-labelledby': 'ltth-j-title' });
  journal.innerHTML = '<header><h2 id="ltth-j-title">Journal</h2><button type="button" class="close" aria-label="Close journal">Close</button></header><div class="body"></div>';
  document.body.appendChild(journal);
  journal.querySelector('.close').addEventListener('click', function () { journal.close(); });
  journal.addEventListener('click', function (e) { if (e.target === journal) journal.close(); });

  function renderJournal() {
    var s = current || readState() || { clues: [], forgotten: '' };
    var h = '<h3>What you have noticed</h3>';
    if (s.clues.length) {
      h += '<ul>' + s.clues.map(function (c) {
        var d = CLUES[c]; return d ? '<li><b>' + esc(d[0]) + '</b>' + esc(d[1]) + '</li>' : '';
      }).join('') + '</ul>';
    } else {
      h += '<p class="empty">Nothing yet. Look closely at things marked with a lens.</p>';
    }
    if (s.forgotten) h += '<ul><li class="torn">A page has been torn out. You remember that something was written here. You do not remember what.</li></ul>';
    h += '<h3>What you carry</h3>';
    var items = [];
    items.push('<li><b>Your ticket</b>Midnight Express, Line 0. Passenger: ' + esc(s.name || 'Traveler') + '.</li>');
    if (s.lantern) items.push('<li><b>' + ITEMS.lantern[0] + '</b>' + ITEMS.lantern[1] + '</li>');
    if (s.keycard) items.push('<li><b>' + ITEMS.keycard[0] + '</b>' + ITEMS.keycard[1] + '</li>');
    if (s.watch) items.push('<li><b>' + ITEMS.watch[0] + '</b>' + ITEMS.watch[1] + '</li>');
    h += '<ul>' + items.join('') + '</ul>';
    h += '<h3>Who travels with you</h3>';
    var who = [];
    if (s.maraF) who.push('<li><b>Mara</b>' + maraMood(s.trust) + '</li>');
    if (s.thomas) who.push('<li><b>Thomas</b>Nine years old, travelling alone. Not any more.</li>');
    h += who.length ? '<ul>' + who.join('') + '</ul>' : '<p class="empty">No one.</p>';
    journal.querySelector('.body').innerHTML = h;
  }
  function openJournal() {
    renderJournal();
    btn.journal.querySelector('.badge').textContent = '';
    if (journal.showModal) journal.showModal(); else journal.setAttribute('open', '');
  }
  function maraMood(t) {
    if (t >= 3) return 'She trusts you. She walks close enough to touch.';
    if (t >= 1) return 'She is beginning to trust you.';
    if (t >= 0) return 'She is uncertain of you, but she is here.';
    return 'She keeps her distance. She has not forgotten how you treated her.';
  }

  /* ---------------- restart confirm ---------------- */
  var confirmDlg = el('dialog', { 'class': 'ltth-dialog', 'aria-labelledby': 'ltth-c-title' });
  confirmDlg.innerHTML = '<header><h2 id="ltth-c-title">Restart</h2></header><div class="body"><p>Start a new journey from the beginning? Your current progress and autosave will be lost. Endings you have discovered are kept.</p><div class="actions"><button type="button" data-c="no">Keep playing</button><button type="button" class="danger" data-c="yes">Restart</button></div></div>';
  document.body.appendChild(confirmDlg);
  confirmDlg.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    if (b.getAttribute('data-c') === 'yes') restartGame();
    else confirmDlg.close();
  });
  function openConfirm() { if (confirmDlg.showModal) confirmDlg.showModal(); else if (window.confirm('Restart the game?')) restartGame(); }
  function restartGame() {
    clearSave();
    clearSession();
    window.location.reload();
  }

  /* ---------------- endings gallery ---------------- */
  function foundEndings() { return lsGet('ltth-endings', []); }
  function renderGalleries(newId) {
    var found = foundEndings();
    document.querySelectorAll('.gallery-slot').forEach(function (slot) {
      var h = '<div class="gallery"><h2>Endings discovered: ' + found.length + ' of ' + ENDINGS.length + '</h2><ol>';
      ENDINGS.forEach(function (e) {
        var got = found.indexOf(e.id) !== -1;
        h += '<li class="' + (got ? 'found' : 'locked') + (e.id === newId ? ' new' : '') + '">' +
          '<span class="g-num">' + e.num + '</span>' +
          '<span class="g-title">' + (got ? esc(e.title) : '? ? ?') + '</span>' +
          '<span class="g-hint">' + esc(e.hint) + '</span></li>';
      });
      slot.innerHTML = h + '</ol></div>';
    });
  }
  function recordEnding(id) {
    var found = foundEndings();
    if (found.indexOf(id) === -1) { found.push(id); lsSet('ltth-endings', found); }
    clearSave(); // a finished journey cannot be continued
  }

  /* ---------------- read Harlowe state from the header ---------------- */
  function readState() {
    var d = document.querySelector('.ltth-data');
    if (!d) return null;
    function get(k) { var n = d.querySelector('.k-' + k); return n ? n.textContent.trim() : ''; }
    return {
      name: get('name'),
      passage: get('passage'),
      sanity: parseInt(get('sanity'), 10) || 0,
      car: parseInt(get('car'), 10) || 0,
      passengers: parseInt(get('passengers'), 10) || 0,
      maraF: get('maraF') === 'true',
      trust: parseInt(get('trust'), 10) || 0,
      lantern: get('lantern') === 'true',
      keycard: get('keycard') === 'true',
      watch: get('watch') === 'true',
      thomas: get('thomas') === 'true',
      forgotten: get('forgotten'),
      clues: Array.prototype.map.call(d.querySelectorAll('.k-clues i'), function (i) { return i.textContent.trim(); })
    };
  }
  function band(s) { return s >= 75 ? 'calm' : s >= 50 ? 'uneasy' : s >= 25 ? 'frayed' : 'breaking'; }

  function renderHud(s) {
    var hud = document.querySelector('tw-include[type="header"] .hud');
    if (!hud) return;
    if (!s || s.car < 1) { hud.innerHTML = ''; return; }
    var cars = ROMAN.map(function (r, i) {
      var n = i + 1;
      var cls = n < s.car ? 'done' : n === s.car ? 'current' : '';
      return '<li class="' + cls + '"' + (n === s.car ? ' aria-current="step"' : '') + '>' + r + '</li>';
    }).join('');
    var company = [];
    if (s.maraF) company.push('Mara');
    if (s.thomas) company.push('Thomas');
    hud.innerHTML =
      '<span class="hud-group"><b>Passenger:</b> <span class="status-name">' + esc(s.name) + '</span></span>' +
      '<span class="hud-group" role="img" aria-label="Sanity ' + s.sanity + ' percent"><b>Sanity:</b> <span class="meter"><span style="width:' + Math.max(0, Math.min(100, s.sanity)) + '%"></span></span><span class="hud-num">' + s.sanity + '%</span></span>' +
      '<span class="hud-group"><b>Carriage:</b> <ol class="hud-cars" aria-label="Carriage ' + s.car + ' of 5">' + cars + '</ol></span>' +
      '<span class="hud-group"><b>Passengers:</b> <span class="hud-mara">' + s.passengers + (company.length ? ' — ' + company.join(', ') : '') + '</span></span>';
  }

  /* ---------------- per-passage enhancements ---------------- */
  function passageTags() {
    var p = document.querySelector('tw-passage');
    var t = (p && p.getAttribute('tags')) || (document.querySelector('tw-story') || { getAttribute: function () { return ''; } }).getAttribute('tags') || '';
    return t.split(/\s+/).filter(Boolean);
  }

  function typewrite(node) {
    if (node.getAttribute('data-typed')) return;
    node.setAttribute('data-typed', '1');
    if (settings.reduceMotion) return;
    var walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null);
    var texts = [], t;
    while ((t = walker.nextNode())) { texts.push({ node: t, full: t.nodeValue }); t.nodeValue = ''; }
    node.classList.add('typing');
    var i = 0, j = 0, timer;
    function finish() {
      clearInterval(timer);
      texts.forEach(function (x) { x.node.nodeValue = x.full; });
      node.classList.remove('typing');
    }
    node.addEventListener('click', finish, { once: true });
    timer = setInterval(function () {
      if (!document.body.contains(node)) { clearInterval(timer); return; }
      if (i >= texts.length) { finish(); return; }
      j += 1;
      texts[i].node.nodeValue = texts[i].full.slice(0, j);
      if (j >= texts[i].full.length) { i += 1; j = 0; }
    }, 24);
  }

  function setupNameField() {
    var field = document.querySelector('.name-field textarea, .name-field input');
    var ink = document.querySelector('.ticket-ink');
    if (!field || field.getAttribute('data-ltth')) return;
    field.setAttribute('data-ltth', '1');
    field.setAttribute('maxlength', '16');
    field.setAttribute('aria-label', 'Your name, as written on the ticket');
    field.setAttribute('autocomplete', 'off');
    field.setAttribute('spellcheck', 'false');
    function sync() { if (ink) ink.textContent = field.value.trim() || 'Traveler'; }
    field.addEventListener('input', sync);
    field.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); field.blur(); } });
    sync();
  }

  var lastPassage = null, lastSig = '', prev = null, current = null;
  function onRender() {
    var passage = document.querySelector('tw-passage');
    var s = readState();
    var sig = s ? JSON.stringify(s) : '';
    var isNewPassage = passage && passage !== lastPassage;
    if (!isNewPassage && sig === lastSig) return;
    lastSig = sig;

    if (s) {
      current = s;
      document.body.setAttribute('data-sanity', band(s.sanity));
      Sound.setSanity(s.sanity);
      // journal notifications for things gained mid-game
      if (prev && s.car >= 1) {
        var gained = s.clues.filter(function (c) { return prev.clues.indexOf(c) === -1; }).length +
          (s.lantern && !prev.lantern ? 1 : 0) + (s.keycard && !prev.keycard ? 1 : 0) + (s.watch && !prev.watch ? 1 : 0);
        if (gained > 0) {
          var badge = btn.journal.querySelector('.badge');
          badge.textContent = String((parseInt(badge.textContent, 10) || 0) + gained);
          btn.journal.classList.remove('pulse'); void btn.journal.offsetWidth; btn.journal.classList.add('pulse');
          showToast('Your journal has a new entry');
        }
        if (s.forgotten && !prev.forgotten) showToast('Something has been forgotten');
      }
      prev = s;
    } else {
      document.body.setAttribute('data-sanity', 'calm');
    }
    renderHud(s);

    if (isNewPassage) {
      lastPassage = passage;
      var tags = passageTags();
      if (tags.indexOf('flicker') !== -1) setTimeout(doFlicker, 250);
      document.querySelectorAll('tw-passage .speaker').forEach(typewrite);
      setupNameField();
      document.querySelectorAll('.continue-wrap').forEach(function (w) { w.classList.toggle('has-save', hasSave()); });
      var endTag = tags.filter(function (t) { return t.indexOf('end-') === 0; })[0];
      if (endTag) { recordEnding(endTag.slice(4)); renderGalleries(endTag.slice(4)); }
      else renderGalleries(null);
      if (journal.open) renderJournal();
    }
  }

  var scheduled = false;
  var observer = new MutationObserver(function () {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function () { scheduled = false; onRender(); });
  });
  function attach() {
    var story = document.querySelector('tw-story');
    if (!story) { requestAnimationFrame(attach); return; }
    observer.observe(story, { childList: true, subtree: true, characterData: true });
    onRender();
  }

  /* =================================================================
     Ambient sound: generated live with the Web Audio API, so the game
     needs no audio files. Off by default; only starts when the player
     presses the Sound button (which also satisfies browser autoplay rules).
       - rumble: low-passed brown noise with a slow swell
       - wheels: paired "clack-clack" of rail joints with a thump
       - hum: two detuned low sawtooth tones (the engine)
       - mechanical: occasional metallic creak / brake squeal
       - static: crackling radio bursts, more frequent as sanity falls
     ================================================================= */
  var Sound = (function () {
    var AC = window.AudioContext || window.webkitAudioContext;
    var ctx = null, master = null, white = null, timers = [], sanity = 100;
    var api = { on: false };

    function noise(kind) {
      var len = ctx.sampleRate * 4, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0), last = 0;
      for (var i = 0; i < len; i++) {
        var w = Math.random() * 2 - 1;
        if (kind === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
      }
      return buf;
    }
    function build() {
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
      white = noise('white');
      // rumble
      var rb = ctx.createBufferSource(); rb.buffer = noise('brown'); rb.loop = true;
      var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 150;
      var rg = ctx.createGain(); rg.gain.value = 0.55;
      var lfo = ctx.createOscillator(); lfo.frequency.value = 0.11;
      var lfoAmt = ctx.createGain(); lfoAmt.gain.value = 0.18;
      lfo.connect(lfoAmt); lfoAmt.connect(rg.gain); lfo.start();
      rb.connect(lp); lp.connect(rg); rg.connect(master); rb.start();
      // engine hum
      [55, 110.6].forEach(function (f) {
        var o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
        var fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 170;
        var g = ctx.createGain(); g.gain.value = 0.016;
        o.connect(fl); fl.connect(g); g.connect(master); o.start();
      });
    }
    function burst(t, dur, freq, q, gain) {
      var s = ctx.createBufferSource(); s.buffer = white;
      var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = q;
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(bp); bp.connect(g); g.connect(master);
      s.start(t, Math.random() * 3); s.stop(t + dur + 0.05);
    }
    function wheels() {
      if (!api.on) return;
      var t = ctx.currentTime + 0.05;
      burst(t, 0.1, 950, 4, 0.2); burst(t + 0.17, 0.1, 820, 4, 0.16);
      burst(t + 0.02, 0.3, 140, 1, 0.3);
      timers.push(setTimeout(wheels, 1600 + Math.random() * 450));
    }
    function creak() {
      if (!api.on) return;
      var t = ctx.currentTime + 0.05, o = ctx.createOscillator(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
      var f = 700 + Math.random() * 900;
      o.type = 'triangle';
      o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * 0.82, t + 1.6);
      bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 9;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.035, t + 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
      o.connect(bp); bp.connect(g); g.connect(master); o.start(t); o.stop(t + 1.9);
      timers.push(setTimeout(creak, 18000 + Math.random() * 22000));
    }
    function crackle(strength) {
      if (!ctx || !api.on) return;
      var t = ctx.currentTime + 0.02, dur = 0.3 + Math.random() * 0.9 * (strength || 1);
      burst(t, dur, 2600, 0.7, 0.07 * (strength || 1));
      for (var k = 0; k < 6; k++) burst(t + Math.random() * dur, 0.03, 4000 + Math.random() * 3000, 2, 0.08 * (strength || 1));
    }
    function staticLoop() {
      if (!api.on) return;
      crackle(sanity < 25 ? 1.4 : sanity < 50 ? 1.1 : 0.8);
      var base = sanity < 25 ? 4500 : sanity < 50 ? 8000 : 14000;
      timers.push(setTimeout(staticLoop, base + Math.random() * base));
    }
    api.toggle = function () {
      if (!AC) { showToast('Sound is not supported in this browser'); return; }
      if (!api.on) {
        if (!ctx) build();
        ctx.resume();
        api.on = true;
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setTargetAtTime(0.85, ctx.currentTime, 0.8);
        wheels();
        timers.push(setTimeout(staticLoop, 3000));
        timers.push(setTimeout(creak, 9000));
      } else {
        api.on = false;
        timers.forEach(clearTimeout); timers = [];
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
        setTimeout(function () { if (!api.on && ctx) ctx.suspend(); }, 1200);
      }
    };
    api.staticBurst = function (s) { crackle(s); };
    api.setSanity = function (s) { sanity = s; };
    return api;
  })();

  /* ---------------- start ---------------- */
  applySettings();
  syncToolbar();
  attach();

  window.LTTH = { readState: readState, sound: Sound, endings: foundEndings, hasSave: hasSave };
})();
