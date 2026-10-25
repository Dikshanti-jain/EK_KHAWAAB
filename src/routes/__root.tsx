import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, Link, createRootRouteWithContext, useRouter, HeadContent, Scripts, type ErrorComponentProps } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
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

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Ek Khawaab — Anonymous Poetry Sanctuary" },
      { name: "description", content: "Write, read and share anonymous poetry in Hinglish, Hindi and Urdu." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
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
      <head><HeadContent /></head>
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
        <Link to="/" className="font-serif text-2xl font-bold text-ink">Ek Khawaab<span className="text-crimson">.</span></Link>
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
    <footer className="border-t border-hairline bg-secondary">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-12 md:flex-row md:items-center md:justify-between md:px-12">
        <div>
          <p className="font-serif text-xl font-bold text-ink">Ek Khawaab<span className="text-crimson">.</span></p>
          <p className="mt-1 text-sm text-muted-foreground">Where unspoken feelings find their verse.</p>
        </div>
        <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
          <Link to="/guidelines" className="hover:text-ink">Community Guidelines</Link>
          <Link to="/privacy" className="hover:text-ink">Privacy Charter</Link>
          <Link to="/dictionary" className="hover:text-ink">Dictionary</Link>
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
