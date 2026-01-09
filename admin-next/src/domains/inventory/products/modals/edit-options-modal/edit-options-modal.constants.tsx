import {
  BgColorsOutlined,
  PictureOutlined,
  CheckCircleOutlined,
  MenuOutlined,
  ColumnWidthOutlined,
} from "@ant-design/icons";
import type { FeatureStyleType, ISwatch } from "./edit-options-modal.schema";

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
