import { randomBytes } from "node:crypto";
import type { Pool } from "pg";
import { AppError } from "../lib/errors.js";
import { createId, hashSecret } from "../lib/security.js";
import type { AuthPrincipal, DeviceCredentialRecord } from "../types/domain.js";
import { AuditService } from "./audit-service.js";
import { assertScope } from "./authz.js";
import { mapDeviceRow } from "./mappers.js";
import { OutputService } from "./output-service.js";

export class ProvisioningService {
  constructor(
    private readonly pool: Pool,
    private readonly outputService: OutputService,
    private readonly auditService: AuditService,
  ) {}

  async issueDeviceCredentials(principal: AuthPrincipal, deviceId: string): Promise<DeviceCredentialRecord & { password: string }> {
    assertScope(principal, "provisioning:write");

    const device = await this.outputService.getDevice(principal, deviceId);
    const customerResult = await this.pool.query("select status from customers where id = $1", [device.customerId]);
    if (!customerResult.rowCount || customerResult.rows[0].status !== "active") {
      throw new AppError("Customer service is suspended", 403, "customer_suspended");
    }

    const credentialId = createId();
    const username = device.mqttHostname;
    const password = randomBytes(18).toString("base64url");

    await this.pool.query(
      `
        update device_credentials
        set status = 'revoked', revoked_at = now()
        where device_id = $1
          and username <> $2
          and status = 'active'
      `,
      [device.id, username],
    );

    const result = await this.pool.query(
      `
        insert into device_credentials (id, device_id, username, password_hash, status, metadata)
        values ($1, $2, $3, $4, 'active', $5::jsonb)
        on conflict (username) do update set
          device_id = excluded.device_id,
          password_hash = excluded.password_hash,
          status = 'active',
          metadata = excluded.metadata,
          revoked_at = null
        returning id, created_at, revoked_at
      `,
      [
        credentialId,
        device.id,
        username,
        hashSecret(password),
        JSON.stringify({ mqtt_hostname: device.mqttHostname, device_key: device.deviceKey }),
      ],
    );

    await this.auditService.log(principal, device.customerId, "device_credentials.issued", "device", device.id, {
      username,
      mqtt_hostname: device.mqttHostname,
    });

    return {
      id: String(result.rows[0].id),
      deviceId: device.id,
      username,
      password,
      status: "active",
      createdAt: String(result.rows[0].created_at ?? new Date().toISOString()),
      revokedAt: result.rows[0].revoked_at ? String(result.rows[0].revoked_at) : null,
    };
  }
}
