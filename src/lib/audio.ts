let ctx: AudioContext | null = null
let fxInput: GainNode | null = null
let master: GainNode | null = null

function ac(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext) as typeof AudioContext
      ctx = new AC()
    }
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function masterOut(): GainNode | null {
  const a = ac()
  if (!a) return null
  if (!master) {
    master = a.createGain()
    master.gain.value = 2.4
    const comp = a.createDynamicsCompressor()
    comp.threshold.value = -14
    comp.knee.value = 24
    comp.ratio.value = 5
    comp.attack.value = 0.003
    comp.release.value = 0.22
    master.connect(comp)
    comp.connect(a.destination)
  }
  return master
}

function fx(): GainNode | null {
  const a = ac()
  const m = masterOut()
  if (!a || !m) return null
  if (!fxInput) {
    fxInput = a.createGain()
    fxInput.gain.value = 1
    const delay = a.createDelay(1)
    delay.delayTime.value = 0.28
    const feedback = a.createGain()
    feedback.gain.value = 0.2
    const damp = a.createBiquadFilter()
    damp.type = 'lowpass'
    damp.frequency.value = 1800
    const wet = a.createGain()
    wet.gain.value = 0.1
    fxInput.connect(m)
    fxInput.connect(delay)
    delay.connect(damp)
    damp.connect(feedback)
    feedback.connect(delay)
    delay.connect(wet)
    wet.connect(m)
  }
  return fxInput
}

export function unlockAudio() {
  ac()
}

function env(gain: GainNode, t0: number, peak: number, attack: number, decay: number) {
  gain.gain.setValueAtTime(0.0001, t0)
  gain.gain.linearRampToValueAtTime(peak, t0 + attack)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay)
}

function route(node: AudioNode) {
  const out = fx()
  if (out) node.connect(out)
  else if (ctx) {
    const m = masterOut()
    if (m) node.connect(m)
    else node.connect(ctx.destination)
  }
}

function tone(
  freq: number,
  type: OscillatorType,
  dur: number,
  peak = 0.25,
  when = 0,
  opts: { vibratoHz?: number; vibratoDepth?: number; endFreq?: number; filterHz?: number; filterQ?: number; filterType?: BiquadFilterType } = {}
) {
  const a = ac()
  if (!a) return
  const t0 = a.currentTime + when
  const osc = a.createOscillator()
  const g = a.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (opts.endFreq) osc.frequency.exponentialRampToValueAtTime(opts.endFreq, t0 + dur)
  if (opts.vibratoHz) {
    const lfo = a.createOscillator()
    const lg = a.createGain()
    lfo.frequency.value = opts.vibratoHz
    lg.gain.value = opts.vibratoDepth ?? freq * 0.02
    lfo.connect(lg)
    lg.connect(osc.frequency)
    lfo.start(t0)
    lfo.stop(t0 + dur + 0.5)
  }
  let head: AudioNode = osc
  if (opts.filterHz) {
    const f = a.createBiquadFilter()
    f.type = opts.filterType ?? 'lowpass'
    f.frequency.value = opts.filterHz
    if (opts.filterQ) f.Q.value = opts.filterQ
    osc.connect(f)
    head = f
  }
  env(g, t0, peak, Math.min(0.04, dur * 0.15), dur)
  head.connect(g)
  route(g)
  osc.start(t0)
  osc.stop(t0 + dur + 0.6)
}

function noiseBurst(dur: number, filterFreq: number, peak = 0.5, when = 0, type: BiquadFilterType = 'bandpass') {
  const a = ac()
  if (!a) return
  const t0 = a.currentTime + when
  const len = Math.floor(a.sampleRate * dur)
  const buf = a.createBuffer(1, Math.max(len, 1), a.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.4)
  const src = a.createBufferSource()
  src.buffer = buf
  const f = a.createBiquadFilter()
  f.type = type
  f.frequency.value = filterFreq
  f.Q.value = 1.2
  const g = a.createGain()
  env(g, t0, peak, 0.005, dur)
  src.connect(f)
  f.connect(g)
  route(g)
  src.start(t0)
  src.stop(t0 + dur + 0.1)
}

export type Instrument = 'dhol' | 'flute' | 'wangala' | 'bell' | 'pepa'

// Single strike building blocks
function strikeDhol(when: number, isAccent = false) {
  const vol = isAccent ? 1.0 : 0.7
  tone(115, 'sine', 0.65, 0.95 * vol, when, { endFreq: 48 })
  tone(220, 'sine', 0.35, 0.4 * vol, when)
  noiseBurst(0.18, 260, 0.55 * vol, when)
  noiseBurst(0.4, 850, 0.22 * vol, when + 0.01, 'lowpass')
}

function strikeWangala(when: number, isHigh = false) {
  const baseFreq = isHigh ? 210 : 155
  const endFreq = isHigh ? 120 : 85
  tone(baseFreq, 'sine', 0.45, 0.85, when, { endFreq })
  tone(baseFreq * 2, 'sine', 0.2, 0.3, when)
  noiseBurst(0.12, isHigh ? 780 : 540, 0.48, when)
}

function noteFlute(freq: number, dur: number, when: number) {
  tone(freq, 'triangle', dur, 0.35, when, { vibratoHz: 5.5, vibratoDepth: freq * 0.018 })
  tone(freq, 'sine', dur, 0.18, when + 0.01, { vibratoHz: 5.5, vibratoDepth: freq * 0.018 })
  tone(freq * 2, 'sine', dur * 0.7, 0.06, when, { vibratoHz: 5.5, vibratoDepth: freq * 0.012 })
  noiseBurst(Math.min(0.25, dur * 0.3), 3400, 0.035, when, 'highpass')
}

