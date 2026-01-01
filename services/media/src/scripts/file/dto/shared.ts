export interface UserError {
  message: string;
  field?: string[];
  code?: string;
}

export interface FileResultBase {
  userErrors: UserError[];
}
