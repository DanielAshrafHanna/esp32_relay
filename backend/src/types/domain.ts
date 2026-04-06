export type CustomerStatus = "active" | "suspended";
export type UserStatus = "active" | "disabled";
export type DeviceTransportVersion = "legacy_ha" | "solace_v1";
export type DeviceAvailability = "unknown" | "online" | "offline";
export type OutputProfileType = "light" | "gate" | "cover" | "generic_relay";
export type OutputState = "ON" | "OFF" | "UNKNOWN";
export type CommandStatus =
  | "queued"
  | "waiting_state"
  | "completed"
  | "rejected"
  | "timed_out"
  | "failed"
  | "cancelled";
export type SourceType = "native_api" | "compat_ha" | "system";
export type AuthPrincipalKind = "user" | "service_account";
export type NativeAction = "set_on" | "set_off" | "toggle" | "pulse";
export type CompatibilityDomain = "lock" | "switch" | "light" | "cover";
export type CompatibilityService =
  | "unlock"
  | "lock"
  | "turn_on"
  | "turn_off"
  | "toggle"
  | "open_cover"
  | "close_cover"
  | "stop_cover";

export interface DeviceTelemetry {
  uptimeS: number | null;
  wifiRssi: number | null;
  wifiSsid: string | null;
  ip: string | null;
  mqttConnected: boolean | null;
  freeHeap: number | null;
  largestFreeBlock: number | null;
  wifiReconnectAttempts: number | null;
  mqttReconnectAttempts: number | null;
  lastMqttError: number | null;
}

export interface AuthPrincipal {
  kind: AuthPrincipalKind;
  subjectId: string;
  customerIds: string[];
  scopes: string[];
  memberships?: Record<string, string>;
  email?: string;
  displayName?: string;
}

export interface CustomerRecord {
  id: string;
  name: string;
  slug: string;
  status: CustomerStatus;
}

export interface DeviceRecord {
  id: string;
  customerId: string;
  siteId: string | null;
  deviceKey: string;
  displayName: string;
  mqttHostname: string;
  transportVersion: DeviceTransportVersion;
  firmwareVersion: string | null;
  active: boolean;
  desiredEnabled: boolean;
  availability: DeviceAvailability;
  lastSeenAt: string | null;
  telemetry: DeviceTelemetry | null;
}

export interface OutputRecord {
  id: string;
  customerId: string;
  deviceId: string;
  deviceKey: string;
  deviceDisplayName: string;
  deviceDesiredEnabled: boolean;
  mqttHostname: string;
  transportVersion: DeviceTransportVersion;
  channel: number;
  profileType: OutputProfileType;
  displayName: string;
  pulseMs: number | null;
  invertRelay: boolean;
  defaultState: Exclude<OutputState, "UNKNOWN">;
  allowedActions: string[];
  compatDomain: string | null;
  compatEntityId: string | null;
  serviceMap: Record<string, string>;
  customerStatus: CustomerStatus;
  lastKnownState: OutputState;
  lastStateAt: string | null;
}

export interface DeviceCredentialRecord {
  id: string;
  deviceId: string;
  username: string;
  status: "active" | "revoked";
  createdAt: string;
  revokedAt: string | null;
}

export interface DiscoveredBoardRecord {
  mqttHostname: string;
  availability: DeviceAvailability;
  firstSeenAt: string;
  lastSeenAt: string;
  highestChannel: number;
  lastStateTopic: string | null;
  claimedDeviceId: string | null;
  metadata: Record<string, unknown>;
}

export interface TransportStep {
  type: "publish";
  topic: string;
  payload: string;
  expectState: Exclude<OutputState, "UNKNOWN">;
  delayAfterMs?: number;
}

export interface CommandPlan {
  logicalAction: string;
  requestedState: Exclude<OutputState, "UNKNOWN"> | null;
  requestedDurationMs: number | null;
  expectedFinalState: Exclude<OutputState, "UNKNOWN"> | null;
  transportVersion: DeviceTransportVersion;
  steps: TransportStep[];
}

export interface CommandRecord {
  id: string;
  customerId: string;
  outputId: string;
  sourceType: SourceType;
  sourceId: string | null;
  clientRequestId: string | null;
  logicalAction: string;
  requestedState: string | null;
  requestedDurationMs: number | null;
  status: CommandStatus;
  transportVersion: DeviceTransportVersion;
  steps: TransportStep[];
  currentStep: number;
  nextStepAt: string;
  expectedStepState: string | null;
  stepTimeoutAt: string | null;
  deadlineAt: string | null;
  lastError: string | null;
  resultPayload: Record<string, unknown>;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}
