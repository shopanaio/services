"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { App } from "antd";
import { SignInForm } from "./components/sign-in-form";
import { useSignIn } from "../hooks";
import { signInSchema, type SignInFormValues } from "../schemas";
import { mapGraphQLErrorsToForm } from "../utils";

/**
 * Sign-in page container component.
 * Handles form state, submission, and navigation logic.
 */
export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, loading } = useSignIn();
  const { message } = App.useApp();

  const form = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
    mode: "onBlur", // Validate on blur for better UX
  });

  const onSubmit = useCallback(
    async (values: SignInFormValues) => {
      const result = await signIn({
        email: values.email,
        password: values.password,
      });

      if (!result.success) {
        const { generalErrors } = mapGraphQLErrorsToForm<SignInFormValues>(
          result.userErrors,
          form.setError
        );

        if (generalErrors.length > 0) {
          message.error(generalErrors[0]);
        }
        return;
      }

      message.success("Welcome back!");

      // Redirect to onboarding if profile is incomplete
      if (!result.user?.isProfileComplete) {
        router.push("/onboarding/complete-profile");
        return;
      }

      // Redirect to returnUrl if present, otherwise to default route
      const returnUrl = searchParams.get("returnUrl");
      router.push(returnUrl || "/workspace");
    },
    [signIn, form.setError, router, searchParams]
  );

  return <SignInForm form={form} onSubmit={onSubmit} loading={loading} />;
}
