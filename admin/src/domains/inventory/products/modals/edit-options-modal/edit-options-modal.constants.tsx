import { SwatchType } from "@/graphql/types";
import type { OptionEditorSwatch } from "./types";

export type SwatchModeType = "color" | "image";

export const SWATCH_MODE_OPTIONS: { value: SwatchModeType; label: string }[] = [
  { value: "color", label: "Color" },
  { value: "image", label: "Image" },
];

export const DEFAULT_SWATCH: OptionEditorSwatch = {
  swatchType: SwatchType.Color,
  colorOne: "#1677ff",
};
