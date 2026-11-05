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
 * Split-Vault Sign Up (Email & Password Auth)
 * Authenticates with Supabase and provisions private_user_vault & public_shayars.
 * NO fabricated success on error (Fixes RT-03, AS-02, DB-05).
 */
export async function signUpWithVault(payload: SignUpPayload): Promise<AuthResponse> {
  const cleanEmail = payload.email.trim().toLowerCase();
  const cleanTakhallus = payload.takhallus.trim().replace(/[\s-]+/g, "_");
  const cleanUid = payload.shayarUid.startsWith("#") ? payload.shayarUid : `#${payload.shayarUid}`;

  if (!cleanEmail || !cleanEmail.includes("@")) {
    return { user: null, error: "A valid email address is required." };
  }
  if (!payload.password || payload.password.length < 6) {
    return { user: null, error: "Password must be at least 6 characters long." };
  }
  if (cleanTakhallus.length < 2 || cleanTakhallus.length > 40) {
    return { user: null, error: "Pen name (Takhallus) must be between 2 and 40 characters." };
  }

  try {
    // 1. Supabase Auth registration
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: cleanEmail,
      password: payload.password,
      options: {
        data: {
          takhallus: cleanTakhallus,
          shayar_uid: cleanUid,
          full_name: payload.fullName.trim(),
          takhallus_meaning: payload.takhallusMeaning?.trim() || "",
          vibe_category: payload.vibeCategory || "Late Night",
        },
      },
    });

    if (authError) {
      return { user: null, error: authError.message };
    }

    const authUserId = authData.user?.id;
    if (!authUserId) {
      return { user: null, error: "Failed to create user account. Please try again." };
    }

    // 2. Ensure private_user_vault and public_shayars records exist
    // The DB trigger handle_new_authenticated_user auto-provisions, but we upsert defensively
    await supabase.from("private_user_vault").upsert({
      auth_user_id: authUserId,
      real_full_name: payload.fullName.trim(),
      email: cleanEmail,
      phone_number: payload.phone?.trim() || null,
    }, { onConflict: "auth_user_id" });

    await supabase.from("public_shayars").upsert({
      auth_user_id: authUserId,
      shayar_uid: cleanUid,
      takhallus: cleanTakhallus,
      takhallus_meaning: payload.takhallusMeaning?.trim() || null,
      vibe_category: payload.vibeCategory || null,
    }, { onConflict: "auth_user_id" });

    return {
      user: {
        penName: cleanTakhallus,
        poetId: cleanUid,
      },
      error: null,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred during signup.";
    return { user: null, error: message };
  }
}

/**
 * Sign In with Email & Password
 * Strict verification against Supabase Auth (Fixes RT-03, AS-02).
 * Rejects unknown users and invalid passwords with real error messages.
 */
export async function signInWithIdentifier(
  identifier: string,
  password: string,
): Promise<AuthResponse> {
  const cleanIdent = identifier.trim();

  if (!cleanIdent) {
    return { user: null, error: "Please enter your registered email address." };
  }

  if (!cleanIdent.includes("@")) {
    return {
      user: null,
      error: "Please sign in using your registered email address. Signing in via pen name or phone number is not supported.",
    };
  }

  if (!password) {
    return { user: null, error: "Please enter your password." };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanIdent.toLowerCase(),
      password,
    });

    if (error || !data.user || !data.session) {
      return {
        user: null,
        error: error?.message || "Invalid email or password.",
      };
    }

    // Fetch public shayar profile (using public_shayar_directory or public_shayars)
    const { data: profile } = await supabase
      .from("public_shayars")
      .select("shayar_uid, takhallus")
      .eq("auth_user_id", data.user.id)
      .maybeSingle();

    const meta = data.user.user_metadata || {};
    const penName = profile?.takhallus || (meta["takhallus"] as string | undefined) || cleanIdent.split("@")[0]!.replace(/\W/g, "_");
    const poetId = profile?.shayar_uid || (meta["shayar_uid"] as string | undefined) || `#EK-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    return {
      user: {
        penName,
        poetId,
      },
      error: null,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Sign in failed. Please check your credentials.";
    return { user: null, error: message };
  }
}

/**
 * Sign out of active session
 */
export async function signOut(): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.auth.signOut();
    return { error: error?.message || null };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to sign out." };
  }
}

/**
 * Change Vault Password
 * Returns real Supabase response instead of fabricated success (Fixes AS-02).
 */
export async function updateVaultPassword(newPassword: string): Promise<{ success: boolean; error: string | null }> {
  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: "New password must be at least 6 characters." };
  }

  try {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, error: null };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update password." };
  }
}

/**
 * Request Password Reset Email
 * Returns real Supabase response (Fixes AS-02).
 */
export async function sendPasswordResetEmail(email: string): Promise<{ success: boolean; error: string | null }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes("@")) {
    return { success: false, error: "Please provide a valid email address." };
  }

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, error: null };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to send reset email." };
  }
}

/**
 * Update Public Pen Name (Takhallus)
 * Returns real Supabase response (Fixes AS-02).
 */
export async function updatePublicTakhallus(
  newTakhallus: string,
  meaning?: string
): Promise<{ success: boolean; penName: string; error: string | null }> {
  const cleanTakhallus = newTakhallus.trim().replace(/[\s-]+/g, "_");
  if (cleanTakhallus.length < 2 || cleanTakhallus.length > 40) {
    return { success: false, penName: cleanTakhallus, error: "Pen name must be between 2 and 40 characters." };
  }

  try {
    const { data: authData, error: userError } = await supabase.auth.getUser();
    if (userError || !authData.user?.id) {
      return { success: false, penName: cleanTakhallus, error: "You must be signed in to change your pen name." };
    }

    const { error } = await supabase
      .from("public_shayars")
      .update({
        takhallus: cleanTakhallus,
        takhallus_meaning: meaning?.trim() || null,
      })
      .eq("auth_user_id", authData.user.id);

    if (error) {
      return { success: false, penName: cleanTakhallus, error: error.message };
    }

    return { success: true, penName: cleanTakhallus, error: null };
  } catch (err: unknown) {
    return {
      success: false,
      penName: cleanTakhallus,
      error: err instanceof Error ? err.message : "Failed to update pen name.",
    };
  }
}

/**
 * Full Account Erasure (Fixes PC-04)
 * Executes delete_my_account_rpc to erase private vault and public profiles.
 */
export async function deleteMyAccount(): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase.rpc("delete_my_account_rpc");
    if (error) {
      return { success: false, error: error.message };
    }
    await supabase.auth.signOut();
    return { success: true, error: null };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete account.",
    };
  }
}
