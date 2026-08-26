import { useEffect, useRef, useState } from 'react'
import type { GameProps } from './GameHost'
import { RoundHeader } from './shared'
import { speak } from '../lib/speech'
import { listenOnce } from '../lib/speech'
import { playChime } from '../lib/audio'
import { useApp } from '../state'

const TALES = [
  {
    title: 'The Bihu Firefly',
    titleHi: 'बीहू का जुगनू',
    text: 'Long ago in a village near the Brahmaputra, a little firefly could not sleep during Rongali Bihu. The dhol was beating, the girls were dancing with kopou phool in their hair. The firefly flew round and round the gamosa hung on the line, glowing like a tiny lamp. Grandmother said, "Even the smallest light is welcome at Bihu." And so it danced till morning with everyone.',
    prompts: [
      { q: 'How does this story make you feel?', options: ['😊 Happy', '🙂 Peaceful', '🤔 Thoughtful'] },
      { q: 'Did you ever watch Bihu dance in your village?', options: ['Yes, many times', 'Once or twice', 'Not yet'] },
    ],
  },
  {
    title: 'Wangala and the Hundred Drums',
    titleHi: 'वांगला और सौ ढोल',
    text: 'In the Garo hills, when the harvest was done, the villagers thanked the sun goddess Misi Saljong. They beat a hundred drums at Wangala. Old Ruga the farmer smiled because his millet had grown tall. He told the children, "We do not count what we keep; we count what we can share." The whole hill smelled of new rice and joy.',
    prompts: [
      { q: 'What did you feel listening to this?', options: ['😊 Warm', '😌 Relaxed', '🤔 Nostalgic'] },
      { q: 'Which festival of yours feels like Wangala?', options: ['Bihu', 'Durga Puja', 'Another one'] },
    ],
  },
]

export function FestivalTales({ difficulty, logAction, complete }: GameProps) {
  void difficulty
  const { lang } = useApp()
  const tale = useRef(TALES[Math.floor(Math.random() * TALES.length)]).current
  const [stage, setStage] = useState<'story' | 'prompts'>('story')
  const [promptIdx, setPromptIdx] = useState(0)
  const [heard, setHeard] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => void speak(`${tale.title}. ${tale.text}`, 'en'), 500)
    return () => clearTimeout(t)
  }, [])

  function answer() {
    void playChime()
    logAction('unprompted')
    if (promptIdx + 1 >= tale.prompts.length) {
      setTimeout(() => complete({ itemsTotal: tale.prompts.length, itemsUnprompted: tale.prompts.length, completion: 1 }), 700)
    } else {
      setPromptIdx((i) => i + 1)
      setHeard(null)
    }
  }

  const prompt = tale.prompts[promptIdx]
  const title = lang === 'hi' && tale.titleHi ? tale.titleHi : tale.title

  return (
    <div className="center-col story-panel">
      {stage === 'story' ? (
        <RoundHeader now={1} total={2} unit="part" label={`📖 Part 1: Story (${title})`} />
      ) : (
        <RoundHeader now={promptIdx + 1} total={tale.prompts.length} unit="question" label="💭 Feelings & Memory" />
      )}

      <div className="card card-dark" style={{ width: '100%', marginTop: 'var(--s-xs)' }}>
        <h3 className="title">{title}</h3>
        <p className="lead" style={{ marginTop: 8 }}>{tale.text}</p>
        <button
          className="btn btn-primary mt-lg"
          onClick={() => void speak(`${tale.title}. ${tale.text}`, 'en')}
        >
          ▶ Listen again
        </button>
      </div>

      {stage === 'story' ? (
        <button className="btn btn-primary btn-big mt-lg" onClick={() => setStage('prompts')}>
          Tell us how you feel →
        </button>
      ) : (
        <>
          <p className="display-md mt-lg">{prompt.q}</p>
          <div className="row" style={{ justifyContent: 'center', gap: 'var(--s-md)', marginTop: 'var(--s-sm)' }}>
            {prompt.options.map((o) => (
              <button key={o} className="choice-btn" onClick={answer} style={{ minWidth: 150 }}>
                <span style={{ fontSize: 'var(--fs-body-lg)' }}>{o}</span>
              </button>
            ))}
          </div>
          <button
            className="btn btn-pearl mt-md"
            onClick={async () => {
              const res = await listenOnce(lang)
              if (res) setHeard(res)
              answer()
            }}
          >
            🎙 Or just say it aloud
          </button>
          {heard && <p className="chip">“{heard}” — thank you for sharing 💛</p>}
          <p className="caption">There are no right or wrong answers here.</p>
        </>
      )}
    </div>
  )
}
