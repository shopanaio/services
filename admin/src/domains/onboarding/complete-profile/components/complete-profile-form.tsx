"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input, Button, Form, Alert } from "antd";
import { createStyles } from "antd-style";
import {
  completeProfileSchema,
  type CompleteProfileFormValues,
} from "../../schemas/complete-profile.schema";

const useStyles = createStyles(({ token }) => ({
  form: {
    display: "flex",
    flexDirection: "column",
    gap: token.marginMD,
  },
  row: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: token.marginMD,
  },
  submitButton: {
    marginTop: token.marginSM,
  },
}));

interface CompleteProfileFormProps {
  onSubmit: (values: CompleteProfileFormValues) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
}

/**
 * Form for completing user profile during onboarding.
 * Requires firstName and lastName to proceed.
 */
export function CompleteProfileForm({
  onSubmit,
  isLoading,
  error,
}: CompleteProfileFormProps) {
  const { styles } = useStyles();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CompleteProfileFormValues>({
    resolver: zodResolver(completeProfileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
    },
    mode: "onBlur",
  });

  return (
    <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
      {error && (
        <Alert message={error} type="error" showIcon />
      )}

      <div className={styles.row}>
        <Form.Item
          validateStatus={errors.firstName ? "error" : undefined}
          help={errors.firstName?.message}
        >
          <Controller
            name="firstName"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                data-testid="complete-profile-first-name-input"
                placeholder="First name"
                size="large"
                disabled={isLoading}
              />
            )}
          />
        </Form.Item>

        <Form.Item
          validateStatus={errors.lastName ? "error" : undefined}
          help={errors.lastName?.message}
        >
          <Controller
            name="lastName"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                data-testid="complete-profile-last-name-input"
                placeholder="Last name"
                size="large"
                disabled={isLoading}
              />
            )}
          />
        </Form.Item>
      </div>

      <Button
        data-testid="complete-profile-submit-button"
        type="primary"
        htmlType="submit"
        size="large"
        block
        loading={isLoading}
        className={styles.submitButton}
      >
        Continue
      </Button>
    </form>
  );
}
