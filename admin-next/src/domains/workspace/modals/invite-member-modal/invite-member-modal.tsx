"use client";

import { useForm, Controller } from "react-hook-form";
import { Input, Typography, Radio, Space, message } from "antd";
import { createStyles } from "antd-style";
import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from "@/layouts/modals";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import type { IInviteMemberModalPayload } from "../../modals";

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
  roleOption: {
    display: "flex",
    flexDirection: "column",
    padding: `${token.paddingSM}px 0`,
  },
  roleName: {
    fontWeight: 500,
  },
  roleDescription: {
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
  },
  error: {
    color: token.colorError,
    fontSize: token.fontSizeSM,
    marginTop: token.marginXS,
  },
}));

interface IInviteForm {
  email: string;
  roleId: string;
  personalMessage: string;
}

export const InviteMemberModal = () => {
  const { styles } = useStyles();
  const { payload, pop } = useModalStackContext();
  const typedPayload = payload as IInviteMemberModalPayload;

  // Filter out Owner role - can't invite as owner
  const invitableRoles = (typedPayload.roles ?? []).filter(
    (role) => role.name !== "owner"
  );

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<IInviteForm>({
    defaultValues: {
      email: "",
      roleId: invitableRoles[0]?.id || "",
      personalMessage: "",
    },
  });

  const onSubmit = (values: IInviteForm) => {
    typedPayload.onInvite?.(values.email, values.roleId);
    message.success(`Invitation sent to ${values.email}`);
    pop();
  };

  return (
    <ModalLayout
      name="invite-member"
      header={
        <ModalHeader
          name="invite-member"
          title="Invite Team Member"
          onClose={pop}
          submitButtonProps={{
            onClick: handleSubmit(onSubmit),
            children: "Send Invitation",
          }}
        />
      }
    >
      <Paper>
        <PaperHeader title="Invitation Details" />
        <form>
          <div className={styles.formItem}>
            <Typography.Text className={styles.label}>
              Email Address
            </Typography.Text>
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
                  placeholder="email@example.com"
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
            <Typography.Text className={styles.label}>Role</Typography.Text>
            <Controller
              name="roleId"
              control={control}
              rules={{ required: "Please select a role" }}
              render={({ field }) => (
                <Radio.Group {...field}>
                  <Space direction="vertical" style={{ width: "100%" }}>
                    {invitableRoles.map((role) => (
                      <Radio key={role.id} value={role.id}>
                        <div className={styles.roleOption}>
                          <Typography.Text className={styles.roleName}>
                            {role.displayName}
                          </Typography.Text>
                          <Typography.Text className={styles.roleDescription}>
                            {role.description}
                          </Typography.Text>
                        </div>
                      </Radio>
                    ))}
                  </Space>
                </Radio.Group>
              )}
            />
          </div>
        </form>
      </Paper>
    </ModalLayout>
  );
};
