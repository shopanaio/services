import type { ReactNode } from "react";
import { Tooltip } from "antd";
import {
  LuCircleCheck as CheckCircleOutlined,
  LuClock as ClockCircleOutlined,
  LuCircleX as CloseCircleOutlined,
} from "react-icons/lu";
import { ReviewContentStatus } from "@/graphql/types";
import { formatDetailDate } from "@/domains/inventory/utils/format-detail-date";
import { useReviewDetailsStyles } from "./review-details-card.styles";

export const reviewStatusConfig: Record<
  ReviewContentStatus,
  {
    label: string;
    color: string;
    hint: string;
    icon: ReactNode;
  }
> = {
  [ReviewContentStatus.Pending]: {
    label: "PENDING",
    color: "gold",
    hint: "Awaiting moderation",
    icon: <ClockCircleOutlined />,
  },
  [ReviewContentStatus.Published]: {
    label: "PUBLISHED",
    color: "green",
    hint: "Visible in published review surfaces",
    icon: <CheckCircleOutlined />,
  },
  [ReviewContentStatus.Rejected]: {
    label: "REJECTED",
    color: "red",
    hint: "Rejected by moderation",
    icon: <CloseCircleOutlined />,
  },
};

export function formatReviewDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatReviewDate(value?: string | null) {
  return formatDetailDate(value) || "—";
}

export function humanizeEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function ReviewStatusStrip({ status }: { status: ReviewContentStatus }) {
  const { styles, cx } = useReviewDetailsStyles();
  return (
    <div className={styles.statusStrip} aria-label={`Moderation status: ${humanizeEnum(status)}`}>
      {Object.values(ReviewContentStatus).map((value) => {
        const config = reviewStatusConfig[value];
        const activeClass =
          value === ReviewContentStatus.Pending
            ? styles.statusSegmentActivePending
            : value === ReviewContentStatus.Published
              ? styles.statusSegmentActivePublished
              : styles.statusSegmentActiveRejected;
        return (
          <div key={value} className={cx(styles.statusSegment, value === status && activeClass)}>
            {config.icon}
            <span>{humanizeEnum(value)}</span>
          </div>
        );
      })}
    </div>
  );
}

export function MediaStatusBadge({ status }: { status: ReviewContentStatus }) {
  const { styles, cx } = useReviewDetailsStyles();
  const config = reviewStatusConfig[status];
  const className =
    status === ReviewContentStatus.Pending
      ? styles.mediaBadgePending
      : status === ReviewContentStatus.Published
        ? styles.mediaBadgePublished
        : styles.mediaBadgeRejected;
  return (
    <Tooltip title={humanizeEnum(status)}>
      <span
        className={cx(styles.mediaBadge, className)}
        role="img"
        aria-label={`Media status: ${humanizeEnum(status)}`}
      >
        {config.icon}
      </span>
    </Tooltip>
  );
}
