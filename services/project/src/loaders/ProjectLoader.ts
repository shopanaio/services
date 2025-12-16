import DataLoader from "dataloader";
import type { Repository } from "../repositories/Repository.js";
import type { Project, Locale, Currency, ApiKey } from "../repositories/models/index.js";

export class ProjectLoader {
  public readonly project: DataLoader<string, Project | null>;
  public readonly locales: DataLoader<string, Locale[]>;
  public readonly currencies: DataLoader<string, Currency[]>;
  public readonly apiKeys: DataLoader<string, ApiKey[]>;

  constructor(repository: Repository) {
    // Load projects by ID
    this.project = new DataLoader<string, Project | null>(async (ids) => {
      const projects = await repository.project.getByIds(ids);
      const projectMap = new Map(projects.map((p) => [p.id, p]));
      return ids.map((id) => projectMap.get(id) ?? null);
    });

    // Load locales by project ID
    this.locales = new DataLoader<string, Locale[]>(async (projectIds) => {
      const locales = await repository.locale.getByProjectIds(projectIds);
      const localeMap = new Map<string, Locale[]>();

      for (const locale of locales) {
        const existing = localeMap.get(locale.projectId) ?? [];
        existing.push(locale);
        localeMap.set(locale.projectId, existing);
      }

      return projectIds.map((id) => localeMap.get(id) ?? []);
    });

    // Load currencies by project ID
    this.currencies = new DataLoader<string, Currency[]>(async (projectIds) => {
      const currencies = await repository.currency.getByProjectIds(projectIds);
      const currencyMap = new Map<string, Currency[]>();

      for (const currency of currencies) {
        const existing = currencyMap.get(currency.projectId) ?? [];
        existing.push(currency);
        currencyMap.set(currency.projectId, existing);
      }

      return projectIds.map((id) => currencyMap.get(id) ?? []);
    });

    // Load API keys by project ID
    this.apiKeys = new DataLoader<string, ApiKey[]>(async (projectIds) => {
      const apiKeys = await repository.apiKey.getByProjectIds(projectIds);
      const apiKeyMap = new Map<string, ApiKey[]>();

      for (const apiKey of apiKeys) {
        const existing = apiKeyMap.get(apiKey.projectId) ?? [];
        existing.push(apiKey);
        apiKeyMap.set(apiKey.projectId, existing);
      }

      return projectIds.map((id) => apiKeyMap.get(id) ?? []);
    });
  }
}
