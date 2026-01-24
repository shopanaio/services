import type { ReactNode } from "react";
import {
  ThunderboltOutlined,
  TagOutlined,
  FolderOutlined,
  GiftOutlined,
} from "@ant-design/icons";

import { DependencyTargetType } from "./enums";

/** Icons matching the chart node visuals */
export const CHART_NODE_ICONS: Record<string, ReactNode> & Record<DependencyTargetType, ReactNode> = {
  rule: <ThunderboltOutlined />,
  [DependencyTargetType.ITEM]: <TagOutlined />,
  [DependencyTargetType.GROUP]: <FolderOutlined />,
  [DependencyTargetType.BUNDLE]: <GiftOutlined />,
};
