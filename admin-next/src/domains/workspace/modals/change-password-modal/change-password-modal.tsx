"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { Input, Typography, Progress, message } from "antd";
import { createStyles } from "antd-style";
import { EyeOutlined, EyeInvisibleOutlined, CheckOutlined, CloseOutlined } from "@ant-design/icons";
import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from "@/layouts/modals";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import type { IChangePasswordModalPayload } from "../../modals";

const useStyles = createStyles(({ token }) => ({
  formItem: {
    marginBottom: token.marginMD,
  },
  formItemLast: {
    marginBottom: 0,
  },
  label: {
    display: "block",
    marginBottom: token.marginXS,
    fontWeight: 500,
  },
  requirements: {
    marginTop: token.marginSM,
  },
  requirement: {
    display: "flex",
    alignItems: "center",
    gap: token.marginXS,
    fontSize: token.fontSizeSM,
    marginBottom: 4,
  },
  requirementMet: {
    color: token.colorSuccess,
  },
  requirementNotMet: {
    color: token.colorTextSecondary,
  },
  error: {
    color: token.colorError,
    fontSize: token.fontSizeSM,
    marginTop: token.marginXS,
  },
}));

interface IPasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export const ChangePasswordModal = () => {
  const { styles } = useStyles();
  const { payload, pop } = useModalStackContext();
  const typedPayload = payload as IChangePasswordModalPayload;

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<IPasswordForm>({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const newPassword = watch("newPassword");

  // Password requirements
  const requirements = [
    { label: "At least 8 characters", met: newPassword.length >= 8 },
    {
      label: "Contains uppercase and lowercase",
      met: /[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword),
    },
    { label: "Contains a number", met: /[0-9]/.test(newPassword) },
  ];

  const allRequirementsMet = requirements.every((r) => r.met);

  const onSubmit = (values: IPasswordForm) => {
    if (!allRequirementsMet) {
      message.error("Please meet all password requirements");
      return;
    }
    typedPayload.onSave?.(values.currentPassword, values.newPassword);
    message.success("Password updated successfully");
    pop();
  };

  return (
    <ModalLayout
      name="change-password"
      header={
        <ModalHeader
          name="change-password"
          title="Change Password"
          onClose={pop}
          submitButtonProps={{
            onClick: handleSubmit(onSubmit),
            children: "Update Password",
            disabled: !allRequirementsMet,
          }}
        />
      }
    >
      <Paper>
        <PaperHeader title="Password" />
        <form>
          <div className={styles.formItem}>
            <Typography.Text className={styles.label}>
              Current Password
            </Typography.Text>
            <Controller
              name="currentPassword"
              control={control}
              rules={{ required: "Current password is required" }}
              render={({ field }) => (
                <Input.Password
                  {...field}
                  placeholder="Enter current password"
                  status={errors.currentPassword ? "error" : undefined}
                  autoFocus
                />
              )}
            />
            {errors.currentPassword && (
              <Typography.Text className={styles.error}>
                {errors.currentPassword.message}
              </Typography.Text>
            )}
          </div>

          <div className={styles.formItem}>
            <Typography.Text className={styles.label}>
              New Password
            </Typography.Text>
            <Controller
              name="newPassword"
              control={control}
              rules={{ required: "New password is required" }}
              render={({ field }) => (
                <Input.Password
                  {...field}
                  placeholder="Enter new password"
                  status={errors.newPassword ? "error" : undefined}
                />
              )}
            />
            <div className={styles.requirements}>
              {requirements.map((req, index) => (
                <div
                  key={index}
                  className={`${styles.requirement} ${
                    req.met ? styles.requirementMet : styles.requirementNotMet
                  }`}
                >
                  {req.met ? <CheckOutlined /> : <CloseOutlined />}
                  <span>{req.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.formItemLast}>
            <Typography.Text className={styles.label}>
              Confirm New Password
            </Typography.Text>
            <Controller
              name="confirmPassword"
              control={control}
              rules={{
                required: "Please confirm your password",
                validate: (value) =>
                  value === newPassword || "Passwords do not match",
              }}
              render={({ field }) => (
                <Input.Password
                  {...field}
                  placeholder="Confirm new password"
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
        </form>
      </Paper>
    </ModalLayout>
  );
};
