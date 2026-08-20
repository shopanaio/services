import { type PageInfo } from "@shopana/drizzle-query";
import { ServiceType } from "../ServiceType.js";

export interface EdgeData {
  cursor: string;
  nodeId: string;
}

export interface ConnectionData {
  edges: EdgeData[];
  pageInfo: PageInfo;
  totalCount: number;
}

export abstract class BaseConnectionEdgeResolver<TNode> extends ServiceType<EdgeData, EdgeData> {
  protected $preload(): EdgeData {
    return this.$props;
  }

  cursor(): string {
    return this.$props.cursor;
  }

  abstract node(): TNode | Promise<TNode>;
}

export abstract class BaseConnectionResolver<
  TArgs = unknown,
  TEdge extends BaseConnectionEdgeResolver<unknown> = BaseConnectionEdgeResolver<unknown>,
> extends ServiceType<TArgs, ConnectionData> {
  abstract $preload(): Promise<ConnectionData>;

  protected abstract createEdgeResolver(edge: EdgeData): TEdge;

  async edges(): Promise<TEdge[]> {
    const edgesData = await this.$get("edges");
    return (edgesData ?? []).map((edge) => this.createEdgeResolver(edge));
  }

  async pageInfo() {
    return this.$get("pageInfo");
  }

  async totalCount(): Promise<number> {
    return (await this.$get("totalCount")) ?? 0;
  }
}
