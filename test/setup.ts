import '@testing-library/jest-dom'
import 'fake-indexeddb/auto'

if (typeof window !== 'undefined') {
  // Mock AudioContext
  if (!window.AudioContext) {
    class MockAudioContext {
      state = 'running'
      resume = async () => {}
      createGain = () => ({
        gain: { value: 1, setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, linearRampToValueAtTime: () => {} },
        connect: () => {},
        disconnect: () => {},
      })
      createOscillator = () => ({
        type: 'sine',
        frequency: { value: 440, setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, linearRampToValueAtTime: () => {} },
        connect: () => {},
        disconnect: () => {},
        start: () => {},
        stop: () => {},
      })
      createDynamicsCompressor = () => ({
        threshold: { value: 0 },
        knee: { value: 0 },
        ratio: { value: 0 },
        attack: { value: 0 },
        release: { value: 0 },
        connect: () => {},
        disconnect: () => {},
      })
      createBiquadFilter = () => ({
        type: 'lowpass',
        frequency: { value: 1000 },
        Q: { value: 1 },
        gain: { value: 0 },
        connect: () => {},
        disconnect: () => {},
      })
      createDelay = () => ({
        delayTime: { value: 0 },
        connect: () => {},
        disconnect: () => {},
      })
      createBuffer = (channels: number, length: number, sampleRate: number) => ({
        getChannelData: () => new Float32Array(length),
      })
      createBufferSource = () => ({
        buffer: null,
        connect: () => {},
        disconnect: () => {},
        start: () => {},
        stop: () => {},
      })
      destination = {}
      currentTime = 0
    }
    window.AudioContext = MockAudioContext as unknown as typeof AudioContext
  }
}
