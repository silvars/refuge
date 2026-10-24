import { AudioContext, type AudioBuffer, type AudioParam, type GainNode } from 'react-native-audio-api';

import type { Pesos } from '@/domain/tipos';

// Porta de motor/motor-audio.js (RefugioAudio) para react-native-audio-api.
//
// Gap confirmado na API nativa (checado em node_modules, não existe ChannelMergerNode/
// createChannelMerger): o binaural de Tempestade não usa merge de canais. Em vez disso,
// dois osciladores (200 Hz / 204 Hz) cada um passando por seu próprio StereoPannerNode
// (pan -1 / +1) somam no mesmo barramento — mesmo efeito perceptivo (ouvido esquerdo
// ouve 200 Hz, direito ouve 204 Hz), sem precisar de merge de canal. Ver 02-sdd.md,
// seção 8.1, que já previa essa substituição.

const CHORDS: readonly (readonly [number, number, number, number])[] = [
  [130.81, 196.0, 261.63, 329.63],
  [110.0, 164.81, 220.0, 261.63],
  [87.31, 174.61, 220.0, 261.63],
  [98.0, 146.83, 196.0, 246.94],
]; // C, Am, F, G
const PATTERN = [0, 1, 2, 3, 2, 1] as const;
const NOTE_INTERVAL_S = 0.95;
const LAYER_GAIN: Pesos = { tempestade: 0.9, nevoa: 1, clareira: 1 };

interface Camadas {
  tempestade: GainNode;
  nevoa: GainNode;
  clareira: GainNode;
  teste: GainNode;
}

interface Alvo extends Pesos {
  teste: number;
}

