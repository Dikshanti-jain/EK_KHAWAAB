export type Word = {
  roman: string;
  hindi: string;
  urdu: string;
  say: string;
  meaning: string;
  context: string;
  example: string;
  slug?: string;
  origin?: string;
  nuance?: string;
  secondaryExample?: {
    hinglish: string;
    hindi: string;
    urdu: string;
    poet?: string;
  };
};

export const LUGHAT: Word[] = [
  {
    roman: "Tagaful",
    slug: "tagaful",
    hindi: "तग़ाफ़ुल",
    urdu: "تغافل",
    say: "ta-gaa-ful",
    origin: "Arabic (تغافل) via Classical Urdu",
    meaning: "Intentional neglect or feigned indifference",
    context: "The beloved who is fully aware of your longing, yet deliberately looks away.",
    nuance: "In classical ghazal traditions (Mirza Ghalib, Momin, Jaun Elia), tagaful is considered an exquisite, cruel ornament of the beloved. The shayar celebrates the cruelty because even feigned ignorance proves the beloved noticed him.",
    example: "Tera tagaful bhi ek ada hai, ye maan liya humne",
    secondaryExample: {
      hinglish: "Hum ko un se wafa ki hai umeed, jo nahi jaante wafa kya hai.",
      hindi: "हम को उन से वफ़ा की है उम्मीद, जो नहीं जानते वफ़ा क्या है।",
      urdu: "ہم کو ان سے وفا کی ہے امید، جو نہیں جانتے وفا کیا ہے",
      poet: "Mirza Ghalib"
    }
  },
  {
    roman: "Hijr",
    slug: "hijr",
    hindi: "हिज्र",
    urdu: "ہجر",
    say: "hij-r",
    origin: "Arabic (هجر) – Separation, migration, departure",
    meaning: "Separation, estrangement, the pain of being apart",
    context: "The long, solitary night of separation from the beloved.",
    nuance: "Hijr is the sacred crucible of Urdu poetry. Without hijr, true ishq cannot be tested. In Faiz and Jaun Elia, hijr evolves from romantic absence into existential loneliness and longing for home.",
    example: "Hijr ki raat bhi kat jaati hai, aadat ho jaaye to",
    secondaryExample: {
      hinglish: "Hijr ki shab bhi guzar jaati hai aahista aahista, bas ek chiraagh hai jo subah tak nahi bujhta.",
      hindi: "हिज्र की शब भी गुज़र जाती है आहिस्ता आहिस्ता, बस एक चिराग़ है जो सुबह तक नहीं बुझता।",
      urdu: "ہجر کی شب بھی گزر جاتی ہے آہستہ آہستہ، بس ایک چراغ ہے جو صبح تک نہیں بجھتا",
      poet: "Banjara Khawaab"
    }
  },
  {
    roman: "Vehshat",
    slug: "vehshat",
    hindi: "वहशत",
    urdu: "وحشت",
    say: "veh-shat",
    origin: "Arabic (وحشة) – Desolation, wild solitude",
    meaning: "Wild restlessness, bewildered frenzy of the heart",
    context: "A profound frenzy born of overwhelming sorrow or beauty.",
    nuance: "Vehshat represents the stage of love where social norms and domestic decorum tear apart. The shayar wanders the wilderness (sehra) like Majnoon, unable to endure four walls.",
    example: "Vehshat mein bhi ek tarteeb rakhi humne"
  },
  {
    roman: "Musalsal",
    slug: "musalsal",
    hindi: "मुसलसल",
    urdu: "مسلسل",
    say: "mu-sal-sal",
    origin: "Arabic (مسلسل) – Chained, linked consecutively",
    meaning: "Continuous, uninterrupted, unceasing",
    context: "Something persistent that never relents — usually memory or rain.",
    nuance: "Used to describe perpetual emotional currents: unbroken tears, continuous rain against a window, or unceasing contemplation of a past love.",
    example: "Musalsal teri yaad ka mausam hai",
    secondaryExample: {
      hinglish: "Teri purani tasveer musalsal dekhi, ab aankhein bhi kaagaz ki tarah bhigti hain.",
      hindi: "तेरी पुरानी तस्वीर मुसलसल देखी, अब आँखें भी काग़ज़ की तरह भीगती हैं।",
      urdu: "تیری پرانی تصویر مسلسل دیکھی، اب آنکھیں بھی کاغذ کی طرح بھیگتی ہیں",
      poet: "Siyahi Qaasid"
    }
  },
  {
    roman: "Qurbat",
    slug: "qurbat",
    hindi: "क़ुर्बत",
    urdu: "قربت",
    say: "qur-bat",
    origin: "Arabic (قربة) – Nearness, intimate proximity",
    meaning: "Intimate closeness, spiritual or physical nearness",
    context: "Nearness that is felt in the heart rather than measured by distance.",
    nuance: "In contemporary Hindustani poetry, qurbat is the gentle antidote to firaaq. Yet irony often persists: two people can share physical qurbat while remaining miles apart spiritually.",
    example: "Qurbat mein bhi faasle the, ye kisne jaana",
    secondaryExample: {
      hinglish: "Tumne chai mein cheeni kam daali thi, qurbat ka swaad phir bhi meetha tha.",
      hindi: "तुमने चाय में चीनी कम डाली थी, क़ुर्बत का स्वाद फिर भी मीठा था।",
      urdu: "تم نے چائے میں چینی کم ڈالی تھی، قربت کا سواد پھر بھی میٹھا تھا",
      poet: "Shab-e-Farda"
    }
  },
  {
    roman: "Firaaq",
    slug: "firaaq",
    hindi: "फ़िराक़",
    urdu: "فراق",
    say: "fi-raaq",
    origin: "Arabic (فراق) – Parting, disunion",
    meaning: "Pain of parting, grief of absence",
    context: "The lingering ache that stays behind when someone departs.",
    nuance: "While hijr is the state of separation, firaaq is the active sting and wound of the moment of separation. Firaaq Gorakhpuri famously adopted this word as his takhallus.",
    example: "Firaaq ka mausam bhi guzar jaayega"
  },
  {
    roman: "Arzoo",
    slug: "arzoo",
    hindi: "आरज़ू",
    urdu: "آرزو",
    say: "aar-zoo",
    origin: "Persian (آرزو) – Wish, earnest yearning",
    meaning: "Deep heart-felt desire, tender longing",
    context: "A gentle yet immortal wish that defines a person's inner journey.",
    nuance: "Unlike worldly ambition (tamanna or hawas), arzoo in poetry is delicate, sacred, and often happily unfulfilled so that devotion remains pure.",
    example: "Ek arzoo thi, adhoori hi sahi"
  },
  {
    roman: "Rooh",
    slug: "rooh",
    hindi: "रूह",
    urdu: "روح",
    say: "rooh",
    origin: "Arabic / Semitic (روح) – Breath, spirit, essence",
    meaning: "Soul, spirit, inner breath",
    context: "The timeless essence of a person that outlives the physical body.",
    nuance: "In Sufi poetry (Rumi, Bulleh Shah, Amir Khusro), rooh is the lover waiting to merge back into the Divine Beloved.",
    example: "Rooh tak utar gayi teri baat"
  },
  {
    roman: "Ishq",
    slug: "ishq",
    hindi: "इश्क़",
    urdu: "عشق",
    say: "ishq",
    origin: "Arabic (عشق) – From 'Ashaqa', the ivy that clings and entwines",
    meaning: "Passionate, all-consuming transcendent love",
    context: "Love that consumes the ego rather than merely comforting the senses.",
    nuance: "Differentiated from 'Mohabbat' (affection) or 'Pyar' (fondness). Ishq is an uncontrollable fire that burns away pride and rationality.",
    example: "Ishq ne Ghalib nikamma kar diya"
  },
  {
    roman: "Shab-e-Gham",
    slug: "shab-e-gham",
    hindi: "शब-ए-ग़म",
    urdu: "شبِ غم",
    say: "shab-e-gham",
    origin: "Persian compound (شب + غم) – Night + Grief",
    meaning: "Night of sorrow, nocturnal solitude of the heartbroken",
    context: "The sleepless, stretching night where silence echoes past memories.",
    nuance: "A staple motif of Urdu elegies and ghazals. Shab-e-Gham has no clock; it only ends when tears dry or morning brings its cold light.",
    example: "Shab-e-gham ki sehar nahi hoti, jab tak aansu na tham jaayein"
  },
  {
    roman: "Guftagu",
    slug: "guftagu",
    hindi: "गुफ़्तगू",
    urdu: "گفتگو",
    say: "guf-ta-goo",
    origin: "Persian (گفتگو) – Conversation, intimate speech",
    meaning: "Heart-to-heart conversation, poetic dialogue",
    context: "Speaking between two souls where unsaid pauses matter as much as words.",
    nuance: "In romance, guftagu transcends voice. When two gazes meet or hands touch, a silent guftagu unfolds.",
    example: "Khamoshi se bhi guftagu ho jaati hai jab nazrein milti hain"
  },
  {
    roman: "Mukarrar",
    slug: "mukarrar",
    hindi: "मुक़र्रर",
    urdu: "مقرر",
    say: "mu-kar-rar",
    origin: "Arabic (مكرر) – Repeated, recited once more",
    meaning: "Encore! Call to repeat a beautiful couplet",
    context: "The spontaneous collective cry of the mehfil audience when a sher touches the heart.",
    nuance: "In Mushaira etiquette, shouting 'Mukarrar!' or 'Irshaad!' is the highest honor a listener bestows upon a poet.",
    example: "Har misre pe mehfil se aawaaz aayi: Mukarrar! Irshaad!"
  },
  {
    roman: "Shab",
    slug: "shab",
    hindi: "शब",
    urdu: "شب",
    say: "shab",
    origin: "Persian (شب) – Night",
    meaning: "Night, darkness, the hour of truth",
    context: "In shayari, night is the sanctuary where pretense falls away.",
    example: "Shab bhar jaage, subah ne kuch na poocha"
  },
  {
    roman: "Gham",
    slug: "gham",
    hindi: "ग़म",
    urdu: "غم",
    say: "gham",
    origin: "Arabic (غم) – Grief, sorrow",
    meaning: "Sorrow, melancholy, grief worn with quiet dignity",
    context: "Grief embraced almost as an old friend or teacher.",
    example: "Gham ko bhi humne mehmaan banaya"
  },
  {
    roman: "Justajoo",
    slug: "justajoo",
    hindi: "जुस्तजू",
    urdu: "جستجو",
    say: "jus-ta-joo",
    origin: "Persian (جستجو) – In search, seeking",
    meaning: "Quest, tireless inner search",
    context: "The journey of seeking truth or love that becomes a purpose in itself.",
    example: "Teri justajoo mein khud ko kho diya"
  },
  {
    roman: "Qafas",
    slug: "qafas",
    hindi: "क़फ़स",
    urdu: "قفس",
    say: "qa-fas",
    origin: "Arabic (قفص) – Cage, birdcage",
    meaning: "Cage, invisible prison of habit or society",
    context: "A cage — often one made of our own routines and fears.",
    example: "Qafas khula tha, parinda phir bhi na gaya"
  },
  {
    roman: "Mahtab",
    slug: "mahtab",
    hindi: "महताब",
    urdu: "مہتاب",
    say: "meh-taab",
    origin: "Persian (مهتاب) – Moonlight, the full moon",
    meaning: "Moonlight, radiant beloved",
    context: "The beloved's radiant countenance or the moon witnessing nocturnal loneliness.",
    example: "Mahtab bhi chhat pe utra tha us raat"
  },
  {
    roman: "Aftab",
    slug: "aftab",
    hindi: "आफ़ताब",
    urdu: "آفتاب",
    say: "aaf-taab",
    origin: "Persian (آفتاب) – Sun, sunlight",
    meaning: "The sun, bright daylight",
    context: "Blinding radiance, or the harsh truth of dawn waking you from a dream.",
    example: "Aftab utha to khwaab bikhar gaye"
  },
  {
    roman: "Shabnam",
    slug: "shabnam",
    hindi: "शबनम",
    urdu: "شبنم",
    say: "shab-nam",
    origin: "Persian (شبنم) – Dew of the night",
    meaning: "Morning dew, tender teardrops of dawn",
    context: "Ephemeral sweetness that evaporates with daylight.",
    example: "Shabnam si teri baat, subah tak na rahi"
  },
  {
    roman: "Rubaab",
    slug: "rubaab",
    hindi: "रुबाब",
    urdu: "رباب",
    say: "ru-baab",
    origin: "Arabic / Central Asian musical instrument",
    meaning: "Plucked lute; the instrument of the heart",
    context: "Melody of longing plucked slowly in quiet courtyards.",
    example: "Dil ek rubaab hai, taar tere haath mein"
  },
  {
    roman: "Malal",
    slug: "malal",
    hindi: "मलाल",
    urdu: "मलाल",
    say: "ma-laal",
    origin: "Arabic (ملال) – Weariness, sadness, grievance",
    meaning: "Lingering regret, quiet wistful sorrow",
    context: "A softer, quieter sorrow that remains when anger has subsided.",
    example: "Koi malal nahi, bas ek sawaal hai"
  },
  {
    roman: "Ranjish",
    slug: "ranjish",
    hindi: "रंजिश",
    urdu: "رنجش",
    say: "ran-jish",
    origin: "Persian (رنجش) – Annoyance, cold grievance",
    meaning: "Lovers' estrangement, grievance that keeps the connection alive",
    context: "A grievance held by someone who still deeply cares.",
    example: "Ranjish hi sahi, dil hi dukhaane ke liye aa"
  },
  {
    roman: "Tazkira",
    slug: "tazkira",
    hindi: "तज़किरा",
    urdu: "تذکرہ",
    say: "taz-ki-ra",
    origin: "Arabic (تذكرة) – Remembrance, mention, biographical account",
    meaning: "Mention, fond remembrance",
    context: "Recalling someone's name so that their memory remains immortal.",
    example: "Har mehfil mein tera tazkira hua"
  },
  {
    roman: "Khamoshi",
    slug: "khamoshi",
    hindi: "ख़ामोशी",
    urdu: "خاموشی",
    say: "khaa-mo-shi",
    origin: "Persian (خاموشی) – Silence, stillness",
    meaning: "Silence, meaningful quiet",
    context: "The profoundest, most articulate expression in poetry.",
    example: "Khamoshi ne sab keh diya"
  },
  {
    roman: "Intezaar",
    slug: "intezaar",
    hindi: "इंतज़ार",
    urdu: "انتظار",
    say: "in-te-zaar",
    origin: "Arabic (انتظار) – Waiting, anticipation",
    meaning: "Longing wait, faithful anticipation",
    context: "The sacred vigil of someone expecting their beloved.",
    example: "Intezaar bhi ek ibaadat hai"
  },
  {
    roman: "Dil-e-Nadaan",
    slug: "dil-e-nadaan",
    hindi: "दिल-ए-नादाँ",
    urdu: "دلِ ناداں",
    say: "dil-e-naa-daan",
    origin: "Persian phrase – Naive, innocent heart",
    meaning: "Innocent naive heart that never learns",
    context: "Ghalib's legendary apostrophe addressing his own unyielding heart.",
    example: "Dil-e-nadaan tujhe hua kya hai"
  },
  {
    roman: "Mehfil",
    slug: "mehfil",
    hindi: "महफ़िल",
    urdu: "محفل",
    say: "meh-fil",
    origin: "Arabic (محفل) – Assembly, gathering",
    meaning: "Poetic gathering, evening of verse and song",
    context: "A sanctuary where lovers of poetry unite to listen and applaud.",
    example: "Mehfil mein sab the, bas tum na the"
  },
  {
    roman: "Saaqi",
    slug: "saaqi",
    hindi: "साक़ी",
    urdu: "ساقی",
    say: "saa-qi",
    origin: "Arabic (ساقي) – Cup-bearer",
    meaning: "The one who pours wine, spiritual mentor",
    context: "In mystic poetry, the spiritual teacher or beloved whose gaze intoxicates.",
    example: "Saaqi ne aaj phir khaali jaam diya"
  },
  {
    roman: "Zulf",
    slug: "zulf",
    hindi: "ज़ुल्फ़",
    urdu: "زلف",
    say: "zulf",
    origin: "Persian (زلف) – Lock of hair, tresses",
    meaning: "Dark flowing tresses, labyrinth of beauty",
    context: "A metaphor for night, entanglement, and boundless charm.",
    example: "Zulf ke saaye mein shaam ho gayi"
  },
  {
    roman: "Wafa",
    slug: "wafa",
    hindi: "वफ़ा",
    urdu: "وفا",
    say: "wa-faa",
    origin: "Arabic (وفاء) – Fidelity, faithfulness",
    meaning: "Unconditional loyalty, faithfulness",
    context: "Unwavering commitment that asks for nothing in return.",
    example: "Wafa ki umeed rakhi, ye galti thi"
  },
  {
    roman: "Bewafa",
    slug: "bewafa",
    hindi: "बेवफ़ा",
    urdu: "بے وفا",
    say: "be-wa-faa",
    origin: "Persian prefix (بے) + Arabic (وفاء) – Without faith",
    meaning: "Unfaithful, heartbreaker",
    context: "The beloved who moves on while the poet remains faithful.",
    example: "Bewafa keh ke bhi pyaar hi kiya"
  },
  {
    roman: "Safar",
    slug: "safar",
    hindi: "सफ़र",
    urdu: "سفر",
    say: "sa-far",
    origin: "Arabic (سفر) – Journey, travel",
    meaning: "Journey, transit through life and love",
    context: "The road traversed alone or with memories.",
    example: "Safar mein dhoop bhi thi, chhaaon bhi"
  },
  {
    roman: "Chiraagh",
    slug: "chiraagh",
    hindi: "चिराग़",
    urdu: "چراغ",
    say: "chi-raagh",
    origin: "Persian (چراغ) – Oil lamp, flame",
    meaning: "Lamp of hope, trembling flame in the storm",
    context: "Human hope persevering against the gale of destiny.",
    example: "Hawa ke saamne chiraagh rakha humne"
  },
  {
    roman: "Kaagaz",
    slug: "kaagaz",
    hindi: "काग़ज़",
    urdu: "کاغذ",
    say: "kaa-gaz",
    origin: "Persian (کاغذ) – Paper",
    meaning: "Paper, silent confessional",
    context: "The white leaf where unsaid cries finally find peace.",
    example: "Kaagaz pe utaari jo zubaan pe na aayi"
  },
  {
    roman: "Aab-e-Hayat",
    slug: "aab-e-hayat",
    hindi: "आब-ए-हयात",
    urdu: "آبِ حیات",
    say: "aab-e-ha-yaat",
    origin: "Persian (آبِ حیات) – Water of Life",
    meaning: "Mythical elixir of immortality, beloved's smile",
    context: "A single drop that revives a dying soul.",
    example: "Teri ek nazar aab-e-hayat thi"
  },
];

export const getWordSlug = (w: Word): string => {
  return w.slug || w.roman.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
};

const all = new Map<string, Word>();
LUGHAT.forEach((w) => {
  all.set(w.roman.toLowerCase(), w);
  all.set(w.hindi.toLowerCase(), w);
  all.set(w.urdu.toLowerCase(), w);
  all.set(getWordSlug(w), w);
});

export const findWord = (token: string) => all.get(token.toLowerCase());
export const findWordBySlug = (slug: string): Word | undefined => {
  if (!slug) return undefined;
  const norm = slug.toLowerCase().trim();
  return (
    LUGHAT.find((w) => w.slug === norm) ||
    LUGHAT.find((w) => getWordSlug(w) === norm) ||
    all.get(norm)
  );
};

export const ALL_FORMS = [...all.keys()].sort((a, b) => b.length - a.length);
export const wordOfDay = () => LUGHAT[new Date().getDate() % LUGHAT.length]!;
