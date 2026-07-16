import { LuCircleCheckBig as CheckCircleFilled, LuEllipsis as MoreOutlined } from "react-icons/lu";
import type { ApiApp } from "@/graphql/types";
import { App as AntApp, Avatar, Button, Card, Dropdown, Flex, Typography } from "antd";
import { createStyles } from "antd-style";
import { useInstallApp } from "../hooks";
import { useUninstallAppModal } from "../modals";

const useStyles = createStyles(
  ({ token }, { installed }: { installed: boolean }) => ({
    card: {
      borderColor: installed ? token.colorPrimary : token.colorBorderSecondary,
      height: "100%",
    },
    body: { padding: token.paddingSM },
    avatar: { background: token.colorFillSecondary, color: token.colorTextSecondary },
    installed: { color: token.colorPrimary },
  }),
);

const getLogoUrl = (app: ApiApp) => {
  const logoUrl = app.meta?.logoUrl;
  return typeof logoUrl === "string" ? logoUrl : undefined;
};

export const AppCard = ({
  app,
  installed,
  onSaved,
}: {
  app: ApiApp;
  installed: boolean;
  onSaved: () => Promise<unknown>;
}) => {
  const { styles } = useStyles({ installed });
  const { message } = AntApp.useApp();
  const installMutation = useInstallApp();
  const uninstallModal = useUninstallAppModal();
  const logoUrl = getLogoUrl(app);

  const install = async () => {
    const result = await installMutation.installApp({ code: app.code });
    if (!result.data) return;
    await onSaved();
    message.success("App installed");
  };

  return (
    <Card className={styles.card} styles={{ body: { padding: 12 } }}>
      <Flex align="center" gap={12} justify="space-between">
        <Flex align="center" gap={12}>
          <Avatar
            className={styles.avatar}
            shape="square"
            size={40}
            src={logoUrl}
          >
            {app.name[0]}
          </Avatar>
          <Flex vertical>
            <Flex align="center" gap={6}>
              <Typography.Text strong>{app.name}</Typography.Text>
              {installed ? (
                <CheckCircleFilled
                  aria-label="installed"
                  className={styles.installed}
                />
              ) : null}
            </Flex>
            <Typography.Text type="secondary">{app.code}</Typography.Text>
          </Flex>
        </Flex>
        <Dropdown
          menu={{
            items: [
              { disabled: true, key: "settings", label: "Settings" },
              installed
                ? {
                    key: "uninstall",
                    label: "Uninstall",
                    onClick: () =>
                      uninstallModal.push({
                        appCode: app.code,
                        appName: app.name,
                        onSaved,
                      }),
                  }
                : {
                    key: "install",
                    label: "Install",
                    onClick: install,
                  },
            ],
          }}
          trigger={["click"]}
        >
          <Button
            aria-label={`${app.name} actions`}
            icon={<MoreOutlined />}
            loading={installMutation.loading}
            type="text"
          />
        </Dropdown>
      </Flex>
    </Card>
  );
};
