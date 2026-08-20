import type { ReactNode } from "react";
import {
  LuZap as ThunderboltOutlined,
  LuTag as TagOutlined,
  LuFolder as FolderOutlined,
  LuGift as GiftOutlined,
} from "react-icons/lu";

import { ProductComponentDependencyTargetType } from "@/graphql/types";

/** Icons matching the chart node visuals */
export const CHART_NODE_ICONS: Record<string, ReactNode> &
  Record<ProductComponentDependencyTargetType, ReactNode> = {
  rule: <ThunderboltOutlined />,
  [ProductComponentDependencyTargetType.Item]: <TagOutlined />,
  [ProductComponentDependencyTargetType.Group]: <FolderOutlined />,
  [ProductComponentDependencyTargetType.Configuration]: <GiftOutlined />,
};
