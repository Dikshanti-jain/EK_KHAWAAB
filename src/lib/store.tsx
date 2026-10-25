import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { POEMS, type Poem, type Script } from "@/data/poems";

export type User = { penName: string; poetId: string; fullName: string; email: string; phone: string; guest?: boolean };
export type Letter = { id: string; lines: string[]; clue1: string; clue2: string; answer: string; seal: "crimson" | "royal"; from: string };
export type Draft = { id: string; text: string; updated: number };
export type StudioSeed = { lines: string[]; penName: string } | null;

type State = {
  user: User | null; script: Script; poems: Poem[];
  liked: string[]; saved: string[]; letters: Letter[]; studio: StudioSeed;
};
const initial: State = { user: null, script: "hinglish", poems: POEMS, liked: [], saved: ["p3", "p7"], letters: [], studio: null };

type Ctx = State & { set: (p: Partial<State> | ((s: State) => Partial<State>)) => void };
const C = createContext<Ctx | null>(null);
const KEY = "ek-khawaab-v2";

export function StoreProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<State>(initial);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const savedPoems: Poem[] = Array.isArray(parsed.poems) ? parsed.poems : [];
        const existingIds = new Set(savedPoems.map((p: Poem) => p.id));
        const merged = [
          ...POEMS.filter((p) => !existingIds.has(p.id)),
          ...savedPoems.map((sp: Poem) => {
            const match = POEMS.find((p) => p.id === sp.id);
            return match ? { ...match, daad: sp.daad ?? match.daad, hashiya: sp.hashiya ?? match.hashiya } : sp;
          }),
        ];
        setS({ ...initial, ...parsed, poems: merged.length > 0 ? merged : POEMS });
      }
    } catch { /* ignore */ }
    setReady(true);
  }, []);
  useEffect(() => { if (ready) localStorage.setItem(KEY, JSON.stringify(s)); }, [s, ready]);
  const set: Ctx["set"] = (p) => setS((prev) => ({ ...prev, ...(typeof p === "function" ? p(prev) : p) }));
  return <C.Provider value={{ ...s, set }}>{children}</C.Provider>;
}
export const useStore = () => { const c = useContext(C); if (!c) throw new Error("no store"); return c; };
export const uid = () => Math.random().toString(36).slice(2, 9);
export const randomPoetId = () => `#EK-${1000 + Math.floor(Math.random() * 9000)}`;
