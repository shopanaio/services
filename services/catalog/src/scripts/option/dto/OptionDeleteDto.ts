import type { OptionResultBase } from "./shared.js";

export interface OptionDeleteParams {
  readonly id: string;
}

export interface OptionDeleteResult extends OptionResultBase {
  deletedOptionId?: string;
}
