import { LuPencil as EditOutlined } from "react-icons/lu";
import { Button, Input, Typography } from "antd";
import { createStyles } from "antd-style";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { useEditSmtpProfileModal } from "../../email/modals";
import type { SmtpProfile } from "../../email/types";

const useStyles = createStyles(({ token }) => ({
  fields: {
    display: "grid",
    gap: token.margin,
    gridTemplateColumns: "minmax(0, 1fr) 120px",
    [`@media (max-width: ${token.screenSM}px)`]: {
      gridTemplateColumns: "1fr",
    },
  },
  credentials: {
    display: "grid",
    gap: token.margin,
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    marginTop: token.margin,
    [`@media (max-width: ${token.screenSM}px)`]: {
      gridTemplateColumns: "1fr",
    },
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: token.marginXXS,
  },
  label: {
    color: token.colorTextSecondary,
  },
}));

export const SmtpSettings = ({
  profile,
  onSaved,
}: {
  profile: SmtpProfile;
  onSaved: () => Promise<unknown>;
}) => {
  const { styles } = useStyles();
  const modal = useEditSmtpProfileModal();

  return (
    <Paper data-testid="smtp-settings-section">
      <PaperHeader
        title="SMTP settings"
        actions={
          <Button
            aria-label="Edit SMTP settings"
            icon={<EditOutlined />}
            onClick={() => modal.push({ profile, onSaved })}
            size="small"
            type="text"
          />
        }
      />
      <div className={styles.fields}>
        <div className={styles.field}>
          <Typography.Text className={styles.label}>SMTP host</Typography.Text>
          <Input readOnly value={profile.host} />
        </div>
        <div className={styles.field}>
          <Typography.Text className={styles.label}>Port</Typography.Text>
          <Input readOnly type="number" value={profile.port} />
        </div>
      </div>
      <div className={styles.credentials}>
        <div className={styles.field}>
          <Typography.Text className={styles.label}>Username</Typography.Text>
          <Input readOnly value={profile.username} />
        </div>
        <div className={styles.field}>
          <Typography.Text className={styles.label}>Password</Typography.Text>
          <Input.Password disabled readOnly value="" />
        </div>
      </div>
    </Paper>
  );
};
