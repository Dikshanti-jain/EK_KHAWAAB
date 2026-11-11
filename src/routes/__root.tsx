import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { safeJsonLd } from "@/lib/security";
import { Outlet, Link, createRootRouteWithContext, useRouter, HeadContent, Scripts, type ErrorComponentProps } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Linkedin, Mail, Menu, X, Home as HomeIcon, BookOpen, Sparkles, Palette, User as UserIcon } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { StoreProvider, useStore } from "@/lib/store";
import { IdBadge, btnGhost, btnOutline, btnPrimary } from "@/components/kit";
import { AmbientAudio } from "@/components/AmbientAudio";
import { cn } from "@/lib/utils";

function NotFoundComponent() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-6 text-center">
      <span className="rounded-full bg-blush px-3 py-1 text-xs font-medium text-crimson">404 · Page not found</span>
      <h1 className="mt-6 text-5xl font-semibold text-ink">This page drifted away</h1>
      <p className="mt-4 font-serif text-xl italic text-muted-foreground">"Jis warq ko aap dhoondh rahe hain, woh hawa ke jhonke mein kahin kho gaya..."</p>
      <Link to="/feed" className={`${btnPrimary} mt-8`}>Back to the Feed</Link>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => { reportLovableError(error, { boundary: "tanstack_root_error_component" }); }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center px-4 text-center">
      <div>
        <h1 className="text-3xl font-semibold">This page didn't load</h1>
        <div className="mt-6 flex justify-center gap-2">
          <button onClick={() => { router.invalidate(); reset(); }} className={btnPrimary}>Try again</button>
          <a href="/" className={btnOutline}>Go home</a>
        </div>
      </div>
    </div>
  );
}

