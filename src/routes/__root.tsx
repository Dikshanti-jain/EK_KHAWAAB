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
import { PageTransition } from "@/components/PageTransition";
import { CookieConsent } from "@/components/CookieConsent";
import { SignInPromptProvider } from "@/components/SignInPrompt";
import { cn } from "@/lib/utils";
import {
  BRAND_NAME,
  CONTACT_EMAIL,
  FOUNDER,
  FOUNDER_LINKEDIN,
  POSITIONING,
  SITE_URL,
  SLOGAN,
  buildEntityGraph,
} from "@/lib/seo";

const TOPIC_FOOTER_LINKS = [
  ["ai-shayari-generator", "AI Shayari Generator"],
  ["two-line-shayari", "2-Line Shayari"],
  ["heartbreak-shayari", "Heartbreak & Hijr"],
  ["love-shayari", "Love & Ishq"],
  ["loneliness-shayari", "Late Night Tanhai"],
  ["jaun-elia-style-shayari", "Jaun Elia Style"],
  ["gulzar-style-poetry", "Gulzar Style"],
  ["shayari-for-instagram", "Instagram Shayari"],
] as const;

const LUGHAT_FOOTER_LINKS = [
  ["hijr", "Hijr"],
  ["tagaful", "Tagaful"],
  ["vehshat", "Vehshat"],
  ["qurbat", "Qurbat"],
  ["firaaq", "Firaaq"],
  ["ishq", "Ishq"],
  ["khamoshi", "Khamoshi"],
  ["shab-e-gham", "Shab-e-Gham"],
] as const;

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

