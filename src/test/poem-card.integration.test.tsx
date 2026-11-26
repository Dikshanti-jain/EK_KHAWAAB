import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PoemCard } from "@/components/PoemCard";
import { StoreProvider } from "@/lib/store";
import { SignInPromptProvider } from "@/components/SignInPrompt";
import { POEMS } from "@/data/poems";

const mockNavigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...props }: { children: React.ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => mockNavigate,
}));

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

function renderCard(poem = POEMS[0]!) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <StoreProvider>
        <SignInPromptProvider>
          <PoemCard poem={poem} globalScript="hinglish" />
        </SignInPromptProvider>
      </StoreProvider>
    </QueryClientProvider>
  );
}

describe("PoemCard integration", () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockReset();
  });

  it("renders poem verse in Hinglish and switches to Hindi/Urdu locally", async () => {
    const poem = POEMS[0]!;
    renderCard(poem);

    expect(screen.getByText(new RegExp(poem.hinglish[0]!.slice(0, 12)))).toBeInTheDocument();

    // Switch to Hindi
    const hindiBtn = screen.getByRole("button", { name: /हिन्दी|Hindi/i });
    fireEvent.click(hindiBtn);

    await waitFor(() => {
      expect(screen.getByText(new RegExp(poem.hindi[0]!.slice(0, 8)))).toBeInTheDocument();
    });
  });

  it("prompts sign-in when an unauthenticated visitor tries to like a poem", async () => {
    const poem = POEMS[0]!;
    renderCard(poem);

    const likeBtn = screen.getByRole("button", { name: /Daad|Appreciate|Like/i });
    fireEvent.click(likeBtn);

    await waitFor(() => {
      expect(screen.getByText("Sign in to appreciate this verse")).toBeInTheDocument();
    });
  });

  it("increments curated poem daad locally when signed in", async () => {
    localStorage.setItem(
      "ek-khwaab-v2",
      JSON.stringify({
        script: "hinglish",
        liked: [],
        saved: [],
        user: { penName: "Aarzoo", poetId: "#EK-7777" },
        expiresAt: Date.now() + 60_000,
      })
    );

    const poem = POEMS[0]!;
    renderCard(poem);

    const likeBtn = await screen.findByRole("button", { name: /Appreciate verse/i });
    expect(likeBtn).toHaveTextContent(poem.daad > 0 ? String(poem.daad) : "Appreciate");

    fireEvent.click(likeBtn);

    await waitFor(() => {
      expect(likeBtn).toHaveTextContent(String(poem.daad + 1));
    });
  });
});
