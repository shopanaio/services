import Handlebars from "handlebars";
import type { NotificationTemplateVariable } from "@shopana/broker-types";

const INLINE_HELPERS = new Set([
  "money",
  "date",
  "number",
  "url",
  "default",
  "eq",
  "and",
  "or",
  "not",
  "uppercase",
  "lowercase",
]);
const BLOCK_HELPERS = new Set(["if", "each"]);
const MAX_TEMPLATE_SIZE = 128 * 1024;
const MAX_TEMPLATE_NESTING = 20;

interface SourceLocation {
  start: { line: number; column: number };
}

interface AstNode {
  type: string;
  body?: AstNode[];
  path?: AstNode;
  params?: AstNode[];
  hash?: { pairs?: Array<{ value: AstNode }> };
  program?: AstNode;
  inverse?: AstNode;
  escaped?: boolean;
  data?: boolean;
  depth?: number;
  parts?: string[];
  original?: string;
  blockParams?: string[];
  loc?: SourceLocation;
}

interface ValidationContext {
  allowedPaths: Set<string>;
  dynamicPrefixes: Set<string>;
  pathTypes: Map<string, NotificationTemplateVariable["type"]>;
  issues: TemplateValidationIssue[];
}

export interface TemplateValidationIssue {
  line: number;
  column: number;
  code: string;
  message: string;
}

export class TemplateVariableValidator {
  validate(
    source: string,
    variables: readonly NotificationTemplateVariable[]
  ): TemplateValidationIssue[] {
    if (Buffer.byteLength(source, "utf8") > MAX_TEMPLATE_SIZE) {
      return [
        {
          line: 1,
          column: 1,
          code: "MAX_SOURCE_SIZE_EXCEEDED",
          message: `Template source exceeds ${MAX_TEMPLATE_SIZE} bytes`,
        },
      ];
    }
    let ast: AstNode;
    try {
      ast = Handlebars.parse(source) as AstNode;
    } catch (error) {
      const location = extractLocation(error);
      return [
        {
          line: location.line,
          column: location.column,
          code: "INVALID_HANDLEBARS",
          message:
            error instanceof Error
              ? error.message
              : "Invalid Handlebars template",
        },
      ];
    }

    const allowedPaths = new Set<string>();
    const dynamicPrefixes = new Set<string>();
    const pathTypes = new Map<
      string,
      NotificationTemplateVariable["type"]
    >();
    const collect = (entries: readonly NotificationTemplateVariable[]) => {
      for (const variable of entries) {
        if (variable.path === "*") {
          dynamicPrefixes.add("");
        } else if (variable.path.endsWith(".*")) {
          dynamicPrefixes.add(variable.path.slice(0, -2));
        } else {
          allowedPaths.add(variable.path);
          pathTypes.set(variable.path, variable.type);
        }
        if (variable.children) collect(variable.children);
      }
    };
    collect(variables);

    const context: ValidationContext = {
      allowedPaths,
      dynamicPrefixes,
      pathTypes,
      issues: [],
    };
    this.validateProgram(ast, [undefined], 0, context);
    return context.issues;
  }

  private validateProgram(
    program: AstNode,
    scopes: Array<string | undefined>,
    nesting: number,
    context: ValidationContext
  ): void {
    if (nesting > MAX_TEMPLATE_NESTING) {
      context.issues.push(
        issueAt(
          program,
          "MAX_NESTING_EXCEEDED",
          `Template nesting exceeds ${MAX_TEMPLATE_NESTING} levels`
        )
      );
      return;
    }

    for (const node of program.body ?? []) {
      switch (node.type) {
        case "ContentStatement":
          break;
        case "CommentStatement":
        case "PartialStatement":
        case "PartialBlockStatement":
        case "Decorator":
        case "DecoratorBlock":
          context.issues.push(
            issueAt(
              node,
              "UNSUPPORTED_EXPRESSION",
              "Comments, partials, and decorators are not supported"
            )
          );
          break;
        case "MustacheStatement":
          this.validateMustache(node, scopes, context);
          break;
        case "BlockStatement":
          this.validateBlock(node, scopes, nesting, context);
          break;
        default:
          context.issues.push(
            issueAt(
              node,
              "UNSUPPORTED_EXPRESSION",
              `Unsupported Handlebars AST node "${node.type}"`
            )
          );
      }
    }
  }

  private validateMustache(
    node: AstNode,
    scopes: Array<string | undefined>,
    context: ValidationContext
  ): void {
    if (node.escaped === false) {
      context.issues.push(
        issueAt(
          node,
          "UNESCAPED_EXPRESSION",
          "Triple-stash and unescaped expressions are not supported"
        )
      );
    }

    const hasArguments =
      (node.params?.length ?? 0) > 0 ||
      (node.hash?.pairs?.length ?? 0) > 0;
    const name = node.path?.original ?? "";
    if (hasArguments || INLINE_HELPERS.has(name)) {
      this.validateHelper(node.path, INLINE_HELPERS, context);
    } else if (node.path) {
      this.validatePath(node.path, scopes, context);
    }
    this.validateArguments(node, scopes, context);
  }

