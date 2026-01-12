"use client";

import { Typography, Button, List, Tag, message } from "antd";
import { createStyles } from "antd-style";
import {
  LockOutlined,
  SafetyOutlined,
  DesktopOutlined,
  MobileOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { SettingsSection, DangerZone } from "../../shared";
import { mockSessions } from "../../mocks/data";
import { useChangePasswordModal } from "../../modals";

const useStyles = createStyles(({ token }) => ({
  container: {
    maxWidth: 800,
    margin: "0 auto",
    padding: token.paddingLG,
    display: "flex",
    flexDirection: "column",
    gap: token.marginLG,
  },
  passwordRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
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
    justifyContent: "space-between",
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
  signOutAll: {
    marginTop: token.marginMD,
    display: "flex",
    justifyContent: "flex-end",
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

  const formatLastActive = (date: Date) => {
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
    <div className={styles.container}>
      <SettingsSection title="Password">
        <div className={styles.passwordRow}>
          <div className={styles.passwordInfo}>
            <Typography.Text className={styles.passwordDots}>
              ••••••••••••
            </Typography.Text>
            <Typography.Text className={styles.passwordMeta}>
              Last changed: 3 months ago
            </Typography.Text>
          </div>
          <Button onClick={handleChangePassword}>Change Password</Button>
        </div>
      </SettingsSection>

      <SettingsSection title="Two-Factor Authentication">
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
          <Button type="primary" onClick={handleEnable2FA}>
            Enable 2FA
          </Button>
        </div>
      </SettingsSection>

      <SettingsSection title="Active Sessions">
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
        <div className={styles.signOutAll}>
          <Button danger onClick={handleSignOutAll}>
            Sign out all other sessions
          </Button>
        </div>
      </SettingsSection>

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
    </div>
  );
}
