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

## Current Railway Test Deployment

The current hosted test environment we created uses:

- API URL: `https://esp32relay-production.up.railway.app/`
- MQTT broker public host: `junction.proxy.rlwy.net`
- MQTT broker public port: `57522`
- Seeded admin email: `admin@solace.local`
- Seeded admin password: `ChangeMe123!`
- Seeded service token: `solace-railway-test-token`
- Seeded device MQTT hostname/topic namespace: `esp32-relay`

These values are for the current test deployment only. Rotate them before any real customer rollout.

## ESP Firmware Note For Railway MQTT

Railway broker hostnames can be long. The firmware originally stored `mqtt_server` in a 40-character buffer, which truncates long broker hosts and causes MQTT connection failure.

This branch includes a firmware fix that increases the MQTT server, username, password, and MQTT hostname buffers. After flashing the updated firmware:

- re-enter the full MQTT server hostname
- use the Railway-generated TCP proxy port, not the internal broker port unless the proxy explicitly shows `1883`
- leave username blank for the current test broker
- clear the password field if you want it blank
- keep MQTT hostname as `esp32-relay`

If the password field in `/solaceadmin` shows dots, that is a masked placeholder, not proof that a real password is still required.

The currently verified working Railway MQTT device settings are:

- MQTT server: `junction.proxy.rlwy.net`
- MQTT port: `57522`
- MQTT username: blank
- MQTT password: blank
- MQTT hostname: `esp32-relay`

## Phase 1 Compatibility Routes

These routes accept the current Home Assistant-style webhook writes from the app:

- `POST /api/services/:domain/:service`
- `POST /compat/ha/api/services/:domain/:service`

Authentication for compatibility routes:

- use `Authorization: Bearer <service-account-token>`
- for the current Railway test deployment, that token is `solace-railway-test-token`

Request body:

```json
{
  "entity_id": "lock.aywanalocker_door"
}
```

You can also send multiple entities in one call:

```json
{
  "entity_id": ["switch.relay_demo_01_relay_3", "switch.relay_demo_01_relay_4"]
}
```

Typical success response:

```json
{
  "commands": [
    {
      "id": "command-id",
      "status": "queued"
    }
  ],
  "accepted": 1
}
```

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

Compatibility behavior mapping:

- `lock.unlock` on a `gate` profile becomes a backend pulse using `pulse_ms`
- `light.turn_on` on a `light` profile becomes relay `ON`
- `light.turn_off` on a `light` profile becomes relay `OFF`
- `switch.turn_on` on a `generic_relay` profile becomes relay `ON`
- `switch.toggle` becomes relay `TOGGLE`
- `cover.*` is supported only when the output profile and allowed actions are configured to accept it

## Current Seeded Relays

The seed now creates one 8-channel device model:

- Channel 1: `light.entry_light`
- Channel 2: `lock.aywanalocker_door`
- Channels 3-8: `switch.relay_demo_01_relay_<channel>`

That means you can immediately trigger any of channels 3-8 with compatibility webhooks like:

```bash
curl -X POST http://localhost:8080/api/services/switch/turn_on \
  -H "Authorization: Bearer replace-with-service-account-token" \
  -H "Content-Type: application/json" \
  -d '{"entity_id":"switch.relay_demo_01_relay_3"}'
```

## Native API

Authentication for native API routes:

- `POST /v1/auth/login` uses email and password
- all other `/v1/*` routes use `Authorization: Bearer <admin-jwt>` unless stated otherwise

Core native routes:

- `POST /v1/auth/login`
- `GET /v1/me`
- `GET /v1/devices`
- `GET /v1/devices/:id`
- `GET /v1/outputs`
- `GET /v1/outputs/:id`
- `POST /v1/outputs/:id/actions`
- `PATCH /v1/outputs/:id/profile`
- `PUT /v1/devices/:id/outputs/configuration`
- `GET /v1/commands/:id`
- `POST /v1/provisioning/device-credentials`

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

Supported native actions:

- `on`
- `off`
- `toggle`
- `pulse`

Common native API response behavior:

- command-creation endpoints return `202 Accepted`
- provisioning returns `201 Created`
- listing routes return `200 OK`
- validation failures return `400`
- unsupported compatibility routes return `404`
- suspended customers are blocked from command creation

## Auth Models

There are two main auth modes in the middleware:

- admin/operator auth:
  - log in at `POST /v1/auth/login`
  - receive a JWT
  - use this for GUI access, device management, output profile changes, and reading command/device data
- service-account auth:
  - use a fixed bearer token
  - intended for the current mobile app compatibility webhook calls
  - should not be used for full admin operations in the long term

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

