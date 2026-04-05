import type { Pool } from "pg";
import { getEnv } from "../config/env.js";
import { buildCompatibilityPlan, buildNativePlan } from "../domain/actions.js";
import { AppError, ConflictError, NotFoundError } from "../lib/errors.js";
import { createId } from "../lib/security.js";
import type {
  AuthPrincipal,
  CommandPlan,
  CommandRecord,
  CompatibilityDomain,
  CompatibilityService,
  NativeAction,
  OutputRecord,
} from "../types/domain.js";
import { AuditService } from "./audit-service.js";
import { assertCustomerAccess, assertScope } from "./authz.js";
import { mapCommandRow } from "./mappers.js";
import { OutputService } from "./output-service.js";

export class CommandService {
  private readonly env = getEnv();

  constructor(
    private readonly pool: Pool,
    private readonly outputService: OutputService,
    private readonly auditService: AuditService,
  ) {}

  async createNativeCommand(
    principal: AuthPrincipal,
    outputId: string,
    action: NativeAction,
    durationMs?: number,
    clientRequestId?: string,
  ): Promise<CommandRecord> {
    assertScope(principal, "native:write");

    const output = await this.outputService.getOutput(principal, outputId);
    return this.insertCommand(
      principal,
      output,
      buildNativePlan(output, action, output.lastKnownState, durationMs),
      "native_api",
      clientRequestId ?? null,
    );
  }

  async createCompatibilityCommand(
    principal: AuthPrincipal,
    domain: CompatibilityDomain,
    service: CompatibilityService,
    entityId: string,
  ): Promise<CommandRecord> {
    assertScope(principal, "compat:write");

    const output = await this.outputService.findByCompatEntity(principal, entityId);
    return this.insertCommand(
      principal,
      output,
      buildCompatibilityPlan(output, domain, service, output.lastKnownState),
      "compat_ha",
      null,
    );
  }

  async getCommand(principal: AuthPrincipal, commandId: string): Promise<CommandRecord> {
    const result = await this.pool.query(
      `
        select *
        from commands
        where id = $1
      `,
      [commandId],
    );

    if (!result.rowCount) {
      throw new NotFoundError("Command not found");
    }

    const command = mapCommandRow(result.rows[0]);
    assertCustomerAccess(principal, command.customerId);
    return command;
  }

  private async insertCommand(
    principal: AuthPrincipal,
    output: OutputRecord,
    plan: CommandPlan,
    sourceType: CommandRecord["sourceType"],
    clientRequestId: string | null,
  ): Promise<CommandRecord> {
    if (output.customerStatus !== "active") {
      throw new AppError("Customer service is suspended", 403, "customer_suspended");
    }

    await this.pool.query(
      `
        update commands
        set
          status = 'timed_out',
          last_error = coalesce(last_error, 'Expired before a new command was accepted'),
          completed_at = coalesce(completed_at, now())
        where output_id = $1
          and (
            (status = 'waiting_state' and step_timeout_at is not null and step_timeout_at < now())
            or
            (status = 'queued' and deadline_at is not null and deadline_at < now())
          )
      `,
      [output.id],
    );

    const inflight = await this.pool.query(
      `
        select 1
        from commands
        where output_id = $1
          and status in ('queued', 'waiting_state')
        limit 1
      `,
      [output.id],
    );

    if (inflight.rowCount) {
      throw new ConflictError("Output already has an in-flight command");
    }

    const commandId = createId();
    const result = await this.pool.query(
      `
        insert into commands (
          id, customer_id, output_id, source_type, source_id, client_request_id,
          logical_action, requested_state, requested_duration_ms, status, transport_version,
          steps, current_step, next_step_at, deadline_at, result_payload
        )
        values (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, 'queued', $10,
          $11::jsonb, 0, now(), now() + ($12 || ' milliseconds')::interval, $13::jsonb
        )
        returning *
      `,
      [
        commandId,
        output.customerId,
        output.id,
        sourceType,
        principal.subjectId,
        clientRequestId,
        plan.logicalAction,
        plan.requestedState,
        plan.requestedDurationMs,
        plan.transportVersion,
        JSON.stringify(plan.steps),
        this.env.commandStepTimeoutMs * Math.max(1, plan.steps.length + 1),
        JSON.stringify({
          output_id: output.id,
          output_name: output.displayName,
          expected_final_state: plan.expectedFinalState,
        }),
      ],
    );

    await this.auditService.log(principal, output.customerId, "command.created", "command", commandId, {
      output_id: output.id,
      output_name: output.displayName,
      source_type: sourceType,
      logical_action: plan.logicalAction,
      expected_final_state: plan.expectedFinalState,
      steps: plan.steps,
    });

    return mapCommandRow(result.rows[0]);
  }
}
