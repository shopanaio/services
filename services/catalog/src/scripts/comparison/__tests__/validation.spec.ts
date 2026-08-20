import { validateProfileInput } from "../validation.js";

describe("comparison profile validation", () => {
  it("accepts a complete ENUM aggregate", () => {
    expect(validateProfileInput({
      handle: "display", enabled: true, name: "Display", missingLabel: "—", notApplicableLabel: "N/A", unavailableLabel: "Unavailable",
      groups: [{ handle: "panel", name: "Panel", sortIndex: 0, fields: [{ handle: "technology", name: "Technology", valueType: "ENUM", cardinality: "SINGLE", sortIndex: 0, featured: false, options: [{ handle: "oled", name: "OLED", sortIndex: 0 }] }] }],
    })).toEqual([]);
  });

  it("reports exact nested paths for invalid unit and ENUM options", () => {
    const errors = validateProfileInput({
      handle: "display", enabled: true, name: "Display", missingLabel: "—", notApplicableLabel: "N/A", unavailableLabel: "Unavailable",
      groups: [{ handle: "panel", name: "Panel", sortIndex: 0, fields: [{ handle: "technology", name: "Technology", valueType: "TEXT", cardinality: "SINGLE", canonicalUnit: "kg", sortIndex: 0, featured: false, options: [{ handle: "oled", name: "OLED", sortIndex: 0 }] }] }],
    });
    expect(errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "COMPARISON_UNIT_INVALID", field: ["groups", "0", "fields", "0", "canonicalUnit"] }),
      expect.objectContaining({ code: "COMPARISON_ENUM_OPTION_INVALID", field: ["groups", "0", "fields", "0", "options"] }),
    ]));
  });
});
