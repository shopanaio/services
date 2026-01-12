"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { Input, Typography, Button, message } from "antd";
import { createStyles } from "antd-style";
import { WarningOutlined } from "@ant-design/icons";
import { PreviewCard, SettingsSection, DangerZone } from "../../shared";
import { mockOrganization } from "../../mocks/data";
import { useDeleteOrganizationModal } from "../../modals";

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
  label: {
    display: "block",
    marginBottom: token.marginXS,
    fontWeight: 500,
  },
  warning: {
    display: "flex",
    alignItems: "center",
    gap: token.marginXS,
    color: token.colorWarning,
    fontSize: token.fontSizeSM,
    marginTop: token.marginXS,
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: token.marginSM,
    marginTop: token.marginMD,
    paddingTop: token.paddingMD,
    borderTop: `1px solid ${token.colorBorderSecondary}`,
  },
}));

interface IOrganizationForm {
  displayName: string;
  slug: string;
}

export default function OrganizationPage() {
  const { styles } = useStyles();
  const [isEditing, setIsEditing] = useState(false);
  const { push: pushDeleteModal } = useDeleteOrganizationModal();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<IOrganizationForm>({
    defaultValues: {
      displayName: mockOrganization.displayName,
      slug: mockOrganization.name,
    },
  });

  const onSubmit = (values: IOrganizationForm) => {
    console.log("Saving organization:", values);
    message.success("Organization updated successfully");
    setIsEditing(false);
  };

  const handleCancel = () => {
    reset();
    setIsEditing(false);
  };

  const handleTransferOwnership = () => {
    message.info("Transfer ownership modal would open");
  };

  const handleDeleteOrganization = () => {
    pushDeleteModal({
      organizationName: mockOrganization.displayName,
      organizationSlug: mockOrganization.name,
      onDelete: () => {
        message.success("Organization deleted (mock)");
      },
    });
  };

  return (
    <div className={styles.container}>
      <PreviewCard
        type="organization"
        name={mockOrganization.displayName}
        subtitle={mockOrganization.name}
        meta={`ID: ${mockOrganization.id}`}
        image={undefined}
        onEdit={() => setIsEditing(true)}
      />

      <SettingsSection title="General Information">
        <form onSubmit={handleSubmit(onSubmit)}>
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
                  placeholder="Organization name"
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

          <div className={styles.formItem}>
            <Typography.Text className={styles.label}>
              Organization Slug
            </Typography.Text>
            <Controller
              name="slug"
              control={control}
              rules={{
                required: "Slug is required",
                pattern: {
                  value: /^[a-z0-9-]+$/,
                  message:
                    "Only lowercase letters, numbers, and hyphens allowed",
                },
              }}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="organization-slug"
                  status={errors.slug ? "error" : undefined}
                  disabled={!isEditing}
                />
              )}
            />
            {errors.slug ? (
              <Typography.Text type="danger">
                {errors.slug.message}
              </Typography.Text>
            ) : (
              isEditing && (
                <div className={styles.warning}>
                  <WarningOutlined />
                  <span>Changing slug will break existing links</span>
                </div>
              )
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

      <DangerZone
        items={[
          {
            title: "Transfer Ownership",
            description: "Transfer this organization to another admin",
            buttonText: "Transfer...",
            onClick: handleTransferOwnership,
          },
          {
            title: "Delete Organization",
            description: "Permanently delete this organization and all its data",
            buttonText: "Delete...",
            onClick: handleDeleteOrganization,
          },
        ]}
      />
    </div>
  );
}
