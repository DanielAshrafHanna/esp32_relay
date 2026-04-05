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
    const username = `${device.deviceKey}_${randomBytes(4).toString("hex")}`;
    const password = randomBytes(18).toString("base64url");

    await this.pool.query(
      `
        insert into device_credentials (id, device_id, username, password_hash, status, metadata)
        values ($1, $2, $3, $4, 'active', '{}'::jsonb)
      `,
      [credentialId, device.id, username, hashSecret(password)],
    );

    await this.auditService.log(principal, device.customerId, "device_credentials.issued", "device", device.id, {
      username,
    });

    return {
      id: credentialId,
      deviceId: device.id,
      username,
      password,
      status: "active",
      createdAt: new Date().toISOString(),
      revokedAt: null,
    };
  }
}
