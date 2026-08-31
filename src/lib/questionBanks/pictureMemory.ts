export interface SceneDetailQuestion {
  question: string
  questionHi: string
  questionAs?: string
  questionMni?: string
  correctAnswer: string
  correctAnswerHi: string
  distractors: { text: string; textHi: string }[]
}

export interface PictureMemoryScene {
  id: string
  title: string
  titleHi: string
  titleAs?: string
  titleMni?: string
  sceneEmoji: string
  elementsDescription: string
  elementsDescriptionHi: string
  items: { emoji: string; name: string; nameHi: string; position: string }[]
  questions: SceneDetailQuestion[]
}

export const PICTURE_MEMORY_BANK: PictureMemoryScene[] = [
  {
    id: 'scene_bihu_courtyard',
    title: 'Bihu Celebration in Village Courtyard',
    titleHi: 'आंगन में बीहू का उत्सव',
    sceneEmoji: '🏡',
    elementsDescription: 'A cheerful village courtyard with a red floral Gamosa on the wooden mora, a Dhol drum beside the tree, 2 yellow Kopou orchids in a pot, and a steaming brass teapot on the small stool.',
    elementsDescriptionHi: 'गांव का सुंदर आंगन जहाँ मोढ़े पर लाल गमोसा रखा है, पेड़ के पास ढोल है, गमले में 2 पीले फूल खिले हैं और मेज पर चाय की केतली है।',
    items: [
      { emoji: '🧣', name: 'Red Floral Gamosa', nameHi: 'लाल गमोसा', position: 'On the woven cane mora' },
      { emoji: '🪘', name: 'Bihu Dhol Drum', nameHi: 'बीहू ढोल', position: 'Beside the shade tree' },
      { emoji: '🌸', name: 'Orchid Flower Pot', nameHi: 'ऑर्किड का गमला', position: 'Near the veranda steps' },
      { emoji: '🫖', name: 'Brass Tea Kettle', nameHi: 'पीतल की केतली', position: 'On the small wooden stool' },
    ],
    questions: [
      {
        question: 'What was placed on top of the cane mora (stool)?',
        questionHi: 'बेंत के मोढ़े (स्टूल) पर क्या रखा हुआ था?',
        correctAnswer: 'Red Gamosa (Woven Cloth)',
        correctAnswerHi: 'लाल गमोसा (कपड़ा)',
        distractors: [
          { text: 'A heavy iron hammer', textHi: 'लोहे का हथौड़ा' },
          { text: 'A reading book', textHi: 'किताब' },
          { text: 'A pair of shoes', textHi: 'जूते' },
        ],
      },
      {
        question: 'Which musical instrument was resting by the tree?',
        questionHi: 'पेड़ के पास कौन सा बाजा रखा हुआ था?',
        correctAnswer: 'Bihu Dhol (Drum)',
        correctAnswerHi: 'बीहू ढोल',
        distractors: [
          { text: 'A brass bell', textHi: 'पीतल की घंटी' },
          { text: 'A modern guitar', textHi: 'गिटार' },
          { text: 'A bamboo flute', textHi: 'बांसुरी' },
        ],
      },
      {
        question: 'What was boiling on the small stool?',
        questionHi: 'छोटी मेज पर क्या रखा हुआ था?',
        correctAnswer: 'Brass Tea Kettle',
        correctAnswerHi: 'चाय की केतली',
        distractors: [
          { text: 'A flower vase', textHi: 'फूलदान' },
          { text: 'A bowl of rice', textHi: 'चावल का कटोरा' },
          { text: 'An umbrella', textHi: 'छाता' },
        ],
      },
    ],
  },
  {
    id: 'scene_tea_estate_morning',
    title: 'Morning Sun over the Tea Garden',
    titleHi: 'चाय बागान में सुबह की धूप',
    sceneEmoji: '🍃',
    elementsDescription: 'Green tea slopes under morning sunshine. A wicker basket (Tukuri) on the grass, a yellow butterfly near a tea bush, a worker wearing a round bamboo Japi hat, and an earthen pitcher of cool water under the shade.',
    elementsDescriptionHi: 'हरी-भरी चाय की ढलानें। घास पर बांस की टुकुरी रखी है, झाड़ी पर पीली तितली है, सिर पर जापी टोपी पहनी है और छाया में ठंडा पानी का घड़ा है।',
    items: [
      { emoji: '🧺', name: 'Wicker Tea Basket', nameHi: 'चाय की टोकरी', position: 'On the fresh green grass' },
      { emoji: '🦋', name: 'Yellow Butterfly', nameHi: 'पीली तितली', position: 'Near the tea bushes' },
      { emoji: '👒', name: 'Bamboo Japi Hat', nameHi: 'बांस की जापी टोपी', position: 'Worn on the head' },
      { emoji: '🏺', name: 'Clay Water Pitcher', nameHi: 'मिट्टी का घड़ा', position: 'Under the shade tree' },
    ],
    questions: [
      {
        question: 'What kind of hat was worn to shield from the sun?',
        questionHi: 'धूप से बचने के लिए सिर पर कौन सी टोपी पहनी हुई थी?',
        correctAnswer: 'Round Bamboo Japi Hat',
        correctAnswerHi: 'बांस की जापी टोपी',
        distractors: [
          { text: 'A woollen winter cap', textHi: 'ऊनी टोपी' },
          { text: 'A red silk turban', textHi: 'पगड़ी' },
          { text: 'A helmet', textHi: 'हेलमेट' },
        ],
      },
      {
        question: 'What was fluttering near the tea bushes?',
        questionHi: 'चाय की झाड़ियों के पास क्या उड़ रही थी?',
        correctAnswer: 'A Yellow Butterfly',
        correctAnswerHi: 'पीली तितली',
        distractors: [
          { text: 'A black crow', textHi: 'कौआ' },
          { text: 'A paper kite', textHi: 'पतंग' },
          { text: 'A dry brown leaf', textHi: 'सूखा पत्ता' },
        ],
      },
      {
        question: 'What vessel kept cool drinking water under the shade?',
        questionHi: 'पेड़ की छाया में पीने का पानी किसमें रखा था?',
        correctAnswer: 'Clay Water Pitcher (Earthen Pot)',
        correctAnswerHi: 'मिट्टी का घड़ा (मटका)',
        distractors: [
          { text: 'A plastic bucket', textHi: 'प्लास्टिक बाल्टी' },
          { text: 'A steel drum', textHi: 'स्टील का डिब्बा' },
          { text: 'A glass bottle', textHi: 'कांच की बोतल' },
        ],
      },
    ],
  },
  {
    id: 'scene_grandmother_kitchen',
    title: 'Traditional Country Kitchen Porch',
    titleHi: 'दादी की रसोई का शांत बरामदा',
    sceneEmoji: '🍲',
    elementsDescription: 'Clay cooking stove with glowing embers. A brass plate with 3 steamed white pithas, a cat resting comfortably near the woodpile, and a bunch of yellow bananas hanging from the bamboo beam.',
    elementsDescriptionHi: 'मिट्टी का चूल्हा। पीतल की थाली में 3 सफेद पीठे रखे हैं, लकड़ी के पास बिल्ली आराम से बैठी है और बांस पर पीले केले लटके हैं।',
    items: [
      { emoji: '🍽️', name: 'Brass Platter with Pithas', nameHi: 'पीठे से सजी थाली', position: 'On the low wooden board' },
      { emoji: '🐱', name: 'Sleeping Grey Cat', nameHi: 'सोती हुई बिल्ली', position: 'Beside the warm woodpile' },
      { emoji: '🍌', name: 'Bunch of Yellow Bananas', nameHi: 'पीले केलों का गुच्छा', position: 'Hanging from the bamboo ceiling' },
      { emoji: '🪵', name: 'Dry Firewood Stack', nameHi: 'सूखी लकड़ियों का ढेर', position: 'In the corner' },
    ],
    questions: [
      {
        question: 'Which friendly animal was resting beside the woodpile?',
        questionHi: 'लकड़ी के ढेर के पास कौन सा जानवर आराम कर रहा था?',
        correctAnswer: 'A Calm Sleeping Cat',
        correctAnswerHi: 'आराम करती हुई बिल्ली',
        distractors: [
          { text: 'A barking dog', textHi: 'कुत्ता' },
          { text: 'A horned goat', textHi: 'बकरी' },
          { text: 'A monkey', textHi: 'बंदर' },
        ],
      },
      {
        question: 'What fruit was hanging from the ceiling beam?',
        questionHi: 'बांस की बल्ली से कौन सा फल लटका हुआ था?',
        correctAnswer: 'Bunch of Sweet Bananas',
        correctAnswerHi: 'पीले केलों का गुच्छा',
        distractors: [
          { text: 'Red apples', textHi: 'लाल सेब' },
          { text: 'Green mangoes', textHi: 'कच्चे आम' },
          { text: 'Sweet grapes', textHi: 'अंगूर' },
        ],
      },
      {
        question: 'How many steamed pithas were served on the plate?',
        questionHi: 'थाली में कितने पीठे रखे हुए थे?',
        correctAnswer: '3 Steamed Pithas',
        correctAnswerHi: '3 पीठे',
        distractors: [
          { text: '10 Pithas', textHi: '10 पीठे' },
          { text: '1 single piece', textHi: '1 पीठा' },
          { text: 'None', textHi: 'एक भी नहीं' },
        ],
      },
    ],
  },
  {
    id: 'scene_river_ferry_ghat',
    title: 'Evening Ferry Ghat by the River',
    titleHi: 'नदी किनारे शाम का नौका घाट',
    sceneEmoji: '🛶',
    elementsDescription: 'Brahmaputra river landing at dusk. A wooden rowboat tied to a bamboo pole, a fisherman holding a woven fishing polo, two white egret birds on the sandbank, and golden red sunset clouds across the sky.',
    elementsDescriptionHi: 'शाम के समय नदी का किनारा। बांस से बंधी लकड़ी की नाव, हाथ में पोलो जाली लिए मछुआरा, रेत पर 2 सफेद बगुले और आसमान में सुनहरी लाल शाम।',
    items: [
      { emoji: '🛶', name: 'Wooden Rowboat', nameHi: 'लकड़ी की नाव', position: 'Tied to the river landing' },
      { emoji: '🕊️', name: 'Two White Egrets', nameHi: 'दो सफेद बगुले', position: 'On the calm sandbank' },
      { emoji: '🎣', name: 'Bamboo Fishing Trap', nameHi: 'मछली पकड़ने का पोलो', position: 'Held in hand' },
      { emoji: '🌅', name: 'Golden Sunset Clouds', nameHi: 'सुनहरा सूर्यास्त', position: 'Across the wide river' },
    ],
    questions: [
      {
        question: 'How many white birds (egrets) were standing on the sandbank?',
        questionHi: 'रेत के किनारे कितने सफेद बगुले खड़े थे?',
        correctAnswer: 'Two (2) White Birds',
        correctAnswerHi: 'दो (2) बगुले',
        distractors: [
          { text: 'Five (5) birds', textHi: 'पाँच (5) पक्षी' },
          { text: 'Ten (10) birds', textHi: 'दस (10) पक्षी' },
          { text: 'No birds at all', textHi: 'एक भी नहीं' },
        ],
      },
      {
        question: 'What was tied to the bamboo post at the riverbank?',
        questionHi: 'नदी किनारे बांस के खंभे से क्या बंधा हुआ था?',
        correctAnswer: 'A Wooden Rowboat',
        correctAnswerHi: 'लकड़ी की नाव',
        distractors: [
          { text: 'A motor bicycle', textHi: 'मोटरसाइकिल' },
          { text: 'A bullock cart', textHi: 'बैलगाड़ी' },
          { text: 'A floating raft of drums', textHi: 'ड्रमों का बेड़ा' },
        ],
      },
    ],
  },
  {
    id: 'scene_monastery_courtyard',
    title: 'Monastery Morning Courtyard',
    titleHi: 'पहाड़ी बौद्ध मठ का प्रांगण',
    sceneEmoji: '🛕',
    elementsDescription: 'Himalayan mountain monastery in morning sunlight. Colorful prayer flags waving in the breeze, a bronze prayer wheel, a golden butter lamp glowing, and a monk walking with red robes.',
    elementsDescriptionHi: 'सुबह की धूप में शांत पहाड़ी मठ। हवा में लहराती रंग-बिरंगी पताकाएं, पीतल का प्रार्थना चक्र, जलता हुआ घी का दीपक और लाल वस्त्र पहने भिक्षु।',
    items: [
      { emoji: '🎏', name: 'Prayer Flags', nameHi: 'प्रार्थना पताकाएं', position: 'Strung between wooden poles' },
      { emoji: '🪔', name: 'Butter Lamp', nameHi: 'घी का दीया', position: 'On the stone altar' },
      { emoji: '🔔', name: 'Bronze Prayer Wheel', nameHi: 'कांस्य प्रार्थना चक्र', position: 'Along the wooden corridor' },
    ],
    questions: [
      {
        question: 'What was glowing on the stone altar?',
        questionHi: 'पत्थर की वेदी पर क्या जल रहा था?',
        correctAnswer: 'A Golden Butter Lamp',
        correctAnswerHi: 'घी का दीया (दीपक)',
        distractors: [
          { text: 'A bright flashlight', textHi: 'टॉर्च' },
          { text: 'A gas stove', textHi: 'गैस चूल्हा' },
          { text: 'A sparkler', textHi: 'फुलझड़ी' },
        ],
      },
      {
        question: 'What was waving between the poles in the mountain breeze?',
        questionHi: 'हवा में क्या लहरा रहा था?',
        correctAnswer: 'Colorful Prayer Flags',
        correctAnswerHi: 'रंग-बिरंगी प्रार्थना पताकाएं',
        distractors: [
          { text: 'Bed sheets', textHi: 'चादर' },
          { text: 'Wet clothes', textHi: 'गीले कपड़े' },
          { text: 'Plastic bags', textHi: 'पॉलीथीन' },
        ],
      },
    ],
  },
  {
    id: 'scene_orange_orchard',
    title: 'Khasi Hills Orange Harvest',
    titleHi: 'पहाड़ी संतरे के बाग की धूप',
    sceneEmoji: '🍊',
    elementsDescription: 'Sunlit orange orchard in the Meghalaya hills. Wicker baskets heaped with bright sweet mandarin oranges, wooden ladder resting on a tree, and a small dog resting on a wicker mat.',
    elementsDescriptionHi: 'मेघालय की पहाड़ियों में संतरे का बाग। ताज़े नारंगी संतरों से भरी टोकरियाँ, पेड़ से लगी लकड़ी की सीढ़ी और चटाई पर बैठा छोटा कुत्ता।',
    items: [
      { emoji: '🍊', name: 'Basket of Mandarins', nameHi: 'संतरों से भरी टोकरी', position: 'On the grass' },
      { emoji: '🪜', name: 'Wooden Ladder', nameHi: 'लकड़ी की सीढ़ी', position: 'Against the fruit tree' },
      { emoji: '🐕', name: 'Little Farm Dog', nameHi: 'छोटा पालतू कुत्ता', position: 'On the bamboo mat' },
    ],
    questions: [
      {
        question: 'What fruit filled the wicker harvest basket?',
        questionHi: 'टोकरी में कौन सा ताज़ा फल भरा हुआ था?',
        correctAnswer: 'Ripe Mandarin Oranges',
        correctAnswerHi: 'मीठे पके संतरे',
        distractors: [
          { text: 'Green cucumbers', textHi: 'खीरा' },
          { text: 'Potatoes', textHi: 'आलू' },
          { text: 'Coconuts', textHi: 'नारियल' },
        ],
      },
      {
        question: 'What was resting against the orange tree?',
        questionHi: 'पेड़ के सहारे क्या रखा हुआ था?',
        correctAnswer: 'A Wooden Ladder',
        correctAnswerHi: 'लकड़ी की सीढ़ी',
        distractors: [
          { text: 'A motorcycle', textHi: 'मोटरसाइकिल' },
          { text: 'A long iron pipe', textHi: 'लोहे का पाइप' },
          { text: 'A big umbrella', textHi: 'बड़ा छाता' },
        ],
      },
    ],
  },
  {
    id: 'scene_handloom_workshop',
    title: 'Village Handloom & Weaving Corner',
    titleHi: 'घर का हथकरघा और सूती धागे',
    sceneEmoji: '🧶',
    elementsDescription: 'Traditional wooden handloom in the courtyard. Red and white silk spools, a carved wooden shuttle resting on raw silk cloth, and a fresh brass tea cup on a low stool.',
    elementsDescriptionHi: 'आंगन में पारंपरिक लकड़ी का हथकरघा। लाल और सफेद रेशमी धागे, मूंगा रेशम पर रखी लकड़ी की माकू और मोढ़े पर रखी चाय की प्याली।',
    items: [
      { emoji: '🧵', name: 'Silk Shuttle (Maku)', nameHi: 'बुनाई की माकू', position: 'On the woven loom' },
      { emoji: '🧶', name: 'Red Thread Spools', nameHi: 'लाल धागे की रीले', position: 'In the cane basket' },
      { emoji: '☕', name: 'Warm Red Tea', nameHi: 'गर्म लाल चाय', position: 'On the bamboo stool' },
    ],
    questions: [
      {
        question: 'What was resting on the low bamboo stool?',
        questionHi: 'छोटे मोढ़े पर क्या रखा हुआ था?',
        correctAnswer: 'A Cup of Warm Tea',
        correctAnswerHi: 'गर्म चाय की प्याली',
        distractors: [
          { text: 'A pair of shoes', textHi: 'जूते' },
          { text: 'A heavy stone', textHi: 'पत्थर' },
          { text: 'A clock', textHi: 'घड़ी' },
        ],
      },
      {
        question: 'What tool was resting on the loom cloth to guide thread?',
        questionHi: 'करघे के कपड़े पर कौन सी लकड़ी की माकू रखी थी?',
        correctAnswer: 'Wooden Loom Shuttle (Maku)',
        correctAnswerHi: 'लकड़ी की माकू (शटल)',
        distractors: [
          { text: 'A garden shovel', textHi: 'खुरपी' },
          { text: 'A paintbrush', textHi: 'रंग का ब्रश' },
          { text: 'A fishing rod', textHi: 'बंसी' },
        ],
      },
    ],
  },
]
