"use client";

import { Typography, Button, Tag, App, Dropdown, Spin } from "antd";
import { createStyles } from "antd-style";
import {
  LockOutlined,
  DesktopOutlined,
  MobileOutlined,
  CloseOutlined,
  MoreOutlined,
  CheckCircleOutlined,
  SunOutlined,
  MoonOutlined,
} from "@ant-design/icons";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { SettingsLayout } from "@/domains/workspace/layout";
import { DangerZone } from "@/domains/workspace/shared";
import { useThemeContext } from "@/ui-kit/theme/theme-context";
import { ProfileInfoHeader } from "../components";
import { useSession } from "@/domains/auth";
import {
  useEditProfileModal,
  useChangeEmailModal,
  useChangePasswordModal,
} from "../modals";
import {
  useUpdateProfile,
  useSessions,
  useRevokeSession,
} from "../hooks";
import { LocaleCode, type ApiSession } from "@/graphql/types";
import { MdBrightness4 } from "react-icons/md";

/**
 * Parse user agent string to extract browser, OS, and device type.
 */
function parseUserAgent(userAgent: string | null | undefined): {
  browser: string;
  os: string;
  device: "desktop" | "mobile";
} {
  if (!userAgent) {
    return { browser: "Unknown", os: "Unknown", device: "desktop" };
  }

  // Detect browser
  let browser = "Unknown";
  if (userAgent.includes("Chrome") && !userAgent.includes("Edg")) {
    browser = "Chrome";
  } else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) {
    browser = "Safari";
  } else if (userAgent.includes("Firefox")) {
    browser = "Firefox";
  } else if (userAgent.includes("Edg")) {
    browser = "Edge";
  } else if (userAgent.includes("Opera") || userAgent.includes("OPR")) {
    browser = "Opera";
  }

  // Detect OS
  let os = "Unknown";
  if (userAgent.includes("Windows")) {
    os = "Windows";
  } else if (userAgent.includes("Mac OS X") || userAgent.includes("Macintosh")) {
    os = "macOS";
  } else if (userAgent.includes("Linux") && !userAgent.includes("Android")) {
    os = "Linux";
  } else if (userAgent.includes("Android")) {
    os = "Android";
  } else if (userAgent.includes("iPhone") || userAgent.includes("iPad")) {
    os = "iOS";
  }

  // Detect device type
  const isMobile =
    userAgent.includes("Mobile") ||
    userAgent.includes("Android") ||
    userAgent.includes("iPhone") ||
    userAgent.includes("iPad");

  return { browser, os, device: isMobile ? "mobile" : "desktop" };
}

const useStyles = createStyles(({ token }) => ({
  emailRow: {
    display: "flex",
    alignItems: "center",
  },
  emailInfo: {
    display: "flex",
    alignItems: "center",
    gap: token.marginSM,
  },
  verified: {
    color: token.colorSuccess,
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
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
  themeCards: {
    display: "flex",
    gap: token.margin,
  },
  themeCard: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: token.paddingLG,
    borderRadius: token.borderRadiusLG,
    border: `2px solid ${token.colorBorder}`,
    cursor: "pointer",
    transition: "all 0.2s ease",
    "&:hover": {
      borderColor: token.colorPrimaryHover,
    },
  },
  themeCardSelected: {
    borderColor: token.colorPrimary,
    backgroundColor: token.colorPrimaryBg,
  },
  themeIcon: {
    fontSize: 32,
    marginBottom: token.marginSM,
    color: token.colorTextSecondary,
  },
  themeIconSelected: {
    color: token.colorPrimary,
  },
  themeLabel: {
    fontWeight: 500,
    marginBottom: 4,
  },
  themeDescription: {
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
    textAlign: "center",
  },
}));

