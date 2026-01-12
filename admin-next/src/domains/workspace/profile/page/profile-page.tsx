"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { Input, Typography, Button, Select, Tag, message } from "antd";
import { createStyles } from "antd-style";
import { CheckCircleOutlined } from "@ant-design/icons";
import { PreviewCard, SettingsSection } from "../../shared";
import {
  mockCurrentUser,
  mockOrganization,
  localeOptions,
  timezoneOptions,
  dateFormatOptions,
} from "../../mocks/data";
import { useChangeEmailModal } from "../../modals";

const useStyles = createStyles(({ token }) => ({
  container: {
    maxWidth: 800,
    margin: "0 auto",
    padding: token.paddingLG,
    display: "flex",
    flexDirection: "column",
    gap: token.marginLG,
  },
  formItem: {
    marginBottom: token.marginMD,
  },
  formItemRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: token.marginMD,
    marginBottom: token.marginMD,
  },
  label: {
    display: "block",
    marginBottom: token.marginXS,
    fontWeight: 500,
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: token.marginSM,
    marginTop: token.marginMD,
    paddingTop: token.paddingMD,
    borderTop: `1px solid ${token.colorBorderSecondary}`,
  },
  emailRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  emailInfo: {
    display: "flex",
    alignItems: "center",
    gap: token.marginSM,
  },
  verified: {
    color: token.colorSuccess,
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  selectFullWidth: {
    width: "100%",
  },
}));

interface IProfileForm {
  firstName: string;
  lastName: string;
  displayName: string;
  locale: string;
  timezone: string;
  dateFormat: string;
}

export default function ProfilePage() {
  const { styles } = useStyles();
  const [isEditing, setIsEditing] = useState(false);
  const { push: pushChangeEmailModal } = useChangeEmailModal();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<IProfileForm>({
    defaultValues: {
      firstName: mockCurrentUser.firstName || "",
      lastName: mockCurrentUser.lastName || "",
      displayName: mockCurrentUser.name,
      locale: mockCurrentUser.locale || "en-US",
      timezone: "UTC",
      dateFormat: "MM/DD/YYYY",
    },
  });

  const onSubmit = (values: IProfileForm) => {
    console.log("Saving profile:", values);
    message.success("Profile updated successfully");
    setIsEditing(false);
  };

  const handleCancel = () => {
    reset();
    setIsEditing(false);
  };

  const handleChangeEmail = () => {
    pushChangeEmailModal({
      currentEmail: mockCurrentUser.email,
      onSave: (newEmail: string) => {
        message.success(`Verification sent to ${newEmail} (mock)`);
      },
    });
  };

  const handleEditPhoto = () => {
    message.info("Edit photo modal would open");
  };

  return (
    <div className={styles.container}>
      <PreviewCard
        type="profile"
        name={mockCurrentUser.name}
        subtitle={mockCurrentUser.email}
        meta={`Admin · ${mockOrganization.displayName}`}
        image={mockCurrentUser.image}
        badge="Admin"
        onEdit={handleEditPhoto}
      />

      <SettingsSection
        title="Personal Information"
        actions={
          !isEditing && (
            <Button onClick={() => setIsEditing(true)}>Edit</Button>
          )
        }
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className={styles.formItemRow}>
            <div>
              <Typography.Text className={styles.label}>
                First Name
              </Typography.Text>
              <Controller
                name="firstName"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="First name"
                    disabled={!isEditing}
                  />
                )}
              />
            </div>
            <div>
              <Typography.Text className={styles.label}>
                Last Name
              </Typography.Text>
              <Controller
                name="lastName"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="Last name"
                    disabled={!isEditing}
                  />
                )}
              />
            </div>
          </div>

          <div className={styles.formItem}>
            <Typography.Text className={styles.label}>
              Display Name
            </Typography.Text>
            <Controller
              name="displayName"
              control={control}
              rules={{ required: "Display name is required" }}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="Display name"
                  status={errors.displayName ? "error" : undefined}
                  disabled={!isEditing}
                />
              )}
            />
            {errors.displayName && (
              <Typography.Text type="danger">
                {errors.displayName.message}
              </Typography.Text>
            )}
          </div>

          {isEditing && (
            <div className={styles.actions}>
              <Button onClick={handleCancel}>Cancel</Button>
              <Button type="primary" htmlType="submit" disabled={!isDirty}>
                Save Changes
              </Button>
            </div>
          )}
        </form>
      </SettingsSection>

      <SettingsSection title="Email">
        <div className={styles.emailRow}>
          <div className={styles.emailInfo}>
            <Typography.Text strong>{mockCurrentUser.email}</Typography.Text>
            {mockCurrentUser.emailVerified && (
              <span className={styles.verified}>
                <CheckCircleOutlined />
                Verified
              </span>
            )}
          </div>
          <Button onClick={handleChangeEmail}>Change Email</Button>
        </div>
      </SettingsSection>

      <SettingsSection title="Preferences">
        <div className={styles.formItem}>
          <Typography.Text className={styles.label}>Language</Typography.Text>
          <Controller
            name="locale"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                options={localeOptions}
                className={styles.selectFullWidth}
              />
            )}
          />
        </div>

        <div className={styles.formItem}>
          <Typography.Text className={styles.label}>Timezone</Typography.Text>
          <Controller
            name="timezone"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                options={timezoneOptions}
                className={styles.selectFullWidth}
              />
            )}
          />
        </div>

        <div className={styles.formItem}>
          <Typography.Text className={styles.label}>Date Format</Typography.Text>
          <Controller
            name="dateFormat"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                options={dateFormatOptions}
                className={styles.selectFullWidth}
              />
            )}
          />
        </div>
      </SettingsSection>
    </div>
  );
}
