export type RowType = "group" | "attribute";

export interface IAttributeValue {
  id: string;
  name: string;
  slug: string;
  sortIndex: number;
}

export interface IAttributeRow {
  id: string;
  type: RowType;
  name: string;
  parentId: string | null;
  sortIndex: number;
  level: number; // 0 = group, 1 = attribute
  values?: IAttributeValue[]; // Only for attributes
}

export const createMockData = (): IAttributeRow[] => {
  return [
    // Root-level attributes (before any group)
    {
      id: "a0",
      type: "attribute",
      name: "SKU",
      parentId: null,
      sortIndex: 0,
      level: 0,
      values: [],
    },
    {
      id: "a00",
      type: "attribute",
      name: "Barcode",
      parentId: null,
      sortIndex: 1,
      level: 0,
      values: [],
    },

    // Group: Physical Properties
    {
      id: "g1",
      type: "group",
      name: "Physical Properties",
      parentId: null,
      sortIndex: 2,
      level: 0,
    },
    {
      id: "a1",
      type: "attribute",
      name: "Material",
      parentId: "g1",
      sortIndex: 0,
      level: 1,
      values: [
        { id: "v1", name: "Cotton", slug: "cotton", sortIndex: 0 },
        { id: "v2", name: "Wool", slug: "wool", sortIndex: 1 },
        { id: "v3", name: "Silk", slug: "silk", sortIndex: 2 },
      ],
    },
    {
      id: "a2",
      type: "attribute",
      name: "Weight",
      parentId: "g1",
      sortIndex: 1,
      level: 1,
      values: [
        { id: "v4", name: "Light", slug: "light", sortIndex: 0 },
        { id: "v5", name: "Medium", slug: "medium", sortIndex: 1 },
        { id: "v6", name: "Heavy", slug: "heavy", sortIndex: 2 },
      ],
    },

    // Group: Brand Info
    {
      id: "g2",
      type: "group",
      name: "Brand Info",
      parentId: null,
      sortIndex: 3,
      level: 0,
    },
    {
      id: "a3",
      type: "attribute",
      name: "Brand",
      parentId: "g2",
      sortIndex: 0,
      level: 1,
      values: [
        { id: "v7", name: "Nike", slug: "nike", sortIndex: 0 },
        { id: "v8", name: "Adidas", slug: "adidas", sortIndex: 1 },
        { id: "v9", name: "Puma", slug: "puma", sortIndex: 2 },
      ],
    },

    // Group: Specifications
    {
      id: "g3",
      type: "group",
      name: "Specifications",
      parentId: null,
      sortIndex: 4,
      level: 0,
    },
    {
      id: "a4",
      type: "attribute",
      name: "Country of Origin",
      parentId: "g3",
      sortIndex: 0,
      level: 1,
      values: [
        { id: "v10", name: "China", slug: "china", sortIndex: 0 },
        { id: "v11", name: "Vietnam", slug: "vietnam", sortIndex: 1 },
        { id: "v12", name: "Italy", slug: "italy", sortIndex: 2 },
      ],
    },
  ];
};
