export const enum WebhookEvent {
  Push = "push",
  Pull = "pull_request",
  PullClosed = "pull_request_closed",
  PullMetadata = "pull_request_metadata",
  Tag = "tag",
  Release = "release",
  Deploy = "deployment",
  Cron = "cron",
  Manual = "manual",
}

export const enum StatusValue {
  Skipped = "skipped",
  Pending = "pending",
  Running = "running",
  Success = "success",
  Failure = "failure",
  Killed = "killed",
  Error = "error",
  Blocked = "blocked",
  Declined = "declined",
  Created = "created",
}

export const enum ForgeType {
  Github = "github",
  Gitlab = "gitlab",
  Gitea = "gitea",
  Forgejo = "forgejo",
  Bitbucket = "bitbucket",
  BitbucketDatacenter = "bitbucket-dc",
  Addon = "addon",
}

export const enum RepoVisibility {
  Public = "public",
  Private = "private",
  Internal = "internal",
}

export const enum ApprovalMode {
  None = "none",
  Forks = "forks",
  PullRequests = "pull_requests",
  AllEvents = "all_events",
}

export interface TrustedConfiguration {
  network: boolean;
  volumes: boolean;
  security: boolean;
}

export interface Repo {
  id?: number;
  forge_id?: number;
  forge_remote_id?: string;
  org_id?: number;
  owner: string;
  name: string;
  full_name: string;
  avatar_url?: string;
  forge_url?: string;
  clone_url?: string;
  clone_url_ssh?: string;
  default_branch?: string;
  pr_enabled: boolean;
  timeout?: number;
  visibility: RepoVisibility;
  private: boolean;
  trusted: TrustedConfiguration;
  require_approval: ApprovalMode;
  approval_allowed_users: string[];
  active: boolean;
  allow_pr: boolean;
  allow_deploy: boolean;
  config_file: string;
  cancel_previous_pipeline_events: WebhookEvent[];
  netrc_trusted: string[];
  config_extension_endpoint: string;
}

export interface PipelineError {
  type: "linter" | "deprecation" | "compiler" | "generic" | "bad_habit";
  message: string;
  is_warning: boolean;
  data?: unknown;
}

export interface Workflow {
  id: number;
  pipeline_id: number;
  pid: number;
  name: string;
  state: StatusValue;
  error?: string;
  started?: number;
  finished?: number;
  agent_id?: number;
  platform?: string;
  environ?: Record<string, string>;
  axis_id?: number;
  children?: Step[];
}

export type StepType = "clone" | "service" | "plugin" | "commands" | "cache";

export interface Step {
  id: number;
  uuid: string;
  pipeline_id: number;
  pid: number;
  ppid: number;
  name: string;
  state: StatusValue;
  error?: string;
  exit_code: number;
  started?: number;
  finished?: number;
  type?: StepType;
}

export interface Pipeline {
  id: number;
  repo_id?: number;
  number: number;
  author: string;
  parent: number;
  event: WebhookEvent;
  event_reason: string[];
  status: StatusValue;
  errors: PipelineError[];
  created: number;
  updated: number;
  started: number;
  finished: number;
  deploy_to: string;
  deploy_task: string;
  commit: string;
  branch: string;
  ref: string;
  refspec: string;
  title: string;
  message: string;
  timestamp: number;
  sender: string;
  author_avatar: string;
  author_email: string;
  forge_url: string;
  reviewed_by: string;
  reviewed: number;
  workflows?: Workflow[];
  changed_files?: string[];
  variables?: Record<string, string>;
  pr_labels?: string[];
  pr_milestone?: string;
  is_prerelease?: boolean;
  from_fork?: boolean;
}

export interface Netrc {
  machine: string;
  login: string;
  password: string;
  type: ForgeType;
}

export interface ConfigFileDto {
  name: string;
  data: string;
}

export interface ConfigExtensionRequest {
  repo: Repo;
  pipeline: Pipeline;
  netrc: Netrc;
}

export interface ConfigExtensionResponse {
  configs: ConfigFileDto[];
}
