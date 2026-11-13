// Load-test fixture. Imported only by the mock route, which is gated by
// ALLOW_MOCK_AI=1 and NODE_ENV !== "production". Never import this into the
// production response path.
export const MOCK_POEM = {
  requestId: "EK_AI_MOCK",
  poetryType: "shayari",
  title: null,
  hinglish: [
    "Chai ki bhaap mein tera chehra dhoondha raat bhar,",
    "Khidki ke sheeshe pe likha tera naam, baarish bhar.",
  ],
  hindi: [
    "चाय की भाप में तेरा चेहरा ढूँढा रात भर,",
    "खिड़की के शीशे पे लिखा तेरा नाम, बारिश भर।",
  ],
  urdu: [
    "چائے کی بھاپ میں تیرا چہرہ ڈھونڈا رات بھر،",
    "کھڑکی کے شیشے پہ لکھا تیرا نام، بارش بھر۔",
  ],
  english:
    "I searched for your face in the steam of my tea all night; the rain wrote your name on the window.",
  seedsUsed: ["chai", "baarish", "khidki", "raat"],
  usedPhrases: ["chai", "baarish", "khidki", "raat"],
  tags: ["#LateNight", "#Nostalgia"],
  alternatives: [],
  continuations: [],
  validation: { requiredPhrasesPresent: true, structureValid: true },
};
