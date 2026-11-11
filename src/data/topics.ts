import { type Poem } from "./poems.ts";

export interface TopicConfig {
  slug: string;
  title: string;
  seoTitle: string;
  description: string;
  heading: string;
  sub: string;
  intro: string;
  filter: (p: Poem) => boolean;
}

export const TOPICS: Record<string, TopicConfig> = {
  "heartbreak-shayari": {
    slug: "heartbreak-shayari",
    title: "Heartbreak & Hijr Shayari",
    seoTitle: "Heartbreak Shayari in Hindi, Urdu & Hinglish (Dard & Hijr) | Ek Khwaab",
    description: "Read poignant heartbreak shayari, dard-e-dil couplets, and hijr ghazals in Hindi, Urdu, and Hinglish. Expressing the unbearable pain of separation with poetic elegance.",
    heading: "Dard & Hijr Shayari — The Poetry of Separation",
    sub: "When love leaves, words remain. Two-line couplets and ghazals of heartbreak in Hindi, Urdu, and Hinglish.",
    intro: "In the Urdu and Hindustani tradition, heartbreak (Hijr and Firaaq) is not mere defeat; it is the sacred crucible of poetry. From Mirza Ghalib to Jaun Elia, the greatest couplets were born in the silence following farewell.",
    filter: (p) => p.mood.includes("Heartbreak") || (p.tags || []).some(t => t.toLowerCase().includes("dard") || t.toLowerCase().includes("hijr")),
  },
  "two-line-shayari": {
    slug: "two-line-shayari",
    title: "Two-Line Shayari & Couplets",
    seoTitle: "Two-Line Shayari & Sher in Hindi, Urdu & Hinglish | Ek Khwaab",
    description: "Best collection of deep 2-line shayari and couplets (sher) in Hindi, Urdu, and Hinglish. Compact, impactful verses of love, heartbreak, and life philosophy.",
    heading: "Two-Line Shayari (2-Line Sher) — Maximum Meaning in Minimum Words",
    sub: "A couplet consists of just two lines: Misra-e-Ula (opening line) and Misra-e-Sani (closing punchline).",
    intro: "A sher is the ultimate masterstroke of Urdu literature. In just two metered lines, a poet captures an ocean of philosophy, romantic longing, or quiet defiance. Explore our collection across all three scripts.",
    filter: (p) => p.format === "Sher" || p.hinglish.length === 2,
  },
  "loneliness-shayari": {
    slug: "loneliness-shayari",
    title: "Late Night Tanhai Poetry",
    seoTitle: "Tanhai & Late Night Shayari in Hindi, Urdu & Hinglish | Ek Khwaab",
    description: "Explore 2 AM tanhai shayari, midnight solitude couplets, and nostalgic nazms in Hindi, Urdu, and Hinglish. The quiet sanctuary for solitary hearts.",
    heading: "Late Night Tanhai — Verses for the 2 AM Hours",
    sub: "Quiet reflections, old memories, and solitary contemplation when the city sleeps.",
    intro: "Night (Shab) is the hour of absolute honesty in shayari. When daylight pretense disappears, the poet sits with paper, tea, and memories that refuse to fade.",
    filter: (p) => p.mood.includes("Late Night") || (p.tags || []).some(t => t.toLowerCase().includes("tanhai") || t.toLowerCase().includes("night")),
  },
  "love-shayari": {
    slug: "love-shayari",
    title: "Unspoken Love & Ishq Shayari",
    seoTitle: "Unspoken Love & Ishq Shayari in Hindi, Urdu & Hinglish | Ek Khwaab",
    description: "Tender romantic shayari, unspoken love couplets, and soulful ghazals in Hindi, Urdu, and Hinglish. Celebrating sacred glances and deep connections.",
    heading: "Unspoken Love (Ishq) — Verses Where Gazes Meet",
    sub: "For words that were never spoken aloud, but were understood by the soul.",
    intro: "Classical Ishq does not demand loud confessions. It lives in small gestures: sugar in lukewarm tea, a stolen glance across a crowded room, or silence shared comfortably between two souls.",
    filter: (p) => p.mood.includes("Love") || (p.tags || []).some(t => t.toLowerCase().includes("ishq") || t.toLowerCase().includes("love")),
  },
};

