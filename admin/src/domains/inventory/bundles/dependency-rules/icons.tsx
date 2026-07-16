import type { ReactNode } from "react";
import { LuZap as ThunderboltOutlined, LuTag as TagOutlined, LuFolder as FolderOutlined, LuGift as GiftOutlined } from "react-icons/lu";

import { DependencyTargetType } from "./enums";

/** Icons matching the chart node visuals */
export const CHART_NODE_ICONS: Record<string, ReactNode> & Record<DependencyTargetType, ReactNode> = {
  rule: <ThunderboltOutlined />,
  [DependencyTargetType.ITEM]: <TagOutlined />,
  [DependencyTargetType.GROUP]: <FolderOutlined />,
  [DependencyTargetType.BUNDLE]: <GiftOutlined />,
};
