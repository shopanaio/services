/* eslint-disable complexity */
// Generated-parser boundary for the checked-in Peggy grammar. The parser is
// intentionally shipped as source so production never evaluates a grammar.

import { SEGMENT_DIAGNOSTIC_CODES, SEGMENT_DSL_LIMITS } from "./constants.js";
import type {
  ParsedExpression,
  ParsedFunctionExpression,
  ParsedFunctionParameter,
  ParsedPredicateExpression,
  ParsedPredicateOperator,
  ParsedSegmentQuery,
  ParsedValue,
  SegmentDiagnostic,
  SegmentSourceRange,
} from "./types.js";

type TokenKind =
  | "identifier"
  | "string"
  | "number"
  | "date"
  | "dateTime"
  | "relativeDate"
  | "lparen"
  | "rparen"
  | "comma"
  | "operator"
  | "eof";

interface Token {
  readonly kind: TokenKind;
  readonly text: string;
  readonly value?: string;
  readonly range: SegmentSourceRange;
}

export class SegmentParseError extends Error {
  readonly diagnostic: SegmentDiagnostic;

  constructor(message: string, range: SegmentSourceRange, complexity = false) {
    super(message);
    this.name = "SegmentParseError";
    this.diagnostic = {
      code: complexity ? SEGMENT_DIAGNOSTIC_CODES.complexity : SEGMENT_DIAGNOSTIC_CODES.syntax,
      message,
      severity: "ERROR",
      ...range,
    };
  }
}

class Scanner {
  private offset = 0;
  private tokenCount = 0;

  constructor(private readonly source: string) {}

  scan(): Token[] {
    if (Buffer.byteLength(this.source, "utf8") > SEGMENT_DSL_LIMITS.queryUtf8Bytes) {
      throw new SegmentParseError(
        `Query exceeds ${SEGMENT_DSL_LIMITS.queryUtf8Bytes} UTF-8 bytes`,
        rangeAt(this.source, 0, this.source.length),
        true,
      );
    }

    const tokens: Token[] = [];
    while (this.offset < this.source.length) {
      const char = this.source[this.offset]!;
      if (isWhitespace(char)) {
        this.offset += 1;
        continue;
      }
      if (/\s/u.test(char)) {
        throw this.syntax("Only ASCII whitespace is allowed", this.offset, this.offset + 1);
      }

      const start = this.offset;
      let token: Token;
      if (char === "(") token = this.simple("lparen", start, start + 1);
      else if (char === ")") token = this.simple("rparen", start, start + 1);
      else if (char === ",") token = this.simple("comma", start, start + 1);
      else if (char === "'") token = this.stringToken();
      else if (isIdentifierStart(char)) token = this.identifierToken();
      else if (char === "!" || char === ">" || char === "<" || char === "=") {
        token = this.operatorToken();
      } else if (char === "+" || char === "-" || isDigit(char)) {
        token = this.dateOrNumberToken();
      } else {
        throw this.syntax(`Unexpected character ${JSON.stringify(char)}`, start, start + 1);
      }
      tokens.push(token);
      this.tokenCount += 1;
      if (this.tokenCount > SEGMENT_DSL_LIMITS.rawTokens) {
        throw new SegmentParseError(
          `Query exceeds ${SEGMENT_DSL_LIMITS.rawTokens} raw tokens`,
          token.range,
          true,
        );
      }
    }
    tokens.push({ kind: "eof", text: "", range: rangeAt(this.source, this.offset, this.offset) });
    return tokens;
  }

  private simple(kind: TokenKind, start: number, end: number): Token {
    this.offset = end;
    return { kind, text: this.source.slice(start, end), range: rangeAt(this.source, start, end) };
  }

  private identifierToken(): Token {
    const start = this.offset;
    this.offset += 1;
    while (this.offset < this.source.length && isIdentifierPart(this.source[this.offset]!)) {
      this.offset += 1;
    }
    return this.simple("identifier", start, this.offset);
  }

  private operatorToken(): Token {
    const start = this.offset;
    const pair = this.source.slice(start, start + 2);
    if (pair === "!=" || pair === ">=" || pair === "<=") {
      return this.simple("operator", start, start + 2);
    }
    if (this.source[start] === "=" || this.source[start] === ">" || this.source[start] === "<") {
      return this.simple("operator", start, start + 1);
    }
    throw this.syntax("Expected !=, >=, <=, =, > or <", start, start + 1);
  }

