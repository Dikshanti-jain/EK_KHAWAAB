import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, Link, createRootRouteWithContext, useRouter, HeadContent, Scripts, type ErrorComponentProps } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Linkedin, Mail } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { StoreProvider, useStore } from "@/lib/store";
import { IdBadge, btnGhost, btnOutline, btnPrimary } from "@/components/kit";
import { AmbientAudio } from "@/components/AmbientAudio";

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
      "@id": "https://ek-khawaab.vercel.app/#website",
      "url": "https://ek-khawaab.vercel.app",
      "name": "Ek Khawaab",
      "alternateName": [
        "एक ख़्वाब",
        "ایک خواب",
        "Ek Khawaab — Anonymous Poetry Sanctuary",
        "Ek Khawaab Poetry"
      ],
      "description": "An anonymous poetry sanctuary for lovers of Hinglish, Hindi, and Urdu shayari, ghazals, and nazms. Features AI co-writing, 1080p card studio, and secret letters.",
      "inLanguage": ["en-IN", "hi", "ur"],
      "publisher": {
        "@id": "https://ek-khawaab.vercel.app/#creator"
      },
      "creator": {
        "@id": "https://ek-khawaab.vercel.app/#creator"
      }
    },
    {
      "@type": "Person",
      "@id": "https://ek-khawaab.vercel.app/#creator",
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
      "@id": "https://ek-khawaab.vercel.app/#organization",
      "name": "Ek Khawaab",
      "url": "https://ek-khawaab.vercel.app",
      "founder": {
        "@id": "https://ek-khawaab.vercel.app/#creator"
      },
      "contactPoint": {
        "@type": "ContactPoint",
        "email": "jaindikahanti@gmail.com",
        "contactType": "Founder & Customer Support"
      }
    }
  ]
};

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Ek Khawaab — Anonymous Poetry Sanctuary | Founded by Dikshanti Jain" },
      { name: "description", content: "Write, read and share anonymous poetry in Hinglish, Hindi and Urdu under a pen name. Created by Dikshanti Jain, featuring an AI co-writer and HD card studio." },
      { name: "author", content: "Dikshanti Jain" },
      { name: "creator", content: "Dikshanti Jain" },
      { name: "publisher", content: "Dikshanti Jain" },
      { name: "keywords", content: "Ek Khawaab, Dikshanti Jain, poetry sanctuary, anonymous poetry, hindi shayari, urdu poetry, hinglish poetry, sher o shayari, ghazals, nazm, card studio, ai poet, lughat dictionary, poetry community" },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" },
      { name: "google-site-verification", content: "google83c1baacd5b87a86" },
      { property: "og:site_name", content: "Ek Khawaab" },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "Ek Khawaab — Anonymous Poetry Sanctuary by Dikshanti Jain" },
      { property: "og:description", content: "An anonymous sanctuary for poetry lovers in Hinglish, Hindi, and Urdu. Write under a pen name, generate metered shayari, export story cards, and send secret letters. Founded by Dikshanti Jain." },
      { property: "og:url", content: "https://ek-khawaab.vercel.app" },
      { property: "og:locale", content: "en_IN" },
      { property: "og:locale:alternate", content: "hi_IN" },
      { property: "og:image", content: "https://ek-khawaab.vercel.app/logo.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Ek Khawaab — Anonymous Poetry Sanctuary" },
      { name: "twitter:description", content: "Anonymous poetry in Hinglish, Hindi, and Urdu. Founded and crafted by Dikshanti Jain." },
      { name: "twitter:image", content: "https://ek-khawaab.vercel.app/logo.png" },
    ],
    links: [
      { rel: "canonical", href: "https://ek-khawaab.vercel.app" },
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
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD_SCHEMA) }}
        />
      </head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

const NAV = [["/", "Home"], ["/feed", "Explore Feed"], ["/ai-poet", "AI Poet"], ["/studio", "Card Studio"], ["/letters", "Secret Letters"], ["/dictionary", "Dictionary"]] as const;

function TopBar() {
  const { user } = useStore();
  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-6xl items-center gap-8 px-6 md:px-12">
        <Link to="/" className="group flex items-center gap-3">
          <img src="/logo-icon.png" alt="Ek Khawaab Logo" className="size-9 object-contain transition-transform duration-300 group-hover:scale-105" />
          <span className="font-serif text-2xl font-bold tracking-tight text-ink">Ek Khawaab<span className="text-crimson">.</span></span>
        </Link>
        <nav className="hidden flex-1 justify-center gap-7 text-sm font-medium lg:flex">
          {NAV.map(([to, l]) => (
            <Link key={to} to={to} activeOptions={{ exact: to === "/" }} className="text-muted-foreground transition hover:text-ink" activeProps={{ className: "!text-ink" }}>{l}</Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <AmbientAudio />
          {user ? (
            <Link to="/profile" className="flex items-center gap-2 rounded-full border border-hairline py-1.5 pl-4 pr-1.5 text-sm font-medium text-ink hover:border-royal">
              @{user.penName} <IdBadge id={user.poetId} />
            </Link>
          ) : (
            <>
              <Link to="/auth" search={{ mode: "signin" }} className={btnGhost}>Sign In</Link>
              <Link to="/auth" search={{ mode: "signup" }} className={`${btnPrimary} px-6`}>Get Started</Link>
            </>
          )}
        </div>
      </div>
      <nav className="flex gap-5 overflow-x-auto border-t border-hairline px-6 py-3 text-sm lg:hidden">
        {NAV.map(([to, l]) => <Link key={to} to={to} activeOptions={{ exact: to === "/" }} className="whitespace-nowrap text-muted-foreground" activeProps={{ className: "!text-ink font-medium" }}>{l}</Link>)}
      </nav>
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
              <img src="/logo-icon.png" alt="Ek Khawaab Logo" className="size-11 object-contain transition-transform duration-300 group-hover:scale-105" />
              <span className="font-serif text-2xl font-bold text-ink">Ek Khawaab<span className="text-crimson">.</span></span>
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
              Creator and owner of Ek Khawaab.
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
          <p>© {new Date().getFullYear()} Ek Khawaab · Created by Dikshanti Jain. All rights reserved.</p>
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

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <StoreProvider>
        <TopBar />
        <main><Outlet /></main>
        <Footer />
        <Toaster />
      </StoreProvider>
    </QueryClientProvider>
  );
}