function strikeBell(freq: number, when: number, decay = 2.5) {
  tone(freq, 'sine', decay, 0.32, when)
  tone(freq * 1.5, 'sine', decay * 0.8, 0.18, when + 0.005)
  tone(freq * 2, 'sine', decay * 0.6, 0.12, when + 0.01)
  tone(freq * 2.76, 'sine', decay * 0.4, 0.06, when + 0.015)
  tone(freq * 0.5, 'sine', decay, 0.08, when)
}

function notePepa(freq: number, dur: number, when: number) {
  tone(freq, 'sawtooth', dur, 0.28, when, {
    vibratoHz: 6.2,
    vibratoDepth: freq * 0.025,
    filterHz: 1450,
    filterQ: 2.2,
    filterType: 'bandpass',
  })
  tone(freq, 'square', dur, 0.12, when, {
    vibratoHz: 6.2,
    vibratoDepth: freq * 0.02,
    filterHz: 950,
  })
}

/**
 * Plays a full, rich, authentic 3.5 - 4.2 second musical phrase for the instrument
 * Returns duration in ms
 */
export function playInstrument(inst: Instrument): number {
  unlockAudio()
  switch (inst) {
    case 'dhol': {
      // Traditional festive Bihu Dhol rhythmic beat pattern (~3.6s)
      // Dha... Dhin... Dha-Dha... Dhin... Dha-Dhin-Dha!
      const pattern = [
        { t: 0.0, accent: true },
        { t: 0.45, accent: false },
        { t: 0.9, accent: false },
        { t: 1.2, accent: true },
        { t: 1.65, accent: false },
        { t: 2.1, accent: true },
        { t: 2.45, accent: false },
        { t: 2.75, accent: false },
        { t: 3.1, accent: true },
      ]
      pattern.forEach((p) => strikeDhol(p.t, p.accent))
      return 3600
    }
    case 'flute': {
      // Sweet lyrical North-East folk pentatonic melody (~4.0s)
      // Notes: E5 (659Hz) -> G5 (784Hz) -> A5 (880Hz) -> B5 (988Hz) -> A5 (880Hz) -> G5 (784Hz) -> E5 (659Hz)
      const melody = [
        { f: 659.25, dur: 0.55, t: 0.0 },
        { f: 783.99, dur: 0.5, t: 0.52 },
        { f: 880.0, dur: 0.7, t: 1.0 },
        { f: 987.77, dur: 0.6, t: 1.68 },
        { f: 880.0, dur: 0.5, t: 2.25 },
        { f: 783.99, dur: 0.55, t: 2.72 },
        { f: 659.25, dur: 0.9, t: 3.25 },
      ]
      melody.forEach((m) => noteFlute(m.f, m.dur, m.t))
      return 4200
    }
    case 'wangala': {
      // Garo 100-Drums festive cadence pattern (~3.6s)
      // Low... High-Low... Low... High-Low... Dual Finale
      const beats = [
        { t: 0.0, high: false },
        { t: 0.45, high: true },
        { t: 0.75, high: false },
        { t: 1.25, high: false },
        { t: 1.7, high: true },
        { t: 2.0, high: false },
        { t: 2.5, high: true },
        { t: 2.8, high: true },
        { t: 3.15, high: false },
      ]
      beats.forEach((b) => strikeWangala(b.t, b.high))
      return 3700
    }
    case 'bell': {
      // Reverent temple / church bell chimes with harmonic sustain (~4.2s)
      strikeBell(1046.5, 0.0, 3.2)
      strikeBell(1318.5, 0.9, 3.0)
      strikeBell(1568.0, 1.8, 3.8)
      strikeBell(1046.5, 2.4, 4.2)
      return 4200
    }
    case 'pepa': {
      // Assamese Buffalo Horn Pepa folk motif call (~3.8s)
      const pepaNotes = [
        { f: 392.0, dur: 0.5, t: 0.0 },
        { f: 493.88, dur: 0.45, t: 0.48 },
        { f: 587.33, dur: 0.75, t: 0.9 },
        { f: 659.25, dur: 0.55, t: 1.62 },
        { f: 587.33, dur: 0.6, t: 2.15 },
        { f: 493.88, dur: 0.45, t: 2.72 },
        { f: 392.0, dur: 0.85, t: 3.14 },
      ]
      pepaNotes.forEach((n) => notePepa(n.f, n.dur, n.t))
      return 4000
    }
  }
}

export function playChime() {
  unlockAudio()
  tone(523.25, 'sine', 0.55, 0.42)
  tone(659.26, 'sine', 0.55, 0.38, 0.1)
  tone(783.99, 'sine', 0.8, 0.46, 0.2)
}

export function playSoftCue() {
  unlockAudio()
  tone(660, 'sine', 0.28, 0.3)
  tone(880, 'sine', 0.34, 0.26, 0.15)
}

export function playTap() {
  unlockAudio()
  noiseBurst(0.06, 950, 0.36)
}

export function playMelody(pattern: Instrument[], gapSec = 1.4) {
  pattern.forEach((inst, i) => {
    setTimeout(() => playInstrument(inst), i * gapSec * 1000)
  })
}
