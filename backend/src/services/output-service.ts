import type { Pool } from "pg";
import { AppError, NotFoundError } from "../lib/errors.js";
import type { AuthPrincipal, DeviceRecord, OutputRecord, SiteRecord } from "../types/domain.js";
import { resolveOutputProfileConfig } from "../domain/output-profiles.js";
import { createId } from "../lib/security.js";
import { assertCustomerAccess, assertScope } from "./authz.js";
import { mapDeviceRow, mapOutputRow } from "./mappers.js";

const OUTPUT_SELECT = `
  select
    o.id,
    d.customer_id,
    o.device_id,
    d.device_key,
    coalesce(nullif(d.metadata->>'display_name', ''), d.mqtt_hostname, d.device_key) as device_display_name,
    d.desired_enabled as device_desired_enabled,
    d.mqtt_hostname,
    d.transport_version,
    o.channel,
    o.profile_type,
    o.display_name,
    o.pulse_ms,
    o.invert_relay,
    o.default_state,
    o.allowed_actions,
    o.compat_domain,
    o.compat_entity_id,
    o.service_map,
    c.status as customer_status,
    coalesce(s.last_state, 'UNKNOWN') as last_known_state,
    s.updated_at as last_state_at
  from device_outputs o
  join devices d on d.id = o.device_id
  join customers c on c.id = d.customer_id
  left join output_state_snapshots s on s.output_id = o.id
`;

export class OutputService {
  constructor(private readonly pool: Pool) {}

  async createDevice(
    principal: AuthPrincipal,
    input: {
      customerId?: string;
      siteId?: string | null;
      deviceKey: string;
      mqttHostname: string;
      displayName?: string;
      transportVersion?: DeviceRecord["transportVersion"];
    },
  ): Promise<DeviceRecord> {
    const customerId = this.resolveCustomerId(principal, input.customerId);

    const customerResult = await this.pool.query("select status from customers where id = $1", [customerId]);
    if (!customerResult.rowCount) {
      throw new NotFoundError("Customer not found");
    }
    if (customerResult.rows[0].status !== "active") {
      throw new AppError("Customer service is suspended", 403, "customer_suspended");
    }

    let siteId: string | null = input.siteId ?? null;
    if (siteId) {
      const siteResult = await this.pool.query("select id from sites where id = $1 and customer_id = $2", [siteId, customerId]);
      if (!siteResult.rowCount) {
        throw new AppError("Site not found for customer", 400, "invalid_site");
      }
    } else {
      const siteResult = await this.pool.query(
        "select id from sites where customer_id = $1 order by created_at asc limit 1",
        [customerId],
      );
      siteId = siteResult.rowCount ? String(siteResult.rows[0].id) : null;
    }

    const deviceId = createId();

    try {
      await this.pool.query(
        `
          insert into devices (
            id, customer_id, site_id, device_key, mqtt_hostname, transport_version, metadata
          )
          values ($1, $2, $3, $4, $5, $6, $7::jsonb)
        `,
        [
          deviceId,
          customerId,
          siteId,
          input.deviceKey,
          input.mqttHostname,
          input.transportVersion ?? "legacy_ha",
          JSON.stringify(input.displayName ? { display_name: input.displayName.trim() } : {}),
        ],
      );
    } catch (error) {
      if (typeof error === "object" && error && "code" in error && error.code === "23505") {
        throw new AppError("A device with this key or MQTT hostname already exists", 409, "device_conflict");
      }
      throw error;
    }

    return this.getDevice(principal, deviceId);
  }

  async listDevices(principal: AuthPrincipal): Promise<DeviceRecord[]> {
    const result = await this.pool.query(
      `
        select
          devices.id,
          devices.customer_id,
          devices.site_id,
          devices.device_key,
          devices.mqtt_hostname,
          devices.transport_version,
          devices.firmware_version,
          c.name as customer_name,
          s.name as site_name,
          coalesce(nullif(devices.metadata->>'display_name', ''), devices.mqtt_hostname, devices.device_key) as display_name,
          devices.active,
          devices.desired_enabled,
          devices.availability,
          devices.last_seen_at,
          devices.metadata
        from devices
        join customers c on c.id = devices.customer_id
        left join sites s on s.id = devices.site_id
        where devices.customer_id = any($1::uuid[])
        order by devices.device_key
      `,
      [principal.customerIds],
    );

    return result.rows.map((row) => mapDeviceRow(row as Record<string, unknown>));
  }

