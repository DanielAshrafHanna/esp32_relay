import type { Pool } from "pg";
import { createId } from "../lib/security.js";
import type { AuthPrincipal } from "../types/domain.js";

export class AuditService {
  constructor(private readonly pool: Pool) {}

  async log(
    principal: AuthPrincipal | null,
    customerId: string | null,
    action: string,
    targetType: string,
    targetId: string,
    payload: Record<string, unknown>,
  ) {
    await this.pool.query(
      `
        insert into audit_logs (
          id, customer_id, user_id, service_account_id, action, target_type, target_id, payload
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
      `,
      [
        createId(),
        customerId,
        principal?.kind === "user" ? principal.subjectId : null,
        principal?.kind === "service_account" ? principal.subjectId : null,
        action,
        targetType,
        targetId,
        JSON.stringify(payload),
      ],
    );
  }
}
