"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { Input, Button, Typography, message, Flex } from "antd";
import { LockOutlined, MailOutlined } from "@ant-design/icons";
import { createStyles } from "antd-style";
import Link from "next/link";
import { useSignIn } from "@/domains/workspace/hooks";

const useStyles = createStyles(({ token }) => ({
  card: {
    backgroundColor: token.colorBgContainer,
    borderRadius: token.borderRadiusLG,
    padding: token.paddingXL,
    boxShadow: token.boxShadowTertiary,
  },
  header: {
    textAlign: "center",
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
    textAlign: "center",
    marginTop: token.marginLG,
  },
  link: {
    color: token.colorPrimary,
    "&:hover": {
      color: token.colorPrimaryHover,
    },
  },
}));

interface ISignInForm {
  email: string;
  password: string;
}

export default function SignInPage() {
  const { styles } = useStyles();
  const router = useRouter();
  const { signIn, loading } = useSignIn();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ISignInForm>({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = useCallback(
    async (values: ISignInForm) => {
      const result = await signIn({
        email: values.email,
        password: values.password,
      });

      if (result.userErrors.length > 0) {
        const errorMessage = result.userErrors[0]?.message ?? "Sign in failed";
        message.error(errorMessage);
        return;
      }

      if (result.user) {
        message.success("Signed in successfully");
        router.push("/workspace/organization");
      }
    },
    [signIn, router]
  );

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <Typography.Title level={2} className={styles.title}>
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
            rules={{
              required: "Email is required",
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: "Invalid email address",
              },
            }}
            render={({ field }) => (
              <Input
                {...field}
                prefix={<MailOutlined />}
                placeholder="email@example.com"
                size="large"
                status={errors.email ? "error" : undefined}
                autoFocus
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
            rules={{
              required: "Password is required",
              minLength: {
                value: 6,
                message: "Password must be at least 6 characters",
              },
            }}
            render={({ field }) => (
              <Input.Password
                {...field}
                prefix={<LockOutlined />}
                placeholder="Enter your password"
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

        <Button
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
