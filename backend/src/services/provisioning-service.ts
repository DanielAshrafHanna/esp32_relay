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

  async createBoard(
    principal: AuthPrincipal,
    input: {
      customerId?: string;
      siteId?: string | null;
      deviceKey?: string;
      mqttHostname: string;
      displayName?: string;
      transportVersion?: "legacy_ha" | "solace_v1";
      channelCount?: number;
    },
  ) {
    assertScope(principal, "provisioning:write");

    const mqttHostname = normalizeIdentifier(input.mqttHostname);
    if (!mqttHostname) {
      throw new AppError("mqtt_hostname is required", 400, "missing_mqtt_hostname");
    }

    const deviceKey = normalizeIdentifier(input.deviceKey || mqttHostname);
    if (!deviceKey) {
      throw new AppError("device_key is required", 400, "missing_device_key");
    }

    const channelCount = input.channelCount ?? 8;
    if (!Number.isInteger(channelCount) || channelCount < 1 || channelCount > 8) {
      throw new AppError("channel_count must be between 1 and 8", 400, "invalid_channel_count");
    }

    const device = await this.outputService.createDevice(principal, {
      customerId: input.customerId,
      siteId: input.siteId,
      deviceKey,
      mqttHostname,
      displayName: input.displayName,
      transportVersion: input.transportVersion ?? "legacy_ha",
    });

    const outputs = await this.outputService.bulkConfigureDeviceOutputs(
      principal,
      device.id,
      Array.from({ length: channelCount }, (_, index) => ({
        channel: index + 1,
        profileType: "generic_relay",
      })),
    );

    const credentials = await this.issueDeviceCredentials(principal, device.id);

    await this.auditService.log(principal, device.customerId, "device.created", "device", device.id, {
      device_key: device.deviceKey,
      mqtt_hostname: device.mqttHostname,
      channel_count: channelCount,
    });

    return {
      device,
      outputs,
      credentials,
      mqttBootstrapEntry: `${credentials.username}:${credentials.password}`,
    };
  }
}

function normalizeIdentifier(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-");
}
