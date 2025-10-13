/**
 * Enterprise-ready TypeScript types for Woodpecker Configuration Extension Service.
 * These types mirror the Go server models and the HTTP contract used by Woodpecker
 * to call external configuration services.
 */

// Core enums

/**
 * Events that can trigger a pipeline.
 */
export const enum WebhookEvent {
  /** Push to a branch. */
  Push = 'push',
  /** Pull request opened/synchronized. */
  Pull = 'pull_request',
  /** Pull request closed/merged. */
  PullClosed = 'pull_request_closed',
  /** Pull request metadata update. */
  PullMetadata = 'pull_request_metadata',
  /** Tag pushed. */
  Tag = 'tag',
  /** Release event. */
  Release = 'release',
  /** Manual deployment event. */
  Deploy = 'deployment',
  /** Scheduled cron event. */
  Cron = 'cron',
  /** Manual trigger. */
  Manual = 'manual',
}

/**
 * Pipeline execution status.
 */
export const enum StatusValue {
  /** Skipped due to dependency failure or condition. */
  Skipped = 'skipped',
  /** Pending execution. */
  Pending = 'pending',
  /** Currently running. */
  Running = 'running',
  /** Finished successfully. */
  Success = 'success',
  /** Finished with failure (non-zero exit). */
  Failure = 'failure',
  /** Killed by user. */
  Killed = 'killed',
  /** System/configuration error. */
  Error = 'error',
  /** Waiting for approval. */
  Blocked = 'blocked',
  /** Blocked and declined. */
  Declined = 'declined',
  /** Created (internal use). */
  Created = 'created',
}

/**
 * Forge types supported by Woodpecker.
 */
export const enum ForgeType {
  /** GitHub SaaS/Enterprise. */
  Github = 'github',
  /** GitLab SaaS/Self-Managed. */
  Gitlab = 'gitlab',
  /** Gitea. */
  Gitea = 'gitea',
  /** Forgejo. */
  Forgejo = 'forgejo',
  /** Bitbucket Cloud. */
  Bitbucket = 'bitbucket',
  /** Bitbucket Data Center. */
  BitbucketDatacenter = 'bitbucket-dc',
  /** Addon (custom adaptor). */
  Addon = 'addon',
}

/**
 * Repository visibility scope.
 */
export const enum RepoVisibility {
  /** Visible to everyone. */
  Public = 'public',
  /** Visible only to authorized users. */
  Private = 'private',
  /** Visible within an organization/internal network. */
  Internal = 'internal',
}

/**
 * Approval requirement modes for repository.
 */
export const enum ApprovalMode {
  /** No approvals required. */
  None = 'none',
  /** Require approvals for PRs from forks (default). */
  Forks = 'forks',
  /** Require approvals for all PRs. */
  PullRequests = 'pull_requests',
  /** Require approvals for all external events. */
  AllEvents = 'all_events',
}

// Core models

/**
 * Trusted configuration capabilities enabled for a repository.
 */
export interface TrustedConfiguration {
  /** Allow network access for this repository's pipelines. */
  network: boolean;
  /** Allow volume mounts for this repository's pipelines. */
  volumes: boolean;
  /** Allow elevated/security-sensitive features (e.g., privileged containers). */
  security: boolean;
}

/**
 * Repository metadata model mirrored from Woodpecker server.
 */
