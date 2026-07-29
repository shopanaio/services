"use client";

import type { ReactNode } from "react";
import { Tag } from "antd";
import {
  LuArchive,
  LuCircleCheck,
  LuCirclePause,
  LuClock3,
  LuFilePenLine,
  LuTimerOff,
} from "react-icons/lu";
import {
  DiscountEffectiveStatus,
  DiscountMethod,
} from "@/graphql/types";
import { formatDiscountEnum } from "./formatters";

const STATUS_PRESENTATION: Record<
  DiscountEffectiveStatus,
  { color: string; icon: ReactNode }
> = {
  [DiscountEffectiveStatus.Active]: {
    color: "success",
    icon: <LuCircleCheck />,
  },
  [DiscountEffectiveStatus.Archived]: {
    color: "default",
    icon: <LuArchive />,
  },
  [DiscountEffectiveStatus.Draft]: {
    color: "default",
    icon: <LuFilePenLine />,
  },
  [DiscountEffectiveStatus.Expired]: {
    color: "error",
    icon: <LuTimerOff />,
  },
  [DiscountEffectiveStatus.Paused]: {
    color: "warning",
    icon: <LuCirclePause />,
  },
  [DiscountEffectiveStatus.Scheduled]: {
    color: "processing",
    icon: <LuClock3 />,
  },
};

interface DiscountStatusTagProps {
  status: DiscountEffectiveStatus;
  method?: DiscountMethod;
  compact?: boolean;
  className?: string;
}

export function DiscountStatusTag({
  status,
  method,
  compact = false,
  className,
}: DiscountStatusTagProps) {
  const presentation = STATUS_PRESENTATION[status];
  const methodLabel =
    method === DiscountMethod.Code
      ? "Code"
      : method === DiscountMethod.Automatic
        ? "Automatic"
        : null;
  const label = [methodLabel, formatDiscountEnum(status)]
    .filter(Boolean)
    .join(" · ");

  return (
    <Tag
      color={presentation.color}
      icon={compact ? undefined : presentation.icon}
      className={className}
      style={{ margin: 0, textTransform: compact ? "uppercase" : undefined }}
    >
      {label}
    </Tag>
  );
}
