/*
 * Refúgio Sensorial · Motor de som (Web Audio API)
 *
 * Gera a trilha ao vivo em 3 camadas (uma por clima) + um canal de teste de fone.
 * O volume de cada camada segue a mistura do clima, com transições suaves.
 *
 * Portável quase sem mudanças para React Native com `react-native-audio-api`
 * (Software Mansion), que implementa a mesma especificação Web Audio.
 * Diferenças a tratar no app: sessão de áudio (iOS), interrupções, segundo plano. Ver 02-SDD.md.
 *
 * Uso:
 *   const audio = new RefugioAudio();
 *   audio.start();                       // chamar dentro de um toque do usuário
 *   audio.setMix({tempestade:.2, nevoa:.5, clareira:.3});
 *   audio.setMaster(0.85);               // 0 = mudo
 *   audio.setTest(true);                 // "plim" alternando esquerdo/direito
 *   audio.dispose();
 */
(function (root) {
  var CHORDS = [[130.81, 196.0, 261.63, 329.63], [110.0, 164.81, 220.0, 261.63], [87.31, 174.61, 220.0, 261.63], [98.0, 146.83, 196.0, 246.94]]; // C, Am, F, G
  var PATTERN = [0, 1, 2, 3, 2, 1];
  var NOTE_INTERVAL = 0.95; // segundos entre notas do violão
  var LAYER_GAIN = { tempestade: 0.9, nevoa: 1, clareira: 1 };

  function RefugioAudio(opts) {
    opts = opts || {};
    this.AC = opts.AudioContext || root.AudioContext || root.webkitAudioContext;
    this.ctx = null;
    this.tgt = { tempestade: 0, nevoa: 0.35, clareira: 0.65, test: 0 };
  }

  RefugioAudio.prototype.start = function () {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    if (!this.AC) return;
    var ctx = this.ctx = new this.AC(), sr = ctx.sampleRate, self = this;
    var master = this.master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
    var mk = function () { var g = ctx.createGain(); g.gain.value = 0; g.connect(master); return g; };
    var L = this.L = { tempestade: mk(), nevoa: mk(), clareira: mk(), test: mk() };

    // Ruído rosa (Paul Kellet), 4 s em loop
    var len = sr * 4, buf = ctx.createBuffer(1, len, sr), d = buf.getChannelData(0);
    var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (var i = 0; i < len; i++) {
      var w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
    }
    var noise = function () { var n = ctx.createBufferSource(); n.buffer = buf; n.loop = true; n.start(0, Math.random() * 3); return n; };
    var lfo = function (freq, depth, target) { var o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = freq; g.gain.value = depth; o.connect(g); g.connect(target); o.start(); };

    // TEMPESTADE: mar (ruído rosa filtrado, ondulando) + binaural 4 Hz
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 650;
    var waves = ctx.createGain(); waves.gain.value = 0.55;
    noise().connect(lp); lp.connect(waves); waves.connect(L.tempestade);
    lfo(0.085, 0.45, waves.gain); lfo(0.085, 380, lp.frequency);
    var merger = ctx.createChannelMerger(2), oL = ctx.createOscillator(), oR = ctx.createOscillator(), bg = ctx.createGain();
    oL.frequency.value = 200; oR.frequency.value = 204; bg.gain.value = 0.045;
    oL.connect(merger, 0, 0); oR.connect(merger, 0, 1); merger.connect(bg); bg.connect(L.tempestade); oL.start(); oR.start();

    // NÉVOA: vento (ruído em passa-banda móvel) + violão (Karplus-Strong)
    var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 520; bp.Q.value = 0.8;
    var wind = ctx.createGain(); wind.gain.value = 0.28;
    noise().connect(bp); bp.connect(wind); wind.connect(L.nevoa); lfo(0.05, 260, bp.frequency); lfo(0.07, 0.12, wind.gain);

    // CLAREIRA: folhas (ruído agudo) + pad de 4 senoides (F maior) + pássaros
    var hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2800;
    var leaves = ctx.createGain(); leaves.gain.value = 0.05;
    noise().connect(hp); hp.connect(leaves); leaves.connect(L.clareira); lfo(0.11, 0.03, leaves.gain);
    var pad = ctx.createGain(); pad.gain.value = 0.05; pad.connect(L.clareira);
    [174.61, 220, 261.63, 349.23].forEach(function (f, k) { var o = ctx.createOscillator(); o.frequency.value = f; o.detune.value = (k - 1.5) * 4; o.connect(pad); o.start(); lfo(0.05 + k * 0.013, 5, o.detune); });
    lfo(0.04, 0.02, pad.gain);

    var plucks = {};
    function pluckBuf(freq) {
      if (plucks[freq]) return plucks[freq];
      var n = Math.round(sr / freq), dur = Math.floor(sr * 3), b = ctx.createBuffer(1, dur, sr), out = b.getChannelData(0), ring = new Float32Array(n);
      for (var i = 0; i < n; i++) ring[i] = Math.random() * 2 - 1;
      for (var j = 0; j < dur; j++) { var a = j % n, nx = (a + 1) % n; out[j] = ring[a]; ring[a] = 0.5 * (ring[a] + ring[nx]) * 0.9965; }
      return (plucks[freq] = b);
    }
    function play(b, when, vol, pan, dest) { var s = ctx.createBufferSource(), g = ctx.createGain(), p = ctx.createStereoPanner(); s.buffer = b; g.gain.value = vol; p.pan.value = pan; s.connect(g); g.connect(p); p.connect(dest); s.start(when); }
    function chirp(when, pan) {
      var o = ctx.createOscillator(), g = ctx.createGain(), p = ctx.createStereoPanner(), f0 = 2600 + Math.random() * 1400;
      o.frequency.setValueAtTime(f0, when); o.frequency.exponentialRampToValueAtTime(f0 * 1.45, when + 0.05); o.frequency.exponentialRampToValueAtTime(f0 * 0.95, when + 0.11);
      g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(0.045, when + 0.012); g.gain.exponentialRampToValueAtTime(0.0005, when + 0.13);
      p.pan.value = pan; o.connect(g); g.connect(p); p.connect(L.clareira); o.start(when); o.stop(when + 0.15);
    }
    function ping(when, pan) {
      var o = ctx.createOscillator(), g = ctx.createGain(), p = ctx.createStereoPanner();
      o.frequency.value = 523.25; g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(0.18, when + 0.02); g.gain.exponentialRampToValueAtTime(0.0005, when + 0.6);
      p.pan.value = pan; o.connect(g); g.connect(p); p.connect(L.test); o.start(when); o.stop(when + 0.65);
    }

    var st = { nextNote: 0, step: 0, nextBird: 0, nextPing: 0, side: -1 };
    this.timer = setInterval(function () {
      var now = ctx.currentTime, t = self.tgt;
      if (t.nevoa > 0.03 && now >= st.nextNote - 0.15) {
        var ch = CHORDS[Math.floor(st.step / PATTERN.length) % CHORDS.length], idx = PATTERN[st.step % PATTERN.length];
        play(pluckBuf(ch[idx]), Math.max(now, st.nextNote), 0.32, (idx - 1.5) * 0.25, L.nevoa);
        st.nextNote = Math.max(now, st.nextNote) + NOTE_INTERVAL; st.step++;
      }
      if (t.clareira > 0.03 && now >= st.nextBird) {
        var n = 2 + Math.floor(Math.random() * 3), pan = Math.random() * 1.6 - 0.8;
        for (var k = 0; k < n; k++) chirp(now + 0.05 + k * (0.13 + Math.random() * 0.06), pan);
        st.nextBird = now + 2.5 + Math.random() * 4;
      }
      if (t.test > 0.5 && now >= st.nextPing) { ping(now + 0.05, st.side); st.side *= -1; st.nextPing = now + 1.2; }
    }, 120);
    this._apply();
  };

  /** Mistura do clima (frações ou pesos brutos). Tudo zero = base neutra (violão + pássaros). */
  RefugioAudio.prototype.setMix = function (w) {
    var s = (w.tempestade || 0) + (w.nevoa || 0) + (w.clareira || 0);
    var m = s > 0 ? { tempestade: w.tempestade / s, nevoa: w.nevoa / s, clareira: w.clareira / s } : { tempestade: 0, nevoa: 0.35, clareira: 0.65 };
    this.tgt.tempestade = m.tempestade; this.tgt.nevoa = m.nevoa; this.tgt.clareira = m.clareira;
    this._apply();
  };
  RefugioAudio.prototype.setTest = function (on) { this.tgt.test = on ? 1 : 0; this._apply(); };
  RefugioAudio.prototype.setMaster = function (v) { this.masterTarget = v; this._apply(); };

  RefugioAudio.prototype._apply = function () {
    if (!this.ctx) return;
    var now = this.ctx.currentTime, t = this.tgt, L = this.L, testing = t.test > 0.5;
    this.master.gain.setTargetAtTime(this.masterTarget == null ? 0.85 : this.masterTarget, now, 0.8);
    ['tempestade', 'nevoa', 'clareira'].forEach(function (k) { L[k].gain.setTargetAtTime(testing ? 0 : t[k] * LAYER_GAIN[k], now, 1.2); });
    L.test.gain.setTargetAtTime(t.test, now, 0.2);
  };

  RefugioAudio.prototype.dispose = function () {
    if (this.timer) clearInterval(this.timer);
    if (this.ctx) { try { this.ctx.close(); } catch (e) {} }
    this.ctx = null;
  };

  /** Regras de volume por tela usadas no protótipo (ver especificação, seção Som). */
  RefugioAudio.masterForScreen = function (screen, soundOn, stale) {
    if (!soundOn) return 0;
    if (screen === 'help') return 0.12;
    if (['lock', 'picker', 'whatsapp'].indexOf(screen) >= 0) return 0.25;
    if (screen === 'welcome' || screen === 'content') return 0;
    var m = 0.85;
    if (stale && ['quiz', 'breath', 'tags', 'result'].indexOf(screen) < 0) m *= 0.5;
    return m;
  };

  root.RefugioAudio = RefugioAudio;
})(typeof window !== 'undefined' ? window : globalThis);
