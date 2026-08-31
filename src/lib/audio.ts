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

let activeNodes = new Set<AudioScheduledSourceNode>()
let activeTimers = new Set<ReturnType<typeof setTimeout>>()
let isPlayingTrack = false
let alarmInterval: ReturnType<typeof setInterval> | null = null

export function isAudioPlaying(): boolean {
  return isPlayingTrack
}

export function stopAllAudio() {
  isPlayingTrack = false
  if (alarmInterval) {
    clearInterval(alarmInterval)
    alarmInterval = null
  }
  for (const t of activeTimers) {
    clearTimeout(t)
  }
  activeTimers.clear()
  for (const node of activeNodes) {
    try {
      node.stop()
    } catch {}
    try {
      node.disconnect()
    } catch {}
  }
  activeNodes.clear()
}

function registerSource(src: AudioScheduledSourceNode) {
  if (!src) return
  activeNodes.add(src)
  if (typeof src.addEventListener === 'function') {
    src.addEventListener('ended', () => {
      activeNodes.delete(src)
    }, { once: true })
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
  registerSource(osc)
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (opts.endFreq) osc.frequency.exponentialRampToValueAtTime(opts.endFreq, t0 + dur)
  if (opts.vibratoHz) {
    const lfo = a.createOscillator()
    const lg = a.createGain()
    registerSource(lfo)
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
  registerSource(src)
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

export type Instrument =
  | 'dhol'
  | 'pepa'
  | 'flute'
  | 'tokari'
  | 'gagana'
  | 'khol'
  | 'bhor_taal'
  | 'wangala'
  | 'tangmuri'
  | 'singphong'
  | 'dama'
  | 'maryngod'
  | 'pena'
  | 'pung'
  | 'khartal'
  | 'khuang'
  | 'rawchhem'
  | 'darphym'
  | 'log_drum'
  | 'tati'
  | 'petu'
  | 'sarinda'
  | 'kham'
  | 'sumui'
  | 'chongpreng'
  | 'ponung'
  | 'jachin'
  | 'dranyen'
  | 'gyaling'
  | 'damphu'
  | 'tungna'
  | 'tabla'
  | 'harmonium'
  | 'sitar'
  | 'shehnai'
  | 'dholak'
  | 'ektara'
  | 'manjira'
  | 'bell'

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

function pluckString(freq: number, when: number, dur = 1.2, brightness = 2400) {
  tone(freq, 'sawtooth', dur, 0.35, when, { filterHz: brightness, filterType: 'lowpass' })
  tone(freq * 2, 'triangle', dur * 0.6, 0.15, when)
  tone(freq * 3, 'sine', dur * 0.3, 0.08, when)
  noiseBurst(0.04, 3200, 0.2, when)
}

function strikeTabla(when: number, isBayan = false) {
  if (isBayan) {
    tone(95, 'sine', 0.55, 0.8, when, { endFreq: 68 })
    noiseBurst(0.08, 220, 0.4, when)
  } else {
    tone(293.66, 'sine', 0.45, 0.6, when, { vibratoHz: 8, vibratoDepth: 4 })
    tone(587.33, 'triangle', 0.25, 0.25, when)
    noiseBurst(0.05, 1200, 0.35, when)
  }
}

function playReedOrganChord(rootFreq: number, dur: number, when: number) {
  const freqs = [rootFreq, rootFreq * 1.2599, rootFreq * 1.4983] // Major triad
  freqs.forEach((f) => {
    tone(f, 'sawtooth', dur, 0.18, when, { filterHz: 1600, vibratoHz: 4.8, vibratoDepth: f * 0.01 })
    tone(f * 2, 'square', dur * 0.8, 0.06, when, { filterHz: 1800 })
  })
}

/**
 * Plays a full, rich, authentic 3.5 - 4.5 second musical phrase for any instrument.
 * Returns duration in ms.
 */
export function playInstrument(inst: Instrument | string): number {
  unlockAudio()
  switch (inst) {
    case 'dhol': {
      // Traditional festive Bihu Dhol rhythmic beat pattern (~3.6s)
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
    case 'flute':
    case 'sumui': {
      // Sweet lyrical North-East folk pentatonic melody (~4.0s)
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
    case 'wangala':
    case 'dama': {
      // Garo 100-Drums festive cadence pattern (~3.6s)
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
    case 'bell':
    case 'bhor_taal':
    case 'khartal':
    case 'manjira':
    case 'ponung': {
      // Reverent temple / cymbal chimes with harmonic sustain (~4.2s)
      strikeBell(1046.5, 0.0, 3.2)
      strikeBell(1318.5, 0.9, 3.0)
      strikeBell(1568.0, 1.8, 3.8)
      strikeBell(1046.5, 2.4, 4.2)
      return 4200
    }
    case 'pepa':
    case 'tangmuri':
    case 'shehnai':
    case 'gyaling': {
      // Folk reed motif call (~3.8s)
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
    case 'pena':
    case 'petu':
    case 'sarinda': {
      // Manipuri Pena & Sarinda bowed lyrical folk phrase (~3.8s)
      const phrase = [
        { f: 440.0, dur: 0.6, t: 0.0 },
        { f: 523.25, dur: 0.5, t: 0.55 },
        { f: 587.33, dur: 0.8, t: 1.0 },
        { f: 659.25, dur: 0.65, t: 1.75 },
        { f: 587.33, dur: 0.6, t: 2.35 },
        { f: 440.0, dur: 0.95, t: 2.9 },
      ]
      phrase.forEach((p) => {
        tone(p.f, 'sawtooth', p.dur, 0.32, p.t, {
          vibratoHz: 6.0,
          vibratoDepth: p.f * 0.022,
          filterHz: 1650,
          filterQ: 2.4,
          filterType: 'bandpass',
        })
        noiseBurst(p.dur * 0.4, 2800, 0.04, p.t, 'highpass')
      })
      return 3900
    }
    case 'pung':
    case 'khol':
    case 'khuang':
    case 'kham':
    case 'damphu':
    case 'log_drum':
    case 'dholak': {
      // Resonant percussion pattern (~3.6s)
      const beats = [
        { t: 0.0, f: 180, dur: 0.4 },
        { t: 0.4, f: 260, dur: 0.3 },
        { t: 0.75, f: 180, dur: 0.4 },
        { t: 1.2, f: 320, dur: 0.25 },
        { t: 1.6, f: 180, dur: 0.45 },
        { t: 2.1, f: 280, dur: 0.3 },
        { t: 2.5, f: 320, dur: 0.25 },
        { t: 2.85, f: 180, dur: 0.5 },
      ]
      beats.forEach((b) => {
        tone(b.f, 'sine', b.dur, 0.8, b.t, { endFreq: b.f * 0.6 })
        noiseBurst(0.08, b.f * 4, 0.45, b.t)
      })
      return 3600
    }
    case 'tabla': {
      // Classic Dha Dhin Dhin Dha bol pattern (~3.6s)
      const pattern = [
        { t: 0.0, isBayan: true },
        { t: 0.0, isBayan: false },
        { t: 0.45, isBayan: false },
        { t: 0.9, isBayan: true },
        { t: 1.35, isBayan: false },
        { t: 1.8, isBayan: true },
        { t: 1.8, isBayan: false },
        { t: 2.3, isBayan: false },
        { t: 2.75, isBayan: true },
        { t: 2.75, isBayan: false },
      ]
      pattern.forEach((p) => strikeTabla(p.t, p.isBayan))
      return 3600
    }
    case 'tokari':
    case 'tati':
    case 'chongpreng':
    case 'singphong':
    case 'dranyen':
    case 'tungna':
    case 'sitar':
    case 'ektara':
    case 'maryngod': {
      // Plucked melodic folk string pattern (~3.8s)
      const notes = [
        { f: 261.63, t: 0.0 }, // C4
        { f: 329.63, t: 0.45 }, // E4
        { f: 392.0, t: 0.9 }, // G4
        { f: 523.25, t: 1.4 }, // C5
        { f: 440.0, t: 2.0 }, // A4
        { f: 392.0, t: 2.5 }, // G4
        { f: 261.63, t: 3.0 }, // C4
      ]
      notes.forEach((n) => pluckString(n.f, n.t, 1.0, inst === 'sitar' ? 3800 : 2200))
      return 3900
    }
    case 'harmonium':
    case 'rawchhem': {
      // Sustained harmonium reed organ chords (~4.0s)
      playReedOrganChord(261.63, 1.4, 0.0) // C Major
      playReedOrganChord(293.66, 1.2, 1.3) // D minor
      playReedOrganChord(392.0, 1.6, 2.4) // G Major
      return 4200
    }
    case 'darphym': {
      // Tuned gongs (~3.8s)
      strikeBell(392.0, 0.0, 3.0)
      strikeBell(523.25, 0.8, 3.2)
      strikeBell(659.25, 1.7, 3.5)
      return 3800
    }
    case 'gagana':
    case 'jachin': {
      // Bamboo jaw harp rhythmic twang (~3.5s)
      for (let i = 0; i < 8; i++) {
        tone(220 + (i % 3) * 60, 'sawtooth', 0.28, 0.35, i * 0.42, {
          filterHz: 1200 + (i % 2) * 800,
          filterType: 'bandpass',
          filterQ: 3.5,
        })
      }
      return 3500
    }
    default: {
      strikeBell(880, 0.0, 2.5)
      return 3000
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

export function playMelody(pattern: (Instrument | string)[], gapSec = 1.4) {
  pattern.forEach((inst, i) => {
    setTimeout(() => playInstrument(inst), i * gapSec * 1000)
  })
}

export type AmbientSound =
  | 'rain'
  | 'river'
  | 'rooster'
  | 'cuckoo'
  | 'wind'
  | 'cricket'
  | 'kettle'
  | 'conch'
  | 'market'
  | 'stream'
  | 'bell'
  | 'flute'
  | 'dhol'
  | 'pepa'
  | 'wangala'
  | 'tamol_snip'
  | 'thunder'

function sustainedNoise(dur: number, freq: number, peak: number, lfoHz?: number) {
  const a = ac()
  if (!a) return
  const t0 = a.currentTime
  const len = Math.floor(a.sampleRate * dur)
  const buf = a.createBuffer(1, Math.max(len, 1), a.sampleRate)
  const data = buf.getChannelData(0)
  let last = 0
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1
    last = (last + 0.04 * white) / 1.04
    data[i] = last * 3
  }
  const src = a.createBufferSource()
  registerSource(src)
  src.buffer = buf
  const f = a.createBiquadFilter()
  f.type = 'bandpass'
  f.frequency.value = freq
  f.Q.value = 0.9
  const g = a.createGain()
  env(g, t0, peak, 0.25, dur)
  src.connect(f)
  f.connect(g)
  route(g)
  if (lfoHz) {
    const lfo = a.createOscillator()
    const lg = a.createGain()
    registerSource(lfo)
    lfo.frequency.value = lfoHz
    lg.gain.value = peak * 0.5
    lfo.connect(lg)
    lg.connect(g.gain)
    lfo.start(t0)
    lfo.stop(t0 + dur + 0.4)
  }
  src.start(t0)
  src.stop(t0 + dur + 0.2)
}

// Synthesized village & nature ambience for Village Sounds & cognitive games.
// Returns duration in ms.
export function playAmbient(kind: AmbientSound | string): number {
  unlockAudio()
  switch (kind) {
    case 'rain': {
      // Steady monsoon shower — soft hiss with droplet ticks (~3.6s)
      sustainedNoise(3.6, 2600, 0.5)
      for (let i = 0; i < 7; i++) noiseBurst(0.05, 5200, 0.14, i * 0.45 + 0.2, 'highpass')
      return 3800
    }
    case 'river':
    case 'stream': {
      // Flowing river — deeper continuous rush (~3.8s)
      sustainedNoise(3.8, 750, 0.55, 0.7)
      sustainedNoise(3.8, 1800, 0.18)
      return 4000
    }
    case 'rooster': {
      // Cock-a-doodle-doo — three rising calls (~3.2s)
      tone(700, 'sawtooth', 0.35, 0.32, 0.15, { endFreq: 950, filterHz: 1600, filterType: 'lowpass' })
      tone(720, 'sawtooth', 0.35, 0.32, 0.85, { endFreq: 1000, filterHz: 1600, filterType: 'lowpass' })
      tone(680, 'sawtooth', 0.9, 0.34, 1.65, { endFreq: 420, filterHz: 1500, filterType: 'lowpass' })
      return 3200
    }
    case 'cuckoo': {
      // Indian cuckoo — two-note whistle, repeated (~3.4s)
      for (const t of [0.2, 1.4, 2.5]) {
        tone(880, 'sine', 0.28, 0.36, t)
        tone(660, 'sine', 0.34, 0.36, t + 0.32)
      }
      return 3600
    }
    case 'wind': {
      // Evening breeze through bamboo — slow swelling hush (~4s)
      sustainedNoise(4, 500, 0.5, 0.35)
      return 4200
    }
    case 'cricket': {
      // Night crickets — rapid soft chirr bursts (~3.6s)
      for (let b = 0; b < 5; b++) {
        for (let k = 0; k < 4; k++) tone(4300, 'sine', 0.03, 0.16, b * 0.72 + k * 0.075)
      }
      return 3800
    }
    case 'kettle': {
      // Steaming tea kettle whistle and gentle boiling hiss (~3.6s)
      sustainedNoise(3.6, 1200, 0.25)
      tone(1760, 'sine', 2.8, 0.25, 0.6, { endFreq: 1980, vibratoHz: 4, vibratoDepth: 18 })
      return 3600
    }
    case 'conch': {
      // Deep sacred blowing conch blast (~3.8s)
      tone(220, 'sawtooth', 3.2, 0.45, 0.2, {
        endFreq: 245,
        filterHz: 750,
        vibratoHz: 3.5,
        vibratoDepth: 8,
      })
      tone(440, 'sine', 2.8, 0.2, 0.4)
      return 3800
    }
    case 'market': {
      // Distant lively village haat ambience (~3.6s)
      sustainedNoise(3.6, 900, 0.35, 1.2)
      strikeBell(1200, 0.8, 1.5)
      return 3600
    }
    case 'tamol_snip': {
      // Crisp metallic nut-cutter snip (~1.5s)
      for (let i = 0; i < 3; i++) {
        noiseBurst(0.06, 2800, 0.45, i * 0.45)
        tone(440, 'triangle', 0.1, 0.25, i * 0.45)
      }
      return 1800
    }
    case 'thunder': {
      // Distant rolling monsoon thunder (~3.8s)
      sustainedNoise(3.5, 180, 0.75, 0.4)
      noiseBurst(0.8, 120, 0.6, 0.1, 'lowpass')
      return 3800
    }
    default: {
      return playInstrument(kind)
    }
  }
}

export function playControlledInstrument(inst: Instrument | string, onFinish?: () => void): number {
  if (isPlayingTrack) return 0
  isPlayingTrack = true
  const dur = playInstrument(inst)
  const timer = setTimeout(() => {
    isPlayingTrack = false
    activeTimers.delete(timer)
    if (onFinish) onFinish()
  }, dur + 100)
  activeTimers.add(timer)
  return dur
}

export function playControlledAmbient(kind: AmbientSound | string, onFinish?: () => void): number {
  if (isPlayingTrack) return 0
  isPlayingTrack = true
  const dur = playAmbient(kind)
  const timer = setTimeout(() => {
    isPlayingTrack = false
    activeTimers.delete(timer)
    if (onFinish) onFinish()
  }, dur + 100)
  activeTimers.add(timer)
  return dur
}

export function startAlarmSound() {
  unlockAudio()
  stopAllAudio()
  const playPulse = () => {
    // Gentle melodic 4-tone harmonic chime loop for offline alarm
    tone(523.25, 'sine', 0.55, 0.42)
    tone(659.26, 'sine', 0.55, 0.40, 0.2)
    tone(783.99, 'sine', 0.75, 0.45, 0.4)
    tone(1046.5, 'sine', 0.9, 0.35, 0.65)
  }
  playPulse()
  alarmInterval = setInterval(playPulse, 2400)
}

export function stopAlarmSound() {
  if (alarmInterval) {
    clearInterval(alarmInterval)
    alarmInterval = null
  }
  stopAllAudio()
}
