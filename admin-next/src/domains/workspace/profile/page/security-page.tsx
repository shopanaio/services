"use client";

import { Typography, Button, Tag, message, Dropdown } from "antd";
import { createStyles } from "antd-style";
import {
  LockOutlined,
  DesktopOutlined,
  MobileOutlined,
  CloseOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { DangerZone, PageLayout } from "../../shared";
import { mockSessions } from "../../mocks/data";
import { useChangePasswordModal } from "../../modals";

const useStyles = createStyles(({ token }) => ({
  passwordRow: {
    display: "flex",
    alignItems: "center",
  },
  passwordInfo: {
    display: "flex",
    flexDirection: "column",
  },
  passwordDots: {
    fontSize: token.fontSizeLG,
    letterSpacing: 2,
  },
  passwordMeta: {
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
  },
  twoFactorRow: {
    display: "flex",
    alignItems: "center",
  },
  twoFactorInfo: {
    display: "flex",
    alignItems: "center",
    gap: token.marginSM,
  },
  twoFactorIcon: {
    fontSize: 24,
    color: token.colorTextSecondary,
  },
  sessionItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: `${token.paddingSM}px ${token.padding}px`,
    backgroundColor: token.colorBgLayout,
    borderRadius: token.borderRadius,
    marginBottom: token.marginSM,
  },
  sessionInfo: {
    display: "flex",
    alignItems: "center",
    gap: token.marginSM,
  },
  sessionIcon: {
    fontSize: 20,
    color: token.colorTextSecondary,
  },
  sessionDetails: {
    display: "flex",
    flexDirection: "column",
  },
  sessionDevice: {
    fontWeight: 500,
  },
  sessionMeta: {
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
  },
}));

export default function SecurityPage() {
  const { styles } = useStyles();
  const { push: pushChangePasswordModal } = useChangePasswordModal();

  const handleChangePassword = () => {
    pushChangePasswordModal({
      onSave: (currentPassword: string, newPassword: string) => {
        message.success("Password updated (mock)");
      },
    });
  };

  const handleEnable2FA = () => {
    message.info("2FA setup modal would open");
  };

  const handleRevokeSession = (sessionId: string) => {
    message.success("Session revoked");
  };

  const handleSignOutAll = () => {
    message.success("All other sessions signed out");
  };

  const handleDeleteAccount = () => {
    message.info("Delete account modal would open");
  };

  const formatLastActive = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} minutes ago`;
    if (hours < 24) return `${hours} hours ago`;
    return date.toLocaleDateString();
  };

  return (
    <PageLayout>
      <Paper>
        <PaperHeader
          title="Password"
          actions={
            <Dropdown
              menu={{
                items: [{ key: "change", label: "Change password" }],
                onClick: handleChangePassword,
              }}
              trigger={["click"]}
            >
              <Button size="small" icon={<MoreOutlined />} />
            </Dropdown>
          }
        />
        <div className={styles.passwordRow}>
          <div className={styles.passwordInfo}>
            <Typography.Text className={styles.passwordDots}>
              ••••••••••••
            </Typography.Text>
            <Typography.Text className={styles.passwordMeta}>
              Last changed: 3 months ago
            </Typography.Text>
          </div>
        </div>
      </Paper>

      <Paper>
        <PaperHeader
          title="Two-Factor Authentication"
          actions={
            <Dropdown
              menu={{
                items: [{ key: "enable", label: "Enable 2FA" }],
                onClick: handleEnable2FA,
              }}
              trigger={["click"]}
            >
              <Button size="small" icon={<MoreOutlined />} />
            </Dropdown>
          }
        />
        <div className={styles.twoFactorRow}>
          <div className={styles.twoFactorInfo}>
            <LockOutlined className={styles.twoFactorIcon} />
            <div>
              <Typography.Text strong>Not enabled</Typography.Text>
              <br />
              <Typography.Text type="secondary">
                Add an extra layer of security to your account
              </Typography.Text>
            </div>
          </div>
        </div>
      </Paper>

      <Paper>
        <PaperHeader
          title="Active Sessions"
          actions={
            <Dropdown
              menu={{
                items: [{ key: "signout-all", label: "Sign out all other sessions", danger: true }],
                onClick: handleSignOutAll,
              }}
              trigger={["click"]}
            >
              <Button size="small" icon={<MoreOutlined />} />
            </Dropdown>
          }
        />
        {mockSessions.map((session) => (
          <div key={session.id} className={styles.sessionItem}>
            <div className={styles.sessionInfo}>
              {session.device === "desktop" ? (
                <DesktopOutlined className={styles.sessionIcon} />
              ) : (
                <MobileOutlined className={styles.sessionIcon} />
              )}
              <div className={styles.sessionDetails}>
                <Typography.Text className={styles.sessionDevice}>
                  {session.browser} on {session.os}
                  {session.isCurrent && (
                    <Tag color="blue" style={{ marginLeft: 8 }}>
                      Current session
                    </Tag>
                  )}
                </Typography.Text>
                <Typography.Text className={styles.sessionMeta}>
                  {session.location} · Last active:{" "}
                  {formatLastActive(session.lastActive)}
                </Typography.Text>
              </div>
            </div>
            {!session.isCurrent && (
              <Button
                danger
                size="small"
                icon={<CloseOutlined />}
                onClick={() => handleRevokeSession(session.id)}
              >
                Revoke
              </Button>
            )}
          </div>
        ))}
      </Paper>

      <DangerZone
        items={[
          {
            title: "Delete Account",
            description: "Permanently delete your account and all your data",
            buttonText: "Delete Account",
            onClick: handleDeleteAccount,
          },
        ]}
      />
    </PageLayout>
  );
}
