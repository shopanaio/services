"use client";

import { useForm, Controller } from "react-hook-form";
import { Input, Typography, Checkbox, message } from "antd";
import { createStyles } from "antd-style";
import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from "@/layouts/modals";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import type { ApiRolePermission } from "@/graphql/types";
import type { IEditRoleModalPayload } from "../../modals";

const useStyles = createStyles(({ token }) => ({
  formItem: {
    marginBottom: token.marginMD,
  },
  label: {
    display: "block",
    marginBottom: token.marginXS,
    fontWeight: 500,
  },
  permissionsGrid: {
    display: "grid",
    gridTemplateColumns: "150px repeat(3, 80px)",
    gap: token.marginXS,
    alignItems: "center",
  },
  permissionsHeader: {
    fontWeight: 600,
    fontSize: token.fontSizeSM,
    color: token.colorTextSecondary,
    textTransform: "uppercase",
  },
  resourceName: {
    fontWeight: 500,
    textTransform: "capitalize",
  },
  checkboxCell: {
    display: "flex",
    justifyContent: "center",
  },
  error: {
    color: token.colorError,
    fontSize: token.fontSizeSM,
    marginTop: token.marginXS,
  },
}));

interface IEditRoleForm {
  displayName: string;
  description: string;
  permissions: ApiRolePermission[];
}

const resources = [
  "org.profile",
  "org.members",
  "store.products",
  "store.orders",
  "store.inventory",
];

const resourceDisplayNames: Record<string, string> = {
  "org.profile": "Organization",
  "org.members": "Members",
  "store.products": "Products",
  "store.orders": "Orders",
  "store.inventory": "Inventory",
};

export const EditRoleModal = () => {
  const { styles } = useStyles();
  const { payload, pop } = useModalStackContext();
  const typedPayload = payload as IEditRoleModalPayload;
  const { role } = typedPayload;

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<IEditRoleForm>({
    defaultValues: {
      displayName: role.displayName,
      description: role.description || "",
      permissions: role.permissions,
    },
  });

  const permissions = watch("permissions");

  const hasAction = (resource: string, action: string): boolean => {
    const perm = permissions.find((p) => p.resource === resource);
    return perm?.actions.includes(action) ?? false;
  };

  const updatePermission = (
    resource: string,
    action: "read" | "write" | "admin",
    value: boolean
  ) => {
    const newPermissions = permissions.map((p) => {
      if (p.resource === resource) {
        let newActions = [...p.actions];

        if (value) {
          // Add the action
          if (!newActions.includes(action)) {
            newActions.push(action);
          }
          // If admin is set, read and write should be set too
          if (action === "admin") {
            if (!newActions.includes("read")) newActions.push("read");
            if (!newActions.includes("write")) newActions.push("write");
          }
          // If write is set, read should be set too
          if (action === "write" && !newActions.includes("read")) {
            newActions.push("read");
          }
        } else {
          // Remove the action
          newActions = newActions.filter((a) => a !== action);
          // If read is unset, write and admin should be unset too
          if (action === "read") {
            newActions = newActions.filter((a) => a !== "write" && a !== "admin");
          }
          // If write is unset, admin should be unset too
          if (action === "write") {
            newActions = newActions.filter((a) => a !== "admin");
          }
        }

        return { ...p, actions: newActions };
      }
      return p;
    });
    setValue("permissions", newPermissions);
  };

  const onSubmit = (values: IEditRoleForm) => {
    typedPayload.onSave?.(values);
    message.success("Role updated successfully");
    pop();
  };

  return (
    <ModalLayout
      name="edit-role"
      header={
        <ModalHeader
          name="edit-role"
          title={`Edit Role: ${role.displayName}`}
          onClose={pop}
          submitButtonProps={{
            onClick: handleSubmit(onSubmit),
          }}
        />
      }
    >
      <Paper>
        <PaperHeader title="Role Details" />
        <form>
          <div className={styles.formItem}>
            <Typography.Text className={styles.label}>Role Name</Typography.Text>
            <Controller
              name="displayName"
              control={control}
              rules={{ required: "Role name is required" }}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="Role name"
                  status={errors.displayName ? "error" : undefined}
                  disabled={role.isSystem}
                />
              )}
            />
            {errors.displayName && (
              <Typography.Text className={styles.error}>
                {errors.displayName.message}
              </Typography.Text>
            )}
          </div>

          <div className={styles.formItem}>
            <Typography.Text className={styles.label}>Description</Typography.Text>
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="Role description"
                  disabled={role.isSystem}
                />
              )}
            />
          </div>
        </form>
      </Paper>

      <Paper>
        <PaperHeader title="Permissions" />
        <div className={styles.permissionsGrid}>
          <div className={styles.permissionsHeader}></div>
          <div className={styles.permissionsHeader}>Read</div>
          <div className={styles.permissionsHeader}>Write</div>
          <div className={styles.permissionsHeader}>Admin</div>

          {resources.map((resource) => (
            <>
              <Typography.Text key={resource} className={styles.resourceName}>
                {resourceDisplayNames[resource] || resource}
              </Typography.Text>
              <div className={styles.checkboxCell}>
                <Checkbox
                  checked={hasAction(resource, "read")}
                  onChange={(e) =>
                    updatePermission(resource, "read", e.target.checked)
                  }
                  disabled={role.isSystem}
                />
              </div>
              <div className={styles.checkboxCell}>
                <Checkbox
                  checked={hasAction(resource, "write")}
                  onChange={(e) =>
                    updatePermission(resource, "write", e.target.checked)
                  }
                  disabled={role.isSystem}
                />
              </div>
              <div className={styles.checkboxCell}>
                <Checkbox
                  checked={hasAction(resource, "admin")}
                  onChange={(e) =>
                    updatePermission(resource, "admin", e.target.checked)
                  }
                  disabled={role.isSystem}
                />
              </div>
            </>
          ))}
        </div>
      </Paper>
    </ModalLayout>
  );
};
