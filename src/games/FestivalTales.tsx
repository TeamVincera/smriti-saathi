import { useMemo, useState } from 'react'
import type { GameProps } from './GameHost'
import { RoundHeader } from './shared'
import { playChime } from '../lib/audio'
import { useApp } from '../state'

const BASE_TALES: Record<string, { title: string; titleHi: string; text: string; prompts: { q: string; options: string[] }[] }> = {
  Bihu: {
    title: 'The Bihu Firefly & Golden Silk',
    titleHi: 'बीहू का जुगनू और सुनहरा रेशम',
    text: 'Long ago in a green village near the Brahmaputra, the sound of dhol and pepa filled the breeze as Rongali Bihu began. Families gathered in fresh muga gamosa and shared pitha and sweet doi. Grandmother smiled by the porch, humming an ancient borgeet and watching the dancing flames of the meji light up the evening sky.',
    prompts: [
      { q: 'How does this Bihu memory make you feel?', options: ['😊 Happy & Warm', '🙂 Peaceful', '💭 Nostalgic'] },
      { q: 'Did you ever celebrate Bihu with your family?', options: ['Yes, every spring', 'Many fond times', 'Loved the songs'] },
    ],
  },
  Wangala: {
    title: 'Wangala and the Hundred Drums',
    titleHi: 'वांगला और सौ ढोल',
    text: 'In the misty Garo hills when the autumn harvest was gathered, the whole village beat a hundred rhythm drums to thank the sun. Old farmer Ruga beamed with joy as bowls of fragrant new rice were shared with neighbors. "We celebrate not what we hoard, but the blessings we share," the village elders sang.',
    prompts: [
      { q: 'What feelings does this harvest celebration bring?', options: ['😊 Gratitude & Joy', '😌 Contentment', '🌟 Community warmth'] },
      { q: 'Which part of harvest festivals do you remember most?', options: ['Sharing food', 'Drumming & Music', 'Family gathering'] },
    ],
  },
  'Durga Puja': {
    title: 'Autumn Melody and the Sacred Conch',
    titleHi: 'शरद ऋतु की धुन और शंख की गूंज',
    text: 'White kash flowers swayed gently by the riverbank as the rhythm of the dhaak announced the festive days. Grandmothers lit fragrant clay lamps, the scent of fresh marigolds and sweet sandesh filled the courtyards, and every child wore their finest new clothes with wide joyful eyes.',
    prompts: [
      { q: 'How do the sounds of festive morning bells feel?', options: ['🌸 Deeply Blessed', '😊 Joyful', '🕊️ Calm & Serene'] },
      { q: 'What is your favorite festive tradition?', options: ['Lighting clay lamps', 'Listening to music', 'Sharing sweets'] },
    ],
  },
  'Hornbill Festival': {
    title: 'The Colors of the Hornbill Valley',
    titleHi: 'हॉर्नबिल घाटी के सुंदर रंग',
    text: 'In the emerald hills, colorful ceremonial attire and rhythmic log drums echoed across the valley. Storytellers passed down ancient warrior ballads around crackling log fires, reminding all the young people of courage, kindness, and respect for nature.',
    prompts: [
      { q: 'How does listening to valley songs feel?', options: ['🌿 Uplifting', '🛡️ Inspiring', '😌 Peaceful'] },
      { q: 'Did you enjoy storytelling sessions with elders in your youth?', options: ['Yes, by the fire', 'Fondly remember', 'Loved old stories'] },
    ],
  },
}

