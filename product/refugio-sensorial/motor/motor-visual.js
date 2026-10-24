/*
 * Refúgio Sensorial · Motor visual (Canvas 2D)
 *
 * 1) RefugioForma: forma orgânica de ~1.400 pontos de luz que ondula, gira e respira.
 * 2) RefugioNebulosa: céu de estrelas em espiral, uma por dia, com névoa de cor por semana.
 *
 * No app, reimplementar com React Native Skia (Canvas + Points/Circle) e Reanimated
 * (useFrameCallback). A matemática abaixo é a referência. Ver 02-SDD.md, seção "Renderização".
 */
(function (root) {
  function fibSphere(N) {
    var pts = [];
    for (var i = 0; i < N; i++) { var y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = i * 2.399963; pts.push([Math.cos(th) * r, y, Math.sin(th) * r]); }
    return pts;
  }
  var ease = function (x) { return 0.5 - 0.5 * Math.cos(Math.PI * x); };
  var reduceMotion = function () { return !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches); };

  /**
   * @param {HTMLCanvasElement} canvas  tamanho CSS definido em style.width/height (quadrado)
   * @param {function(): object} getCfg retorna a configuração atual a cada quadro:
   *   { amp, speed, rot, col:[r,g,b], R (fração do lado), breath:{P, inFrac, lo, hi} }
   *   amp/speed/rot/col mudam com suavidade (interpolação por quadro).
   */
  function RefugioForma(canvas, getCfg) {
    var S = parseInt(canvas.style.width, 10) || canvas.clientWidth || 240, dpr = root.devicePixelRatio || 1;
    canvas.width = S * dpr; canvas.height = S * dpr;
    var ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var N = S > 200 ? 1400 : 900, pts = fibSphere(N), reduce = reduceMotion();
    var c0 = getCfg() || {}, cur = { amp: c0.amp || 1, speed: c0.speed || 1, rot: c0.rot || 0.2, col: (c0.col || [252, 252, 252]).slice() };
    var ph = 0, rotPh = 0, t0 = performance.now(), last = t0, raf = null;
    function frame(now) {
      var cfg = getCfg() || {}, dt = Math.min(0.05, (now - last) / 1000); last = now;
      var k = Math.min(1, dt * 0.8);
      cur.amp += ((cfg.amp || 1) - cur.amp) * k; cur.speed += ((cfg.speed || 1) - cur.speed) * k; cur.rot += ((cfg.rot || 0.2) - cur.rot) * k;
      var tc = cfg.col || [252, 252, 252]; for (var c = 0; c < 3; c++) cur.col[c] += (tc[c] - cur.col[c]) * k;
      ph += dt * cur.speed; rotPh += dt * cur.rot;
      var br = cfg.breath || { P: 6, inFrac: 0.5, lo: 0.95, hi: 1.05 };
      var u = (((now - t0) / 1000) % br.P) / br.P;
      var sv = u < br.inFrac ? ease(u / br.inFrac) : 1 - ease((u - br.inFrac) / (1 - br.inFrac));
      var R = (cfg.R || 0.33) * S * (br.lo + (br.hi - br.lo) * sv);
      ctx.clearRect(0, 0, S, S);
      var ay = rotPh, ax = 0.4 + 0.18 * Math.sin(rotPh * 0.8), cy = Math.cos(ay), sy = Math.sin(ay), cx = Math.cos(ax), sx = Math.sin(ax);
      var A = cur.amp, rgb = Math.round(cur.col[0]) + ',' + Math.round(cur.col[1]) + ',' + Math.round(cur.col[2]);
      for (var n = 0; n < N; n++) {
        var p = pts[n], x = p[0], y = p[1], z = p[2];
        // deformação orgânica: soma de 3 ondas sobre a esfera
        var d = 1 + A * (0.14 * Math.sin(2.1 * x + 1.7 * y + ph * 0.8) + 0.09 * Math.sin(3.3 * y - 2.2 * z + ph * 1.2) + 0.06 * Math.sin(4.1 * z + 2.7 * x - ph * 0.6));
        var X = x * d, Y = y * d, Z = z * d;
        var x1 = X * cy + Z * sy, z1 = -X * sy + Z * cy, y1 = Y * cx - z1 * sx, z2 = Y * sx + z1 * cx;
        var f = 3 / (3 - z2); // perspectiva
        var depth = Math.max(0, Math.min(1, (z2 / d + 1) / 2)), rim = 1 - Math.abs(z2 / d);
        var al = Math.min(1, 0.08 + 0.55 * depth + 0.4 * rim * depth);
        ctx.fillStyle = 'rgba(' + rgb + ',' + al.toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(S / 2 + x1 * R * f, S / 2 + y1 * R * f, (0.5 + 0.9 * depth) * (S / 280 + 0.25), 0, 6.2832); ctx.fill();
      }
      if (!reduce) raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    this.stop = function () { if (raf) cancelAnimationFrame(raf); raf = null; };
  }

  /* Configurações de referência (ver conteudo/estados.json e conteudo/respiracao.json) */
  RefugioForma.MOTION = { tempestade: { amp: 1.6, speed: 1.9, rot: 0.42 }, nevoa: { amp: 0.8, speed: 0.55, rot: 0.14 }, clareira: { amp: 0.45, speed: 0.35, rot: 0.11 } };
  RefugioForma.BREATH = {
    tempestade: { P: 11, inFrac: 4 / 11, lo: 0.62, hi: 1.15 },
    nevoa: { P: 10, inFrac: 0.5, lo: 0.62, hi: 1.15 },
    clareira: { P: 8, inFrac: 0.5, lo: 0.62, hi: 1.15 },
    ambiente: { P: 6, inFrac: 0.5, lo: 0.96, hi: 1.04 }
  };

  /* ---------------- Nebulosa ---------------- */
  var STARCOL = { tempestade: [96, 150, 214], nevoa: [178, 140, 228], clareira: [246, 206, 96] };
  function seeded(n) { var x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); }
  function mixColor(mix) { var c = [0, 0, 0], t = 0; ['tempestade', 'nevoa', 'clareira'].forEach(function (k) { var w = mix[k] || 0; t += w; for (var i = 0; i < 3; i++) c[i] += STARCOL[k][i] * w; }); return t ? c.map(function (v) { return Math.round(v / t); }) : [200, 200, 220]; }

  /**
   * @param {HTMLCanvasElement} canvas (style.width/height definidos)
   * @param {function(): object} getState -> { days: [dayData|null x31], today: 24, selected: n|null, weeks: [[1,3],[4,10],...] }
   *   dayData = { mix:{tempestade,nevoa,clareira (frações)}, checkins: n, today?: bool }
   */
  function RefugioNebulosa(canvas, getState) {
    var W = parseInt(canvas.style.width, 10) || 342, H = parseInt(canvas.style.height, 10) || 330, dpr = root.devicePixelRatio || 1;
    canvas.width = W * dpr; canvas.height = H * dpr;
    var ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var reduce = reduceMotion(), t0 = performance.now(), raf = null;
    var dust = []; for (var i = 0; i < 170; i++) dust.push({ x: seeded(i + 1000) * W, y: seeded(i + 2000) * H, a: 0.05 + seeded(i + 3000) * 0.2, p: seeded(i + 4000) * 6.28 });
    function pos(d) { var ang = d * 0.58 + 0.4, r = 14 + d * 4.5; return { x: W / 2 + Math.cos(ang) * r + (seeded(d + 200) - 0.5) * 10, y: H / 2 + Math.sin(ang) * r * 0.9 + (seeded(d + 300) - 0.5) * 10 }; }
    this.pos = pos;
    function frame(now) {
      var st = getState(), t = reduce ? 0 : (now - t0) / 1000, age = reduce ? 99 : t, last = st.today || 31;
      ctx.globalCompositeOperation = 'source-over'; ctx.clearRect(0, 0, W, H);
      dust.forEach(function (p) { ctx.fillStyle = 'rgba(220,220,240,' + (p.a * (0.6 + 0.4 * Math.sin(t * 0.8 + p.p))).toFixed(3) + ')'; ctx.fillRect(p.x, p.y, 1, 1); });
      ctx.globalCompositeOperation = 'lighter';
      (st.weeks || []).forEach(function (wk) {
        var n = 0, cx = 0, cy = 0, mix = { tempestade: 0, nevoa: 0, clareira: 0 };
        for (var d = wk[0]; d <= wk[1]; d++) { var dd = st.days[d - 1]; if (!dd) continue; var p = pos(d); n++; cx += p.x; cy += p.y; for (var k in mix) mix[k] += dd.mix[k] || 0; }
        if (!n) return; cx /= n; cy /= n; var c = mixColor(mix), g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 95);
        g.addColorStop(0, 'rgba(' + c.join(',') + ',0.26)'); g.addColorStop(1, 'rgba(' + c.join(',') + ',0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 95, 0, 6.2832); ctx.fill();
      });
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = 'rgba(220,220,240,0.08)'; ctx.lineWidth = 1; ctx.beginPath();
      for (var d1 = 1; d1 <= last; d1++) { var p1 = pos(d1); if (d1 === 1) ctx.moveTo(p1.x, p1.y); else ctx.lineTo(p1.x, p1.y); }
      ctx.stroke();
      for (var d2 = 1; d2 <= last; d2++) {
        var dd2 = st.days[d2 - 1], p2 = pos(d2), appear = Math.max(0, Math.min(1, (age - d2 * 0.04) / 0.5));
        if (!appear) continue;
        if (!dd2) { ctx.fillStyle = 'rgba(200,200,225,' + (0.35 * appear).toFixed(3) + ')'; ctx.beginPath(); ctx.arc(p2.x, p2.y, 1.3, 0, 6.2832); ctx.fill(); continue; }
        var col = mixColor(dd2.mix), size = (2.2 + dd2.checkins * 1.1) * appear;
        if (dd2.today) size *= 1 + 0.22 * Math.sin(t * 2.2);
        ctx.globalCompositeOperation = 'lighter';
        var gl = ctx.createRadialGradient(p2.x, p2.y, 0, p2.x, p2.y, size * 5);
        gl.addColorStop(0, 'rgba(' + col.join(',') + ',0.55)'); gl.addColorStop(1, 'rgba(' + col.join(',') + ',0)');
        ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(p2.x, p2.y, size * 5, 0, 6.2832); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        var core = col.map(function (v) { return Math.round(v + (255 - v) * 0.45); });
        ctx.fillStyle = 'rgb(' + core.join(',') + ')'; ctx.beginPath(); ctx.arc(p2.x, p2.y, size, 0, 6.2832); ctx.fill();
        if (st.selected === d2) { ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(p2.x, p2.y, size + 7, 0, 6.2832); ctx.stroke(); }
        if (dd2.today) { ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.font = '11px Roboto, Arial, sans-serif'; ctx.fillText('hoje', p2.x + size + 8, p2.y + 4); }
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    /** Dia mais próximo de um toque (coordenadas do canvas em px CSS), raio 26 px. */
    this.hitTest = function (x, y, lastDay) { var best = null, bd = 26; for (var d = 1; d <= (lastDay || 31); d++) { var p = pos(d), dist = Math.hypot(p.x - x, p.y - y); if (dist < bd) { bd = dist; best = d; } } return best; };
    this.stop = function () { if (raf) cancelAnimationFrame(raf); raf = null; };
  }
  RefugioNebulosa.STARCOL = STARCOL;

  root.RefugioForma = RefugioForma;
  root.RefugioNebulosa = RefugioNebulosa;
})(typeof window !== 'undefined' ? window : globalThis);
