export type Script = "hinglish" | "hindi" | "urdu" | "english";
export type TranslationStatus = "pending" | "completed" | "failed";

export type Poem = {
  id: string;
  takhallus: string;
  format: string;
  mood: string;
  style: string;
  paper: Paper;
  hinglish: string[];
  hindi: string[];
  urdu: string[];
  english: string[];
  sourceLanguage?: Script;
  translationStatus?: Partial<Record<Script, TranslationStatus>>;
  daad: number;
  muqarrar: number;
  hashiya: { by: string; text: string }[];
  tags?: string[] | undefined;
};
export type Paper = "kora" | "warq" | "neeli" | "surkh";
export const MOODS = ["Late Night Tanhai", "Heartbreak & Hijr", "Unspoken Love", "Life & Philosophy"];
export const FILTERS = ["All Moods", "Late Night Tanhai", "Heartbreak & Hijr", "Unspoken Love", "Life & Philosophy", "2-Line Sher", "Ghazals"];
export const matchFilter = (p: { mood: string; format: string }, f: string) => {
  if (f === "All Moods" || f === "All Poems") return true;
  if (f === "2-Line Sher" || f === "2-Line Couplets") return p.format === "Sher";
  if (f === "Ghazals") return p.format === "Ghazal";
  if (f === "Late Night Tanhai") return p.mood.includes("Late Night");
  if (f === "Heartbreak & Hijr") return p.mood.includes("Heartbreak");
  return p.mood === f;
};
export const poetId = (name: string) => {
  let h = 7;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 9000;
  return `#EK-${1000 + h}`;
};

