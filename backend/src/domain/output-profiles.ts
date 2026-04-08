import type { OutputProfileType, OutputRecord } from "../types/domain.js";

export interface OutputProfilePreset {
  profileType: OutputProfileType;
  compatDomain: string;
  allowedActions: string[];
  pulseMs: number | null;
  defaultState: "ON" | "OFF";
  serviceMap: Record<string, string>;
}

export interface ResolvedOutputProfileConfig {
  profileType: OutputProfileType;
  displayName: string;
  pulseMs: number | null;
  invertRelay: boolean;
  defaultState: "ON" | "OFF";
  allowedActions: string[];
  compatDomain: string;
  compatEntityId: string;
  serviceMap: Record<string, string>;
}

const PRESETS: Record<OutputProfileType, OutputProfilePreset> = {
  light: {
    profileType: "light",
    compatDomain: "light",
    allowedActions: ["turn_on", "turn_off", "toggle"],
    pulseMs: null,
    defaultState: "OFF",
    serviceMap: {},
  },
  gate: {
    profileType: "gate",
    compatDomain: "lock",
    allowedActions: ["unlock", "pulse"],
    pulseMs: 2000,
    defaultState: "OFF",
    serviceMap: {
      "lock.unlock": "pulse",
    },
  },
  cover: {
    profileType: "cover",
    compatDomain: "cover",
    allowedActions: ["open", "close", "stop", "pulse"],
    pulseMs: 2000,
    defaultState: "OFF",
    serviceMap: {
      "cover.open_cover": "pulse",
      "cover.close_cover": "pulse",
    },
  },
  switch: {
    profileType: "switch",
    compatDomain: "switch",
    allowedActions: ["turn_on", "turn_off", "toggle", "pulse"],
    pulseMs: 2000,
    defaultState: "OFF",
    serviceMap: {
      "switch.turn_on": "pulse",
    },
  },
  generic_relay: {
    profileType: "generic_relay",
    compatDomain: "switch",
    allowedActions: ["turn_on", "turn_off", "toggle"],
    pulseMs: null,
    defaultState: "OFF",
    serviceMap: {},
  },
};

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

function defaultDisplayName(channel: number): string {
  return `Relay ${channel}`;
}

function buildDefaultCompatEntityId(entityNamespace: string, channel: number, compatDomain: string): string {
  return `${compatDomain}.${slugify(entityNamespace)}.relay${channel}`;
}

export function presetForProfile(profileType: OutputProfileType): OutputProfilePreset {
  return PRESETS[profileType];
}

export function resolveOutputProfileConfig(input: {
  deviceKey: string;
  entityNamespace?: string;
  channel: number;
  existing?: OutputRecord;
  profileType?: OutputProfileType;
  displayName?: string;
  pulseMs?: number | null;
  invertRelay?: boolean;
  defaultState?: "ON" | "OFF";
  allowedActions?: string[];
  compatDomain?: string;
  compatEntityId?: string;
  serviceMap?: Record<string, string>;
}): ResolvedOutputProfileConfig {
  const effectiveProfileType = input.profileType ?? input.existing?.profileType ?? "generic_relay";
  const preset = presetForProfile(effectiveProfileType);
  const displayName = input.displayName ?? input.existing?.displayName ?? defaultDisplayName(input.channel);
  const compatDomain = input.compatDomain ?? (input.profileType ? preset.compatDomain : input.existing?.compatDomain ?? preset.compatDomain);
  const entityNamespace = input.entityNamespace ?? input.existing?.mqttHostname ?? input.deviceKey;

  return {
    profileType: effectiveProfileType,
    displayName,
    pulseMs:
      input.pulseMs !== undefined
        ? input.pulseMs
        : input.profileType
          ? preset.pulseMs
          : input.existing?.pulseMs ?? preset.pulseMs,
    invertRelay: input.invertRelay ?? input.existing?.invertRelay ?? false,
    defaultState:
      input.defaultState ?? (input.profileType ? preset.defaultState : input.existing?.defaultState ?? preset.defaultState),
    allowedActions:
      input.allowedActions ?? (input.profileType ? preset.allowedActions : input.existing?.allowedActions ?? preset.allowedActions),
    compatDomain,
    compatEntityId:
      input.compatEntityId ??
      (input.profileType
        ? buildDefaultCompatEntityId(entityNamespace, input.channel, compatDomain)
        : input.existing?.compatEntityId ?? buildDefaultCompatEntityId(entityNamespace, input.channel, compatDomain)),
    serviceMap: input.serviceMap ?? (input.profileType ? preset.serviceMap : input.existing?.serviceMap ?? preset.serviceMap),
  };
}
