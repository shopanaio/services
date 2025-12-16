import DataLoader from "dataloader";
import type { Repository } from "../repositories/Repository.js";
import { CustomerLoader } from "./CustomerLoader.js";

export class Loader {
  // Customer
  public readonly customer;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: DataLoader<any, any>;

  constructor(repository: Repository) {
    const customerLoader = new CustomerLoader(repository);

    // Customer
    this.customer = customerLoader.customer;
  }
}