  async listSites(principal: AuthPrincipal): Promise<SiteRecord[]> {
    const result = await this.pool.query(
      `
        select
          s.id,
          s.customer_id,
          c.name as customer_name,
          s.name
        from sites s
        join customers c on c.id = s.customer_id
        where s.customer_id = any($1::uuid[])
        order by c.name asc, s.name asc
      `,
      [principal.customerIds],
    );

    return result.rows.map((row) => ({
      id: String(row.id),
      customerId: String(row.customer_id),
      customerName: row.customer_name ? String(row.customer_name) : null,
      name: String(row.name),
    }));
  }

  async createSite(
    principal: AuthPrincipal,
    input: { customerId?: string; name: string },
  ): Promise<SiteRecord> {
    assertScope(principal, "provisioning:write");

    const customerId = this.resolveCustomerId(principal, input.customerId);
    const name = input.name.trim();
    if (!name) {
      throw new AppError("Site name is required", 400, "missing_site_name");
    }

    const customerResult = await this.pool.query("select name from customers where id = $1", [customerId]);
    if (!customerResult.rowCount) {
      throw new NotFoundError("Customer not found");
    }

    try {
      const result = await this.pool.query(
        `
          insert into sites (id, customer_id, name)
          values ($1, $2, $3)
          returning id, customer_id, name
        `,
        [createId(), customerId, name],
      );

      return {
        id: String(result.rows[0].id),
        customerId: String(result.rows[0].customer_id),
        customerName: String(customerResult.rows[0].name),
        name: String(result.rows[0].name),
      };
    } catch (error) {
      if (typeof error === "object" && error && "code" in error && error.code === "23505") {
        throw new AppError("A site with this name already exists for the customer", 409, "site_conflict");
      }
      throw error;
    }
  }

  async getDevice(principal: AuthPrincipal, deviceId: string): Promise<DeviceRecord> {
    const result = await this.pool.query(
      `
        select
          devices.id,
          devices.customer_id,
          devices.site_id,
          devices.device_key,
          devices.mqtt_hostname,
          devices.transport_version,
          devices.firmware_version,
          c.name as customer_name,
          s.name as site_name,
          coalesce(nullif(devices.metadata->>'display_name', ''), devices.mqtt_hostname, devices.device_key) as display_name,
          devices.active,
          devices.desired_enabled,
          devices.availability,
          devices.last_seen_at,
          devices.metadata
        from devices
        join customers c on c.id = devices.customer_id
        left join sites s on s.id = devices.site_id
        where devices.id = $1
      `,
      [deviceId],
    );

    if (!result.rowCount) {
      throw new NotFoundError("Device not found");
    }

    const device = mapDeviceRow(result.rows[0]);
    assertCustomerAccess(principal, device.customerId);
    return device;
  }

  async listOutputs(principal: AuthPrincipal): Promise<OutputRecord[]> {
    const result = await this.pool.query(
      `${OUTPUT_SELECT}
       where d.customer_id = any($1::uuid[])
       order by d.device_key, o.channel`,
      [principal.customerIds],
    );

    return result.rows.map((row) => mapOutputRow(row as Record<string, unknown>));
  }

  async getOutput(principal: AuthPrincipal, outputId: string): Promise<OutputRecord> {
    const output = await this.getOutputById(outputId);
    assertCustomerAccess(principal, output.customerId);
    return output;
  }

  async getOutputById(outputId: string): Promise<OutputRecord> {
    const result = await this.pool.query(
      `${OUTPUT_SELECT} where o.id = $1`,
      [outputId],
    );

    if (!result.rowCount) {
      throw new NotFoundError("Output not found");
    }

    return mapOutputRow(result.rows[0]);
  }

  async findByCompatEntity(principal: AuthPrincipal, entityId: string): Promise<OutputRecord> {
    const result = await this.pool.query(
      `
        ${OUTPUT_SELECT}
        left join output_aliases oa on oa.output_id = o.id
        where (o.compat_entity_id = $1 or oa.alias_value = $1)
        limit 1
      `,
      [entityId],
    );

    if (!result.rowCount) {
      throw new NotFoundError(`No output mapped for entity '${entityId}'`);
    }

    const output = mapOutputRow(result.rows[0]);
    assertCustomerAccess(principal, output.customerId);
    return output;
  }