export const POEMS: Poem[] = [
  // --- 1. User Featured: Ab kisi baat pe dil dukhta nahi hai mera ---
  {
    id: "p_pathar",
    takhallus: "Dil_e_Beqasoor",
    format: "Sher",
    mood: "Heartbreak & Hijr",
    style: "Modern",
    paper: "warq",
    hinglish: [
      "Ab kisi baat pe dil dukhta nahi hai mera,",
      "Tumne is hadd tak sataya hai ki patthar kar diya."
    ],
    hindi: [
      "अब किसी बात पे दिल दुखता नहीं है मेरा,",
      "तुमने इस हद तक सताया है कि पत्थर कर दिया।"
    ],
    urdu: [
      "اب کسی بات پہ دل دکھتا نہیں ہے میرا،",
      "تم نے اس حد تک ستایا ہے کہ پتھر کر دیا"
    ],
    english: [
      "Nothing hurts my heart anymore —",
      "you tormented me so deeply that you turned me to stone."
    ],
    daad: 2840,
    muqarrar: 710,
    tags: ["#PatharDil", "#Heartbreak", "#Dard", "#Hijr"],
    hashiya: [
      { by: "Khamosh_Musafir", text: "Jab dard hadd se badh jaye to patthar ban jana hi aakhiri panah ban jata hai. Bahut khoob!" }
    ]
  },

  // --- 2. User Featured: Tum woh ladki thi jissey sab hasna sikhte the ---
  {
    id: "p_ladki",
    takhallus: "Shayar_e_Fitrat",
    format: "Nazm",
    mood: "Unspoken Love",
    style: "Modern",
    paper: "kora",
    hinglish: [
      "Tum woh ladki thi, jisse sab hasna seekhte the...",
      "Jiski adaon se adaon mein rehna seekhte the...",
      "Jiske labon par kabhi bas hansi hua karti thi...",
      "Nazm, ghazalein zubaan par hua karti thi..."
    ],
    hindi: [
      "तुम वो लड़की थी, जिससे सब हँसना सीखते थे...",
      "जिसकी अदाओं से अदाओं में रहना सीखते थे...",
      "जिसके लबों पर कभी बस हँसी हुआ करती थी...",
      "नज़्में, ग़ज़लें ज़ुबान पर हुआ करती थी..."
    ],
    urdu: [
      "تم وہ لڑکی تھی، جس سے سب ہنسنا سیکھتے تھے...",
      "جس کی اداؤں سے اداؤں میں رہنا سیکھتے تھے...",
      "جس کے لبوں پر کبھی بس ہنسی ہوا کرتی تھی...",
      "نظمیں، غزلیں زبان پر ہوا کرتی تھی..."
    ],
    english: [
      "You were that girl everyone learned to laugh from...",
      "whose grace taught elegance how to dwell in grace...",
      "on whose lips laughter was once a permanent home...",
      "poems and ghazals always danced upon your tongue..."
    ],
    daad: 3120,
    muqarrar: 780,
    tags: ["#WoLadki", "#Nazm", "#Yaadein", "#Masoomiyat"],
    hashiya: [
      { by: "Siyahi_Qaasid", text: "Kitni gehraai aur noor hai is nazm mein... har lafz se ek chehra yaad aa gaya." }
    ]
  },

  // --- 3. User Featured: Tere sath guzara har lamha (#betiiiiiiiiii) ---
  {
    id: "p_beti",
    takhallus: "Dua_e_Qalb",
    format: "Qata",
    mood: "Unspoken Love",
    style: "Modern",
    paper: "surkh",
    hinglish: [
      "Tere saath guzara har lamha sambhaal rakha hai,",
      "Dil ke kisi kone mein tujhe chupa rakha hai,",
      "Waqt chahe kitna bhi aage nikal jaaye,",
      "Maine tumhaare har ek pal ko dil mein sajaa rakha hai..."
    ],
    hindi: [
      "तेरे साथ गुज़रा हर लम्हा संभाल रखा है,",
      "दिल के किसी कोने में तुझे छुपा रखा है,",
      "वक़्त चाहे कितना भी आगे निकल जाए,",
      "मैंने तुम्हारे हर एक पल को दिल में सजा रखा है..."
    ],
    urdu: [
      "تیرے ساتھ گزرا ہر لمحہ سنبھال رکھا ہے،",
      "دل کے کسی کونے میں تجھے چھپا رکھا ہے،",
      "وقت چاہے کتنا بھی آگے نکل جائے،",
      "میں نے تمہارے ہر ایک پل کو دل میں سجا رکھا ہے..."
    ],
    english: [
      "Every moment lived with you, I have safeguarded with care,",
      "hidden you gently in a quiet corner of my heart.",
      "No matter how far forward time may rush,",
      "I have adorned my soul with every memory of yours..."
    ],
    daad: 4210,
    muqarrar: 1052,
    tags: ["#betiiiiiiiiii", "#Lamhe", "#Pyaar", "#Mamta"],
    hashiya: [
      { by: "Abr_e_Shab", text: "Yeh ahsaas anmol hai. Ek bachhi aur baap-maa ke rishte ki sabse khoobsurat daastaan." }
    ]
  },

  // --- 4. User Featured: Uske chehre me is kadr noor tha ---
  {
    id: "p_noor",
    takhallus: "Aashna_e_Dard",
    format: "Qata",
    mood: "Heartbreak & Hijr",
    style: "Classical",
    paper: "neeli",
    hinglish: [
      "Uske chehre mein is qadr noor tha,",
      "Ki uski yaadon mein to rona bhi manzoor tha,",
      "Bewafa bhi nahi keh sakte usko,",
      "Mohabbat to humne ki thi, woh to bekasoor tha."
    ],
    hindi: [
      "उसके चेहरे में इस क़दर नूर था,",
      "कि उसकी यादों में तो रोना भी मंज़ूर था,",
      "बेवफ़ा भी नहीं कह सकते उसको,",
      "मोहब्बत तो हमने की थी, वो तो बेक़सूर था।"
    ],
    urdu: [
      "اس کے چہرے میں اس قدر نور تھا،",
      "کہ اس کی یادوں میں تو رونا بھی منظور تھا،",
      "بےوفا بھی نہیں کہہ سکتے اس کو،",
      "محبت تو ہم نے کی تھی، وہ تو بےقصور تھا۔"
    ],
    english: [
      "Such celestial radiance lived upon their face,",
      "that weeping in their memories felt completely welcome.",
      "I cannot even bring myself to call them unfaithful —",
      "love was chosen by my heart, they were completely innocent."
    ],
    daad: 2490,
    muqarrar: 622,
    tags: ["#Bekasoor", "#Ishq", "#Dard", "#Noor"],
    hashiya: [
      { by: "Baghi_Qalam", text: "Mohabbat to humne ki thi, woh to bekasoor tha... ishq ka sabse sachha aur azeem aitraaf." }
    ]
  },

  // --- 5. User Featured: Mirza Ghalib - Hazaron khwahishein aisi ---
  {
    id: "p_ghalib",
    takhallus: "Mirza_Ghalib",
    format: "Sher",
    mood: "Life & Philosophy",
    style: "Classical",
    paper: "warq",
    hinglish: [
      "Hazaron khwahishein aisi ki har khwahish pe dam nikle,",
      "Bahut nikle mere armaan lekin phir bhi kam nikle."
    ],
    hindi: [
      "हज़ारों ख़्वाहिशें ऐसी कि हर ख़्वाहिश पे दम निकले,",
      "बहुत निकले मेरे अरमाँ लेकिन फिर भी कम निकले।"
    ],
    urdu: [
      "ہزاروں خواہشیں ایسی کہ ہر خواہش پہ دم نکلے",
      "بہت نکلے مرے ارمان لیکن پھر بھی کم نکلے"
    ],
    english: [
      "Thousands of desires, each so profound that one could die for it —",
      "many of my yearnings were fulfilled, yet so very few."
    ],
    daad: 5120,
    muqarrar: 1280,
    tags: ["#Ghalib", "#Khwahishein", "#Philosophy", "#Zindagi"],
    hashiya: [
      { by: "Rubaab_Nawaz", text: "Ghalib ka qalam hamesha zinda rahega. Falsafa-e-zindagi ka aaina." }
    ]
  },

  // --- 6. User Featured: Khamoshi se bhi guftagu ho jaati hai ---
  {
    id: "p_guftagu",
    takhallus: "Nigaah_e_Ulfat",
    format: "Sher",
    mood: "Unspoken Love",
    style: "Modern",
    paper: "kora",
    hinglish: [
      "Khamoshi se bhi guftagu ho jaati hai jab nazrein milti hain,",
      "Lafzon ki zaroorat kise hai jahan roohein pighalti hain."
    ],
    hindi: [
      "ख़ामोशी से भी गुफ़्तगू हो जाती है जब नज़रें मिलती हैं,",
      "लफ़्ज़ों की ज़रूरत किसे है जहाँ रूहें पिघलती हैं।"
    ],
    urdu: [
      "خاموشی سے بھی گفتگو ہو جاتی ہے جب نظریں ملتی ہیں",
      "لفظوں کی ضرورت کسے ہے جہاں روحیں پگھلتی ہیں"
    ],
    english: [
      "Even silence breaks into conversation when gazes meet;",
      "who has need for words where souls dissolve into one."
    ],
    daad: 2310,
    muqarrar: 577,
    tags: ["#Khamoshi", "#Guftagu", "#Roohein", "#Nazrein"],
    hashiya: [
      { by: "Shab_e_Farda", text: "Lafz to sirf parda hain, asal baatcheet to nazron aur rooh ke darmiyan hoti hai." }
    ]
  },

  // --- Original Seed Poems ---
  {
    id: "p1",
    takhallus: "Abr_e_Shab",
    format: "Sher",
    mood: "Unspoken Love",
    style: "Modern",
    paper: "kora",
    hinglish: ["Tera tagaful bhi ek ada thi, ye maan liya humne", "Ab har khamoshi ko teri baat samajh lete hain"],
    hindi: ["तेरा तग़ाफ़ुल भी एक अदा थी, ये मान लिया हमने", "अब हर ख़ामोशी को तेरी बात समझ लेते हैं"],
    urdu: ["تیرا تغافل بھی ایک ادا تھی، یہ مان لیا ہم نے", "اب ہر خاموشی کو تیری بات سمجھ لیتے ہیں"],
    english: ["I accepted your neglect as just another grace of yours;", "now I take every silence for something you said."],
    daad: 412,
    muqarrar: 88,
    tags: ["#UnspokenLove", "#Khamoshi", "#Ada"],
    hashiya: [{ by: "Khamosh_Musafir", text: "Khamoshi ko baat samajhna — yahi to ishq hai. Wah!" }]
  },
  {
    id: "p2",
    takhallus: "Banjara_Khawaab",
    format: "Sher",
    mood: "Heartbreak & Hijr",
    style: "Classical",
    paper: "warq",
    hinglish: ["Hijr ki shab bhi guzar jaati hai aahista aahista", "Bas ek chiraagh hai jo subah tak nahi bujhta"],
    hindi: ["हिज्र की शब भी गुज़र जाती है आहिस्ता आहिस्ता", "बस एक चिराग़ है जो सुबह तक नहीं बुझता"],
    urdu: ["ہجر کی شب بھی گزر جاتی ہے آہستہ آہستہ", "بس ایک چراغ ہے جو صبح تک نہیں بجھتا"],
    english: ["Even the night of separation passes, slowly, slowly —", "only one lamp refuses to go out before dawn."],
    daad: 690,
    muqarrar: 140,
    tags: ["#Heartbreak", "#Hijr", "#Tanhai"],
    hashiya: []
  },
  {
    id: "p3",
    takhallus: "Siyahi_Qaasid",
    format: "Qata",
    mood: "Late Night Tanhai",
    style: "Modern",
    paper: "neeli",
    hinglish: ["Raat do baje phone ki roshni mein", "Teri purani tasveer musalsal dekhi", "Kuch nahi badla, bas itna hua", "Ab aankhein bhi kaagaz ki tarah bhigti hain"],
    hindi: ["रात दो बजे फ़ोन की रौशनी में", "तेरी पुरानी तस्वीर मुसलसल देखी", "कुछ नहीं बदला, बस इतना हुआ", "अब आँखें भी काग़ज़ की तरह भीगती हैं"],
    urdu: ["رات دو بجے فون کی روشنی میں", "تیری پرانی تصویر مسلسل دیکھی", "کچھ نہیں بدلا، بس اتنا ہوا", "اب آنکھیں بھی کاغذ کی طرح بھیگتی ہیں"],
    english: ["At two at night, in the glow of a phone,", "I looked at your old photograph, without pause.", "Nothing changed, except this —", "now my eyes soak through like paper."],
    daad: 1203,
    muqarrar: 301,
    tags: ["#LateNight", "#2AMThoughts", "#Yaad"],
    hashiya: [{ by: "Shab_e_Farda", text: "Jawaabi: Kaagaz bhi sookh jaata hai subah tak, aankhein nahi." }]
  },
  {
    id: "p4",
    takhallus: "Khamosh_Musafir",
    format: "Sher",
    mood: "Life & Philosophy",
    style: "Modern",
    paper: "kora",
    hinglish: ["Qafas khula tha, parinda phir bhi na gaya", "Aadat bhi ek zanjeer hai, ye ab samjhe"],
    hindi: ["क़फ़स खुला था, परिंदा फिर भी न गया", "आदत भी एक ज़ंजीर है, ये अब समझे"],
    urdu: ["قفس کھلا تھا، پرندہ پھر بھی نہ گیا", "عادت بھی ایک زنجیر ہے، یہ اب سمجھے"],
    english: ["The cage stood open; still the bird did not leave.", "Habit too is a chain — only now I understand."],
    daad: 845,
    muqarrar: 190,
    tags: ["#Philosophy", "#Zindagi", "#Azaadi"],
    hashiya: []
  },
  {
    id: "p5",
    takhallus: "Shab_e_Farda",
    format: "Sher",
    mood: "Unspoken Love",
    style: "Modern",
    paper: "surkh",
    hinglish: ["Tumne chai mein cheeni kam daali thi", "Qurbat ka swaad phir bhi meetha tha"],
    hindi: ["तुमने चाय में चीनी कम डाली थी", "क़ुर्बत का स्वाद फिर भी मीठा था"],
    urdu: ["تم نے چائے میں چینی کم ڈالی تھی", "قربت کا سواد پھر بھی میٹھا تھا"],
    english: ["You put too little sugar in the tea;", "closeness tasted sweet regardless."],
    daad: 530,
    muqarrar: 77,
    tags: ["#Chai", "#Qurbat", "#MeethiYaad"],
    hashiya: []
  },
  {
    id: "p6",
    takhallus: "Rubaab_Nawaz",
    format: "Ghazal",
    mood: "Heartbreak & Hijr",
    style: "Classical",
    paper: "warq",
    hinglish: ["Firaaq ki raah mein mahtab bhi tanha nikla", "Jise chiraagh samjha, woh dhuaan nikla", "Teri justajoo mein shehar shehar phire", "Har ek dar pe tera hi nishaan nikla"],
    hindi: ["फ़िराक़ की राह में महताब भी तन्हा निकला", "जिसे चिराग़ समझा, वो धुआँ निकला", "तेरी जुस्तजू में शहर शहर फिरे", "हर एक दर पे तेरा ही निशाँ निकला"],
    urdu: ["فراق کی راہ میں مہتاب بھی تنہا نکلا", "جسے چراغ سمجھا، وہ دھواں نکلا", "تیری جستجو میں شہر شہر پھرے", "ہر ایک در پہ تیرا ہی نشاں نکلا"],
    english: ["On the road of parting, even the moon walked alone;", "what I took for a lamp turned out to be smoke.", "Searching for you I wandered city to city —", "on every door I found only your mark."],
    daad: 977,
    muqarrar: 260,
    tags: ["#Firaaq", "#Ghazal", "#Mahtab"],
    hashiya: []
  },
  {
    id: "p7",
    takhallus: "Baghi_Qalam",
    format: "Sher",
    mood: "Life & Philosophy",
    style: "Modern",
    paper: "surkh",
    hinglish: ["Hum woh chiraagh nahi jo hawa se darr jaayein", "Bujha bhi do to dhuaan aasmaan likhega"],
    hindi: ["हम वो चिराग़ नहीं जो हवा से डर जाएँ", "बुझा भी दो तो धुआँ आसमान लिखेगा"],
    urdu: ["ہم وہ چراغ نہیں جو ہوا سے ڈر جائیں", "بجھا بھی دو تو دھواں آسمان لکھے گا"],
    english: ["I am not the lamp that fears the wind —", "put me out, and my smoke will write across the sky."],
    daad: 1530,
    muqarrar: 412,
    tags: ["#Baghi", "#Aasmaan", "#Umeed"],
    hashiya: []
  },
  {
    id: "p8",
    takhallus: "Lantern_Wala",
    format: "Nazm",
    mood: "Late Night Tanhai",
    style: "Modern",
    paper: "neeli",
    hinglish: ["Station ki bench pe baitha hoon", "Gaadiyaan aati hain, jaati hain", "Intezaar ka koi time-table nahi hota", "Shab yahin pe ruki rehti hai"],
    hindi: ["स्टेशन की बेंच पे बैठा हूँ", "गाड़ियाँ आती हैं, जाती हैं", "इंतज़ार का कोई टाइम-टेबल नहीं होता", "शब यहीं पे रुकी रहती है"],
    urdu: ["اسٹیشن کی بینچ پہ بیٹھا ہوں", "گاڑیاں آتی ہیں، جاتی ہیں", "انتظار کا کوئی ٹائم ٹیبل نہیں ہوتا", "شب یہیں پہ رکی رہتی ہے"],
    english: ["I sit on a station bench;", "trains arrive, trains leave.", "Waiting keeps no timetable —", "the night simply stays here."],
    daad: 620,
    muqarrar: 98,
    tags: ["#Station", "#Intezaar", "#LateNight"],
    hashiya: []
  },
  {
    id: "p9",
    takhallus: "Dil_e_Nadaan",
    format: "Sher",
    mood: "Unspoken Love",
    style: "Classical",
    paper: "kora",
    hinglish: ["Ranjish hi sahi, ek baar to palat ke dekho", "Malal bhi tumhara ho to dil ko qubool hai"],
    hindi: ["रंजिश ही सही, एक बार तो पलट के देखो", "मलाल भी तुम्हारा हो तो दिल को क़ुबूल है"],
    urdu: ["رنجش ہی سہی، ایک بار تو پلٹ کے دیکھو", "ملال بھی تمہارا ہو to dil ko qubool hai"],
    english: ["Even in resentment, turn back once and look;", "if the regret is yours, my heart accepts it."],
    daad: 733,
    muqarrar: 155,
    tags: ["#Ranjish", "#Malal", "#Ishq"],
    hashiya: []
  },
  {
    id: "p10",
    takhallus: "Shabnam_Pari",
    format: "Qata",
    mood: "Unspoken Love",
    style: "Modern",
    paper: "warq",
    hinglish: ["Shabnam si thi teri pehli baat", "Subah tak bhi na rahi magar", "Ek arzoo reh gayi kaagaz pe", "Jaise rooh ka koi safar"],
    hindi: ["शबनम सी थी तेरी पहली बात", "सुबह तक भी न रही मगर", "एक आरज़ू रह गई काग़ज़ पे", "जैसे रूह का कोई सफ़र"],
    urdu: ["شبنم سی تھی تیری پہلی بات", "صبح تک بھی نہ رہی مگر", "ایک آرزو رہ گئی کاغذ پہ", "جیسے روح کا کوئی سفر"],
    english: ["Your first words were like dew —", "though they did not last till morning.", "One wish remained upon the paper,", "like a journey of the soul."],
    daad: 488,
    muqarrar: 64,
    tags: ["#Shabnam", "#Rooh", "#PehliBaat"],
    hashiya: []
  },
];

export const TRENDING = [
  "#betiiiiiiiiii",
  "#Ghalib",
  "#Khwahishein",
  "#PatharDil",
  "#WoLadki",
  "#Bekasoor",
  "#Khamoshi",
  "#UnsentLetters",
  "#2AMThoughts"
];
