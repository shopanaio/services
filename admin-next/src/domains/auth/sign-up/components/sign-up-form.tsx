"use client";

import { useState } from "react";
import { Controller, type UseFormReturn } from "react-hook-form";
import { Button, Input, Typography, Flex, Popover } from "antd";
import { MailOutlined, LockOutlined } from "@ant-design/icons";
import { createStyles } from "antd-style";
import Link from "next/link";
import type { SignUpFormValues } from "../../schemas";
import { PasswordStrength } from "./password-strength";

const useStyles = createStyles(({ token }) => ({
  card: {
    backgroundColor: token.colorBgContainer,
    borderRadius: token.borderRadiusLG,
    padding: token.paddingXL,
    boxShadow: token.boxShadowTertiary,
  },
  header: {
    textAlign: "center" as const,
    marginBottom: token.marginXL,
  },
  title: {
    marginBottom: token.marginXS,
  },
  subtitle: {
    color: token.colorTextSecondary,
  },
  formItem: {
    marginBottom: token.marginMD,
  },
  label: {
    display: "block",
    marginBottom: token.marginXS,
    fontWeight: 500,
  },
  error: {
    color: token.colorError,
    fontSize: token.fontSizeSM,
    marginTop: token.marginXS,
  },
  submitButton: {
    width: "100%",
    marginTop: token.marginSM,
  },
  footer: {
    textAlign: "center" as const,
    marginTop: token.marginLG,
  },
  link: {
    color: token.colorPrimary,
    "&:hover": {
      color: token.colorPrimaryHover,
    },
  },
}));

interface SignUpFormProps {
  form: UseFormReturn<SignUpFormValues>;
  onSubmit: (values: SignUpFormValues) => Promise<void>;
  loading: boolean;
}

/**
 * Sign-up form presentation component.
 * Includes password strength indicator for better UX.
 */
export function SignUpForm({ form, onSubmit, loading }: SignUpFormProps) {
  const { styles } = useStyles();
  const [passwordFocused, setPasswordFocused] = useState(false);
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = form;

  const password = watch("password");

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <Typography.Title level={2} className={styles.title}>
          Create Account
        </Typography.Title>
        <Typography.Text className={styles.subtitle}>
          Join Shopana today
        </Typography.Text>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className={styles.formItem}>
          <Typography.Text className={styles.label}>Email</Typography.Text>
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                prefix={<MailOutlined />}
                placeholder="email@example.com"
                autoComplete="email"
                size="large"
                status={errors.email ? "error" : undefined}
              />
            )}
          />
          {errors.email && (
            <Typography.Text className={styles.error}>
              {errors.email.message}
            </Typography.Text>
          )}
        </div>

        <div className={styles.formItem}>
          <Typography.Text className={styles.label}>Password</Typography.Text>
          <Controller
            name="password"
            control={control}
            render={({ field }) => (
              <Popover
                content={<PasswordStrength password={password || ""} />}
                trigger="focus"
                placement="right"
                open={passwordFocused}
              >
                <Input.Password
                  {...field}
                  prefix={<LockOutlined />}
                  placeholder="Create a password"
                  autoComplete="new-password"
                  size="large"
                  status={errors.password ? "error" : undefined}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                />
              </Popover>
            )}
          />
          {errors.password && (
            <Typography.Text className={styles.error}>
              {errors.password.message}
            </Typography.Text>
          )}
        </div>

        <div className={styles.formItem}>
          <Typography.Text className={styles.label}>
            Confirm Password
          </Typography.Text>
          <Controller
            name="confirmPassword"
            control={control}
            render={({ field }) => (
              <Input.Password
                {...field}
                prefix={<LockOutlined />}
                placeholder="Confirm your password"
                autoComplete="new-password"
                size="large"
                status={errors.confirmPassword ? "error" : undefined}
              />
            )}
          />
          {errors.confirmPassword && (
            <Typography.Text className={styles.error}>
              {errors.confirmPassword.message}
            </Typography.Text>
          )}
        </div>

        <Button
          type="primary"
          htmlType="submit"
          size="large"
          loading={loading}
          className={styles.submitButton}
        >
          Create Account
        </Button>
      </form>

      <Flex className={styles.footer} justify="center" gap={4}>
        <Typography.Text>Already have an account?</Typography.Text>
        <Link href="/sign-in" className={styles.link}>
          Sign In
        </Link>
      </Flex>
    </div>
  );
}
