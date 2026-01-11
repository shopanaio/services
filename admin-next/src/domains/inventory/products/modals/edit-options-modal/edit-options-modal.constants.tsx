import {
  BgColorsOutlined,
  CheckCircleOutlined,
  MenuOutlined,
} from "@ant-design/icons";
import { OptionDisplayType, SwatchType, type ApiProductOptionSwatchInput } from "@/graphql/types";

export const DISPLAY_TYPE_OPTIONS: {
  key: OptionDisplayType;
  label: string;
  icon: React.ReactNode;
}[] = [
  { key: OptionDisplayType.Swatch, label: "Swatch", icon: <BgColorsOutlined /> },
  { key: OptionDisplayType.Buttons, label: "Buttons", icon: <CheckCircleOutlined /> },
  { key: OptionDisplayType.Dropdown, label: "Dropdown", icon: <MenuOutlined /> },
];

export type SwatchModeType = "color" | "image";

export const SWATCH_MODE_OPTIONS: { value: SwatchModeType; label: string }[] = [
  { value: "color", label: "Color" },
  { value: "image", label: "Image" },
];

export const DEFAULT_SWATCH: ApiProductOptionSwatchInput = {
  swatchType: SwatchType.Color,
  colorOne: "#1677ff",
};
