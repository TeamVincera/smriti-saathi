export interface FamiliarPhraseItem {
  id: string
  prompt: string
  promptHi: string
  promptAs?: string
  promptMni?: string
  correctCompletion: string
  correctCompletionHi: string
  correctCompletionAs?: string
  distractors: { text: string; textHi: string; textAs?: string }[]
  fullMeaning: string
  fullMeaningHi: string
  origin: string
}

export const FAMILIAR_PHRASES_BANK: FamiliarPhraseItem[] = [
  {
    id: 'phrase_chah_pani',
    prompt: 'A gentle morning welcome: "Come inside and have a cup of…"',
    promptHi: 'सुबह का मीठा आतिथ्य: "घर आइए और एक प्याली…"',
    correctCompletion: '…Warm tea and pitha (Chah-Pani)',
    correctCompletionHi: '…गरमागरम चाय और नाश्ता',
    distractors: [
      { text: '…Cold plain ice', textHi: '…बर्फ का टुकड़ा' },
      { text: '…Spicy bitter medicine', textHi: '…कड़वी दवाई' },
      { text: '…Sandy river water', textHi: '…रेत मिला पानी' },
    ],
    fullMeaning: 'Traditional phrase of hospitality across every Northeast household.',
    fullMeaningHi: 'हर घर में मेहमानों का चाय और नाश्ते से स्वागत करने की परंपरा।',
    origin: 'Northeast Hospitality',
  },
  {
    id: 'phrase_early_bird',
    prompt: 'An old morning saying: "The morning rooster crows at…"',
    promptHi: 'सुबह की पुरानी कहावत: "मुर्गा बांग देता है…"',
    correctCompletion: '…The first golden ray of dawn',
    correctCompletionHi: '…सुबह की पहली सुनहरी किरण पर',
    distractors: [
      { text: '…The dark stroke of midnight', textHi: '…आधी रात के अंधेरे में' },
      { text: '…Heavy lunchtime', textHi: '…दोपहर के भोजन के समय' },
      { text: '…During a thunderstorm only', textHi: '…केवल आंधी-तूफान में' },
    ],
    fullMeaning: 'Reflects the natural rhythm of village life waking with dawn.',
    fullMeaningHi: 'गाँव का जीवन सूर्योदय और सुबह की ताज़गी के साथ शुरू होता है।',
    origin: 'Everyday Wisdom',
  },
  {
    id: 'phrase_two_leaves',
    prompt: 'The famous tea plucker rhyme: "Pluck two tender leaves and…"',
    promptHi: 'चाय बागान की प्रसिद्ध कहावत: "दो पत्तियां और…"',
    correctCompletion: '…One soft golden bud',
    correctCompletionHi: '…एक कोमल कली',
    distractors: [
      { text: '…A thick heavy branch', textHi: '…एक भारी मोटी डाली' },
      { text: '…A dry fallen leaf', textHi: '…एक सूखा गिरा पत्ता' },
      { text: '…A thorny cactus stem', textHi: '…एक कांटेदार तना' },
    ],
    fullMeaning: 'The universal signature of fine Assam and Darjeeling tea harvesting.',
    fullMeaningHi: 'चाय की सबसे उम्दा और सुगंधित पत्तियों को चुनने का नियम।',
    origin: 'Assam Tea Tradition',
  },
  {
    id: 'phrase_rain_and_harvest',
    prompt: 'Farmer wisdom: "When the monsoon rain blesses the soil, the paddy grows…"',
    promptHi: 'किसान की सीख: "जब मानसून की बारिश धरती को सींचती है, तो धान…"',
    correctCompletion: '…Lush green and golden ripe',
    correctCompletionHi: '…हरा-भरा और सुनहरा लहराता है',
    distractors: [
      { text: '…White like pure winter snow', textHi: '…बर्फ की तरह सफेद हो जाता है' },
      { text: '…Hard like dry river stones', textHi: '…सूखे पत्थर जैसा कड़ा' },
      { text: '…Salty like seawater', textHi: '…खारे पानी जैसा' },
    ],
    fullMeaning: 'Celebration of abundant harvest through timely monsoon showers.',
    fullMeaningHi: 'समय पर बारिश से फसलों की समृद्धि और खुशहाली।',
    origin: 'Agricultural Wisdom',
  },
  {
    id: 'phrase_tulsi_light',
    prompt: 'Evening peace saying: "When the sun goes down, light the lamp beside the…"',
    promptHi: 'संध्या वंदना: "जब शाम ढल जाए, तो दीपक जलाएं…"',
    correctCompletion: '…Sacred green Tulsi plant',
    correctCompletionHi: '…पवित्र हरी तुलसी के पौधे के पास',
    distractors: [
      { text: '…Cold muddy puddle', textHi: '…कीचड़ वाले गड्ढे के पास' },
      { text: '…Roof water tank', textHi: '…पानी की टंकी पर' },
      { text: '…Dark tool shed', textHi: '…औज़ारों के कमरे में' },
    ],
    fullMeaning: 'Lighting the evening diya brings light, tranquility, and protection to the home.',
    fullMeaningHi: 'संध्या के समय घर में सुख-शांति और सकारात्मक ऊर्जा का संचार।',
    origin: 'Traditional Heritage',
  },
  {
    id: 'phrase_weaving_rhyme',
    prompt: 'Weaver mother advice: "Throw the wooden shuttle with rhythm, and the loom will weave…"',
    promptHi: 'बुनकर मां की सीख: "लय से शटल चलाओगी, तो करघे पर बनेगा…"',
    correctCompletion: '…A beautiful red floral cloth',
    correctCompletionHi: '…एक सुंदर लाल फूलों वाला वस्त्र',
    distractors: [
      { text: '…A hard piece of timber', textHi: '…लकड़ी का तख्ता' },
      { text: '…A tangled rope of wire', textHi: '…तार का उलझा जाल' },
      { text: '…A pile of grey sand', textHi: '…रेत का ढेर' },
    ],
    fullMeaning: 'Patience and rhythm create the finest handwoven silks.',
    fullMeaningHi: 'धैर्य और एकाग्रता से ही सुंदर बुनाई संभव होती है।',
    origin: 'Handloom Folklore',
  },
  {
    id: 'phrase_river_flow',
    prompt: 'Elderly saying: "Just like the mighty river flows steadily to the sea, life moves…"',
    promptHi: 'बुज़ुर्गों का आशीष: "जैसे नदी शांत भाव से बहती है, वैसे ही जीवन…"',
    correctCompletion: '…Forward with calm grace and peace',
    correctCompletionHi: '…शांति और धैर्य के साथ आगे बढ़ता है',
    distractors: [
      { text: '…Backwards up the high mountain', textHi: '…उल्टा पहाड़ पर चढ़ता है' },
      { text: '…Frozen completely solid in place', textHi: '…एक जगह जम जाता है' },
      { text: '…In angry lightning circles', textHi: '…क्रोध में घूमता है' },
    ],
    fullMeaning: 'Encourages acceptance, emotional peace, and steady contentment.',
    fullMeaningHi: 'नदी की तरह निरंतर शांत और संतुष्ट रहने का संदेश।',
    origin: 'Philosophical Proverbs',
  },
  {
    id: 'phrase_birds_nest',
    prompt: 'Evening dusk rhyme: "When twilight falls over the hills, every little bird flies back to its…"',
    promptHi: 'शाम की लोरी: "जब पहाड़ों पर शाम घिर आए, तो हर नन्ही चिड़िया लौटती है अपने…"',
    correctCompletion: '…Warm cozy leafy nest',
    correctCompletionHi: '…प्यारे और सुरक्षित घोंसले में',
    distractors: [
      { text: '…Deep underwater cave', textHi: '…गहरे पानी की गुफा में' },
      { text: '…Noisy city market', textHi: '…शोर भरे बाज़ार में' },
      { text: '…Cold iron cage', textHi: '…लोहे के पिंजरे में' },
    ],
    fullMeaning: 'Warm symbol of coming home safely to rest with family.',
    fullMeaningHi: 'दिन भर के बाद घर लौटकर अपनों के बीच विश्राम करना।',
    origin: 'Family Lore',
  },
  {
    id: 'phrase_morning_chai',
    prompt: 'Morning tradition: "Start the new day with a smile and a warm cup of…"',
    promptHi: 'सुबह की शुरुआत: "नया दिन मुस्कान और गरमा-गरम प्याले के साथ शुरू करें…"',
    correctCompletion: '…Fragrant fresh Assam tea',
    correctCompletionHi: '…ताज़ा और खुशबूदार असम की चाय के',
    distractors: [
      { text: '…Salty sea water', textHi: '…नमकीन समुद्री पानी के' },
      { text: '…Sour vinegar', textHi: '…सिरके के' },
      { text: '…Cold plain ice', textHi: '…बर्फ के' },
    ],
    fullMeaning: 'Tea brings warmth, energy, and community conversation.',
    fullMeaningHi: 'सुबह की ताज़ा चाय दिन में स्फूर्ति और मिठास भरती है।',
    origin: 'Tea Culture',
  },
  {
    id: 'phrase_golden_paddy',
    prompt: 'Farmer wisdom: "When the autumn breeze turns the paddy fields to gold, it is time for…"',
    promptHi: 'किसान की कहावत: "जब हवा से धान की बालियां सुनहरी हो जाएं, तो समय आता है…"',
    correctCompletion: '…Joyful festive harvest (Bihu)',
    correctCompletionHi: '…खुशी-खुशी फसल की कटाई और उत्सव (बिहू) का',
    distractors: [
      { text: '…Digging deep ice holes', textHi: '…बर्फ खोदने का' },
      { text: '…Burning dry forests', textHi: '…जंगल जलाने का' },
      { text: '…Staying locked inside rooms', textHi: '…कमरे में बंद रहने का' },
    ],
    fullMeaning: 'Celebration of hard agricultural labor and community abundance.',
    fullMeaningHi: 'मेहनत का मीठा फल और समाज के साथ मिलकर उत्सव मनाना।',
    origin: 'Agricultural Proverbs',
  },
  {
    id: 'phrase_orchid_spring',
    prompt: 'Spring saying: "When the Kopou orchid blooms on the tree bark, spring brings…"',
    promptHi: 'ऋतुराज का संदेश: "जब पेड़ पर कपौ का फूल खिलता है, तो वसंत लाता है…"',
    correctCompletion: '…Music, laughter, and dance',
    correctCompletionHi: '…गीत, संगीत और उल्लास',
    distractors: [
      { text: '…Snowstorms and ice', textHi: '…बर्फ का तूफ़ान' },
      { text: '…Silence and gloom', textHi: '…सन्नाटा' },
      { text: '…Heavy iron chains', textHi: '…भारी जंजीरें' },
    ],
    fullMeaning: 'Orchid blossoms herald Rongali Bihu and rejuvenation.',
    fullMeaningHi: 'प्रकृति के खिलने के साथ जीवन में नई उमंग का आगमन।',
    origin: 'Seasonal Lore',
  },
  {
    id: 'phrase_sweet_speech',
    prompt: 'Gentle advice: "Speak with honey in your words, and you will find…"',
    promptHi: 'मीठी वाणी: "मीठे बोल बोलिए, तो हर जगह मिलेगा…"',
    correctCompletion: '…Friends and warmth wherever you go',
    correctCompletionHi: '…स्नेह, आदर और अपनेपन का साथ',
    distractors: [
      { text: '…Thorns in your hands', textHi: '…हाथों में कांटे' },
      { text: '…Angry storm winds', textHi: '…तेज़ आंधी' },
      { text: '…Empty dark walls', textHi: '…सूनी दीवारें' },
    ],
    fullMeaning: 'Kind speech wins hearts and fosters lifelong bonds.',
    fullMeaningHi: 'मधुर वाणी से रिश्ते मजबूत होते हैं और शांति मिलती है।',
    origin: 'Folk Wisdom',
  },
  {
    id: 'phrase_bamboo_bridge',
    prompt: 'Village teamwork: "A single bamboo is light, but bound together they build a…"',
    promptHi: 'एकता का बल: "एक बांस अकेला होता है, पर मिलकर वे बनाते हैं…"',
    correctCompletion: '…Strong footbridge across the river',
    correctCompletionHi: '…नदी पार कराने वाला मज़बूत पुल',
    distractors: [
      { text: '…Heavy iron rock', textHi: '…भारी चट्टान' },
      { text: '…Deep dark pit', textHi: '…गहरा गड्ढा' },
      { text: '…Smoke in the air', textHi: '…धुआं' },
    ],
    fullMeaning: 'Community unity and togetherness can cross any river.',
    fullMeaningHi: 'आपसी सहयोग से हर कठिन मार्ग आसान हो जाता है।',
    origin: 'Community Sayings',
  },
  {
    id: 'phrase_sharing_food',
    prompt: 'Hospitality saying: "Food tastes sweetest when it is…"',
    promptHi: 'अतिथि सत्कार: "भोजन का स्वाद तब सबसे मीठा होता है, जब वह…"',
    correctCompletion: '…Shared with loved ones and guests',
    correctCompletionHi: '…अपनों और मेहमानों के साथ मिल-बांटकर खाया जाए',
    distractors: [
      { text: '…Hidden alone in a closet', textHi: '…अकेले छुपकर खाया जाए' },
      { text: '…Left outside in the rain', textHi: '…बारिश में छोड़ दिया जाए' },
      { text: '…Buried in dry sand', textHi: '…रेत में दबा दिया जाए' },
    ],
    fullMeaning: 'Sharing nourishment is the highest joy of home life.',
    fullMeaningHi: 'मिल-बांटकर खाने से घर में बरकत और आनंद बढ़ता है।',
    origin: 'Hospitality Proverbs',
  },
]
