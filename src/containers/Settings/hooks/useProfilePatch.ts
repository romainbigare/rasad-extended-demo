import { useState } from "react";

import { useAuth } from "@shared/auth/AuthContext";

import { saveProfilePatch, type ProfilePatch } from "@/lib/auth/profile";

/**
 * One save-in-flight tracker shared by every editable field on the Settings
 * page, keyed by field name so each control can show its own pending state
 * without a separate hook instance per field re-deriving the same auth
 * context. `updateProfile` never throws (see @/lib/auth/profile) - it
 * resolves to `null` on failure, which this treats as a real error.
 */
export function useProfilePatch() {
  const auth = useAuth();
  const [pendingField, setPendingField] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(field: string, patch: ProfilePatch): Promise<boolean> {
    setPendingField(field);
    setError(null);
    try {
      const result = await saveProfilePatch(auth?.updateProfile, patch);
      if (!result) {
        setError("Couldn’t save. Try again.");
        return false;
      }
      return true;
    } catch {
      setError("Couldn’t save. Try again.");
      return false;
    } finally {
      setPendingField(null);
    }
  }

  return { save, pendingField, error, clearError: () => setError(null) };
}
