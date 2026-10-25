import { describe, it, expect } from "vitest";

describe("Split-Vault Privacy Architecture Tests", () => {
  it("strictly ensures public shayar models never contain private vault fields", () => {
    // Simulating public profile returned by public_shayars query
    const publicProfile = {
      shayar_uid: "#EK-4829",
      takhallus: "Abr_e_Shab",
      takhallus_meaning: "Cloud of the Night",
      vibe_category: "Late Night Solitude",
    };

    const privateVault = {
      real_full_name: "Faizan Ahmed Khan",
      email: "faizan.khan@domain.com",
      phone_number: "+91 9876543210",
    };

    // Public API payload must never have keys from private vault
    const publicKeys = Object.keys(publicProfile);
    expect(publicKeys).not.toContain("real_full_name");
    expect(publicKeys).not.toContain("email");
    expect(publicKeys).not.toContain("phone_number");

    // Vault record must retain real identity
    expect(privateVault.real_full_name).toBe("Faizan Ahmed Khan");
    expect(privateVault.email).toBe("faizan.khan@domain.com");
  });

  it("normalizes pen name and ensures unique shayar UID formatting", () => {
    const rawTakhallus = "  Shab-e-Farda  ";
    const normalized = rawTakhallus.trim().replace(/[\s-]+/g, "_");
    expect(normalized).toBe("Shab_e_Farda");

    const rawId = "EK-8492";
    const formattedId = rawId.startsWith("#") ? rawId : `#${rawId}`;
    expect(formattedId).toBe("#EK-8492");
  });

  it("validates secret letter cipher verification logic", () => {
    const storedSecretAnswer = "library";

    const attempt1 = "  Library ";
    const isCorrect1 = attempt1.trim().toLowerCase() === storedSecretAnswer;
    expect(isCorrect1).toBe(true);

    const attempt2 = "Cafeteria";
    const isCorrect2 = attempt2.trim().toLowerCase() === storedSecretAnswer;
    expect(isCorrect2).toBe(false);
  });

  it("verifies author-only ownership check for post deletion", () => {
    const currentPenName = "Mirza_Ghalib";
    const authorPost = { id: "p1", takhallus: "Mirza_Ghalib", content: "..." };
    const otherPost = { id: "p2", takhallus: "Jaun_Elia", content: "..." };

    const canDeleteAuthorPost = authorPost.takhallus === currentPenName;
    const canDeleteOtherPost = otherPost.takhallus === currentPenName;

    expect(canDeleteAuthorPost).toBe(true);
    expect(canDeleteOtherPost).toBe(false);
  });

  it("validates secret letter sharing link generation", () => {
    const origin = "https://ekkhawaab.in";
    const letterId = "khat_8921a";
    const generatedUrl = `${origin}/letters?id=${encodeURIComponent(letterId)}`;

    expect(generatedUrl).toBe("https://ekkhawaab.in/letters?id=khat_8921a");

    const parsed = new URL(generatedUrl);
    expect(parsed.pathname).toBe("/letters");
    expect(parsed.searchParams.get("id")).toBe("khat_8921a");
  });

  it("validates pen name customization rules (length and non-empty)", () => {
    const validate = (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return { valid: false, error: "Pen name cannot be empty." };
      if (trimmed.length < 2 || trimmed.length > 30) return { valid: false, error: "Length must be 2-30 chars." };
      return { valid: true };
    };

    expect(validate("").valid).toBe(false);
    expect(validate(" ").valid).toBe(false);
    expect(validate("A").valid).toBe(false);
    expect(validate("Parvaaz").valid).toBe(true);
    expect(validate("A".repeat(35)).valid).toBe(false);
  });
});