export default function ProfilePage() {
  const { styles, cx } = useStyles();
  const { message } = App.useApp();
  const { user, refetch } = useSession();
  const { push: pushEditProfileModal } = useEditProfileModal();
  const { push: pushChangeEmailModal } = useChangeEmailModal();
  const { push: pushChangePasswordModal } = useChangePasswordModal();
  const { themePreference, setThemePreference } = useThemeContext();
  const { updateProfile } = useUpdateProfile();
  const { sessions, loading: sessionsLoading } = useSessions();
  const { revokeSession, revokeAllSessions } = useRevokeSession();

  const handleEditProfile = () => {
    pushEditProfileModal({
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      currentAvatar: user?.avatar?.url ?? null,
      locale: user?.locale || LocaleCode.En,
      onSave: async (values: {
        firstName: string;
        lastName: string;
        avatar: string | null;
        locale: LocaleCode;
      }) => {
        try {
          const result = await updateProfile({
            firstName: values.firstName || undefined,
            lastName: values.lastName || undefined,
            locale: values.locale,
          });

          if (result.userErrors.length > 0) {
            message.error(result.userErrors[0].message);
            return;
          }

          refetch();
          message.success("Profile updated successfully");
        } catch {
          message.error("Failed to update profile");
        }
      },
    });
  };

  const handleChangeEmail = () => {
    pushChangeEmailModal({
      currentEmail: user?.email ?? "",
    });
  };

  const handleChangePassword = () => {
    pushChangePasswordModal({});
  };

  const handleEnable2FA = () => {
    message.info("2FA setup modal would open");
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      const result = await revokeSession(sessionId);
      if (result.userErrors.length > 0) {
        message.error(result.userErrors[0].message);
        return;
      }
      message.success("Session revoked");
    } catch {
      message.error("Failed to revoke session");
    }
  };

  const handleSignOutAll = async () => {
    try {
      const result = await revokeAllSessions();
      if (result.userErrors.length > 0) {
        message.error(result.userErrors[0].message);
        return;
      }
      message.success(`${result.revokedCount} session(s) signed out`);
    } catch {
      message.error("Failed to sign out other sessions");
    }
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
    <SettingsLayout name="profile">
      {user && <ProfileInfoHeader user={user} onEdit={handleEditProfile} />}

      {/* Email Section */}
      <Paper>
        <PaperHeader
          title="Email"
          actions={
            <Dropdown
              menu={{
                items: [{ key: "change", label: "Change email" }],
                onClick: handleChangeEmail,
              }}
              trigger={["click"]}
            >
              <Button size="small" icon={<MoreOutlined />} />
            </Dropdown>
          }
        />
        <div className={styles.emailRow}>
          <div className={styles.emailInfo}>
            <Typography.Text strong>{user?.email}</Typography.Text>
            {user?.emailVerified && (
              <span className={styles.verified}>
                <CheckCircleOutlined />
                Verified
              </span>
            )}
          </div>
        </div>
      </Paper>

      {/* Password Section */}
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
              •••••
            </Typography.Text>
            <Typography.Text className={styles.passwordMeta}>
              Last changed: 3 months ago
            </Typography.Text>
          </div>
        </div>
      </Paper>

      {/* Two-Factor Authentication Section */}
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

      {/* Appearance Section */}
      <Paper>
        <PaperHeader title="Appearance" />
        <div className={styles.themeCards}>
          <div
            className={cx(
              styles.themeCard,
              themePreference === "light" && styles.themeCardSelected
            )}
            onClick={() => setThemePreference("light")}
          >
            <SunOutlined
              className={cx(
                styles.themeIcon,
                themePreference === "light" && styles.themeIconSelected
              )}
            />
            <Typography.Text className={styles.themeLabel}>
              Light
            </Typography.Text>
            <Typography.Text className={styles.themeDescription}>
              Classic light theme
            </Typography.Text>
          </div>
          <div
            className={cx(
              styles.themeCard,
              themePreference === "dark" && styles.themeCardSelected
            )}
            onClick={() => setThemePreference("dark")}
          >
            <MoonOutlined
              className={cx(
                styles.themeIcon,
                themePreference === "dark" && styles.themeIconSelected
              )}
            />
            <Typography.Text className={styles.themeLabel}>
              Dark
            </Typography.Text>
            <Typography.Text className={styles.themeDescription}>
              Easy on the eyes
            </Typography.Text>
          </div>
          <div
            className={cx(
              styles.themeCard,
              themePreference === "auto" && styles.themeCardSelected
            )}
            onClick={() => setThemePreference("auto")}
          >
            <MdBrightness4
              className={cx(
                styles.themeIcon,
                themePreference === "auto" && styles.themeIconSelected
              )}
            />
            <Typography.Text className={styles.themeLabel}>
              Auto
            </Typography.Text>
            <Typography.Text className={styles.themeDescription}>
              Match system settings
            </Typography.Text>
          </div>
        </div>
      </Paper>

      {/* Active Sessions Section */}
      <Paper>
        <PaperHeader
          title="Active Sessions"
          actions={
            <Dropdown
              menu={{
                items: [
                  {
                    key: "signout-all",
                    label: "Sign out all other sessions",
                    danger: true,
                  },
                ],
                onClick: handleSignOutAll,
              }}
              trigger={["click"]}
            >
              <Button size="small" icon={<MoreOutlined />} />
            </Dropdown>
          }
        />
        {sessionsLoading ? (
          <div style={{ textAlign: "center", padding: 24 }}>
            <Spin />
          </div>
        ) : sessions.length === 0 ? (
          <Typography.Text type="secondary">No active sessions</Typography.Text>
        ) : (
          sessions.map((session) => {
            const { browser, os, device } = parseUserAgent(session.userAgent);
            return (
              <div key={session.id} className={styles.sessionItem}>
                <div className={styles.sessionInfo}>
                  {device === "desktop" ? (
                    <DesktopOutlined className={styles.sessionIcon} />
                  ) : (
                    <MobileOutlined className={styles.sessionIcon} />
                  )}
                  <div className={styles.sessionDetails}>
                    <Typography.Text className={styles.sessionDevice}>
                      {browser} on {os}
                      {session.isCurrent && (
                        <Tag color="blue" style={{ marginLeft: 8 }}>
                          Current session
                        </Tag>
                      )}
                    </Typography.Text>
                    <Typography.Text className={styles.sessionMeta}>
                      {session.ipAddress || "Unknown IP"} · Last active:{" "}
                      {formatLastActive(session.updatedAt)}
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
            );
          })
        )}
      </Paper>

      {/* Danger Zone */}
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
    </SettingsLayout>
  );
}
