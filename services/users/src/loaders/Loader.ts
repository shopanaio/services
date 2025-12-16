import DataLoader from "dataloader";
import type { Repository } from "../repositories/Repository.js";
import { UserLoader } from "./UserLoader.js";

export class Loader {
  // User
  public readonly user;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: DataLoader<any, any>;

  constructor(repository: Repository) {
    const userLoader = new UserLoader(repository);

    // User
    this.user = userLoader.user;
  }
}
