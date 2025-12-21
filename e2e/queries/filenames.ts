export type GraphQLFileName =
  // users-api
  | 'users-api/SignUp'
  | 'users-api/SignIn'
  | 'users-api/UserCurrent'
  // project-api
  | 'project-api/ProjectCreate'
  | 'project-api/Project'
  | 'project-api/Projects'
  | 'project-api/ProjectRoles'
  | 'project-api/ProjectMembers'
  | 'project-api/ProjectAvailableResources'
  // roles-api
  | 'roles-api/RoleCreate'
  | 'roles-api/RoleUpdate'
  | 'roles-api/RoleDelete'
  | 'roles-api/ProjectMemberRoleChange'
  | 'roles-api/ProjectMemberRemove'
  | 'roles-api/Authorize'; // template
