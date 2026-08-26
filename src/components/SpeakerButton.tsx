import { useState } from 'react'
import { Icon } from './Icons'
import { speak, stopSpeaking } from '../lib/speech'
import { unlockAudio } from '../lib/audio'

export function SpeakerButton({ text, lang, dark = false }: { text: string; lang: string; dark?: boolean }) {
  const [busy, setBusy] = useState(false)
  return (
    <button
      className={`icon-btn ${dark ? 'on-dark' : ''}`}
      aria-label="Listen"
      onClick={() => {
        if (busy) {
          stopSpeaking()
          setBusy(false)
          return
        }
        unlockAudio()
        setBusy(true)
        void speak(text, lang as never).then(() => setBusy(false))
      }}
    >
      <Icon name="speaker" />
    </button>
  )
}
