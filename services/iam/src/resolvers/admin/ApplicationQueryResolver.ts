import {
  decodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import { IAMType } from "./IAMType.js";
import {
  ApplicationConnectionResolver,
  mapApplicationConnectionInput,
} from "./ApplicationConnectionResolver.js";
import { ApplicationResolver } from "./ApplicationResolver.js";

/** Application realm management query namespace. */
export class ApplicationQueryResolver extends IAMType<Record<string, never>> {
  application(args: { organizationId: string; id: string }) {
    const organizationId = decodeGlobalIdByType(
      args.organizationId,
      GlobalIdEntity.Organization
    );
    const id = decodeGlobalIdByType(args.id, GlobalIdEntity.Application);
    return new ApplicationResolver({ id, organizationId }, this.$ctx);
  }

  applications(args: Parameters<typeof mapApplicationConnectionInput>[1]) {
    const organizationId = decodeGlobalIdByType(
      (args as { organizationId: string }).organizationId,
      GlobalIdEntity.Organization
    );
    const { organizationId: _organizationId, ...connectionArgs } = args as NonNullable<
      typeof args
    > & { organizationId: string };
    return new ApplicationConnectionResolver(
      mapApplicationConnectionInput(organizationId, connectionArgs),
      this.$ctx
    );
  }
}
