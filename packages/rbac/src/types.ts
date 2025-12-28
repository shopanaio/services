export type Domain = string;
export type Resource = string;
export type Action = string;

export interface Permission {
  resource: string;
  actions: string[];
}

export interface Role {
  domain: string;
  permissions: Permission[];
}

export interface RoleDefinition {
  permissions: Permission[];
}

export interface Policy {
  subject: string;
  domain: string;
  resource: string;
  action: string;
}