  private validateBlock(
    node: AstNode,
    scopes: Array<string | undefined>,
    nesting: number,
    context: ValidationContext
  ): void {
    const name = node.path?.original ?? "";
    this.validateHelper(node.path, BLOCK_HELPERS, context);
    if ((node.blockParams?.length ?? 0) > 0) {
      context.issues.push(
        issueAt(
          node,
          "UNSUPPORTED_BLOCK_PARAMS",
          "Block parameter aliases are not supported; use scoped paths"
        )
      );
    }
    this.validateArguments(node, scopes, context);

    if (name === "each") {
      const collection = node.params?.[0];
      if (
        !collection ||
        collection.type !== "PathExpression" ||
        (node.params?.length ?? 0) !== 1
      ) {
        context.issues.push(
          issueAt(
            node,
            "INVALID_EACH_TARGET",
            "The each helper requires exactly one catalogued array path"
          )
        );
      }
      const collectionPath =
        collection?.type === "PathExpression"
          ? this.resolvePath(collection, scopes)
          : undefined;
      const collectionType = collectionPath
        ? context.pathTypes.get(collectionPath)
        : undefined;
      if (collectionPath && collectionType && collectionType !== "ARRAY") {
        context.issues.push(
          issueAt(
            collection,
            "INVALID_EACH_TARGET",
            `Template variable "${collection?.original ?? collectionPath}" is not an array`
          )
        );
      }
      if (node.program) {
        this.validateProgram(
          node.program,
          [...scopes, collectionPath],
          nesting + 1,
          context
        );
      }
    } else if (node.program) {
      this.validateProgram(node.program, scopes, nesting + 1, context);
    }

    if (node.inverse) {
      this.validateProgram(node.inverse, scopes, nesting + 1, context);
    }
  }

  private validateArguments(
    node: AstNode,
    scopes: Array<string | undefined>,
    context: ValidationContext
  ): void {
    for (const parameter of node.params ?? []) {
      this.validateExpression(parameter, scopes, context);
    }
    for (const pair of node.hash?.pairs ?? []) {
      this.validateExpression(pair.value, scopes, context);
    }
  }

  private validateExpression(
    node: AstNode,
    scopes: Array<string | undefined>,
    context: ValidationContext
  ): void {
    if (node.type === "PathExpression") {
      this.validatePath(node, scopes, context);
      return;
    }
    if (node.type === "SubExpression") {
      this.validateHelper(node.path, INLINE_HELPERS, context);
      this.validateArguments(node, scopes, context);
    }
  }

  private validateHelper(
    path: AstNode | undefined,
    allowed: ReadonlySet<string>,
    context: ValidationContext
  ): void {
    const name = path?.original ?? "";
    if (!allowed.has(name)) {
      context.issues.push(
        issueAt(
          path,
          "UNKNOWN_HELPER",
          `Unknown or unsupported template helper "${name}"`
        )
      );
    }
  }

  private validatePath(
    path: AstNode,
    scopes: Array<string | undefined>,
    context: ValidationContext
  ): void {
    if (path.data) {
      if (
        scopes.length === 1 ||
        !["@index", "@key", "@first", "@last"].includes(path.original ?? "")
      ) {
        context.issues.push(
          issueAt(
            path,
            "UNKNOWN_DATA_VARIABLE",
            `Unknown template data variable "${path.original ?? ""}"`
          )
        );
      }
      return;
    }

    const resolved = this.resolvePath(path, scopes);
    if (
      !resolved ||
      (!context.allowedPaths.has(resolved) &&
        ![...context.dynamicPrefixes].some(
          (prefix) =>
            prefix === "" ||
            resolved === prefix ||
            resolved.startsWith(`${prefix}.`)
        ))
    ) {
      context.issues.push(
        issueAt(
          path,
          "UNKNOWN_VARIABLE",
          `Unknown template variable "${path.original ?? resolved}"`
        )
      );
    }
  }

  private resolvePath(
    path: AstNode,
    scopes: Array<string | undefined>
  ): string | undefined {
    const depth = path.depth ?? 0;
    const scopeIndex = Math.max(0, scopes.length - 1 - depth);
    const scope = scopes[scopeIndex];
    const relativePath = (path.parts ?? []).join(".");
    if (!scope) return relativePath || undefined;
    return relativePath ? `${scope}.${relativePath}` : scope;
  }
}

function issueAt(
  node: AstNode | undefined,
  code: string,
  message: string
): TemplateValidationIssue {
  return {
    line: node?.loc?.start.line ?? 1,
    column: (node?.loc?.start.column ?? 0) + 1,
    code,
    message,
  };
}

function extractLocation(error: unknown): { line: number; column: number } {
  if (
    error &&
    typeof error === "object" &&
    "hash" in error &&
    typeof (error as { hash?: unknown }).hash === "object"
  ) {
    const hash = (
      error as {
        hash: { loc?: { first_line?: number; first_column?: number } };
      }
    ).hash;
    return {
      line: hash.loc?.first_line ?? 1,
      column: (hash.loc?.first_column ?? 0) + 1,
    };
  }
  return { line: 1, column: 1 };
}