export interface Repo {
  /** Repository ID (internal, auto-increment). */
  id?: number; // xorm: autoincr
  /** Associated forge ID (internal). */
  forge_id?: number;
  /** Repository ID on the forge side (string to preserve formatting). */
  forge_remote_id?: string;
  /** Organization/namespace ID (internal). */
  org_id?: number;
  /** Repository owner or namespace. */
  owner: string;
  /** Repository name. */
  name: string;
  /** Full repository name (owner/name). */
  full_name: string;
  /** Repository avatar URL. */
  avatar_url?: string;
  /** Forge web URL of the repository. */
  forge_url?: string;
  /** Git HTTP(S) clone URL. */
  clone_url?: string;
  /** Git SSH clone URL. */
  clone_url_ssh?: string;
  /** Default branch name. */
  default_branch?: string;
  /** Whether PR pipelines are enabled. */
  pr_enabled: boolean;
  /** Pipeline timeout in minutes. */
  timeout?: number;
  /** Repository visibility. */
  visibility: RepoVisibility;
  /** Whether the forge marks the repository as private. */
  private: boolean; // IsSCMPrivate
  /** Trusted features enabled for this repository. */
  trusted: TrustedConfiguration;
  /** Approval requirement mode for external events. */
  require_approval: ApprovalMode;
  /** List of users allowed to approve when approvals are required. */
  approval_allowed_users: string[];
  /** Whether repository is active in Woodpecker. */
  active: boolean;
  /** Allow pipelines triggered by pull requests. */
  allow_pr: boolean; // AllowPull
  /** Allow deployment pipelines. */
  allow_deploy: boolean; // AllowDeploy
  /** Path to the repository's primary configuration file. */
  config_file: string; // path
  // hash intentionally omitted from payload contract
  /** Events for which previous pipelines should be canceled. */
  cancel_previous_pipeline_events: WebhookEvent[];
  /** List of plugin images that are trusted to receive netrc credentials. */
  netrc_trusted: string[];
  /** HTTP endpoint of a repository-scoped configuration extension. */
  config_extension_endpoint: string;
}

/**
 * A strongly typed pipeline error item.
 */
export interface PipelineError {
  /** Error category. */
  type: 'linter' | 'deprecation' | 'compiler' | 'generic' | 'bad_habit';
  /** Human-readable error message. */
  message: string;
  /** Whether this error is a warning (non-fatal). */
  is_warning: boolean;
  /** Optional structured data with error details. */
  data?: unknown;
}

/**
 * Workflow execution stage within a pipeline.
 */
export interface Workflow {
  /** Workflow ID. */
  id: number;
  /** Associated pipeline ID. */
  pipeline_id: number;
  /** Process ID within pipeline. */
  pid: number;
  /** Workflow human-readable name. */
  name: string;
  /** Current workflow status. */
  state: StatusValue;
  /** Error message if failed. */
  error?: string;
  /** UNIX seconds when started. */
  started?: number;
  /** UNIX seconds when finished. */
  finished?: number;
  /** Agent identifier that executed the workflow. */
  agent_id?: number;
  /** Target platform (e.g., linux/amd64). */
  platform?: string;
  /** Environment variables for the workflow. */
  environ?: Record<string, string>;
  /** Axis identifier for matrix builds. */
  axis_id?: number;
  /** Child steps belonging to this workflow. */
  children?: Step[];
}

/**
 * Type of a step within a workflow.
 */
export type StepType = 'clone' | 'service' | 'plugin' | 'commands' | 'cache';

/**
 * A single step within a workflow.
 */
export interface Step {
  /** Step ID. */
  id: number;
  /** Step UUID for cross-system correlation. */
  uuid: string;
  /** Associated pipeline ID. */
  pipeline_id: number;
  /** Process ID of this step. */
  pid: number;
  /** Parent process ID. */
  ppid: number;
  /** Step name. */
  name: string;
  /** Current step status. */
  state: StatusValue;
  /** Error message if failed. */
  error?: string;
  /** Exit code of the step process. */
  exit_code: number;
  /** UNIX seconds when started. */
  started?: number;
  /** UNIX seconds when finished. */
  finished?: number;
  /** Optional step type. */
  type?: StepType;
}

/**
 * Pipeline entity representing a CI execution with metadata.
 */
