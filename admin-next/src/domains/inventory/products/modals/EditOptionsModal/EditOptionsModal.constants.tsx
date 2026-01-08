import {
  BgColorsOutlined,
  PictureOutlined,
  CheckCircleOutlined,
  MenuOutlined,
  ColumnWidthOutlined,
} from "@ant-design/icons";
import { defaultDropAnimationSideEffects, type DropAnimation } from "@dnd-kit/core";
import type { FeatureStyleType, ISwatch } from "./EditOptionsModal.schema";

export const STYLE_OPTIONS: {
  key: FeatureStyleType;
  label: string;
  icon: React.ReactNode;
}[] = [
  { key: "swatch", label: "Swatch", icon: <BgColorsOutlined /> },
  { key: "cover", label: "Cover", icon: <PictureOutlined /> },
  { key: "radio", label: "Radio", icon: <CheckCircleOutlined /> },
  { key: "dropdown", label: "Dropdown", icon: <MenuOutlined /> },
  { key: "size", label: "Size", icon: <ColumnWidthOutlined /> },
];

export type SwatchModeType = "color" | "image";

export const SWATCH_MODE_OPTIONS: { value: SwatchModeType; label: string }[] = [
  { value: "color", label: "Color" },
  { value: "image", label: "Image" },
];

export const DEFAULT_SWATCH: ISwatch = {
  type: "color",
  color1: "#1677ff",
};

export const DROP_ANIMATION: DropAnimation = {
  duration: 200,
  easing: "cubic-bezier(0.2, 0, 0, 1)",
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: "0.5",
      },
    },
  }),
};
