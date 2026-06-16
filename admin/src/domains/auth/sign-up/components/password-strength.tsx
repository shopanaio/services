"use client";

import { useMemo } from "react";
import { Typography, Progress, Flex } from "antd";
import { CheckOutlined, CloseOutlined } from "@ant-design/icons";
import { createStyles } from "antd-style";

const useStyles = createStyles(({ token }) => ({
  container: {
    marginTop: token.marginSM,
    marginBottom: token.marginMD,
  },
  header: {
    marginBottom: token.marginXS,
  },
  label: {
    fontSize: token.fontSizeSM,
  },
  requirements: {
    listStyle: "none",
    padding: 0,
    margin: `${token.marginSM}px 0 0 0`,
  },
  requirement: {
    display: "flex",
    alignItems: "center",
    gap: token.marginXS,
    marginBottom: token.marginXS / 2,
    fontSize: token.fontSizeSM,
  },
  iconMet: {
    color: token.colorSuccess,
    fontSize: token.fontSizeSM,
  },
  iconUnmet: {
    color: token.colorTextQuaternary,
    fontSize: token.fontSizeSM,
  },
  textMet: {
    color: token.colorText,
  },
  textUnmet: {
    color: token.colorTextSecondary,
  },
}));

interface PasswordStrengthProps {
  password: string;
  showRequirements?: boolean;
}

interface Requirement {
  label: string;
  test: (password: string) => boolean;
}

const REQUIREMENTS: Requirement[] = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "Contains uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { label: "Contains lowercase letter", test: (p) => /[a-z]/.test(p) },
  { label: "Contains a number", test: (p) => /[0-9]/.test(p) },
  {
    label: "Contains special character",
    test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p),
  },
];

/**
 * Password strength indicator component.
 * Shows a progress bar and optional requirements list.
 */
export function PasswordStrength({
  password,
  showRequirements = true,
}: PasswordStrengthProps) {
  const { styles } = useStyles();

  const { score, requirements } = useMemo(() => {
    const reqs = REQUIREMENTS.map((req) => ({
      ...req,
      met: req.test(password),
    }));
    const metCount = reqs.filter((r) => r.met).length;
    return {
      score: (metCount / REQUIREMENTS.length) * 100,
      requirements: reqs,
    };
  }, [password]);

  const strengthLevel = useMemo(() => {
    if (score === 0) return { label: "", color: "#d9d9d9" };
    if (score <= 40) return { label: "Weak", color: "#ff4d4f" };
    if (score <= 60) return { label: "Fair", color: "#faad14" };
    if (score <= 80) return { label: "Good", color: "#1890ff" };
    return { label: "Strong", color: "#52c41a" };
  }, [score]);

  return (
    <div className={styles.container}>
      {password && (
        <>
          <Flex justify="space-between" align="center" className={styles.header}>
            <Typography.Text type="secondary" className={styles.label}>
              Password strength
            </Typography.Text>
            <Typography.Text style={{ color: strengthLevel.color }}>
              {strengthLevel.label}
            </Typography.Text>
          </Flex>

          <Progress
            percent={score}
            showInfo={false}
            strokeColor={strengthLevel.color}
            size="small"
          />
        </>
      )}

      {showRequirements && (
        <ul className={styles.requirements}>
          {requirements.map((req, index) => (
            <li key={index} className={styles.requirement}>
              {req.met ? (
                <CheckOutlined className={styles.iconMet} />
              ) : (
                <CloseOutlined className={styles.iconUnmet} />
              )}
              <Typography.Text
                className={req.met ? styles.textMet : styles.textUnmet}
              >
                {req.label}
              </Typography.Text>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
