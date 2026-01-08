import type { IOptionGroup } from "./EditOptionsModal.schema";

export const MOCK_OPTION_GROUPS: IOptionGroup[] = [
  {
    id: "opt-1",
    name: "Color",
    slug: "color",
    style: "swatch",
    sortIndex: 0,
    values: [
      {
        id: "val-1",
        label: "Red",
        slug: "red",
        sortIndex: 0,
        swatch: { type: "color", color1: "#ff4d4f" },
      },
      {
        id: "val-2",
        label: "Blue",
        slug: "blue",
        sortIndex: 1,
        swatch: { type: "color", color1: "#1677ff" },
      },
      {
        id: "val-3",
        label: "Green",
        slug: "green",
        sortIndex: 2,
        swatch: { type: "color", color1: "#52c41a" },
      },
      {
        id: "val-4",
        label: "Black",
        slug: "black",
        sortIndex: 3,
        swatch: { type: "color_duo", color1: "#000000", color2: "#333333" },
      },
    ],
  },
  {
    id: "opt-2",
    name: "Size",
    slug: "size",
    style: "size",
    sortIndex: 1,
    values: [
      { id: "val-5", label: "S", slug: "s", sortIndex: 0 },
      { id: "val-6", label: "M", slug: "m", sortIndex: 1 },
      { id: "val-7", label: "L", slug: "l", sortIndex: 2 },
      { id: "val-8", label: "XL", slug: "xl", sortIndex: 3 },
      { id: "val-9", label: "XXL", slug: "xxl", sortIndex: 4 },
    ],
  },
];
