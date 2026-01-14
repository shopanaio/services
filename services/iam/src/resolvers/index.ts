// Base type
export { IAMType } from "./admin/IAMType.js";

// Root resolvers
export { QueryResolver } from "./admin/QueryResolver.js";
export { MutationResolver } from "./admin/MutationResolver.js";

// Query namespace resolvers
export { UserQueryResolver } from "./admin/UserQueryResolver.js";
export { OrganizationQueryResolver } from "./admin/OrganizationQueryResolver.js";

// Mutation namespace resolvers
export { AuthMutationResolver } from "./admin/AuthMutationResolver.js";
export { UserMutationResolver } from "./admin/UserMutationResolver.js";
export { RoleMutationResolver } from "./admin/RoleMutationResolver.js";
export { OrganizationMutationResolver } from "./admin/OrganizationMutationResolver.js";

// Type resolvers
export { UserResolver } from "./admin/UserResolver.js";
export { OrganizationResolver } from "./admin/OrganizationResolver.js";
export {
  MembershipResolver,
  type MembershipInput,
} from "./admin/MembershipResolver.js";
export { MemberResolver, type MemberInput } from "./admin/MemberResolver.js";
export { RoleResolver, type RoleInput } from "./admin/RoleResolver.js";

// Interfaces
export * from "./admin/interfaces/index.js";
