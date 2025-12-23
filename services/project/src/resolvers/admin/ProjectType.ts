import { BaseType, Cache } from "@shopana/type-resolver";
import type { ServiceContext } from "../../context/types.js";
import type { Project } from "../../repositories/models/project.js";
import type { LocaleCode, CurrencyCode } from "@shopana/shared-references";

/**
 * Base resolver class with pre-configured ServiceContext
 * Eliminates the need to specify context type parameter in every resolver
 */
export abstract class ProjectType<Value, Data = unknown> extends BaseType<
  Value,
  Data,
  ServiceContext
> {
  protected getCache() {
    return this.ctx.kernel.cache;
  }
}

/**
 * Project type resolver - resolves Project GraphQL type
 * Accepts project ID, loads data lazily via repository
 */
export class ProjectResolver extends ProjectType<string, Project | null> {
  @Cache({
    cacheName: "project",
    key: (resolver: ProjectResolver) => resolver.value,
  })
  async loadData() {
    const result = await this.ctx.kernel
      .getServices()
      .repository.project.findById(this.value);
    return result ?? null;
  }

  id() {
    return this.value;
  }

  async name() {
    return this.get("name");
  }

  async slug() {
    return this.get("slug");
  }

  async status() {
    return this.get("status");
  }

  async timezone() {
    return this.get("timezone");
  }

  async email() {
    return this.get("email");
  }

  async defaultLocale() {
    return this.get("defaultLocale");
  }

  async baseCurrency() {
    return this.get("baseCurrency");
  }

  async defaultCurrency() {
    return this.get("defaultCurrency");
  }

  async defaultWeightUnit() {
    return this.get("defaultWeightUnit");
  }

  async defaultDimensionUnit() {
    return this.get("defaultDimensionUnit");
  }

  async createdAt() {
    return this.get("createdAt");
  }

  async updatedAt() {
    return this.get("updatedAt");
  }

  async organizationId() {
    return this.get("organizationId");
  }

  @Cache({
    cacheName: "project-locales",
    key: (resolver: ProjectResolver) => resolver.value,
  })
  async locales(): Promise<LocaleCode[]> {
    const locales = await this.ctx.kernel
      .getServices()
      .repository.locale.findByProjectId(this.value);
    return locales?.map((l) => l.code as LocaleCode) ?? [];
  }

  @Cache({
    cacheName: "project-currencies",
    key: (resolver: ProjectResolver) => resolver.value,
  })
  async currencies(): Promise<CurrencyCode[]> {
    const currencies = await this.ctx.kernel
      .getServices()
      .repository.currency.findByProjectId(this.value);
    return currencies?.map((c) => c.code as CurrencyCode) ?? [];
  }
}