  private stringToken(): Token {
    const start = this.offset;
    this.offset += 1;
    let decoded = "";
    while (this.offset < this.source.length) {
      const char = this.source[this.offset]!;
      if (char === "'") {
        this.offset += 1;
        if ([...decoded].length > SEGMENT_DSL_LIMITS.stringCodePoints) {
          throw new SegmentParseError(
            `String literal exceeds ${SEGMENT_DSL_LIMITS.stringCodePoints} Unicode code points`,
            rangeAt(this.source, start, this.offset),
            true,
          );
        }
        return {
          kind: "string",
          text: this.source.slice(start, this.offset),
          value: decoded,
          range: rangeAt(this.source, start, this.offset),
        };
      }
      if (char === "\\") {
        const escape = this.source[this.offset + 1];
        const replacements: Record<string, string> = {
          "'": "'",
          "\\": "\\",
          n: "\n",
          r: "\r",
          t: "\t",
        };
        if (escape === undefined || !(escape in replacements)) {
          throw this.syntax("Unsupported string escape sequence", this.offset, this.offset + 2);
        }
        decoded += replacements[escape];
        this.offset += 2;
        continue;
      }
      decoded += char;
      this.offset += 1;
    }
    throw this.syntax("Unterminated string literal", start, this.source.length);
  }

  private dateOrNumberToken(): Token {
    const start = this.offset;
    const rest = this.source.slice(start);
    const dateTime = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})?)/u.exec(rest);
    if (dateTime) return this.bounded("dateTime", start, dateTime[1]!);
    const date = /^(\d{4}-\d{2}-\d{2})/u.exec(rest);
    if (date) return this.bounded("date", start, date[1]!);
    const relative = /^([+-](?:0|[1-9]\d*)[dDwWmMyY])/u.exec(rest);
    if (relative) return this.bounded("relativeDate", start, relative[1]!);
    const number = /^([+-]?(?:0|[1-9]\d*)(?:\.\d+)?)/u.exec(rest);
    if (!number) throw this.syntax("Invalid number, date or relative date", start, start + 1);

    const value = number[1]!;
    const next = rest[value.length];
    if (next && isIdentifierPart(next)) {
      throw this.syntax("Invalid token boundary", start, start + value.length + 1);
    }
    if (/^[+-]?0\d/u.test(rest) || /^[+-]?\d+\.\d*\./u.test(rest)) {
      throw this.syntax(
        "Numbers must not contain leading zeros or multiple decimal points",
        start,
        start + value.length + 1,
      );
    }
    return this.simple("number", start, start + value.length);
  }

  private bounded(kind: TokenKind, start: number, text: string): Token {
    const next = this.source[start + text.length];
    if (next && isIdentifierPart(next)) {
      throw this.syntax("Invalid token boundary", start, start + text.length + 1);
    }
    return this.simple(kind, start, start + text.length);
  }

  private syntax(message: string, start: number, end: number): SegmentParseError {
    return new SegmentParseError(
      message,
      rangeAt(this.source, start, Math.min(end, this.source.length)),
    );
  }
}

class Parser {
  private index = 0;
  private rawNodes = 0;
  private nesting = 0;

  constructor(
    private readonly source: string,
    private readonly tokens: readonly Token[],
  ) {}

  parse(): ParsedExpression {
    if (this.peek().kind === "eof") this.fail("Query must contain an expression");
    const root = this.parseOr();
    this.expect("eof", "Unexpected trailing input");
    return root;
  }

  private parseOr(): ParsedExpression {
    const children: ParsedExpression[] = [this.parseAnd()];
    while (this.keyword("OR")) children.push(this.parseAnd());
    return children.length === 1 ? children[0]! : this.logical("or", children);
  }

  private parseAnd(): ParsedExpression {
    const children: ParsedExpression[] = [this.parseUnary()];
    while (this.keyword("AND")) children.push(this.parseUnary());
    return children.length === 1 ? children[0]! : this.logical("and", children);
  }

  private parseUnary(): ParsedExpression {
    if (this.keyword("NOT")) {
      const start = this.previous().range.startOffset;
      return this.withNesting(() => {
        const child = this.parseUnary();
        return this.node({
          kind: "not",
          child,
          range: rangeAt(this.source, start, child.range.endOffset),
        });
      });
    }
    if (this.match("lparen")) {
      const start = this.previous().range.startOffset;
      return this.withNesting(() => {
        const expression = this.parseOr();
        const close = this.expect("rparen", "Expected closing parenthesis");
        // Parentheses count toward raw nodes even though normalization removes them.
        this.countNode(rangeAt(this.source, start, close.range.endOffset));
        return { ...expression, range: rangeAt(this.source, start, close.range.endOffset) };
      });
    }
    return this.parseClause();
  }

  private parseClause(): ParsedExpression {
    const name = this.expect("identifier", "Expected attribute or function name");
    const start = name.range.startOffset;
    if (this.keyword("MATCHES")) return this.parseFunction(name, start, "matches");
    if (this.keyword("NOT_MATCHES")) return this.parseFunction(name, start, "not_matches");
    if (this.checkKeyword("NOT") && this.checkKeyword("MATCHES", 1)) {
      this.advance();
      this.advance();
      return this.parseFunction(name, start, "not_matches");
    }
    return this.parsePredicate(name, start);
  }