export function FestivalTales({ difficulty, logAction, complete }: GameProps) {
  void difficulty
  const { lang, profile } = useApp()

  const tale = useMemo(() => {
    const userFestivals = profile?.cultural.festivals ?? []
    const userHobbies = profile?.cultural.hobbies ?? []
    const hobbyMention = userHobbies.length > 0 ? userHobbies.join(', ').toLowerCase() : 'singing and storytelling'
    const communityMention = profile?.cultural.community ? `in the ${profile.cultural.community} tradition` : 'with dear loved ones'

    // Look for matching base tale from user's chosen festivals
    for (const f of userFestivals) {
      if (BASE_TALES[f]) {
        const base = BASE_TALES[f]
        return {
          ...base,
          prompts: [
            ...base.prompts,
            {
              q: `Did you also enjoy ${userHobbies[0] ? userHobbies[0].toLowerCase() : 'quiet moments'} during ${f}?`,
              options: ['Yes, very much', 'With family & friends', 'Fondly remembered'],
            },
          ],
        }
      }
    }

    // If custom festival added by user (e.g. Ali-Aye-Ligang, Rongker, Chapchar Kut, etc.)
    if (userFestivals.length > 0) {
      const customFest = userFestivals[0]
      return {
        title: `The Joyous Days of ${customFest}`,
        titleHi: `${customFest} के सुनहरे दिन`,
        text: `When the season of ${customFest} arrived ${communityMention}, the whole neighborhood came alive with festive warmth, radiant smiles, and togetherness. Everyone prepared special feast delicacies, children laughed in the courtyard, and peaceful evenings were spent with ${hobbyMention} and sharing stories of long ago.`,
        prompts: [
          { q: `What is your fondest memory from the days of ${customFest}?`, options: ['Family feast & treats', 'Music, songs & dance', 'Blessings from elders', 'Peaceful quiet time'] },
          { q: `How does remembering ${customFest} and ${userHobbies[0] ? userHobbies[0].toLowerCase() : 'family'} make you feel?`, options: ['😊 Heartwarming & Joyful', '😌 Peaceful & Calm', '💛 Deeply Nostalgic'] },
          { q: `Which part of ${customFest} brought you the greatest happiness?`, options: ['Sharing festive food', 'Wearing festive clothes', 'Traditional songs & stories'] },
        ],
      }
    }

    return BASE_TALES['Bihu']
  }, [profile?.cultural.festivals, profile?.cultural.hobbies, profile?.cultural.community])

  const [stage, setStage] = useState<'story' | 'prompts'>('story')
  const [promptIdx, setPromptIdx] = useState(0)

  const prompt = tale.prompts[promptIdx]
  const title = lang === 'hi' && tale.titleHi ? tale.titleHi : tale.title

  function answer() {
    void playChime()
    logAction('unprompted')
    if (promptIdx + 1 >= tale.prompts.length) {
      setTimeout(() => complete({ itemsTotal: tale.prompts.length, itemsUnprompted: tale.prompts.length, completion: 1 }), 700)
    } else {
      setPromptIdx((i) => i + 1)
    }
  }

  return (
    <div className="center-col story-panel">
      {stage === 'story' ? (
        <RoundHeader now={1} total={2} unit="part" label={`📖 Part 1: Story (${title})`} />
      ) : (
        <RoundHeader now={promptIdx + 1} total={tale.prompts.length} unit="question" label="💭 Feelings & Memory" />
      )}

      <div className="card card-dark" style={{ width: '100%', marginTop: 'var(--s-xs)', position: 'relative' }}>
        <h3 className="title">{title}</h3>
        <p className="lead" style={{ marginTop: 8 }}>{tale.text}</p>
      </div>

      {stage === 'story' ? (
        <button className="btn btn-primary btn-big mt-lg" onClick={() => setStage('prompts')}>
          Tell us how you feel →
        </button>
      ) : (
        <>
          <p className="display-md mt-lg">{prompt.q}</p>
          <div className="row" style={{ justifyContent: 'center', gap: 'var(--s-md)', marginTop: 'var(--s-sm)', flexWrap: 'wrap' }}>
            {prompt.options.map((o: string) => (
              <button key={o} className="choice-btn" onClick={answer} style={{ minWidth: 150 }}>
                <span style={{ fontSize: 'var(--fs-body-lg)' }}>{o}</span>
              </button>
            ))}
          </div>
          <p className="caption mt-sm">There are no right or wrong answers here.</p>
        </>
      )}
    </div>
  )
}
