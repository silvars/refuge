/*
 * Refúgio Sensorial · Motor de clima
 * Funções puras, sem dependências. Portáveis para TypeScript/React Native.
 * Usado pelo protótipo e descrito em 02-SDD.md (seção "Motor de clima").
 */
(function (root) {
  var KEYS = ['tempestade', 'nevoa', 'clareira'];

  /** Peso do clima anterior somado às respostas durante o check-in (deixa a cor partir de onde estava). */
  var PRIOR_WEIGHT = 1.5;
  /** Horas sem check-in até a cor esmaecer e o app sugerir novo check-in. */
  var STALE_HOURS = 12;
  /** Check-ins seguidos em Tempestade/Névoa até sugerir o Porto Seguro. */
  var STREAK_SUGGEST = 3;

  function zero() { return { tempestade: 0, nevoa: 0, clareira: 0 }; }

  /**
   * Soma os pesos das opções escolhidas.
   * @param {Array} questions  perguntas (conteudo/perguntas.json -> perguntas)
   * @param {Array<number|null>} answers  índice da opção escolhida em cada pergunta (índice ORIGINAL, não o embaralhado)
   * @param {string|null} priorMood  clima anterior (ou null no primeiro check-in)
   */
  function totals(questions, answers, priorMood) {
    var t = zero();
    if (priorMood) t[priorMood] += PRIOR_WEIGHT;
    answers.forEach(function (a, i) {
      if (a === undefined || a === null) return;
      var w = questions[i].opcoes[a].pesos;
      KEYS.forEach(function (k) { t[k] += w[k] || 0; });
    });
    return t;
  }

  /** Normaliza para frações que somam 1 (ou null se tudo zero). */
  function normalize(w) {
    var s = w.tempestade + w.nevoa + w.clareira;
    if (s <= 0) return null;
    return { tempestade: w.tempestade / s, nevoa: w.nevoa / s, clareira: w.clareira / s };
  }

  /**
   * Opacidades das 3 camadas de degradê empilhadas (tempestade embaixo, névoa no meio, clareira em cima)
   * para que a composição alfa resulte exatamente na média ponderada.
   * Camada base (tempestade) sempre opaca quando há clima; neutro fica por baixo de tudo.
   */
  function layerOpacities(w) {
    var n = normalize(w);
    if (!n) return { neutro: 1, tempestade: 0, nevoa: 0, clareira: 0, wc: 0 };
    var rest = 1 - n.clareira;
    return { neutro: 1, tempestade: 1, nevoa: rest > 0.001 ? Math.min(1, n.nevoa / rest) : 0, clareira: n.clareira, wc: n.clareira };
  }

  /** Texto escuro quando a Clareira passa de 55% da mistura (fundo claro). */
  function isLight(w, stale) { var n = normalize(w); return !!n && n.clareira >= 0.55 && !stale; }

  /**
   * Fecha o check-in: clima predominante + mistura em %.
   * Desempate: vence o estado com maior peso na resposta mais recente entre os empatados.
   */
  function finish(questions, answers) {
    var c = totals(questions, answers, null);
    var max = Math.max(c.tempestade, c.nevoa, c.clareira), mood = 'clareira';
    for (var i = answers.length - 1; i >= 0; i--) {
      var w = questions[i].opcoes[answers[i]].pesos, top = null, best = -1;
      KEYS.forEach(function (k) { if ((w[k] || 0) > best && Math.abs(c[k] - max) < 1e-6) { best = w[k] || 0; top = k; } });
      if (top && best > 0) { mood = top; break; }
    }
    var sum = c.tempestade + c.nevoa + c.clareira, mix = {};
    KEYS.forEach(function (k) { mix[k] = Math.round(100 * c[k] / sum); });
    return { mood: mood, mix: mix };
  }

  /** Estado predominante numa mistura parcial (usado para escolher a pausa de respiração). */
  function dominant(w) { var top = null, best = -1; KEYS.forEach(function (k) { if (w[k] > best) { best = w[k]; top = k; } }); return best > 0 ? top : null; }

  function nextStreak(prevStreak, mood) { return mood === 'clareira' ? 0 : prevStreak + 1; }
  function shouldSuggestPorto(streak) { return streak >= STREAK_SUGGEST; }
  function isStale(lastCheckinAt, now) { return !!lastCheckinAt && (now - lastCheckinAt) > STALE_HOURS * 3600 * 1000; }

  /** Embaralha os índices das opções de cada pergunta (uma vez por check-in). */
  function shuffleOrders(questions, rnd) {
    rnd = rnd || Math.random;
    return questions.map(function (q) {
      var o = q.opcoes.map(function (_, i) { return i; });
      for (var i = o.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = o[i]; o[i] = o[j]; o[j] = t; }
      return o;
    });
  }

  /** Mistura cores RGB pelos pesos (estrelas da Nebulosa). */
  function mixColor(mix, palette) {
    var c = [0, 0, 0], t = 0;
    KEYS.forEach(function (k) { var w = mix[k] || 0; t += w; for (var i = 0; i < 3; i++) c[i] += palette[k][i] * w; });
    return t ? c.map(function (v) { return Math.round(v / t); }) : [200, 200, 220];
  }

  root.RefugioClima = {
    KEYS: KEYS, PRIOR_WEIGHT: PRIOR_WEIGHT, STALE_HOURS: STALE_HOURS, STREAK_SUGGEST: STREAK_SUGGEST,
    totals: totals, normalize: normalize, layerOpacities: layerOpacities, isLight: isLight, finish: finish,
    dominant: dominant, nextStreak: nextStreak, shouldSuggestPorto: shouldSuggestPorto, isStale: isStale,
    shuffleOrders: shuffleOrders, mixColor: mixColor
  };
})(typeof window !== 'undefined' ? window : globalThis);
