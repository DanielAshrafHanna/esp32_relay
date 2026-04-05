import type { Pool } from "pg";
import { getEnv } from "../config/env.js";
import { UnauthorizedError } from "../lib/errors.js";
import { hashApiToken, signJwt, verifyJwt, verifySecret } from "../lib/security.js";
import type { AuthPrincipal } from "../types/domain.js";

interface LoginResult {
  token: string;
  principal: AuthPrincipal;
}

export class AuthService {
  private readonly env = getEnv();

  constructor(private readonly pool: Pool) {}

  async login(email: string, password: string): Promise<LoginResult> {
    const result = await this.pool.query(
      `
        select
          u.id,
          u.email,
          u.display_name,
          u.password_hash,
          u.status,
          coalesce(
            json_object_agg(cm.customer_id, cm.role) filter (where cm.customer_id is not null),
            '{}'::json
          ) as memberships
        from users u
        left join customer_memberships cm on cm.user_id = u.id
        where lower(u.email) = lower($1)
        group by u.id
      `,
      [email],
    );

    if (!result.rowCount) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const row = result.rows[0];
    if (row.status !== "active" || !verifySecret(password, row.password_hash)) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const memberships = row.memberships as Record<string, string>;
    const principal: AuthPrincipal = {
      kind: "user",
      subjectId: row.id as string,
      customerIds: Object.keys(memberships),
      memberships,
      scopes: ["native:read", "native:write", "compat:write", "provisioning:write"],
      email: row.email as string,
      displayName: row.display_name as string,
    };

    const token = signJwt(
      {
        sub: principal.subjectId,
        kind: principal.kind,
        customer_ids: principal.customerIds,
        scopes: principal.scopes,
        email: principal.email,
        display_name: principal.displayName,
      },
      this.env.jwtSecret,
      this.env.jwtIssuer,
      this.env.jwtExpirySeconds,
    );

    return {
      token,
      principal,
    };
  }

  async authenticate(authorizationHeader?: string): Promise<AuthPrincipal> {
    if (!authorizationHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedError();
    }

    const token = authorizationHeader.slice("Bearer ".length).trim();

    try {
      const payload = verifyJwt(token, this.env.jwtSecret, this.env.jwtIssuer);
      return {
        kind: payload.kind,
        subjectId: payload.sub,
        customerIds: payload.customer_ids,
        scopes: payload.scopes,
        email: payload.email,
        displayName: payload.display_name,
      };
    } catch {
      return this.authenticateServiceAccountToken(token);
    }
  }

  private async authenticateServiceAccountToken(token: string): Promise<AuthPrincipal> {
    const result = await this.pool.query(
      `
        update service_accounts
        set last_used_at = now()
        where token_hash = $1 and status = 'active'
        returning id, customer_id, name, scopes
      `,
      [hashApiToken(token)],
    );

    if (!result.rowCount) {
      throw new UnauthorizedError();
    }

    const row = result.rows[0];
    return {
      kind: "service_account",
      subjectId: row.id as string,
      customerIds: [row.customer_id as string],
      scopes: (row.scopes as string[]) ?? [],
      displayName: row.name as string,
    };
  }
}
