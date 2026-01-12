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
import type { IEditRoleModalPayload } from "../../modals";
import type { IPermission } from "../../mocks/data";

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
  name: string;
  description: string;
  permissions: IPermission[];
}

const resources = ["products", "orders", "inventory", "members", "settings"];

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
      name: role.name,
      description: role.description,
      permissions: role.permissions,
    },
  });

  const permissions = watch("permissions");

  const updatePermission = (
    resource: string,
    field: "read" | "write" | "admin",
    value: boolean
  ) => {
    const newPermissions = permissions.map((p) => {
      if (p.resource === resource) {
        const updated = { ...p, [field]: value };
        // If admin is set, read and write should be set too
        if (field === "admin" && value) {
          updated.read = true;
          updated.write = true;
        }
        // If write is set, read should be set too
        if (field === "write" && value) {
          updated.read = true;
        }
        // If read is unset, write and admin should be unset too
        if (field === "read" && !value) {
          updated.write = false;
          updated.admin = false;
        }
        // If write is unset, admin should be unset too
        if (field === "write" && !value) {
          updated.admin = false;
        }
        return updated;
      }
      return p;
    });
    setValue("permissions", newPermissions);
  };

  const getPermission = (resource: string): IPermission | undefined => {
    return permissions.find((p) => p.resource === resource);
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
          title={`Edit Role: ${role.name}`}
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
              name="name"
              control={control}
              rules={{ required: "Role name is required" }}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="Role name"
                  status={errors.name ? "error" : undefined}
                  disabled={role.isSystem}
                />
              )}
            />
            {errors.name && (
              <Typography.Text className={styles.error}>
                {errors.name.message}
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

          {resources.map((resource) => {
            const perm = getPermission(resource);
            return (
              <>
                <Typography.Text key={resource} className={styles.resourceName}>
                  {resource}
                </Typography.Text>
                <div className={styles.checkboxCell}>
                  <Checkbox
                    checked={perm?.read}
                    onChange={(e) =>
                      updatePermission(resource, "read", e.target.checked)
                    }
                    disabled={role.isSystem}
                  />
                </div>
                <div className={styles.checkboxCell}>
                  <Checkbox
                    checked={perm?.write}
                    onChange={(e) =>
                      updatePermission(resource, "write", e.target.checked)
                    }
                    disabled={role.isSystem}
                  />
                </div>
                <div className={styles.checkboxCell}>
                  <Checkbox
                    checked={perm?.admin}
                    onChange={(e) =>
                      updatePermission(resource, "admin", e.target.checked)
                    }
                    disabled={role.isSystem}
                  />
                </div>
              </>
            );
          })}
        </div>
      </Paper>
    </ModalLayout>
  );
};
