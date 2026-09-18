import { describe, it, expect, beforeEach } from 'vitest'
import { neutralizeGenderWords, VoiceService } from '../../src/lib/voice/VoiceService'
import { AVATARS } from '../../src/screens/Onboarding'

describe('neutralizeGenderWords', () => {
  it('neutralizes English gendered pronouns with case awareness', () => {
    expect(neutralizeGenderWords('He is walking with his friend.')).toBe('They is walking with their friend.')
    expect(neutralizeGenderWords('She loves her family and herself.')).toBe('They loves their family and themselves.')
    expect(neutralizeGenderWords('Tell him that the book is hers.')).toBe('Tell them that the book is their.')
  })

  it('neutralizes gendered nouns and relationships in English', () => {
    expect(neutralizeGenderWords('The boy and girl visited their grandfather and grandmother.')).toBe(
      'The child and child visited their elder and elder.'
    )
    expect(neutralizeGenderWords('Her husband and his wife greeted the gentleman and lady.')).toBe(
      'Their spouse and their spouse greeted the person and person.'
    )
    expect(neutralizeGenderWords('Father and mother take care of their son and daughter.')).toBe(
      'Parent and parent take care of their child and child.'
    )
    expect(neutralizeGenderWords('Brothers and sisters playing together.')).toBe('Siblings and siblings playing together.')
  })

  it('strips honorifics cleanly without awkward double spaces', () => {
    expect(neutralizeGenderWords('Good morning Sir, how are you Madam?')).toBe('Good morning, how are you?')
    expect(neutralizeGenderWords('Yes ma\'am, it is time for medicine.')).toBe('Yes, it is time for medicine.')
  })

  it('neutralizes Hinglish and Hindi kinship and gender terms', () => {
    expect(neutralizeGenderWords('Dada and dadi are resting.')).toBe('Swajan and swajan are resting.')
    expect(neutralizeGenderWords('Beta, apni dawai le lo.')).toBe('Bachha, apni dawai le lo.')
    expect(neutralizeGenderWords('दादा और दादी जी को नमस्ते')).toBe('स्वजन और स्वजन जी को नमस्ते')
    expect(neutralizeGenderWords('बेटा और बेटी खुश हैं')).toBe('बच्चा और बच्चा खुश हैं')
    expect(neutralizeGenderWords('माता और पिता का आशीर्वाद')).toBe('अभिभावक और अभिभावक का आशीर्वाद')
    expect(neutralizeGenderWords('श्रीमान और श्रीमती जी')).toBe('और जी')
  })

  it('handles empty and whitespace strings gracefully', () => {
    expect(neutralizeGenderWords('')).toBe('')
    expect(neutralizeGenderWords('   ')).toBe('')
  })
})

describe('Onboarding Avatar choices', () => {
  it('does not contain the hijabu avatar', () => {
    expect(AVATARS).not.toContain('🧕')
    expect(AVATARS).toEqual(['👵', '👴', '🧑', '👩', '👨'])
  })
})

describe('VoiceService integration with neutralization', () => {
  let spokenTexts: string[] = []

  beforeEach(() => {
    spokenTexts = []
    VoiceService.stop()

    const synth: any = {
      speak: (u: any) => {
        spokenTexts.push(u.text)
        setTimeout(() => u.onend?.(), 0)
      },
      cancel: () => {},
      getVoices: () => [],
    }
    ;(window as any).speechSynthesis = synth
    ;(window as any).SpeechSynthesisUtterance = class {
      text: string
      constructor(text: string) {
        this.text = text
      }
    }
  })

  it('automatically neutralizes speech text before synthesizing', async () => {
    await VoiceService.speak('Good morning sir, she is here with her grandfather.')
    expect(spokenTexts).toHaveLength(1)
    expect(spokenTexts[0]).toBe('Good morning, they is here with their elder.')
  })
})
