import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { CookieConsent } from "@/components/CookieConsent";
import { VerseScaleControl } from "@/components/VerseScaleControl";
import { SurpriseVerse } from "@/components/SurpriseVerse";
import { CommentDrawer } from "@/components/CommentDrawer";
import { StoreProvider } from "@/lib/store";
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

describe("Frontend UI Components", () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockReset();
  });

  describe("CookieConsent", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("shows after 700ms when unset and persists 'essential' choice on click", () => {
      render(<CookieConsent />);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(750);
      });

      expect(screen.getByRole("dialog", { name: /Cookie and privacy choices/i })).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Essential Only" }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      const stored = JSON.parse(localStorage.getItem("ek_cookie_consent_v1") || "{}");
      expect(stored.choice).toBe("essential");
    });

    it("does not render when consent is already saved", () => {
      localStorage.setItem("ek_cookie_consent_v1", JSON.stringify({ choice: "all" }));
      render(<CookieConsent />);
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("VerseScaleControl", () => {
    it("cycles through Standard -> Large -> Extra Large -> Standard", () => {
      render(<VerseScaleControl />);
      const btn = screen.getByRole("button", { name: /Verse text size/i });
      expect(btn).toHaveAttribute("aria-label", expect.stringContaining("Standard"));

      fireEvent.click(btn);
      expect(btn).toHaveAttribute("aria-label", expect.stringContaining("Large"));

      fireEvent.click(btn);
      expect(btn).toHaveAttribute("aria-label", expect.stringMatching(/Extra large/i));

      fireEvent.click(btn);
      expect(btn).toHaveAttribute("aria-label", expect.stringContaining("Standard"));
    });
  });

  describe("SurpriseVerse", () => {
    it("opens mood envelopes modal and reveals a verse when an envelope is chosen", async () => {
      render(
        <StoreProvider>
          <SurpriseVerse />
        </StoreProvider>
      );

      fireEvent.click(screen.getByRole("button", { name: /Pick a Verse for Me/i }));
      const envelope = await screen.findByRole("button", { name: /Quiet Heart/i });
      fireEvent.click(envelope);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Draw Another/i })).toBeInTheDocument();
      });
    });
  });

  describe("CommentDrawer", () => {
    it("renders existing comments and prompts sign-in when signed out", () => {
      const onRequestSignIn = vi.fn();
      const onClose = vi.fn();
      const livePoem = {
        ...POEMS[0]!,
        id: "550e8400-e29b-41d4-a716-446655440099",
        hashiya: [{ id: "c1", by: "Noor", text: "Bahut khoob" }],
      };

      render(
        <StoreProvider>
          <CommentDrawer
            open={true}
            onClose={onClose}
            poem={livePoem}
            isCurated={false}
            onRequestSignIn={onRequestSignIn}
          />
        </StoreProvider>
      );

      expect(screen.getByText("Bahut khoob")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /Sign in to join the conversation/i }));
      expect(onRequestSignIn).toHaveBeenCalledTimes(1);
    });

    it("allows signed-in user to insert quick reply and toggle Jawaabi Sher couplet mode", async () => {
      localStorage.setItem(
        "ek-khwaab-v2",
        JSON.stringify({
          script: "hinglish",
          user: { penName: "Aarzoo", poetId: "#EK-7777" },
          expiresAt: Date.now() + 60_000,
        })
      );

      const livePoem = {
        ...POEMS[0]!,
        id: "550e8400-e29b-41d4-a716-446655440099",
        hashiya: [],
      };

      render(
        <StoreProvider>
          <CommentDrawer
            open={true}
            onClose={vi.fn()}
            poem={livePoem}
            isCurated={false}
            onRequestSignIn={vi.fn()}
          />
        </StoreProvider>
      );

      const textarea = (await screen.findByPlaceholderText(
        /Write a comment or a reply couplet/i
      )) as HTMLTextAreaElement;
      const postBtn = screen.getByRole("button", { name: /^Post$/i });
      expect(postBtn).toBeDisabled();

      // Toggle Jawaabi Sher switch
      const coupletSwitch = screen.getByRole("switch");
      fireEvent.click(coupletSwitch);
      expect(coupletSwitch).toHaveAttribute("aria-checked", "true");

      // Enter text enables Post button and renders Jawaabi Sher preview
      fireEvent.change(textarea, {
        target: { value: "Dil ki baat keh di tumne, waqt thahar sa gaya" },
      });
      expect(postBtn).not.toBeDisabled();
      expect(screen.getByText("Jawaabi Sher")).toBeInTheDocument();
    });
  });
});
