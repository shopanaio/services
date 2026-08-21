import { ApolloQuery, TypePolicy } from "@shopana/type-resolver";
import { AuditType } from "./AuditType.js";

interface EmptyConnection {
  readonly edges: readonly never[];
  readonly pageInfo: {
    readonly hasNextPage: false;
    readonly hasPreviousPage: false;
    readonly startCursor: null;
    readonly endCursor: null;
  };
  readonly totalCount: 0;
}

const EMPTY_CONNECTION: EmptyConnection = Object.freeze({
  edges: Object.freeze([]),
  pageInfo: Object.freeze({
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: null,
    endCursor: null,
  }),
  totalCount: 0,
});

@ApolloQuery
export class QueryResolver extends AuditType<Record<string, never>> {
  auditQuery() {
    return new AuditQueryResolver({}, this.$ctx);
  }
}

@TypePolicy<AuditQueryResolver>({
  resource: "store.audit",
  action: "read",
  organizationId: (resolver) => resolver.$ctx.store.organizationId,
  domain: (resolver) => `store:${resolver.$ctx.store.id}`,
})
export class AuditQueryResolver extends AuditType<Record<string, never>> {
  entry(): null {
    return null;
  }

  entries(): EmptyConnection {
    return EMPTY_CONNECTION;
  }

  timeline(): EmptyConnection {
    return EMPTY_CONNECTION;
  }
}