export class MotorAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private camadas: Camadas | null = null;
  private masterAlvo = 0.85;
  private agendadorId: ReturnType<typeof setInterval> | null = null;
  private plucks = new Map<number, AudioBuffer>();

  private alvo: Alvo = { tempestade: 0, nevoa: 0.35, clareira: 0.65, teste: 0 };

  /** Chamar dentro de um toque do usuário (exigência das plataformas para liberar áudio). */
  iniciar(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const ctx = new AudioContext();
    this.ctx = ctx;
    const sr = ctx.sampleRate;

    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    this.master = master;

    const criarCamada = (): GainNode => {
      const g = ctx.createGain();
      g.gain.value = 0;
      g.connect(master);
      return g;
    };
    const camadas: Camadas = {
      tempestade: criarCamada(),
      nevoa: criarCamada(),
      clareira: criarCamada(),
      teste: criarCamada(),
    };
    this.camadas = camadas;

    // Ruído rosa (Paul Kellet), 4 s em loop.
    const duracao = sr * 4;
    const buffer = ctx.createBuffer(1, duracao, sr);
    const dados = buffer.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    let b4 = 0;
    let b5 = 0;
    let b6 = 0;
    for (let i = 0; i < duracao; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.016898;
      dados[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
    const criarRuido = () => {
      const fonte = ctx.createBufferSource();
      fonte.buffer = buffer;
      fonte.loop = true;
      fonte.start(0, Math.random() * 3);
      return fonte;
    };
    const lfo = (freq: number, profundidade: number, alvoParam: AudioParam) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.frequency.value = freq;
      g.gain.value = profundidade;
      osc.connect(g);
      g.connect(alvoParam);
      osc.start();
    };

    // TEMPESTADE: mar (ruído rosa filtrado, ondulando) + binaural 4 Hz (ver nota no topo).
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 650;
    const waves = ctx.createGain();
    waves.gain.value = 0.55;
    criarRuido().connect(lp);
    lp.connect(waves);
    waves.connect(camadas.tempestade);
    lfo(0.085, 0.45, waves.gain);
    lfo(0.085, 380, lp.frequency);

    const oscL = ctx.createOscillator();
    const oscR = ctx.createOscillator();
    const panL = ctx.createStereoPanner();
    const panR = ctx.createStereoPanner();
    const binauralGain = ctx.createGain();
    oscL.frequency.value = 200;
    oscR.frequency.value = 204;
    panL.pan.value = -1;
    panR.pan.value = 1;
    binauralGain.gain.value = 0.045;
    oscL.connect(panL);
    panL.connect(binauralGain);
    oscR.connect(panR);
    panR.connect(binauralGain);
    binauralGain.connect(camadas.tempestade);
    oscL.start();
    oscR.start();

    // NÉVOA: vento (ruído em passa-banda móvel) + violão (Karplus-Strong).
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 520;
    bp.Q.value = 0.8;
    const vento = ctx.createGain();
    vento.gain.value = 0.28;
    criarRuido().connect(bp);
    bp.connect(vento);
    vento.connect(camadas.nevoa);
    lfo(0.05, 260, bp.frequency);
    lfo(0.07, 0.12, vento.gain);

    // CLAREIRA: folhas (ruído agudo) + pad de 4 senoides (F maior) + pássaros.
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2800;
    const folhas = ctx.createGain();
    folhas.gain.value = 0.05;
    criarRuido().connect(hp);
    hp.connect(folhas);
    folhas.connect(camadas.clareira);
    lfo(0.11, 0.03, folhas.gain);

    const pad = ctx.createGain();
    pad.gain.value = 0.05;
    pad.connect(camadas.clareira);
    ([174.61, 220, 261.63, 349.23] as const).forEach((freq, k) => {
      const osc = ctx.createOscillator();
      osc.frequency.value = freq;
      osc.detune.value = (k - 1.5) * 4;
      osc.connect(pad);
      osc.start();
      lfo(0.05 + k * 0.013, 5, osc.detune);
    });
    lfo(0.04, 0.02, pad.gain);

    const pluckBuffer = (freq: number): AudioBuffer => {
      const existente = this.plucks.get(freq);
      if (existente) return existente;
      const n = Math.round(sr / freq);
      const dur = Math.floor(sr * 3);
      const buf = ctx.createBuffer(1, dur, sr);
      const out = buf.getChannelData(0);
      const anel = new Float32Array(n);
      for (let i = 0; i < n; i++) anel[i] = Math.random() * 2 - 1;
      for (let j = 0; j < dur; j++) {
        const a = j % n;
        const prox = (a + 1) % n;
        out[j] = anel[a];
        anel[a] = 0.5 * (anel[a] + anel[prox]) * 0.9965;
      }
      this.plucks.set(freq, buf);
      return buf;
    };
    const tocar = (buf: AudioBuffer, when: number, vol: number, pan: number, destino: GainNode) => {
      const fonte = ctx.createBufferSource();
      const g = ctx.createGain();
      const p = ctx.createStereoPanner();
      fonte.buffer = buf;
      g.gain.value = vol;
      p.pan.value = pan;
      fonte.connect(g);
      g.connect(p);
      p.connect(destino);
      fonte.start(when);
    };
    const chilrear = (when: number, pan: number) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      const p = ctx.createStereoPanner();
      const f0 = 2600 + Math.random() * 1400;
      osc.frequency.setValueAtTime(f0, when);
      osc.frequency.exponentialRampToValueAtTime(f0 * 1.45, when + 0.05);
      osc.frequency.exponentialRampToValueAtTime(f0 * 0.95, when + 0.11);
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(0.045, when + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0005, when + 0.13);
      p.pan.value = pan;
      osc.connect(g);
      g.connect(p);
      p.connect(camadas.clareira);
      osc.start(when);
      osc.stop(when + 0.15);
    };
    const tocarPing = (when: number, pan: number) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      const p = ctx.createStereoPanner();
      osc.frequency.value = 523.25;
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(0.18, when + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0005, when + 0.6);
      p.pan.value = pan;
      osc.connect(g);
      g.connect(p);
      p.connect(camadas.teste);
      osc.start(when);
      osc.stop(when + 0.65);
    };

    let proximaNota = 0;
    let passo = 0;
    let proximoPassaro = 0;
    let proximoPing = 0;
    let ladoPing = -1;
    this.agendadorId = setInterval(() => {
      const agora = ctx.currentTime;
      const t = this.alvo;
      if (t.nevoa > 0.03 && agora >= proximaNota - 0.15) {
        const acorde = CHORDS[Math.floor(passo / PATTERN.length) % CHORDS.length];
        const idx = PATTERN[passo % PATTERN.length];
        tocar(pluckBuffer(acorde[idx]), Math.max(agora, proximaNota), 0.32, (idx - 1.5) * 0.25, camadas.nevoa);
        proximaNota = Math.max(agora, proximaNota) + NOTE_INTERVAL_S;
        passo++;
      }
      if (t.clareira > 0.03 && agora >= proximoPassaro) {
        const n = 2 + Math.floor(Math.random() * 3);
        const pan = Math.random() * 1.6 - 0.8;
        for (let k = 0; k < n; k++) chilrear(agora + 0.05 + k * (0.13 + Math.random() * 0.06), pan);
        proximoPassaro = agora + 2.5 + Math.random() * 4;
      }
      if (t.teste > 0.5 && agora >= proximoPing) {
        tocarPing(agora + 0.05, ladoPing);
        ladoPing *= -1;
        proximoPing = agora + 1.2;
      }
    }, 120);

    this.aplicar();
  }

  /** Mistura do clima (frações ou pesos brutos). Tudo zero = base neutra (violão + pássaros). */
  definirMistura(pesos: Partial<Pesos> | null): void {
    const w = pesos ?? {};
    const soma = (w.tempestade ?? 0) + (w.nevoa ?? 0) + (w.clareira ?? 0);
    const m: Pesos =
      soma > 0
        ? { tempestade: (w.tempestade ?? 0) / soma, nevoa: (w.nevoa ?? 0) / soma, clareira: (w.clareira ?? 0) / soma }
        : { tempestade: 0, nevoa: 0.35, clareira: 0.65 };
    this.alvo = { ...this.alvo, ...m };
    this.aplicar();
  }

  definirTeste(ligado: boolean): void {
    this.alvo = { ...this.alvo, teste: ligado ? 1 : 0 };
    this.aplicar();
  }

  definirVolumeGeral(v: number): void {
    this.masterAlvo = v;
    this.aplicar();
  }

  pausar(): void {
    this.ctx?.suspend();
  }

  retomar(): void {
    this.ctx?.resume();
  }

  descartar(): void {
    if (this.agendadorId !== null) clearInterval(this.agendadorId);
    this.agendadorId = null;
    this.ctx?.close().catch(() => {});
    this.ctx = null;
    this.camadas = null;
    this.master = null;
    this.plucks.clear();
  }

  private aplicar(): void {
    if (!this.ctx || !this.master || !this.camadas) return;
    const agora = this.ctx.currentTime;
    const t = this.alvo;
    const testando = t.teste > 0.5;
    this.master.gain.setTargetAtTime(this.masterAlvo, agora, 0.8);
    (['tempestade', 'nevoa', 'clareira'] as const).forEach((k) => {
      this.camadas![k].gain.setTargetAtTime(testando ? 0 : t[k] * LAYER_GAIN[k], agora, 1.2);
    });
    this.camadas.teste.gain.setTargetAtTime(t.teste, agora, 0.2);
  }
}

/** Regras de volume por tela usadas no protótipo (ver especificação, seção 7.2). */
export function volumeParaTela(tela: string, somLigado: boolean, esmaecido: boolean): number {
  if (!somLigado) return 0;
  if (tela === 'ajuda') return 0.12;
  if (['bloqueado', 'seletor', 'whatsapp'].includes(tela)) return 0.25;
  if (tela === 'boas-vindas' || tela === 'conteudo') return 0;
  let m = 0.85;
  if (esmaecido && !['checkin', 'pausa', 'etiquetas', 'resultado'].includes(tela)) m *= 0.5;
  return m;
}
