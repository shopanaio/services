export type StringOrStringArray = string | string[];
export type StringMap = Record<string, string>;

export interface WhenConstraint {
  ref?: StringOrStringArray;
  repo?: StringOrStringArray;
  platform?: StringOrStringArray;
  branch?: StringOrStringArray;
  cron?: StringOrStringArray;
  status?: StringOrStringArray;
  event?: StringOrStringArray;
  matrix?: {
    include?: StringMap;
    exclude?: StringMap;
  } | StringMap;
  local?: boolean;
  path?: {
    include?: string[];
    exclude?: string[];
    ignore_message?: string;
    on_empty?: boolean;
  } | string[];
  evaluate?: string;
}

export type When = WhenConstraint | WhenConstraint[];

export interface Workspace {
  base?: string;
  path?: string;
}

export type VolumeEntry = string;

export interface ContainerYaml {
  name?: string;
  image?: string;
  pull?: boolean;
  commands?: StringOrStringArray;
  entrypoint?: StringOrStringArray;
  directory?: string;
  settings?: Record<string, unknown>;
  depends_on?: StringOrStringArray;
  when?: When;
  failure?: string;
  detach?: boolean;
  volumes?: VolumeEntry[];
  ports?: (string | number)[];
  dns?: StringOrStringArray;
  dns_search?: StringOrStringArray;
  backend_options?: Record<string, unknown>;
  environment?: Record<string, string | number | boolean>;
  secrets?: unknown[];
  privileged?: boolean;
  devices?: string[];
  extra_hosts?: string[];
  network_mode?: string;
  tmpfs?: string[];
}

export type ContainerListYaml = ContainerYaml[];

export interface WorkflowYaml {
  $schema?: string;
  variables?: unknown;
  clone?: ContainerListYaml;
  skip_clone?: boolean;
  when?: When;
  steps: ContainerListYaml;
  services?: ContainerListYaml;
  workspace?: Workspace;
  matrix?: {
    include?: Array<Record<string, string | number | boolean>>;
    [dimension: string]: Array<string | number | boolean> | unknown;
  };
  labels?: Record<string, string | number | boolean>;
  depends_on?: string[];
  runs_on?: string[];
}

export function isWorkflowYaml(value: unknown): value is WorkflowYaml {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<WorkflowYaml>;
  return Array.isArray(v.steps);
}
