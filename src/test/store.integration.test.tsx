import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import { StoreProvider, useStore, uid, randomPoetId } from "@/lib/store";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    rpc: vi.fn().mockResolvedValue({ data: [] }),
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], count: 0 }),
    })),
  },
}));

function StoreHarness() {
  const store = useStore();
  return (
    <div>
      <span data-testid="script">{store.script}</span>
      <span data-testid="liked">{JSON.stringify(store.liked)}</span>
      <span data-testid="user">{store.user ? store.user.penName : "none"}</span>
      <span data-testid="poem-count">{store.poems.length}</span>
      <button onClick={() => store.set({ script: "urdu", liked: ["p1"] })}>Update</button>
      <button onClick={() => store.updatePoem(store.poems[0]!.id, { daad: 999 })}>PatchPoem</button>
      <button onClick={() => store.clearLocalData()}>Clear</button>
    </div>
  );
}

describe("StoreProvider integration with localStorage", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("throws when useStore is called outside StoreProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<StoreHarness />)).toThrow("useStore must be used within StoreProvider");
    spy.mockRestore();
  });

  it("restores non-PII preferences from localStorage and ignores expired TTL", async () => {
    localStorage.setItem(
      "ek-khwaab-v2",
      JSON.stringify({
        script: "hindi",
        liked: ["curated-1"],
        saved: ["curated-2"],
        myPoemCount: 3,
        user: { penName: "Zoya", poetId: "#EK-4242", email: "secret@example.com" },
        expiresAt: Date.now() + 60_000,
      })
    );

    render(
      <StoreProvider>
        <StoreHarness />
      </StoreProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("script")).toHaveTextContent("hindi");
    });
    expect(screen.getByTestId("liked")).toHaveTextContent('["curated-1"]');
    expect(screen.getByTestId("user")).toHaveTextContent("Zoya");

    // Verify PII (email) is stripped when re-persisted
    const persisted = JSON.parse(localStorage.getItem("ek-khwaab-v2") || "{}");
    expect(persisted.user.email).toBeUndefined();
  });

  it("purges expired localStorage entries on mount", async () => {
    localStorage.setItem(
      "ek-khwaab-v2",
      JSON.stringify({
        script: "urdu",
        liked: ["stale-id"],
        expiresAt: Date.now() - 1000,
      })
    );

    render(
      <StoreProvider>
        <StoreHarness />
      </StoreProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("script")).toHaveTextContent("hinglish");
    });
    expect(screen.getByTestId("liked")).toHaveTextContent("[]");
  });

  it("updates state, persists changes, and clears local data", async () => {
    render(
      <StoreProvider>
        <StoreHarness />
      </StoreProvider>
    );

    await act(async () => {
      screen.getByText("Update").click();
    });

    expect(screen.getByTestId("script")).toHaveTextContent("urdu");
    expect(screen.getByTestId("liked")).toHaveTextContent('["p1"]');

    const saved = JSON.parse(localStorage.getItem("ek-khwaab-v2") || "{}");
    expect(saved.script).toBe("urdu");
    expect(saved.liked).toEqual(["p1"]);

    await act(async () => {
      screen.getByText("Clear").click();
    });

    expect(screen.getByTestId("script")).toHaveTextContent("hinglish");
    expect(screen.getByTestId("liked")).toHaveTextContent("[]");
  });

  it("generates valid uid and randomPoetId formats", () => {
    expect(uid()).toHaveLength(8);
    expect(randomPoetId()).toMatch(/^#EK-\d{4}$/);
  });
});
