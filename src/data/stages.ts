export interface LoveStage {
  id: string;
  number: number;
  roman: string;
  hindi: string;
  urdu: string;
  english: string;
  meaning: string;
  description: string;
  line: {
    hinglish: string;
    hindi: string;
    urdu: string;
    english: string;
  };
  relatedWords: string[];
}

/**
 * Saat Muqaam-e-Ishq — the seven stations of love recognised in the Urdu
 * ghazal tradition. The order is traditional: attraction deepens into
 * devotion, obsession, and finally the dissolution of the self.
 */
export const LOVE_STAGES: LoveStage[] = [
  {
    id: "dilkashi",
    number: 1,
    roman: "Dilkashi",
    hindi: "दिलकशी",
    urdu: "دلکشی",
    english: "Attraction",
    meaning: "The first pull — when someone becomes magnetic before they become familiar.",
    description:
      "Dilkashi is the opening station: the unnamed pull that makes a crowded room rearrange itself around one person. It is not yet love, and it does not need to be. Classical poets treat dilkashi as a glance that arrives before language — a scent, a laugh, the way someone holds a cup of chai. The beloved is still a stranger, but the heart has already begun taking notes. In the ghazal, dilkashi is usually written with restraint, because the first stage is defined by what has not yet been said. Its beauty is its uncertainty.",
    line: {
      hinglish: "Pehli nazar mein hi dil ka rasta badal gaya,",
      hindi: "पहली नज़र में ही दिल का रास्ता बदल गया,",
      urdu: "پہلی نظر میں ہی دل کا راستہ بدل گیا،",
      english: "The heart changed its route at the very first glance.",
    },
    relatedWords: ["tagaful", "mahtab", "rooh"],
  },
  {
    id: "uns",
    number: 2,
    roman: "Uns",
    hindi: "उंस",
    urdu: "اُنس",
    english: "Attachment",
    meaning: "The comfort of presence — when absence starts to feel like a small injury.",
    description:
      "Uns is the quietest station of love, and often the truest. It is the habit of a voice, the expectation of a message, the chair that feels wrong when it is empty. In Urdu poetry, uns is written through ordinary details: shared tea, a familiar seat, a name that appears on the phone before the notification does. Unlike the drama of ishq, uns asks for nothing except continuation. This is why it is so vulnerable. A heart that has learned someone's rhythm cannot simply unlearn it when they leave.",
    line: {
      hinglish: "Tumhaari aadat lag gayi thi, ab chhodna mushkil hai,",
      hindi: "तुम्हारी आदत लग गई थी, अब छोड़ना मुश्किल है,",
      urdu: "تمہاری عادت لگ گئی تھی، اب چھوڑنا مشکل ہے،",
      english: "I grew used to you; letting go is the hard part now.",
    },
    relatedWords: ["qurbat", "guftagu", "intezaar"],
  },
  {
    id: "ishq",
    number: 3,
    roman: "Ishq",
    hindi: "इश्क़",
    urdu: "عشق",
    english: "Love",
    meaning: "The fire that reorganises the self — love as a demand, not a decoration.",
    description:
      "Ishq is the station where love stops being a pleasant feeling and becomes a force with consequences. It is not the same as mohabbat, which can be tender and domestic. Ishq is excessive by definition: it rearranges priorities, makes fools of careful people, and refuses to be measured. Ghalib writes it as a condition that arrives uninvited and stays past permission. In the modern Hinglish idiom, ishq survives in phrases like 'poori duniya jeet liya' and 'uske baad kuch bacha nahi' — the language of a heart that has already lost its old shape.",
    line: {
      hinglish: "Ishq wo aag nahi jo bujh jaaye baarish se,",
      hindi: "इश्क़ वो आग नहीं जो बुझ जाए बारिश से,",
      urdu: "عشق وہ آگ نہیں جو بجھ جائے بارش سے،",
      english: "Ishq is not a fire that rain can put out.",
    },
    relatedWords: ["ishq", "arzoo", "firaaq"],
  },
  {
    id: "aqeedat",
    number: 4,
    roman: "Aqeedat",
    hindi: "अक़ीदत",
    urdu: "عقیدت",
    english: "Reverence",
    meaning: "Love that looks upward — respect so deep that it becomes a form of prayer.",
    description:
      "Aqeedat is the station where admiration becomes reverence. The beloved is no longer merely beautiful; they are worthy of devotion, and the lover becomes a student of their smallest habits. This is the stage that gives Urdu poetry its shrine imagery — footsteps treated like relics, a name repeated like a mantra. Aqeedat is generous but dangerous, because it can turn a human being into an idol. The healthiest aqeedat keeps the beloved human: it honours their flaws instead of editing them into perfection.",
    line: {
      hinglish: "Tumhaare qadmon mein jannat nahi, bas sukoon hai,",
      hindi: "तुम्हारे क़दमों में जन्नत नहीं, बस सुकून है,",
      urdu: "تمہارے قدموں میں جنت نہیں، بس سکون ہے،",
      english: "There is no heaven at your feet — only a deep peace.",
    },
    relatedWords: ["qurbat", "wafa", "rooh"],
  },
  {
    id: "ibadat",
    number: 5,
    roman: "Ibadat",
    hindi: "इबादत",
    urdu: "عبادت",
    english: "Devotion",
    meaning: "Love practised daily — affection expressed as service, patience, and ritual.",
    description:
      "Ibadat is love with calloused hands. It is the stage where the lover shows up not with a grand gesture but with a thousand small consistencies: remembering the tea without sugar, sitting through a story that has been told before, staying awake for a delayed train. The Sufi tradition places ibadat close to divine love, because both require discipline rather than mood. In the ghazal, this stage is often written in the language of worship — sajda, dua, roza — but its real subject is the everyday labour of caring for someone without asking for applause.",
    line: {
      hinglish: "Tumhe chahna koi ibadat se kam toh nahi,",
      hindi: "तुम्हें चाहना कोई इबादत से कम तो नहीं,",
      urdu: "تمہیں چاہنا کوئی عبادت سے کم تو نہیں،",
      english: "Loving you is no less than an act of devotion.",
    },
    relatedWords: ["wafa", "saaqi", "aab-e-hayat"],
  },
  {
    id: "junoon",
    number: 6,
    roman: "Junoon",
    hindi: "जुनून",
    urdu: "جنون",
    english: "Obsession",
    meaning: "Love beyond reason — the stage that makes a person brilliant and unwell.",
    description:
      "Junoon is the station where love exceeds its container. It is the madness of Majnoon, the sleeplessness of the lover who reads the same message forty times, the urge to walk across a city at midnight because a window is still lit. Urdu poetry respects junoon without romanticising its cost. It can produce great art, but it can also burn through friendships, work, and self-respect. The mature ghazal does not celebrate junoon blindly; it records its fever with a steady hand, making the reader feel both the heat and the warning.",
    line: {
      hinglish: "Junoon ki hadd se guzar gaye, ab hosh kahan aaye,",
      hindi: "जुनून की हद से गुज़र गए, अब होश कहाँ आए,",
      urdu: "جنون کی حد سے گزر گئے، اب ہوش کہاں آئے،",
      english: "I crossed the limits of obsession; where would sanity find me now?",
    },
    relatedWords: ["vehshat", "qafas", "dil-e-nadaan"],
  },
  {
    id: "fanaa",
    number: 7,
    roman: "Fanaa",
    hindi: "फ़ना",
    urdu: "فنا",
    english: "Annihilation",
    meaning: "The final dissolution — when the lover's self disappears into the beloved or the divine.",
    description:
      "Fanaa is the last station of the Sufi path and the most radical idea in the ghazal. It means extinction: the lover's separate self dissolves, and what remains is only love itself. In poetry, fanaa is often written as a paradox — losing everything and finally becoming free. The beloved may be a person, or God, or the act of poetry itself. Fanaa is not merely heartbreak; it is transformation. The person who returns from this stage is not the same person who entered it. The old name stays, but the ego inside it has been quietly buried.",
    line: {
      hinglish: "Main mit gaya toh kya hua, ishq toh naam reh gaya,",
      hindi: "मैं मिट गया तो क्या हुआ, इश्क़ तो नाम रह गया,",
      urdu: "میں مٹ گیا تو کیا ہوا، عشق تو نام رہ گیا،",
      english: "What if I was erased? Love itself survived with my name.",
    },
    relatedWords: ["justajoo", "rooh", "aab-e-hayat"],
  },
];

export const getStageBySlug = (slug: string) => LOVE_STAGES.find((stage) => stage.id === slug);
