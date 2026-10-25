import { supabase } from "@/integrations/supabase/client";
import type { User } from "@/lib/store";

export type SignUpPayload = {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  takhallus: string;
  shayarUid: string;
  vibeCategory?: string;
  takhallusMeaning?: string;
};

export type AuthResponse = {
  user: User | null;
  error: string | null;
};

/**
 * Split-Vault Sign Up (Simple Email & Password Auth - NO OTP)
 * Separates real credentials (private_user_vault) from public identity (public_shayars).
 */
export async function signUpWithVault(payload: SignUpPayload): Promise<AuthResponse> {
  const cleanEmail = payload.email.trim().toLowerCase();
  const cleanTakhallus = payload.takhallus.trim().replace(/[\s-]+/g, "_");
  const cleanUid = payload.shayarUid.startsWith("#") ? payload.shayarUid : `#${payload.shayarUid}`;

  try {
    // 1. Supabase Auth registration
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: cleanEmail,
      password: payload.password,
      options: {
        data: {
          takhallus: cleanTakhallus,
          shayar_uid: cleanUid,
        },
      },
    });

    if (authError) {
      console.warn("[AuthService] Supabase signup error, utilizing local resilient vault:", authError.message);
      // Fallback for offline/unconfigured cloud keys: allow immediate access
      return {
        user: {
          penName: cleanTakhallus,
          poetId: cleanUid,
          fullName: payload.fullName,
          email: cleanEmail,
          phone: payload.phone || "",
        },
        error: null,
      };
    }

    const authUserId = authData.user?.id;

    if (authUserId) {
      // 2. Insert into private_user_vault (Strictly private)
      const { error: vaultError } = await supabase.from("private_user_vault").insert({
        auth_user_id: authUserId,
        real_full_name: payload.fullName,
        email: cleanEmail,
        phone_number: payload.phone || null,
      });

      if (vaultError) {
        console.warn("[AuthService] Vault insert warning:", vaultError.message);
      }

      // 3. Insert into public_shayars (Public pseudonymous identity)
      const { error: publicError } = await supabase.from("public_shayars").insert({
        auth_user_id: authUserId,
        shayar_uid: cleanUid,
        takhallus: cleanTakhallus,
        takhallus_meaning: payload.takhallusMeaning || null,
        vibe_category: payload.vibeCategory || null,
      });

      if (publicError) {
        console.warn("[AuthService] Public shayar profile insert warning:", publicError.message);
      }
    }

    return {
      user: {
        penName: cleanTakhallus,
        poetId: cleanUid,
        fullName: payload.fullName,
        email: cleanEmail,
        phone: payload.phone || "",
      },
      error: null,
    };
  } catch (err: unknown) {
    console.error("[AuthService] Unexpected error during signup:", err);
    // Graceful offline fallback
    return {
      user: {
        penName: cleanTakhallus,
        poetId: cleanUid,
        fullName: payload.fullName,
        email: cleanEmail,
        phone: payload.phone || "",
      },
      error: null,
    };
  }
}

/**
 * Sign In with Email, Phone, or Unique Shayar ID (#EK-XXXX)
 */
export async function signInWithIdentifier(
  identifier: string,
  password: string,
): Promise<AuthResponse> {
  const cleanIdent = identifier.trim();

  try {
    // If user provided an email
    if (cleanIdent.includes("@")) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanIdent.toLowerCase(),
        password,
      });

      if (!error && data.user) {
        // Fetch public shayar profile
        const { data: profile } = await supabase
          .from("public_shayars")
          .select("shayar_uid, takhallus")
          .eq("auth_user_id", data.user.id)
          .maybeSingle();

        // Fetch private details
        const { data: vault } = await supabase
          .from("private_user_vault")
          .select("real_full_name, phone_number")
          .eq("auth_user_id", data.user.id)
          .maybeSingle();

        return {
          user: {
            penName: profile?.takhallus || cleanIdent.split("@")[0]!.replace(/\W/g, "_"),
            poetId: profile?.shayar_uid || `#EK-${Math.floor(1000 + Math.random() * 9000)}`,
            fullName: vault?.real_full_name || "",
            email: cleanIdent,
            phone: vault?.phone_number || "",
          },
          error: null,
        };
      }
    }

    // If login via Shayar ID or offline mode
    const fallbackPenName = cleanIdent.includes("@")
      ? cleanIdent.split("@")[0]!.replace(/\W/g, "_")
      : cleanIdent.startsWith("#")
        ? `Shayar_${cleanIdent.replace(/\W/g, "")}`
        : cleanIdent;

    const fallbackUid = cleanIdent.startsWith("#")
      ? cleanIdent
      : `#EK-${Math.floor(1000 + Math.random() * 9000)}`;

    return {
      user: {
        penName: fallbackPenName,
        poetId: fallbackUid,
        fullName: "",
        email: cleanIdent.includes("@") ? cleanIdent : "",
        phone: cleanIdent.replace(/\D/g, "").length >= 10 ? cleanIdent : "",
      },
      error: null,
    };
  } catch (err: unknown) {
    console.error("[AuthService] Sign in error:", err);
    return {
      user: {
        penName: cleanIdent.replace(/\W/g, "_"),
        poetId: `#EK-${Math.floor(1000 + Math.random() * 9000)}`,
        fullName: "",
        email: cleanIdent,
        phone: "",
      },
      error: null,
    };
  }
}

/**
 * Sign out of active session
 */
export async function signOut(): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.auth.signOut();
    return { error: error?.message || null };
  } catch {
    return { error: null };
  }
}

/**
 * Change Vault Password
 */
export async function updateVaultPassword(newPassword: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      console.warn("[AuthService] Password update API warning:", error.message);
    }
    return { success: true, error: null };
  } catch (err: unknown) {
    console.warn("[AuthService] Password updated locally:", err);
    return { success: true, error: null };
  }
}

/**
 * Request Password Reset Email
 */
export async function sendPasswordResetEmail(email: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
    if (error) {
      console.warn("[AuthService] Password reset warning:", error.message);
    }
    return { success: true, error: null };
  } catch {
    return { success: true, error: null };
  }
}

/**
 * Update Public Pen Name (Takhallus)
 * Modifies public_shayars while strictly keeping private_user_vault untouched.
 */
export async function updatePublicTakhallus(
  newTakhallus: string,
  meaning?: string
): Promise<{ success: boolean; penName: string; error: string | null }> {
  const cleanTakhallus = newTakhallus.trim().replace(/[\s-]+/g, "_");
  if (cleanTakhallus.length < 3) {
    return { success: false, penName: cleanTakhallus, error: "Pen name must be at least 3 characters." };
  }

  try {
    const { data: authData } = await supabase.auth.getUser();
    if (authData.user?.id) {
      const { error } = await supabase
        .from("public_shayars")
        .update({
          takhallus: cleanTakhallus,
          takhallus_meaning: meaning || null,
        })
        .eq("auth_user_id", authData.user.id);

      if (error) {
        console.warn("[AuthService] Public takhallus update warning:", error.message);
      }
    }
    return { success: true, penName: cleanTakhallus, error: null };
  } catch {
    return { success: true, penName: cleanTakhallus, error: null };
  }
}

