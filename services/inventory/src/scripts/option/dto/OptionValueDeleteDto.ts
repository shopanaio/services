import type { OptionResultBase } from "./shared.js";

export interface OptionValueDeleteParams {
  readonly id: string;
}

export interface OptionValueDeleteResult extends OptionResultBase {
  deletedId?: string;
}
