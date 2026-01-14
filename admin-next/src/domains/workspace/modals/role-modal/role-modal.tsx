"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import {
  Input,
  Typography,
  message,
  Alert,
  Spin,
  Tag,
  Flex,
  Tooltip,
  Divider,
} from "antd";
import {
  LockOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { createStyles } from "antd-style";
import { slugify } from "transliteration/dist/node/src/node/index.js";
import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from "@/layouts/modals";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { PermissionMatrix, PermissionPresets } from "./components";
import {
  buildPermissionCategories,
  getAllResourceNames,
  getDefaultPermissions,
  PERMISSION_PRESETS,
} from "./constants";
import {
  toApiPermissions,
  fromApiPermissions,
  type FormPermission,
} from "./types";
import type { IRoleModalPayload } from "../../modals";

const useStyles = createStyles(({ token }) => ({
  formItem: {
    marginBottom: token.marginMD,
  },
  label: {
    display: "block",
    marginBottom: token.marginXS,
    fontWeight: 500,
  },
  labelWithTooltip: {
    display: "flex",
    alignItems: "center",
    gap: token.marginXS,
    marginBottom: token.marginXS,
  },
  error: {
    color: token.colorError,
    fontSize: token.fontSizeSM,
    marginTop: token.marginXS,
  },
  modeIndicator: {
    display: "flex",
    alignItems: "center",
    gap: token.marginXS,
  },

  nameSlugContainer: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: token.marginMD,
  },
  slugPreview: {
    fontSize: token.fontSizeSM,
    color: token.colorTextSecondary,
    marginTop: token.marginXS,
  },
  headerExtra: {
    display: "flex",
    alignItems: "center",
    gap: token.marginSM,
  },
}));

interface IRoleForm {
  displayName: string;
  name: string;
  description: string;
}