const JSON_LD_SCHEMA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://ekkhwaab.in/#website",
      "url": "https://ekkhwaab.in/",
      "name": "Ek Khwaab",
      "alternateName": [
        "एक ख़्वाब",
        "ایک خواب",
        "Ek Khwaab — Anonymous Poetry Sanctuary",
        "Ek Khwaab Poetry"
      ],
      "description": "An anonymous poetry sanctuary for lovers of Hinglish, Hindi, and Urdu shayari, ghazals, and nazms. Features AI co-writing, 1080p card studio, and secret letters.",
      "inLanguage": ["en-IN", "hi", "ur"],
      "publisher": {
        "@id": "https://ekkhwaab.in/#creator"
      },
      "creator": {
        "@id": "https://ekkhwaab.in/#creator"
      },
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": "https://ekkhwaab.in/feed?q={search_term_string}"
        },
        "query-input": "required name=search_term_string"
      }
    },
    {
      "@type": "WebApplication",
      "@id": "https://ekkhwaab.in/#webapp",
      "name": "Ek Khwaab App",
      "url": "https://ekkhwaab.in/",
      "applicationCategory": "EntertainmentApplication",
      "operatingSystem": "All",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "INR"
      },
      "featureList": [
        "Word-to-Verse AI Co-Writer",
        "1080p High-Resolution Card Studio (9:16 & 1:1)",
        "Instant Multi-Script Reader (Hindi, Urdu, Hinglish)",
        "Khawaab Khat Wax-Sealed Secret Letters",
        "Comprehensive Lughat Urdu Poetry Dictionary"
      ]
    },
    {
      "@type": "Person",
      "@id": "https://ekkhwaab.in/#creator",
      "name": "Dikshanti Jain",
      "jobTitle": "Owner & Creator",
      "email": "mailto:jaindikahanti@gmail.com",
      "url": "https://www.linkedin.com/in/dikshanti-jain-9345723a7",
      "sameAs": [
        "https://www.linkedin.com/in/dikshanti-jain-9345723a7"
      ],
      "knowsAbout": [
        "Poetry",
        "Creative Writing",
        "Hindi Shayari",
        "Urdu Poetry",
        "Literature",
        "Web Application Development"
      ]
    },
    {
      "@type": "Organization",
      "@id": "https://ekkhwaab.in/#organization",
      "name": "Ek Khwaab",
      "url": "https://ekkhwaab.in/",
      "founder": {
        "@id": "https://ekkhwaab.in/#creator"
      },
      "contactPoint": {
        "@type": "ContactPoint",
        "email": "jaindikahanti@gmail.com",
        "contactType": "Founder & Customer Support"
      }
    },
    {
      "@type": "ItemList",
      "@id": "https://ekkhwaab.in/#featured-shayaris",
      "name": "Featured Couplets & Shayaris",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "item": {
            "@type": "CreativeWork",
            "name": "Ab kisi baat pe dil dukhta nahi",
            "text": "Ab kisi baat pe dil dukhta nahi, shayad patthar ho gaya hai. / Roz ek nayi ummeed jagti hai, roz ek khwaab so gaya hai.",
            "author": { "@type": "Person", "name": "Faiz-e-Khawaab" },
            "inLanguage": "hi-Latn"
          }
        },
        {
          "@type": "ListItem",
          "position": 2,
          "item": {
            "@type": "CreativeWork",
            "name": "Har subah ek nayi subah hoti hai",
            "text": "Har subah ek nayi subah hoti hai, par teri yaad purani rehti hai. / Aankhon mein aasoon toh sookh gaye, par dil mein kahani rehti hai.",
            "author": { "@type": "Person", "name": "Saahir-e-Lafz" },
            "inLanguage": "hi-Latn"
          }
        },
        {
          "@type": "ListItem",
          "position": 3,
          "item": {
            "@type": "CreativeWork",
            "name": "Kuch toh baat thi uski khamoshi mein",
            "text": "Kuch toh baat thi uski khamoshi mein, jo baatein cheekh cheekh kar bhi na keh saki. / Hum toh khade rahe usi mod par, par zindagi aage beh gayi.",
            "author": { "@type": "Person", "name": "Mirza-e-Raftaar" },
            "inLanguage": "hi-Latn"
          }
        },
        {
          "@type": "ListItem",
          "position": 4,
          "item": {
            "@type": "CreativeWork",
            "name": "Wo jo kehte the humein kabhi chhodenge nahi",
            "text": "Wo jo kehte the humein kabhi chhodenge nahi, aaj unki parchaayi bhi nazar nahi aati. / Hum toh chup chap sah gaye har sitam, ab kisi se koi shikayat nazar nahi aati.",
            "author": { "@type": "Person", "name": "Zehra" },
            "inLanguage": "hi-Latn"
          }
        },
        {
          "@type": "ListItem",
          "position": 5,
          "item": {
            "@type": "CreativeWork",
            "name": "Tanhaiyon mein aksar tera khayal aata hai",
            "text": "Tanhaiyon mein aksar tera khayal aata hai, jaise registaan mein koi thandi hawa chale. / Humne toh maanga tha sirf tera saath, par kismat ko na jaane kya manzoor tha.",
            "author": { "@type": "Person", "name": "Danish" },
            "inLanguage": "hi-Latn"
          }
        }
      ]
    },
    {
      "@type": "FAQPage",
      "@id": "https://ekkhwaab.in/#faq",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What is Ek Khwaab?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Ek Khwaab is an anonymous poetry and shayari sanctuary where poets and readers share, explore, and co-write couplets, ghazals, and nazms in Hinglish, Hindi, and Urdu under a pen name with full identity protection."
          }
        },
        {
          "@type": "Question",
          "name": "How to read Shayari in Hinglish, Hindi, and Urdu?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Ek Khwaab features an Instant Multi-Script Reader that allows you to seamlessly toggle any poem or couplet between Hinglish (Roman script), Devanagari Hindi, and Nastaliq Urdu with a single click."
          }
        },
        {
          "@type": "Question",
          "name": "How to generate custom Shayari using AI with my own words?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Visit our AI Poet co-writer at /ai-poet, provide 3 to 5 of your own emotional seed words, select a situation and mood, and our literary AI crafts metered shayari retaining your exact feelings."
          }
        },
        {
          "@type": "Question",
          "name": "How to download high-resolution 9:16 Shayari cards for Instagram?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Navigate to the Card Studio at /card-studio, select any shayari or write your own, customize typographic themes, backgrounds, and aspect ratios (9:16 vertical or 1:1 square), and download crystal-clear 1080p images ready for Instagram Stories, WhatsApp Status, or feeds."
          }
        }
      ]
    }
  ]
};

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Ek Khwaab — Anonymous Poetry Sanctuary | Created by Dikshanti Jain" },
      { name: "description", content: "Write, read and share anonymous poetry in Hinglish, Hindi and Urdu under a pen name. Created by Dikshanti Jain, featuring an AI co-writer and HD card studio." },
      { name: "author", content: "Dikshanti Jain" },
      { name: "creator", content: "Dikshanti Jain" },
      { name: "publisher", content: "Dikshanti Jain" },
      { name: "keywords", content: "Ek Khwaab, Dikshanti Jain, poetry sanctuary, anonymous poetry, hindi shayari, urdu poetry, hinglish poetry, sher o shayari, ghazals, nazm, card studio, ai poet, lughat dictionary, poetry community" },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" },
      { name: "googlebot", content: "index, follow" },
      { name: "google-site-verification", content: "google83c1baacd5b87a86" },
      { name: "google-site-verification", content: "83c1baacd5b87a86" },
      { property: "og:site_name", content: "Ek Khwaab" },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "Ek Khwaab — Created by Dikshanti Jain | Poetry Sanctuary" },
      { property: "og:description", content: "An anonymous sanctuary for poetry lovers in Hinglish, Hindi, and Urdu. Write under a pen name, generate metered shayari, export story cards, and send secret letters. Founded by Dikshanti Jain." },
      { property: "og:url", content: "https://ekkhwaab.in" },
      { property: "og:locale", content: "en_IN" },
      { property: "og:locale:alternate", content: "hi_IN" },
      { property: "og:image", content: "https://ekkhwaab.in/logo.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Ek Khwaab — Created by Dikshanti Jain" },
      { name: "twitter:description", content: "Anonymous poetry in Hinglish, Hindi, and Urdu. Founded and crafted by Dikshanti Jain." },
      { name: "twitter:image", content: "https://ekkhwaab.in/logo.png" },
    ],
    links: [
      { rel: "canonical", href: "https://ekkhwaab.in" },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "icon", href: "/favicon.png", type: "image/png", sizes: "192x192" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500;1,600&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Noto+Serif+Devanagari:wght@400;600&family=Noto+Nastaliq+Urdu:wght@400;600&family=JetBrains+Mono:wght@400;500&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(JSON_LD_SCHEMA) }}
        />
      </head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

