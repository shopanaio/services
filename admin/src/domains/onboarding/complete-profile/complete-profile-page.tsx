"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUpdateProfile } from "@/domains/profile/hooks";
import { CompleteProfileForm } from "./components/complete-profile-form";
import type { CompleteProfileFormValues } from "../schemas/complete-profile.schema";

/**
 * Complete profile page for onboarding flow.
 * Users must fill in firstName and lastName before accessing the app.
 */
export default function CompleteProfilePage() {
  const router = useRouter();
  const { updateProfile, loading } = useUpdateProfile();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (values: CompleteProfileFormValues) => {
      setError(null);

      try {
        const result = await updateProfile({
          firstName: values.firstName,
          lastName: values.lastName,
        });

        if (result.userErrors.length > 0) {
          // Show first error message
          const firstError = result.userErrors[0];
          setError(firstError?.message ?? "Failed to update profile");
          return;
        }

        // Profile completed successfully, redirect to workspace
        router.replace("/workspace");
      } catch {
        setError("An unexpected error occurred. Please try again.");
      }
    },
    [updateProfile, router]
  );

  return (
    <CompleteProfileForm
      onSubmit={handleSubmit}
      isLoading={loading}
      error={error}
    />
  );
}
