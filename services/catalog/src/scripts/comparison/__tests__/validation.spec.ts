import { validateComparisonProfileCreateIds, validateProfileInput } from "../validation.js";

describe("comparison profile validation", () => {
  it("accepts a complete ENUM aggregate", () => {
    expect(
      validateProfileInput({
        handle: "display",
        enabled: true,
        name: "Display",
        missingLabel: "—",
        notApplicableLabel: "N/A",
        unavailableLabel: "Unavailable",
        groups: [
          {
            handle: "panel",
            name: "Panel",
            sortIndex: 0,
            fields: [
              {
                handle: "technology",
                name: "Technology",
                valueType: "ENUM",
                cardinality: "SINGLE",
                sortIndex: 0,
                featured: false,
                options: [{ handle: "oled", name: "OLED", sortIndex: 0 }],
              },
            ],
          },
        ],
      }),
    ).toEqual([]);
  });

  it("rejects every client-supplied nested ID on profile create", () => {
    const errors = validateComparisonProfileCreateIds({
      handle: "display",
      enabled: true,
      name: "Display",
      missingLabel: "—",
      notApplicableLabel: "N/A",
      unavailableLabel: "Unavailable",
      groups: [
        {
          id: "group-id",
          handle: "panel",
          name: "Panel",
          sortIndex: 0,
          fields: [
            {
              id: "field-id",
              handle: "technology",
              name: "Technology",
              valueType: "ENUM",
              cardinality: "SINGLE",
              sortIndex: 0,
              featured: false,
              options: [{ id: "option-id", handle: "oled", name: "OLED", sortIndex: 0 }],
            },
          ],
        },
      ],
    });

    expect(errors.map((error) => error.field)).toEqual([
      ["groups", "0", "id"],
      ["groups", "0", "fields", "0", "id"],
      ["groups", "0", "fields", "0", "options", "0", "id"],
    ]);
  });

  it("reports exact nested paths for invalid unit and ENUM options", () => {
    const errors = validateProfileInput({
      handle: "display",
      enabled: true,
      name: "Display",
      missingLabel: "—",
      notApplicableLabel: "N/A",
      unavailableLabel: "Unavailable",
      groups: [
        {
          handle: "panel",
          name: "Panel",
          sortIndex: 0,
          fields: [
            {
              handle: "technology",
              name: "Technology",
              valueType: "TEXT",
              cardinality: "SINGLE",
              canonicalUnit: "kg",
              sortIndex: 0,
              featured: false,
              options: [{ handle: "oled", name: "OLED", sortIndex: 0 }],
            },
          ],
        },
      ],
    });
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "COMPARISON_UNIT_INVALID",
          field: ["groups", "0", "fields", "0", "canonicalUnit"],
        }),
        expect.objectContaining({
          code: "COMPARISON_ENUM_OPTION_INVALID",
          field: ["groups", "0", "fields", "0", "options"],
        }),
      ]),
    );
  });
});
