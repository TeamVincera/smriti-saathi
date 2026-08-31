export interface TrayItem {
  id: string
  name: string
  nameHi: string
  nameAs?: string
  nameMni?: string
  emoji: string
}

export interface MemoryTrayScenario {
  id: string
  themeName: string
  themeNameHi: string
  themeNameAs?: string
  items: TrayItem[]
  distractors: TrayItem[]
}

export const MEMORY_TRAY_BANK: MemoryTrayScenario[] = [
  {
    id: 'morning_tea_tray',
    themeName: 'Morning Tea Tray',
    themeNameHi: 'सुबह की चाय की थाली',
    items: [
      { id: 'cup', name: 'Clay Tea Cup', nameHi: 'मिट्टी का कुल्हड़', emoji: '🍵' },
      { id: 'kettle', name: 'Brass Kettle', nameHi: 'केतली', emoji: '🫖' },
      { id: 'biscuit', name: 'Rusk Biscuit', nameHi: 'बिस्कुट / टोस्ट', emoji: '🍪' },
      { id: 'milk', name: 'Fresh Milk Pitcher', nameHi: 'दूध का लोटा', emoji: '🥛' },
      { id: 'ginger', name: 'Fresh Ginger Root', nameHi: 'अदरक का टुकड़ा', emoji: '🫚' },
    ],
    distractors: [
      { id: 'axe', name: 'Woodcutter Axe', nameHi: 'कुल्हाड़ी', emoji: '🪓' },
      { id: 'fish', name: 'River Fish', nameHi: 'मछली', emoji: '🐟' },
      { id: 'drum', name: 'Bihu Dhol', nameHi: 'ढोल', emoji: '🪘' },
    ],
  },
  {
    id: 'garden_harvest_tray',
    themeName: 'Garden Morning Harvest',
    themeNameHi: 'बगिया की ताज़ी सब्ज़ियाँ',
    items: [
      { id: 'tomato', name: 'Ripe Red Tomato', nameHi: 'लाल टमाटर', emoji: '🍅' },
      { id: 'lemon', name: 'Assam Kaji Nemu (Lemon)', nameHi: 'काज़ी नींबू', emoji: '🍋' },
      { id: 'chilli', name: 'Bhoot Jolokia (King Chilli)', nameHi: 'तेज लाल मिर्च', emoji: '🌶️' },
      { id: 'greens', name: 'Tender Mustard Leaves (Xaak)', nameHi: 'सरसों का साग', emoji: '🥬' },
      { id: 'brinjal', name: 'Purple Brinjal', nameHi: 'बैंगन', emoji: '🍆' },
    ],
    distractors: [
      { id: 'hammer', name: 'Iron Hammer', nameHi: 'हथौड़ा', emoji: '🔨' },
      { id: 'book', name: 'Reading Book', nameHi: 'किताब', emoji: '📖' },
      { id: 'pot', name: 'Clay Pot', nameHi: 'मटका', emoji: '🏺' },
    ],
  },
  {
    id: 'puja_prayer_tray',
    themeName: 'Morning Prayer Tray',
    themeNameHi: 'सुबह की पूजा की थाली',
    items: [
      { id: 'diya', name: 'Ghee Oil Lamp', nameHi: 'मिट्टी का दीया', emoji: '🪔' },
      { id: 'bell', name: 'Brass Prayer Bell', nameHi: 'पीतल की घंटी', emoji: '🔔' },
      { id: 'flower', name: 'Fresh Red Hibiscus', nameHi: 'गुड़हल का फूल', emoji: '🌺' },
      { id: 'incense', name: 'Fragrant Agarbatti', nameHi: 'सुगंधित धूपबत्ती', emoji: '🕯️' },
      { id: 'beads', name: 'Tulsi Japamala', nameHi: 'तुलसी की माला', emoji: '📿' },
    ],
    distractors: [
      { id: 'saw', name: 'Carpenter Saw', nameHi: 'आरी', emoji: '🪚' },
      { id: 'bicycle', name: 'Bicycle Bell', nameHi: 'साइकिल', emoji: '🚲' },
      { id: 'scissors', name: 'Cloth Scissors', nameHi: 'कैंची', emoji: '✂️' },
    ],
  },
  {
    id: 'sweet_pitha_tray',
    themeName: 'Bihu Festive Pitha Platter',
    themeNameHi: 'त्योहार के मीठे पीठे',
    items: [
      { id: 'til_pitha', name: 'Sesame Til Pitha Roll', nameHi: 'तिल पीठा', emoji: '🥖' },
      { id: 'ghila_pitha', name: 'Golden Fried Ghila Pitha', nameHi: 'घीला पीठा', emoji: '🍘' },
      { id: 'narikol_laru', name: 'Sweet Coconut Laru Laddu', nameHi: 'नारियल लड्डू', emoji: '🥥' },
      { id: 'jaggery', name: 'Sticky Palm Molasses (Gur)', nameHi: 'ताज़ा गुड़', emoji: '🍯' },
      { id: 'curd', name: 'Creamy Earthen Curd', nameHi: 'मिट्टी का मीठा दही', emoji: '🥣' },
    ],
    distractors: [
      { id: 'stone', name: 'River Pebble', nameHi: 'पत्थर', emoji: '🪨' },
      { id: 'umbrella', name: 'Umbrella', nameHi: 'छाता', emoji: '☂️' },
      { id: 'lock', name: 'Door Lock', nameHi: 'ताला', emoji: '🔒' },
    ],
  },
  {
    id: 'weaving_porch_tray',
    themeName: "Weaver's Bamboo Basket",
    themeNameHi: 'बुनकर की बांस की टोकरी',
    items: [
      { id: 'red_yarn', name: 'Bright Red Muga Yarn', nameHi: 'लाल रेशमी सूत', emoji: '🧶' },
      { id: 'needle', name: 'Smooth Steel Needle', nameHi: 'सिलाई सुई', emoji: '🪡' },
      { id: 'shuttle', name: 'Polished Loom Shuttle', nameHi: 'माकू (फिरकी)', emoji: '🧵' },
      { id: 'scissors', name: 'Tailor Scissors', nameHi: 'कपड़े की कैंची', emoji: '✂️' },
      { id: 'tape', name: 'Measuring Ribbon', nameHi: 'नापने का फीता', emoji: '📏' },
    ],
    distractors: [
      { id: 'pumpkin', name: 'Yellow Pumpkin', nameHi: 'कद्दू', emoji: '🎃' },
      { id: 'whistle', name: 'Metal Whistle', nameHi: 'सीटी', emoji: '📯' },
      { id: 'anchor', name: 'Boat Iron Anchor', nameHi: 'लंगर', emoji: '⚓' },
    ],
  },
  {
    id: 'kitchen_spice_tray',
    themeName: 'Grandmother Spice Box',
    themeNameHi: 'दादी का मसालदान',
    items: [
      { id: 'turmeric', name: 'Golden Turmeric Root', nameHi: 'साबुत हल्दी', emoji: '🟡' },
      { id: 'bay_leaf', name: 'Fragrant Tejpatta Leaf', nameHi: 'तेजपत्ता', emoji: '🍃' },
      { id: 'garlic', name: 'White Garlic Pods', nameHi: 'लहसुन की कलियां', emoji: '🧄' },
      { id: 'mustard', name: 'Mustard Seeds (Xoriyo)', nameHi: 'राई / सरसों के दाने', emoji: '🫘' },
      { id: 'black_pepper', name: 'Aromatic Black Pepper', nameHi: 'काली मिर्च', emoji: '⚫' },
    ],
    distractors: [
      { id: 'torch', name: 'Flashlight', nameHi: 'टॉर्च', emoji: '🔦' },
      { id: 'clock', name: 'Alarm Clock', nameHi: 'घड़ी', emoji: '⏰' },
      { id: 'ball', name: 'Rubber Ball', nameHi: 'गेंद', emoji: '⚽' },
    ],
  },
  {
    id: 'fruit_basket_tray',
    themeName: 'Hill Orchard Fruits',
    themeNameHi: 'पहाड़ी बगीचे के ताज़े फल',
    items: [
      { id: 'banana', name: 'Sweet Malbhog Banana', nameHi: 'मीठा मालभोग केला', emoji: '🍌' },
      { id: 'pineapple', name: 'Queen Pineapple', nameHi: 'रसीला अनानास', emoji: '🍍' },
      { id: 'orange', name: 'Khasi Mandarin Orange', nameHi: 'मीठा संतरा', emoji: '🍊' },
      { id: 'jackfruit', name: 'Golden Jackfruit (Kothal)', nameHi: 'पका कटहल', emoji: '🍈' },
      { id: 'papaya', name: 'Sweet Tree Papaya', nameHi: 'पपीता', emoji: '🥭' },
    ],
    distractors: [
      { id: 'wrench', name: 'Pipe Wrench', nameHi: 'पाना', emoji: '🔧' },
      { id: 'brick', name: 'Clay Brick', nameHi: 'ईंट', emoji: '🧱' },
      { id: 'spoon', name: 'Iron Spoon', nameHi: 'चम्मच', emoji: '🥄' },
    ],
  },
  {
    id: 'veranda_rest_tray',
    themeName: 'Afternoon Veranda Stand',
    themeNameHi: 'दोपहर की आराम की मेज़',
    items: [
      { id: 'fan', name: 'Palm Leaf Hand Fan', nameHi: 'हाथ का पंखा (बिचोनी)', emoji: '🪭' },
      { id: 'glasses', name: 'Reading Spectacles', nameHi: 'पढ़ने का चश्मा', emoji: '👓' },
      { id: 'newspaper', name: 'Daily News Sheet', nameHi: 'अखबार', emoji: '📰' },
      { id: 'radio', name: 'Wooden Small Radio', nameHi: 'छोटा रेडियो', emoji: '📻' },
      { id: 'water_glass', name: 'Cool Brass Water Glass', nameHi: 'पानी का गिलास', emoji: '🥛' },
    ],
    distractors: [
      { id: 'sickle', name: 'Harvest Sickle', nameHi: 'हँसिया', emoji: '🌾' },
      { id: 'spade', name: 'Garden Shovel', nameHi: 'फावड़ा', emoji: '⛏️' },
      { id: 'pottery', name: 'Heavy Jar', nameHi: 'बड़ा मटका', emoji: '🏺' },
    ],
  },
  {
    id: 'bazaar_bag_tray',
    themeName: 'Weekly Haat Basket',
    themeNameHi: 'साप्ताहिक हाट का थैला',
    items: [
      { id: 'fish', name: 'Fresh Rohu River Fish', nameHi: 'ताज़ी रोहू मछली', emoji: '🐟' },
      { id: 'betel', name: 'Green Paan Leaves', nameHi: 'ताज़े पान के पत्ते', emoji: '🍃' },
      { id: 'nut', name: 'Betel Nut (Tamol)', nameHi: 'सुपारी', emoji: '🌰' },
      { id: 'purse', name: 'Woven Coin Purse', nameHi: 'सिक्कों की थैली', emoji: '💰' },
      { id: 'greens', name: 'Fresh Bamboo Shoot (Khorisa)', nameHi: 'ताज़ा बांस का करील', emoji: '🎍' },
    ],
    distractors: [
      { id: 'ladder', name: 'Bamboo Ladder', nameHi: 'सीढ़ी', emoji: '🪜' },
      { id: 'glove', name: 'Winter Glove', nameHi: 'दस्ताना', emoji: '🧤' },
      { id: 'kettle', name: 'Old Stove', nameHi: 'चूल्हा', emoji: '🔥' },
    ],
  },
  {
    id: 'flower_garden_tray',
    themeName: 'Spring Orchid Bouquet',
    themeNameHi: 'वसंत ऋतु के खिले फूल',
    items: [
      { id: 'kopou', name: 'Foxtail Kopou Phool (Bihu Orchid)', nameHi: 'कपौ फूल (ऑर्किड)', emoji: '🌸' },
      { id: 'lotus', name: 'Pond Pink Lotus (Padum)', nameHi: 'तालाब का कमल', emoji: '🪷' },
      { id: 'marigold', name: 'Bright Yellow Genda (Marigold)', nameHi: 'गेंदे का पीला फूल', emoji: '🌼' },
      { id: 'rose', name: 'Country Red Rose', nameHi: 'देसी लाल गुलाब', emoji: '🌹' },
      { id: 'sunflower', name: 'Courtyard Sunflower', nameHi: 'सूरजमुखी', emoji: '🌻' },
    ],
    distractors: [
      { id: 'shoe', name: 'Walking Shoe', nameHi: 'जूता', emoji: '👞' },
      { id: 'bucket', name: 'Water Bucket', nameHi: 'बाल्टी', emoji: '🪣' },
      { id: 'key', name: 'House Key', nameHi: 'चाबी', emoji: '🔑' },
    ],
  },
]