  async updateProfile(
    principal: AuthPrincipal,
    outputId: string,
    input: Partial<
      Pick<
        OutputRecord,
        "profileType" | "displayName" | "pulseMs" | "invertRelay" | "defaultState" | "compatDomain" | "compatEntityId"
      > & { allowedActions: string[]; serviceMap: Record<string, string> }
    >,
  ): Promise<OutputRecord> {
    const output = await this.getOutput(principal, outputId);
    const resolved = resolveOutputProfileConfig({
      deviceKey: output.deviceKey,
      entityNamespace: output.mqttHostname,
      channel: output.channel,
      existing: output,
      profileType: input.profileType,
      displayName: input.displayName,
      pulseMs: input.pulseMs,
      invertRelay: input.invertRelay,
      defaultState: input.defaultState,
      compatDomain: input.compatDomain ?? undefined,
      compatEntityId: input.compatEntityId ?? undefined,
      allowedActions: input.allowedActions,
      serviceMap: input.serviceMap,
    });

    const result = await this.pool.query(
      `
        update device_outputs
        set
          profile_type = coalesce($2, profile_type),
          display_name = coalesce($3, display_name),
          pulse_ms = $4,
          invert_relay = coalesce($5, invert_relay),
          default_state = coalesce($6, default_state),
          allowed_actions = coalesce($7::jsonb, allowed_actions),
          compat_domain = $8,
          compat_entity_id = $9,
          service_map = coalesce($10::jsonb, service_map),
          updated_at = now()
        where id = $1
        returning id
      `,
      [
        output.id,
        resolved.profileType,
        resolved.displayName,
        resolved.pulseMs,
        resolved.invertRelay,
        resolved.defaultState,
        JSON.stringify(resolved.allowedActions),
        resolved.compatDomain,
        resolved.compatEntityId,
        JSON.stringify(resolved.serviceMap),
      ],
    );

    if (!result.rowCount) {
      throw new NotFoundError("Output not found");
    }

    return this.getOutputById(output.id);
  }

  async bulkConfigureDeviceOutputs(
    principal: AuthPrincipal,
    deviceId: string,
    configs: Array<
      Partial<
        Pick<
          OutputRecord,
          "profileType" | "displayName" | "pulseMs" | "invertRelay" | "defaultState" | "compatDomain" | "compatEntityId"
        >
      > & {
        channel: number;
        allowedActions?: string[];
        serviceMap?: Record<string, string>;
      }
    >,
  ): Promise<OutputRecord[]> {
    const device = await this.getDevice(principal, deviceId);
    const existingResult = await this.pool.query(
      `${OUTPUT_SELECT} where o.device_id = $1`,
      [device.id],
    );
    const existingByChannel = new Map<number, OutputRecord>(
      existingResult.rows.map((row) => {
        const output = mapOutputRow(row as Record<string, unknown>);
        return [output.channel, output];
      }),
    );

    for (const config of configs) {
      if (!Number.isInteger(config.channel) || config.channel < 1 || config.channel > 8) {
        throw new AppError(`Channel '${config.channel}' is invalid; expected 1-8`, 400, "invalid_channel");
      }

      const existing = existingByChannel.get(config.channel);
      const resolved = resolveOutputProfileConfig({
        deviceKey: device.deviceKey,
        entityNamespace: device.mqttHostname,
        channel: config.channel,
        existing,
        profileType: config.profileType,
        displayName: config.displayName,
        pulseMs: config.pulseMs,
        invertRelay: config.invertRelay,
        defaultState: config.defaultState,
        compatDomain: config.compatDomain ?? undefined,
        compatEntityId: config.compatEntityId ?? undefined,
        allowedActions: config.allowedActions,
        serviceMap: config.serviceMap,
      });

      await this.pool.query(
        `
          insert into device_outputs (
            id, device_id, channel, profile_type, display_name, pulse_ms, invert_relay, default_state,
            allowed_actions, compat_domain, compat_entity_id, service_map
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12::jsonb)
          on conflict (device_id, channel) do update set
            profile_type = excluded.profile_type,
            display_name = excluded.display_name,
            pulse_ms = excluded.pulse_ms,
            invert_relay = excluded.invert_relay,
            default_state = excluded.default_state,
            allowed_actions = excluded.allowed_actions,
            compat_domain = excluded.compat_domain,
            compat_entity_id = excluded.compat_entity_id,
            service_map = excluded.service_map,
            updated_at = now()
        `,
        [
          existing?.id ?? createId(),
          device.id,
          config.channel,
          resolved.profileType,
          resolved.displayName,
          resolved.pulseMs,
          resolved.invertRelay,
          resolved.defaultState,
          JSON.stringify(resolved.allowedActions),
          resolved.compatDomain,
          resolved.compatEntityId,
          JSON.stringify(resolved.serviceMap),
        ],
      );
    }

    const refreshed = await this.pool.query(
      `${OUTPUT_SELECT}
       where d.customer_id = any($1::uuid[])
         and o.device_id = $2
       order by o.channel`,
      [principal.customerIds, device.id],
    );

    return refreshed.rows.map((row) => mapOutputRow(row as Record<string, unknown>));
  }

