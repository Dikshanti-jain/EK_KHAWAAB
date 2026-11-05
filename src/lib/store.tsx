import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from "react";
import { POEMS, type Poem, type Script } from "@/data/poems";

export type User = {
  penName: string;
  poetId: string;
  fullName?: string;
  email?: string;
  phone?: string;
  guest?: boolean;
};

export type Letter = {
  id: string;
  lines: string[];
  clue1: string;
  clue2: string;
  answer?: string; // Optional/redacted on client for security
  seal: "crimson" | "royal";
  from?: string;   // Hidden in sealed state for receiver
  isUnlocked?: boolean;
  remainingAttempts?: number;
};

export type Draft = { id: string; text: string; updated: number };
export type StudioSeed = { lines: string[]; penName: string } | null;

type State = {
  user: User | null;
  script: Script;
  poems: Poem[];
  liked: string[];
  saved: string[];
  letters: Letter[];
  studio: StudioSeed;
};

const initial: State = {
  user: null,
  script: "hinglish",
  poems: POEMS,
  liked: [],
  saved: ["p3", "p7"],
  letters: [],
  studio: null,
};

type Ctx = State & {
  set: (p: Partial<State> | ((s: State) => Partial<State>)) => void;
  updatePoem: (id: string, updates: Partial<Poem>) => void;
  clearLocalData: () => void;
};

const C = createContext<Ctx | null>(null);
const STORAGE_KEY = "ek-khawaab-v2";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<State>(initial);
  const [ready, setReady] = useState(false);

  // Load sanitized state on mount (with 7-day TTL check)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Enforce 7-day TTL
        if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
          localStorage.removeItem(STORAGE_KEY);
        } else {
          // Restore non-sensitive preferences
          setS((prev) => ({
            ...prev,
            script: parsed.script || prev.script,
            liked: Array.isArray(parsed.liked) ? parsed.liked : prev.liked,
            saved: Array.isArray(parsed.saved) ? parsed.saved : prev.saved,
            studio: parsed.studio || null,
            // User: strictly non-PII (penName + poetId only)
            user: parsed.user?.penName
              ? {
                  penName: parsed.user.penName,
                  poetId: parsed.user.poetId,
                  guest: parsed.user.guest,
                }
              : null,
          }));
        }
      }
    } catch (err) {
      console.warn("[Store] Failed to load local storage preferences:", err);
    }
    setReady(true);
  }, []);

  // Save sanitized preferences (NEVER save PII or the raw poems corpus to localStorage)
  // Fixes PC-02 & RL-04
  useEffect(() => {
    if (!ready) return;
    try {
      const sanitizedToPersist = {
        script: s.script,
        liked: s.liked,
        saved: s.saved,
        studio: s.studio,
        // Zero PII: only save pseudonymous identifiers
        user: s.user
          ? {
              penName: s.user.penName,
              poetId: s.user.poetId,
              guest: s.user.guest,
            }
          : null,
        expiresAt: Date.now() + SEVEN_DAYS_MS,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizedToPersist));
    } catch (err) {
      console.warn("[Store] localStorage save warning (quota exceeded or restricted):", err);
    }
  }, [s.script, s.liked, s.saved, s.studio, s.user, ready]);

  // Memoized setter to prevent infinite render/fetch loops in consumers (Fixes RL-01)
  const set = useCallback<Ctx["set"]>((p) => {
    setS((prev) => ({ ...prev, ...(typeof p === "function" ? p(prev) : p) }));
  }, []);

  // Memoized poem updater
  const updatePoem = useCallback<Ctx["updatePoem"]>((id, updates) => {
    setS((prev) => ({
      ...prev,
      poems: prev.poems.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    }));
  }, []);

  // Action to clear all local browser data
  const clearLocalData = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.clear();
    } catch {
      // ignore
    }
    setS(initial);
  }, []);

  // Memoize Context value object to stabilize re-renders across route components
  const value = useMemo<Ctx>(
    () => ({
      ...s,
      set,
      updatePoem,
      clearLocalData,
    }),
    [s, set, updatePoem, clearLocalData]
  );

  return <C.Provider value={value}>{children}</C.Provider>;
}

export const useStore = () => {
  const c = useContext(C);
  if (!c) throw new Error("useStore must be used within StoreProvider");
  return c;
};

// Cryptographically secure UID and Shayar ID generators (Fixes RL-06)
export const uid = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID().slice(0, 8);
  }
  return Math.random().toString(36).slice(2, 10);
};

export const randomPoetId = () => {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const buf = new Uint16Array(1);
    crypto.getRandomValues(buf);
    const first = buf[0] ?? 0;
    return `#EK-${1000 + (first % 9000)}`;
  }
  return `#EK-${1000 + Math.floor(Math.random() * 9000)}`;
};
