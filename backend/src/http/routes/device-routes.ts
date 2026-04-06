import type { FastifyInstance } from "fastify";
import { AppError } from "../../lib/errors.js";
import type { NativeAction } from "../../types/domain.js";
import { requirePrincipal } from "../request-auth.js";
import type { HttpServices } from "../types.js";

export async function registerDeviceRoutes(app: FastifyInstance, services: HttpServices) {
  app.get("/v1/devices", async (request) => {
    const principal = await requirePrincipal(request, services);
    return {
      devices: await services.outputService.listDevices(principal),
    };
  });

  app.get("/v1/devices/:id", async (request) => {
    const principal = await requirePrincipal(request, services);
    const params = request.params as { id: string };
    return services.outputService.getDevice(principal, params.id);
  });

  app.patch("/v1/devices/:id", async (request) => {
    const principal = await requirePrincipal(request, services);
    const params = request.params as { id: string };
    const body = (request.body ?? {}) as Record<string, unknown>;

    return services.outputService.updateDevice(principal, params.id, {
      displayName: typeof body.display_name === "string" ? body.display_name : undefined,
      desiredEnabled: typeof body.desired_enabled === "boolean" ? body.desired_enabled : undefined,
    });
  });

  app.delete("/v1/devices/:id", async (request) => {
    const principal = await requirePrincipal(request, services);
    const params = request.params as { id: string };
    const deleted = await services.outputService.deleteDevice(principal, params.id);

    return {
      ok: true,
      deleted,
    };
  });

  app.get("/v1/outputs", async (request) => {
    const principal = await requirePrincipal(request, services);
    return {
      outputs: await services.outputService.listOutputs(principal),
    };
  });

  app.get("/v1/outputs/:id", async (request) => {
    const principal = await requirePrincipal(request, services);
    const params = request.params as { id: string };
    return services.outputService.getOutput(principal, params.id);
  });

  app.post("/v1/outputs/:id/actions", async (request, reply) => {
    const principal = await requirePrincipal(request, services);
    const params = request.params as { id: string };
    const body = request.body as { action?: NativeAction; duration_ms?: number; request_id?: string } | undefined;

    if (!body?.action) {
      throw new AppError("Action is required", 400, "missing_action");
    }

    const command = await services.commandService.createNativeCommand(
      principal,
      params.id,
      body.action,
      body.duration_ms,
      body.request_id,
    );

    reply.code(202);
    return command;
  });

  app.patch("/v1/outputs/:id/profile", async (request) => {
    const principal = await requirePrincipal(request, services);
    const params = request.params as { id: string };
    const body = (request.body ?? {}) as Record<string, unknown>;

    return services.outputService.updateProfile(principal, params.id, {
      profileType: typeof body.profile_type === "string" ? (body.profile_type as never) : undefined,
      displayName: typeof body.display_name === "string" ? body.display_name : undefined,
      pulseMs: typeof body.pulse_ms === "number" ? body.pulse_ms : undefined,
      invertRelay: typeof body.invert_relay === "boolean" ? body.invert_relay : undefined,
      defaultState: typeof body.default_state === "string" ? (body.default_state as never) : undefined,
      compatDomain: typeof body.compat_domain === "string" ? body.compat_domain : undefined,
      compatEntityId: typeof body.compat_entity_id === "string" ? body.compat_entity_id : undefined,
      allowedActions: Array.isArray(body.allowed_actions) ? (body.allowed_actions as string[]) : undefined,
      serviceMap:
        body.service_map && typeof body.service_map === "object" ? (body.service_map as Record<string, string>) : undefined,
    });
  });

  app.put("/v1/devices/:id/outputs/configuration", async (request) => {
    const principal = await requirePrincipal(request, services);
    const params = request.params as { id: string };
    const body = (request.body ?? {}) as {
      outputs?: Array<{
        channel: number;
        profile_type?: string;
        display_name?: string;
        pulse_ms?: number | null;
        invert_relay?: boolean;
        default_state?: string;
        compat_domain?: string;
        compat_entity_id?: string;
        allowed_actions?: string[];
        service_map?: Record<string, string>;
      }>;
    };

    if (!Array.isArray(body.outputs) || !body.outputs.length) {
      throw new AppError("outputs array is required", 400, "missing_outputs");
    }

    return {
      outputs: await services.outputService.bulkConfigureDeviceOutputs(
        principal,
        params.id,
        body.outputs.map((output) => ({
          channel: output.channel,
          profileType: typeof output.profile_type === "string" ? (output.profile_type as never) : undefined,
          displayName: typeof output.display_name === "string" ? output.display_name : undefined,
          pulseMs: output.pulse_ms ?? undefined,
          invertRelay: typeof output.invert_relay === "boolean" ? output.invert_relay : undefined,
          defaultState: typeof output.default_state === "string" ? (output.default_state as never) : undefined,
          compatDomain: typeof output.compat_domain === "string" ? output.compat_domain : undefined,
          compatEntityId: typeof output.compat_entity_id === "string" ? output.compat_entity_id : undefined,
          allowedActions: Array.isArray(output.allowed_actions) ? output.allowed_actions : undefined,
          serviceMap:
            output.service_map && typeof output.service_map === "object"
              ? (output.service_map as Record<string, string>)
              : undefined,
        })),
      ),
    };
  });

  app.get("/v1/commands/:id", async (request) => {
    const principal = await requirePrincipal(request, services);
    const params = request.params as { id: string };
    return services.commandService.getCommand(principal, params.id);
  });

  app.post("/v1/provisioning/device-credentials", async (request, reply) => {
    const principal = await requirePrincipal(request, services);
    const body = request.body as { device_id?: string } | undefined;
    if (!body?.device_id) {
      throw new AppError("device_id is required", 400, "missing_device_id");
    }

    const credentials = await services.provisioningService.issueDeviceCredentials(principal, body.device_id);
    reply.code(201);
    return credentials;
  });

  app.post("/v1/provisioning/boards", async (request, reply) => {
    const principal = await requirePrincipal(request, services);
    const body = (request.body ?? {}) as {
      customer_id?: string;
      site_id?: string | null;
      device_key?: string;
      mqtt_hostname?: string;
      display_name?: string;
      transport_version?: "legacy_ha" | "solace_v1";
      channel_count?: number;
    };

    if (!body.mqtt_hostname) {
      throw new AppError("mqtt_hostname is required", 400, "missing_mqtt_hostname");
    }

    const board = await services.provisioningService.createBoard(principal, {
      customerId: body.customer_id,
      siteId: body.site_id,
      deviceKey: body.device_key,
      mqttHostname: body.mqtt_hostname,
      displayName: body.display_name,
      transportVersion: body.transport_version,
      channelCount: body.channel_count,
    });

    reply.code(201);
    return board;
  });

  app.get("/v1/discovery/boards", async (request) => {
    const principal = await requirePrincipal(request, services);
    return {
      boards: await services.provisioningService.listDiscoveredBoards(principal),
    };
  });

  app.post("/v1/discovery/boards/:mqtt_hostname/claim", async (request, reply) => {
    const principal = await requirePrincipal(request, services);
    const params = request.params as { mqtt_hostname: string };
    const body = (request.body ?? {}) as {
      customer_id?: string;
      site_id?: string | null;
      device_key?: string;
      display_name?: string;
      transport_version?: "legacy_ha" | "solace_v1";
      channel_count?: number;
    };

    const board = await services.provisioningService.claimDiscoveredBoard(principal, params.mqtt_hostname, {
      customerId: body.customer_id,
      siteId: body.site_id,
      deviceKey: body.device_key,
      displayName: body.display_name,
      transportVersion: body.transport_version,
      channelCount: body.channel_count,
    });

    reply.code(201);
    return board;
  });
}
