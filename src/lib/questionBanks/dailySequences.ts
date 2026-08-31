export interface SequenceStep {
  emoji: string
  label: string
  labelHi?: string
  labelAs?: string
  labelMni?: string
}

export interface SequenceStory {
  id: string
  title: string
  titleHi: string
  titleAs?: string
  titleMni?: string
  category: 'daily' | 'cooking' | 'craft' | 'farming' | 'ceremony'
  steps: SequenceStep[]
}

export const SEQUENCE_BANK: SequenceStory[] = [
  {
    id: 'seq_making_tea',
    title: 'Making Warm Assam Milk Tea',
    titleHi: 'गरमागरम असमिया चाय बनाना',
    titleAs: 'চাহ বনোৱা',
    titleMni: 'চা শেম্বা',
    category: 'cooking',
    steps: [
      { emoji: '🔥', label: 'Light the stove fire', labelHi: 'चूल्हा जलाना' },
      { emoji: '🫖', label: 'Boil fresh water in the kettle', labelHi: 'केतली में पानी उबालना' },
      { emoji: '🍃', label: 'Add rich Assam tea leaves', labelHi: 'असम चाय की पत्तियाँ डालना' },
      { emoji: '🥛', label: 'Pour in warm fresh milk', labelHi: 'दूध मिलाना' },
      { emoji: '🍵', label: 'Pour aromatic tea into cups', labelHi: 'प्यालों में चाय छानना' },
    ],
  },
  {
    id: 'seq_cooking_rice',
    title: 'Cooking Fragrant Rice (Bhaat)',
    titleHi: 'चावल (भात) पकाना',
    titleAs: 'ভাত ৰন্ধা',
    titleMni: 'চাক থোংবা',
    category: 'cooking',
    steps: [
      { emoji: '🌾', label: 'Measure clean white rice', labelHi: 'चावल नापना' },
      { emoji: '💧', label: 'Wash grains with clean water', labelHi: 'चावल को पानी से धोना' },
      { emoji: '🍲', label: 'Put into the cooking pot', labelHi: 'हाँडी में पानी के साथ डालना' },
      { emoji: '🔥', label: 'Simmer gently on the stove', labelHi: 'धीमी आंच पर पकाना' },
      { emoji: '🍚', label: 'Serve hot fluffy rice on thali', labelHi: 'थाली में गरमागरम परोसना' },
    ],
  },
  {
    id: 'seq_preparing_tamol',
    title: 'Preparing Betel Nut (Tamol-Paan)',
    titleHi: 'तामोल (सुपारी-पान) तैयार करना',
    titleAs: 'তামোল-পাণ সজোৱা',
    titleMni: 'ক্বা শেম্বা',
    category: 'daily',
    steps: [
      { emoji: '🌰', label: 'Take raw green betel nut', labelHi: 'कच्ची सुपारी लेना' },
      { emoji: '✂️', label: 'Slice with the brass cutter', labelHi: 'सरोते से टुकड़े काटना' },
      { emoji: '🍃', label: 'Wash fresh green Paan leaf', labelHi: 'पान का पत्ता धोना' },
      { emoji: '🤍', label: 'Spread a touch of white lime', labelHi: 'हल्का सा चूना लगाना' },
      { emoji: '🍱', label: 'Fold neatly on the brass Bata', labelHi: 'पानदान में सजाना' },
    ],
  },
  {
    id: 'seq_lighting_lamp',
    title: 'Lighting the Evening Courtyard Lamp',
    titleHi: 'संध्या समय तुलसी का दीया जलाना',
    titleAs: 'সন্ধ্যাৰ চাকি জ্বলোৱা',
    titleMni: 'সন্ধ্যা থাউমৈ থানবা',
    category: 'ceremony',
    steps: [
      { emoji: '🏺', label: 'Clean the small clay diya', labelHi: 'मिट्टी का दीया साफ़ करना' },
      { emoji: '🛢️', label: 'Pour pure mustard oil', labelHi: 'सरसों का तेल डालना' },
      { emoji: '🧵', label: 'Roll and set the cotton wick', labelHi: 'रुई की बाती लगाना' },
      { emoji: '🔥', label: 'Light the gentle warm flame', labelHi: 'दीपक प्रज्वलित करना' },
      { emoji: '🙏', label: 'Place under the Tulsi plant with prayer', labelHi: 'तुलसी के पास रखकर प्रणाम करना' },
    ],
  },
  {
    id: 'seq_morning_routine',
    title: 'Waking Up in the Morning',
    titleHi: 'सुबह उठने की दिनचर्या',
    titleAs: 'ৰাতিপুৱাৰ দিনচৰ্যা',
    titleMni: 'অয়ুক্কী থবক',
    category: 'daily',
    steps: [
      { emoji: '🌅', label: 'Wake up with the morning birds', labelHi: 'सुबह चिड़ियों की आवाज़ के साथ उठना' },
      { emoji: '🪥', label: 'Wash face and brush teeth', labelHi: 'मुंह-हाथ धोना और ब्रश करना' },
      { emoji: '🚶', label: 'Take a calm morning stroll in the garden', labelHi: 'बगिया में सुबह की ताज़ी सैर' },
      { emoji: '🍵', label: 'Enjoy breakfast with warm tea', labelHi: 'चाय और नाश्ता करना' },
    ],
  },
  {
    id: 'seq_evening_to_sleep',
    title: 'Evening Relax & Sleep',
    titleHi: 'शाम से रात की सुखद नींद',
    titleAs: 'গধূলিৰ পৰা টোপনি',
    titleMni: 'নুমিদাংগী তুম্বা',
    category: 'daily',
    steps: [
      { emoji: '🌇', label: 'Watch the calm evening sunset', labelHi: 'शाम का शांत सूर्यास्त देखना' },
      { emoji: '🍲', label: 'Have light nourishing dinner', labelHi: 'हल्का सुपाच्य भोजन करना' },
      { emoji: '💊', label: 'Take evening medicine on time', labelHi: 'समय पर रात की दवाई लेना' },
      { emoji: '🛏️', label: 'Rest comfortably in bed for sweet dreams', labelHi: 'बिस्तर पर आराम से सो जाना' },
    ],
  },
  {
    id: 'seq_making_pitha',
    title: 'Steaming Festive Til Pitha',
    titleHi: 'पारंपरिक तिल पीठा बनाना',
    titleAs: 'তিল পিঠা বনোৱা',
    titleMni: 'তিল পিথা শেম্বা',
    category: 'cooking',
    steps: [
      { emoji: '🌾', label: 'Soak and grind sticky Bora rice flour', labelHi: 'चावल का बारीक आटा तैयार करना' },
      { emoji: '🍯', label: 'Mix roasted black sesame with jaggery', labelHi: 'काले तिल और गुड़ का मिश्रण बनाना' },
      { emoji: '🍳', label: 'Spread rice flour thin on hot tawa', labelHi: 'गर्म तवे पर आटा फैलाना' },
      { emoji: '🤲', label: 'Place sesame filling and roll gently', labelHi: 'तिल भरकर सावधानी से मोड़ना' },
      { emoji: '🫓', label: 'Crisp golden pitha ready to share', labelHi: 'स्वादिष्ट पीठा तैयार' },
    ],
  },
  {
    id: 'seq_weaving_gamosa',
    title: 'Weaving a Red Floral Gamosa',
    titleHi: 'हथकरघे पर गमोसा बुनना',
    titleAs: 'গামোচা বোৱা',
    titleMni: 'খুদৈ শেম্বা',
    category: 'craft',
    steps: [
      { emoji: '🧶', label: 'Mount white cotton threads on loom', labelHi: 'करघे पर सफेद ताना लगाना' },
      { emoji: '🧵', label: 'Thread shuttle with bright red yarn', labelHi: 'माकू में लाल धागा पिरोना' },
      { emoji: '🎋', label: 'Press wooden pedal and throw shuttle', labelHi: 'पैडल दबाकर शटल चलाना' },
      { emoji: '🌺', label: 'Weave floral border motifs (Phulam)', labelHi: 'लाल फूलों की नक्काशी बुनना' },
      { emoji: '🧣', label: 'Uncut holy finished Gamosa', labelHi: 'सुंदर गमोसा तैयार होना' },
    ],
  },
  {
    id: 'seq_harvesting_paddy',
    title: 'Harvesting Golden Winter Paddy',
    titleHi: 'खेतों में पके धान की कटाई',
    titleAs: 'ধান কটা',
    titleMni: 'ফৌ য়েনবা',
    category: 'farming',
    steps: [
      { emoji: '🌾', label: 'Inspect ripe golden paddy ears', labelHi: 'सुनहरी पकी बालियों को देखना' },
      { emoji: '🌾', label: 'Cut stalks close to ground with sickle', labelHi: 'हँसिये से पौधे काटना' },
      { emoji: '🧺', label: 'Tie into neat bundles (Muti)', labelHi: 'धान के पूले बांधना' },
      { emoji: '🐂', label: 'Thresh grains in the sunny threshing floor', labelHi: 'खलिहान में दाने अलग करना' },
      { emoji: '🏠', label: 'Store golden grains in granary (Bharal)', labelHi: 'कोठी में अनाज सुरक्षित रखना' },
    ],
  },
  {
    id: 'seq_planting_orchid',
    title: 'Planting a Wild Native Orchid',
    titleHi: 'बगिया में सुंदर ऑर्किड लगाना',
    titleAs: 'কপৌ ফুল ৰোৱা',
    titleMni: 'লৈ থাবা',
    category: 'farming',
    steps: [
      { emoji: '🌱', label: 'Select healthy orchid shoot', labelHi: 'स्वस्थ ऑर्किड की पौध चुनना' },
      { emoji: '🪴', label: 'Prepare charcoal and coconut husk in pot', labelHi: 'नारियल के छिलके और मिट्टी तैयार करना' },
      { emoji: '🤲', label: 'Secure roots gently to the tree branch', labelHi: 'शाखा पर जड़ें स्थापित करना' },
      { emoji: '💧', label: 'Mist softly with fresh clean water', labelHi: 'हल्का सा पानी छिड़कना' },
      { emoji: '🌸', label: 'Watch fragrant flowers bloom in spring', labelHi: 'वसंत में सुंदर फूल खिलते देखना' },
    ],
  },
  {
    id: 'seq_going_to_bazaar',
    title: 'A Morning Trip to the Village Haat',
    titleHi: 'सुबह के हाट-बाज़ार जाना',
    titleAs: 'বজাৰলৈ যোৱা',
    titleMni: 'কৈথেল চৎপা',
    category: 'daily',
    steps: [
      { emoji: '🧺', label: 'Pick up the sturdy wicker bag', labelHi: 'बांस का थैला हाथ में लेना' },
      { emoji: '💰', label: 'Keep coin purse safely in pocket', labelHi: 'बटुए में पैसे रखना' },
      { emoji: '🚶', label: 'Walk along the green village path', labelHi: 'रास्ते से बाज़ार की ओर चलना' },
      { emoji: '🍅', label: 'Choose fresh tomatoes and river fish', labelHi: 'ताज़ी सब्ज़ियाँ और मछली लेना' },
      { emoji: '🏠', label: 'Return home happily to the family', labelHi: 'प्रसन्न होकर घर लौटना' },
    ],
  },
  {
    id: 'seq_bathing_dressing',
    title: 'Refreshing Bath & Clean Clothes',
    titleHi: 'स्नान और स्वच्छ वस्त्र पहनना',
    titleAs: 'গা ধোৱা আৰু কাপোৰ পিন্ধা',
    titleMni: 'ঈরু বা',
    category: 'daily',
    steps: [
      { emoji: '💧', label: 'Draw lukewarm fresh water', labelHi: 'गुनगुना पानी लेना' },
      { emoji: '🧼', label: 'Wash gently and rinse cleanly', labelHi: 'अच्छी तरह स्नान करना' },
      { emoji: '🧖', label: 'Dry comfortably with soft towel', labelHi: 'मुलायम तौलिए से पोंछना' },
      { emoji: '👕', label: 'Wear clean, comfortable cotton clothes', labelHi: 'साफ़-सुथरे सूती कपड़े पहनना' },
    ],
  },
]