  async updateDevice(
    principal: AuthPrincipal,
    deviceId: string,
    input: { displayName?: string; desiredEnabled?: boolean; siteId?: string | null },
  ): Promise<DeviceRecord> {
    const device = await this.getDevice(principal, deviceId);
    const shouldUpdateSite = input.siteId !== undefined;
    let siteId = input.siteId;

    if (siteId !== undefined && siteId !== null) {
      const normalizedSiteId = siteId.trim();
      siteId = normalizedSiteId || null;
    }

    if (siteId) {
      const siteResult = await this.pool.query("select id from sites where id = $1 and customer_id = $2", [siteId, device.customerId]);
      if (!siteResult.rowCount) {
        throw new AppError("Site not found for customer", 400, "invalid_site");
      }
    }

    await this.pool.query(
      `
        update devices
        set
          desired_enabled = coalesce($2, desired_enabled),
          site_id = case
            when $3::boolean then $4::uuid
            else site_id
          end,
          metadata = case
            when $5::text is null then metadata
            when btrim($5::text) = '' then coalesce(metadata, '{}'::jsonb) - 'display_name'
            else jsonb_set(coalesce(metadata, '{}'::jsonb), '{display_name}', to_jsonb(btrim($5::text)), true)
          end,
          updated_at = now()
        where id = $1
      `,
      [device.id, input.desiredEnabled, shouldUpdateSite, siteId ?? null, input.displayName ?? null],
    );

    return this.getDevice(principal, device.id);
  }

  async deleteDevice(principal: AuthPrincipal, deviceId: string): Promise<DeviceRecord> {
    const device = await this.getDevice(principal, deviceId);
    const client = await this.pool.connect();
    try {
      await client.query("begin");

      await client.query(
        `
          delete from commands
          where output_id in (
            select id from device_outputs where device_id = $1
          )
        `,
        [device.id],
      );

      await client.query(
        `
          delete from output_aliases
          where output_id in (
            select id from device_outputs where device_id = $1
          )
        `,
        [device.id],
      );

      await client.query(
        `
          delete from output_state_snapshots
          where output_id in (
            select id from device_outputs where device_id = $1
          )
        `,
        [device.id],
      );

      await client.query(
        `
          update device_events
          set output_id = null
          where output_id in (
            select id from device_outputs where device_id = $1
          )
        `,
        [device.id],
      );

      await client.query("delete from device_outputs where device_id = $1", [device.id]);

      await client.query("delete from device_events where device_id = $1", [device.id]);
      await client.query("delete from device_credentials where device_id = $1", [device.id]);
      await client.query("delete from devices where id = $1", [device.id]);

      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }

    return device;
  }

  private resolveCustomerId(principal: AuthPrincipal, customerId?: string): string {
    if (customerId) {
      assertCustomerAccess(principal, customerId);
      return customerId;
    }

    if (principal.customerIds.length !== 1) {
      throw new AppError("customer_id is required when you have access to multiple customers", 400, "missing_customer_id");
    }

    return principal.customerIds[0];
  }
}
