import type {
  CollectionAddProductsParams,
  CollectionClearProductsParams,
  CollectionMoveProductParams,
  CollectionRebalanceParams,
  CollectionRemoveProductsParams,
  CollectionUpdateParams,
  CollectionUpdateRulesParams,
} from "../dto/CollectionScriptDto.js";
export type CollectionMutationOperation =
  | { kind: "update"; params: CollectionUpdateParams }
  | { kind: "addProducts"; params: CollectionAddProductsParams }
  | { kind: "removeProducts"; params: CollectionRemoveProductsParams }
  | { kind: "moveProduct"; params: CollectionMoveProductParams }
  | { kind: "rebalance"; params: CollectionRebalanceParams }
  | { kind: "clearProducts"; params: CollectionClearProductsParams }
  | { kind: "updateRules"; params: CollectionUpdateRulesParams };
export { CollectionUpdateScript } from "./CollectionUpdateScript.js";
export { CollectionAddProductsScript } from "./CollectionAddProductsScript.js";
export { CollectionRemoveProductsScript } from "./CollectionRemoveProductsScript.js";
export { CollectionMoveProductScript } from "./CollectionMoveProductScript.js";
export { CollectionRebalanceScript } from "./CollectionRebalanceScript.js";
export { CollectionClearProductsScript } from "./CollectionClearProductsScript.js";
export { CollectionUpdateRulesScript } from "./CollectionUpdateRulesScript.js";
