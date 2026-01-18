import { BaseScript } from "../../kernel/BaseScript.js";
import type {
  EntityDeletedParams,
  EntityDeletedResult,
} from "./dto/index.js";

export class EntityDeletedScript extends BaseScript<
  EntityDeletedParams,
  EntityDeletedResult
> {
  protected async execute(
    params: EntityDeletedParams
  ): Promise<EntityDeletedResult> {
    const { entityRef } = params;

    const unlinkedCount = await this.repository.fileBackRef.unlinkAllByEntity({
      service: entityRef.service,
      entityType: entityRef.entityType,
      entityId: entityRef.entityId,
    });

    return { unlinkedCount };
  }

  protected handleError(_error: unknown): EntityDeletedResult {
    return { unlinkedCount: 0 };
  }
}
