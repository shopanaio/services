import { EditOutlined } from "@ant-design/icons";
import { Button, Flex, Input, Typography } from "antd";
import { createStyles } from "antd-style";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { useEditEmailSettingsModal } from "../../email/modals";
import type { EmailSettings } from "../../email/types";

const useStyles = createStyles(({ token }) => ({
  fields: {
    display: "grid",
    gap: token.margin,
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
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

export const EmailInformation = ({
  settings,
  onSaved,
}: {
  settings: EmailSettings;
  onSaved: () => Promise<unknown>;
}) => {
  const { styles } = useStyles();
  const modal = useEditEmailSettingsModal();

  return (
    <Paper data-testid="email-information-section">
      <PaperHeader
        title="Email information"
        actions={
          <Button
            aria-label="Edit email information"
            icon={<EditOutlined />}
            onClick={() => modal.push({ settings, onSaved })}
            size="small"
            type="text"
          />
        }
      />
      <div className={styles.fields}>
        <Flex className={styles.field} vertical>
          <Typography.Text className={styles.label}>From</Typography.Text>
          <Input readOnly value={settings.from} />
        </Flex>
        <Flex className={styles.field} vertical>
          <Typography.Text className={styles.label}>Reply to</Typography.Text>
          <Input readOnly value={settings.replyTo} />
        </Flex>
      </div>
    </Paper>
  );
};