## Relay Board Sections

The console groups outputs by relay board instead of showing one flat list.

Each board section includes:

- a board title shown above that board's relays
- the MQTT hostname and availability for that board
- a board-level enable toggle using `desired_enabled`
- grouped relay rows underneath the board header

Board titles now default to the device `mqtt_hostname`, which matches the `MQTT Hostname` field you set on the ESP in `/solaceadmin`.

If you set a custom board title in the middleware console, that custom title overrides the MQTT hostname fallback.

If you later want the board title to originate from the ESP `/solaceadmin` page and sync automatically into middleware, that can be added as a follow-up feature.

## Current Test Webhooks

Against the current Railway deployment:

```bash
curl -X POST https://esp32relay-production.up.railway.app/api/services/lock/unlock \
  -H "Authorization: Bearer solace-railway-test-token" \
  -H "Content-Type: application/json" \
  -d '{"entity_id":"lock.aywanalocker_door"}'
```

```bash
curl -X POST https://esp32relay-production.up.railway.app/api/services/light/turn_on \
  -H "Authorization: Bearer solace-railway-test-token" \
  -H "Content-Type: application/json" \
  -d '{"entity_id":"light.entry_light"}'
```

Turn a generic relay on:

```bash
curl -X POST https://esp32relay-production.up.railway.app/api/services/switch/turn_on \
  -H "Authorization: Bearer solace-railway-test-token" \
  -H "Content-Type: application/json" \
  -d '{"entity_id":"switch.relay_demo_01_relay_3"}'
```

Turn a generic relay off:

```bash
curl -X POST https://esp32relay-production.up.railway.app/api/services/switch/turn_off \
  -H "Authorization: Bearer solace-railway-test-token" \
  -H "Content-Type: application/json" \
  -d '{"entity_id":"switch.relay_demo_01_relay_3"}'
```

## Live Test Checklist

Use this exact order for a live cloud test:

1. Confirm the ESP is connected to Wi-Fi and MQTT using:
   - MQTT server: `junction.proxy.rlwy.net`
   - MQTT port: `57522`
   - MQTT hostname: `esp32-relay`
2. Open the GUI:
   - `https://esp32relay-production.up.railway.app/`
3. Log in with:
   - email: `admin@solace.local`
   - password: `ChangeMe123!`
4. Click `Load Devices`
5. Click `Load Outputs`
6. Trigger one of these tests:
   - gate pulse: `lock.aywanalocker_door`
   - light on/off: `light.entry_light`
   - generic relay on/off: `switch.relay_demo_01_relay_3`
7. If using curl, keep polling the command id with `GET /v1/commands/:id` if you want to confirm completion status

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

## Secure MQTT Per Board

For production, do not keep MQTT anonymous.

The secure model in this repo is:

- one MQTT username/password per relay board
- the MQTT username is the board `mqtt_hostname`
- Mosquitto ACLs allow each board to access only its own topic namespace
- the backend gateway uses its own broker account with broader access

Broker files:

- config: [backend/docker/mosquitto/mosquitto.conf](/Users/danielhanna/Desktop/Solace%20Codes/esp32_rellay/backend/docker/mosquitto/mosquitto.conf)
- ACLs: [backend/docker/mosquitto/aclfile](/Users/danielhanna/Desktop/Solace%20Codes/esp32_rellay/backend/docker/mosquitto/aclfile)

ACL behavior:

- device username `board-a` can only access `homeassistant/switch/board-a/#`
- device username `board-b` can only access `homeassistant/switch/board-b/#`
- backend user `backend-gateway` can access all relay topics

Issue credentials for a board:

```bash
curl -X POST https://esp32relay-production.up.railway.app/v1/provisioning/device-credentials \
  -H "Authorization: Bearer <admin-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"device_id":"<device-id>"}'
```

The returned username will be the board `mqtt_hostname`. The returned password is what you put into the ESP `/solaceadmin` page and also into the Mosquitto password file.

Create or update the Mosquitto password file entry:

```bash
mosquitto_passwd -b backend/docker/mosquitto/passwd <mqtt_hostname> <generated-password>
```

Create the backend gateway broker user too:

```bash
mosquitto_passwd -b backend/docker/mosquitto/passwd backend-gateway <strong-random-password>
```

Then set on the `gateway` service:

- `MQTT_USERNAME=backend-gateway`
- `MQTT_PASSWORD=<strong-random-password>`

After changing the password file, reload or restart Mosquitto.

## Seeded Demo Data

The seed script creates:

- one admin user
- one service account token for the current app
- one demo 8-channel device using the legacy Home Assistant MQTT topics
- 8 output records ready for webhook-driven testing
