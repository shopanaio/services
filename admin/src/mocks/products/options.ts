import { OptionDisplayType, SwatchType, type ApiProductOption } from "@/graphql/types";

export const MOCK_OPTION_GROUPS: ApiProductOption[] = [
  {
    __typename: "ProductOption",
    id: "opt-1",
    name: "Color",
    slug: "color",
    displayType: OptionDisplayType.Swatch,
    values: [
      {
        __typename: "ProductOptionValue",
        id: "val-1",
        name: "Red",
        slug: "red",
        swatch: { __typename: "ProductOptionSwatch", id: "swatch-1", swatchType: SwatchType.Color, colorOne: "#ff4d4f", colorTwo: null, file: null, metadata: null },
      },
      {
        __typename: "ProductOptionValue",
        id: "val-2",
        name: "Blue",
        slug: "blue",
        swatch: { __typename: "ProductOptionSwatch", id: "swatch-2", swatchType: SwatchType.Color, colorOne: "#1677ff", colorTwo: null, file: null, metadata: null },
      },
      {
        __typename: "ProductOptionValue",
        id: "val-3",
        name: "Green",
        slug: "green",
        swatch: { __typename: "ProductOptionSwatch", id: "swatch-3", swatchType: SwatchType.Color, colorOne: "#52c41a", colorTwo: null, file: null, metadata: null },
      },
      {
        __typename: "ProductOptionValue",
        id: "val-4",
        name: "Black",
        slug: "black",
        swatch: { __typename: "ProductOptionSwatch", id: "swatch-4", swatchType: SwatchType.Gradient, colorOne: "#000000", colorTwo: "#333333", file: null, metadata: null },
      },
    ],
  },
  {
    __typename: "ProductOption",
    id: "opt-2",
    name: "Size",
    slug: "size",
    displayType: OptionDisplayType.Buttons,
    values: [
      { __typename: "ProductOptionValue", id: "val-5", name: "S", slug: "s", swatch: null },
      { __typename: "ProductOptionValue", id: "val-6", name: "M", slug: "m", swatch: null },
      { __typename: "ProductOptionValue", id: "val-7", name: "L", slug: "l", swatch: null },
      { __typename: "ProductOptionValue", id: "val-8", name: "XL", slug: "xl", swatch: null },
      { __typename: "ProductOptionValue", id: "val-9", name: "XXL", slug: "xxl", swatch: null },
    ],
  },
];
