import { Icon } from './Icons'

interface WaveformMicProps {
  isActive: boolean
  lang: string
  iconProps: { size: number; color: string }
}

/**
 * WaveformMic
 * High-performance, hardware-isolated mic indicator.
 * Avoids concurrent getUserMedia calls that lock the microphone hardware
 * and conflict with SpeechRecognition and MediaRecorder on iOS/Android.
 */
export function WaveformMic({ isActive, iconProps }: WaveformMicProps) {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {isActive && (
        <div
          style={{
            position: 'absolute',
            inset: -4,
            borderRadius: '50%',
            border: '2.5px solid rgba(255, 95, 86, 0.65)',
            animation: 'micPulseGlow 1.4s ease-in-out infinite',
            pointerEvents: 'none',
          }}
        />
      )}
      {isActive ? (
        <div className="mic-wave-container" style={{ color: iconProps.color }} aria-label="Listening to your voice">
          <span className="mic-wave-bar" />
          <span className="mic-wave-bar" />
          <span className="mic-wave-bar" />
          <span className="mic-wave-bar" />
        </div>
      ) : (
        <Icon name="mic" size={iconProps.size} color={iconProps.color} />
      )}
    </div>
  )
}
