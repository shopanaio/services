"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { App } from "antd";
import { SignUpForm } from "./components/sign-up-form";
import { useSignUp } from "../hooks";
import { signUpSchema, type SignUpFormValues } from "../schemas";
import { mapGraphQLErrorsToForm } from "../utils";

/**
 * Sign-up page container component.
 * Handles form state, submission, and navigation logic.
 */
export default function SignUpPage() {
  const router = useRouter();
  const { signUp, loading } = useSignUp();
  const { message } = App.useApp();

  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
    mode: "onBlur", // Validate on blur for better UX
  });

  const onSubmit = useCallback(
    async (values: SignUpFormValues) => {
      const result = await signUp({
        email: values.email,
        password: values.password,
      });

      if (!result.success) {
        const { generalErrors } = mapGraphQLErrorsToForm<SignUpFormValues>(
          result.userErrors,
          form.setError
        );

        if (generalErrors.length > 0) {
          message.error(generalErrors[0]);
        }
        return;
      }

      message.success("Account created successfully!");
      router.push("/workspace");
    },
    [signUp, form.setError, router]
  );

  return <SignUpForm form={form} onSubmit={onSubmit} loading={loading} />;
}
