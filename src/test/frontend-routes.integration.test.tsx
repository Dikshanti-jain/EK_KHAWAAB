import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StoreProvider } from "@/lib/store";
import { SignInPromptProvider } from "@/components/SignInPrompt";
import { Route as DictionaryRoute } from "@/routes/dictionary";
import { Feed } from "@/routes/feed";
import { AiPoet } from "@/routes/ai-poet";
import { POEMS } from "@/data/poems";

const mockNavigate = vi.fn();
const mockRequestShayari = vi.fn();
const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();

vi.mock("@tanstack/react-start", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-start")>();
  return {
    ...actual,
    useServerFn: (fn: unknown) => fn,
  };
});

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (opts: Record<string, unknown>) => ({ options: opts }),
  Link: ({ children, to, ...props }: { children: React.ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => mockNavigate,
  useSearch: () => ({}),
}));

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  }),
}));

vi.mock("@/lib/shayar.functions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/shayar.functions")>();
  return {
    ...actual,
    requestShayariGeneration: (...args: unknown[]) => mockRequestShayari(...args),
  };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: { message: "offline" } }),
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], count: 0 }),
    })),
  },
}));

function renderWithProviders(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <StoreProvider>
        <SignInPromptProvider>{ui}</SignInPromptProvider>
      </StoreProvider>
    </QueryClientProvider>
  );
}

describe("Frontend Routes Integration", () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockReset();
    mockRequestShayari.mockReset();
    mockToastError.mockReset();
    mockToastSuccess.mockReset();
  });

  describe("Dictionary route (/dictionary)", () => {
    it("renders dictionary words, filters by search query, and shows empty state", () => {
      const DictionaryComponent = DictionaryRoute.options.component as React.ComponentType;
      renderWithProviders(<DictionaryComponent />);

      const searchInput = screen.getByPlaceholderText(/Search — hijr/i);
      expect(screen.getByText("Hijr")).toBeInTheDocument();

      fireEvent.change(searchInput, { target: { value: "tagaful" } });
      expect(screen.getByText("Tagaful")).toBeInTheDocument();
      expect(screen.queryByText("Hijr")).not.toBeInTheDocument();

      fireEvent.change(searchInput, { target: { value: "zzzz_no_match_123" } });
      expect(screen.getByText(/No word matches that search yet/i)).toBeInTheDocument();
    });
  });

  describe("Feed route (/feed)", () => {
    it("renders curated poems and filters them via search input", async () => {
      renderWithProviders(<Feed />);

      // Curated poems load from fallback
      await waitFor(() => {
        expect(screen.getByText(new RegExp(POEMS[0]!.hinglish[0]!.slice(0, 14)))).toBeInTheDocument();
      });

      const searchBox = screen.getByPlaceholderText(/Search/i);
      fireEvent.change(searchBox, { target: { value: "zzzz_unmatched_query_999" } });

      await waitFor(() => {
        expect(screen.queryByText(new RegExp(POEMS[0]!.hinglish[0]!.slice(0, 14)))).not.toBeInTheDocument();
      });
    });

    it("prompts sign-in when unauthenticated visitor clicks Write a Poem", async () => {
      renderWithProviders(<Feed />);

      const writeBtn = screen.getByRole("button", { name: /Write a Poem/i });
      fireEvent.click(writeBtn);

      await waitFor(() => {
        expect(screen.getByText(/Sign in to publish your verse/i)).toBeInTheDocument();
      });
    });
  });

  describe("AiPoet route (/ai-poet)", () => {
    it("shows validation toast when submitting without situation or seed words", async () => {
      renderWithProviders(<AiPoet />);

      // Clear prefilled situation and remove default seed phrases
      const situationBox = screen.getByPlaceholderText(/Jo baat keh nahi pa rahe/i);
      fireEvent.change(situationBox, { target: { value: "" } });

      for (const word of ["Library", "Silent"]) {
        const chip = screen.getByText(word).closest("span");
        const removeBtn = chip?.querySelector("button");
        if (removeBtn) fireEvent.click(removeBtn);
      }

      const generateBtn = screen.getByRole("button", { name: /Generate Contextual Poetry/i });
      fireEvent.click(generateBtn);

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith(
          "Please describe your situation or add important words."
        );
      });
    });

    it("adds seed words, submits generation request, and renders 3-script output", async () => {
      mockRequestShayari.mockResolvedValueOnce({
        error: null,
        poem: {
          hinglish: ["Chai ki bhaap mein tera khayal aaya", "Baarish ne phir se purana sawaal aaya"],
          hindi: ["चाय की भाप में तेरा ख़याल आया", "बारिश ने फिर से पुराना सवाल आया"],
          urdu: ["چائے کی بھاپ میں تیرا خیال آیا", "بارش نے پھر سے پرانا سوال آیا"],
          english: "In the steam of tea your thought arrived.",
          seedsUsed: ["chai"],
        },
      });

      renderWithProviders(<AiPoet />);

      const situationBox = screen.getByPlaceholderText(/Jo baat keh nahi pa rahe/i);
      fireEvent.change(situationBox, { target: { value: "Rainy evening by the window" } });

      const generateBtn = screen.getByRole("button", { name: /Generate Contextual Poetry/i });
      fireEvent.click(generateBtn);

      await waitFor(() => {
        expect(mockRequestShayari).toHaveBeenCalledTimes(1);
        expect(screen.getByDisplayValue("Chai ki bhaap mein tera khayal aaya")).toBeInTheDocument();
        expect(screen.getByDisplayValue("Baarish ne phir se purana sawaal aaya")).toBeInTheDocument();
        expect(screen.getByText(/In the steam of tea your thought arrived/i)).toBeInTheDocument();
      });

      // Switch generated verse to Hindi script
      fireEvent.click(screen.getByRole("button", { name: /^हिन्दी$/ }));
      await waitFor(() => {
        expect(screen.getByDisplayValue("चाय की भाप में तेरा ख़याल आया")).toBeInTheDocument();
      });
    });
  });
});
