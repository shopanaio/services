"use client";

import { createStyles } from "antd-style";
import { StarFilled } from "@ant-design/icons";

const useStyles = createStyles(({ token }) => ({
  featuredBadge: {
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

interface IFeaturedBadgeProps {
  label?: string;
  showIcon?: boolean;
  className?: string;
}

export const FeaturedBadge = ({
  label = "Featured",
  showIcon = true,
  className,
}: IFeaturedBadgeProps) => {
  const { styles, cx } = useStyles();

  return (
    <div className={cx(styles.featuredBadge, className)}>
      {showIcon && <StarFilled style={{ fontSize: 10 }} />}
      {label}
    </div>
  );
};
