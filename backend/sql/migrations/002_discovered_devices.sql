create table if not exists discovered_devices (
  mqtt_hostname text primary key,
  availability text not null default 'unknown' check (availability in ('unknown', 'online', 'offline')),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  highest_channel integer not null default 0,
  last_state_topic text,
  last_payload jsonb not null default '{}'::jsonb,
  claimed_device_id uuid references devices(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists discovered_devices_claimed_idx on discovered_devices (claimed_device_id);
