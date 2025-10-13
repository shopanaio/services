/**
 * Strong TypeScript typings for Woodpecker pipeline YAML structure (data field).
 * Mirrors the Go types under pipeline/frontend/yaml/types and schema.json.
 */

/** String or array of strings as accepted by YAML. */
export type StringOrStringArray = string | string[];

/** Key-value map with string values only. */
export type StringMap = Record<string, string>;

/**
 * Workflow-level conditions controlling when the workflow runs.
 * This is a simplified representation aligning with common YAML usage.
 */
export interface WhenConstraint {
  /** Allowed refs (e.g., branches/tags ref). */
  ref?: StringOrStringArray;
  /** Allowed repositories in owner/name format. */
  repo?: StringOrStringArray;
  /** Allowed platform identifiers. */
  platform?: StringOrStringArray;
  /** Allowed branches (ignored for tag events). */
  branch?: StringOrStringArray;
  /** Allowed cron names. */
  cron?: StringOrStringArray;
  /** Allowed status values (success/failure). */
  status?: StringOrStringArray;
  /** Allowed events (push, pull_request, tag, release, deployment, cron, manual). */
  event?: StringOrStringArray;
  /** Matrix include/exclude via key-value pairs. */
  matrix?: {
    include?: StringMap;
    exclude?: StringMap;
  } | StringMap;
  /** Local execution flag. */
  local?: boolean;
  /** Changed file path filters. */
  path?: {
    include?: string[];
    exclude?: string[];
    ignore_message?: string;
    on_empty?: boolean;
  } | string[];
  /** Boolean expression evaluated with env; returns true to run. */
  evaluate?: string;
}

/** When may be a single constraint or a list of constraints (OR-semantics). */
export type When = WhenConstraint | WhenConstraint[];

/** Workspace settings. */
export interface Workspace {
  /** Base path inside container. */
  base?: string;
  /** Relative path for repository checkout. */
  path?: string;
}

/** Volumes can be specified as string entries "src:dst[:mode]". */
export type VolumeEntry = string;

/**
 * A single step/service/clone container definition.
 * Follows pipeline/frontend/yaml/types/container.go
 */
export interface ContainerYaml {
  /** Step name. */
  name?: string;
  /** Image name with optional tag. */
  image?: string;
  /** Always pull latest image. */
  pull?: boolean;
  /** Shell commands to execute. */
  commands?: StringOrStringArray;
  /** Entrypoint override. */
  entrypoint?: StringOrStringArray;
  /** Working directory. */
  directory?: string;
  /** Plugin settings or arbitrary inputs. */
  settings?: Record<string, unknown>;

  // flow control
  /** Dependencies by step name. */
  depends_on?: StringOrStringArray;
  /** Per-step filters. */
  when?: When;
  /** Failure strategy (e.g., "fail" or "ignore"). */
  failure?: string;
  /** Run detached (service-like). */
  detach?: boolean;

  // state
  /** Volumes mount list in "src:dst[:mode]" format. */
  volumes?: VolumeEntry[];

  // network
  /** Exposed ports (host:container, or numeric). */
  ports?: (string | number)[];
  /** DNS servers. */
  dns?: StringOrStringArray;
  /** DNS search domains. */
  dns_search?: StringOrStringArray;

  // backend specific
  /** Backend-specific options (docker/k8s/local). */
  backend_options?: Record<string, unknown>;

  // environment
  /** Environment variables. */
  environment?: Record<string, string | number | boolean>;

  // legacy / transitional
  /** Deprecated: plugin secrets, kept for compatibility. */
  secrets?: unknown[];

  // docker/k8s specifics
  /** Privileged mode. */
  privileged?: boolean;
  /** Device mappings. */
  devices?: string[];
  /** Extra hosts entries. */
  extra_hosts?: string[];
  /** Network mode (docker-only). */
  network_mode?: string;
  /** Tmpfs mount points. */
  tmpfs?: string[];
}

/** A list of containers (clone, steps, services). */
export type ContainerListYaml = ContainerYaml[];

/**
 * Root workflow YAML structure that must be provided in ConfigFileDTO.data.
 * Aligns with schema.json and Workflow struct.
 */
export interface WorkflowYaml {
  /** Optional JSON schema URL. */
  $schema?: string;
  /** Variables via YAML anchors/aliases (free-form). */
  variables?: unknown;
  /** Clone configuration (usually a single clone step). */
  clone?: ContainerListYaml;
  /** Skip automatic clone step. */
  skip_clone?: boolean;
  /** Global conditions for when the workflow runs. */
  when?: When;
  /** Required list of build steps. */
  steps: ContainerListYaml;
  /** Optional list of long-running services. */
  services?: ContainerListYaml;
  /** Workspace configuration. */
  workspace?: Workspace;
  /** Matrix configuration for multi-builds. */
  matrix?: {
    include?: Array<Record<string, string | number | boolean>>;
    [dimension: string]: Array<string | number | boolean> | unknown;
  };
  /** Agent selection labels. */
  labels?: Record<string, string | number | boolean>;
  /** Workflow-level dependencies (other files). */
  depends_on?: string[];
  /** Agent selectors. */
  runs_on?: string[];
}

/**
 * Narrow check that a value looks like a valid WorkflowYaml (minimal shape).
 * Use schema validation for complete checks.
 */
export function isWorkflowYaml(value: unknown): value is WorkflowYaml {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<WorkflowYaml>;
  return Array.isArray(v.steps);
}
