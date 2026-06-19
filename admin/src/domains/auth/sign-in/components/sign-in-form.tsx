"use client";

import { Controller, type UseFormReturn } from "react-hook-form";
import { Button, Input, Typography, Checkbox, Flex } from "antd";
import { LockOutlined } from "@ant-design/icons";
import { createStyles } from "antd-style";
import Link from "next/link";
import type { SignInFormValues } from "../../schemas/sign-in.schema";

const useStyles = createStyles(({ token }) => ({
  card: {
    backgroundColor: token.colorBgContainer,
    borderRadius: token.borderRadiusLG,
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
  options: {
    marginBottom: token.marginMD,
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

interface SignInFormProps {
  form: UseFormReturn<SignInFormValues>;
  onSubmit: (values: SignInFormValues) => Promise<void>;
  loading: boolean;
}

/**
 * Sign-in form presentation component.
 * Handles form rendering and validation display.
 */
export function SignInForm({ form, onSubmit, loading }: SignInFormProps) {
  const { styles } = useStyles();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = form;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <Typography.Title level={3} className={styles.title}>
          Sign In
        </Typography.Title>
        <Typography.Text className={styles.subtitle}>
          Welcome back to Shopana
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
                data-testid="sign-in-email-input"
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
              <Input.Password
                {...field}
                data-testid="sign-in-password-input"
                prefix={<LockOutlined />}
                placeholder="Enter your password"
                autoComplete="current-password"
                size="large"
                status={errors.password ? "error" : undefined}
              />
            )}
          />
          {errors.password && (
            <Typography.Text className={styles.error}>
              {errors.password.message}
            </Typography.Text>
          )}
        </div>

        <Flex justify="space-between" align="center" className={styles.options}>
          <Controller
            name="rememberMe"
            control={control}
            render={({ field: { value, onChange, ...field } }) => (
              <Checkbox
                {...field}
                checked={value}
                onChange={(e) => onChange(e.target.checked)}
              >
                Remember me
              </Checkbox>
            )}
          />
          {/* Forgot password link - to be implemented in future phase */}
          {/* <Link href="/forgot-password" className={styles.link}>
            Forgot password?
          </Link> */}
        </Flex>

        <Button
          data-testid="sign-in-submit-button"
          type="primary"
          htmlType="submit"
          size="large"
          loading={loading}
          className={styles.submitButton}
        >
          Sign In
        </Button>
      </form>

      <Flex className={styles.footer} justify="center" gap={4}>
        <Typography.Text>Don&apos;t have an account?</Typography.Text>
        <Link href="/sign-up" className={styles.link}>
          Sign Up
        </Link>
      </Flex>
    </div>
  );
}