export const RoleModal = () => {
  const { styles } = useStyles();
  const { payload, pop } = useModalStackContext();
  const typedPayload = payload as IRoleModalPayload;

  const {
    mode,
    role,
    organizationId,
    domain = "org",
    availableResources,
  } = typedPayload;
  const isViewMode = mode === "view";
  const isEditMode = mode === "edit";
  const isCreateMode = mode === "create";
  const isSystemRole = role?.isSystem ?? false;
  const isReadOnly = isViewMode || isSystemRole;

  const [loading, setLoading] = useState(false);

  // Build categories and resource names from API data
  const permissionCategories = useMemo(
    () => buildPermissionCategories(availableResources),
    [availableResources]
  );
  const allResourceNames = useMemo(
    () => getAllResourceNames(availableResources),
    [availableResources]
  );

  // Initialize permissions state
  const initialPermissions = useMemo(() => {
    if (role) {
      return fromApiPermissions(role, allResourceNames);
    }
    // For create mode, start with viewer preset
    return (
      PERMISSION_PRESETS.find((p) => p.id === "viewer")?.getPermissions(
        allResourceNames
      ) ?? getDefaultPermissions(allResourceNames)
    );
  }, [role, allResourceNames]);

  const [permissions, setPermissions] =
    useState<FormPermission[]>(initialPermissions);
  const [isNameManual, setIsNameManual] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<IRoleForm>({
    defaultValues: {
      displayName: role?.displayName ?? "",
      name: role?.name ?? "",
      description: role?.description ?? "",
    },
  });

  const displayName = watch("displayName");

  // Auto-generate name from displayName (unless manually edited)
  useEffect(() => {
    if (isCreateMode && !isNameManual && displayName) {
      setValue("name", slugify(displayName));
    }
  }, [displayName, isCreateMode, isNameManual, setValue]);

  const handlePermissionsChange = useCallback(
    (newPermissions: FormPermission[]) => {
      setPermissions(newPermissions);
    },
    []
  );

  const onSubmit = async (values: IRoleForm) => {
    if (isViewMode) return;

    setLoading(true);
    try {
      const apiPermissions = toApiPermissions(permissions);

      if (isCreateMode && typedPayload.onCreate) {
        await typedPayload.onCreate({
          name: values.name,
          displayName: values.displayName,
          description: values.description || undefined,
          permissions: apiPermissions,
          organizationId,
          domain,
        });
        message.success(`Role "${values.displayName}" created successfully`);
      } else if (isEditMode && typedPayload.onUpdate) {
        await typedPayload.onUpdate({
          displayName: values.displayName,
          description: values.description || undefined,
          permissions: apiPermissions,
        });
        message.success(`Role "${values.displayName}" updated successfully`);
      }
      pop();
    } catch {
      message.error("Failed to save role. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getModeIcon = () => {
    if (isViewMode) return <EyeOutlined />;
    if (isEditMode) return <EditOutlined />;
    return <PlusOutlined />;
  };

  const getModeTitle = () => {
    if (isViewMode) return `View Role: ${role?.displayName}`;
    if (isEditMode) return `Edit Role: ${role?.displayName}`;
    return "Create New Role";
  };

  const getModeTag = () => {
    if (isSystemRole) {
      return (
        <Tag color="purple" icon={<LockOutlined />}>
          System Role
        </Tag>
      );
    }
    if (isViewMode) return <Tag color="blue">View Only</Tag>;
    if (isEditMode) return <Tag color="orange">Editing</Tag>;
    return <Tag color="green">New</Tag>;
  };

  return (
    <ModalLayout
      name="role-modal"
      header={
        <ModalHeader
          name="role-modal"
          title={
            <Flex align="center" gap={8}>
              {getModeIcon()}
              <span>{getModeTitle()}</span>
            </Flex>
          }
          rawTitle
          onClose={pop}
          extra={getModeTag()}
          submitButtonProps={
            isReadOnly
              ? null
              : {
                  onClick: handleSubmit(onSubmit),
                  loading,
                  children: isCreateMode ? "Create Role" : "Save Changes",
                }
          }
        />
      }
    >
      <Spin spinning={loading}>
        <Flex vertical gap={12}>
          {isSystemRole && (
            <Alert
              type="info"
              icon={<LockOutlined />}
              title="System Role"
              description="This is a system-defined role and cannot be modified."
              showIcon
            />
          )}

          <Paper>
            <PaperHeader title="Role Details" />
            <form>
              <div
                className={isCreateMode ? styles.nameSlugContainer : undefined}
              >
                <div className={styles.formItem}>
                  <div className={styles.labelWithTooltip}>
                    <Typography.Text
                      className={styles.label}
                      style={{ marginBottom: 0 }}
                    >
                      Display Name
                    </Typography.Text>
                    <Tooltip title="The name shown to users in the interface">
                      <InfoCircleOutlined
                        style={{ color: "rgba(0,0,0,0.45)" }}
                      />
                    </Tooltip>
                  </div>
                  <Controller
                    name="displayName"
                    control={control}
                    rules={{
                      required: "Display name is required",
                      minLength: {
                        value: 2,
                        message: "Display name must be at least 2 characters",
                      },
                      maxLength: {
                        value: 50,
                        message: "Display name must be less than 50 characters",
                      },
                    }}
                    render={({ field }) => (
                      <Input
                        {...field}
                        placeholder="e.g., Store Manager"
                        status={errors.displayName ? "error" : undefined}
                        disabled={isReadOnly}
                      />
                    )}
                  />
                  {errors.displayName && (
                    <Typography.Text className={styles.error}>
                      {errors.displayName.message}
                    </Typography.Text>
                  )}
                </div>

                {isCreateMode && (
                  <div className={styles.formItem}>
                    <div className={styles.labelWithTooltip}>
                      <Typography.Text
                        className={styles.label}
                        style={{ marginBottom: 0 }}
                      >
                        Role Identifier
                      </Typography.Text>
                      <Tooltip title="Unique identifier used in the system (auto-generated)">
                        <InfoCircleOutlined
                          style={{ color: "rgba(0,0,0,0.45)" }}
                        />
                      </Tooltip>
                    </div>
                    <Controller
                      name="name"
                      control={control}
                      rules={{
                        required: "Role identifier is required",
                        pattern: {
                          value: /^[a-z0-9-]+$/,
                          message:
                            "Only lowercase letters, numbers, and hyphens allowed",
                        },
                        minLength: {
                          value: 2,
                          message: "Identifier must be at least 2 characters",
                        },
                      }}
                      render={({ field }) => (
                        <Input
                          {...field}
                          placeholder="e.g., store-manager"
                          status={errors.name ? "error" : undefined}
                          disabled={isReadOnly}
                          onChange={(e) => {
                            const value = slugify(e.target.value);
                            setIsNameManual(true);
                            field.onChange(value);
                          }}
                        />
                      )}
                    />
                    {errors.name && (
                      <Typography.Text className={styles.error}>
                        {errors.name.message}
                      </Typography.Text>
                    )}
                  </div>
                )}
              </div>

              <div className={styles.formItem}>
                <div className={styles.labelWithTooltip}>
                  <Typography.Text
                    className={styles.label}
                    style={{ marginBottom: 0 }}
                  >
                    Description
                  </Typography.Text>
                  <Tooltip title="Explain the purpose of this role and who should have it">
                    <InfoCircleOutlined style={{ color: "rgba(0,0,0,0.45)" }} />
                  </Tooltip>
                </div>
                <Controller
                  name="description"
                  control={control}
                  rules={{
                    maxLength: {
                      value: 200,
                      message: "Description must be less than 200 characters",
                    },
                  }}
                  render={({ field }) => (
                    <Input.TextArea
                      {...field}
                      placeholder="Describe what this role is for..."
                      rows={2}
                      disabled={isReadOnly}
                      showCount
                      maxLength={200}
                    />
                  )}
                />
                {errors.description && (
                  <Typography.Text className={styles.error}>
                    {errors.description.message}
                  </Typography.Text>
                )}
              </div>
            </form>
          </Paper>

          <Paper>
            <PaperHeader
              title={
                <Flex vertical>
                  <Typography.Text strong style={{ fontSize: 16 }}>
                    Permissions
                  </Typography.Text>
                  <Typography.Text type="secondary">
                    Define what actions users with this role can perform
                  </Typography.Text>
                </Flex>
              }
            />
            {!isReadOnly && (
              <>
                <PermissionPresets
                  resources={allResourceNames}
                  permissions={permissions}
                  onChange={handlePermissionsChange}
                  disabled={isReadOnly}
                />
                <Divider />
              </>
            )}
            <PermissionMatrix
              categories={permissionCategories}
              permissions={permissions}
              onChange={handlePermissionsChange}
              disabled={isReadOnly}
            />
          </Paper>
        </Flex>
      </Spin>
    </ModalLayout>
  );
};
