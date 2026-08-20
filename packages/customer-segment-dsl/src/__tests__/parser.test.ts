import { describe, expect, it } from "@jest/globals";
import {
  fullUnicodeCaseFold,
  fullUnicodeNfc,
  fullUnicodeNfkc,
  parseSegmentQuery,
  SegmentParseError,
} from "../index.js";

describe("Customer Segment DSL parser", () => {
  it("applies NOT, AND and OR precedence and preserves source ranges", () => {
    const source = "NOT a = 1 OR b = 2 AND c = 3";
    const parsed = parseSegmentQuery(source);
    expect(parsed.root.kind).toBe("logical");
    if (parsed.root.kind !== "logical") return;
    expect(parsed.root.operator).toBe("or");
    expect(parsed.root.children[0]?.kind).toBe("not");
    expect(parsed.root.children[1]).toMatchObject({ kind: "logical", operator: "and" });
    expect(parsed.root.range).toMatchObject({
      startOffset: 0,
      endOffset: source.length,
      line: 1,
      column: 1,
    });
  });

  it("accepts keyword aliases and decodes only normative escapes", () => {
    const parsed = parseSegmentQuery("orders_placed not matches (status = 'O\\'K', count >= 2)");
    expect(parsed.root).toMatchObject({
      kind: "function",
      operator: "not_matches",
      parameters: [
        { name: "status", value: { kind: "string", value: "O'K" } },
        { name: "count", value: { kind: "number", value: "2" } },
      ],
    });
    expect(() => parseSegmentQuery("a = '\\x41'")).toThrow(SegmentParseError);
  });

  it.each(["a = 01", "a = -00", "a = 2026-08-16suffix", "a = +30days", "a = 1 -- comment"])(
    "rejects invalid lexical input %s",
    (query) => expect(() => parseSegmentQuery(query)).toThrow(SegmentParseError),
  );

  it("accepts an empty MATCHES parameter list as an existence predicate", () => {
    expect(parseSegmentQuery("orders_placed MATCHES ()").root).toMatchObject({
      kind: "function",
      operator: "matches",
      parameters: [],
    });
  });

  it("reports UTF-16 offsets across non-BMP text and CRLF", () => {
    try {
      parseSegmentQuery("name = '😀'\r\nAND @");
      throw new Error("Expected parser failure");
    } catch (error) {
      expect(error).toBeInstanceOf(SegmentParseError);
      const diagnostic = (error as SegmentParseError).diagnostic;
      expect(diagnostic).toMatchObject({ line: 2, column: 5, startOffset: 17 });
    }
  });

  it("enforces the UTF-8 query budget before parsing", () => {
    expect(() => parseSegmentQuery(`name = '${"😀".repeat(2_100)}'`)).toThrow(
      expect.objectContaining({
        diagnostic: expect.objectContaining({ code: "SEGMENT_COMPLEXITY_LIMIT" }),
      }),
    );
  });

  it("uses the pinned full default Unicode case-fold table", () => {
    expect(fullUnicodeCaseFold("Straße Σς µ")).toBe("strasse σσ μ");
  });

  it("uses pinned Unicode 16 canonical and compatibility normalization", () => {
    expect(fullUnicodeNfc("A\u030A 한")).toBe("Å 한");
    expect(fullUnicodeNfkc("① Å ﬃ Ａ")).toBe("1 Å ffi A");
  });
});
