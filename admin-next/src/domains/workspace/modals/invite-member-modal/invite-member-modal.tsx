"use client";

import { useForm, Controller } from "react-hook-form";
import { Input, Typography, App } from "antd";
import { createStyles } from "antd-style";
import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from "@/layouts/modals";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { RoleCard } from "../../organization/page/components/roles-section/role-card";
import { useInviteMember } from "../../hooks";
import type { IInviteMemberModalPayload } from "../../modals";

const useStyles = createStyles(({ token }) => ({
  formItem: {
    marginBottom: token.marginMD,
  },
  label: {
    display: "block",
    marginBottom: token.marginXS,
    fontWeight: 500,
  },
  roleList: {
    display: "flex",
    flexDirection: "column",
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
  const { message } = App.useApp();
  const { payload, pop } = useModalStackContext();
  const typedPayload = payload as IInviteMemberModalPayload;
  const { inviteMember, loading } = useInviteMember();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<IInviteForm>({
    defaultValues: {
      email: "",
      roleId: typedPayload.roles?.[0]?.id || "",
      personalMessage: "",
    },
  });

  const onSubmit = async (values: IInviteForm) => {
    const selectedRole = typedPayload.roles?.find(
      (r) => r.id === values.roleId
    );
    if (!selectedRole) return;

    const { userErrors } = await inviteMember(
      typedPayload.organizationId,
      values.email,
      [{ domain: selectedRole.domain, role: selectedRole.name }]
    );

    if (userErrors.length > 0) {
      userErrors.forEach((err) => message.error(err.message));
      return;
    }

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
            loading,
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
                <div className={styles.roleList}>
                  {typedPayload.roles?.map((role) => (
                    <RoleCard
                      key={role.id}
                      role={role}
                      selected={field.value === role.id}
                      onSelect={() => field.onChange(role.id)}
                    />
                  ))}
                </div>
              )}
            />
          </div>
        </form>
      </Paper>
    </ModalLayout>
  );
};