const NAV = [["/", "Home"], ["/feed", "Explore Feed"], ["/ai-poet", "AI Poet"], ["/studio", "Card Studio"], ["/letters", "Secret Letters"], ["/dictionary", "Dictionary"]] as const;

function TopBar() {
  const { user } = useStore();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 sm:h-16 md:h-20 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 md:px-12">
        <Link to="/" className="group flex items-center gap-2 sm:gap-3" onClick={() => setOpen(false)}>
          <img src="/logo-icon.png" alt="Ek Khwaab Logo" className="size-7 sm:size-8 md:size-9 object-contain transition-transform duration-300 group-hover:scale-105" />
          <span className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-ink">Ek Khwaab<span className="text-crimson">.</span></span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden flex-1 justify-center gap-6 text-sm font-medium lg:flex">
          {NAV.map(([to, l]) => (
            <Link key={to} to={to} activeOptions={{ exact: to === "/" }} className="text-muted-foreground transition hover:text-ink" activeProps={{ className: "!text-ink font-semibold" }}>{l}</Link>
          ))}
        </nav>

        {/* Right side controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <AmbientAudio />
          {user ? (
            <Link to="/profile" className="flex items-center gap-1.5 rounded-full border border-hairline py-1 pl-3 pr-1 text-xs font-medium text-ink hover:border-royal sm:py-1.5 sm:pl-4 sm:pr-1.5 sm:text-sm">
              <span className="max-w-[80px] truncate sm:max-w-none">@{user.penName}</span> <IdBadge id={user.poetId} />
            </Link>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Link to="/auth" search={{ mode: "signin" }} className={btnGhost}>Sign In</Link>
              <Link to="/auth" search={{ mode: "signup" }} className={cn(btnPrimary, "px-4 py-1.5 text-xs sm:px-6 sm:py-2 sm:text-sm")}>Get Started</Link>
            </div>
          )}

          {/* Mobile Menu Hamburger Toggle */}
          <button
            type="button"
            aria-label="Toggle navigation menu"
            onClick={() => setOpen(!open)}
            className="rounded-full p-2 text-ink hover:bg-muted lg:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Dropdown Menu */}
      {open && (
        <div className="border-t border-hairline bg-background/95 px-5 py-4 backdrop-blur-md lg:hidden shadow-lg animate-in fade-in slide-in-from-top-2">
          <nav className="flex flex-col gap-3">
            {NAV.map(([to, l]) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: to === "/" }}
                onClick={() => setOpen(false)}
                className="py-1 text-base text-muted-foreground transition hover:text-ink"
                activeProps={{ className: "!text-ink font-semibold" }}
              >
                {l}
              </Link>
            ))}
            {!user && (
              <div className="mt-3 flex flex-wrap gap-2 border-t border-hairline pt-3">
                <Link to="/auth" search={{ mode: "signin" }} onClick={() => setOpen(false)} className={cn(btnOutline, "flex-1 text-center py-2 text-xs")}>
                  Sign In
                </Link>
                <Link to="/auth" search={{ mode: "signup" }} onClick={() => setOpen(false)} className={cn(btnPrimary, "flex-1 text-center py-2 text-xs")}>
                  Get Started
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-hairline bg-secondary text-ink">
      <div className="mx-auto max-w-6xl px-6 py-14 md:px-12">
        <div className="grid gap-10 md:grid-cols-12 md:gap-8">
          {/* Brand & Vision */}
          <div className="md:col-span-5">
            <Link to="/" className="group flex items-center gap-3">
              <img src="/logo-icon.png" alt="Ek Khwaab Logo" className="size-11 object-contain transition-transform duration-300 group-hover:scale-105" />
              <span className="font-serif text-2xl font-bold text-ink">Ek Khwaab<span className="text-crimson">.</span></span>
            </Link>
            <p className="mt-2 font-serif text-sm italic text-muted-foreground">
              "Jis baat ko lafz na milein, usse shayari keh dete hain."
            </p>
            <p className="mt-3 max-w-sm text-xs leading-relaxed text-muted-foreground">
              A private, multi-script poetry sanctuary designed to preserve the beauty of Urdu, Hindi, and Hinglish verse under protected pen names.
            </p>
          </div>

          {/* Quick Explore */}
          <div className="md:col-span-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink">Explore Mehfil</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link to="/feed" className="transition hover:text-ink">Explore Feed</Link></li>
              <li><Link to="/ai-poet" className="transition hover:text-ink">AI Poet Co-Writer</Link></li>
              <li><Link to="/studio" className="transition hover:text-ink">Card Studio</Link></li>
              <li><Link to="/dictionary" className="transition hover:text-ink">Lughat (Dictionary)</Link></li>
              <li><Link to="/guidelines" className="transition hover:text-ink">Community Guidelines</Link></li>
              <li><Link to="/privacy" className="transition hover:text-ink">Privacy Charter</Link></li>
            </ul>
          </div>

          {/* Creator & Contact */}
          <div className="md:col-span-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink">Founder & Creator</h3>
            <p className="mt-3 text-sm font-semibold text-ink">Dikshanti Jain</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Creator and owner of Ek Khwaab.
            </p>
            <div className="mt-4 flex flex-col gap-2.5 text-xs text-muted-foreground">
              <a
                href="https://www.linkedin.com/in/dikshanti-jain-9345723a7"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-royal hover:underline"
              >
                <Linkedin className="size-3.5" />
                <span>linkedin.com/in/dikshanti-jain</span>
              </a>
              <a
                href="mailto:jaindikahanti@gmail.com"
                className="inline-flex items-center gap-2 hover:text-ink"
              >
                <Mail className="size-3.5" />
                <span>jaindikahanti@gmail.com</span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-hairline pt-6 text-xs text-muted-foreground md:flex-row">
          <p>© {new Date().getFullYear()} Ek Khwaab · Created by Dikshanti Jain. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <Link to="/privacy" className="hover:text-ink">Privacy</Link>
            <span>·</span>
            <Link to="/guidelines" className="hover:text-ink">Guidelines</Link>
            <span>·</span>
            <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer" className="hover:text-ink">Sitemap</a>
            <span>·</span>
            <a href="mailto:jaindikahanti@gmail.com" className="hover:text-ink">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

const BOTTOM_NAV = [
  { to: "/", label: "Home", icon: HomeIcon, exact: true },
  { to: "/feed", label: "Feed", icon: BookOpen, exact: false },
  { to: "/ai-poet", label: "AI Poet", icon: Sparkles, exact: false },
  { to: "/studio", label: "Studio", icon: Palette, exact: false },
  { to: "/profile", label: "Profile", icon: UserIcon, exact: false },
] as const;

function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 flex items-center justify-around border-t border-hairline bg-background/95 py-2 px-2 backdrop-blur-md lg:hidden shadow-float">
      {BOTTOM_NAV.map(({ to, label, icon: Icon, exact }) => (
        <Link
          key={to}
          to={to}
          activeOptions={{ exact }}
          className="flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium text-muted-foreground transition hover:text-ink"
          activeProps={{ className: "!text-royal !font-semibold" }}
        >
          <Icon className="size-5" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <StoreProvider>
        <TopBar />
        <main className="pb-16 lg:pb-0"><Outlet /></main>
        <Footer />
        <BottomNav />
        <Toaster />
      </StoreProvider>
    </QueryClientProvider>
  );
}
