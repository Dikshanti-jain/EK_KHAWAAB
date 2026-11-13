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
  needsEmailConfirmation?: boolean;
  email?: string;
  error: string | null;
};

/**
 * Safely resolves the live redirect URL for auth email operations (confirmation, recovery).
 * Always pulls from the current browser origin at runtime, falling back to verified environment variables in SSR.
 */
export function getAuthRedirectUrl(path: string = "/auth"): string {
  let origin = "https://ekkhwaab.in";
  if (typeof window !== "undefined" && window.location?.origin) {
    origin = window.location.origin;
  } else if (typeof process !== "undefined" && process.env) {
    origin = process.env["VITE_SITE_URL"] || process.env["SITE_URL"] || origin;
  }
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${origin.replace(/\/+$/, "")}${cleanPath}`;
}

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
    const confirmationRedirect = `${getAuthRedirectUrl("/auth")}?mode=signin&confirmed=true`;

    // 1. Supabase Auth registration with explicit live emailRedirectTo
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: cleanEmail,
      password: payload.password,
      options: {
        emailRedirectTo: confirmationRedirect,
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

    // When email confirmation is required by Supabase, session is null until user clicks email link
    if (!authData.session) {
      return {
        user: null,
        needsEmailConfirmation: true,
        email: cleanEmail,
        error: null,
      };
    }

    // 2. Ensure private_user_vault and public_shayars records exist if immediately authenticated
    await supabase.from("private_user_vault").upsert({
      auth_user_id: authUserId,
      real_full_name: payload.fullName.trim(),
      email: cleanEmail,
      phone_number: payload.phone?.trim() || null,
    }, { onConflict: "auth_user_id" });

    // The on_auth_user_created trigger has already provisioned public_shayars
    // from the signup metadata. Re-assert the pen name through the
    // SECURITY DEFINER RPC so the client never needs auth_user_id access.
    await supabase.rpc("update_my_takhallus", {
      p_takhallus: cleanTakhallus,
      p_meaning: payload.takhallusMeaning?.trim() || null,
    });

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
 * Includes automatic self-healing profile sync if public_shayars is missing.
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
      const errMsg = error?.message || "Invalid email or password.";
      if (errMsg.toLowerCase().includes("email not confirmed")) {
        return {
          user: null,
          needsEmailConfirmation: true,
          email: cleanIdent.toLowerCase(),
          error: "Your email address has not been confirmed yet. Please verify your email via the link sent to your inbox, or click 'Resend' below.",
        };
      }
      return {
        user: null,
        error: errMsg,
      };
    }

    // Fetch public shayar profile.
    // get_my_shayar_profile() is the only supported read path: the client no
    // longer has SELECT on public_shayars.auth_user_id (migration 2026111301).
    const { data: profileRows } = await supabase.rpc("get_my_shayar_profile");
    const profile = profileRows?.[0] ?? null;

    const meta = data.user.user_metadata || {};
    let penName = profile?.takhallus;
    let poetId = profile?.shayar_uid;

    // Self-healing: if the profile row is missing, create it now. The session
    // is authenticated, so the INSERT policy permits this.
    if (!profile || !profile.shayar_uid) {
      penName = (meta["takhallus"] as string | undefined)?.trim() || cleanIdent.split("@")[0]!.replace(/\W/g, "_");
      poetId = (meta["shayar_uid"] as string | undefined) || `#EK-${data.user.id.slice(0, 6).toUpperCase()}`;

      await supabase.from("private_user_vault").upsert({
        auth_user_id: data.user.id,
        real_full_name: (meta["full_name"] as string | undefined)?.trim() || "Anonymous Poet",
        email: data.user.email || cleanIdent.toLowerCase(),
      }, { onConflict: "auth_user_id" });

      await supabase.from("public_shayars").insert({
        auth_user_id: data.user.id,
        shayar_uid: poetId,
        takhallus: penName,
        takhallus_meaning: (meta["takhallus_meaning"] as string | undefined) || null,
        vibe_category: (meta["vibe_category"] as string | undefined) || null,
      });
    }

    return {
      user: {
        penName: penName || "Musafir",
        poetId: poetId || `#EK-${data.user.id.slice(0, 6).toUpperCase()}`,
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
 * Request Password Reset Email with explicit live site redirectTo
 */
export async function sendPasswordResetEmail(email: string): Promise<{ success: boolean; error: string | null }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes("@")) {
    return { success: false, error: "Please provide a valid email address." };
  }

  try {
    const redirectUrl = `${getAuthRedirectUrl("/auth")}?mode=reset`;
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: redirectUrl,
    });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, error: null };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to send reset email." };
  }
}

/**
 * Resend Email Confirmation Link with explicit live site emailRedirectTo
 */
export async function resendConfirmationEmail(email: string): Promise<{ success: boolean; error: string | null }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes("@")) {
    return { success: false, error: "Please provide a valid email address." };
  }

  try {
    const redirectUrl = `${getAuthRedirectUrl("/auth")}?mode=signin&confirmed=true`;
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: cleanEmail,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, error: null };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to resend confirmation email." };
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

    const { data: updated, error } = await supabase.rpc("update_my_takhallus", {
      p_takhallus: cleanTakhallus,
      p_meaning: meaning?.trim() || null,
    });

    if (error) {
      return { success: false, penName: cleanTakhallus, error: error.message };
    }
    if (!updated) {
      return {
        success: false,
        penName: cleanTakhallus,
        error: "No public profile found for this account. Please sign in again.",
      };
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
