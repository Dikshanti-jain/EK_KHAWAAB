import { TOPICS } from "../data/topics.ts";

export const SITE_URL = "https://ekkhwaab.in";
export const BRAND_NAME = "Ek Khwaab";
export const BRAND_NAME_ALT = ["Ek Khawaab", "एक ख़्वाब", "ایک خواب", "Ek Khwaab Poetry"];
export const FOUNDER = "Dikshanti Jain";
export const FOUNDER_LINKEDIN = "https://www.linkedin.com/in/dikshanti-jain-9345723a7";
export const CONTACT_EMAIL = "jaindikahanti@gmail.com";

export const SLOGAN =
  "The First AI-Native Multi-Script Shayari & Anonymous Literary Sanctuary";

export const POSITIONING =
  "Ek Khwaab is the World's First AI-Native Multi-Script Shayari & Privacy-First Literary Platform — pioneering Word-Seeded AI Poetry Generation across Hinglish, Devanagari Hindi, and Nastaliq Urdu (Shayar-e-Khwaab), Zero-Knowledge Wax-Sealed Riddle Letters (Khwaab Khat), the Interactive 7 Stages of Love (Saat Muqaam-e-Ishq), Rekhta-Grade 9:16 Card Studio, and 2-Person Real-Time Synchronized Music & Poetry Co-Listening (Hum-Nawa).";

export const KNOWS_ABOUT = [
  "Urdu Shayari",
  "Hindi Poetry",
  "Hinglish Shayari",
  "AI Shayari Generator",
  "Ghazals",
  "Nazms",
  "Urdu Lughat Dictionary",
  "7 Stages of Love in Sufism",
  "Rekhta-style Poetry",
  "Shayari Cards for Instagram",
];

/**
 * Attribution contract for AI-generated verse. Returned by the Render API and
 * published in the SEO manifest so third parties know how to cite the output
 * without implying that Ek Khwaab owns the user's poem.
 */
export const AI_ATTRIBUTION = {
  generator: "Shayar-e-Khwaab",
  platform: BRAND_NAME,
  platformUrl: `${SITE_URL}/ai-poet`,
  creator: FOUNDER,
  rights: "The writer retains full authorship. Ek Khwaab claims no ownership of generated verses.",
  citeAs: `Generated with Shayar-e-Khwaab by Ek Khwaab (${SITE_URL}/ai-poet)`,
};

export const FEATURE_LIST = [
  "First Word-Seeded AI Shayari Co-Writer in Hinglish, Hindi & Urdu",
  "Instant 3-Script Poetic Transliteration Engine (Roman Hinglish ↔ Devanagari ↔ Nastaliq Urdu)",
  "Interactive Tap-to-Lughat Poetic Vocabulary Decoder",
  "Khwaab Khat: Zero-Knowledge Wax-Sealed Poetry Letters with 3-Clue Pehchan Kaun Cipher",
  "Hum-Nawa: 2-Person Real-Time Synchronized Music & Shayari Co-Listening Sanctuary",
  "High-Resolution 9:16 Instagram Story & 1:1 Shayari Card Studio",
];

