create extension if not exists pgcrypto;

create table if not exists customers (
  id uuid primary key,
  name text not null,
  slug text not null unique,
  status text not null check (status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key,
  email text not null unique,
  display_name text not null,
  password_hash text not null,
  status text not null check (status in ('active', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists customer_memberships (
  user_id uuid not null references users(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  role text not null check (role in ('admin', 'operator', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (user_id, customer_id)
);

create table if not exists sites (
  id uuid primary key,
  customer_id uuid not null references customers(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_id, name)
);

create table if not exists devices (
  id uuid primary key,
  customer_id uuid not null references customers(id) on delete cascade,
  site_id uuid references sites(id) on delete set null,
  device_key text not null unique,
  mqtt_hostname text not null unique,
  transport_version text not null check (transport_version in ('legacy_ha', 'solace_v1')),
  firmware_version text,
  active boolean not null default true,
  desired_enabled boolean not null default true,
  availability text not null default 'unknown' check (availability in ('unknown', 'online', 'offline')),
  metadata jsonb not null default '{}'::jsonb,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists device_credentials (
  id uuid primary key,
  device_id uuid not null references devices(id) on delete cascade,
  username text not null unique,
  password_hash text not null,
  status text not null check (status in ('active', 'revoked')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table if not exists device_outputs (
  id uuid primary key,
  device_id uuid not null references devices(id) on delete cascade,
  channel integer not null,
  profile_type text not null check (profile_type in ('light', 'gate', 'cover', 'generic_relay')),
  display_name text not null,
  pulse_ms integer,
  invert_relay boolean not null default false,
  default_state text not null check (default_state in ('ON', 'OFF')),
  allowed_actions jsonb not null default '[]'::jsonb,
  compat_domain text,
  compat_entity_id text unique,
  service_map jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (device_id, channel)
);

create table if not exists output_aliases (
  id uuid primary key,
  output_id uuid not null references device_outputs(id) on delete cascade,
  alias_type text not null check (alias_type in ('compat_entity', 'legacy_name', 'external')),
  alias_value text not null unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists output_state_snapshots (
  output_id uuid primary key references device_outputs(id) on delete cascade,
  last_state text not null check (last_state in ('ON', 'OFF', 'UNKNOWN')),
  source text not null,
  raw_payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists commands (
  id uuid primary key,
  customer_id uuid not null references customers(id) on delete cascade,
  output_id uuid not null references device_outputs(id) on delete cascade,
  source_type text not null check (source_type in ('native_api', 'compat_ha', 'system')),
  source_id uuid,
  client_request_id text,
  logical_action text not null,
  requested_state text,
  requested_duration_ms integer,
  status text not null check (status in ('queued', 'waiting_state', 'completed', 'rejected', 'timed_out', 'failed', 'cancelled')),
  transport_version text not null check (transport_version in ('legacy_ha', 'solace_v1')),
  steps jsonb not null default '[]'::jsonb,
  current_step integer not null default 0,
  next_step_at timestamptz not null default now(),
  expected_step_state text,
  step_timeout_at timestamptz,
  deadline_at timestamptz,
  last_error text,
  result_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create index if not exists commands_status_next_step_at_idx on commands (status, next_step_at);
create index if not exists commands_output_status_idx on commands (output_id, status);

create table if not exists device_events (
  id uuid primary key,
  device_id uuid not null references devices(id) on delete cascade,
  output_id uuid references device_outputs(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists service_accounts (
  id uuid primary key,
  customer_id uuid not null references customers(id) on delete cascade,
  name text not null,
  token_hash text not null,
  status text not null check (status in ('active', 'disabled')),
  scopes jsonb not null default '[]'::jsonb,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  unique (customer_id, name)
);

create table if not exists audit_logs (
  id uuid primary key,
  customer_id uuid references customers(id) on delete set null,
  user_id uuid references users(id) on delete set null,
  service_account_id uuid references service_accounts(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
