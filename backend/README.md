# Solace Relay Backend

Phase 1 backend for the cloud-managed relay product. It provides:

- Native product API for auth, devices, outputs, commands, and provisioning
- Home Assistant-style compatibility write endpoints for the current mobile app
- MQTT gateway worker that translates queued commands into the ESP firmware's existing MQTT topics
- PostgreSQL schema for customers, devices, outputs, commands, audit logs, and service accounts
- A built-in web console at `/` or `/console` for operators

## Quick Start

1. Copy `.env.example` to `.env` and adjust values if needed.
2. Start infrastructure:

```bash
docker compose -f backend/docker-compose.yml up -d
```

3. Install dependencies:

```bash
cd backend
npm install
```

4. Run migrations and seed data:

```bash
npm run db:migrate
npm run db:seed
```

5. Start the API and gateway in separate terminals:

```bash
npm run dev:api
npm run dev:gateway
```

6. Open the operator console:

```text
http://localhost:8080
```

The console lets you:

- log in as admin
- inspect all outputs
- change a relay between `gate`, `light`, `cover`, and `generic relay`
- edit webhook entity IDs
- trigger compatibility webhooks from the browser

## Default Local Credentials

These are seeded for local testing only:

- Admin email: `admin@solace.local`
- Admin password: `ChangeMe123!`
- Service token: `solace-local-test-token`

Change them before any internet-facing deployment.

## Phase 1 Compatibility Routes

These routes accept the current Home Assistant-style webhook writes from the app:

- `POST /api/services/:domain/:service`
- `POST /compat/ha/api/services/:domain/:service`

Example:

```bash
curl -X POST http://localhost:8080/api/services/lock/unlock \
  -H "Authorization: Bearer replace-with-service-account-token" \
  -H "Content-Type: application/json" \
  -d '{"entity_id":"lock.aywanalocker_door"}'
```

Supported compatibility webhook families:

- `POST /api/services/lock/unlock`
- `POST /api/services/light/turn_on`
- `POST /api/services/light/turn_off`
- `POST /api/services/light/toggle`
- `POST /api/services/switch/turn_on`
- `POST /api/services/switch/turn_off`
- `POST /api/services/switch/toggle`
- `POST /api/services/cover/open_cover`
- `POST /api/services/cover/close_cover`
- `POST /api/services/cover/stop_cover`

The same handlers are also exposed under:

- `POST /compat/ha/api/services/:domain/:service`

## All 16 Relays

The seed now creates one 16-channel device model:

- Channel 1: `light.entry_light`
- Channel 2: `lock.aywanalocker_door`
- Channels 3-16: `switch.relay_demo_01_relay_<channel>`

That means you can immediately trigger any of channels 3-16 with compatibility webhooks like:

```bash
curl -X POST http://localhost:8080/api/services/switch/turn_on \
  -H "Authorization: Bearer replace-with-service-account-token" \
  -H "Content-Type: application/json" \
  -d '{"entity_id":"switch.relay_demo_01_relay_3"}'
```

## Native API

Admin login:

```bash
curl -X POST http://localhost:8080/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@solace.local","password":"ChangeMe123!"}'
```

List devices:

```bash
curl http://localhost:8080/v1/devices \
  -H "Authorization: Bearer <admin-jwt>"
```

List outputs:

```bash
curl http://localhost:8080/v1/outputs \
  -H "Authorization: Bearer <admin-jwt>"
```

Run a native action directly:

```bash
curl -X POST http://localhost:8080/v1/outputs/<output-id>/actions \
  -H "Authorization: Bearer <admin-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"action":"pulse","duration_ms":2000}'
```

## Choosing Gate vs Light Per Relay

Use the native API to reconfigure any output profile. For a single output:

```bash
curl -X PATCH http://localhost:8080/v1/outputs/<output-id>/profile \
  -H "Authorization: Bearer <admin-jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "profile_type": "gate",
    "display_name": "Sliding Gate",
    "compat_entity_id": "lock.sliding_gate"
  }'
```

For multiple relays at once on the same device:

```bash
curl -X PUT http://localhost:8080/v1/devices/<device-id>/outputs/configuration \
  -H "Authorization: Bearer <admin-jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "outputs": [
      {
        "channel": 5,
        "profile_type": "gate",
        "display_name": "Workshop Gate",
        "compat_entity_id": "lock.workshop_gate",
        "pulse_ms": 2000
      },
      {
        "channel": 6,
        "profile_type": "light",
        "display_name": "Garden Lights",
        "compat_entity_id": "light.garden_lights"
      }
    ]
  }'
```

After that, the same webhook contract works:

- gate: `POST /api/services/lock/unlock`
- light: `POST /api/services/light/turn_on`
- generic relay: `POST /api/services/switch/turn_on`

## GUI Workflow

For the easiest operator flow:

1. Open `/console`
2. Log in with the admin credentials
3. Click `Load Devices`
4. Click `Load Outputs`
5. Edit any row:
   - `Profile` decides whether a relay behaves like a gate, light, cover, or generic relay
   - `Entity` decides which webhook `entity_id` will target that relay
   - `Pulse` matters for gate or pulse-style behavior
6. Click `Save` on that row
7. Use the row action buttons or the `Webhook Tester` section to trigger it

## Staging Deployment

Use:

- [Dockerfile](/Users/danielhanna/Desktop/Solace%20Codes/esp32_rellay/backend/Dockerfile)
- [docker-compose.staging.yml](/Users/danielhanna/Desktop/Solace%20Codes/esp32_rellay/backend/docker-compose.staging.yml)
- [STAGING_GUIDE.md](/Users/danielhanna/Desktop/Solace%20Codes/esp32_rellay/backend/STAGING_GUIDE.md)

## Hosting Recommendation

For this architecture, use a host that supports persistent container services:

- API service
- long-running MQTT gateway worker
- PostgreSQL
- Mosquitto

Vercel is not a good primary fit for the current architecture because the gateway is a continuously running worker and the broker is a persistent service. For a first hosted version, use a container-friendly platform such as Railway, Render, Fly.io, or a VPS.

## Seeded Demo Data

The seed script creates:

- one admin user
- one service account token for the current app
- one demo 16-channel device using the legacy Home Assistant MQTT topics
- 16 output records ready for webhook-driven testing
