"use client";

import { createStyles } from "antd-style";
import { StarFilled } from "@ant-design/icons";

const useStyles = createStyles(({ token }) => ({
  coverBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    background: token.colorPrimary,
    color: "#fff",
    padding: "2px 8px",
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 500,
    display: "flex",
    alignItems: "center",
    gap: 4,
    zIndex: 1,
  },
}));

interface ICoverBadgeProps {
  label?: string;
  showIcon?: boolean;
  className?: string;
}

export const CoverBadge = ({
  label = "Cover",
  showIcon = true,
  className,
}: ICoverBadgeProps) => {
  const { styles, cx } = useStyles();

  return (
    <div className={cx(styles.coverBadge, className)}>
      {showIcon && <StarFilled style={{ fontSize: 10 }} />}
      {label}
    </div>
  );
};
