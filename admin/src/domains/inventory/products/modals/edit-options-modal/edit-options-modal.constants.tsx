import type { ReactNode } from "react";
import { LuPalette as BgColorsOutlined, LuCircleCheck as CheckCircleOutlined, LuMenu as MenuOutlined } from "react-icons/lu";
import { OptionDisplayType, SwatchType } from "@/graphql/types";
import type { OptionEditorSwatch } from "./types";

export const DISPLAY_TYPE_OPTIONS: {
  key: OptionDisplayType;
  label: string;
  icon: ReactNode;
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

export const DEFAULT_SWATCH: OptionEditorSwatch = {
  swatchType: SwatchType.Color,
  colorOne: "#1677ff",
};
