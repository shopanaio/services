"use client";

import { Controller, type UseFormReturn } from "react-hook-form";
import { Button, Input, Typography, Flex, Popover } from "antd";
import { LockOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { createStyles } from "antd-style";
import Link from "next/link";
import type { SignUpFormValues } from "../../schemas";
import { PasswordStrength } from "./password-strength";

const useStyles = createStyles(({ token }) => ({
  card: {
    backgroundColor: token.colorBgContainer,
    borderRadius: token.borderRadius,
    padding: token.paddingLG,
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
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = form;
  const passwordValue = watch("password");

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <Typography.Title level={3} className={styles.title}>
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
          <Flex align="center" gap={4} style={{ marginBottom: 8 }}>
            <Typography.Text strong>Password</Typography.Text>
            <Popover
              content={<PasswordStrength password={passwordValue} showRequirements />}
              trigger="hover"
              placement="right"
            >
              <InfoCircleOutlined style={{ cursor: "help" }} />
            </Popover>
          </Flex>
          <Controller
            name="password"
            control={control}
            render={({ field }) => (
              <Input.Password
                {...field}
                prefix={<LockOutlined />}
                placeholder="Create a password"
                autoComplete="new-password"
                size="large"
                status={errors.password ? "error" : undefined}
              />
            )}
          />
          {errors.password && (
            <Typography.Text
              className={styles.error}
              style={{ display: "block" }}
            >
              {errors.password.message}
            </Typography.Text>
          )}
          <Typography.Text
            type="secondary"
            style={{ fontSize: 12, display: "block", marginTop: 8 }}
          >
            Use 8+ characters with uppercase, lowercase, numbers and symbols
          </Typography.Text>
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
