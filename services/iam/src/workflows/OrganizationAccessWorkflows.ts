import { Injectable } from "@nestjs/common";
import {
  BrokerWorkflows,
  InjectBroker,
  Policy,
  ServiceBroker,
  Workflow,
  WorkflowStep,
} from "@shopana/shared-kernel";
import { Kernel } from "../kernel/Kernel.js";
import {
  AssignRoleScript,
  CreateRolesScript,
  MemberAccessRemoveScript,
  MemberInviteScript,
  MemberRemoveScript,
  MemberRoleChangeScript,
  RoleCreateScript,
  RoleDeleteScript,
  RoleUpdateScript,
} from "../scripts/organization/index.js";
import type {
  AssignRoleParams,
  AssignRoleResult,
} from "../scripts/organization/dto/AssignRoleDto.js";
import type {
  CreateRolesParams,
  CreateRolesResult,
} from "../scripts/organization/dto/CreateRolesDto.js";
import type {
  MemberAccessRemoveParams,
  MemberAccessRemoveResult,
} from "../scripts/organization/dto/MemberAccessRemoveDto.js";
import type {
  MemberInviteParams,
  MemberInviteResult,
} from "../scripts/organization/dto/MemberInviteDto.js";
import type {
  MemberRemoveParams,
  MemberRemoveResult,
} from "../scripts/organization/dto/MemberRemoveDto.js";
import type {
  MemberRoleChangeParams,
  MemberRoleChangeResult,
} from "../scripts/organization/dto/MemberRoleChangeDto.js";
import type {
  RoleCreateParams,
  RoleCreateResult,
} from "../scripts/organization/dto/RoleCreateDto.js";
import type {
  RoleDeleteParams,
  RoleDeleteResult,
} from "../scripts/organization/dto/RoleDeleteDto.js";
import type {
  RoleUpdateParams,
  RoleUpdateResult,
} from "../scripts/organization/dto/RoleUpdateDto.js";

abstract class OrganizationAccessWorkflow extends BrokerWorkflows {
  protected get kernel(): Kernel {
    return Kernel.getInstance();
  }
}

@Injectable()
export class CreateRolesWorkflow extends OrganizationAccessWorkflow {
  constructor(@InjectBroker("iam") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("createRoles")
  @Policy<CreateRolesParams>({
    resource: "org.stores",
    action: "write",
    organizationId: (_self, input) => input.organizationId,
  })
  async run(input: CreateRolesParams): Promise<CreateRolesResult> {
    return this.execute(input);
  }

  @WorkflowStep()
  private execute(input: CreateRolesParams): Promise<CreateRolesResult> {
    return this.kernel.runScript(CreateRolesScript, input);
  }
}

@Injectable()
export class AssignRoleWorkflow extends OrganizationAccessWorkflow {
  constructor(@InjectBroker("iam") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("assignRole")
  @Policy<AssignRoleParams>({
    resource: "org.stores",
    action: "write",
    organizationId: (_self, input) => input.organizationId,
  })
  async run(input: AssignRoleParams): Promise<AssignRoleResult> {
    return this.execute(input);
  }

  @WorkflowStep()
  private execute(input: AssignRoleParams): Promise<AssignRoleResult> {
    return this.kernel.runScript(AssignRoleScript, input);
  }
}

@Injectable()
export class MemberInviteWorkflow extends OrganizationAccessWorkflow {
  constructor(@InjectBroker("iam") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("memberInvite")
  @Policy<MemberInviteParams>({
    resource: "org.members",
    action: "write",
    organizationId: (_self, input) => input.organizationId,
  })
  async run(input: MemberInviteParams): Promise<MemberInviteResult> {
    return this.execute(input);
  }

  @WorkflowStep()
  private execute(input: MemberInviteParams): Promise<MemberInviteResult> {
    return this.kernel.runScript(MemberInviteScript, input);
  }
}

@Injectable()
export class MemberRemoveWorkflow extends OrganizationAccessWorkflow {
  constructor(@InjectBroker("iam") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("memberRemove")
  @Policy<MemberRemoveParams>({
    resource: "org.members",
    action: "admin",
    organizationId: (_self, input) => input.organizationId,
  })
  async run(input: MemberRemoveParams): Promise<MemberRemoveResult> {
    return this.execute(input);
  }

  @WorkflowStep()
  private execute(input: MemberRemoveParams): Promise<MemberRemoveResult> {
    return this.kernel.runScript(MemberRemoveScript, input);
  }
}

@Injectable()
export class MemberRoleChangeWorkflow extends OrganizationAccessWorkflow {
  constructor(@InjectBroker("iam") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("memberRoleChange")
  @Policy<MemberRoleChangeParams>({
    resource: "org.members",
    action: "write",
    organizationId: (_self, input) => input.organizationId,
  })
  async run(input: MemberRoleChangeParams): Promise<MemberRoleChangeResult> {
    return this.execute(input);
  }

  @WorkflowStep()
  private execute(input: MemberRoleChangeParams): Promise<MemberRoleChangeResult> {
    return this.kernel.runScript(MemberRoleChangeScript, input);
  }
}

@Injectable()
export class MemberAccessRemoveWorkflow extends OrganizationAccessWorkflow {
  constructor(@InjectBroker("iam") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("memberAccessRemove")
  @Policy<MemberAccessRemoveParams>({
    resource: "org.members",
    action: "admin",
    organizationId: (_self, input) => input.organizationId,
  })
  async run(input: MemberAccessRemoveParams): Promise<MemberAccessRemoveResult> {
    return this.execute(input);
  }

  @WorkflowStep()
  private execute(input: MemberAccessRemoveParams): Promise<MemberAccessRemoveResult> {
    return this.kernel.runScript(MemberAccessRemoveScript, input);
  }
}

@Injectable()
export class RoleCreateWorkflow extends OrganizationAccessWorkflow {
  constructor(@InjectBroker("iam") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("roleCreate")
  @Policy<RoleCreateParams>({
    resource: "org.roles",
    action: "write",
    organizationId: (_self, input) => input.organizationId,
  })
  async run(input: RoleCreateParams): Promise<RoleCreateResult> {
    return this.execute(input);
  }

  @WorkflowStep()
  private execute(input: RoleCreateParams): Promise<RoleCreateResult> {
    return this.kernel.runScript(RoleCreateScript, input);
  }
}

@Injectable()
export class RoleUpdateWorkflow extends OrganizationAccessWorkflow {
  constructor(@InjectBroker("iam") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("roleUpdate")
  @Policy<RoleUpdateParams>({
    resource: "org.roles",
    action: "write",
    organizationId: (_self, input) => input.organizationId,
  })
  async run(input: RoleUpdateParams): Promise<RoleUpdateResult> {
    return this.execute(input);
  }

  @WorkflowStep()
  private execute(input: RoleUpdateParams): Promise<RoleUpdateResult> {
    return this.kernel.runScript(RoleUpdateScript, input);
  }
}

@Injectable()
export class RoleDeleteWorkflow extends OrganizationAccessWorkflow {
  constructor(@InjectBroker("iam") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("roleDelete")
  @Policy<RoleDeleteParams>({
    resource: "org.roles",
    action: "admin",
    organizationId: (_self, input) => input.organizationId,
  })
  async run(input: RoleDeleteParams): Promise<RoleDeleteResult> {
    return this.execute(input);
  }

  @WorkflowStep()
  private execute(input: RoleDeleteParams): Promise<RoleDeleteResult> {
    return this.kernel.runScript(RoleDeleteScript, input);
  }
}
