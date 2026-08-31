export type VillageSoundKey =
  | 'rain'
  | 'river'
  | 'rooster'
  | 'cuckoo'
  | 'wind'
  | 'cricket'
  | 'bell'
  | 'kettle'
  | 'conch'
  | 'market'
  | 'flute'
  | 'dhol'
  | 'pepa'
  | 'wangala'
  | 'tamol_snip'
  | 'thunder'

export interface SoundQuestionItem {
  id: string
  soundKey: VillageSoundKey
  name: string
  nameHi: string
  nameAs?: string
  nameMni?: string
  emoji: string
  category: 'nature' | 'animals' | 'village' | 'music'
  description: string
  descriptionHi: string
  distractorKeys: VillageSoundKey[]
}

export const VILLAGE_SOUNDS_BANK: SoundQuestionItem[] = [
  {
    id: 'snd_monsoon_rain',
    soundKey: 'rain',
    name: 'Monsoon Rain on Tin Roof',
    nameHi: 'छत पर बरसती मानसून की बारिश',
    nameAs: 'বৰষুণৰ টোপাল',
    nameMni: 'নোংচুবা',
    emoji: '🌧️',
    category: 'nature',
    description: 'Steady monsoon rain shower with gentle droplet taps on broad leaves.',
    descriptionHi: 'पत्तों और आंगन पर गिरती शीतल बारिश की मधुर फुहार।',
    distractorKeys: ['rooster', 'bell', 'dhol'],
  },
  {
    id: 'snd_mountain_river',
    soundKey: 'river',
    name: 'Flowing Mountain Stream / River',
    nameHi: 'पहाड़ी नदी का कल-कल बहता पानी',
    nameAs: 'নৈৰ কুলু-কুলু সোঁত',
    nameMni: 'তুরেল ঈচেল',
    emoji: '🏞️',
    category: 'nature',
    description: 'Gentle gushing mountain river flowing over smooth riverbed pebbles.',
    descriptionHi: 'नदी की कल-कल बहती सुखद जलधारा।',
    distractorKeys: ['wind', 'cuckoo', 'kettle'],
  },
  {
    id: 'snd_morning_rooster',
    soundKey: 'rooster',
    name: 'Morning Rooster Crow (Dawn Call)',
    nameHi: 'सुबह का बांग देता मुर्गा',
    nameAs: 'ৰাতিপুৱাৰ কুকুৰাৰ ডাক',
    nameMni: 'য়েনবা কানবা',
    emoji: '🐓',
    category: 'animals',
    description: 'Crisp, proud morning crow calling the village awake at first light.',
    descriptionHi: 'सुबह-सुबह नींद से जगाने वाली मुर्गे की बांग।',
    distractorKeys: ['rain', 'river', 'bell'],
  },
  {
    id: 'snd_indian_cuckoo',
    soundKey: 'cuckoo',
    name: 'Indian Cuckoo / Koel Song',
    nameHi: 'मीठी बोली बोलती कोयल',
    nameAs: 'কুলী চৰাইৰ মাত',
    nameMni: 'খুনু লৈরাক',
    emoji: '🐦',
    category: 'animals',
    description: 'Two-note melodic flute-like whistle echoing through mango groves in spring.',
    descriptionHi: 'आम की डाल पर बैठी कोयल की सुरीली कूक।',
    distractorKeys: ['rain', 'dhol', 'wind'],
  },
  {
    id: 'snd_temple_bell',
    soundKey: 'bell',
    name: 'Temple / Church Prayer Bell',
    nameHi: 'मंदिर की गूंजती घंटी',
    nameAs: 'মন্দিৰৰ ঘণ্টাৰ ধ্বনি',
    nameMni: 'লাইশং ঘন্তা',
    emoji: '🔔',
    category: 'village',
    description: 'Long sustaining pure bell chime ringing for evening Aarti and prayer.',
    descriptionHi: 'संध्या वंदन और आरती में बजती पवित्र कांस्य घंटी।',
    distractorKeys: ['rooster', 'river', 'cricket'],
  },
  {
    id: 'snd_bamboo_wind',
    soundKey: 'wind',
    name: 'Breeze Rustling in Bamboo Grove',
    nameHi: 'बांस के झुरमुट में बहती शाम की हवा',
    nameAs: 'বাঁহনিৰ বতাহৰ সুহুৰি',
    nameMni: 'নুংশিৎ ফুম্বা',
    emoji: '🍃',
    category: 'nature',
    description: 'Swelling, soothing hush of wind passing through tall bamboo stalks.',
    descriptionHi: 'शांत शाम में बांस के पत्तों की सुखद सरसराहट।',
    distractorKeys: ['kettle', 'rooster', 'pepa'],
  },
  {
    id: 'snd_night_crickets',
    soundKey: 'cricket',
    name: 'Night Crickets in the Garden',
    nameHi: 'रात में झींगुरों की मधुर झंकार',
    nameAs: 'নিশাৰ ঝিঁঝিঁ পোকৰ মাত',
    nameMni: 'নুমিদাংগী য়ুং',
    emoji: '🦗',
    category: 'nature',
    description: 'Gentle, hypnotic chirping of crickets under the starry hill night sky.',
    descriptionHi: 'चांदनी रात में बगिया में गूंजती झींगुरों की आवाज़।',
    distractorKeys: ['rain', 'bell', 'river'],
  },
  {
    id: 'snd_boiling_kettle',
    soundKey: 'kettle',
    name: 'Steaming Tea Kettle Whistle',
    nameHi: 'चाय की केतली की सीटी / भाप',
    nameAs: 'কেটলিৰ চাহৰ ভাপ',
    nameMni: 'চা পূং হৌবা',
    emoji: '🫖',
    category: 'village',
    description: 'Soft bubbling and rising steam whistle of boiling water for morning tea.',
    descriptionHi: 'सुबह चूल्हे पर चाय का पानी उबलने की सिसकारी।',
    distractorKeys: ['rooster', 'cuckoo', 'bell'],
  },
  {
    id: 'snd_conch_shell',
    soundKey: 'conch',
    name: 'Sacred Blowing Conch Shell (Xonkho)',
    nameHi: 'पवित्र शंख की मंगल ध्वनि',
    nameAs: 'পৱিত্ৰ শংখৰ ধ্বনি',
    nameMni: 'শঙ্খ খোংবা',
    emoji: '🐚',
    category: 'village',
    description: 'Deep resonant auspicious conch blast welcoming evening twilight.',
    descriptionHi: 'संध्या आरती में बजाई जाने वाली मंगलकारी शंख ध्वनि।',
    distractorKeys: ['rain', 'river', 'cricket'],
  },
  {
    id: 'snd_bihu_dhol_beat',
    soundKey: 'dhol',
    name: 'Rhythmic Festive Bihu Dhol',
    nameHi: 'बीहू ढोल की जोशीली थाप',
    nameAs: 'বিহু ঢোলৰ চাপৰ',
    nameMni: 'বিহু দ্রুম',
    emoji: '🪘',
    category: 'music',
    description: 'Joyful traditional folk drum pattern of spring Bihu celebration.',
    descriptionHi: 'वसंत में बजने वाली असमिया बीहू ढोल की मधुर थाप।',
    distractorKeys: ['rain', 'cuckoo', 'kettle'],
  },
  {
    id: 'snd_bamboo_flute_tune',
    soundKey: 'flute',
    name: 'Sweet Bamboo Flute Folk Melody',
    nameHi: 'बांसुरी की सुरीली लोक धुन',
    nameAs: 'বাঁহীৰ সুৰীয়া সুৰ',
    nameMni: 'ৱাংগোং সুর',
    emoji: '🪈',
    category: 'music',
    description: 'Peaceful lyrical melody of hill folk songs played on natural bamboo flute.',
    descriptionHi: 'पहाड़ों और खेतों में गूंजती मीठी बांसुरी की धुन।',
    distractorKeys: ['rooster', 'river', 'cricket'],
  },
  {
    id: 'snd_pepa_call',
    soundKey: 'pepa',
    name: 'Assam Buffalo Horn Pepa Call',
    nameHi: 'असमिया पेपा बाजे की गूंज',
    nameAs: 'পেঁপাৰ সুৰ',
    nameMni: 'পেপা সুর',
    emoji: '📯',
    category: 'music',
    description: 'Traditional spirited reed call echoing across open Brahmaputra meadows.',
    descriptionHi: 'भैंस के सींग से बनी पेपा की रोमांचक लोक धुन।',
    distractorKeys: ['bell', 'rain', 'wind'],
  },
]