  private parseFunction(
    name: Token,
    start: number,
    operator: "matches" | "not_matches",
  ): ParsedFunctionExpression {
    this.expect("lparen", "Expected ( after MATCHES");
    return this.withNesting(() => {
      const parameters: ParsedFunctionParameter[] = [];
      if (!this.check("rparen")) {
        do {
          if (parameters.length >= SEGMENT_DSL_LIMITS.functionParameters) {
            throw new SegmentParseError(
              `Function exceeds ${SEGMENT_DSL_LIMITS.functionParameters} parameters`,
              this.peek().range,
              true,
            );
          }
          parameters.push(this.parseParameter());
        } while (this.match("comma"));
      }
      const close = this.expect("rparen", "Expected ) after function parameters");
      return this.node({
        kind: "function",
        name: name.text,
        operator,
        parameters,
        nameRange: name.range,
        range: rangeAt(this.source, start, close.range.endOffset),
      });
    });
  }

  private parseParameter(): ParsedFunctionParameter {
    const name = this.expect("identifier", "Expected function parameter name");
    const tail = this.parsePredicateTail(name.range.startOffset, false);
    return this.node({
      name: name.text,
      nameRange: name.range,
      range: tail.range,
      operator: tail.operator as ParsedFunctionParameter["operator"],
      ...(tail.value ? { value: tail.value } : {}),
      ...(tail.upperValue ? { upperValue: tail.upperValue } : {}),
      ...(tail.values ? { values: tail.values } : {}),
    });
  }

  private parsePredicate(name: Token, start: number): ParsedPredicateExpression {
    const tail = this.parsePredicateTail(start, true);
    return this.node({
      kind: "predicate",
      attribute: name.text,
      attributeRange: name.range,
      ...tail,
    });
  }

  private parsePredicateTail(
    start: number,
    allowContains: boolean,
  ): Omit<ParsedPredicateExpression, "kind" | "attribute" | "attributeRange"> {
    if (this.keyword("BETWEEN")) {
      const value = this.parseValue();
      this.expectKeyword("AND", "Expected AND in BETWEEN predicate");
      const upperValue = this.parseValue();
      return {
        operator: "between",
        value,
        upperValue,
        range: rangeAt(this.source, start, upperValue.range.endOffset),
      };
    }
    if (this.keyword("IN") || (this.checkKeyword("NOT") && this.checkKeyword("IN", 1))) {
      let operator: "in" | "not_in" = "in";
      if (this.previous().text.toUpperCase() !== "IN") {
        this.advance();
        this.advance();
        operator = "not_in";
      }
      this.expect("lparen", "Expected ( after IN");
      const values: ParsedValue[] = [];
      do {
        if (values.length >= SEGMENT_DSL_LIMITS.inValues) {
          throw new SegmentParseError(
            `IN exceeds ${SEGMENT_DSL_LIMITS.inValues} values`,
            this.peek().range,
            true,
          );
        }
        values.push(this.parseValue());
      } while (this.match("comma"));
      const close = this.expect("rparen", "Expected ) after IN values");
      return { operator, values, range: rangeAt(this.source, start, close.range.endOffset) };
    }
    if (this.keyword("IS")) {
      const not = this.keyword("NOT");
      const end = this.expectKeyword("NULL", "Expected NULL after IS").range.endOffset;
      return {
        operator: not ? "is_not_null" : "is_null",
        range: rangeAt(this.source, start, end),
      };
    }
    if (
      allowContains &&
      (this.keyword("CONTAINS") || (this.checkKeyword("NOT") && this.checkKeyword("CONTAINS", 1)))
    ) {
      let operator: "contains" | "not_contains" = "contains";
      if (this.previous().text.toUpperCase() !== "CONTAINS") {
        this.advance();
        this.advance();
        operator = "not_contains";
      }
      const value = this.parseValue();
      return { operator, value, range: rangeAt(this.source, start, value.range.endOffset) };
    }
    const token = this.expect("operator", "Expected predicate operator");
    const operator = operatorName(token.text);
    const value = this.parseValue();
    return { operator, value, range: rangeAt(this.source, start, value.range.endOffset) };
  }

