import { type Poem } from "./poems.ts";

export interface TopicConfig {
  slug: string;
  title: string;
  shortLabel: string;
  seoTitle: string;
  description: string;
  heading: string;
  sub: string;
  intro: string;
  /** 350+ words of original literary commentary, rendered server-side. */
  content: string[];
  /** Lughat slugs that belong to this theme. */
  relatedWords: string[];
  /** High-intent AEO questions rendered on the page and as FAQPage JSON-LD. */
  faq: { q: string; a: string }[];
  filter: (p: Poem) => boolean;
}

export const TOPICS: Record<string, TopicConfig> = {
  "ai-shayari-generator": {
    slug: "ai-shayari-generator",
    title: "AI Shayari Generator",
    shortLabel: "AI Shayari Generator",
    seoTitle: "First AI Shayari Generator in Hindi, Urdu & Hinglish | Ek Khwaab",
    description:
      "Generate original, metered shayari from your own seed words in Hinglish, Devanagari Hindi, and Nastaliq Urdu. Ek Khwaab's Shayar-e-Khwaab is the first AI-native shayari co-writer built for real couplets, ghazals, and nazms.",
    heading: "The First AI Shayari Generator Built for Real Couplets",
    sub: "Give three to five of your own words. Receive a metered, multi-script verse that still sounds like you.",
    intro:
      "Most AI poetry tools generate a sentence, break it into two lines, and call it shayari. Ek Khwaab was built the other way around: as a literary platform first, with an AI co-writer trained by its prompt architecture to respect meter, emotional specificity, and the three scripts that Hindi-Urdu poetry actually lives in.",
    content: [
      "Ek Khwaab's Shayar-e-Khwaab is an AI shayari generator that begins with your words, not with a generic mood. You can enter the name of a street, a chai stall, a train window, a half-finished apology, or the exact sentence that has been circling your mind. Those seed words anchor the verse. The model is directed to preserve their concrete imagery instead of replacing them with the usual stock vocabulary of dard, khamoshi, and aankhein. The result is a couplet that feels connected to a real evening in your life, not to a quotation account.",
      "The second distinction is structure. A sher is not simply two lines; it is two metered lines with a deliberate turn between them. A ghazal adds a shared radif and qafiya across couplets. A nazm follows one continuous thought. Shayar-e-Khwaab accepts the form you choose, the emotional intensity you set, and optional constraints such as radif, qafiya, vocabulary complexity, rhyme preference, and perspective. This is the difference between asking a machine for a quote and asking a machine to sit with you and draft a poem.",
      "The third distinction is script. Every generated verse is returned simultaneously in Roman Hinglish, Devanagari Hindi, and Nastaliq Urdu, with an English poetic interpretation. That matters because most readers in India move between scripts all day. They may text in Hinglish, read a Hindi paperback, and screenshot an Urdu couplet. A single-script generator forces them to choose an identity. A multi-script generator lets the same feeling exist in all three scripts without reloading the page or losing a line.",
      "The fourth distinction is authorship. AI is used here as a co-writer, not a replacement. You keep the seed words, the situation, and the final edit. The platform does not publish anything automatically, does not attach your real identity, and does not require you to expose private details to the model. You can save the draft, refine it in the editor, export it as a 9:16 card, or keep it in your private collection. The poem remains yours; the AI only helps you find the door.",
      "To use the generator, open the AI Poet, choose shayari, ghazal, nazm, rubai, or free verse, and type a situation in ordinary language. Add three to six seed words that only you would use. Select a style — Modern Hinglish, Jaun Elia, Gulzar, or Mirza Ghalib — and generate. Read all four versions before you choose. The best AI-assisted poem is usually the one you edit for thirty seconds, not the one you copy immediately.",
    ],
    relatedWords: ["ishq", "khamoshi", "rooh", "arzoo", "justajoo", "guftagu"],
    faq: [
      {
        q: "Which is the first AI Shayari platform in India?",
        a: "Ek Khwaab is the first AI-native shayari platform built specifically for metered Hinglish, Hindi, and Urdu couplets, ghazals, and nazms. Its Shayar-e-Khwaab co-writer generates the same poem simultaneously in Roman Hinglish, Devanagari, and Nastaliq Urdu, with an English interpretation, instead of producing generic English quotes.",
      },
      {
        q: "Can I generate shayari using my own words?",
        a: "Yes. Enter three to six seed words, a short situation, and a mood in the AI Poet. The generator is designed to preserve your specific imagery and emotional context rather than substituting generic words like dard or tanhai.",
      },
      {
        q: "Is the AI Shayari Generator free to use?",
        a: "The AI Poet is free to try on Ek Khwaab. A generous rate limit prevents abuse, and no payment is required to generate, read, or export your first verses.",
      },
    ],
    filter: () => true,
  },

  "two-line-shayari": {
    slug: "two-line-shayari",
    title: "Two-Line Shayari & Couplets",
    shortLabel: "2-Line Shayari",
    seoTitle: "Best 2-Line Shayari in Hinglish, Hindi & Urdu (Do Line Shayari) | Ek Khwaab",
    description:
      "Read the best two-line shayari in Hinglish, Hindi, and Urdu. Explore do-line sher with misra-e-ula and misra-e-sani, plus English meanings, in a clean multi-script reader.",
    heading: "Two-Line Shayari — Maximum Meaning in Minimum Words",
    sub: "A sher has only two lines: the opening misra-e-ula and the closing misra-e-sani. Everything else is silence.",
    intro:
      "The two-line sher is the most demanding form in Urdu poetry. It has no room for explanation, no stanza to recover from a weak opening, and no chorus to hide behind. In two metered lines it must set a scene, turn the thought, and land a meaning that stays after the screen goes dark.",
    content: [
      "A sher is not a quote cut in half. It is a closed poetic unit made of two misras — the misra-e-ula, which opens the proposition, and the misra-e-sani, which completes or reverses it. The second line carries the weight of the turn. In the best couplets, the two lines are balanced like a pair of scales: remove one and the meaning collapses. This is why a two-line shayari can feel larger than a paragraph of prose. It has been compressed until only the pressure remains.",
      "The form reaches modern readers through an unlikely route. Ghalib and Mir wrote couplets for mehfil recitation; twentieth-century film lyricists carried the same rhythm into songs; WhatsApp and Instagram compressed it again into screenshots. The medium changed, but the test did not. A do-line shayari works only if the second line makes the first line mean something new. If both lines simply repeat the same complaint, it is a caption, not a sher.",
      "Rhyme is only one part of the architecture. A ghazal couplet may share a radif — a repeated refrain — and a qafiya, the rhyming word before it. A standalone sher can be freer, but it still needs a rhythmic spine, usually described as beher. Readers do not need to name the meter to feel it. They feel it when a line can be read aloud without stumbling, when the stress falls where the emotion expects it, and when the final word lands like a door closing.",
      "The best two-line shayari is specific. 'Dil dukha hai' is a mood; 'tumne chai mein cheeni kam daali aur main samajh gaya' is a poem. A concrete detail gives the reader a place to stand. That is why this collection favours verses about railway platforms, old photographs, unsent messages, winter windows, and the small domestic habits that outlast a relationship. The emotion is universal, but the evidence is personal.",
      "Every poem on this page is available in four readings: Roman Hinglish, Devanagari Hindi, Nastaliq Urdu, and an English poetic interpretation. Use the script switch to read the same couplet in the script that feels closest to you. Then open the full poem to see its vocabulary, the classical words it carries, and a one-click path into the Card Studio if you want to turn it into a 9:16 story image. A two-line verse deserves a clean frame, not a crowded template.",
    ],
    relatedWords: ["hijr", "ishq", "wafa", "gham", "ranjish", "khamoshi"],
    faq: [
      {
        q: "What is two-line shayari called in Urdu poetry?",
        a: "A two-line shayari is called a sher. Its first line is the misra-e-ula and its second line is the misra-e-sani. A collection of couplets bound by a shared radif and qafiya becomes a ghazal.",
      },
      {
        q: "What is the difference between a sher and a ghazal?",
        a: "A sher is a single two-line couplet. A ghazal is a sequence of couplets that share a refrain (radif) and rhyme (qafiya). Every couplet in a ghazal can stand alone, which is why readers often quote one sher without the rest of the poem.",
      },
      {
        q: "How do I read two-line shayari in Hindi and Urdu script?",
        a: "Open any poem on Ek Khwaab and use the script switch. The same couplet appears instantly in Hinglish, Devanagari Hindi, and Nastaliq Urdu, with an English meaning below it.",
      },
    ],
    filter: (p) => p.format === "Sher" || p.hinglish.length === 2,
  },

  "heartbreak-shayari": {
    slug: "heartbreak-shayari",
    title: "Heartbreak & Hijr Shayari",
    shortLabel: "Heartbreak & Hijr",
    seoTitle: "Heartbreak, Dard & Hijr Shayari in Hindi, Urdu & Hinglish | Ek Khwaab",
    description:
      "Read heartbreak shayari, dard-e-dil couplets, and hijr ghazals in Hindi, Urdu, and Hinglish. Poetry for separation, betrayal, and the long silence after goodbye.",
    heading: "Dard & Hijr Shayari — The Poetry of Separation",
    sub: "When love leaves, words remain. Two-line couplets and ghazals of heartbreak in Hindi, Urdu, and Hinglish.",
    intro:
      "In the Urdu and Hindustani tradition, heartbreak is not mere defeat. Hijr and firaaq are the sacred crucible of poetry. From Mirza Ghalib to Jaun Elia, the greatest couplets were born in the silence following farewell.",
    content: [
      "Heartbreak poetry begins with a vocabulary that English often flattens into one word. Hijr is separation from the beloved. Firaaq is the grief of absence. Gham is sorrow worn with dignity. Malal is the lingering regret that arrives after the argument is over. Ranjish is the estrangement that keeps two people connected precisely because neither has stopped caring. Each word names a different room inside the same house. Reading the right word can make a feeling less lonely, because it proves someone else has mapped it before.",
      "The classical ghazal refuses to treat heartbreak as a problem to be solved. Ghalib does not offer recovery; he offers precision. Mir Taqi Mir turns loss into a landscape. Faiz Ahmed Faiz makes separation political and tender at once. Jaun Elia strips away consolation and leaves only the self, smoking and mocking its own wounds. This is why the tradition still works for a generation that has never read a diwan: the poets are not trying to cheer the reader up. They are trying to tell the truth about what remains after love.",
      "Modern Hinglish heartbreak shayari has its own grammar. It lives in chat screenshots, read receipts, deleted drafts, and the particular pain of seeing someone online without a message. The images are new, but the structure is old: a concrete scene in the first line, an emotional reversal in the second. 'Tumne last message padha aur ignore kar diya' can become a sher if the second line carries the weight of what that silence means. The platform's AI co-writer is designed to help with exactly this translation from daily detail into metered verse.",
      "Not every heartbreak poem has to be about a lover. Hijr can also describe a city you left, a parent who died, a friendship that quietly ended, or a version of yourself you cannot return to. The Urdu tradition is spacious enough to hold all of these. When the word 'beloved' appears, it can be read as a person, a place, a faith, or an earlier life. That ambiguity is not a weakness; it is what allows a four-hundred-year-old couplet to fit a completely new grief.",
      "Read slowly. Choose the poem that matches the weather inside you, not the one with the most dramatic words. If you are not ready to write, read all four scripts and let the meaning settle. If you are ready, open the AI Poet with three seed words from your own life and generate a first draft. You can keep it private, seal it into a Khwaab Khat, or turn it into a card. The point is not to perform healing. The point is to give the feeling a shape it can breathe in.",
    ],
    relatedWords: ["hijr", "firaaq", "gham", "malal", "bewafa", "shab-e-gham"],
    faq: [
      {
        q: "What is the difference between hijr and firaaq?",
        a: "Hijr is the state of separation from the beloved; firaaq is the grief and pain of that absence. Poets often use them together, but hijr describes the distance while firaaq describes what the distance does to the heart.",
      },
      {
        q: "Can heartbreak shayari help with emotional healing?",
        a: "Reading or writing poetry can make a difficult feeling feel witnessed. It does not replace professional support, but naming an emotion precisely — through a word like gham, malal, or ranjish — can reduce its isolation and help you understand it.",
      },
      {
        q: "How do I write heartbreak shayari in Hinglish?",
        a: "Start with one concrete detail from the separation: an object, a place, or a message. Write the scene in the first line, then let the second line reveal what it means. Avoid generic words like dard unless the context earns them.",
      },
    ],
    filter: (p) =>
      p.mood.includes("Heartbreak") ||
      (p.tags || []).some((t) => {
        const l = t.toLowerCase();
        return l.includes("dard") || l.includes("hijr") || l.includes("firaaq") || l.includes("tanhai");
      }),
  },

  "love-shayari": {
    slug: "love-shayari",
    title: "Unspoken Love & Ishq Shayari",
    shortLabel: "Love & Ishq",
    seoTitle: "Deep Love, Ishq & Ek-Tarfa Mohabbat Shayari | Ek Khwaab",
    description:
      "Read deep love shayari, ishq couplets, and ek-tarfa mohabbat poetry in Hindi, Urdu, and Hinglish. Tender verses for unspoken love, longing, and quiet devotion.",
    heading: "Unspoken Love (Ishq) — Verses Where Gazes Meet",
    sub: "For words that were never spoken aloud, but were understood by the soul.",
    intro:
      "Classical Ishq does not demand loud confessions. It lives in small gestures: sugar in lukewarm tea, a stolen glance across a crowded room, or silence shared comfortably between two souls.",
    content: [
      "Urdu poetry distinguishes between several kinds of love. Mohabbat is affection that can be warm, domestic, and reciprocal. Ishq is excessive love that takes over the self. Ek-tarfa mohabbat is one-sided love: a feeling that exists without requiring an answer. The distinction matters because each one produces a different poem. A mohabbat poem can end with a shared cup of tea. An ishq poem usually ends with the lover changed beyond recognition. An ek-tarfa poem ends with the beloved never knowing how much they were loved.",
      "Unspoken love is the most refined strain of the tradition. In the ghazal, the lover often does not ask for union. The beloved's indifference becomes an ornament; tagaful — feigned neglect — is praised because it proves the beloved noticed enough to look away. This sounds strange to modern ears, but it is a sophisticated psychological insight. Silence is not empty. It is full of decisions. The lover reads a hundred meanings into a turned shoulder, and the poem records the reading.",
      "Modern love shayari often loses this restraint. It shouts the feeling and calls it depth. The better Hinglish verses keep something back. They describe the walk to the station, the extra minute held at the door, the message typed and deleted three times. The beloved is not a goddess on a pedestal; they are a person who forgets their umbrella and laughs at their own joke. Specificity is what makes love poetry believable. A reader should be able to imagine the room, not just the emotion.",
      "Love poetry also has a responsibility. It should not confuse possession with devotion, or jealousy with proof of care. The classical tradition contains both healthy and unhealthy love, and modern readers are allowed to be selective. The strongest verses on this page are the ones that honour the beloved's freedom. They say: I love you, and you are still your own person. That tension — nearness without ownership — is what makes the form endure.",
      "If you want to write your own, begin with a moment of attention rather than a declaration. What did you notice about them that nobody else did? What small thing did they do that you still remember? Put that in the first line. Let the second line tell us what it cost you to notice. Then read the poem in all three scripts. Hinglish keeps the intimacy, Devanagari gives it a different music, and Nastaliq gives it the dignity of the classical ghazal.",
    ],
    relatedWords: ["ishq", "arzoo", "qurbat", "wafa", "rooh", "mahtab"],
    faq: [
      {
        q: "What is ek-tarfa mohabbat?",
        a: "Ek-tarfa mohabbat is one-sided love: a deep feeling that is not returned, or is not known to the beloved. It is one of the oldest themes in Urdu poetry because it allows the poet to explore longing, dignity, and silence without requiring a happy ending.",
      },
      {
        q: "What is the difference between ishq and mohabbat?",
        a: "Mohabbat is tender affection that can be calm, mutual, and domestic. Ishq is more intense and transformative; it rearranges the lover's sense of self. Both are love, but ishq is the storm and mohabbat is the shelter.",
      },
      {
        q: "How do I express unspoken love in a poem?",
        a: "Focus on a specific moment of attention rather than a confession. Describe what you noticed, what you almost said, and what you did instead. The restraint is what makes the poem feel like real unspoken love.",
      },
    ],
    filter: (p) =>
      p.mood.includes("Love") ||
      (p.tags || []).some((t) => {
        const l = t.toLowerCase();
        return l.includes("ishq") || l.includes("love") || l.includes("qurbat") || l.includes("pyaar");
      }),
  },

  "loneliness-shayari": {
    slug: "loneliness-shayari",
    title: "Late Night Tanhai Poetry",
    shortLabel: "Late Night Tanhai",
    seoTitle: "Late Night Tanhai, Khamoshi & Alone Shayari (2 AM Poetry) | Ek Khwaab",
    description:
      "Explore 2 AM tanhai shayari, midnight solitude couplets, and khamoshi poetry in Hindi, Urdu, and Hinglish. A quiet sanctuary for solitary hearts.",
    heading: "Late Night Tanhai — Verses for the 2 AM Hours",
    sub: "Quiet reflections, old memories, and solitary contemplation when the city sleeps.",
    intro:
      "Night (Shab) is the hour of absolute honesty in shayari. When daylight pretence disappears, the poet sits with paper, tea, and memories that refuse to fade.",
    content: [
      "There is a specific loneliness that belongs to 2 AM. The city has gone quiet, the phone has stopped lighting up, and the mind begins to replay conversations with a clarity that daylight never allows. Urdu poetry has a word for this climate: tanhai, the condition of being alone. It is not the same as solitude, which can be chosen and nourishing. Tanhai is the loneliness that arrives after everyone has left, when the room is still full of their absence.",
      "Classical poets treat night as a witness. In Mir and Ghalib, the sleepless speaker is not simply sad; he is conducting an argument with the dark. Shab-e-gham — the night of sorrow — becomes a companion, a rival, and a mirror. The beloved may be absent, but the night is present, and it refuses to hurry. Modern late-night shayari inherits this atmosphere but changes the furniture. The lamp is now a phone screen. The letter is now a draft folder. The long wait is a 'seen' receipt that never becomes a reply.",
      "Khamoshi, or silence, is tanhai's closest relative. In poetry, silence is rarely empty. It can be the silence after a fight, the silence of a house where someone used to sleep, or the silence of a person who has decided not to explain themselves anymore. The strongest loneliness verses do not complain about silence; they listen to it. They notice what the refrigerator is humming, what the ceiling looks like at 3 AM, what a half-finished glass of water on the bedside table is doing to the heart.",
      "Loneliness poetry also has a practical use. It gives shape to a feeling that can otherwise feel endless. When you read a couplet that names your exact condition, the night becomes slightly less private. You are still alone, but you are alone in a tradition. That is not a cure, and the page should never pretend to be one. If the loneliness is heavy or persistent, talking to someone you trust matters more than any poem. Poetry can hold a feeling; it cannot replace human care.",
      "For a quiet ritual, dim the lights and read one couplet in each script. Start with Hinglish, then Devanagari, then Nastaliq. Notice how the same meaning changes texture. If you want to write, keep a notebook beside the bed and finish three lines before you sleep. You do not need to publish them. The AI Poet can help you find the fourth line, and the Card Studio can turn the finished verse into a private image. Some poems are not for an audience. They are for the night that needed them.",
    ],
    relatedWords: ["shab", "shab-e-gham", "khamoshi", "intezaar", "gham", "kaagaz"],
    faq: [
      {
        q: "Why is late-night shayari so popular?",
        a: "Late night removes distraction and social performance. People are more willing to feel and reflect, so tanhai and 2 AM poetry become a shared language for emotions that are harder to express during the day.",
      },
      {
        q: "What does tanhai mean in Urdu poetry?",
        a: "Tanhai means loneliness or being alone. In poetry it often describes the absence of a specific person, while shab-e-gham describes the sorrowful night that follows that absence.",
      },
      {
        q: "Can reading shayari help with loneliness?",
        a: "It can reduce isolation by showing that others have felt something similar and found words for it. It is a companion, not a substitute for reaching out to friends, family, or a mental-health professional when loneliness becomes overwhelming.",
      },
    ],
    filter: (p) =>
      p.mood.includes("Late Night") ||
      (p.tags || []).some((t) => {
        const l = t.toLowerCase();
        return l.includes("tanhai") || l.includes("night") || l.includes("2am") || l.includes("khamoshi");
      }),
  },

  "jaun-elia-style-shayari": {
    slug: "jaun-elia-style-shayari",
    title: "Jaun Elia Style Melancholy",
    shortLabel: "Jaun Elia Style",
    seoTitle: "Jaun Elia Style Melancholic & Existential Shayari Tribute | Ek Khwaab",
    description:
      "Read a Jaun Elia style shayari tribute: melancholic, self-mocking, existential couplets in Hinglish, Hindi, and Urdu. Explore his vocabulary and poetic legacy.",
    heading: "Jaun Elia Style — Melancholy With a Razor in Its Mouth",
    sub: "A tribute to the poet who refused consolation, mocked his own wounds, and made existential loneliness sound conversational.",
    intro:
      "Jaun Elia (1931–2002) changed the temperature of Urdu poetry. He brought the drawing room, the cigarette, the failed marriage, and the argument with God into the ghazal — and he did it with a shrug rather than a sermon.",
    content: [
      "Jaun Elia was born in Amroha in 1931, migrated to Pakistan after Partition, and spent decades as a journalist, editor, and translator before his first major collection, Shayad, appeared in 1991. He was a polymath who read philosophy, history, and languages, but his poems rarely advertise their learning. They sound like a man talking to himself in a darkened room, interrupting his own grief with a joke. That conversational surface is deceptive. Underneath it, the couplets are carefully built, and the irony is doing the work of a scalpel.",
      "The signature move of Jaun Elia's style is self-mockery. He does not ask the reader to admire his suffering. He stands beside the reader and makes fun of it, even as the pain remains real. This is why his poetry appeals to people who dislike performative sadness. He refuses the soft landing. There is no 'everything happens for a reason' in his work, no consolation waiting at the end of the ghazal. There is only the honest, slightly embarrassed fact of being alive and unable to stop remembering.",
      "His vocabulary is another signature. He mixes the classical with the casual: philosophical abstraction beside a domestic complaint, a Persianate word beside a street phrase. He uses words like gham, malal, ranjish, vehshat, and qafas, but he does not treat them as museum pieces. He handles them as if they were objects on his desk. The effect is a poetry that feels both old and impatient, as though the ghazal had been given a cigarette and asked to tell the truth about the twentieth century.",
      "Writing a Jaun Elia style shayari is not the same as copying his lines. Imitation produces pastiche; tribute produces a new poem that acknowledges its lineage. The AI Poet's Jaun Elia style lens is designed around the underlying mechanics: sharp self-address, existential irony, melancholic specificity, and a refusal to resolve. It will not reproduce his copyrighted couplets, and it should not. The goal is to help you write your own disillusionment in a voice that has learned from his. Always credit the influence, never the authorship.",
      "Read the poems on this page as a gateway, then seek out the originals. Shayad and his later collections are widely available, and no tribute can replace the real thing. If you want to write in this register, start with a complaint you have about yourself rather than a complaint about the world. Make it specific. Make it funny. Then remove the joke that explains too much. That is the Jaun Elia discipline: leave the wound visible, but refuse to make it beautiful on purpose.",
    ],
    relatedWords: ["gham", "malal", "ranjish", "vehshat", "qafas", "dil-e-nadaan"],
    faq: [
      {
        q: "What is Jaun Elia's poetry about?",
        a: "Jaun Elia wrote about existential loneliness, failed love, self-mockery, God, philosophy, and the ordinary fatigue of being alive. His style is conversational, ironic, and deliberately resistant to easy consolation.",
      },
      {
        q: "Can I generate shayari in Jaun Elia style?",
        a: "Ek Khwaab's AI Poet includes a Jaun Elia style lens that uses the mechanics of his voice — self-address, irony, melancholic specificity, and unresolved endings — without reproducing his original couplets.",
      },
      {
        q: "Is it okay to write a tribute to Jaun Elia?",
        a: "Yes, as long as you do not copy his poems and claim them as your own. A tribute should name the influence, use your own lines, and add something personal rather than imitating the surface of his style.",
      },
    ],
    filter: (p) =>
      p.mood.includes("Heartbreak") ||
      p.style === "Classical" ||
      (p.tags || []).some((t) => {
        const l = t.toLowerCase();
        return l.includes("dard") || l.includes("firaaq") || l.includes("ranjish") || l.includes("malal") || l.includes("baghi");
      }),
  },

  "gulzar-style-poetry": {
    slug: "gulzar-style-poetry",
    title: "Gulzar Style Poetry",
    shortLabel: "Gulzar Style",
    seoTitle: "Gulzar Style Nostalgic Nazms, Triveni & Metaphorical Shayari | Ek Khwaab",
    description:
      "Explore Gulzar style poetry: nostalgic nazms, triveni, everyday metaphors, and tender shayari in Hinglish, Hindi, and Urdu. Learn the craft behind his quiet imagery.",
    heading: "Gulzar Style — The Poetry of Ordinary Objects",
    sub: "Spectacles, train windows, monsoon, old letters, and the paused time between two people.",
    intro:
      "Gulzar's genius is not grand imagery. It is the ability to make a chai cup, a broken spectacle frame, or a train window carry an entire life. His poems feel like memories that have been waiting for someone to open the drawer.",
    content: [
      "Gulzar was born Sampooran Singh Kalra in 1934 in Dina, now in Pakistan. He came to Bombay as a young man with a love of poetry and a reluctance to write for films, then became one of Hindi cinema's defining lyricists and, later, a director and poet. His work across these forms shares one quality: a camera-like attention to ordinary objects. He does not describe sadness directly. He describes the empty chair, the second cup of tea, the photograph that has been kept face-down for years.",
      "The triveni is one of his signature forms: a three-line poem in which two lines set a scene and the third line turns it into an epiphany. The form is short enough to read in a breath and long enough to hold a small story. A triveni might begin with rain on a window, move to a woman drying her hair, and end with a line that reveals the entire relationship in a single image. This is Gulzar's craft in miniature: the reader is never told what to feel, only given the object that makes the feeling unavoidable.",
      "His style also depends on an unusual kind of nostalgia. It is not the nostalgia of a golden past or a lost homeland. It is the nostalgia of a moment that had not yet become a memory — a platform where two people are standing, a kitchen at dusk, a bus that has not arrived. He writes the present as if it were already being remembered. That double perspective gives his poems their distinctive ache. The reader feels the loss before the loss has happened.",
      "Gulzar's language is deceptively simple. He uses Hindi, Urdu, Punjabi, and colloquial Bombay speech without announcing the mixture. The vocabulary is chosen for texture rather than difficulty. Words like shabnam, kaagaz, chiraagh, and mahtab appear alongside everyday objects, and the contrast keeps the poem from floating away. The result is a poetry that can be understood by a first-time reader and still reward a careful one. That is not a compromise; it is a discipline.",
      "To write in a Gulzar-inspired register, start with an object that has been touched by someone you miss. A hairpin. A metro card. The corner of a letter. Describe the object without explaining the person. Then let the third line do the work of revelation. The AI Poet's Gulzar style lens is built around these mechanics: tangible metaphors, paused time, tenderness without sentimentality. Use it to find the draft, then edit until the object feels like it belongs to your life, not to a template.",
    ],
    relatedWords: ["shabnam", "kaagaz", "chiraagh", "mahtab", "rubaab", "safar"],
    faq: [
      {
        q: "What is a triveni in Gulzar's poetry?",
        a: "A triveni is a three-line poem associated with Gulzar. The first two lines usually establish a concrete scene, and the third line turns it into a larger emotional or philosophical insight.",
      },
      {
        q: "What makes Gulzar's style distinctive?",
        a: "His style is built from ordinary objects, camera-like observation, understated nostalgia, and a mixture of Hindi, Urdu, and Punjabi speech. He rarely states an emotion directly, relying on images to carry it.",
      },
      {
        q: "Can I write Gulzar style poetry with AI?",
        a: "Yes. Ek Khwaab's AI Poet includes a Gulzar style lens that focuses on tangible metaphors, paused time, and nostalgic observation. Use it as a draft, then revise with your own details so the poem remains yours.",
      },
    ],
    filter: (p) =>
      p.format === "Nazm" ||
      p.hinglish.length === 3 ||
      (p.tags || []).some((t) => {
        const l = t.toLowerCase();
        return l.includes("chai") || l.includes("yaadein") || l.includes("station") || l.includes("shabnam") || l.includes("khamoshi") || l.includes("late night");
      }),
  },

  "shayari-for-instagram": {
    slug: "shayari-for-instagram",
    title: "Aesthetic Shayari for Instagram",
    shortLabel: "Instagram Shayari",
    seoTitle: "Aesthetic Shayari for Instagram Stories, Captions & Bio (9:16 Cards) | Ek Khwaab",
    description:
      "Download aesthetic shayari for Instagram Stories, captions, and bios. Create clean 9:16 and 1:1 HD cards in Hinglish, Hindi, and Urdu with Ek Khwaab's Card Studio.",
    heading: "Aesthetic Shayari for Instagram — Stories, Captions & Bios",
    sub: "A quiet couplet, a clean frame, and enough white space to let the feeling breathe.",
    intro:
      "The best Instagram shayari does not fight the platform. It uses the story format, the square post, and the caption as three different rooms for the same feeling.",
    content: [
      "Instagram changed the way a generation reads poetry. A couplet is now encountered as a story frame, a carousel slide, or a screenshot saved to a highlights folder. This is not a lesser way to read. It is a different way, with its own craft. A poem that works on a printed page may disappear on a phone if the type is too small, the background is too busy, or the line breaks fight the crop. Designing for Instagram is part of writing for Instagram.",
      "The 9:16 story format is the most demanding. Instagram reserves space at the top for the profile bar and at the bottom for the reply box, so the central safe zone is smaller than the full canvas. Keep the couplet inside that zone. Use two to four lines, not a full ghazal. Choose a type size that remains readable when the phone is held at arm's length. A white or cashmere background with dark ink is usually stronger than a photograph, because the reader does not have to search for the text. The poem should be the brightest thing in the frame.",
      "The 1:1 square post is more forgiving and more permanent. It sits in the grid, so it needs a strong first impression even at thumbnail size. A single sher with a generous margin often outperforms a dense design. If you are posting a ghazal, consider a carousel: one couplet per slide, with the same typography and spacing across all slides. The repetition creates rhythm, and the reader swipes through the poem the way they would turn pages. Do not add a different background to every slide; consistency is what makes a carousel feel intentional.",
      "Captions and bios are a third format. A caption can hold the full poem, a translation, and a short note about what inspired it. A bio can hold only a fragment — one line, one image, one word. The best bio shayari is usually the second line of a couplet, because it carries the turn without needing the setup. Choose a line that means something on its own, and resist the urge to explain it. Mystery is part of the aesthetic.",
      "Ek Khwaab's Card Studio is built for this workflow. It renders the preview and the exported PNG through the same canvas draw function, so the image you approve is the image you download. You can choose a 9:16 or 1:1 ratio, switch between Hinglish, Devanagari, and Nastaliq, and export at high resolution without a watermark. Start with a poem from this page, open it in the studio, and change only one thing at a time: the script, the margin, or the background. The cleanest card is usually the one with the fewest decisions.",
    ],
    relatedWords: ["ishq", "arzoo", "khamoshi", "mahtab", "wafa", "guftagu"],
    faq: [
      {
        q: "What size should a shayari card be for Instagram Stories?",
        a: "Use a 9:16 vertical canvas, usually 1080 × 1920 pixels. Keep the text inside the central safe zone so Instagram's profile bar and reply box do not cover it.",
      },
      {
        q: "How do I make an aesthetic shayari card?",
        a: "Choose a short couplet, use a clean background, keep generous margins, and limit the design to one typeface family. Ek Khwaab's Card Studio exports 9:16 and 1:1 cards at high resolution.",
      },
      {
        q: "Can I use Ek Khwaab shayari in my Instagram bio?",
        a: "Yes. Short couplets work well as bio lines. Pick a single line that stands on its own, and credit the poet or Ek Khwaab if the verse is not yours.",
      },
    ],
    filter: (p) => p.format === "Sher" || p.format === "Qata" || p.hinglish.length <= 3,
  },
};

export const TOPIC_SLUGS = Object.keys(TOPICS);

export const getTopicBySlug = (slug: string) => TOPICS[slug];
