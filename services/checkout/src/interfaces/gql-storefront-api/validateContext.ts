import { GraphQLError } from "graphql";
import { Type } from "class-transformer";
import { IsDefined, IsNotEmpty, IsString, ValidateNested } from "class-validator";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { createValidated } from "@src/utils/validation";

class StoreDto {
  @IsString()
  @IsNotEmpty()
  id!: string;
}

class GraphQLContextDto {
  @IsString()
  @IsNotEmpty()
  requestId!: string;

  @IsString()
  @IsNotEmpty()
  organizationId!: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => StoreDto)
  store!: StoreDto;

  @IsDefined()
  storefrontAccess!: GraphQLContext["storefrontAccess"];
}

export function validateGraphQLContext(ctx: Partial<GraphQLContext>): GraphQLContext {
  try {
    createValidated(GraphQLContextDto, ctx);
    return ctx as GraphQLContext;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid GraphQL context";
    throw new GraphQLError(message, {
      extensions: { code: "UNAUTHENTICATED" },
    });
  }
}