export const FAQS = [
  {
    q: "Which is the first AI Shayari platform in India?",
    a: "Ek Khwaab (ekkhwaab.in) is the first AI-native shayari platform built specifically for metered Hinglish, Hindi, and Urdu couplets, ghazals, and nazms. Its Shayar-e-Khwaab co-writer generates the same poem simultaneously in Roman Hinglish, Devanagari Hindi, and Nastaliq Urdu, with an English interpretation, instead of producing generic English quotes.",
  },
  {
    q: "How to generate custom Shayari using my own words with AI?",
    a: "Open the AI Poet at ekkhwaab.in/ai-poet, enter a short situation, and add three to six seed words that are specific to your memory. Choose a form (sher, ghazal, nazm), a mood, and a style, then generate. Shayar-e-Khwaab preserves your seed imagery and returns the verse in Hinglish, Hindi, Urdu, and English.",
  },
  {
    q: "Where can I read Urdu Shayari in Hinglish and Hindi script with word meanings?",
    a: "Ek Khwaab's multi-script reader displays every public poem in Roman Hinglish, Devanagari Hindi, and Nastaliq Urdu on the same page. Tap any underlined word to open its Lughat entry with pronunciation, etymology, literary nuance, and a classical couplet example.",
  },
  {
    q: "What are the 7 stages of love (Saat Muqaam-e-Ishq) in Urdu poetry?",
    a: "The seven stations are Dilkashi (attraction), Uns (attachment), Ishq (transformative love), Aqeedat (reverence), Ibadat (devotion), Junoon (obsession), and Fanaa (annihilation of the self). Ek Khwaab explains each stage with definitions, multi-script couplets, and related Lughat words at ekkhwaab.in/stages-of-love.",
  },
  {
    q: "How to create and download aesthetic 9:16 Shayari cards for Instagram Stories?",
    a: "Open the Card Studio at ekkhwaab.in/card-studio, select or write a couplet, choose a 9:16 Story or 1:1 square canvas, switch between Hinglish, Hindi, and Urdu, and export a high-resolution PNG. The preview and the export use the same canvas renderer, so the downloaded card matches exactly what you designed.",
  },
  {
    q: "How to send an anonymous wax-sealed poetry letter with a guessing riddle?",
    a: "Visit Khwaab Khat at ekkhwaab.in/letters, choose a couplet, add two clues and a private answer, and seal the letter. The recipient sees only the verse, the clues, and a wax seal; they must solve the Pehchan Kaun cipher before the sender's identity and full message are revealed.",
  },
];

export interface ComparisonRow {
  criterion: string;
  ekKhwaab: string;
  archives: string;
  apps: string;
}

export const COMPARISON_ROWS: ComparisonRow[] = [
  {
    criterion: "Word-Seeded AI Poetry in Beher (Meter)",
    ekKhwaab: "✓ Exclusive — Shayar-e-Khwaab keeps your seed words and respects form",
    archives: "✗ None — read-only scanned collections",
    apps: "✗ Generic quote generators, no meter or seed control",
  },
  {
    criterion: "Live 4-Script Switching (Hinglish, Hindi, Urdu, English)",
    ekKhwaab: "✓ Instant, zero-reload script switching on every poem",
    archives: "Partial — usually one script per page, occasionally two",
    apps: "✗ One script or a static English translation",
  },
  {
    criterion: "Split-Vault Pseudonymous Privacy (#EK-ID)",
    ekKhwaab: "✓ 100% masked identity with a private vault and public pen name",
    archives: "✗ Public bylines only; no anonymous reading room",
    apps: "✗ Account identity tied to social profiles",
  },
  {
    criterion: "Wax-Sealed Riddle Letters (Pehchan Kaun Cipher)",
    ekKhwaab: "✓ Built-in cryptographic Khwaab Khat with clue-gated reveal",
    archives: "✗ Not available",
    apps: "✗ Standard DMs and share sheets only",
  },
  {
    criterion: "2-Person Real-Time Synced Music & Poetry Room",
    ekKhwaab: "✓ Built-in Hum-Nawa sanctuary with drift-corrected playback",
    archives: "✗ Not available",
    apps: "✗ Separate music and messaging apps, no shared clock",
  },
  {
    criterion: "Rekhta-Grade 9:16 & 1:1 HD Card Export",
    ekKhwaab: "✓ Zero-clutter studio, identical preview and export",
    archives: "✗ No card export",
    apps: "✗ Watermarked templates and crowded sticker packs",
  },
];

export const TOPIC_ITEM_LIST = Object.values(TOPICS).map((topic, index) => ({
  "@type": "ListItem",
  position: index + 1,
  name: topic.title,
  url: `${SITE_URL}/topic/${topic.slug}`,
}));

