export type Script = "hinglish" | "hindi" | "urdu";
export type Poem = {
  id: string; takhallus: string; format: string; mood: string; style: string; paper: Paper;
  hinglish: string[]; hindi: string[]; urdu: string[]; english: string[];
  daad: number; muqarrar: number; hashiya: { by: string; text: string }[];
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
export const poetId = (name: string) => { let h = 7; for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 9000; return `#EK-${1000 + h}`; };

export const POEMS: Poem[] = [
  { id: "p1", takhallus: "Abr_e_Shab", format: "Sher", mood: "Unspoken Love", style: "Modern", paper: "kora",
    hinglish: ["Tera tagaful bhi ek ada thi, ye maan liya humne", "Ab har khamoshi ko teri baat samajh lete hain"],
    hindi: ["तेरा तग़ाफ़ुल भी एक अदा थी, ये मान लिया हमने", "अब हर ख़ामोशी को तेरी बात समझ लेते हैं"],
    urdu: ["تیرا تغافل بھی ایک ادا تھی، یہ مان لیا ہم نے", "اب ہر خاموشی کو تیری بات سمجھ لیتے ہیں"],
    english: ["I accepted your neglect as just another grace of yours;", "now I take every silence for something you said."],
    daad: 412, muqarrar: 88, hashiya: [{ by: "Khamosh_Musafir", text: "Khamoshi ko baat samajhna — yahi to ishq hai. Wah!" }] },
  { id: "p2", takhallus: "Banjara_Khawaab", format: "Sher", mood: "Heartbreak", style: "Classical", paper: "warq",
    hinglish: ["Hijr ki shab bhi guzar jaati hai aahista aahista", "Bas ek chiraagh hai jo subah tak nahi bujhta"],
    hindi: ["हिज्र की शब भी गुज़र जाती है आहिस्ता आहिस्ता", "बस एक चिराग़ है जो सुबह तक नहीं बुझता"],
    urdu: ["ہجر کی شب بھی گزر جاتی ہے آہستہ آہستہ", "بس ایک چراغ ہے جو صبح تک نہیں بجھتا"],
    english: ["Even the night of separation passes, slowly, slowly —", "only one lamp refuses to go out before dawn."],
    daad: 690, muqarrar: 140, hashiya: [] },
  { id: "p3", takhallus: "Siyahi_Qaasid", format: "Qata", mood: "Late Night", style: "Modern", paper: "neeli",
    hinglish: ["Raat do baje phone ki roshni mein", "Teri purani tasveer musalsal dekhi", "Kuch nahi badla, bas itna hua", "Ab aankhein bhi kaagaz ki tarah bhigti hain"],
    hindi: ["रात दो बजे फ़ोन की रौशनी में", "तेरी पुरानी तस्वीर मुसलसल देखी", "कुछ नहीं बदला, बस इतना हुआ", "अब आँखें भी काग़ज़ की तरह भीगती हैं"],
    urdu: ["رات دو بجے فون کی روشنی میں", "تیری پرانی تصویر مسلسل دیکھی", "کچھ نہیں بدلا، بس اتنا ہوا", "اب آنکھیں بھی کاغذ کی طرح بھیگتی ہیں"],
    english: ["At two at night, in the glow of a phone,", "I looked at your old photograph, without pause.", "Nothing changed, except this —", "now my eyes soak through like paper."],
    daad: 1203, muqarrar: 301, hashiya: [{ by: "Shab_e_Farda", text: "Jawaabi: Kaagaz bhi sookh jaata hai subah tak, aankhein nahi." }] },
  { id: "p4", takhallus: "Khamosh_Musafir", format: "Sher", mood: "Life & Philosophy", style: "Modern", paper: "kora",
    hinglish: ["Qafas khula tha, parinda phir bhi na gaya", "Aadat bhi ek zanjeer hai, ye ab samjhe"],
    hindi: ["क़फ़स खुला था, परिंदा फिर भी न गया", "आदत भी एक ज़ंजीर है, ये अब समझे"],
    urdu: ["قفس کھلا تھا، پرندہ پھر بھی نہ گیا", "عادت بھی ایک زنجیر ہے، یہ اب سمجھے"],
    english: ["The cage stood open; still the bird did not leave.", "Habit too is a chain — only now I understand."],
    daad: 845, muqarrar: 190, hashiya: [] },
  { id: "p5", takhallus: "Shab_e_Farda", format: "Micro-Khawaab", mood: "Unspoken Love", style: "Modern", paper: "surkh",
    hinglish: ["Tumne chai mein cheeni kam daali thi", "Qurbat ka swaad phir bhi meetha tha"],
    hindi: ["तुमने चाय में चीनी कम डाली थी", "क़ुर्बत का स्वाद फिर भी मीठा था"],
    urdu: ["تم نے چائے میں چینی کم ڈالی تھی", "قربت کا سواد پھر بھی میٹھا تھا"],
    english: ["You put too little sugar in the tea;", "closeness tasted sweet regardless."],
    daad: 530, muqarrar: 77, hashiya: [] },
  { id: "p6", takhallus: "Rubaab_Nawaz", format: "Ghazal", mood: "Heartbreak", style: "Classical", paper: "warq",
    hinglish: ["Firaaq ki raah mein mahtab bhi tanha nikla", "Jise chiraagh samjha, woh dhuaan nikla", "Teri justajoo mein shehar shehar phire", "Har ek dar pe tera hi nishaan nikla"],
    hindi: ["फ़िराक़ की राह में महताब भी तन्हा निकला", "जिसे चिराग़ समझा, वो धुआँ निकला", "तेरी जुस्तजू में शहर शहर फिरे", "हर एक दर पे तेरा ही निशाँ निकला"],
    urdu: ["فراق کی راہ میں مہتاب بھی تنہا نکلا", "جسے چراغ سمجھا، وہ دھواں نکلا", "تیری جستجو میں شہر شہر پھرے", "ہر ایک در پہ تیرا ہی نشاں نکلا"],
    english: ["On the road of parting, even the moon walked alone;", "what I took for a lamp turned out to be smoke.", "Searching for you I wandered city to city —", "on every door I found only your mark."],
    daad: 977, muqarrar: 260, hashiya: [] },
  { id: "p7", takhallus: "Baghi_Qalam", format: "Sher", mood: "Life & Philosophy", style: "Modern", paper: "surkh",
    hinglish: ["Hum woh chiraagh nahi jo hawa se darr jaayein", "Bujha bhi do to dhuaan aasmaan likhega"],
    hindi: ["हम वो चिराग़ नहीं जो हवा से डर जाएँ", "बुझा भी दो तो धुआँ आसमान लिखेगा"],
    urdu: ["ہم وہ چراغ نہیں جو ہوا سے ڈر جائیں", "بجھا بھی دو تو دھواں آسمان لکھے گا"],
    english: ["I am not the lamp that fears the wind —", "put me out, and my smoke will write across the sky."],
    daad: 1530, muqarrar: 412, hashiya: [] },
  { id: "p8", takhallus: "Lantern_Wala", format: "Nazm", mood: "Late Night", style: "Modern", paper: "neeli",
    hinglish: ["Station ki bench pe baitha hoon", "Gaadiyaan aati hain, jaati hain", "Intezaar ka koi time-table nahi hota", "Shab yahin pe ruki rehti hai"],
    hindi: ["स्टेशन की बेंच पे बैठा हूँ", "गाड़ियाँ आती हैं, जाती हैं", "इंतज़ार का कोई टाइम-टेबल नहीं होता", "शब यहीं पे रुकी रहती है"],
    urdu: ["اسٹیشن کی بینچ پہ بیٹھا ہوں", "گاڑیاں آتی ہیں، جاتی ہیں", "انتظار کا کوئی ٹائم ٹیبل نہیں ہوتا", "شب یہیں پہ رکی رہتی ہے"],
    english: ["I sit on a station bench;", "trains arrive, trains leave.", "Waiting keeps no timetable —", "the night simply stays here."],
    daad: 620, muqarrar: 98, hashiya: [] },
  { id: "p9", takhallus: "Dil_e_Nadaan", format: "Sher", mood: "Unspoken Love", style: "Classical", paper: "kora",
    hinglish: ["Ranjish hi sahi, ek baar to palat ke dekho", "Malal bhi tumhara ho to dil ko qubool hai"],
    hindi: ["रंजिश ही सही, एक बार तो पलट के देखो", "मलाल भी तुम्हारा हो तो दिल को क़ुबूल है"],
    urdu: ["رنجش ہی سہی، ایک بار تو پلٹ کے دیکھو", "ملال بھی تمہارا ہو تو دل کو قبول ہے"],
    english: ["Even in resentment, turn back once and look;", "if the regret is yours, my heart accepts it."],
    daad: 733, muqarrar: 155, hashiya: [] },
  { id: "p10", takhallus: "Shabnam_Pari", format: "Qata", mood: "Unspoken Love", style: "Modern", paper: "warq",
    hinglish: ["Shabnam si thi teri pehli baat", "Subah tak bhi na rahi magar", "Ek arzoo reh gayi kaagaz pe", "Jaise rooh ka koi safar"],
    hindi: ["शबनम सी थी तेरी पहली बात", "सुबह तक भी न रही मगर", "एक आरज़ू रह गई काग़ज़ पे", "जैसे रूह का कोई सफ़र"],
    urdu: ["شبنم سی تھی تیری پہلی بات", "صبح تک بھی نہ رہی مگر", "ایک آرزو رہ گئی کاغذ پہ", "جیسے روح کا کوئی سفر"],
    english: ["Your first words were like dew —", "though they did not last till morning.", "One wish remained upon the paper,", "like a journey of the soul."],
    daad: 488, muqarrar: 64, hashiya: [] },
];

export const TRENDING = ["#UnsentLetters", "#JaunElia", "#ChaiAndRain", "#2AMThoughts", "#MonsoonMemories"];
