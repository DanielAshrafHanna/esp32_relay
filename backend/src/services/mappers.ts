import type { CommandRecord, DeviceRecord, DeviceTelemetry, DeviceTrace, OutputRecord } from "../types/domain.js";

function parseJsonObject<T>(value: unknown, fallback: T): T {
  if (!value) {
    return fallback;
  }

  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }

  return value as T;
}

function formatTimestamp(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const asString = String(value);
  const parsed = Date.parse(asString);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toISOString();
  }

  return asString;
}

export function mapOutputRow(row: Record<string, unknown>): OutputRecord {
  return {
    id: String(row.id),
    customerId: String(row.customer_id),
    deviceId: String(row.device_id),
    deviceKey: String(row.device_key),
    deviceDisplayName: String(row.device_display_name ?? row.device_key),
    deviceDesiredEnabled: Boolean(row.device_desired_enabled),
    mqttHostname: String(row.mqtt_hostname),
    transportVersion: row.transport_version as OutputRecord["transportVersion"],
    channel: Number(row.channel),
    profileType: row.profile_type as OutputRecord["profileType"],
    displayName: String(row.display_name),
    pulseMs: row.pulse_ms === null ? null : Number(row.pulse_ms),
    invertRelay: Boolean(row.invert_relay),
    defaultState: row.default_state as OutputRecord["defaultState"],
    allowedActions: parseJsonObject<string[]>(row.allowed_actions, []),
    compatDomain: row.compat_domain ? String(row.compat_domain) : null,
    compatEntityId: row.compat_entity_id ? String(row.compat_entity_id) : null,
    serviceMap: parseJsonObject<Record<string, string>>(row.service_map, {}),
    customerStatus: row.customer_status as OutputRecord["customerStatus"],
    lastKnownState: (row.last_known_state as OutputRecord["lastKnownState"]) ?? "UNKNOWN",
    lastStateAt: formatTimestamp(row.last_state_at),
  };
}

export function mapDeviceRow(row: Record<string, unknown>): DeviceRecord {
  const metadata = parseJsonObject<Record<string, unknown>>(row.metadata, {});
  const telemetrySource = metadata.telemetry as Record<string, unknown> | undefined;
  const traceSource = metadata.last_trace as Record<string, unknown> | undefined;
  const telemetry =
    telemetrySource && typeof telemetrySource === "object"
      ? ({
          uptimeS:
            telemetrySource.uptime_s === undefined || telemetrySource.uptime_s === null
              ? null
              : Number(telemetrySource.uptime_s),
          wifiRssi:
            telemetrySource.wifi_rssi === undefined || telemetrySource.wifi_rssi === null
              ? null
              : Number(telemetrySource.wifi_rssi),
          wifiSsid: telemetrySource.wifi_ssid ? String(telemetrySource.wifi_ssid) : null,
          ip: telemetrySource.ip ? String(telemetrySource.ip) : null,
          mqttConnected:
            telemetrySource.mqtt_connected === undefined || telemetrySource.mqtt_connected === null
              ? null
              : Boolean(telemetrySource.mqtt_connected),
          freeHeap:
            telemetrySource.free_heap === undefined || telemetrySource.free_heap === null
              ? null
              : Number(telemetrySource.free_heap),
          largestFreeBlock:
            telemetrySource.largest_free_block === undefined || telemetrySource.largest_free_block === null
              ? null
              : Number(telemetrySource.largest_free_block),
          wifiReconnectAttempts:
            telemetrySource.wifi_reconnect_attempts === undefined || telemetrySource.wifi_reconnect_attempts === null
              ? null
              : Number(telemetrySource.wifi_reconnect_attempts),
          mqttReconnectAttempts:
            telemetrySource.mqtt_reconnect_attempts === undefined || telemetrySource.mqtt_reconnect_attempts === null
              ? null
              : Number(telemetrySource.mqtt_reconnect_attempts),
          lastMqttError:
            telemetrySource.last_mqtt_error === undefined || telemetrySource.last_mqtt_error === null
              ? null
              : Number(telemetrySource.last_mqtt_error),
        } satisfies DeviceTelemetry)
      : null;
  const lastTrace =
    traceSource && typeof traceSource === "object"
      ? ({
          eventType: traceSource.event_type ? String(traceSource.event_type) : null,
          relay:
            traceSource.relay === undefined || traceSource.relay === null
              ? null
              : Number(traceSource.relay),
          commandTopic: traceSource.command_topic ? String(traceSource.command_topic) : null,
          commandPayload: traceSource.command_payload ? String(traceSource.command_payload) : null,
          stateAfter: traceSource.state_after ? String(traceSource.state_after) : null,
          deviceUptimeMs:
            traceSource.uptime_ms === undefined || traceSource.uptime_ms === null
              ? null
              : Number(traceSource.uptime_ms),
          receivedAt: traceSource.received_at ? String(traceSource.received_at) : null,
        } satisfies DeviceTrace)
      : null;

  return {
    id: String(row.id),
    customerId: String(row.customer_id),
    customerName: row.customer_name ? String(row.customer_name) : null,
    siteId: row.site_id ? String(row.site_id) : null,
    siteName: row.site_name ? String(row.site_name) : null,
    deviceKey: String(row.device_key),
    displayName: String(row.display_name ?? row.device_key),
    mqttHostname: String(row.mqtt_hostname),
    transportVersion: row.transport_version as DeviceRecord["transportVersion"],
    firmwareVersion: row.firmware_version ? String(row.firmware_version) : null,
    active: Boolean(row.active),
    desiredEnabled: Boolean(row.desired_enabled),
    availability: row.availability as DeviceRecord["availability"],
    lastSeenAt: formatTimestamp(row.last_seen_at),
    telemetry,
    lastTrace,
  };
}

export function mapCommandRow(row: Record<string, unknown>): CommandRecord {
  return {
    id: String(row.id),
    customerId: String(row.customer_id),
    outputId: String(row.output_id),
    sourceType: row.source_type as CommandRecord["sourceType"],
    sourceId: row.source_id ? String(row.source_id) : null,
    clientRequestId: row.client_request_id ? String(row.client_request_id) : null,
    logicalAction: String(row.logical_action),
    requestedState: row.requested_state ? String(row.requested_state) : null,
    requestedDurationMs: row.requested_duration_ms === null ? null : Number(row.requested_duration_ms),
    status: row.status as CommandRecord["status"],
    transportVersion: row.transport_version as CommandRecord["transportVersion"],
    steps: parseJsonObject(row.steps, []),
    currentStep: Number(row.current_step),
    nextStepAt: formatTimestamp(row.next_step_at) ?? "",
    expectedStepState: row.expected_step_state ? String(row.expected_step_state) : null,
    stepTimeoutAt: formatTimestamp(row.step_timeout_at),
    deadlineAt: formatTimestamp(row.deadline_at),
    lastError: row.last_error ? String(row.last_error) : null,
    resultPayload: parseJsonObject(row.result_payload, {}),
    createdAt: formatTimestamp(row.created_at) ?? "",
    startedAt: formatTimestamp(row.started_at),
    completedAt: formatTimestamp(row.completed_at),
  };
}
