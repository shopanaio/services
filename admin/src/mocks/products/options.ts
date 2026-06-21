import { OptionDisplayType, SwatchType, type ApiProductOption } from "@/graphql/types";

export const MOCK_OPTION_GROUPS: ApiProductOption[] = [
  {
    __typename: "ProductOption",
    id: "opt-1",
    name: "Color",
    slug: "color",
    displayType: OptionDisplayType.Swatch,
    sortIndex: 0,
    values: [
      {
        __typename: "ProductOptionValue",
        id: "val-1",
        name: "Red",
        slug: "red",
        sortIndex: 0,
        swatch: { __typename: "ProductOptionSwatch", id: "swatch-1", swatchType: SwatchType.Color, colorOne: "#ff4d4f", colorTwo: null, file: null, metadata: null },
      },
      {
        __typename: "ProductOptionValue",
        id: "val-2",
        name: "Blue",
        slug: "blue",
        sortIndex: 1,
        swatch: { __typename: "ProductOptionSwatch", id: "swatch-2", swatchType: SwatchType.Color, colorOne: "#1677ff", colorTwo: null, file: null, metadata: null },
      },
      {
        __typename: "ProductOptionValue",
        id: "val-3",
        name: "Green",
        slug: "green",
        sortIndex: 2,
        swatch: { __typename: "ProductOptionSwatch", id: "swatch-3", swatchType: SwatchType.Color, colorOne: "#52c41a", colorTwo: null, file: null, metadata: null },
      },
      {
        __typename: "ProductOptionValue",
        id: "val-4",
        name: "Black",
        slug: "black",
        sortIndex: 3,
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
    sortIndex: 1,
    values: [
      { __typename: "ProductOptionValue", id: "val-5", name: "S", slug: "s", sortIndex: 0, swatch: null },
      { __typename: "ProductOptionValue", id: "val-6", name: "M", slug: "m", sortIndex: 1, swatch: null },
      { __typename: "ProductOptionValue", id: "val-7", name: "L", slug: "l", sortIndex: 2, swatch: null },
      { __typename: "ProductOptionValue", id: "val-8", name: "XL", slug: "xl", sortIndex: 3, swatch: null },
      { __typename: "ProductOptionValue", id: "val-9", name: "XXL", slug: "xxl", sortIndex: 4, swatch: null },
    ],
  },
];
