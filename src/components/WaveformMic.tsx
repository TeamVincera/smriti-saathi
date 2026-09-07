import { useRef, useEffect, useState, useCallback } from 'react'
import { Icon } from './Icons'

interface WaveformMicProps {
  isActive: boolean
  lang: string
  iconProps: { size: number; color: string }
}

export function WaveformMic({ isActive, iconProps }: WaveformMicProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animRef = useRef<number | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [amp, setAmp] = useState(0)

  const startStream = useCallback(async (onStream: (stream: MediaStream) => void) => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return false
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      onStream(stream)
      return true
    } catch {
      return false
    }
  }, [])

  useEffect(() => {
    if (!isActive) {
      setAmp(0)
      if (animRef.current) {
        cancelAnimationFrame(animRef.current)
        animRef.current = null
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
      if (analyserRef.current) {
        analyserRef.current.disconnect()
        analyserRef.current = null
      }
      return
    }

    let startedFromHere = false
    const maybeStart = async () => {
      if (!canvasRef.current) return
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const width = canvas.width
      const height = canvas.height

      const audioCtx = ac()
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 128
      analyserRef.current = analyser

      const stream = streamRef.current
      if (stream) {
        const source = audioCtx.createMediaStreamSource(stream)
        source.connect(analyser)
      } else {
        const ok = await startStream((s) => {
          streamRef.current = s
          const source = audioCtx.createMediaStreamSource(s)
          source.connect(analyser)
          startedFromHere = true
        })
        if (!ok) {
          analyser.disconnect()
          analyserRef.current = null
          ctx.clearRect(0, 0, width, height)
          return
        }
      }

      const fftSize = analyser.frequencyBinCount
      const dataArray = new Uint8Array(fftSize)

      const tick = () => {
        if (!analyserRef.current) return
        analyserRef.current.getByteTimeDomainData(dataArray)

        ctx.clearRect(0, 0, width, height)

        const center = height / 2
        const barWidth = Math.max(3, width / dataArray.length - 2)
        const gap = 2

        for (let i = 0; i < dataArray.length; i += 1) {
          const norm = (dataArray[i] - 128) / 128
          const h = Math.max(2, Math.abs(norm) * height * 0.9)
          const x = i * (barWidth + gap) + gap / 2
          const y = center - h / 2

          ctx.fillStyle = `rgba(255, 255, 255, ${0.35 + Math.abs(norm) * 0.65})`
          ctx.fillRect(x, y, barWidth, h)
        }

        setAmp(Math.abs((dataArray[32] - 128) / 128))
        animRef.current = requestAnimationFrame(tick)
      }

      animRef.current = requestAnimationFrame(tick)
    }

    maybeStart()
    return () => {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current)
        animRef.current = null
      }
      if (streamRef.current && startedFromHere) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
      if (analyserRef.current) {
        analyserRef.current.disconnect()
        analyserRef.current = null
      }
    }
  }, [isActive, startStream])

  return (
    <>
      <canvas
        ref={canvasRef}
        width={48}
        height={48}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: isActive ? 'block' : 'none' }}
        aria-hidden="true"
      />
      <Icon name={isActive ? 'mic' : 'mic'} size={iconProps.size} color={iconProps.color} />
    </>
  )
}

function ac(): AudioContext {
  const AC = (typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext)) as typeof AudioContext | undefined
  const ctx = AC ? new AC() : null
  if (!ctx) {
    throw new Error('No AudioContext available for waveform analysis')
  }
  return ctx
}
