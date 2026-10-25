export type Word = { roman: string; hindi: string; urdu: string; say: string; meaning: string; context: string; example: string };

export const LUGHAT: Word[] = [
  { roman: "Tagaful", hindi: "तग़ाफ़ुल", urdu: "تغافل", say: "ta-gaa-ful", meaning: "Intentional neglect", context: "The beloved who knows, and still looks away.", example: "Tera tagaful bhi ek ada hai, ye maan liya humne" },
  { roman: "Hijr", hindi: "हिज्र", urdu: "ہجر", say: "hij-r", meaning: "Separation", context: "The long night of being apart from the beloved.", example: "Hijr ki raat bhi kat jaati hai, aadat ho jaaye to" },
  { roman: "Vehshat", hindi: "वहशत", urdu: "وحشت", say: "veh-shat", meaning: "Wild restlessness", context: "A frenzy of the heart that cannot sit still.", example: "Vehshat mein bhi ek tarteeb rakhi humne" },
  { roman: "Musalsal", hindi: "मुसलसल", urdu: "مسلسل", say: "mu-sal-sal", meaning: "Continuous, unbroken", context: "Something that never stops — usually longing.", example: "Musalsal teri yaad ka mausam hai" },
  { roman: "Qurbat", hindi: "क़ुर्बत", urdu: "قربت", say: "qur-bat", meaning: "Closeness", context: "Nearness that is felt more than measured.", example: "Qurbat mein bhi faasle the, ye kisne jaana" },
  { roman: "Firaaq", hindi: "फ़िराक़", urdu: "فراق", say: "fi-raaq", meaning: "Parting, absence", context: "The ache that stays after someone leaves.", example: "Firaaq ka mausam bhi guzar jaayega" },
  { roman: "Shab", hindi: "शब", urdu: "شب", say: "shab", meaning: "Night", context: "In shayari, night is the hour of honesty.", example: "Shab bhar jaage, subah ne kuch na poocha" },
  { roman: "Gham", hindi: "ग़म", urdu: "غم", say: "gham", meaning: "Grief, sorrow", context: "Sorrow worn quietly, almost with pride.", example: "Gham ko bhi humne mehmaan banaya" },
  { roman: "Justajoo", hindi: "जुस्तजू", urdu: "جستجو", say: "jus-ta-joo", meaning: "Search, quest", context: "The seeking that becomes a way of life.", example: "Teri justajoo mein khud ko kho diya" },
  { roman: "Qafas", hindi: "क़फ़स", urdu: "قفس", say: "qa-fas", meaning: "Cage", context: "A prison — often one we built ourselves.", example: "Qafas khula tha, parinda phir bhi na gaya" },
  { roman: "Mahtab", hindi: "महताब", urdu: "مہتاب", say: "meh-taab", meaning: "Moonlight, the moon", context: "The beloved's face, or a silent witness.", example: "Mahtab bhi chhat pe utra tha us raat" },
  { roman: "Aftab", hindi: "आफ़ताब", urdu: "آفتاب", say: "aaf-taab", meaning: "The sun", context: "Radiance, or the harsh truth of daylight.", example: "Aftab utha to khwaab bikhar gaye" },
  { roman: "Shabnam", hindi: "शबनम", urdu: "شبنم", say: "shab-nam", meaning: "Dew", context: "Night's tears resting on petals.", example: "Shabnam si teri baat, subah tak na rahi" },
  { roman: "Rubaab", hindi: "रुबाब", urdu: "رباب", say: "ru-baab", meaning: "A stringed instrument", context: "Music of longing, plucked slow.", example: "Dil ek rubaab hai, taar tere haath mein" },
  { roman: "Malal", hindi: "मलाल", urdu: "ملال", say: "ma-laal", meaning: "Regret, lingering sadness", context: "A softer, longer kind of hurt.", example: "Koi malal nahi, bas ek sawaal hai" },
  { roman: "Ranjish", hindi: "रंजिश", urdu: "رنجش", say: "ran-jish", meaning: "Grievance, resentment", context: "Hurt that keeps the door half-open.", example: "Ranjish hi sahi, dil hi dukhaane ke liye aa" },
  { roman: "Tazkira", hindi: "तज़किरा", urdu: "تذکرہ", say: "taz-ki-ra", meaning: "Mention, remembrance", context: "Speaking of someone, so they stay.", example: "Har mehfil mein tera tazkira hua" },
  { roman: "Khamoshi", hindi: "ख़ामोशी", urdu: "خاموشی", say: "khaa-mo-shi", meaning: "Silence", context: "The loudest reply in Urdu poetry.", example: "Khamoshi ne sab keh diya" },
  { roman: "Intezaar", hindi: "इंतज़ार", urdu: "انتظار", say: "in-te-zaar", meaning: "Waiting", context: "A lover's oldest occupation.", example: "Intezaar bhi ek ibaadat hai" },
  { roman: "Dil-e-Nadaan", hindi: "दिल-ए-नादाँ", urdu: "دلِ ناداں", say: "dil-e-naa-daan", meaning: "Naive heart", context: "Ghalib's tender scolding of the heart.", example: "Dil-e-nadaan tujhe hua kya hai" },
  { roman: "Mehfil", hindi: "महफ़िल", urdu: "محفل", say: "meh-fil", meaning: "Gathering", context: "Where verses are recited and applauded.", example: "Mehfil mein sab the, bas tum na the" },
  { roman: "Saaqi", hindi: "साक़ी", urdu: "ساقی", say: "saa-qi", meaning: "Cup-bearer", context: "The one who pours — wine, or mercy.", example: "Saaqi ne aaj phir khaali jaam diya" },
  { roman: "Zulf", hindi: "ज़ुल्फ़", urdu: "زلف", say: "zulf", meaning: "Tresses, locks of hair", context: "A dark labyrinth the lover gets lost in.", example: "Zulf ke saaye mein shaam ho gayi" },
  { roman: "Wafa", hindi: "वफ़ा", urdu: "وفا", say: "wa-faa", meaning: "Faithfulness", context: "Loyalty, rarely returned in ghazals.", example: "Wafa ki umeed rakhi, ye galti thi" },
  { roman: "Bewafa", hindi: "बेवफ़ा", urdu: "بے وفا", say: "be-wa-faa", meaning: "Unfaithful", context: "The beloved, as poets love to call them.", example: "Bewafa keh ke bhi pyaar hi kiya" },
  { roman: "Safar", hindi: "सफ़र", urdu: "سفر", say: "sa-far", meaning: "Journey", context: "Life, love, and leaving.", example: "Safar mein dhoop bhi thi, chhaaon bhi" },
  { roman: "Chiraagh", hindi: "चिराग़", urdu: "چراغ", say: "chi-raagh", meaning: "Lamp", context: "Hope kept burning against the wind.", example: "Hawa ke saamne chiraagh rakha humne" },
  { roman: "Kaagaz", hindi: "काग़ज़", urdu: "کاغذ", say: "kaa-gaz", meaning: "Paper", context: "Where unsaid things finally live.", example: "Kaagaz pe utaari jo zubaan pe na aayi" },
  { roman: "Ishq", hindi: "इश्क़", urdu: "عشق", say: "ishq", meaning: "Passionate love", context: "Love that consumes rather than comforts.", example: "Ishq ne Ghalib nikamma kar diya" },
  { roman: "Aab-e-Hayat", hindi: "आब-ए-हयात", urdu: "آبِ حیات", say: "aab-e-ha-yaat", meaning: "Water of life", context: "The mythical elixir of immortality.", example: "Teri ek nazar aab-e-hayat thi" },
  { roman: "Rooh", hindi: "रूह", urdu: "روح", say: "rooh", meaning: "Soul", context: "What remains when the body tires.", example: "Rooh tak utar gayi teri baat" },
  { roman: "Arzoo", hindi: "आरज़ू", urdu: "آرزو", say: "aar-zoo", meaning: "Desire, wish", context: "A longing tender enough to name.", example: "Ek arzoo thi, adhoori hi sahi" },
];

const all = new Map<string, Word>();
LUGHAT.forEach((w) => [w.roman, w.hindi, w.urdu].forEach((f) => all.set(f.toLowerCase(), w)));
export const findWord = (token: string) => all.get(token.toLowerCase());
export const ALL_FORMS = [...all.keys()].sort((a, b) => b.length - a.length);
export const wordOfDay = () => LUGHAT[new Date().getDate() % LUGHAT.length]!;