const JSON_LD_SCHEMA = buildEntityGraph();

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Ek Khwaab — First AI-Native Multi-Script Shayari & Poetry Sanctuary" },
      { name: "description", content: POSITIONING },
      { name: "author", content: FOUNDER },
      { name: "creator", content: FOUNDER },
      { name: "publisher", content: FOUNDER },
      { name: "keywords", content: "Ek Khwaab, Ek Khawaab, first AI shayari platform, AI shayari generator, hindi shayari, urdu shayari, hinglish shayari, two line shayari, heartbreak shayari, ghazal, nazm, urdu lughat, shayari cards for instagram, anonymous poetry letters, Hum-Nawa, Shayar-e-Khwaab" },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" },
      { name: "googlebot", content: "index, follow" },
      { name: "google-site-verification", content: "83c1baacd5b87a86" },
      { name: "theme-color", content: "#FFFFFF" },
      { property: "og:site_name", content: BRAND_NAME },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "Ek Khwaab — First AI-Native Multi-Script Shayari Platform" },
      { property: "og:description", content: SLOGAN + ". Word-seeded AI poetry in Hinglish, Hindi and Urdu, wax-sealed riddle letters, 7 stages of love, 9:16 card studio and Hum-Nawa co-listening." },
      { property: "og:url", content: SITE_URL },
      { property: "og:locale", content: "en_IN" },
      { property: "og:locale:alternate", content: "hi_IN" },
      { property: "og:locale:alternate", content: "ur_PK" },
      { property: "og:image", content: `${SITE_URL}/logo.png` },
      { property: "og:image:alt", content: "Ek Khwaab — AI-native multi-script shayari and anonymous poetry sanctuary" },
      { property: "og:image:width", content: "512" },
      { property: "og:image:height", content: "512" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Ek Khwaab — First AI-Native Multi-Script Shayari Platform" },
      { name: "twitter:description", content: "Word-seeded AI shayari, 3-script reading, wax-sealed letters, 7 stages of love, HD 9:16 cards and synchronized co-listening." },
      { name: "twitter:image", content: `${SITE_URL}/logo.png` },
      { name: "twitter:image:alt", content: "Ek Khwaab poetry sanctuary" },
    ],
    links: [
      { rel: "alternate", type: "application/rss+xml", title: "Ek Khwaab — Latest Hindi, Urdu & Hinglish Shayari Feed", href: `${SITE_URL}/rss.xml` },
      { rel: "alternate", type: "text/plain", title: "llms.txt — Ek Khwaab platform summary for AI assistants", href: `${SITE_URL}/llms.txt` },
      { rel: "sitemap", type: "application/xml", title: "XML Sitemap", href: `${SITE_URL}/sitemap.xml` },
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
        <Link to="/" className="group flex shrink-0 items-center gap-2 sm:gap-3" onClick={() => setOpen(false)}>
          <img src="/logo-icon.png" alt="Ek Khwaab Logo" className="size-7 sm:size-8 md:size-9 object-contain transition-transform duration-300 group-hover:scale-105" />
          <span className="whitespace-nowrap font-serif text-xl sm:text-2xl font-bold tracking-tight text-ink">Ek Khwaab<span className="text-crimson">.</span></span>
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
            <Link to="/profile" className="flex items-center gap-1.5 rounded-full border border-hairline py-1 pl-2.5 pr-1 text-xs font-medium text-ink hover:border-royal sm:py-1.5 sm:pl-4 sm:pr-1.5 sm:text-sm">
              <span className="max-w-[72px] truncate sm:max-w-none">@{user.penName}</span>
              {/* The full #EK-ID is long; on phones it lives in the drawer/profile. */}
              <span className="hidden sm:inline"><IdBadge id={user.poetId} /></span>
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

function FooterColumn({
  title,
  children,
  label,
}: {
  title: string;
  children: ReactNode;
  label: string;
}) {
  return (
    <nav aria-label={label} className="md:col-span-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-ink">{title}</h3>
      <ul className="mt-3 space-y-2 text-[13px] leading-snug text-muted-foreground">
        {children}
      </ul>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="border-t border-hairline bg-secondary text-ink">
      <div className="mx-auto max-w-6xl px-6 py-14 md:px-12">
        <div className="grid gap-10 md:grid-cols-12 md:gap-8">
          {/* Brand, mandate and founder */}
          <div className="md:col-span-4">
            <Link to="/" className="group flex items-center gap-3">
              <img src="/logo-icon.png" alt="Ek Khwaab Logo" className="size-11 object-contain transition-transform duration-300 group-hover:scale-105" />
              <span className="font-serif text-2xl font-bold text-ink">Ek Khwaab<span className="text-crimson">.</span></span>
            </Link>
            <p className="mt-2 font-serif text-sm italic text-muted-foreground">
              "Jis baat ko lafz na milein, usse shayari keh dete hain."
            </p>
            <p className="mt-3 max-w-sm text-xs leading-relaxed text-muted-foreground">
              The first AI-native multi-script shayari and privacy-first literary sanctuary — Hinglish,
              Devanagari Hindi and Nastaliq Urdu under protected pen names.
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              Founder &amp; Creator: <a href={FOUNDER_LINKEDIN} target="_blank" rel="noopener noreferrer" className="font-semibold text-ink hover:text-royal">{FOUNDER}</a>
            </p>
            <div className="mt-3 flex flex-col gap-2 text-xs text-muted-foreground">
              <a href={FOUNDER_LINKEDIN} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-royal hover:underline">
                <Linkedin className="size-3.5" />
                <span>linkedin.com/in/dikshanti-jain</span>
              </a>
              <a href={`mailto:${CONTACT_EMAIL}`} className="inline-flex items-center gap-2 hover:text-ink">
                <Mail className="size-3.5" />
                <span>{CONTACT_EMAIL}</span>
              </a>
            </div>
          </div>

          <FooterColumn title="AI & Studio" label="AI and studio feature links">
            <li><Link to="/ai-poet" className="transition hover:text-ink">AI Shayari Generator</Link></li>
            <li><Link to="/card-studio" className="transition hover:text-ink">9:16 Card Studio</Link></li>
            <li><Link to="/letters" className="transition hover:text-ink">Khwaab Khat Letters</Link></li>
            <li><Link to="/listen-together" className="transition hover:text-ink">Hum-Nawa Co-Listening</Link></li>
            <li><Link to="/stages-of-love" className="transition hover:text-ink">7 Stages of Love</Link></li>
            <li><Link to="/dictionary" className="transition hover:text-ink">Lughat Dictionary</Link></li>
            <li><Link to="/feed" className="transition hover:text-ink">Poetry Feed</Link></li>
          </FooterColumn>

          <FooterColumn title="Shayari Topics" label="High-intent shayari topic hubs">
            {TOPIC_FOOTER_LINKS.map(([slug, label]) => (
              <li key={slug}>
                <Link to="/topic/$topic" params={{ topic: slug }} className="transition hover:text-ink">
                  {label}
                </Link>
              </li>
            ))}
          </FooterColumn>

          <FooterColumn title="Lughat Words" label="Popular Urdu poetry dictionary words">
            {LUGHAT_FOOTER_LINKS.map(([word, label]) => (
              <li key={word}>
                <Link to="/dictionary/$word" params={{ word }} className="transition hover:text-ink">
                  {label} Meaning
                </Link>
              </li>
            ))}
            <li>
              <Link to="/dictionary" className="font-medium text-royal hover:underline">
                All 35 words →
              </Link>
            </li>
          </FooterColumn>

          <FooterColumn title="Directory" label="Crawlable platform directory and feeds">
            <li><Link to="/directory" className="font-medium text-royal hover:underline">HTML Literary Index</Link></li>
            <li><a href="/sitemap.xml" className="transition hover:text-ink">XML Sitemap</a></li>
            <li><a href="/rss.xml" className="transition hover:text-ink">RSS Literary Feed</a></li>
            <li><a href="/llms.txt" className="transition hover:text-ink">llms.txt</a></li>
            <li><a href="/llms-full.txt" className="transition hover:text-ink">llms-full.txt</a></li>
            <li><Link to="/guidelines" className="transition hover:text-ink">Community Guidelines</Link></li>
            <li><Link to="/privacy" className="transition hover:text-ink">Privacy Charter</Link></li>
          </FooterColumn>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-hairline pt-6 text-xs text-muted-foreground md:flex-row">
          <p>© {new Date().getFullYear()} {BRAND_NAME} · Created by {FOUNDER}. All rights reserved.</p>
          <p className="max-w-xl text-center text-[11px] leading-relaxed md:text-right">
            {SLOGAN}. Made in India for readers of Hinglish, Hindi and Urdu.
          </p>
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
        <SignInPromptProvider>
          <TopBar />
          <main className="pb-16 lg:pb-0">
            <PageTransition>
              <Outlet />
            </PageTransition>
          </main>
          <Footer />
          <BottomNav />
          <CookieConsent />
          <Toaster />
        </SignInPromptProvider>
      </StoreProvider>
    </QueryClientProvider>
  );
}
