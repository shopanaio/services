import DataLoader from "dataloader";
import type { Repository } from "../repositories/Repository.js";
import { ProjectLoader } from "./ProjectLoader.js";

export class Loader {
  // Project
  public readonly project;
  public readonly locales;
  public readonly currencies;
  public readonly apiKeys;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: DataLoader<any, any>;

  constructor(repository: Repository) {
    const projectLoader = new ProjectLoader(repository);

    // Project
    this.project = projectLoader.project;
    this.locales = projectLoader.locales;
    this.currencies = projectLoader.currencies;
    this.apiKeys = projectLoader.apiKeys;
  }
}