export interface Pipeline {
  /** Pipeline ID. */
  id: number;
  /** Repository ID to which this pipeline belongs. */
  repo_id?: number;
  /** Sequential pipeline number. */
  number: number;
  /** Author (committer) username. */
  author: string;
  /** Parent pipeline number for rebuilds. */
  parent: number;
  /** Event that triggered the pipeline. */
  event: WebhookEvent;
  /** Reasons/categories for event. */
  event_reason: string[];
  /** Current pipeline status. */
  status: StatusValue;
  /** List of errors collected during processing. */
  errors: PipelineError[];
  /** UNIX seconds when created. */
  created: number;
  /** UNIX seconds when updated. */
  updated: number;
  /** UNIX seconds when started. */
  started: number;
  /** UNIX seconds when finished. */
  finished: number;
  /** Deployment target environment (if any). */
  deploy_to: string;
  /** Deployment task identifier or name. */
  deploy_task: string;
  /** Commit SHA. */
  commit: string;
  /** Branch name. */
  branch: string;
  /** Git ref (e.g., refs/heads/main). */
  ref: string;
  /** RefSpec used by git fetch. */
  refspec: string;
  /** Commit title. */
  title: string;
  /** Commit message body. */
  message: string;
  /** Commit timestamp (UNIX seconds). */
  timestamp: number;
  /** Sender (user who triggered the event). */
  sender: string;
  /** Author avatar URL. */
  author_avatar: string;
  /** Author email address. */
  author_email: string;
  /** Forge URL of the commit or pipeline. */
  forge_url: string;
  /** Reviewer username (if reviewed). */
  reviewed_by: string;
  /** UNIX seconds when reviewed. */
  reviewed: number;
  /** Optional list of workflows belonging to the pipeline. */
  workflows?: Workflow[];
  /** Files changed in the commit or PR. */
  changed_files?: string[];
  /** Additional key-value variables. */
  variables?: Record<string, string>;
  /** Pull request labels. */
  pr_labels?: string[];
  /** Pull request milestone. */
  pr_milestone?: string;
  /** Whether the release is marked as pre-release. */
  is_prerelease?: boolean;
  /** Whether the pipeline was triggered from a fork. */
  from_fork?: boolean;
}

/**
 * Netrc credentials used to access the repository.
 */
export interface Netrc {
  /** Machine/host for authentication. */
  machine: string;
  /** Username for authentication. */
  login: string;
  /** Password or token for authentication. */
  password: string;
  /** Forge type used to construct scopes/behavior. */
  type: ForgeType;
}

// DTOs (HTTP contract)

/**
 * A configuration file unit returned by the extension.
 */
export interface ConfigFileDto {
  /** Filename for the configuration (used as identifier). */
  name: string; // filename
  /** YAML content of the configuration. */
  data: string; // YAML content
}

/**
 * Request payload sent by Woodpecker to the external configuration service.
 */
export interface ConfigExtensionRequest {
  /** Repository metadata. */
  repo: Repo;
  /** Pipeline metadata for the current run. */
  pipeline: Pipeline;
  /** Netrc credentials to access repository/forge. */
  netrc: Netrc;
  // Woodpecker currently sends old configs internally, but the external HTTP
  // contract forwards only repo/pipeline/netrc in the request body. If needed,
  // you can extend the service to accept configs as well.
}

/**
 * Response payload expected from the external configuration service.
 * If you do not want to modify the existing configs, respond with HTTP 204.
 */
export interface ConfigExtensionResponse {
  /** List of configuration files to apply (in order). */
  configs: ConfigFileDto[];
}

// Type guards for runtime validation

/**
 * Runtime validator for ConfigFileDto values.
 * @param value - Unknown value to validate
 * @returns True if value conforms to ConfigFileDto
 */
export function isConfigFileDto(value: unknown): value is ConfigFileDto {
  const v = value as ConfigFileDto;
  return (
    !!v &&
    typeof v.name === 'string' &&
    typeof v.data === 'string'
  );
}

/**
 * Runtime validator for ConfigExtensionResponse values.
 * @param value - Unknown value to validate
 * @returns True if value conforms to ConfigExtensionResponse
 */
export function isConfigExtensionResponse(value: unknown): value is ConfigExtensionResponse {
  const v = value as ConfigExtensionResponse;
  return (
    !!v &&
    Array.isArray(v.configs) &&
    v.configs.every(isConfigFileDto)
  );
}