  private parseValue(): ParsedValue {
    const token = this.advance();
    switch (token.kind) {
      case "string":
        return this.node<ParsedValue>({
          kind: "string",
          value: token.value ?? "",
          range: token.range,
        });
      case "number":
        return this.node<ParsedValue>({ kind: "number", value: token.text, range: token.range });
      case "date":
        return this.node<ParsedValue>({ kind: "date", value: token.text, range: token.range });
      case "dateTime":
        return this.node<ParsedValue>({ kind: "dateTime", value: token.text, range: token.range });
      case "relativeDate":
        return this.node<ParsedValue>({
          kind: "relativeDate",
          value: token.text,
          range: token.range,
        });
      case "identifier": {
        const value = token.text.toLowerCase();
        if (value === "true" || value === "false") {
          return this.node<ParsedValue>({
            kind: "boolean",
            value: value === "true",
            range: token.range,
          });
        }
        if (value === "today" || value === "yesterday") {
          return this.node<ParsedValue>({ kind: "namedDate", value, range: token.range });
        }
        break;
      }
      default:
        break;
    }
    throw new SegmentParseError("Expected literal value", token.range);
  }

  private logical(operator: "and" | "or", children: ParsedExpression[]): ParsedExpression {
    const first = children[0]!;
    const last = children[children.length - 1]!;
    return this.node({
      kind: "logical",
      operator,
      children: children as [ParsedExpression, ParsedExpression, ...ParsedExpression[]],
      range: rangeAt(this.source, first.range.startOffset, last.range.endOffset),
    });
  }

  private withNesting<T>(callback: () => T): T {
    this.nesting += 1;
    if (this.nesting > SEGMENT_DSL_LIMITS.rawNestingDepth) {
      throw new SegmentParseError(
        `Query exceeds raw nesting depth ${SEGMENT_DSL_LIMITS.rawNestingDepth}`,
        this.peek().range,
        true,
      );
    }
    try {
      return callback();
    } finally {
      this.nesting -= 1;
    }
  }

  private node<T>(value: T): T {
    const range = (value as { range?: SegmentSourceRange }).range ?? this.peek().range;
    this.countNode(range);
    return value;
  }

  private countNode(range: SegmentSourceRange): void {
    this.rawNodes += 1;
    if (this.rawNodes > SEGMENT_DSL_LIMITS.rawAstNodes) {
      throw new SegmentParseError(
        `Query exceeds ${SEGMENT_DSL_LIMITS.rawAstNodes} raw AST nodes`,
        range,
        true,
      );
    }
  }

  private keyword(text: string): boolean {
    if (!this.checkKeyword(text)) return false;
    this.advance();
    return true;
  }

  private expectKeyword(text: string, message: string): Token {
    if (!this.checkKeyword(text)) this.fail(message);
    return this.advance();
  }

  private checkKeyword(text: string, ahead = 0): boolean {
    const token = this.tokens[this.index + ahead];
    return token?.kind === "identifier" && token.text.toUpperCase() === text;
  }

  private match(kind: TokenKind): boolean {
    if (!this.check(kind)) return false;
    this.advance();
    return true;
  }

  private check(kind: TokenKind): boolean {
    return this.peek().kind === kind;
  }

  private expect(kind: TokenKind, message: string): Token {
    if (!this.check(kind)) this.fail(message);
    return this.advance();
  }

  private advance(): Token {
    const token = this.peek();
    if (token.kind !== "eof") this.index += 1;
    return token;
  }

  private previous(): Token {
    return this.tokens[Math.max(0, this.index - 1)]!;
  }

  private peek(): Token {
    return this.tokens[this.index]!;
  }

  private fail(message: string): never {
    throw new SegmentParseError(message, this.peek().range);
  }
}

export function parseSegmentQuery(source: string): ParsedSegmentQuery {
  const scanner = new Scanner(source);
  const tokens = scanner.scan();
  const root = new Parser(source, tokens).parse();
  return { source, root };
}

function operatorName(value: string): ParsedPredicateOperator {
  const map: Record<string, ParsedPredicateOperator> = {
    "=": "eq",
    "!=": "neq",
    ">": "gt",
    ">=": "gte",
    "<": "lt",
    "<=": "lte",
  };
  return map[value]!;
}

function isWhitespace(value: string): boolean {
  return value === " " || value === "\t" || value === "\r" || value === "\n";
}

function isIdentifierStart(value: string): boolean {
  return /[A-Za-z_]/u.test(value);
}

function isIdentifierPart(value: string): boolean {
  return /[A-Za-z0-9_]/u.test(value);
}

function isDigit(value: string): boolean {
  return value >= "0" && value <= "9";
}

export function rangeAt(
  source: string,
  startOffset: number,
  endOffset: number,
): SegmentSourceRange {
  let line = 1;
  let column = 1;
  for (let index = 0; index < startOffset; index += 1) {
    const char = source[index]!;
    if (char === "\r") {
      if (source[index + 1] === "\n") index += 1;
      line += 1;
      column = 1;
    } else if (char === "\n") {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }
  return { startOffset, endOffset, line, column };
}