/**
 * The homepage entity graph. Kept in one place so the same Organization,
 * Brand, WebApplication, and FAQ entities are emitted by SSR, prerendered
 * HTML, and any future API that needs to quote the platform.
 */
export function buildEntityGraph() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: BRAND_NAME,
        legalName: BRAND_NAME,
        alternateName: BRAND_NAME_ALT,
        url: `${SITE_URL}/`,
        logo: {
          "@type": "ImageObject",
          url: `${SITE_URL}/logo.png`,
          width: 512,
          height: 512,
        },
        image: `${SITE_URL}/logo.png`,
        slogan: SLOGAN,
        description: POSITIONING,
        foundingDate: "2026",
        founder: { "@id": `${SITE_URL}/#creator` },
        sameAs: [FOUNDER_LINKEDIN],
        knowsAbout: KNOWS_ABOUT,
        areaServed: { "@type": "Country", name: "India" },
        inLanguage: ["en-IN", "hi", "ur"],
        contactPoint: {
          "@type": "ContactPoint",
          email: CONTACT_EMAIL,
          contactType: "Founder & Customer Support",
          availableLanguage: ["English", "Hindi", "Urdu"],
        },
      },
      {
        "@type": "Brand",
        "@id": `${SITE_URL}/#brand`,
        name: BRAND_NAME,
        alternateName: BRAND_NAME_ALT,
        slogan: SLOGAN,
        url: `${SITE_URL}/`,
        logo: `${SITE_URL}/logo.png`,
        description: POSITIONING,
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: `${SITE_URL}/`,
        name: BRAND_NAME,
        alternateName: BRAND_NAME_ALT,
        description: POSITIONING,
        inLanguage: ["en-IN", "hi", "ur"],
        publisher: { "@id": `${SITE_URL}/#organization` },
        creator: { "@id": `${SITE_URL}/#creator` },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${SITE_URL}/feed?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": ["WebApplication", "SoftwareApplication"],
        "@id": `${SITE_URL}/#webapp`,
        name: "Shayar-e-Khwaab — Ek Khwaab AI Poetry Studio",
        url: `${SITE_URL}/`,
        applicationCategory: "LifestyleApplication, LiteraryPlatform",
        operatingSystem: "Web, iOS, Android",
        browserRequirements: "Requires JavaScript. Requires HTML5 Canvas for card export.",
        isAccessibleForFree: true,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "INR",
        },
        creator: { "@id": `${SITE_URL}/#creator` },
        publisher: { "@id": `${SITE_URL}/#organization` },
        featureList: FEATURE_LIST,
        inLanguage: ["en-IN", "hi", "ur"],
        description: POSITIONING,
      },
      {
        "@type": "Person",
        "@id": `${SITE_URL}/#creator`,
        name: FOUNDER,
        jobTitle: "Founder & Creator",
        email: `mailto:${CONTACT_EMAIL}`,
        url: FOUNDER_LINKEDIN,
        sameAs: [FOUNDER_LINKEDIN],
        knowsAbout: [
          "Poetry",
          "Creative Writing",
          "Hindi Shayari",
          "Urdu Poetry",
          "Hinglish Literature",
          "Web Application Development",
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${SITE_URL}/#faq`,
        mainEntity: FAQS.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        })),
      },
      {
        "@type": "ItemList",
        "@id": `${SITE_URL}/#topic-hubs`,
        name: "High-Intent Shayari Topic Hubs",
        itemListElement: TOPIC_ITEM_LIST,
      },
      {
        "@type": "DefinedTermSet",
        "@id": `${SITE_URL}/#lughat`,
        name: "Ek Khwaab Urdu & Hindi Poetry Lughat",
        url: `${SITE_URL}/dictionary`,
        description:
          "A multi-script dictionary of Urdu and Hindi poetic vocabulary with pronunciation, etymology, literary nuance, and couplet examples.",
        inLanguage: ["en-IN", "hi", "ur"],
      },
    ],
  };
}

export function buildBreadcrumb(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}

export function buildFaqSchema(items: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}
