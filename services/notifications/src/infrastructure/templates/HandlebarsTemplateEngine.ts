import Handlebars from "handlebars";

const MAX_TEMPLATE_SIZE = 128 * 1024;
const MAX_RENDERED_SIZE = 512 * 1024;
const MAX_RENDER_TIME_MS = 250;
const MAX_COMPILED_TEMPLATES = 1_000;

export class HandlebarsTemplateEngine {
  private readonly handlebars = Handlebars.create();
  private readonly cache = new Map<string, Handlebars.TemplateDelegate>();

  constructor() {
    this.handlebars.registerHelper(
      "money",
      (amount: number, currencyCode: string, locale = "en") =>
        new Intl.NumberFormat(locale, {
          style: "currency",
          currency: currencyCode,
        }).format(amount / 100)
    );
    this.handlebars.registerHelper(
      "date",
      (value: string, timezone = "UTC", locale = "en") =>
        new Intl.DateTimeFormat(locale, {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: timezone,
        }).format(new Date(value))
    );
    this.handlebars.registerHelper(
      "number",
      (value: number, locale = "en") =>
        new Intl.NumberFormat(locale).format(value)
    );
    this.handlebars.registerHelper("url", (value: string) => {
      const url = new URL(value);
      if (!["https:", "http:"].includes(url.protocol)) {
        throw new Error("Template URL uses an unsupported scheme");
      }
      return url.toString();
    });
    this.handlebars.registerHelper(
      "default",
      (value: unknown, fallback: unknown) =>
        value === undefined || value === null || value === ""
          ? fallback
          : value
    );
    this.handlebars.registerHelper("eq", (left, right) => left === right);
    this.handlebars.registerHelper("and", (...args) =>
      args.slice(0, -1).every(Boolean)
    );
    this.handlebars.registerHelper("or", (...args) =>
      args.slice(0, -1).some(Boolean)
    );
    this.handlebars.registerHelper("not", (value) => !value);
    this.handlebars.registerHelper("uppercase", (value) =>
      String(value).toUpperCase()
    );
    this.handlebars.registerHelper("lowercase", (value) =>
      String(value).toLowerCase()
    );
  }

  render(source: string, data: Record<string, unknown>, cacheKey: string): string {
    const startedAt = performance.now();
    if (Buffer.byteLength(source, "utf8") > MAX_TEMPLATE_SIZE) {
      throw new Error("Template source exceeds the size limit");
    }
    let template = this.cache.get(cacheKey);
    if (!template) {
      template = this.handlebars.compile(source, {
        strict: true,
        noEscape: false,
        preventIndent: true,
      });
      this.cache.set(cacheKey, template);
      if (this.cache.size > MAX_COMPILED_TEMPLATES) {
        const oldest = this.cache.keys().next().value as string | undefined;
        if (oldest) this.cache.delete(oldest);
      }
    }
    const output = template(data, {
      allowProtoMethodsByDefault: false,
      allowProtoPropertiesByDefault: false,
    });
    if (Buffer.byteLength(output, "utf8") > MAX_RENDERED_SIZE) {
      throw new Error("Rendered notification exceeds the size limit");
    }
    if (performance.now() - startedAt > MAX_RENDER_TIME_MS) {
      throw new Error("Template compile/render exceeded the time budget");
    }
    return output;
  }
}
