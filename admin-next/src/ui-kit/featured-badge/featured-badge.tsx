"use client";

import { createStyles } from "antd-style";
import { StarFilled } from "@ant-design/icons";
import { Tag } from "antd";

const useStyles = createStyles(({ token }) => ({
  featuredBadge: {
    position: "absolute",
    top: 8,
    left: 8,
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
    <Tag
      icon={showIcon ? <StarFilled /> : null}
      className={cx(styles.featuredBadge, className)}
      color="green"
    >
      {label}
    </Tag>
  );
};
