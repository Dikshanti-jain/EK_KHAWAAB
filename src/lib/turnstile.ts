// Cloudflare Turnstile — client side.
//
// The whole module is a no-op unless VITE_TURNSTILE_SITE_KEY is set at build
// time. That is deliberate: the Render backend treats a missing secret as
// "run on the rate limiter alone", so a deploy without Turnstile must not
// stall every AI request waiting for a widget that will never render.
//
// The script is loaded lazily (first AI request), not on page load, so the
// feed's first paint never waits on challenges.cloudflare.com.
//
// Tokens are single-use and expire after 300 s, so nothing is cached here.
// Concurrent callers are serialised: one widget cannot solve two challenges
// at once, and executing while a challenge is in flight throws.

const SITE_KEY = import.meta.env?.["VITE_TURNSTILE_SITE_KEY"] as string | undefined;
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const TOKEN_TIMEOUT_MS = 12_000;

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  execute: (id: string) => void;
  reset: (id: string) => void;
  remove: (id: string) => void;
};

type Widget = {
  id: string;
  container: HTMLElement;
  resolve: ((token: string | null) => void) | null;
};

let apiPromise: Promise<TurnstileApi | null> | null = null;
const widgets = new Map<string, Promise<Widget | null>>();
let chain: Promise<unknown> = Promise.resolve();

/** True when a site key was baked in at build time. */
export const turnstileEnabled = Boolean(SITE_KEY);

function loadScript(): Promise<TurnstileApi | null> {
  if (typeof window === "undefined" || !SITE_KEY) return Promise.resolve(null);
  if (apiPromise) return apiPromise;

  apiPromise = new Promise<TurnstileApi | null>((resolve) => {
    const existing = (window as unknown as { turnstile?: TurnstileApi }).turnstile;
    if (existing) {
      resolve(existing);
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const api = (window as unknown as { turnstile?: TurnstileApi }).turnstile;
      resolve(api ?? null);
    };
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });

  return apiPromise;
}

function ensureWidget(api: TurnstileApi, action: string): Promise<Widget | null> {
  const cached = widgets.get(action);
  if (cached) return cached;

  const created = new Promise<Widget | null>((resolve) => {
    // A zero-sized container is enough for the invisible widget; if Cloudflare
    // decides an interaction is required it renders its own overlay.
    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.bottom = "0";
    container.style.right = "0";
    container.style.zIndex = "2147483000";
    document.body.appendChild(container);

    const widget: Widget = { id: "", container, resolve: null };

    try {
      widget.id = api.render(container, {
        sitekey: SITE_KEY,
        action,
        size: "invisible",
        appearance: "interaction-only",
        retry: "never",
        callback: (token: string) => widget.resolve?.(token),
        "error-callback": () => widget.resolve?.(null),
        "timeout-callback": () => widget.resolve?.(null),
        "expired-callback": () => widget.resolve?.(null),
      });
    } catch {
      container.remove();
      resolve(null);
      return;
    }

    if (!widget.id) {
      container.remove();
      resolve(null);
      return;
    }

    widgets.set(action, Promise.resolve(widget));
    resolve(widget);
  });

  widgets.set(action, created);
  return created;
}

function execute(api: TurnstileApi, action: string): Promise<string | null> {
  return ensureWidget(api, action).then(
    (widget) =>
      new Promise<string | null>((resolve) => {
        if (!widget) {
          resolve(null);
          return;
        }

        let settled = false;
        const finish = (token: string | null) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          widget.resolve = null;
          resolve(token);
        };
        const timer = setTimeout(() => finish(null), TOKEN_TIMEOUT_MS);

        widget.resolve = finish;
        try {
          // reset() clears a stale token so execute() starts a fresh challenge.
          api.reset(widget.id);
          api.execute(widget.id);
        } catch {
          finish(null);
        }
      })
  );
}

/**
 * Returns a fresh Turnstile token for `action`, or `null` when Turnstile is
 * not configured, the script is blocked, or the challenge times out.
 *
 * A `null` is not an error: the backend decides whether a token is required.
 * If TURNSTILE_SECRET_KEY is unset there, the request proceeds on the IP
 * rate limiter exactly as before.
 */
export async function getTurnstileToken(action: string): Promise<string | null> {
  if (!SITE_KEY) return null;

  const run = chain.then(async () => {
    const api = await loadScript();
    if (!api) return null;
    return execute(api, action);
  });

  // Keep the chain alive even when a challenge fails.
  chain = run.catch(() => null);
  return run;
}

/** Test/teardown helper. Removes every widget this module created. */
export function resetTurnstile() {
  for (const pending of widgets.values()) {
    void pending.then((widget) => {
      if (!widget) return;
      widget.container.remove();
    });
  }
  widgets.clear();
  apiPromise = null;
  chain = Promise.resolve();
}
